import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.js';
import { blockUser, canInteract, isUserBlocked, unblockUser } from '../repositories/blocksRepo.js';
import {
  getChatById,
  findPrivateChatBetween,
  create,
  deleteChatById,
  updateChatActivity,
  updateChat,
  isAdminOfChat,
  isChatMember,
  findChatMembers,
  findChatMembersCount,
  findChatAdminsCount,
  findAChatMember,
  promoteToAdmin,
} from '../repositories/chatRepo.js';
import { ChatType, Prisma } from '@prisma/client';
import {
  createMessage,
  deleteMessageById,
  getMessageById,
  getMessagesByChatId,
} from '../repositories/messageRepo.js';
import {
  removeUserFromChat,
  addMember,
  addManyMembers,
  findChatMembership,
  setUserChatFavorite,
  getUserChats,
  getUserById,
} from '../repositories/userRepo.js';
import type { CreateChatInput, UpdateChatInput } from '../schemas/chatSchema.js';
import {
  emitChatCreated,
  emitChatDeleted,
  emitChatMemberAdded,
  emitChatMessageDeleted,
  emitChatUpdated,
  emitUserLeftChat,
  makeUsersJoinChat,
  makeUsersLeaveChat,
  notifyChatMessage,
} from '../services/socketService.js';
import { sendNotification } from '../services/notificationService.js';
import { NotificationType, type MessageNotification } from '../types/NotificationMessage.js';

