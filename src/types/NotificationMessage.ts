import type { JsonValue } from '@prisma/client/runtime/library';

export enum NotificationType {
  CHAT = 'CHAT',
  SYSTEM = 'SYSTEM',
  SESSION = 'SESSION',
  TRAINING = 'TRAINING',
}

export interface NotificationData {
  payload: Record<string, JsonValue>;
  body: string;
  title: string;
  type: NotificationType;
  senderId: number | null;
}

export interface BackgroundNotification {
  notification: {
    title: string;
    body: string;
  };
}
