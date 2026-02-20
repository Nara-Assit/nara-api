import { Socket, Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifySocketToken } from './middleware/socketAuthMiddleware.js';
import { getUserChatIds, updateUser } from './repositories/userRepo.js';
import { getUserStatus } from './services/socketService.js';
import {
  CLIENT_EMITTED_EVENTS,
  SERVER_EMITTED_EVENTS,
} from './config/constants/socketConstants.js';

let io: SocketServer;

export enum USER_STATUS {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export function initializeSocket(server: HttpServer) {
  io = new SocketServer(server);

  io.use(verifySocketToken);

  io.on('connection', async (socket: Socket) => {
    const userId = parseInt(socket.data.userId, 10);

    if (getUserStatus(userId) === USER_STATUS.OFFLINE) {
      // Notify other users about this user's presence update
      io.to(`presence:${userId}`).emit(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, [
        { userId, status: USER_STATUS.ONLINE },
      ]);
    }

    socket.join(`user:${userId}`);

    // join a room for each chat the user is part of
    const chatIds = await getUserChatIds(userId);
    for (const chatId of chatIds) {
      socket.join(`chat:${chatId}`);
    }

    // Handle disconnection, socket will automatically leave all rooms it was part of, but we can log it here
    socket.on('disconnect', async () => {
      // Check if the user no longer has any active sockets before marking them as offline
      if (getUserStatus(userId) === USER_STATUS.OFFLINE) {
        // Notify other users about this user's presence update
        io.to(`presence:${userId}`).emit(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, [
          {
            userId,
            status: USER_STATUS.OFFLINE,
          },
        ]);

        // Update user's last active timestamp in the database
        await updateUser(userId, { lastActiveAt: new Date() });
      }
    });

    // handling subscribing to other users presence updates
    socket.on(CLIENT_EMITTED_EVENTS.PRESENCE_SUBSCRIBE, (data) => {
      const { userIds } = data; // array of userIds to subscribe to

      const userStatusUpdates = userIds.map((id: number) => {
        socket.join(`presence:${id}`);

        return {
          userId: id,
          status: getUserStatus(id),
        };
      });

      socket.emit(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, userStatusUpdates);
    });

    // handling unsubscribing from other users presence updates
    socket.on(CLIENT_EMITTED_EVENTS.PRESENCE_UNSUBSCRIBE, (data) => {
      const { userIds } = data; // array of userIds to unsubscribe from
      for (const id of userIds) {
        socket.leave(`presence:${id}`);
      }
    });
  });
}

export function getIo(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}
