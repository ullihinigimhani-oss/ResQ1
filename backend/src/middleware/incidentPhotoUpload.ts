import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import multer from 'multer';

const uploadDirectory = join(process.cwd(), 'uploads', 'incident-photos');
const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.memoryStorage();

export const incidentPhotoUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_request, file, callback) => {
    const mimetype = (file.mimetype || '').toLowerCase();

    if (allowedMimeTypes.has(mimetype)) {
      callback(null, true);
      return;
    }

    const error = new Error('Only JPEG, PNG, or WebP images are supported.') as Error & {
      status?: number;
      name: string;
    };
    error.name = 'InvalidImageTypeError';
    error.status = 400;
    callback(error);
  },
});