import { apiGet, apiPut, apiDelete } from './index';
import {
  Notification,
  NotificationFilters,
  NotificationStats,
  NotificationResponse,
  UnreadCountResponse,
} from '../types/notifications';

export class NotificationService {
  /**
   * Get notifications for the authenticated user
   */
  async getNotifications(
    filters?: NotificationFilters
  ): Promise<NotificationResponse> {
    const params = new URLSearchParams();

    if (filters?.type) params.append('type', filters.type);
    if (filters?.read !== undefined)
      params.append('read', filters.read.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.order_by) params.append('order_by', filters.order_by);
    if (filters?.order_direction)
      params.append('order_direction', filters.order_direction);

    const queryString = params.toString();
    const url = queryString
      ? `/api/notifications?${queryString}`
      : '/api/notifications';

    return apiGet<NotificationResponse>(url);
  }

  /**
   * Get notification statistics
   */
  async getStats(): Promise<NotificationResponse> {
    return apiGet<NotificationResponse>('/api/notifications/stats');
  }

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    return apiGet<UnreadCountResponse>('/api/notifications/unread-count');
  }

  /**
   * Get a specific notification by ID
   */
  async getNotificationById(id: number): Promise<NotificationResponse> {
    return apiGet<NotificationResponse>(`/api/notifications/${id}`);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: number): Promise<NotificationResponse> {
    return apiPut<NotificationResponse>(`/api/notifications/${id}/read`, {});
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<NotificationResponse> {
    return apiPut<NotificationResponse>('/api/notifications/mark-all-read', {});
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: number): Promise<NotificationResponse> {
    return apiDelete<NotificationResponse>(`/api/notifications/${id}`);
  }

  /**
   * Get unread notifications only
   */
  async getUnreadNotifications(limit?: number): Promise<NotificationResponse> {
    return this.getNotifications({
      read: false,
      limit: limit || 20,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
  }

  /**
   * Get recent notifications (last 10)
   */
  async getRecentNotifications(): Promise<NotificationResponse> {
    return this.getNotifications({
      limit: 10,
      order_by: 'created_at',
      order_direction: 'DESC',
    });
  }
}

export const notificationService = new NotificationService();
