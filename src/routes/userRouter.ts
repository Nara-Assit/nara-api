import { Router } from 'express';
import userController from '../controllers/userController.js';

const userRouter = Router();

userRouter.get('/profile', userController.getUserById);

export default userRouter;
