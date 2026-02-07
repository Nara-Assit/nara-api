import type { Response, NextFunction } from 'express';
import { getUserById, searchForUsersByName } from '../repositories/userRepo.js';
import type { AuthRequest } from '../types/express.js';

const userController = {
  getUserById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.userId!, 10);
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { passwordHash: _, ...publicUser } = user;
      return res.status(200).json({ user: publicUser });
    } catch (error) {
      next(error);
    }
  },

  searchForUsersByName: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const q = req.query.q as string;
      if (!q || q.trim() === '') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const users = await searchForUsersByName(q, page, limit);

      return res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  },
};

export default userController;
