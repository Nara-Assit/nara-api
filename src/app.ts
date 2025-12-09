import express from 'express';
import type { Application, Request, Response } from 'express';
import { config } from './config/config.js';
import morgan from 'morgan';
import errorMiddleware from './middleware/errorMiddleware.js';
import authRouter from './routes/authRouter.js';
import notFoundMiddleware from './middleware/notFoundMiddleware.js';
import { verifyToken } from './middleware/authMiddleware.js';
import userRouter from './routes/userRouter.js';
import notificationRouter from './routes/notificationRouter.js';
import chatRouter from './routes/chatRouter.js';
import aiRouter from './routes/aiRouter.js';

const app: Application = express();
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// General middleware
app.use(express.json());

// Health check route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'App API is running!',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);

// Protected routes
app.use('/api/users', verifyToken, userRouter);
app.use('/api/notifications', verifyToken, notificationRouter);
app.use('/api/chats', verifyToken, chatRouter);
app.use('/api/ai', verifyToken, aiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
