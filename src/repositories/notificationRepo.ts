import type { Notification } from '@prisma/client';
import prisma from '../db.js';

export const createNotification = async (notification: Notification) => {
  const createdNotification = await prisma.notification.create({
    data: {
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
    },
  });

  return createdNotification;
};
