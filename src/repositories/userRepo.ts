import type { User } from '@prisma/client';
import prisma from '../db.js';
import type { CreateUserData } from '../schemas/userSchema.js';

export const getUserById = async (id: number) => {
  const user = await prisma.user.findUnique({ where: { id } });
  return user;
};

export const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  return user;
};

export const createUser = async (data: CreateUserData) => {
  const createdUser = await prisma.user.create({ data });
  return createdUser;
};

export const updateUser = async (id: number, data: Partial<User>) => {
  return await prisma.user.updateMany({ where: { id }, data });
};

export const getUserChatIds = async (userId: number): Promise<number[]> => {
  const chats = await prisma.userChat.findMany({
    where: {
      userId,
    },
    select: {
      chatId: true,
    },
  });

  const chatIds = chats.map((c) => c.chatId);
  return chatIds;
};

export const removeUserFromChat = async (userId: number, chatId: number) => {
  const deletedUser = await prisma.userChat.delete({
    where: {
      userId_chatId: {
        userId,
        chatId,
      },
    },
  });

  return deletedUser;
};

export const searchForUsersByName = async (name: string, page: number, limit: number) => {
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: name,
        mode: 'insensitive',
      },
    },
    omit: {
      passwordHash: true,
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  return users;
};
