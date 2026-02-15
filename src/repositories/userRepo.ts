import { ChatRole, type User } from '@prisma/client';
import type { UserChat, Chat } from '@prisma/client';
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

export const addMember = async (chatId: number, userId: number, role: 'Admin' | 'Member') => {
  const prismaRole = role === 'Admin' ? ChatRole.ADMIN : ChatRole.MEMBER;

  return await prisma.userChat.create({
    data: {
      chatId: Number(chatId),
      userId: Number(userId),
      role: prismaRole,
    },
  });
};

export const addManyMembers = async (
  chatId: number,
  userIds: number[],
  role: 'Admin' | 'Member'
) => {
  const prismaRole = role === 'Admin' ? ChatRole.ADMIN : ChatRole.MEMBER;

  // Prepare the array of objects for bulk insertion
  const data = userIds.map((uid) => ({
    chatId,
    userId: Number(uid),
    role: prismaRole,
  }));

  return await prisma.userChat.createMany({
    data,
    skipDuplicates: true, // Prevents crashing if one user is already in the chat
  });
};

// Overload 1: If includeChat is true, return UserChat WITH Chat
export async function findChatMembership(
  userId: number,
  chatId: number,
  includeChat: true
): Promise<(UserChat & { chat: Chat }) | null>;

// Overload 2: If includeChat is false (or missing), return just UserChat
export async function findChatMembership(
  userId: number,
  chatId: number,
  includeChat?: false
): Promise<UserChat | null>;

export async function findChatMembership(userId: number, chatId: number, includeChat = false) {
  const userChat = await prisma.userChat.findUnique({
    where: {
      userId_chatId: {
        userId,
        chatId,
      },
    },
    // 2. If includeObj is undefined, Prisma acts as if 'include' wasn't passed at all
    ...(includeChat ? { include: { chat: true } } : {}),
  });

  return userChat;
}

export const setUserChatFavorite = async (userId: number, chatId: number) => {
  const updatedUserChat = await prisma.userChat.update({
    where: {
      userId_chatId: {
        userId,
        chatId,
      },
    },
    data: {
      isFavorite: true,
    },
    // Optional: Include chat details in the response if needed for the UI
    include: {
      chat: true,
    },
  });

  return updatedUserChat;
};

export const getUserChats = async (userId: number, isFavoriteOnly = false) => {
  return await prisma.userChat.findMany({
    where: { userId, ...(isFavoriteOnly ? { isFavorite: true } : {}) },
    include: {
      chat: {
        include: {
          // Get only the most recent message
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          // Get members to identify "the other person" in private chats
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profileImageUrl: true,
                },
              },
            },
          },
        },
      },
    },
    // Order by latest activity (uses your @@index)
    orderBy: {
      chat: {
        lastActivity: 'desc',
      },
    },
  });
};
