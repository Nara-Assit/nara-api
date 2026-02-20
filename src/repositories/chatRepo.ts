import prisma from '../db.js';
import { ChatRole, ChatType } from '@prisma/client';
import type { UpdateChatInput } from '../schemas/chatSchema.js';

export const getChatById = async (id: number) => {
  const chat = await prisma.chat.findUnique({
    where: { id },
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

export const isAdminOfChat = async (userId: number, chatId: number) => {
  const foundUser = await prisma.userChat.findFirst({
    where: {
      chatId,
      userId,
      role: ChatRole.ADMIN,
    },
  });

  return !!foundUser;
};

export const isChatMember = async (chatId: number, userId: number) => {
  const foundUser = await prisma.userChat.findFirst({
    where: {
      chatId,
      userId,
    },
  });

  return !!foundUser;
};

export const findChatMembers = async (chatId: number) => {
  return await prisma.userChat.findMany({
    where: {
      chatId,
    },
  });
};

export const findChatMembersCount = async (chatId: number) => {
  return await prisma.userChat.count({
    where: {
      chatId,
    },
  });
};

export const findChatAdminsCount = async (chatId: number) => {
  return await prisma.userChat.count({
    where: {
      chatId,
      role: ChatRole.ADMIN,
    },
  });
};

export const findAChatMember = async (chatId: number) => {
  return await prisma.userChat.findFirst({
    where: {
      chatId,
    },
  });
};

export const promoteToAdmin = async (userId: number, chatId: number) => {
  return await prisma.userChat.update({
    where: {
      userId_chatId: {
        userId,
        chatId,
      },
    },
    data: {
      role: ChatRole.ADMIN,
    },
  });
};
