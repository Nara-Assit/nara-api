import firebase from './firebase.js';
import { createNotificationForUsers } from '../repositories/notificationRepo.js';
import type { BackgroundNotification, NotificationData } from '../types/NotificationMessage.js';
import { deleteFcmTokenByToken, getFcmTokenByUserIds } from '../repositories/fcmTokenRepo.js';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { USER_STATUS } from '../socket.js';
import { notifyUsers, getUserStatus } from './socketService.js';
import mapNotificationDataToFcm from '../util/mapNotificationDataToFcm.js';

// takes an optional socketFunction parameter that will be called instead of the default function to send notifications to online users
// this is useful for cases where there is a more efficient way of sending the notification to online users
// for example, when sending a notification to all members of a chat, we can emit the notification to the chat room instead of emitting it to each user in the chat individually
export async function sendNotification(
  notification: NotificationData,
  userIds: [number, ...number[]],
  socketFunction?: () => void
) {
  // store the notification in the database for all users
  await createNotificationForUsers(notification, userIds);

  // split the userIds into two lists, one for online users and one for offline users
  // for online users, send the notification via socket.io
  // for offline users, send the notification via Firebase Cloud Messaging if they are registered for it, otherwise skip sending the notification
  const onlineUserIds: number[] = [];
  const offlineUserIds: number[] = [];

  for (const userId of userIds) {
    if (getUserStatus(userId) === USER_STATUS.ONLINE) {
      onlineUserIds.push(userId);
    } else {
      offlineUserIds.push(userId);
    }
  }

  // for online users, store notifications in the database as read, and for offline users, store them as unread
  if (onlineUserIds.length > 0) {
    if (socketFunction) {
      await socketFunction();
    } else {
      await notifyUsers(notification, onlineUserIds as [number, ...number[]]);
    }
  }
  if (offlineUserIds.length > 0) {
    await sendNotificationToOfflineUsers(
      mapNotificationDataToFcm(notification),
      offlineUserIds as [number, ...number[]]
    );
  }
}

async function sendNotificationToOfflineUsers(
  notification: BackgroundNotification,
  userIds: [number, ...number[]]
) {
  // Find the registration tokens for the given user IDs
  const fcmTokensStrings = await getFcmTokensStrings(userIds as [number, ...number[]]);

  // skip sending notification if user hasn't registered any FCM tokens
  if (fcmTokensStrings.length === 0) {
    return;
  }

  // Send the notification via Firebase Cloud Messaging
  const result = await sendFcmNotification(notification, fcmTokensStrings);

  // delete invalid tokens
  if (result.failureCount > 0) {
    await Promise.all(
      result.responses.map(async (resp, idx) => {
        if (resp.error?.message === 'messaging/registration-token-not-registered') {
          await deleteFcmTokenByToken(fcmTokensStrings[idx]!);
        }
      })
    );
  }
}

async function getFcmTokensStrings(userIds: [number, ...number[]]) {
  const fcmTokens = await getFcmTokenByUserIds(userIds);
  const fcmTokensStrings = fcmTokens.map((token) => token.token);
  return fcmTokensStrings;
}

async function sendFcmNotification(
  notification: BackgroundNotification,
  fcmTokensStrings: string[]
) {
  const fcmMessage: MulticastMessage = {
    ...notification,
    tokens: fcmTokensStrings,
  };

  const result = await firebase.messaging().sendEachForMulticast(fcmMessage);
  return result;
}
