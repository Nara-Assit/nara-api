/* eslint-disable @typescript-eslint/no-explicit-any */
// tests/socket.test.ts
import server from '../../../server.js';
import { io as Client, Socket } from 'socket.io-client';
import prisma from '../../../db.js';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/config.js';
import request from 'supertest';
import { getMessagesByChatId } from '../../../repositories/messageRepo.js';
import { getIo } from '../../../socket.js';
import type { NotificationData } from '../../../types/NotificationMessage.js';
import { SERVER_EMITTED_EVENTS } from '../../../config/constants/socketConstants.js';

describe('Socket.IO chat integration test', () => {
  const clients: [Socket, number][] = [];
  let testUsers: { id: number; token: string }[] = [];
  let privateChatId: number;
  let groupChatId: number;
  const waitingTime = 1000;

  beforeAll(async () => {
    // Create users
    const u1 = await prisma.user.create({
      data: {
        name: 'User1',
        email: 'u1@test.com',
        passwordHash: 'hash',
        country: 'Test',
        age: 20,
        closeContactNumber: '123',
        role: 'DEAF',
      },
    });
    const u2 = await prisma.user.create({
      data: {
        name: 'User2',
        email: 'u2@test.com',
        passwordHash: 'hash',
        country: 'Test',
        age: 22,
        closeContactNumber: '456',
        role: 'MUTE',
      },
    });
    const u3 = await prisma.user.create({
      data: {
        name: 'User3',
        email: 'u3@test.com',
        passwordHash: 'hash',
        country: 'Test',
        age: 25,
        closeContactNumber: '789',
        role: 'PARENT',
      },
    });
    const u4 = await prisma.user.create({
      data: {
        name: 'User4',
        email: 'u4@test.com',
        passwordHash: 'hash',
        country: 'Test',
        age: 25,
        closeContactNumber: '789',
        role: 'PARENT',
      },
    });

    testUsers = [
      { id: u1.id, token: jwt.sign({ userId: u1.id }, config.ACCESS_TOKEN_SECRET) },
      { id: u2.id, token: jwt.sign({ userId: u2.id }, config.ACCESS_TOKEN_SECRET) },
      { id: u3.id, token: jwt.sign({ userId: u3.id }, config.ACCESS_TOKEN_SECRET) },
      { id: u4.id, token: jwt.sign({ userId: u4.id }, config.ACCESS_TOKEN_SECRET) },
    ];

    // Create chats
    const privateChat = await prisma.chat.create({ data: { type: 'PRIVATE' } });
    const groupChat = await prisma.chat.create({ data: { type: 'GROUP' } });
    privateChatId = privateChat.id;
    groupChatId = groupChat.id;

    // Add users to chats
    await prisma.userChat.createMany({
      data: [
        { userId: u1.id, chatId: privateChatId, role: 'MEMBER' },
        { userId: u2.id, chatId: privateChatId, role: 'MEMBER' },
        { userId: u2.id, chatId: groupChatId, role: 'MEMBER' },
        { userId: u3.id, chatId: groupChatId, role: 'MEMBER' },
        { userId: u4.id, chatId: groupChatId, role: 'MEMBER' },
      ],
    });
  });

  test('Only allow authenticated users to connect', (done) => {
    const client = Client('http://localhost:3000');

    client.on('connect_error', (err) => {
      expect(err.message).toBe('Unauthorized, token required');
      client.disconnect();
      done();
    });
  });

  test('Users connect and join rooms', (done) => {
    let connectedCount = 0;

    testUsers.forEach((user) => {
      const client = Client('http://localhost:3000', {
        auth: { token: user.token },
      });

      clients.push([client, user.id]);

      client.on('connect', async () => {
        connectedCount++;
        if (connectedCount === testUsers.length) {
          // Verify rooms (for demo purposes, we just check if clients connected)
          clients.forEach((c) => {
            expect(c[0].connected).toBe(true);
          });
          done();
        }
      });
    });
  });

  test('Private messages are sent to members only', async () => {
    const expectedRecipients = new Set([testUsers[1]!.id]);
    const actualRecipients = new Set<number>();
    const text = 'Hello Private Chat!';
    const handlers = new Map<number, (message: NotificationData) => void>();

    // listen for the message received by other clients
    function messageHandler(client: [Socket, number]) {
      const handler = (message: NotificationData) => {
        expect(message.body).toBe(text);
        actualRecipients.add(client[1]);
      };

      handlers.set(client[1], handler);
      return handler;
    }

    clients.forEach((client) => {
      client[0].on(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, messageHandler(client));
    });

    await request(server)
      .post(`/api/chats/${privateChatId}/messages`)
      .send({
        text,
      })
      .set('Authorization', `Bearer ${testUsers[0]!.token}`)
      .expect(201);

    // Check if messages are stored in database
    const messages = await getMessagesByChatId(privateChatId);
    expect(messages.length).toEqual(1);
    expect(messages[0]!.text).toBe(text);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(actualRecipients).toEqual(expectedRecipients);
        // Clean up listeners
        clients.forEach((client) => {
          client[0].off(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, handlers.get(client[1])!);
        });
        resolve();
      }, waitingTime); // wait for messages to be received
    });
  });

  test('Group messages are sent to members only', async () => {
    const expectedRecipients = new Set([testUsers[2]!.id, testUsers[3]!.id]);
    const actualRecipients = new Set<number>();
    const text = 'Hello Group Chat!';
    const handlers = new Map<number, (message: any) => void>();

    // listen for the message received by other clients
    function messageHandler(client: [Socket, number]) {
      const handler = (message: NotificationData) => {
        expect(message.body).toBe(text);
        actualRecipients.add(client[1]);
      };

      handlers.set(client[1], handler);
      return handler;
    }

    clients.forEach((client) => {
      client[0].on(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, messageHandler(client));
    });

    await request(server)
      .post(`/api/chats/${groupChatId}/messages`)
      .send({
        text,
      })
      .set('Authorization', `Bearer ${testUsers[1]!.token}`)
      .expect(201);

    // Check if messages are stored in database
    const messages = await getMessagesByChatId(groupChatId);
    expect(messages.length).toEqual(1);
    expect(messages[0]!.text).toBe(text);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(actualRecipients).toEqual(expectedRecipients);
        // Clean up listeners
        clients.forEach((client) => {
          client[0].off(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, handlers.get(client[1])!);
        });
        resolve();
      }, waitingTime); // wait for messages to be received
    });
  });

  test('messages can not be sent by members who are not part of the group', async () => {
    const actualRecipients = new Set<number>();
    const text = 'Hello Group Chat!';
    const handlers = new Map<number, (message: any) => void>();

    // listen for the message received by other clients
    function messageHandler(client: [Socket, number]) {
      const handler = (_: any) => {
        actualRecipients.add(client[1]);
      };

      handlers.set(client[1], handler);
      return handler;
    }

    clients.forEach((client) => {
      client[0].on(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, messageHandler(client));
    });

    // User 1 is not part of the group chat
    await request(server)
      .post(`/api/chats/${groupChatId}/messages`)
      .send({
        text,
      })
      .set('Authorization', `Bearer ${testUsers[0]!.token}`)
      .expect(403); // Expect Forbidden

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(actualRecipients.size).toEqual(0);
        // Clean up listeners
        clients.forEach((client) => {
          client[0].off(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, handlers.get(client[1])!);
        });
        resolve();
      }, waitingTime); // wait for messages to be received
    });
  });

  test('Users can leave group and no longer send or receive messages', async () => {
    const text = 'Message after leaving group';
    const expectedRecipients = new Set([testUsers[3]!.id]);
    const actualRecipients = new Set<number>();
    const handlers = new Map<number, (message: NotificationData) => void>();

    // listen for the message received by other clients
    function messageHandler(client: [Socket, number]) {
      const handler = (message: NotificationData) => {
        expect(message.body).toBe(text);
        expect(message.senderId).toBe(testUsers[1]!.id);
        expect(message.payload.chatId).toBe(groupChatId);
        actualRecipients.add(client[1]);
      };

      handlers.set(client[1], handler);
      return handler;
    }

    clients.forEach((client) => {
      client[0].on(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, messageHandler(client));
    });

    // User 3 leaves the group
    await request(server)
      .post(`/api/chats/${groupChatId}/leave-group`)
      .set('Authorization', `Bearer ${testUsers[2]!.token}`)
      .expect(200);

    // User 3 tries to send a message to the group and should be forbidden
    await request(server)
      .post(`/api/chats/${groupChatId}/messages`)
      .send({
        text,
      })
      .set('Authorization', `Bearer ${testUsers[2]!.token}`)
      .expect(403);

    // User 2 sends a message to the group
    await request(server)
      .post(`/api/chats/${groupChatId}/messages`)
      .send({
        text,
      })
      .set('Authorization', `Bearer ${testUsers[1]!.token}`)
      .expect(201);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        // User 3 should not receive the message
        expect(actualRecipients).toEqual(expectedRecipients);
        // Clean up listeners
        clients.forEach((client) => {
          client[0].off(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, handlers.get(client[1])!);
        });
        resolve();
      }, waitingTime); // wait for messages to be received
    });
  });

  test('Blocked users cannot send messages to each other', async () => {
    const text = 'Message after blocking user';
    const actualRecipients = new Set<number>();
    const handlers = new Map<number, (message: NotificationData) => void>();

    // listen for the message received by other clients
    function messageHandler(client: [Socket, number]) {
      const handler = (_: NotificationData) => {
        actualRecipients.add(client[1]);
      };

      handlers.set(client[1], handler);
      return handler;
    }

    clients.forEach((client) => {
      client[0].on(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, messageHandler(client));
    });

    // User 1 blocks User 2
    await request(server)
      .post(`/api/chats/block/${testUsers[1]!.id}`)
      .set('Authorization', `Bearer ${testUsers[0]!.token}`)
      .expect(201);

    // Verify that User 1 has blocked User 2
    await request(server)
      .get(`/api/chats/is-blocked-by-me/${testUsers[1]!.id}`)
      .set('Authorization', `Bearer ${testUsers[0]!.token}`)
      .expect(200, { blocked: true });

    // Verify that User 1 is not blocked by User 2
    await request(server)
      .get(`/api/chats/is-blocked-by-me/${testUsers[0]!.id}`)
      .set('Authorization', `Bearer ${testUsers[1]!.token}`)
      .expect(200, { blocked: false });

    // User 1 tries to send message to User 2, should be forbidden
    await request(server)
      .post(`/api/chats/${privateChatId}/messages`)
      .set('Authorization', `Bearer ${testUsers[0]!.token}`)
      .send({
        text,
      })
      .expect(403);

    // User 2 tries to send message to User 1, should be forbidden
    await request(server)
      .post(`/api/chats/${privateChatId}/messages`)
      .set('Authorization', `Bearer ${testUsers[1]!.token}`)
      .send({
        text,
      })
      .expect(403);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(actualRecipients.size).toEqual(0);
        // Clean up listeners
        clients.forEach((client) => {
          client[0].off(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, handlers.get(client[1])!);
        });
        resolve();
      }, waitingTime); // wait for messages to be received
    });
  });

  test('Verify that unblocking users allows message sending', async () => {
    const text = 'Message after unblocking user';
    const expectedRecipients = new Set([testUsers[0]!.id, testUsers[1]!.id]);
    const actualRecipients = new Set<number>();
    const handlers = new Map<number, (message: NotificationData) => void>();

    // listen for the message received by other clients
    function messageHandler(client: [Socket, number]) {
      const handler = (message: NotificationData) => {
        expect(message.body).toBe(text);
        expect([testUsers[0]!.id, testUsers[1]!.id]).toContain(message.senderId);
        expect(message.payload.chatId).toBe(privateChatId);
        actualRecipients.add(client[1]);
      };

      handlers.set(client[1], handler);
      return handler;
    }

    clients.forEach((client) => {
      client[0].on(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, messageHandler(client));
    });

    // User 1 unblocks User 2
    await request(server)
      .post(`/api/chats/unblock/${testUsers[1]!.id}`)
      .set('Authorization', `Bearer ${testUsers[0]!.token}`)
      .expect(200);

    // Verify that User 2 is no longer blocked by User 1
    await request(server)
      .get(`/api/chats/is-blocked-by-me/${testUsers[1]!.id}`)
      .set('Authorization', `Bearer ${testUsers[0]!.token}`)
      .expect(200, { blocked: false });

    // User 1 tries to send message to User 2, should be allowed
    await request(server)
      .post(`/api/chats/${privateChatId}/messages`)
      .set('Authorization', `Bearer ${testUsers[0]!.token}`)
      .send({
        text,
      })
      .expect(201);

    // User 2 tries to send message to User 1, should be allowed
    await request(server)
      .post(`/api/chats/${privateChatId}/messages`)
      .set('Authorization', `Bearer ${testUsers[1]!.token}`)
      .send({
        text,
      })
      .expect(201);

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(actualRecipients).toEqual(expectedRecipients);
        // Clean up listeners
        clients.forEach((client) => {
          client[0].off(SERVER_EMITTED_EVENTS.CHAT_MESSAGE_CREATED, handlers.get(client[1])!);
        });
        resolve();
      }, waitingTime); // wait for messages to be received
    });
  });

  afterAll(async () => {
    // Disconnect clients
    clients.forEach(([client]) => {
      client.disconnect();
      client.removeAllListeners();
    });
    clients.length = 0;

    // Close Socket.IO server
    const io = getIo();
    await io.close();

    // Close HTTP server
    await server.close();

    // Cleanup DB
    await prisma.message.deleteMany();
    await prisma.userChat.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.userBlock.deleteMany();
    await prisma.user.deleteMany();

    // Disconnect Prisma
    await prisma.$disconnect();
  });
});
