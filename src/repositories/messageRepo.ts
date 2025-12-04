import prisma from '../db.js';
import type { ChatMessage } from '../types/express.js';

export const createMessage = async (chatMessage: ChatMessage) => {
  const message = await prisma.message.create({
    data: chatMessage,
  });
  return message;
};

export const getMessagesByChatId = async (chatId: number, page = 1, limit = 20) => {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return messages;
};

export const getMessageById = async (id: number, chatId: number) => {
  const message = await prisma.message.findUnique({
    where: { id, chatId },
  });
  return message;
};

export const deleteMessageById = async (id: number, chatId: number) => {
  const deletedMessage = await prisma.message.delete({
    where: { id, chatId },
  });
  return deletedMessage;
};
