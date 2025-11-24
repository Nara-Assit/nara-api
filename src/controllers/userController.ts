import type { Response, NextFunction } from 'express';
import { getUserById } from '../repositories/userRepo.js';
import type { AuthRequest } from '../types/express.js';

const userController = {
  getUserById: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.userId!, 10);
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },
};

export default userController;
