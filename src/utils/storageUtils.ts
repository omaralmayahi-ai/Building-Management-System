/**
 * Utility functions for safe LocalStorage operations.
 * Prevents QuotaExceededError crashes when storing large datasets or base64 attachments.
 */

export function sanitizeForStorage<T>(obj: T, parentKey?: string): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (parentKey === 'logoUrl') {
      return obj;
    }
    // Allow compressed images/attachments up to ~350KB per string (approx 450,000 base64 chars)
    if (obj.startsWith('data:') && obj.length > 450000) {
      return '' as unknown as T;
    }
    if (obj.length > 500000) {
      return '' as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForStorage(item, parentKey)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as Record<string, any>)[key];
      if (key === 'logoUrl') {
        cleaned[key] = val;
      } else if (
        typeof val === 'string' &&
        (key === 'fileUrl' || key === 'url' || key === 'reportFileUrl' || key === 'attachmentUrl') &&
        val.startsWith('data:') &&
        val.length > 450000
      ) {
        cleaned[key] = undefined;
      } else {
        cleaned[key] = sanitizeForStorage(val, key);
      }
    }
    return cleaned as T;
  }

  return obj;
}

export function safeSetItem(key: string, data: any): void {
  try {
    const sanitized = sanitizeForStorage(data);
    const serialized = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
    localStorage.setItem(key, serialized);
  } catch (err) {
    console.warn(`localStorage quota exceeded for key "${key}". Applying resilient fallback storage.`, err);
    try {
      // Aggressive fallback: strip heavy base64 data except logoUrl if quota is reached
      if (typeof data === 'object' && data !== null) {
        const stripBase64 = (item: any): any => {
          if (!item || typeof item !== 'object') return item;
          if (Array.isArray(item)) return item.map(stripBase64);
          const copy: any = {};
          for (const k of Object.keys(item)) {
            const v = item[k];
            if (typeof v === 'string' && k !== 'logoUrl' && (v.startsWith('data:') && v.length > 50000)) {
              copy[k] = undefined;
            } else {
              copy[k] = stripBase64(v);
            }
          }
          return copy;
        };
        localStorage.setItem(key, JSON.stringify(stripBase64(data)));
      }
    } catch (fallbackErr) {
      console.error(`Failed to write key "${key}" to localStorage:`, fallbackErr);
    }
  }
}

export function safeParse<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}
