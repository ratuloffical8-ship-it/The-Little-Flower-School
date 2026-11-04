// src/utils/image.ts
/**
 * Shrinks a phone photo before upload (max 1600px, JPEG ~80%).
 * A 3 MB camera photo becomes ~300 KB, so the admission form uploads in seconds
 * instead of hanging on a slow mobile connection. Falls back to the original file on any problem.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<File> {
  try {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
    if (file.size < 350 * 1024) return file;

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
