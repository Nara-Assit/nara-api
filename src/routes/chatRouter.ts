import { Router } from 'express';
import chatController from '../controllers/chatController.js';

const chatRouter = Router();

// Chat Routes
chatRouter.get('/', chatController.getChats);
chatRouter.patch('/:id', chatController.updateChat);
chatRouter.post('/:id/members', chatController.addChatMember);
chatRouter.post('/:id/add-favorite', chatController.addChatFavorite);
chatRouter.post('/', chatController.createChat);
chatRouter.delete('/:id', chatController.deleteChat);

// Message Routes
chatRouter.post('/messages', chatController.createMessage);
chatRouter.delete('/messages/:messageId', chatController.deleteMessage);
chatRouter.get('/:id/messages', chatController.getChatMessages);

// User Block Routes
chatRouter.get('/is-blocked/:id', chatController.isBlocked);
chatRouter.post('/block/:id', chatController.blockUser);

export default chatRouter;
