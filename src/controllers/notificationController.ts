import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.js';
import { createFcmToken, getFcmTokenByToken } from '../repositories/fcmTokenRepo.js';
import {
  countUnreadNotifications,
  deleteNotificationById,
  getNotificationsByUserId,
  markAllNotificationsAsRead,
} from '../repositories/notificationRepo.js';

const notificationController = {
  registerFcmToken: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { token: fcmToken } = req.body;
      const userId = parseInt(req.userId!, 10);

      if (!fcmToken) {
        return res.status(400).json({ error: 'FCM token is required' });
      }

      const existingToken = await getFcmTokenByToken(fcmToken);
      if (existingToken) {
        return res.status(400).json({ error: 'FCM token already registered' });
      }

      await createFcmToken(userId, fcmToken);
      res.status(201).json({ message: 'FCM token registered successfully' });
    } catch (error) {
      next(error);
    }
  },
  getNotifications: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const userId = parseInt(req.userId!, 10);

      const notifications = await getNotificationsByUserId(userId, page, limit);
      res.status(200).json({ notifications });
    } catch (error) {
      next(error);
    }
  },
  countUnread: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.userId!, 10);
      const count = await countUnreadNotifications(userId);
      res.status(200).json({ count });
    } catch (error) {
      next(error);
    }
  },
  deleteNotification: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.userId!, 10);
      const notificationId = parseInt(req.params.id!, 10);
      // userId is included to ensure users can only delete their own notifications
      const deletedCount = await deleteNotificationById(userId, notificationId);
      if (deletedCount === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
  readAll: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.userId!, 10);
      await markAllNotificationsAsRead(userId);
      res.status(200).json({ message: 'All notifications marked as read successfully' });
    } catch (error) {
      next(error);
    }
  },
};

export default notificationController;
