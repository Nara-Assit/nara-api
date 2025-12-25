import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/config.js';
import aiApi from './aiApi.js';

export const generateAudioFromAI = async (textToConvert: string): Promise<Buffer> => {
  try {
    const form = new FormData();
    form.append('text', textToConvert);

    const response = await aiApi.post(config.TTS_MODEL_URL, form, {
      responseType: 'arraybuffer',
      headers: { ...form.getHeaders() },
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.log(error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`AI Service failed: ${error.response.status} - ${error.response.statusText}`);
    }
    throw new Error('Failed to connect to AI audio service');
  }
};

export const generateTextFromAI = async (audioFile: Express.Multer.File): Promise<string> => {
  try {
    const form = new FormData();
    form.append('audio', audioFile.buffer, {
      filename: audioFile.originalname,
      contentType: audioFile.mimetype,
    });

    const response = await aiApi.post(config.STT_MODEL_URL, form, {
      headers: { ...form.getHeaders() },
    });

    return response.data.transcription;
  } catch (error) {
    console.log(error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`AI Service failed: ${error.response.status} - ${error.response.statusText}`);
    }
    throw new Error('Failed to connect to AI speech-to-text service');
  }
};
