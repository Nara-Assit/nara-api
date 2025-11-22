import type { Request, Response, NextFunction } from 'express';
import { getUserById } from '../repositories/userRepo.js';

const userController = {
  getUserById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.id!, 10);
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
