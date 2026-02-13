import multer, { MulterError } from 'multer';
import type { FileFilterCallback } from 'multer';
import type { Request } from 'express';
import type { Response as MulterResponse } from 'express-serve-static-core';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new MulterError('LIMIT_UNEXPECTED_FILE', 'Only audio files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter,
});

export function uploadAudio(req: Request, res: MulterResponse) {
  return new Promise<void>((resolve, reject) => {
    upload.single('audio')(req, res, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}
