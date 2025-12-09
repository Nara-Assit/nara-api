import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.js';
import { generateAudioFromAI } from '../services/aiModelService.js';
import { uploadAudioToCloudinary } from '../services/storageService.js';

const aiController = {
  generateAudio: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body; // Flutter sends JSON

      const audioBuffer = await generateAudioFromAI(text);
      const publicUrl = await uploadAudioToCloudinary(audioBuffer);

      // 4. Return the URL to Flutter
      res.json({
        success: true,
        message: 'Audio generated successfully',
        data: { publicUrl },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default aiController;
