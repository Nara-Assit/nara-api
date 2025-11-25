import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import notificationController from '../controllers/notificationController.js';

const notificationRouter = Router();

// POST /notifications/register-token: stores an FCM token associated with the user
// GET /notifications?page=1&limit=20: returns the most 20 notifications for user (based on the access token sent with the request)
// GET /notifications/unread-count: returns the number of notifications not read
// DELETE /notifications/:id: deletes a notification
// PATCH /notifications/read-all: marks all notifications as read
notificationRouter.post('/register-token', notificationController.registerFcmToken);

notificationRouter.get('/', notificationController.getNotifications);

notificationRouter.get('/unread-count', notificationController.countUnread);

notificationRouter.delete('/:id', notificationController.deleteNotification);

notificationRouter.post('/read-all', notificationController.readAll);

export default notificationRouter;
