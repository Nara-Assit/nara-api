import { config } from '../config/config.js';
import prisma from '../db.js';
import expiryToDate from '../util/expiryToDate.js';

export const createOtpCode = async (code: string, userId: number) =>
  prisma.otpCode.create({
    data: {
      code,
      userId,
      expiresAt: expiryToDate(config.OTP_CODE_EXPIRY),
    },
  });

export const getMostRecentOtpCodeByUserId = async (userId: number) =>
  prisma.otpCode.findFirst({
    where: {
      userId,
    },
    orderBy: { createdAt: 'desc' },
  });
