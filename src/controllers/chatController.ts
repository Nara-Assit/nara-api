/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.js';
import { blockUser, canInteract, isUserBlocked, unblockUser } from '../repositories/blocksRepo.js';
import { getChatById } from '../repositories/chatRepo.js';
import { ChatType } from '@prisma/client';
import {
  createMessage,
  deleteMessageById,
  getMessageById,
  getMessagesByChatId,
} from '../repositories/messageRepo.js';
import { getIo } from '../socket.js';
import { removeUserFromChat } from '../repositories/userRepo.js';

const chatController = {
  getChats: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  updateChat: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  addChatMember: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  addChatFavorite: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  createChat: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  deleteChat: async (req: AuthRequest, res: Response, next: NextFunction) => {},

  leaveGroup: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.userId!, 10);
      const chatId = parseInt(req.params.id!, 10);

      const chat = await getChatById(chatId);
      if (!chat || chat.type !== ChatType.GROUP) {
        return res.status(404).json({ error: 'Group chat not found.' });
      }

      // delete user from chat members in database
      const deletedUser = await removeUserFromChat(userId, chatId);

      // send socket event to notify other members
      getIo().to(`chat_${chatId}`).emit('user:leave', deletedUser);

      // remove user from chat room
      getIo().in(`user_${userId}`).socketsLeave(`chat_${chatId}`);

      return res.status(200).json({ message: 'You have left the group successfully.' });
    } catch (error) {
      next(error);
    }
  },

  getChatMessages: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const chatId = parseInt(req.params.id!, 10);
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const chat = await getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found.' });
      }

      const messages = await getMessagesByChatId(chatId, page, limit);
      return res.status(200).json({ messages });
    } catch (error) {
      next(error);
    }
  },

  createMessage: async (req: AuthRequest, res: Response, next: NextFunction) => {
    // get chat data (id, members)
    try {
      const senderId = parseInt(req.userId!, 10);
      const chatId = parseInt(req.params.id!, 10);
      const { text } = req.body;
      const chat = await getChatById(chatId, { includeMembers: true });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found.' });
      }

      // check if sender is in chat members
      const isMember = chat.members.some((member) => member.userId === senderId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this chat.' });
      }

      // if chat is private and sender is blocked by recipient, prevent message creation
      // if chat is group, allow message creation even some members have blocked the sender
      if (chat.type === ChatType.PRIVATE) {
        const recipient = chat.members.find((member) => member.userId !== senderId);
        if (recipient) {
          const canInteractResult = await canInteract(recipient.userId, senderId);
          if (!canInteractResult) {
            return res.status(403).json({ error: 'You are blocked by the recipient.' });
          }
        }
      }

      // store the message in the database
      const message = await createMessage({
        chatId,
        senderId,
        text,
      });

      // send message via socket in real-time to chat members (handled in socket.io layer)
      getIo().to(`chat_${chatId}`).emit('message:new', message);

      return res.status(201).json({ message: 'Message sent successfully.' });
    } catch (error) {
      next(error);
    }
  },

  deleteMessage: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const senderId = parseInt(req.userId!, 10);
      const chatId = parseInt(req.params.id!, 10);
      const messageId = parseInt(req.params.messageId!, 10);

      const chat = await getChatById(chatId, { includeMembers: true });
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found.' });
      }

      const storedMessage = await getMessageById(messageId, chatId);
      if (!storedMessage) {
        return res.status(200).json({ message: 'Message already deleted.' });
      }

      // if chat is private, only delete if the sender id is the same one that sent the message
      if (chat.type === ChatType.PRIVATE) {
        if (storedMessage.senderId !== senderId) {
          return res
            .status(403)
            .json({ error: 'You can only delete your own messages in private chats.' });
        }
      }

      // if chat is group, allow deletion by sender or any admin member
      else if (chat.type === ChatType.GROUP) {
        const isAdmin = chat.members.some(
          (member) => member.userId === senderId && member.role === 'ADMIN'
        );
        if (storedMessage.senderId !== senderId && !isAdmin) {
          return res.status(403).json({
            error: 'You can only delete your own messages if you are not an admin in group chats.',
          });
        }
      }

      // delete the message from the database
      const deletedMessage = await deleteMessageById(messageId, chatId);

      // send message via socket in real-time to chat members (handled in socket.io layer)
      getIo().to(`chat_${chatId}`).emit('message:deleted', deletedMessage);

      return res.status(200).json({ message: 'Message deleted successfully.' });
    } catch (error) {
      next(error);
    }
  },

  isBlockedByMe: async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = parseInt(req.userId!, 10);
    const checkedUserId = parseInt(req.params.id!, 10);

    try {
      const blocked = await isUserBlocked(userId, checkedUserId);
      return res.status(200).json({ blocked });
    } catch (error) {
      next(error);
    }
  },

  blockUser: async (req: AuthRequest, res: Response, next: NextFunction) => {
    const blockerId = parseInt(req.userId!, 10);
    const blockedId = parseInt(req.params.id!, 10);

    // check if trying to block self
    if (blockedId === blockerId) {
      return res.status(400).json({ error: "You can't block yourself." });
    }

    try {
      // check if user is already blocked
      const isBlocked = await isUserBlocked(blockerId, blockedId);
      if (isBlocked) {
        return res.status(200).json({ message: 'User is already blocked.' });
      }

      // block the user
      await blockUser(blockerId, blockedId);
      return res.status(201).json({ message: 'User blocked successfully.' });
    } catch (error) {
      next(error);
    }
  },

  unblockUser: async (req: AuthRequest, res: Response, next: NextFunction) => {
    const blockerId = parseInt(req.userId!, 10);
    const blockedId = parseInt(req.params.id!, 10);
    // check if trying to unblock self
    if (blockedId === blockerId) {
      return res.status(400).json({ error: "You can't unblock yourself." });
    }

    try {
      // unblock the user, the method returns false if no block existed
      const unblockSuccessful = await unblockUser(blockerId, blockedId);
      if (!unblockSuccessful) {
        return res.status(200).json({ message: 'User is already unblocked.' });
      }

      return res.status(200).json({ message: 'User unblocked successfully.' });
    } catch (error) {
      next(error);
    }
  },
};

export default chatController;
