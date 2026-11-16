/**
 * fileCache.ts — تخزين مؤقت لملفات /api/files/* في Cache API للمتصفح
 * المهمة 6-هـ: عرض المرفقات عند انقطاع الاتصال بالخادم
 *
 * الفكرة:
 *   - عند أول جلب ناجح لأي رابط /api/files/* نضعه في "bms-files-v1"
 *   - عند انقطاع الخادم نُرجع الرابط من الكاش كـ Blob URL
 *   - الواجهة تستدعي cachedFileUrl() بدل src مباشرة
 */

const CACHE_NAME = 'bms-files-v1';

/** هل الكاش متاح في هذا المتصفح؟ */
function cacheSupported(): boolean {
  return typeof caches !== 'undefined';
}

/**
 * يجلب ملفاً من الخادم، يخزّنه في الكاش، ويُرجع Blob URL.
 * إن فشل الجلب (انقطاع / 5xx) يحاول الكاش.
 * إن لم يكن في الكاش يُرجع null لتظهر رسالة «غير متاح دون اتصال».
 */
export async function cachedFileUrl(url: string): Promise<string | null> {
  if (!url || !url.startsWith('/api/files/')) return url;

  if (!cacheSupported()) {
    // المتصفح لا يدعم Cache API — نرجع الرابط كما هو
    return url;
  }

  let cache: Cache;
  try {
    cache = await caches.open(CACHE_NAME);
  } catch {
    return url;
  }

  // أولاً: نحاول الجلب من الخادم
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (response.ok) {
      // نخزّن نسخة في الكاش (clone لأن Response يُستهلك مرة واحدة)
      await cache.put(url, response.clone());
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch {
    // انقطع الاتصال أو خطأ شبكة — نتابع للكاش
  }

  // ثانياً: نبحث في الكاش
  try {
    const cached = await cache.match(url);
    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }
  } catch {
    // فشل الكاش أيضاً
  }

  return null; // غير متاح لا من الخادم ولا من الكاش
}

/**
 * يُخمّن مسبقاً مجموعة روابط ويخزّنها في الكاش.
 * يُستدعى عند تحميل سجل الوحدة أو قائمة المرفقات بينما الاتصال متاح.
 */
export async function prefetchFiles(urls: string[]): Promise<void> {
  if (!cacheSupported()) return;
  const apiUrls = urls.filter((u) => u && u.startsWith('/api/files/'));
  if (apiUrls.length === 0) return;

  let cache: Cache;
  try {
    cache = await caches.open(CACHE_NAME);
  } catch {
    return;
  }

  await Promise.allSettled(
    apiUrls.map(async (url) => {
      try {
        const existing = await cache.match(url);
        if (existing) return; // موجود مسبقاً
        const response = await fetch(url, { credentials: 'include' });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        // تجاهل أخطاء prefetch
      }
    }),
  );
}

/**
 * يتحقق فقط هل الرابط موجود في الكاش دون جلب جديد.
 * مفيد لإظهار أيقونة «متاح دون اتصال».
 */
export async function isFileCached(url: string): Promise<boolean> {
  if (!url || !url.startsWith('/api/files/') || !cacheSupported()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return match !== undefined;
  } catch {
    return false;
  }
}
