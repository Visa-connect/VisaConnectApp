export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  action_url?: string;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
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

export interface CreateNotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  action_url?: string;
}

export interface NotificationFilters {
  user_id: string;
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
