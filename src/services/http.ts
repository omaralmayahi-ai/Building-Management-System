/**
 * طبقة الاتصال بخادم النظام — المصدر المعتمد الوحيد للبيانات (المرحلة 2).
 * تحمل رمز الجلسة، وتعيد نتيجة صريحة (نجاح أو سبب الفشل) بدل ابتلاع الأخطاء.
 */
export const BASE_API_URL = '/api';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem('app_session_token') || sessionStorage.getItem('app_session_token');
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem('app_session_token', token);
    } else {
      localStorage.removeItem('app_session_token');
      sessionStorage.removeItem('app_session_token');
    }
  } catch {}
}

export interface ApiResult<T = any> {
  ok: boolean;
  /** 0 = تعذّر الوصول إلى الخادم */
  status: number;
  data: T | null;
  error: string | null;
  code: string | null;
}

export const NETWORK_ERROR_MESSAGE = 'تعذّر الاتصال بالخادم. لم يُحفظ التعديل.';

export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 20000
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = getSessionToken();
  try {
    const res = await fetch(`${BASE_API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    let json: any = null;
    try {
      json = await res.json();
    } catch {}

    // الجلسة انتهت أو أُلغيت على الخادم: خروج نظيف وإعادة عرض شاشة الدخول
    if (res.status === 401 && token) {
      setSessionToken(null);
      try {
        localStorage.removeItem('app_current_user');
      } catch {}
      if (typeof window !== 'undefined') window.location.reload();
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: json,
        error: (json && (json.error || json.message)) || `رفض الخادم الطلب (${res.status})`,
        code: (json && json.code) || null,
      };
    }
    return { ok: true, status: res.status, data: json as T, error: null, code: null };
  } catch {
    clearTimeout(timer);
    return { ok: false, status: 0, data: null, error: NETWORK_ERROR_MESSAGE, code: 'NETWORK' };
  }
}

// ---------------------------------------------------------------------------
// إشعار الواجهة بفشل الحفظ، وطلب إعادة قراءة البيانات من الخادم
// ---------------------------------------------------------------------------
type ErrorListener = (message: string) => void;
const errorListeners = new Set<ErrorListener>();

export function onApiError(listener: ErrorListener): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

export function reportApiError(message: string): void {
  for (const l of errorListeners) {
    try {
      l(message);
    } catch {}
  }
}

type ResyncListener = () => void;
const resyncListeners = new Set<ResyncListener>();

export function onResyncRequested(listener: ResyncListener): () => void {
  resyncListeners.add(listener);
  return () => resyncListeners.delete(listener);
}

/** يطلب من الواجهة إعادة قراءة كل البيانات من الخادم (بعد حفظ مرفوض مثلاً) */
export function requestResync(): void {
  for (const l of resyncListeners) {
    try {
      l();
    } catch {}
  }
}
