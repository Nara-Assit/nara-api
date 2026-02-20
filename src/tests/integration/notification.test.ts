import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { jest } from '@jest/globals';
import type { Socket } from 'socket.io';
import type { NextFunction } from 'express';
import { RoleType, type User } from '@prisma/client';
import { createUser } from '../../repositories/userRepo.js';
import prisma from '../../db.js';
import { NotificationType, type NotificationData } from '../../types/NotificationMessage.js';
import { SERVER_EMITTED_EVENTS } from '../../config/constants/socketConstants.js';

const verifySocketToken = jest.fn((socket: Socket, next: NextFunction) => {
  socket.data.userId = socket.handshake.auth.userId;
  next();
});
jest.unstable_mockModule('../../middleware/socketAuthMiddleware.js', () => ({
  verifySocketToken,
}));

const { initializeSocket } = await import('../../socket.js');
const { sendNotification } = await import('../../services/notificationService.js');

describe('Notification Service Integration Tests', () => {
  let users: User[];
  let httpServer: ReturnType<typeof createServer>;
  let port: number;
  let client1: ClientSocket | null = null;
  let client2: ClientSocket | null = null;
  const notificationMessage: NotificationData = {
    type: NotificationType.SYSTEM,
    title: 'Test Notification',
    body: 'This is a test notification sent from the server.',
    senderId: null,
    payload: {
      key1: 'value1',
      key2: 'value2',
    },
  };

  async function createUsers() {
    const users = [];
    users.push(
      await createUser({
        email: 'user1@example.com',
        age: 25,
        closeContactNumber: '1234567890',
        name: 'User 1',
        passwordHash: 'hashedpassword1',
        country: 'Country1',
        phoneNumber: '1234567890',
        role: RoleType.DEAF,
      }),
      await createUser({
        email: 'user2@example.com',
        age: 25,
        closeContactNumber: '11234567890',
        name: 'User 2',
        passwordHash: 'hashedpassword2',
        country: 'Country2',
        phoneNumber: '12234567890',
        role: RoleType.DEAF,
      }),
      await createUser({
        email: 'user3@example.com',
        age: 25,
        closeContactNumber: '1234567890',
        name: 'User 3',
        passwordHash: 'hashedpassword3',
        country: 'Country3',
        phoneNumber: '13234567890',
        role: RoleType.DEAF,
      })
    );

    return users;
  }

  async function clearUsers() {
    await prisma.user.deleteMany({});
  }

  async function clearNotifications() {
    await prisma.notification.deleteMany({});
  }

  async function getUserLastNotification(userId: number) {
    const userNotifications = await prisma.userNotification.findMany({
      where: { userId },
      orderBy: {
        notification: {
          createdAt: 'desc',
        },
      },
      include: {
        notification: true,
      },
    });

    return userNotifications.length > 0 ? userNotifications[0]!.notification : null;
  }

  function connectClient(userId: number): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { userId },
      });

      client.on('connect', () => resolve(client));

      client.on('connect_error', (err) => {
        client.disconnect();
        reject(new Error(`Connection failed for user ${userId}: ${err.message}`));
      });
    });
  }

  beforeAll(async () => {
    users = await createUsers();

    httpServer = createServer();

    initializeSocket(httpServer);

    httpServer.listen(() => {
      const address = httpServer.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to bind test server');
      }

      port = address.port;
    });
  });

  afterAll(async () => {
    // Disconnect all clients
    [client1, client2].forEach((client) => {
      if (client) {
        client.disconnect();
        client.removeAllListeners();
      }
    });
    client1 = client2 = null;

    // Clear database
    await clearUsers();
    await clearNotifications();

    // Close HTTP server
    httpServer.close();
  });

  afterEach(() => {
    client1?.disconnect();
    client2?.disconnect();
    client1 = null;
    client2 = null;
  });

  test('offline users can view notifications via database', async () => {
    await sendNotification(notificationMessage, [users[0]!.id]);
    const lastNotification = await getUserLastNotification(users[0]!.id);
    expect(lastNotification?.payload).toEqual(notificationMessage.payload);
  });

  test('online user can receive notifications via sockets and view them via database', async () => {
    client1 = await connectClient(users[0]!.id);

    const handler = jest.fn();

    client1.on(SERVER_EMITTED_EVENTS.NEW_NOTIFICATION, handler);

    await sendNotification(notificationMessage, [users[0]!.id]);

    // Wait for the notification to be received
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(handler).toHaveBeenCalledWith(notificationMessage);

    const lastNotification = await getUserLastNotification(users[0]!.id);
    expect(lastNotification?.payload).toEqual(notificationMessage.payload);
  });

  test('multiple online users receive notifications via sockets and view them via database', async () => {
    client1 = await connectClient(users[0]!.id);
    client2 = await connectClient(users[1]!.id);

    const handler = jest.fn();

    client1.on(SERVER_EMITTED_EVENTS.NEW_NOTIFICATION, handler);
    client2.on(SERVER_EMITTED_EVENTS.NEW_NOTIFICATION, handler);

    await sendNotification(notificationMessage, [users[0]!.id, users[1]!.id]);

    // Wait for the notification to be received
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith(notificationMessage);

    const lastNotification1 = await getUserLastNotification(users[0]!.id);
    expect(lastNotification1?.payload).toEqual(notificationMessage.payload);

    const lastNotification2 = await getUserLastNotification(users[1]!.id);
    expect(lastNotification2?.payload).toEqual(notificationMessage.payload);
  });

  test('same user with multiple connections receives notifications on all connections', async () => {
    client1 = await connectClient(users[0]!.id);
    client2 = await connectClient(users[0]!.id);

    const handler = jest.fn();

    client1.on(SERVER_EMITTED_EVENTS.NEW_NOTIFICATION, handler);
    client2.on(SERVER_EMITTED_EVENTS.NEW_NOTIFICATION, handler);

    await sendNotification(notificationMessage, [users[0]!.id]);

    // Wait for the notification to be received
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith(notificationMessage);

    const lastNotification1 = await getUserLastNotification(users[0]!.id);
    expect(lastNotification1?.payload).toEqual(notificationMessage.payload);
  });
});
