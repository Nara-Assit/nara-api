import type { Request, Response, NextFunction } from 'express';
import { uploadAudio } from '../util/audioUpload.js';
import validateData from './validationMiddleware.js';
import { ttsSchema } from '../schemas/aiModelsSchema.js';
import { VoiceMode } from '../types/VoiceMode.js';
import { MulterError } from 'multer';

const handleMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mode = req.query.mode;
    if (!mode) {
      return res.status(400).json({ success: false, message: 'mode is required' });
    }

    if (mode === VoiceMode.STT) {
      await uploadAudio(req, res);
      next();
    } else if (mode === VoiceMode.TTS) {
      return validateData(ttsSchema)(req, res, next);
    } else {
      return res.status(400).json({ success: false, message: 'mode is not supported' });
    }
  } catch (error) {
    // Multer error when file doesn't pass the filter
    if (error instanceof MulterError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export default handleMode;
