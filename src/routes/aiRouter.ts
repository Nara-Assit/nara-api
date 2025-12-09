import Router from 'express';
import aiController from '../controllers/aiController.js';
import validateData from '../middleware/validationMiddleware.js';
import { ttsSchema } from '../schemas/aiModelsSchema.js';

const aiRouter = Router();

aiRouter.post('/text-to-speech', validateData(ttsSchema), aiController.generateAudio);

export default aiRouter;
