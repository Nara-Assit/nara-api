import { sendNotification } from '../services/notificationService.js';
import { NotificationType } from '../types/NotificationMessage.js';
// This registration token comes from the client FCM SDKs.

const userIds: [number, ...number[]] = [1, 2];

const notificationMessage = {
  type: NotificationType.SYSTEM,
  title: 'Test Notification',
  body: 'This is a test background notification sent from the server.',
  senderId: null,
  payload: {
    notificationType: NotificationType.SYSTEM,
    key1: 'value1',
    key2: 'value2',
  },
};
try {
  await sendNotification(notificationMessage, userIds);
} catch (error) {
  console.error('Error sending notification:', error);
}
