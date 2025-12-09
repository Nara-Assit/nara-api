import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/config.js';

export const generateAudioFromAI = async (textToConvert: string): Promise<Buffer> => {
  try {
    const form = new FormData();
    form.append('text', textToConvert);

    const response = await axios.post(config.TTS_MODEL_URL, form, {
      responseType: 'arraybuffer',
      headers: { ...form.getHeaders() },
    });

    return Buffer.from(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`AI Service failed: ${error.response.status} - ${error.response.statusText}`);
    }
    throw new Error('Failed to connect to AI audio service');
  }
};
