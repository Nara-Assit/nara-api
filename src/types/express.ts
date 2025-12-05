import type { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface ChatMessage {
  chatId: number;
  senderId: number;
  text: string;
}
