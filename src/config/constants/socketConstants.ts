export const SERVER_EMITTED_EVENTS = {
  NEW_NOTIFICATION: 'notification:new',
  PRESENCE_UPDATE: 'presence:update',
  CHAT_MEMBER_LEFT: 'chat:member_left',
  CHAT_MESSAGE_CREATED: 'chat:message_created',
  CHAT_MESSAGE_DELETED: 'chat:message_deleted',
  CHAT_DELETED: 'chat:deleted',
  CHAT_UPDATED: 'chat:update',
  CHAT_MEMBER_ADDED: 'chat:member_added',
  CHAT_CREATED: 'chat:created',
};

export const CLIENT_EMITTED_EVENTS = {
  PRESENCE_SUBSCRIBE: 'presence:subscribe',
  PRESENCE_UNSUBSCRIBE: 'presence:unsubscribe',
};
