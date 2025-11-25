import type { Request, Response, NextFunction } from 'express';

const notificationController = {
  registerFcmToken: async (req: Request, res: Response, next: NextFunction) => {
    // Implementation for registering FCM token
  },
  getNotifications: async (req: Request, res: Response, next: NextFunction) => {
    // Implementation for fetching notifications
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
  },
  countUnread: async (req: Request, res: Response, next: NextFunction) => {
    // Implementation for counting unread notifications
  },
  deleteNotification: async (req: Request, res: Response, next: NextFunction) => {
    // Implementation for deleting a notification
  },
  readAll: async (req: Request, res: Response, next: NextFunction) => {
    // Implementation for marking all notifications as read
  },
};

export default notificationController;
