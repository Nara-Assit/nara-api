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

export interface MessageNotification extends NotificationData {
  payload: {
    chatId: number;
    messageId: number;
    senderName: string;
  };
}

export interface BackgroundNotification {
  notification: {
    title: string;
    body: string;
  };
}
