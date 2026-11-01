// server/src/services/storage.service.ts
import path from 'path';
import { env } from '../config/env';

/**
 * ImgBB storage service (free, no credit card).
 *
 * - Only IMAGES are supported (JPG, PNG, WebP). ImgBB does not accept PDFs.
 * - The returned `path` is the full public image URL. Store it in Firestore as-is.
 * - Anything that was stored as an http(s) URL is returned unchanged by getSignedUrl().
 * - ImgBB has no delete API: deleteFile() is a safe no-op.
 *
 * Set IMGBB_API_KEY in the Render env (get a free key at https://api.imgbb.com/).
 */

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  /** Kept for API compatibility (used only to build the image name) */
  folder: string;
  nameStem?: string;
}

export interface UploadResult {
  /** Public image URL (stored in Firestore) */
  path: string;
  contentType: string;
  size: number;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

function fail(message: string, status = 400): never {
  const err = new Error(message);
  (err as Error & { status: number }).status = status;
  throw err;
}

function safeName(input: UploadInput): string {
  const stem = (input.nameStem ?? path.parse(input.originalName).name ?? 'file')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const folder = input.folder.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  return `${folder}_${stem}_${Date.now()}`;
}

export async function uploadFile(input: UploadInput): Promise<UploadResult> {
  if (input.mimeType === 'application/pdf') {
    fail('PDF আপলোড করা যাবে না, ছবি (JPG/PNG) দিন। / PDF is not supported, please upload an image (JPG/PNG).');
  }
  if (!ALLOWED_IMAGE_TYPES.has(input.mimeType)) {
    fail(`Invalid file type: ${input.mimeType}. Allowed: JPG, PNG, WebP.`);
  }
  if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
    fail(`File too large: ${(input.buffer.length / 1024 / 1024).toFixed(2)} MB. Max 3 MB.`);
  }
  if (!env.IMGBB_API_KEY) {
    fail('ছবি আপলোড সেটআপ হয়নি (IMGBB_API_KEY নেই)। / Image upload is not configured.', 503);
  }

  const form = new FormData();
  form.append('image', input.buffer.toString('base64'));
  form.append('name', safeName(input));

  let res: Response;
  try {
    res = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(env.IMGBB_API_KEY)}`,
      { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) },
    );
  } catch {
    fail('ছবি আপলোড হয়নি, আবার চেষ্টা করুন। / Image upload failed, please retry.', 502);
  }

  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: { url?: string; display_url?: string } }
    | null;
  const url = json?.data?.url ?? json?.data?.display_url;
  if (!res.ok || !json?.success || !url) {
    console.error('[IMGBB] upload failed', res.status, JSON.stringify(json)?.slice(0, 300));
    fail('ছবি আপলোড হয়নি, আবার চেষ্টা করুন। / Image upload failed, please retry.', 502);
  }

  return { path: url, contentType: input.mimeType, size: input.buffer.length };
}

/** Stored paths are already public URLs. */
export async function getSignedUrl(filePath: string, _expiresInMinutes = 15): Promise<string> {
  return filePath;
}

/** ImgBB has no delete API — nothing to do. */
export async function deleteFile(_filePath: string): Promise<void> {
  return;
}

export async function deleteFiles(filePaths: string[]): Promise<void> {
  await Promise.all(filePaths.map((p) => deleteFile(p)));
}
