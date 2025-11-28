import type { Request, Response, NextFunction } from 'express';
import { createUser, getUserByEmail, updateUser } from '../repositories/userRepo.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config/config.js';
import { Prisma } from '@prisma/client';
import type { LoginUserBody, RegisterUserBody } from '../schemas/userSchema.js';
import {
  createRefreshToken,
  deleteRefreshToken,
  getRefreshToken,
} from '../repositories/refreshTokenRepo.js';
import generateOtp from '../util/generateOtp.js';
import { createOtpCode, getMostRecentOtpCodeByUserId } from '../repositories/otpCodeRepo.js';
import { sendEmail } from '../util/email.js';

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

      // Store refresh token in the database
      await createRefreshToken(refreshToken, loggedInUser.id);

      // remove sensitive info before sending user data
      const { passwordHash: _, ...publicUser } = loggedInUser;

      return res
        .status(200)
        .json({ message: 'Login successful', accessToken, refreshToken, user: publicUser });
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
      const createdUser = await createUser({ ...userData, passwordHash });

      // Generate and store OTP code for email verification
      const emailOtp = generateOtp();
      const emailOtpHash = await bcrypt.hash(emailOtp, 10);
      await createOtpCode(
        emailOtpHash,
        createdUser.id,
        new Date(Date.now() + config.OTP_CODE_EXPIRY)
      );

      // Send verification email
      const message = `Welcome to Nara!\n\nYour verification code is: ${emailOtp}\n\nPlease enter this code to verify your email address and complete your account setup.`;
      try {
        await sendEmail({
          email: createdUser.email,
          subject: 'Verify Your Nara Account',
          message,
        });
      } catch (_err) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to send verification code' });
      }

      const { passwordHash: _, ...publicUser } = createdUser;

      return res.status(201).json({
        message: 'User registered successfully',
        user: publicUser,
      });
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
    try {
      const { otpCode, email } = req.body;

      if (!email || !otpCode) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      if (user.isVerified) {
        return res.status(200).json({ success: true, message: 'Email already verified' });
      }
      const userId = user.id;

      const storedOtpCode = await getMostRecentOtpCodeByUserId(userId);

      if (!storedOtpCode || storedOtpCode.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired OTP code' });
      }

      const otpMatch = await bcrypt.compare(otpCode, storedOtpCode.code);
      if (!otpMatch) {
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

      return res.status(201).json({
        message: 'User verified successfully',
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  },
  resendEmailVerificationOtp: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const createdUser = await getUserByEmail(email);

      if (!createdUser) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      if (createdUser.isVerified) {
        return res.status(200).json({ success: true, message: 'Email already verified' });
      }

      const emailOtp = generateOtp();
      const emailOtpHash = await bcrypt.hash(emailOtp, 10);

      await createOtpCode(
        emailOtpHash,
        createdUser.id,
        new Date(Date.now() + config.OTP_CODE_EXPIRY)
      );
      const message = `Welcome to Nara!\n\nYour verification code is: ${emailOtp}\n\nPlease enter this code to verify your email address and complete your account setup.`;
      try {
        await sendEmail({
          email: createdUser.email,
          subject: 'Verify Your Nara Account',
          message,
        });
        return res.json({ success: true, message: 'Verification code sent' });
      } catch (_err) {
        return res
          .status(500)
          .json({ success: false, message: 'Failed to send verification code' });
      }
    } catch (error) {
      return next(error);
    }
  },
};

export default authController;
