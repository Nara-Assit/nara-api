import type { Prisma } from '@prisma/client';
import prisma from '../db.js';
import { ChatType } from '@prisma/client';
import type { UpdateChatInput } from '../schemas/chatSchema.js';

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

export const findPrivateChatBetween = async (userA: number, userB: number) => {
  return await prisma.chat.findFirst({
    where: {
      type: ChatType.PRIVATE,
      AND: [{ members: { some: { userId: userA } } }, { members: { some: { userId: userB } } }],
    },
    // Optional: Include members or last message if needed
    include: {
      members: true,
    },
  });
};

export const create = async (data: {
  type: 'PRIVATE' | 'GROUP';
  name?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
}) => {
  return await prisma.chat.create({
    data: {
      type: data.type === 'PRIVATE' ? ChatType.PRIVATE : ChatType.GROUP,
      name: data.name ?? null,
      description: data.description ?? null,
      avatarUrl: data.avatarUrl ?? null,
    },
  });
};

export const deleteChatById = async (chatId: number) => {
  await prisma.chat.delete({
    where: {
      id: chatId,
    },
  });
};

export const updateChatActivity = async (chatId: number) => {
  return await prisma.chat.update({
    where: { id: chatId },
    data: { lastActivity: new Date() },
  });
};

export const updateChat = async (chatId: number, data: UpdateChatInput) => {
  return await prisma.chat.update({
    where: {
      id: chatId,
    },
    data: {
      name: data.name ?? null,
      description: data.description ?? null,
      avatarUrl: data.avatarUrl ?? null,
    },
  });
};
