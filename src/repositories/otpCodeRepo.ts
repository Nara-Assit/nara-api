import { config } from '../config/config.js';
import prisma from '../db.js';

export const createOtpCode = async (code: string, userId: number) =>
  prisma.otpCode.create({
    data: {
      code,
      userId,
      expiresAt: new Date(Date.now() + config.OTP_CODE_EXPIRY),
    },
    select: { code: true, expiresAt: true },
  });

export const getMostRecentOtpCodeByUserId = async (userId: number) =>
  prisma.otpCode.findFirst({
    where: {
      userId,
    },
    orderBy: { createdAt: 'desc' },
    select: { code: true, expiresAt: true },
  });
