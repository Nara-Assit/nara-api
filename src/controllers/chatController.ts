import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: number }; // placeholder for authenticated user
}

const chatController = {
  getChats: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  getChatMessages: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  updateChat: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  addChatMember: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  addChatFavorite: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  createChat: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  deleteChat: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  createMessage: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  deleteMessage: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  isBlocked: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  blockUser: async (req: AuthRequest, res: Response, next: NextFunction) => {},
};

export default chatController;
