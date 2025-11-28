import { NotificationType } from '@prisma/client';
import { sendBackgroundNotification } from '../services/notificationService.js';

// This registration token comes from the client FCM SDKs.

const userId = 1;

const notificationMessage = {
  notification: {
    title: 'Test Notification',
    body: 'This is a test background notification sent from the server.',
  },
  notificationType: NotificationType.SYSTEM,
};
try {
  await sendBackgroundNotification(notificationMessage, [userId]);
} catch (error) {
  console.error('Error sending notification:', error);
}
