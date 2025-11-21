import express from 'express';
import type { Application, Request, Response } from 'express';
import { config } from './config/config.js';
import morgan from 'morgan';

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
export default app;
