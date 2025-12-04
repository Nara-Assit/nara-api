import { Socket, Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifySocketToken } from './middleware/socketAuthMiddleware.js';
import { getUserChatIds } from './repositories/userRepo.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { config } from './config/config.js';

let io: SocketServer;

export function initializeSocket(server: HttpServer) {
  const pubClient = new Redis(config.UPSTASH_REDIS_REST_URL);
  const subClient = pubClient.duplicate();

  io = new SocketServer(server, {
    adapter: createAdapter(pubClient, subClient),
  });

  io.use(verifySocketToken);

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
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
    });
  });
}

export function getIo(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}
