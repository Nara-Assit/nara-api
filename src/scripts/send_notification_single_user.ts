import { sendNotification } from '../services/notificationService.js';
import { NotificationType, type NotificationData } from '../types/NotificationMessage.js';

// This registration token comes from the client FCM SDKs.

const userId = 1;

const notificationMessage: NotificationData = {
  type: NotificationType.SYSTEM,
  title: 'Test Notification',
  body: 'This is a test notification sent from the server.',
  senderId: null,
  payload: {
    key1: 'value1',
    key2: 'value2',
  },
};
try {
  await sendNotification(notificationMessage, [userId]);
} catch (error) {
  console.error('Error sending notification:', error);
}
