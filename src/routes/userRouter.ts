import { Router } from 'express';
import userController from '../controllers/userController.js';

const userRouter = Router();

userRouter.get('/:id', userController.getUserById);

export default userRouter;
