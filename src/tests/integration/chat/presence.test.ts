import { createServer, Server as HttpServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { jest } from '@jest/globals';
import type { Socket } from 'socket.io';
import type { NextFunction } from 'express';
import {
  CLIENT_EMITTED_EVENTS,
  SERVER_EMITTED_EVENTS,
} from '../../../config/constants/socketConstants.js';

const getUserChatIds = jest.fn(() => []);
const updateUser = jest.fn();

const verifySocketToken = jest.fn((socket: Socket, next: NextFunction) => {
  socket.data.userId = socket.handshake.auth.userId;
  next();
});

jest.unstable_mockModule('../../../repositories/userRepo.js', () => ({
  getUserChatIds,
  updateUser,
}));

jest.unstable_mockModule('../../../middleware/socketAuthMiddleware.js', () => ({
  verifySocketToken,
}));

const { initializeSocket, USER_STATUS } = await import('../../../socket.js');

describe('Presence realtime updates', () => {
  let httpServer: HttpServer;
  let port: number;
  let client1: ClientSocket | null = null;
  let client2: ClientSocket | null = null;
  let client3: ClientSocket | null = null;

  beforeAll((done) => {
    httpServer = createServer();

    initializeSocket(httpServer);

    httpServer.listen(() => {
      const address = httpServer.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to bind test server');
      }

      port = address.port;
      done();
    });
  });

  afterAll(async () => {
    // Disconnect all clients and remove listeners
    [client1, client2, client3].forEach((client) => {
      if (client) {
        client.disconnect();
        client.removeAllListeners();
      }
    });

    // Close HTTP server
    httpServer.close();
  });

  afterEach(() => {
    client1?.disconnect();
    client2?.disconnect();
    client3?.disconnect();
    client1 = null;
    client2 = null;
    client3 = null;
  });

  function connectClient(userId: number): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: { userId }, // Ensure your middleware is actually expecting "userId" here
      });

      client.on('connect', () => resolve(client));

      client.on('connect_error', (err) => {
        client.disconnect();
        reject(new Error(`Connection failed for user ${userId}: ${err.message}`));
      });
    });
  }

  function delay(ms = 50) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  test('presence:update receives initial OFFLINE updates', async () => {
    client1 = await connectClient(1);

    const handler = jest.fn();

    client1.on(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, handler);
    client1.emit(CLIENT_EMITTED_EVENTS.PRESENCE_SUBSCRIBE, { userIds: [2, 3] });

    await delay();

    expect(handler.mock.calls[0]?.[0]).toEqual([
      { userId: 2, status: USER_STATUS.OFFLINE },
      { userId: 3, status: USER_STATUS.OFFLINE },
    ]);
  });

  test('presence:update receives initial ONLINE updates', async () => {
    client1 = await connectClient(1);
    client2 = await connectClient(2);
    client3 = await connectClient(3);

    const handler = jest.fn();

    client1.on(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, handler);
    client1.emit(CLIENT_EMITTED_EVENTS.PRESENCE_SUBSCRIBE, { userIds: [2, 3] });

    await delay();

    expect(handler.mock.calls[0]?.[0]).toEqual([
      { userId: 2, status: USER_STATUS.ONLINE },
      { userId: 3, status: USER_STATUS.ONLINE },
    ]);
  });

  test('presence:update receives ONLINE updates on connections', async () => {
    client1 = await connectClient(1);

    const handler = jest.fn();

    client1.on(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, handler);
    client1.emit(CLIENT_EMITTED_EVENTS.PRESENCE_SUBSCRIBE, { userIds: [2, 3] });

    client2 = await connectClient(2);
    client3 = await connectClient(3);

    await delay();

    expect(handler.mock.calls[1]?.[0]).toEqual([{ userId: 2, status: USER_STATUS.ONLINE }]);
    expect(handler.mock.calls[2]?.[0]).toEqual([{ userId: 3, status: USER_STATUS.ONLINE }]);
  });

  test('presence:update receives OFFLINE updates on disconnections', async () => {
    client1 = await connectClient(1);
    client2 = await connectClient(2);
    client3 = await connectClient(3);

    const handler = jest.fn();
    client1.on(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, handler);
    client1.emit(CLIENT_EMITTED_EVENTS.PRESENCE_SUBSCRIBE, { userIds: [2, 3] });

    await delay();

    client2.disconnect();
    await delay();
    expect(handler.mock.calls[1]?.[0]).toEqual([{ userId: 2, status: USER_STATUS.OFFLINE }]);

    client3.disconnect();
    await delay();
    expect(handler.mock.calls[2]?.[0]).toEqual([{ userId: 3, status: USER_STATUS.OFFLINE }]);
  });

  test('presence:update only receives OFFLINE updates when all sockets for the same client disconnect', async () => {
    client1 = await connectClient(1);
    client2 = await connectClient(2);
    client3 = await connectClient(2);

    const handler = jest.fn();

    client1.on(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, handler);
    client1.emit(CLIENT_EMITTED_EVENTS.PRESENCE_SUBSCRIBE, { userIds: [2] });

    await delay();

    client2.disconnect();
    await delay();
    expect(handler.mock.calls[1]?.[0]).toEqual(undefined);

    client3.disconnect();
    await delay();
    expect(handler.mock.calls[1]?.[0]).toEqual([{ userId: 2, status: USER_STATUS.OFFLINE }]);
  });

  test('presence:unsubscribe stops receiving updates', async () => {
    client1 = await connectClient(1);
    client2 = await connectClient(2);
    client3 = await connectClient(3);

    const handler = jest.fn();

    client1.on(SERVER_EMITTED_EVENTS.PRESENCE_UPDATE, handler);
    client1.emit(CLIENT_EMITTED_EVENTS.PRESENCE_SUBSCRIBE, { userIds: [2, 3] });

    await delay();

    client1.emit(CLIENT_EMITTED_EVENTS.PRESENCE_UNSUBSCRIBE, { userIds: [3] });

    client3.disconnect();

    await delay();
    expect(handler.mock.calls[1]?.[0]).toEqual(undefined);

    client2.disconnect();

    await delay();
    expect(handler.mock.calls[1]?.[0]).toEqual([{ userId: 2, status: USER_STATUS.OFFLINE }]);
  });
});
