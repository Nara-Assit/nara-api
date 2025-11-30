import { config } from '../config/config.js';
import prisma from '../db.js';
import expiryToDate from '../util/expiryToDate.js';

export const createRefreshToken = async (generatedToken: string, userId: number) =>
  prisma.refreshToken.create({
    data: {
      token: generatedToken,
      userId,
      expiresAt: expiryToDate(config.REFRESH_TOKEN_EXPIRY),
    },
  });

export const getRefreshToken = async (token: string) =>
  await prisma.refreshToken.findUnique({
    where: { token },
  });

export const deleteRefreshToken = async (token: string) =>
  await prisma.refreshToken.delete({
    where: { token },
  });
