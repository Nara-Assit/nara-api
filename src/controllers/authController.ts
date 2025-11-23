import type { Request, Response, NextFunction } from 'express';
import { createUser, getUserByEmail, updateUser } from '../repositories/userRepo.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config/config.js';
import { Prisma, type User } from '@prisma/client';
import type { LoginUserBody, RegisterUserBody } from '../schemas/userSchema.js';
import {
  createRefreshToken,
  deleteRefreshToken,
  getRefreshToken,
} from '../repositories/refreshTokenRepo.js';
import generateOtp from '../util/generateOtp.js';
import { createOtpCode, getMostRecentOtpCodeByUserId } from '../repositories/otpCodeRepo.js';

const authController = {
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user: LoginUserBody = req.body;

      // Check if user exists and is verified
      const loggedInUser = await getUserByEmail(user.email);
      if (!loggedInUser || !loggedInUser.isVerified) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(user.password, loggedInUser.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT tokens
      const payload = { userId: loggedInUser.id };
      const accessToken = jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {
        expiresIn: config.ACCESS_TOKEN_EXPIRY,
      });
      const refreshToken = jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {
        expiresIn: config.REFRESH_TOKEN_EXPIRY,
      });

      await createRefreshToken(refreshToken, loggedInUser.id);

      return res.status(200).json({ message: 'Login successful', accessToken, refreshToken });
    } catch (error) {
      next(error);
    }
  },
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user: RegisterUserBody = req.body;

      // Check if user with the same email already exists
      const loggedInUser = await getUserByEmail(user.email);
      if (loggedInUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      // Create a new unverified user
      const salt = 10;
      const { password, ...userData } = user;
      const passwordHash = await bcrypt.hash(password, salt);
      const createdUser: User = await createUser({ ...userData, passwordHash });

      // generate OTP code for account verification and store it in DB
      const otpCode = generateOtp();
      console.log(config.OTP_CODE_EXPIRY);
      console.log(new Date(Date.now() + config.OTP_CODE_EXPIRY));
      await createOtpCode(otpCode, createdUser.id, new Date(Date.now() + config.OTP_CODE_EXPIRY));

      // TODO: Send OTP code to user's email

      return res.status(201).json({ message: 'User registered successfully', user: createdUser });
    } catch (error) {
      next(error);
    }
  },
  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      await deleteRefreshToken(refreshToken);
      return res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return res.status(400).json({ error: 'User already logged out' });
      }
      next(error);
    }
  },
  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const storedToken = await getRefreshToken(refreshToken);
      if (!storedToken || storedToken.expiresAt < new Date()) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      const payload = jwt.verify(storedToken.token, config.REFRESH_TOKEN_SECRET) as {
        userId: number;
      };
      const newAccessToken = jwt.sign({ userId: payload.userId }, config.ACCESS_TOKEN_SECRET, {
        expiresIn: config.ACCESS_TOKEN_EXPIRY,
      });
      const newRefreshToken = jwt.sign({ userId: payload.userId }, config.REFRESH_TOKEN_SECRET, {
        expiresIn: config.REFRESH_TOKEN_EXPIRY,
      });

      await createRefreshToken(newRefreshToken, payload.userId);
      await deleteRefreshToken(refreshToken);

      res.json({
        message: 'Tokens refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }
      next(error);
    }
  },
  verifyUser: async (req: Request, res: Response, next: NextFunction) => {
    // assuming verification is always successful for now
    try {
      const { otpCode, userId } = req.body;

      const storedOtpCode = await getMostRecentOtpCodeByUserId(userId);
      if (
        !storedOtpCode ||
        storedOtpCode.code !== otpCode ||
        storedOtpCode.expiresAt < new Date()
      ) {
        return res.status(400).json({ error: 'Invalid or expired OTP code' });
      }
      await updateUser(userId, { isVerified: true });

      const payload = { userId };
      const accessToken = jwt.sign(payload, config.ACCESS_TOKEN_SECRET, {
        expiresIn: config.ACCESS_TOKEN_EXPIRY,
      });
      const refreshToken = jwt.sign(payload, config.REFRESH_TOKEN_SECRET, {
        expiresIn: config.REFRESH_TOKEN_EXPIRY,
      });

      await createRefreshToken(refreshToken, userId);

      return res
        .status(201)
        .json({ message: 'User verified successfully', accessToken, refreshToken });
    } catch (error) {
      return next(error);
    }
  },
};

export default authController;
