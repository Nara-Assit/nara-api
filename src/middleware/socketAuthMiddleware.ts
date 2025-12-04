import { config } from '../config/config.js';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/jwt-payload.js';
import type { Socket } from 'socket.io';

export function verifySocketToken(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Unauthorized, token required'));
  }

  try {
    const payload = jwt.verify(token, config.ACCESS_TOKEN_SECRET) as JwtPayload;
    socket.data.userId = payload.userId;
  } catch (_) {
    return next(new Error('Failed to verify token'));
  }

  next();
}
