import type { Prisma } from '@prisma/client';
import prisma from '../db.js';

export const getChatById = async (
  id: number,
  { includeMembers }: { includeMembers: boolean } = { includeMembers: false }
) => {
  const includeObj: Prisma.ChatInclude = {};
  if (includeMembers) {
    includeObj.members = {
      select: {
        userId: true,
        role: true,
        joinedAt: true,
        isFavorite: true,
      },
    };
  }

  const chat = await prisma.chat.findUnique({
    where: { id },
    include: includeObj,
  });
  return chat;
};
