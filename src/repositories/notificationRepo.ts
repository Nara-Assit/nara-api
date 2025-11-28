import prisma from '../db.js';
import type {
  BackgroundNotification,
  ForegroundNotification,
} from '../types/NotificationMessage.js';

export const createNotificationForUsers = async (
  notification: ForegroundNotification | BackgroundNotification,
  userIds: [number, ...number[]]
) => {
  const notificationData = notification.data ?? {};
  if ('notification' in notification) {
    notificationData.title = notification.notification.title;
    notificationData.body = notification.notification.body;
  }

  await prisma.notification.create({
    data: {
      data: notificationData,
      type: notification.notificationType,
      userNotifications: {
        create: userIds.map((id) => ({ userId: id })),
      },
    },
  });
};

export const getNotificationsByUserId = async (userId: number, page: number, limit: number) => {
  const notifications = await prisma.userNotification.findMany({
    where: { userId },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      notification: {
        createdAt: 'desc',
      },
    },
    select: { notification: true, read: true, userId: true },
  });

  return notifications;
};

export const countUnreadNotifications = async (userId: number) => {
  const count = await prisma.userNotification.count({
    where: { userId, read: false },
  });

  return count;
};

export const deleteNotificationById = async (userId: number, notificationId: number) => {
  const result = await prisma.userNotification.deleteMany({
    where: { userId, notificationId },
  });

  return result.count;
};

export const markAllNotificationsAsRead = async (userId: number) => {
  await prisma.userNotification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
};
