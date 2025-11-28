import type { Response, NextFunction } from 'express';
import { config } from '../config/config.js';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../types/express.js';
import type { JwtPayload } from '../types/jwt-payload.js';

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: `Unauthorized, token required` });
  }

  try {
    const payload = jwt.verify(token, config.ACCESS_TOKEN_SECRET) as JwtPayload;
    req.userId = payload.userId;
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: `Failed to verify token` });
  }

  next();
}
