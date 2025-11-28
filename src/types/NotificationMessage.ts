import type { NotificationType } from '@prisma/client';

export interface BackgroundNotification {
  data?: Record<string, string>;
  notification: {
    title: string;
    body: string;
  };
  notificationType: NotificationType;
}

export interface ForegroundNotification {
  data: Record<string, string>;
  notificationType: NotificationType;
}
