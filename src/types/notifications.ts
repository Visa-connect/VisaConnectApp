export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  action_url?: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'meetup_interest'
  | 'job_applicant'
  | 'chat_message'
  | 'meetup_updated'
  | 'job_updated'
  | 'application_status_changed'
  | 'meetup_reminder'
  | 'system_announcement';

export interface NotificationFilters {
  type?: NotificationType;
  read?: boolean;
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'read_at';
  order_direction?: 'ASC' | 'DESC';
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationType, number>;
}

export interface NotificationResponse {
  success: boolean;
  data?: Notification | Notification[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats?: NotificationStats;
  message?: string;
  errorCode?: string;
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}
