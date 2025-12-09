import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { config } from '../config/config.js';

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

export const uploadAudioToCloudinary = async (
  audioBuffer: Buffer,
  folder = 'nara_audio'
): Promise<string> => {
  console.log(`[Cloudinary] Starting audio upload to folder: "${folder}"...`);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // Auto-detects audio (stored as video/audio in Cloudinary)
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error) {
          console.error(`[Cloudinary] Upload Failed: ${error.message}`, error);
          return reject(new Error('Cloudinary upload failed'));
        }

        if (!result || !result.secure_url) {
          console.error('[Cloudinary] Upload successful, but URL is missing in response.');
          return reject(new Error('Cloudinary upload successful but URL missing'));
        }

        console.log(`[Cloudinary] Upload Success! URL: ${result.secure_url} ✅`);

        resolve(result.secure_url);
      }
    );

    uploadStream.end(audioBuffer);
  });
};
