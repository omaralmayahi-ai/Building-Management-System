/**
 * Image Compression & Optimization Utility
 * Prevents payload overflow, Firestore document size limit errors (1MB), and localStorage quota exceeded errors.
 * Aggressively optimizes smartphone camera photos (typically 4MB-15MB) down to crisp, lightweight images (~30KB-80KB).
 */

export interface CompressedImageResult {
  dataUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
  originalSizeBytes?: number;
  savedPercent?: number;
  formattedOriginalSize?: string;
  formattedCompressedSize?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Compresses an image File (e.g. from file input or camera capture)
 * Default settings (max 1024x1024, 0.72 quality) yield clear engineering photos under 80KB.
 */
export async function compressImageFile(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.72
): Promise<CompressedImageResult> {
  const originalSize = file.size;

  // If not an image, read directly as data URL
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({
          dataUrl: result,
          sizeBytes: file.size,
          width: 0,
          height: 0,
          originalSizeBytes: originalSize,
          savedPercent: 0,
          formattedOriginalSize: formatBytes(originalSize),
          formattedCompressedSize: formatBytes(file.size),
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaling
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          // Fallback to original
          resolve({
            dataUrl: e.target?.result as string,
            sizeBytes: file.size,
            width: img.width,
            height: img.height,
            originalSizeBytes: originalSize,
            savedPercent: 0,
            formattedOriginalSize: formatBytes(originalSize),
            formattedCompressedSize: formatBytes(file.size),
          });
          return;
        }

        // Apply high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const sizeBytes = Math.round((dataUrl.length * 3) / 4);
        const savedPercent = originalSize > 0 ? Math.max(0, Math.round(((originalSize - sizeBytes) / originalSize) * 100)) : 0;

        resolve({
          dataUrl,
          sizeBytes,
          width,
          height,
          originalSizeBytes: originalSize,
          savedPercent,
          formattedOriginalSize: formatBytes(originalSize),
          formattedCompressedSize: formatBytes(sizeBytes),
        });
      };
      img.onerror = () => {
        // Fallback
        resolve({
          dataUrl: e.target?.result as string,
          sizeBytes: file.size,
          width: 0,
          height: 0,
          originalSizeBytes: originalSize,
          savedPercent: 0,
          formattedOriginalSize: formatBytes(originalSize),
          formattedCompressedSize: formatBytes(file.size),
        });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an existing base64 data URL if it exceeds max size or dimensions.
 */
export async function compressDataUrl(
  dataUrl: string,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.72
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // If already under 65KB, return as-is
  if (dataUrl.length < 90000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const optimized = canvas.toDataURL('image/jpeg', quality);
      resolve(optimized.length < dataUrl.length ? optimized : dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Automatically inspects and compresses all attachments in an entity (Maintenance or Inspection)
 */
export async function sanitizeAndCompressAttachments<T extends { attachments?: any[]; attachmentUrl?: string; reportFileUrl?: string }>(
  item: T
): Promise<T> {
  if (!item) return item;
  const clone = { ...item };

  if (clone.attachmentUrl && clone.attachmentUrl.startsWith('data:image/')) {
    clone.attachmentUrl = await compressDataUrl(clone.attachmentUrl, 1024, 1024, 0.72);
  }

  if (clone.reportFileUrl && clone.reportFileUrl.startsWith('data:image/')) {
    clone.reportFileUrl = await compressDataUrl(clone.reportFileUrl, 1024, 1024, 0.72);
  }

  if (Array.isArray(clone.attachments) && clone.attachments.length > 0) {
    const compressedList = await Promise.all(
      clone.attachments.map(async (att) => {
        if (att && att.url && typeof att.url === 'string' && att.url.startsWith('data:image/')) {
          const optimizedUrl = await compressDataUrl(att.url, 1024, 1024, 0.72);
          const sizeBytes = Math.round((optimizedUrl.length * 3) / 4);
          return {
            ...att,
            url: optimizedUrl,
            size: sizeBytes,
          };
        }
        return att;
      })
    );
    clone.attachments = compressedList;
  }

  return clone;
}

