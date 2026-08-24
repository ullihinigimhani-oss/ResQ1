import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

import multer from 'multer';

const uploadDirectory = join(process.cwd(), 'uploads', 'incident-photos');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.memoryStorage();

export const incidentPhotoUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_request, file, callback) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});
