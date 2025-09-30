import { Express, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { AppError, ErrorCode } from '../types/errors';
import { NotificationFilters } from '../types/notifications';

export default function notificationsApi(app: Express) {
  // Get notifications for the authenticated user
  app.get(
    '/api/notifications',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const {
          type,
          read,
          limit = 20,
          offset = 0,
          order_by = 'created_at',
          order_direction = 'DESC',
        } = req.query;

        const filters: NotificationFilters = {
          user_id: userId,
          type: type as any,
          read: read === 'true' ? true : read === 'false' ? false : undefined,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          order_by: order_by as any,
          order_direction: order_direction as any,
        };

        const result = await notificationService.getNotifications(filters);

        res.json({
          success: true,
          data: result.notifications,
          pagination: {
            total: result.total,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            hasMore:
              (filters.offset || 0) + (filters.limit || 20) < result.total,
          },
        });
      } catch (error) {
        console.error('Error fetching notifications:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Get notification statistics
  app.get(
    '/api/notifications/stats',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const stats = await notificationService.getNotificationStats(userId);

        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error('Error fetching notification stats:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to fetch notification statistics',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Get unread count
  app.get(
    '/api/notifications/unread-count',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const unreadCount = await notificationService.getUnreadCount(userId);

        res.json({
          success: true,
          data: { unreadCount },
        });
      } catch (error) {
        console.error('Error fetching unread count:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Get a specific notification
  app.get(
    '/api/notifications/:id',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const notificationId = parseInt(req.params.id);
        if (isNaN(notificationId)) {
          throw new AppError(
            'Invalid notification ID',
            ErrorCode.VALIDATION_ERROR
          );
        }

        const notification = await notificationService.getNotificationById(
          notificationId,
          userId
        );

        if (!notification) {
          throw new AppError('Notification not found', ErrorCode.NOT_FOUND);
        }

        res.json({
          success: true,
          data: notification,
        });
      } catch (error) {
        console.error('Error fetching notification:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to fetch notification',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Mark notification as read
  app.put(
    '/api/notifications/:id/read',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const notificationId = parseInt(req.params.id);
        if (isNaN(notificationId)) {
          throw new AppError(
            'Invalid notification ID',
            ErrorCode.VALIDATION_ERROR
          );
        }

        const notification = await notificationService.markAsRead(
          notificationId,
          userId
        );

        if (!notification) {
          throw new AppError(
            'Notification not found or already read',
            ErrorCode.NOT_FOUND
          );
        }

        res.json({
          success: true,
          message: 'Notification marked as read',
          data: notification,
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Mark all notifications as read
  app.put(
    '/api/notifications/mark-all-read',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const updatedCount = await notificationService.markAllAsRead(userId);

        res.json({
          success: true,
          message: `Marked ${updatedCount} notifications as read`,
          data: { updatedCount },
        });
      } catch (error) {
        console.error('Error marking all notifications as read:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );

  // Delete a notification
  app.delete(
    '/api/notifications/:id',
    authenticateUser,
    async (req: Request, res: Response) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          throw new AppError('User not authenticated', ErrorCode.UNAUTHORIZED);
        }

        const notificationId = parseInt(req.params.id);
        if (isNaN(notificationId)) {
          throw new AppError(
            'Invalid notification ID',
            ErrorCode.VALIDATION_ERROR
          );
        }

        const deleted = await notificationService.deleteNotification(
          notificationId,
          userId
        );

        if (!deleted) {
          throw new AppError('Notification not found', ErrorCode.NOT_FOUND);
        }

        res.json({
          success: true,
          message: 'Notification deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting notification:', error);

        if (error instanceof AppError) {
          res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errorCode: error.code,
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            errorCode: ErrorCode.INTERNAL_ERROR,
          });
        }
      }
    }
  );
}
