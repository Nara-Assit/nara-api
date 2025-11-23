import prisma from '../db.js';

export const createOtpCode = async (code: string, userId: number, expiresAt: Date) =>
  prisma.otpCode.create({
    data: {
      code,
      userId,
      expiresAt,
    },
  });

export const getMostRecentOtpCodeByUserId = async (userId: number) =>
  prisma.otpCode.findFirst({
    where: {
      userId,
    },
    orderBy: { createdAt: 'desc' },
  });
