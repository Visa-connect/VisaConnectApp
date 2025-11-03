import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notificationService } from '../api/notificationService';
import {
  Notification,
  NotificationStats,
  NotificationType,
} from '../types/notifications';

interface NotificationStore {
  // State
  notifications: Notification[];
  stats: NotificationStats | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchNotifications: (limit?: number) => Promise<void>;
  fetchUnreadNotifications: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  addNotification: (notification: Notification) => void;
  updateNotification: (id: number, updates: Partial<Notification>) => void;
  removeNotification: (id: number) => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed values
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: NotificationType) => Notification[];
  hasUnreadNotifications: () => boolean;
  shouldRefresh: () => boolean;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      stats: null,
      unreadCount: 0,
      isLoading: false,
      error: null,
      lastFetched: null,

      // Actions
      fetchNotifications: async (limit = 20) => {
        set({ isLoading: true, error: null });

        try {
          const response = await notificationService.getNotifications({
            limit,
            order_by: 'created_at',
            order_direction: 'DESC',
          });

          if (response.success && Array.isArray(response.data)) {
            set({
              notifications: response.data,
              lastFetched: Date.now(),
              isLoading: false,
            });
          } else {
            set({ error: 'Failed to fetch notifications', isLoading: false });
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch notifications',
            isLoading: false,
          });
        }
      },

      fetchUnreadNotifications: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await notificationService.getUnreadNotifications();

          if (response.success && Array.isArray(response.data)) {
            const currentNotifications = get().notifications;
            const unreadNotifications = response.data;

            // Merge with existing notifications, avoiding duplicates
            const existingIds = new Set(currentNotifications.map((n) => n.id));
            const newNotifications = unreadNotifications.filter(
              (n) => !existingIds.has(n.id)
            );

            set({
              notifications: [...newNotifications, ...currentNotifications],
              lastFetched: Date.now(),
              isLoading: false,
            });
          } else {
            set({
              error: 'Failed to fetch unread notifications',
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Error fetching unread notifications:', error);
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to fetch unread notifications',
            isLoading: false,
          });
        }
      },

      fetchStats: async () => {
        try {
          const response = await notificationService.getStats();

          if (response.success && response.stats) {
            set({ stats: response.stats });
          }
        } catch (error) {
          console.error('Error fetching notification stats:', error);
        }
      },

      fetchUnreadCount: async () => {
        try {
          const response = await notificationService.getUnreadCount();

          if (response.success && response.data) {
            set({ unreadCount: response.data.unreadCount });
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      },

      markAsRead: async (id: number) => {
        try {
          const response = await notificationService.markAsRead(id);

          if (response.success) {
            set((state) => ({
              notifications: state.notifications.map((notification) =>
                notification.id === id
                  ? { ...notification, read_at: new Date().toISOString() }
                  : notification
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            }));
          }
        } catch (error) {
          console.error('Error marking notification as read:', error);
          set({ error: 'Failed to mark notification as read' });
        }
      },

      markAllAsRead: async () => {
        try {
          const response = await notificationService.markAllAsRead();

          if (response.success) {
            set((state) => ({
              notifications: state.notifications.map((notification) => ({
                ...notification,
                read_at: notification.read_at || new Date().toISOString(),
              })),
              unreadCount: 0,
            }));
          }
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
          set({ error: 'Failed to mark all notifications as read' });
        }
      },

      deleteNotification: async (id: number) => {
        try {
          const response = await notificationService.deleteNotification(id);

          if (response.success) {
            set((state) => {
              const notification = state.notifications.find((n) => n.id === id);
              const wasUnread = !notification?.read_at;

              return {
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadCount: wasUnread
                  ? Math.max(0, state.unreadCount - 1)
                  : state.unreadCount,
              };
            });
          }
        } catch (error) {
          console.error('Error deleting notification:', error);
          set({ error: 'Failed to delete notification' });
        }
      },

      addNotification: (notification: Notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      updateNotification: (id: number, updates: Partial<Notification>) => {
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id
              ? { ...notification, ...updates }
              : notification
          ),
        }));
      },

      removeNotification: (id: number) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = !notification?.read_at;

          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          };
        });
      },

      clearNotifications: () => {
        set({
          notifications: [],
          stats: null,
          unreadCount: 0,
          error: null,
          lastFetched: null,
        });
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),

      // Computed values
      getUnreadNotifications: () => {
        return get().notifications.filter(
          (notification) => !notification.read_at
        );
      },

      getNotificationsByType: (type: NotificationType) => {
        return get().notifications.filter(
          (notification) => notification.type === type
        );
      },

      hasUnreadNotifications: () => {
        return get().unreadCount > 0;
      },

      shouldRefresh: () => {
        const lastFetched = get().lastFetched;
        if (!lastFetched) return true;

        // Refresh if more than 5 minutes have passed
        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() - lastFetched > fiveMinutes;
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
