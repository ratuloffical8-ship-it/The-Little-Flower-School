// server/src/services/storage.service.ts
import { storage } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * Firebase Storage service — handles uploads to the private bucket.
 *
 * Convention: files are stored at structured paths like:
 *   admissions/{applicationId}/photo.jpg
 *   payments/{paymentId}/screenshot.png
 *   gallery/{itemId}/{filename}
 *   notices/{noticeId}/{filename}
 *
 * All uploads go to the PRIVATE bucket. Access is via signed URLs
 * generated on-demand by backend handlers (never exposed as public URLs).
 */

export interface UploadInput {
  /** Raw file buffer (from multer.memoryStorage) */
  buffer: Buffer;
  /** Original filename (used to derive extension) */
  originalName: string;
  /** MIME type */
  mimeType: string;
  /** Target folder path (no leading/trailing slashes) */
  folder: string;
  /** Optional filename stem (default: random UUID) */
  nameStem?: string;
}

export interface UploadResult {
  /** Full storage path (e.g. "admissions/TLFS-APP-2025-000001/photo-abc.jpg") */
  path: string;
  /** Content type stored */
  contentType: string;
  /** File size in bytes */
  size: number;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

function sanitizeExtension(originalName: string, mimeType: string): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
  if (ext) return ext;
  // Fallback based on MIME
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  };
  return map[mimeType] ?? '';
}

function sanitizeFolder(folder: string): string {
  return folder
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '_');
}

/**
 * Upload a single file to Firebase Storage.
 * Validates MIME type and size before upload.
 */
export async function uploadFile(input: UploadInput): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    const err = new Error(
      `Invalid file type: ${input.mimeType}. Allowed: JPG, PNG, WebP, PDF.`
    );
    (err as any).status = 400;
    throw err;
  }

  if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
    const err = new Error(
      `File too large: ${(input.buffer.length / 1024 / 1024).toFixed(2)} MB. Max 3 MB.`
    );
    (err as any).status = 400;
    throw err;
  }

  const folder = sanitizeFolder(input.folder);
  const ext = sanitizeExtension(input.originalName, input.mimeType);
  const stem = input.nameStem ?? uuidv4();
  const filePath = `${folder}/${stem}${ext}`;

  const bucket = storage.bucket();
  const file = bucket.file(filePath);

  await file.save(input.buffer, {
    contentType: input.mimeType,
    resumable: false,
    metadata: {
      cacheControl: 'private, max-age=0, no-transform',
    },
  });

  return {
    path: filePath,
    contentType: input.mimeType,
    size: input.buffer.length,
  };
}

/**
 * Generate a short-lived signed URL for a stored file.
 * Default expiry: 15 minutes.
 */
export async function getSignedUrl(
  filePath: string,
  expiresInMinutes = 15
): Promise<string> {
  const bucket = storage.bucket();
  const [url] = await bucket.file(filePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

/**
 * Delete a file from storage. Silently succeeds if the file doesn't exist.
 */
export async function deleteFile(filePath: string): Promise<void> {
  const bucket = storage.bucket();
  try {
    await bucket.file(filePath).delete();
  } catch (err: any) {
    // 404 = already gone, ignore
    if (err?.code !== 404) throw err;
  }
}

/**
 * Delete multiple files. Collects errors but doesn't throw on individual
 * failures.
 */
export async function deleteFiles(filePaths: string[]): Promise<void> {
  await Promise.all(filePaths.map((p) => deleteFile(p).catch(() => undefined)));
}
