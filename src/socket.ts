import { Socket, Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifySocketToken } from './middleware/socketAuthMiddleware.js';
import { getUserChatIds } from './repositories/userRepo.js';

let io: SocketServer;

export function initializeSocket(server: HttpServer) {
  io = new SocketServer(server);

  io.use(verifySocketToken);

  io.on('connection', async (socket: Socket) => {
    const userId = parseInt(socket.data.userId, 10);

    socket.join(`user:${userId}`);

    console.log(`User ${userId} connected: ${socket.id}`);
    console.log(`Total connected users: ${io.engine.clientsCount}`);

    // join a room for each chat the user is part of
    const chatIds = await getUserChatIds(userId);
    for (const chatId of chatIds) {
      socket.join(`chat:${chatId}`);
    }

    // Handle disconnection, socket will automatically leave all rooms it was part of, but we can log it here
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
