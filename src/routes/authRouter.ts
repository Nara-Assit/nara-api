import { Router } from 'express';
import authController from '../controllers/authController.js';
import validateData from '../middleware/validationMiddleware.js';
import { createUserSchema, loginUserSchema, verifyUserSchema } from '../schemas/userSchema.js';

const authRouter = Router();

authRouter.post('/login', validateData(loginUserSchema), authController.login);
authRouter.post('/register', validateData(createUserSchema), authController.register);
authRouter.post('/resend-verification-otp', authController.resendEmailVerificationOtp);
authRouter.post('/logout', authController.logout);
authRouter.post('/refresh', authController.refresh);

authRouter.patch('/verify-user', validateData(verifyUserSchema), authController.verifyUser);

export default authRouter;
