import { Socket, Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifySocketToken } from './middleware/socketAuthMiddleware.js';
import { getUserChatIds } from './repositories/userRepo.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { config } from './config/config.js';

let io: SocketServer;
const userSockets = new Map<number, Set<Socket>>();

export function initializeSocket(server: HttpServer) {
  const pubClient = new Redis(config.UPSTASH_REDIS_REST_URL);
  const subClient = pubClient.duplicate();

  io = new SocketServer(server, {
    adapter: createAdapter(pubClient, subClient),
  });

  io.use(verifySocketToken);

  io.on('connection', async (socket: Socket) => {
    const userId = parseInt(socket.data.userId, 10);
    userSockets.set(userId, (userSockets.get(userId) || new Set()).add(socket));

    console.log(`User ${userId} connected: ${socket.id}`);
    console.log(`Total connected users: ${io.engine.clientsCount}`);

    // join a room for each chat the user is part of
    const chatIds = await getUserChatIds(userId);
    for (const chatId of chatIds) {
      socket.join(`chat_${chatId}`);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  // Listen for room:leave events to remove users from chat rooms across servers
  io.on('room:leave', handleUserLeaving);
}

export function getIo(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

export function handleUserLeaving({ userId, chatId }: { userId: number; chatId: number }) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    for (const socket of sockets) {
      socket.leave(`chat_${chatId}`);
    }
  }
}
