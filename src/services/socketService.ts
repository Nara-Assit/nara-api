import type { Chat, Message, UserChat } from '@prisma/client';
import { getIo, USER_STATUS } from '../socket.js';
import type { MessageNotification, NotificationData } from '../types/NotificationMessage.js';
import { SERVER_EMITTED_EVENTS } from '../config/constants/socketConstants.js';

export function notifyUsers(notification: NotificationData, userIds: [number, ...number[]]) {
  userIds.forEach((id) => {
    getIo().to(`user:${id}`).emit(SERVER_EMITTED_EVENTS.NEW_NOTIFICATION, notification);
  });
}

export function notifyChatMessage(messageNotification: MessageNotification, senderId: number) {
  getIo()
    .to(`chat:${messageNotification.payload.chatId}`)
    .except(`user:${senderId}`)
    .emit(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, messageNotification);
}

export function emitUserLeftChat(chatDeletedUser: UserChat) {
  getIo().to(`chat:${chatDeletedUser.chatId}`).emit(SERVER_EMITTED_EVENTS.CHAT_MEMBER_LEFT, {
    chatId: chatDeletedUser.chatId,
    userId: chatDeletedUser.userId,
    role: chatDeletedUser.role,
  });
}

export function emitChatMessageDeleted(deletedMessage: Message, deleterId: number) {
  getIo()
    .to(`chat:${deletedMessage.chatId}`)
    .except(`user:${deleterId}`)
    .emit(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_DELETED, deletedMessage);
}

export function emitChatDeleted(chatId: number, deleterId: number) {
  getIo()
    .to(`chat:${chatId}`)
    .except(`user:${deleterId}`)
    .emit(SERVER_EMITTED_EVENTS.CHAT_DELETED, { chatId });
}

export function emitChatUpdated(chatId: number, updatedChat: Chat, updaterId: number) {
  getIo()
    .to(`chat:${chatId}`)
    .except(`user:${updaterId}`)
    .emit(SERVER_EMITTED_EVENTS.CHAT_UPDATED, updatedChat);
}

export function emitChatMemberAdded(chatId: number, chatMember: UserChat, adderId: number) {
  getIo().to(`chat:${chatId}`).emit(SERVER_EMITTED_EVENTS.CHAT_MEMBER_ADDED, {
    addedMemberId: chatMember.userId,
    chatId,
    adderId,
    role: chatMember.role,
    joinedAt: chatMember.joinedAt,
  });
}

export function emitChatCreated(chat: Chat, creatorId: number) {
  getIo()
    .to(`chat:${chat.id}`)
    .except(`user:${creatorId}`)
    .emit(SERVER_EMITTED_EVENTS.CHAT_CREATED, chat);
}

export function makeUsersJoinChat(userIds: number[], chatId: number) {
  userIds.forEach((id) => {
    getIo().in(`user:${id}`).socketsJoin(`chat:${chatId}`);
  });
}

export function makeUsersLeaveChat(userIds: number[], chatId: number) {
  userIds.forEach((id) => {
    getIo().in(`user:${id}`).socketsLeave(`chat:${chatId}`);
  });
}

export function getUserStatus(userId: number): USER_STATUS {
  const userSocketCount = getIo().sockets.adapter.rooms.get(`user:${userId}`)?.size ?? 0;
  return userSocketCount > 0 ? USER_STATUS.ONLINE : USER_STATUS.OFFLINE;
}
