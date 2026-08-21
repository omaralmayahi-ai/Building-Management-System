import jsQR from 'jsqr';

/**
 * Universal QR code reader utility for Midland Oil Company system.
 * Supports camera live video stream decoding and multi-pass image file decoding.
 */

// Helper to extract unit code from scanned text or URL
export function parseScannedQrText(rawText: string): string {
  const trimmed = rawText.trim();
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const unitParam =
        url.searchParams.get('unit') ||
        url.searchParams.get('code') ||
        url.searchParams.get('id') ||
        url.searchParams.get('unitCode');
      if (unitParam) return unitParam.trim();
    }
  } catch {
    // Not a valid URL, proceed to direct match
  }

  // Check if string contains JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.unitCode || parsed.code || parsed.id) {
        return (parsed.unitCode || parsed.code || parsed.id).trim();
      }
    } catch {
      // Ignore json parse failure
    }
  }

  const patternMatch = trimmed.match(/[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+/);
  if (patternMatch) return patternMatch[0];

  return trimmed;
}

/**
 * Decodes QR code from an HTML Video Element using jsQR with fallback and center crop
 */
export function decodeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null {
  if (!video || video.readyState < 2) {
    return null;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width === 0 || height === 0) return null;

  // 1. First pass: center crop square region (where user aligns the reticle)
  const minDim = Math.min(width, height);
  const cropSize = Math.round(minDim * 0.85);
  const startX = Math.floor((width - cropSize) / 2);
  const startY = Math.floor((height - cropSize) / 2);

  canvas.width = cropSize;
  canvas.height = cropSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, startX, startY, cropSize, cropSize, 0, 0, cropSize, cropSize);
  const croppedData = ctx.getImageData(0, 0, cropSize, cropSize);

  let code = jsQR(croppedData.data, croppedData.width, croppedData.height, {
    inversionAttempts: 'attemptBoth',
  });

  if (code && code.data) {
    return code.data;
  }

  // 2. Second pass: full video frame (in case the QR is near edges or zoomed out)
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(video, 0, 0, width, height);
  const fullImageData = ctx.getImageData(0, 0, width, height);

  code = jsQR(fullImageData.data, fullImageData.width, fullImageData.height, {
    inversionAttempts: 'attemptBoth',
  });

  return code ? code.data : null;
}

/**
 * Multi-pass QR code decoding from an image file.
 * Performs multiple passes (normal, downsampled, contrast-boosted) to ensure high detection accuracy.
 */
export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        // Try native BarcodeDetector if available
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code'],
            });
            const barcodes = await barcodeDetector.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              resolve(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Fallback to jsQR
          }
        }

        const passes = [
          { scale: 1.0, contrast: false },
          { scale: 0.5, contrast: false },
          { scale: 0.75, contrast: true },
          { scale: 1.25, contrast: false },
        ];

        for (const pass of passes) {
          try {
            const targetW = Math.max(100, Math.min(2400, Math.round(img.width * pass.scale)));
            const targetH = Math.max(100, Math.min(2400, Math.round(img.height * pass.scale)));

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) continue;

            ctx.drawImage(img, 0, 0, targetW, targetH);
            const imgData = ctx.getImageData(0, 0, targetW, targetH);

            if (pass.contrast) {
              const d = imgData.data;
              for (let i = 0; i < d.length; i += 4) {
                // High contrast binarization
                const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
                const val = avg > 128 ? 255 : 0;
                d[i] = val;
                d[i + 1] = val;
                d[i + 2] = val;
              }
            }

            const qrResult = jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (qrResult && qrResult.data) {
              resolve(qrResult.data);
              return;
            }
          } catch (err) {
            console.warn('QR decode pass error:', err);
          }
        }

        resolve(null);
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
