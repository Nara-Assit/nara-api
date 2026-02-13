import type { BackgroundNotification, NotificationData } from '../types/NotificationMessage.js';

export default function mapNotificationDataToFcm(
  notificationData: NotificationData
): BackgroundNotification {
  return {
    notification: {
      title: notificationData.title,
      body: notificationData.body,
    },
  };
}
