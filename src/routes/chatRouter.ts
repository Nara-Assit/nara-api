import { Router } from 'express';
import chatController from '../controllers/chatController.js';
import validateData from '../middleware/validationMiddleware.js';
import { messageSchema } from '../schemas/messageSchema.js';
import { CreateChatSchema, UpdateChatSchema } from '../schemas/chatSchema.js';
import { IdParamSchema } from '../schemas/common.js';

const chatRouter = Router();

// Chat Routes
chatRouter.get('/', chatController.getChats);
chatRouter.patch('/:id', validateData(UpdateChatSchema), chatController.updateChat);
chatRouter.post('/:id/members', validateData(IdParamSchema), chatController.addChatMember);
chatRouter.post('/:id/add-favorite', chatController.addChatFavorite);
chatRouter.post('/', validateData(CreateChatSchema), chatController.createChat);
chatRouter.delete('/:id', chatController.deleteChat);
chatRouter.post('/:id/leave-group', chatController.leaveGroup);

// Message Routes
chatRouter.post('/:id/messages', validateData(messageSchema), chatController.createMessage);
chatRouter.delete('/:id/messages/:messageId', chatController.deleteMessage);
chatRouter.get('/:id/messages', chatController.getChatMessages);

// User Block Routes
chatRouter.get('/is-blocked-by-me/:id', chatController.isBlockedByMe);
chatRouter.post('/block/:id', chatController.blockUser);
chatRouter.post('/unblock/:id', chatController.unblockUser);

export default chatRouter;
