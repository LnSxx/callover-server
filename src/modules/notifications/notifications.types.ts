import { NotificationDocument } from './schemas/notification.schema';

export type GetNotificationsParams = {
  userId: string;
  limit: number;
  offset: number;
  status?: 'read' | 'unread';
};

export type GetNotificationsResult = {
  data: NotificationDocument[];
  limit: number;
  offset: number;
  count: number;
  total: number;
};

export type GetNotificationPaginationResult = {
  limit: number;
  offset: number;
  count: number;
  total: number;
  next: string | null;
  previous: string | null;
};
