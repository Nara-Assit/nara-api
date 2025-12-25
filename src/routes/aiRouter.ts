import Router from 'express';
import aiController from '../controllers/aiController.js';
import handleMode from '../middleware/handleModeMiddleware.js';

const aiRouter = Router();

aiRouter.post('/voice', handleMode, aiController.handleVoice);
export default aiRouter;
