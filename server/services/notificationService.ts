import pool from '../db/config';
import {
  Notification,
  CreateNotificationData,
  NotificationFilters,
  NotificationStats,
  NotificationType,
} from '../types/notifications';

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(
    data: CreateNotificationData
  ): Promise<Notification> {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, data, action_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.user_id,
      data.type,
      data.title,
      data.message,
      JSON.stringify(data.data || {}),
      data.action_url || null,
    ];

    const result = await pool.query(query, values);
    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * Get notifications for a user with filtering and pagination
   */
  async getNotifications(filters: NotificationFilters): Promise<{
    notifications: Notification[];
    total: number;
  }> {
    let whereConditions = ['user_id = $1'];
    let queryParams: any[] = [filters.user_id];
    let paramIndex = 2;

    // Add type filter
    if (filters.type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(filters.type);
      paramIndex++;
    }

    // Add read status filter
    if (filters.read !== undefined) {
      if (filters.read) {
        whereConditions.push('read_at IS NOT NULL');
      } else {
        whereConditions.push('read_at IS NULL');
      }
    }

    const whereClause = whereConditions.join(' AND ');
    const orderBy = filters.order_by || 'created_at';
    const orderDirection = filters.order_direction || 'DESC';
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM notifications WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get notifications
    const notificationsQuery = `
      SELECT * FROM notifications 
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(notificationsQuery, queryParams);

    return {
      notifications: result.rows.map((row) => this.mapRowToNotification(row)),
      total,
    };
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(
    id: number,
    userId: string
  ): Promise<Notification | null> {
    const query = `
      SELECT * FROM notifications 
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: number, userId: string): Promise<Notification | null> {
    const query = `
      UPDATE notifications 
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const query = `
      UPDATE notifications 
      SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND read_at IS NULL
    `;

    const result = await pool.query(query, [userId]);
    return result.rowCount || 0;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: number, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [id, userId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Delete old notifications (cleanup)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const query = `
      DELETE FROM notifications 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `;

    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  /**
   * Get notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    // Query for overall totals
    const overallQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE read_at IS NULL) as unread
      FROM notifications
      WHERE user_id = $1
    `;
    const overallResult = await pool.query(overallQuery, [userId]);
    const total = parseInt(overallResult.rows[0].total, 10);
    const unread = parseInt(overallResult.rows[0].unread, 10);

    // Query for per-type counts
    const typeQuery = `
      SELECT 
        type,
        COUNT(*) as type_count
      FROM notifications
      WHERE user_id = $1
      GROUP BY type
    `;
    const typeResult = await pool.query(typeQuery, [userId]);

    const by_type: Record<NotificationType, number> = {
      meetup_interest: 0,
      job_applicant: 0,
      chat_message: 0,
      meetup_updated: 0,
      job_updated: 0,
      application_status_changed: 0,
      meetup_reminder: 0,
      system_announcement: 0,
    };
    typeResult.rows.forEach((row) => {
      by_type[row.type as NotificationType] = parseInt(row.type_count, 10);
    });

    const stats: NotificationStats = {
      total,
      unread,
      by_type,
    };
    return stats;
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) FROM notifications 
      WHERE user_id = $1 AND read_at IS NULL
    `;

    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Create notification for job application
   */
  async createJobApplicationNotification(
    employerId: string,
    applicantName: string,
    jobTitle: string,
    jobId: number,
    applicationId: number,
    conversationId: string
  ): Promise<Notification> {
    return this.createNotification({
      user_id: employerId,
      type: 'job_applicant',
      title: 'New Job Application',
      message: `${applicantName} has applied to your job "${jobTitle}"`,
      data: {
        job_id: jobId,
        application_id: applicationId,
        conversation_id: conversationId,
        applicant_name: applicantName,
        job_title: jobTitle,
      },
      action_url: `/chat/${conversationId}`,
    });
  }

  /**
   * Create notification for meetup interest
   */
  async createMeetupInterestNotification(
    meetupCreatorId: string,
    interestedUserName: string,
    meetupTitle: string,
    meetupId: number
  ): Promise<Notification> {
    return this.createNotification({
      user_id: meetupCreatorId,
      type: 'meetup_interest',
      title: 'New Meetup Interest',
      message: `${interestedUserName} is interested in your meetup "${meetupTitle}"`,
      data: {
        meetup_id: meetupId,
        interested_user_name: interestedUserName,
        meetup_title: meetupTitle,
      },
      action_url: `/meetups/${meetupId}`,
    });
  }

  /**
   * Create notification for chat message
   */
  async createChatMessageNotification(
    recipientId: string,
    senderName: string,
    conversationId: string,
    messagePreview: string
  ): Promise<Notification> {
    return this.createNotification({
      user_id: recipientId,
      type: 'chat_message',
      title: `New message from ${senderName}`,
      message:
        messagePreview.length > 100
          ? `${messagePreview.substring(0, 100)}...`
          : messagePreview,
      data: {
        conversation_id: conversationId,
        sender_name: senderName,
      },
      action_url: `/chat/${conversationId}`,
    });
  }

  /**
   * Create notification for meetup update
   */
  async createMeetupUpdateNotification(
    interestedUserId: string,
    meetupTitle: string,
    meetupId: number,
    updateType: string
  ): Promise<Notification> {
    return this.createNotification({
      user_id: interestedUserId,
      type: 'meetup_updated',
      title: 'Meetup Updated',
      message: `The meetup "${meetupTitle}" has been updated: ${updateType}`,
      data: {
        meetup_id: meetupId,
        meetup_title: meetupTitle,
        update_type: updateType,
      },
      action_url: `/meetups/${meetupId}`,
    });
  }

  /**
   * Map database row to Notification object
   */
  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data || {},
      action_url: row.action_url,
      read_at: row.read_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const notificationService = new NotificationService();
