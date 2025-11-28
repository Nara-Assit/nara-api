import type { NotificationType } from '@prisma/client';

export interface ForegroundNotification {
  data: {
    notificationType: NotificationType;
    [key: string]: string;
  };
}

export interface BackgroundNotification extends ForegroundNotification {
  notification: {
    title: string;
    body: string;
  };
}
