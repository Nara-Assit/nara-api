import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.js';
import { generateAudioFromAI, generateTextFromAI } from '../services/aiModelService.js';
import { uploadAudioToCloudinary } from '../services/storageService.js';
import { VoiceMode } from '../types/VoiceMode.js';

const aiController = {
  handleVoice: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const mode = req.query.mode;
      if (mode === VoiceMode.TTS) {
        aiController.handleTextToSpeech(req, res, next);
      } else if (mode === VoiceMode.STT) {
        aiController.handleSpeechToText(req, res, next);
      }
    } catch (error) {
      next(error);
    }
  },

  handleTextToSpeech: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body; // Flutter sends JSON

      const audioBuffer = await generateAudioFromAI(text);
      const publicUrl = await uploadAudioToCloudinary(audioBuffer);

      // Return the URL to Flutter
      res.json({
        success: true,
        message: 'Audio generated successfully',
        data: { publicUrl },
      });
    } catch (error) {
      next(error);
    }
  },

  handleSpeechToText: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ success: false, message: 'Audio file is required for STT' });
      }

      const transcribedText = await generateTextFromAI(audioFile);

      res.json({
        success: true,
        message: 'Audio transcribed successfully',
        data: { transcription: transcribedText },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default aiController;