const chatController = {
  getChats: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.userId!, 10);
      const isFavoriteOnly = req.query.favorite === 'true';

      // 1. Fetch raw chat data from repository
      const userChats = await getUserChats(userId, isFavoriteOnly);

      // 2. Format chats for the UI
      const formattedChats = userChats.map((membership) => {
        const { chat } = membership;
        const lastMessage = chat.messages[0] || null;

        // Logic: If Private, the chat name is the "other" person's name
        if (chat.type === 'PRIVATE') {
          const otherMember = chat.members.find((m) => m.userId !== userId);
          return {
            id: chat.id,
            type: chat.type,
            name: otherMember?.user.name || 'Unknown User',
            avatarUrl: otherMember?.user.profileImageUrl || null,
            lastMessage: lastMessage?.text || null,
            lastActivity: chat.lastActivity,
            isFavorite: membership.isFavorite,
          };
        }

        // Logic: If Group, use the Chat's own metadata
        return {
          id: chat.id,
          type: chat.type,
          name: chat.name,
          avatarUrl: chat.avatarUrl,
          lastMessage: lastMessage?.text || null,
          lastActivity: chat.lastActivity,
          isFavorite: membership.isFavorite,
        };
      });

      res.status(200).json({
        success: true,
        message: 'Chats retrieved successfully',
        data: formattedChats,
      });
    } catch (error) {
      next(error);
    }
  },

  updateChat: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const chatId = parseInt(req.params.id!, 10);
      const updateData: UpdateChatInput = req.body;
      const currentUserId = parseInt(req.userId!, 10);

      const requesterMembership = await findChatMembership(currentUserId, chatId, true);

      if (!requesterMembership) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found or you are not a member',
        });
      }

      if (requesterMembership.chat.type !== 'GROUP') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update details of a private chat',
        });
      }

      if (requesterMembership.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update group settings',
        });
      }

      // 4. Perform the Update
      // We only update fields that are provided (undefined fields are ignored by Prisma if logically handled,
      // but explicit objects are cleaner).
      const updatedChat = await updateChat(chatId, updateData);

      emitChatUpdated(chatId, updatedChat, currentUserId);

      res.status(200).json({
        success: true,
        message: 'Group chat updated successfully',
        data: updatedChat,
      });
    } catch (error) {
      next(error);
    }
  },

  addChatMember: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const chatId = parseInt(req.params.id!, 10);
      const { targetUserId } = req.body;
      const currentUserId = parseInt(req.userId!, 10);

      // 2. Fetch Requester's Membership & Chat Details
      // We need to know: Is the requester in this chat? Are they an Admin? Is it a Group?
      const requesterMembership = await findChatMembership(currentUserId, chatId, true);

      // 3. Validation Checks

      // Check A: Does chat exist and is requester a member?
      if (!requesterMembership) {
        return res.status(404).json({ success: false, message: 'Chat not found or access denied' });
      }

      // Check B: Is it a Group Chat?
      if (requesterMembership.chat.type === 'PRIVATE') {
        return res
          .status(400)
          .json({ success: false, message: 'Cannot manually add members to a private chat' });
      }

      // Check C: Is requester an Admin?
      // (Remove this block if regular members are allowed to add people)
      if (requesterMembership.role !== 'ADMIN') {
        return res
          .status(403)
          .json({ success: false, message: 'Only admins can add members to this group' });
      }

      // 4. Check if Target User is already a member
      const existingMember = await findChatMembership(targetUserId, chatId);
      if (existingMember) {
        return res
          .status(409)
          .json({ success: false, message: 'User is already a member of this chat' });
      }

      const [newMember] = await Promise.all([
        addMember(chatId, targetUserId, 'Member'),
        updateChatActivity(chatId),
      ]);

      emitChatMemberAdded(chatId, newMember, currentUserId);

      res.status(200).json({
        success: true,
        message: 'Member added successfully',
        data: newMember,
      });
    } catch (error) {
      next(error);
    }
  },

  addChatFavorite: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const chatId = parseInt(req.params.id!, 10);
      const currentUserId = parseInt(req.userId!, 10);

      const updatedUserChat = await setUserChatFavorite(currentUserId, chatId);

      res.status(200).json({
        success: true,
        message: 'Chat marked as favorite successfully',
        data: updatedUserChat,
      });
    } catch (error) {
      next(error);
    }
  },

  createChat: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const chatData: CreateChatInput = req.body;
      const currentUserId = parseInt(req.userId!, 10);

      if (chatData.type === 'PRIVATE') {
        const { targetUserId } = chatData;

        // A.1 Check if chat already exists
        const existingChat = await findPrivateChatBetween(currentUserId, targetUserId);
        if (existingChat) {
          return res.status(200).json({
            success: true,
            message: 'Chat retrieved successfully',
            data: existingChat,
          });
        }

        // A.2 Create the Chat
        // This creates a generic room.
        const newChat = await create({ type: 'PRIVATE' });

        // A.3 Add Members (Parallel for performance)
        // Since it's private, both are just 'Member'
        await Promise.all([
          addMember(newChat.id, currentUserId, 'Member'),
          addMember(newChat.id, targetUserId, 'Member'),
        ]);

        makeUsersJoinChat([currentUserId, targetUserId], newChat.id);
        emitChatCreated(newChat, currentUserId);

        res.status(201).json({
          success: true,
          message: 'Chat created successfully',
          data: newChat,
        });
      } else if (chatData.type === 'GROUP') {
        const newGroup = await create({
          type: 'GROUP',
          name: chatData.name,
          description: chatData.description ?? null,
          avatarUrl: chatData.avatarUrl ?? null,
        });

        // B.2 Add Creator as Admin
        await addMember(newGroup.id, currentUserId, 'Admin');

        // B.3 Add other Members (Bulk Operation)
        if (chatData.members.length > 0) {
          await addManyMembers(newGroup.id, chatData.members, 'Member');
        }

        makeUsersJoinChat(chatData.members, newGroup.id);
        emitChatCreated(newGroup, currentUserId);

        res.status(201).json({
          success: true,
          message: 'Chat group created successfully',
          data: newGroup,
        });
      }
    } catch (error) {
      next(error);
    }
  },

  deleteChat: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const chatId = parseInt(req.params.id!, 10);
      const currentUserId = parseInt(req.userId!, 10);

      // 1. Check if the user is a member of this chat and get their role
      const userChat = await findChatMembership(currentUserId, chatId, true);

      // If no relationship exists, the chat doesn't exist or the user isn't in it
      if (!userChat) {
        // Using 404 to avoid leaking existence of chats the user isn't part of
        return res.status(404).json({
          success: false,
          message: 'Chat not found or access denied',
        });
      }

      // 2. Authorization Checks based on Chat Type
      if (userChat.chat.type === 'GROUP') {
        // For groups, only Admins can delete the entire chat
        if (userChat.role !== 'ADMIN') {
          return res.status(403).json({
            success: false,
            message: 'Only admins can delete this group',
          });
        }
      }
      // For PRIVATE chats, standard logic often allows either party to delete the conversation.
      // NOTE: This permanently deletes the history for the other user as well.
      await deleteChatById(chatId);

      emitChatDeleted(chatId, currentUserId);

      res.status(200).json({
        success: true,
        message: 'Chat deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  leaveGroup: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.userId!, 10);
      const chatId = parseInt(req.params.id!, 10);

      const chat = await getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ error: 'Group not found.' });
      }
      if (chat.type !== ChatType.GROUP) {
        return res.status(400).json({ error: 'Cannot leave a private chat.' });
      }

      const chatDeletedUser = await removeUserFromChat(userId, chatId);
      const membersCount = await findChatMembersCount(chatId);

      if (membersCount === 0) {
        await deleteChatById(chatId);
        emitChatDeleted(chatId, userId);
      } else {
        const adminsCount = await findChatAdminsCount(chatId);
        if (adminsCount === 0) {
          const newAdmin = await findAChatMember(chatId);
          if (newAdmin) {
            await promoteToAdmin(newAdmin.userId, chatId);
          }
        }
      }

      makeUsersLeaveChat([userId], chatId);
      emitUserLeftChat(chatDeletedUser);

      return res.status(200).json({ message: 'Left successfully.' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ error: 'Not a member.' });
      }
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

      const includeSender = chat.type === ChatType.GROUP;
      const messages = await getMessagesByChatId(chatId, page, limit, includeSender);
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
      const chat = await getChatById(chatId);

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found.' });
      }

      // check if sender is in chat members
      const isMember = await isChatMember(chatId, senderId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this chat.' });
      }

      const chatMembers = await findChatMembers(chatId);

      // if chat is private and sender is blocked by recipient, prevent message creation
      // if chat is group, allow message creation even some members have blocked the sender
      if (chat.type === ChatType.PRIVATE) {
        const recipient = chatMembers.find((member) => member.userId !== senderId);
        if (recipient) {
          const canInteractResult = await canInteract(recipient.userId, senderId);
          if (!canInteractResult) {
            return res.status(403).json({
              error: "Can't send message to this user, one of you has blocked the other.",
            });
          }
        }
      }

      // store the message in the database
      const message = await createMessage({
        chatId,
        senderId,
        text,
      });

      const senderName = (await getUserById(senderId))?.name ?? 'Unknown User';

      const messageNotification: MessageNotification = {
        body: text,
        title: chat.type === ChatType.PRIVATE ? senderName : chat.name || 'New message',
        type: NotificationType.CHAT,
        senderId,
        payload: {
          chatId: chat.id,
          messageId: message.id,
          senderName,
        },
      };

      await sendNotification(
        messageNotification,
        chatMembers
          .filter((member) => member.userId !== senderId)
          .map((member) => member.userId) as [number, ...number[]],
        () => notifyChatMessage(messageNotification, senderId)
      );

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

      const chat = await getChatById(chatId);
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
        const isAdmin = await isAdminOfChat(senderId, chatId);
        if (storedMessage.senderId !== senderId && !isAdmin) {
          return res.status(403).json({
            error: 'You can only delete your own messages if you are not an admin in group chats.',
          });
        }
      }

      // delete the message from the database
      const deletedMessage = await deleteMessageById(messageId, chatId);

      emitChatMessageDeleted(deletedMessage, senderId);

      return res.status(200).json({ message: 'Message deleted successfully.' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({ error: 'Message not found or already deleted.' });
      }
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
      // block the user
      await blockUser(blockerId, blockedId);
      return res.status(201).json({ message: 'User blocked successfully.' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(200).json({ message: 'User is already blocked.' });
        }
        if (error.code === 'P2003') {
          return res.status(404).json({ message: 'User not found.' });
        }
      }
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
