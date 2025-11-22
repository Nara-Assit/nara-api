import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/config.js';
import jwt from 'jsonwebtoken';

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: `Unauthorized, token required` });
  }

  try {
    const payload = jwt.verify(token, config.ACCESS_TOKEN_SECRET) as { userId: number };
    req.payload = payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: `Failed to verify token` });
  }

  next();
}
