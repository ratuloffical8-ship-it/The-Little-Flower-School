// server/src/utils/upload.ts
import multer from 'multer';
import { badRequest } from './errors';

/**
 * Multer configuration for file uploads.
 *
 * Uses memory storage (files stay in Buffer) so we can validate
 * and then push to Firebase Storage via storage.service.
 *
 * Max file size: 3 MB per file.
 * Allowed MIME types: JPEG, PNG, WebP, PDF.
 */

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // max 5 files per request
    fieldSize: 1 * 1024 * 1024, // 1 MB per text field
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        badRequest(
          `Invalid file type "${file.mimetype}" for "${file.fieldname}". Allowed: JPG, PNG, WebP, PDF.`
        )
      );
    }
  },
});

/**
 * Helper: extract a single file from multer's files object.
 * Returns undefined if the field is missing or empty.
 */
export function getFile(
  files: Record<string, Express.Multer.File[]> | undefined,
  fieldName: string
): Express.Multer.File | undefined {
  return files?.[fieldName]?.[0];
    }
