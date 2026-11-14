import {
  UnitAsset,
  MaintenanceRequest,
  OccupancyRecord,
  PeriodicInspectionSchedule,
  AuditLogItem,
  OrgEntity,
  SystemUser,
  SystemBranding,
} from '../types';
import { safeSetItem, safeParse } from '../utils/storageUtils';
import { sanitizeAndCompressAttachments } from '../utils/imageCompressor';
import {
  BASE_API_URL,
  getSessionToken,
  setSessionToken,
  apiRequest,
  reportApiError,
  requestResync,
  onResyncRequested,
  onApiError,
  NETWORK_ERROR_MESSAGE,
  type ApiResult,
} from './http';
import { syncQueue, SyncQueueStatus } from './syncQueue';

export { syncQueue, type SyncQueueStatus };
export { getSessionToken, setSessionToken, onApiError };


/**
 * Secure Server-side Authentication with Brute-Force & Lockout Defense
 */
export async function loginWithServer(
  username: string,
  password: string
): Promise<{ success: boolean; user?: SystemUser; token?: string; error?: string; mustChangePassword?: boolean }> {
  try {
    const res = await fetch(`${BASE_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data && data.success && data.token) {
      setSessionToken(data.token);
      return { success: true, user: data.user, token: data.token, mustChangePassword: Boolean(data.mustChangePassword) };
    }
    return { success: false, error: data?.error || 'فشل تسجيل الدخول' };
  } catch {
    return { success: false, error: 'تعذر الاتصال ببوابة المصادقة الآمنة، يرجى المحاولة لاحقاً.' };
  }
}

/** إنهاء الجلسة على الخادم */
export async function logoutFromServer(): Promise<void> {
  const token = getSessionToken();
  if (!token) return;
  try {
    await fetch(`${BASE_API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {}
}

/** حفظ تفضيلات مظهر الواجهة للمستخدم الحالي (null لأي حقل = العودة لمظهر النظام) */
export async function saveUiPreferences(
  change: Partial<Record<'theme' | 'font' | 'sidebar', string | null>> & { collapsed?: boolean | null }
): Promise<boolean> {
  const token = getSessionToken();
  if (!token) return false;
  try {
    const res = await fetch(`${BASE_API_URL}/auth/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(change),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** تغيير كلمة مرور المستخدم الحالي: التحقق يجري على الخادم */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const token = getSessionToken();
  try {
    const res = await fetch(`${BASE_API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) return { success: true };
    return { success: false, error: data?.error || 'تعذر تغيير كلمة المرور' };
  } catch {
    return { success: false, error: 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً' };
  }
}

/**
 * Global synchronized server time offset in milliseconds.
 * (serverTime = clientTime + serverTimeOffsetMs)
 */
let serverTimeOffsetMs = 0;

export function getSynchronizedServerTime(): Date {
  return new Date(Date.now() + serverTimeOffsetMs);
}

export function updateServerTimeFromTimestamp(serverTimestampMs: number): void {
  const localNow = Date.now();
  if (typeof serverTimestampMs === 'number' && !isNaN(serverTimestampMs) && serverTimestampMs > 0) {
    serverTimeOffsetMs = serverTimestampMs - localNow;
  }
}

/**
 * Generic fetch wrapper with timeout, JSON parsing, and server time synchronization.
 */
async function fetchJson<T>(
  url: string,
  options?: RequestInit,
  timeoutMs = 10000,
  throwOnError = false
): Promise<T | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const token = getSessionToken();
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(id);

    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const serverTimeMs = new Date(dateHeader).getTime();
      if (!isNaN(serverTimeMs)) {
        updateServerTimeFromTimestamp(serverTimeMs);
      }
    }

    // الجلسة انتهت أو أُلغيت على الخادم: خروج نظيف وإعادة عرض شاشة الدخول
    if (res.status === 401 && token) {
      setSessionToken(null);
      try {
        localStorage.removeItem('app_current_user');
      } catch {}
      if (typeof window !== 'undefined') window.location.reload();
      return null;
    }

    if (!res.ok) {
      if (throwOnError) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }
      return null;
    }

    const json = await res.json();
    return json as T;
  } catch (err) {
    clearTimeout(id);
    if (throwOnError) {
      throw err;
    }
    return null;
  }
}

// ============================================================================
// طبقة البيانات (المرحلة 2): خادم النظام هو المصدر المعتمد الوحيد.
//  - القراءة من الخادم؛ النسخة المحلية في المتصفح للعرض عند انقطاع الاتصال فقط.
//  - الحفظ عمليات على سجلات محددة مع رقم النسخة (_v)، لا استبدال للقائمة كلها.
//  - فشل الحفظ يُبلَّغ للمستخدم بسببه الحقيقي ثم تُعاد قراءة البيانات من الخادم.
// ============================================================================

interface CollectionConfig<T> {
  route: string;
  cacheKey: string;
  idOf: (record: T) => string;
}

class ServerCollection<T extends object> {
  /** آخر ما عُرف عن الخادم: المعرّف → نص السجل */
  private known = new Map<string, string>();
  /** آخر نسخة أعادها الخادم بعد كتابة من هذه الجلسة: المعرّف → {من، إلى} */
  private ownWrites = new Map<string, { from: number; to: number }>();
  private loaded = false;

  constructor(private cfg: CollectionConfig<T>) {}

  private remember(records: T[]) {
    this.known = new Map(records.map((r) => [this.cfg.idOf(r), JSON.stringify(r)]));
    this.loaded = true;
  }

  private noteWrite(saved: any) {
    const id = this.cfg.idOf(saved);
    const to = Number(saved?._v) || 0;
    this.ownWrites.set(id, { from: to - 1, to });
    this.known.set(id, JSON.stringify(saved));
  }

  /** إن كان السجل مبنياً على النسخة التي سبقت آخر كتابة لنا مباشرة، فهو تعديل متتابع لا تعارض */
  private withCurrentVersion(record: T): T {
    const own = this.ownWrites.get(this.cfg.idOf(record));
    const v = (record as any)._v;
    if (own && (v === undefined || Number(v) === own.from)) return { ...record, _v: own.to };
    return record;
  }

  async list(): Promise<T[]> {
    const result = await apiRequest<T[]>('GET', `/${this.cfg.route}`);
    if (result.ok && Array.isArray(result.data)) {
      this.remember(result.data);
      safeSetItem(this.cfg.cacheKey, result.data);
      return result.data;
    }
    // انقطاع الاتصال: آخر نسخة معروضة، للقراءة فقط
    return safeParse<T[]>(this.cfg.cacheKey, []);
  }

  private fail(result: ApiResult): void {
    reportApiError(result.error || NETWORK_ERROR_MESSAGE);
    if (result.status !== 0) requestResync();
  }

  async upsert(record: T): Promise<T> {
    const body = this.withCurrentVersion(record);
    const result = await apiRequest<any>('POST', `/${this.cfg.route}`, body, 60000);
    if (!result.ok) {
      this.fail(result);
      return record;
    }
    const saved = result.data && Object.values(result.data).find((v) => v && typeof v === 'object' && !Array.isArray(v));
    if (saved) this.noteWrite(saved);
    return (saved as T) || record;
  }

  async remove(id: string): Promise<boolean> {
    const result = await apiRequest('DELETE', `/${this.cfg.route}/${encodeURIComponent(id)}`);
    if (!result.ok) {
      this.fail(result);
      return false;
    }
    this.known.delete(id);
    this.ownWrites.delete(id);
    return true;
  }

  /**
   * يحفظ قائمة كاملة بإرسال الفرق فقط: السجلات التي تغيّرت، والسجلات التي أُزيلت من القائمة.
   * الفرق يُحسب فور الاستدعاء حتى لا يتأثر بتحديث يصل أثناء الانتظار.
   */
  async saveList(records: T[], prepare?: (r: T) => Promise<T>): Promise<boolean> {
    const upserts: T[] = [];
    const seen = new Set<string>();
    for (const r of records) {
      const id = this.cfg.idOf(r);
      seen.add(id);
      if (this.known.get(id) !== JSON.stringify(r)) upserts.push(this.withCurrentVersion(r));
    }
    // الحذف يقتصر على ما سبق أن قرأناه من الخادم؛ سجل أضافه مستخدم آخر ولم نره لا يُحذف
    const deletes = this.loaded ? Array.from(this.known.keys()).filter((id) => !seen.has(id)) : [];
    if (upserts.length === 0 && deletes.length === 0) return true;

    const prepared = prepare ? await Promise.all(upserts.map(prepare)) : upserts;
    const result = await apiRequest<{ records: T[] }>(
      'POST',
      `/${this.cfg.route}/batch`,
      { upserts: prepared, deletes },
      120000
    );
    if (!result.ok) {
      this.fail(result);
      return false;
    }
    for (const saved of result.data?.records || []) this.noteWrite(saved);
    for (const id of deletes) {
      this.known.delete(id);
      this.ownWrites.delete(id);
    }
    return true;
  }
}

const unitsStore = new ServerCollection<UnitAsset>({ route: 'units', cacheKey: 'app_units', idOf: (u) => u.code });
const maintenanceStore = new ServerCollection<MaintenanceRequest>({
  route: 'maintenance',
  cacheKey: 'app_maintenance_requests',
  idOf: (r) => r.id,
});
const occupancyStore = new ServerCollection<OccupancyRecord>({
  route: 'occupancy',
  cacheKey: 'app_occupancy_records',
  idOf: (r) => r.id,
});
const inspectionsStore = new ServerCollection<PeriodicInspectionSchedule>({
  route: 'inspections',
  cacheKey: 'app_periodic_inspections',
  idOf: (r) => r.id,
});
const orgEntitiesStore = new ServerCollection<OrgEntity>({
  route: 'org-entities',
  cacheKey: 'app_ref_org_entities',
  idOf: (e) => e.id,
});

// ---- 1. الوحدات ----
export const getUnits = (): Promise<UnitAsset[]> => unitsStore.list();
export const saveUnits = (units: UnitAsset[]): Promise<boolean> => unitsStore.saveList(units);
export const addUnit = (unit: UnitAsset): Promise<UnitAsset> => unitsStore.upsert(unit);
export const updateUnit = (unit: UnitAsset): Promise<UnitAsset> => unitsStore.upsert(unit);
export const deleteUnit = (code: string): Promise<boolean> => unitsStore.remove(code);

// ---- 2. طلبات الصيانة (الإضافة والتعديل والحذف عبر قائمة الانتظار لتعمل دون اتصال) ----
export const getMaintenanceRequests = (): Promise<MaintenanceRequest[]> => maintenanceStore.list();
export const saveMaintenanceRequests = (requests: MaintenanceRequest[]): Promise<boolean> =>
  maintenanceStore.saveList(requests, (r) => sanitizeAndCompressAttachments(r));

export async function addMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  const compressed = await sanitizeAndCompressAttachments(req);
  syncQueue.enqueue('create_maintenance', compressed.id, compressed).catch(() => {});
  return compressed;
}

export async function updateMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  const compressed = await sanitizeAndCompressAttachments(req);
  syncQueue.enqueue('update_maintenance', compressed.id, compressed).catch(() => {});
  return compressed;
}

export async function deleteMaintenanceRequest(id: string): Promise<boolean> {
  syncQueue.enqueue('delete_maintenance', id, null).catch(() => {});
  return true;
}

// ---- 3. سجلات الإشغال ----
export const getOccupancyRecords = (): Promise<OccupancyRecord[]> => occupancyStore.list();
export const saveOccupancyRecords = (records: OccupancyRecord[]): Promise<boolean> => occupancyStore.saveList(records);
export const addOccupancyRecord = (record: OccupancyRecord): Promise<OccupancyRecord> => occupancyStore.upsert(record);
export const updateOccupancyRecord = (record: OccupancyRecord): Promise<OccupancyRecord> =>
  occupancyStore.upsert(record);
export const deleteOccupancyRecord = (id: string): Promise<boolean> => occupancyStore.remove(id);

// ---- 4. الكشوفات الدورية (عبر قائمة الانتظار لتعمل دون اتصال) ----
export const getPeriodicInspections = (): Promise<PeriodicInspectionSchedule[]> => inspectionsStore.list();
export const savePeriodicInspections = (inspections: PeriodicInspectionSchedule[]): Promise<boolean> =>
  inspectionsStore.saveList(inspections, (r) => sanitizeAndCompressAttachments(r as any) as any);

export async function addPeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  const compressed = (await sanitizeAndCompressAttachments(item as any)) as PeriodicInspectionSchedule;
  syncQueue.enqueue('create_inspection', compressed.id, compressed).catch(() => {});
  return compressed;
}

export async function updatePeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  const compressed = (await sanitizeAndCompressAttachments(item as any)) as PeriodicInspectionSchedule;
  syncQueue.enqueue('update_inspection', compressed.id, compressed).catch(() => {});
  return compressed;
}

export async function deletePeriodicInspection(id: string): Promise<boolean> {
  syncQueue.enqueue('delete_inspection', id, null).catch(() => {});
  return true;
}

// ---- 5. سجل النشاطات (إضافة فقط؛ الخادم لا يقبل تعديله ولا حذفه) ----
export async function getAuditLogs(): Promise<AuditLogItem[]> {
  const result = await apiRequest<AuditLogItem[]>('GET', '/audit-logs');
  if (result.ok && Array.isArray(result.data)) {
    safeSetItem('app_audit_logs', result.data);
    return result.data;
  }
  return safeParse('app_audit_logs', []);
}

export async function addAuditLog(log: AuditLogItem): Promise<AuditLogItem> {
  // سجل وصفي ثانوي: فشله لا يقاطع المستخدم (سجل التدقيق الأساسي يكتبه الخادم نفسه)
  await apiRequest('POST', '/audit-logs', log);
  return log;
}

// ---- 6. الهيكل التنظيمي ----
const byOrder = (a: OrgEntity, b: OrgEntity) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
const withOrder = (entities: OrgEntity[]) =>
  entities.map((e, idx) => ({ ...e, sortOrder: e.sortOrder !== undefined ? e.sortOrder : idx }));

export async function getOrgEntities(): Promise<OrgEntity[]> {
  return [...(await orgEntitiesStore.list())].sort(byOrder);
}

export const saveOrgEntities = (entities: OrgEntity[]): Promise<boolean> =>
  orgEntitiesStore.saveList(withOrder(entities));
export const addOrgEntity = (entity: OrgEntity): Promise<OrgEntity> => orgEntitiesStore.upsert(entity);
export const updateOrgEntity = (entity: OrgEntity): Promise<OrgEntity> => orgEntitiesStore.upsert(entity);
export const deleteOrgEntity = (id: string): Promise<boolean> => orgEntitiesStore.remove(id);

export async function deleteOrgEntitiesBatch(ids: string[]): Promise<boolean> {
  const result = await apiRequest('POST', '/org-entities/batch', { upserts: [], deletes: ids });
  if (!result.ok) {
    reportApiError(result.error || NETWORK_ERROR_MESSAGE);
    if (result.status !== 0) requestResync();
  }
  return result.ok;
}

export const clearOrgEntities = (): Promise<boolean> => triggerServerResetModule('org_entities', 'clear');
export const resetOrgEntitiesToDefault = (): Promise<boolean> => triggerServerResetModule('org_entities', 'default');

// ---- 7. هوية النظام ----
async function postOrReport(path: string, body: unknown): Promise<boolean> {
  const result = await apiRequest('POST', path, body, 60000);
  if (!result.ok) {
    reportApiError(result.error || NETWORK_ERROR_MESSAGE);
    if (result.status !== 0) requestResync();
  }
  return result.ok;
}

export async function getBranding(): Promise<SystemBranding | null> {
  const result = await apiRequest<SystemBranding>('GET', '/branding');
  if (result.ok && result.data && typeof result.data === 'object' && result.data.systemName) {
    safeSetItem('app_branding', result.data);
    return result.data;
  }
  return safeParse('app_branding', null);
}

export const saveBranding = (branding: SystemBranding): Promise<boolean> => postOrReport('/branding', branding);

// ---- 8. المستخدمون ----
let knownUserIds: Set<string> | null = null;

export async function getUsers(): Promise<SystemUser[]> {
  const result = await apiRequest<SystemUser[]>('GET', '/users');
  if (result.ok && Array.isArray(result.data)) {
    knownUserIds = new Set(result.data.map((u) => u.id));
    safeSetItem('app_users', result.data);
    return result.data;
  }
  return safeParse('app_users', []);
}

export async function saveUsers(users: SystemUser[]): Promise<boolean> {
  const ok = await postOrReport('/users/bulk', { users });
  if (!ok) return false;
  // الحسابات التي أُزيلت من القائمة تُحذف واحداً واحداً (الاستيراد الجماعي لا يحذف)
  const keep = new Set(users.map((u) => u.id));
  for (const id of knownUserIds || []) {
    if (!keep.has(id)) await deleteUser(id);
  }
  knownUserIds = keep;
  return true;
}

export async function addUser(user: SystemUser): Promise<SystemUser> {
  await postOrReport('/users', user);
  knownUserIds?.add(user.id);
  return user;
}

export async function updateUser(user: SystemUser): Promise<SystemUser> {
  const result = await apiRequest('PUT', `/users/${encodeURIComponent(user.id)}`, user);
  if (!result.ok) {
    reportApiError(result.error || NETWORK_ERROR_MESSAGE);
    if (result.status !== 0) requestResync();
  }
  return user;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await apiRequest('DELETE', `/users/${encodeURIComponent(id)}`);
  if (!result.ok) {
    reportApiError(result.error || NETWORK_ERROR_MESSAGE);
    if (result.status !== 0) requestResync();
    return false;
  }
  knownUserIds?.delete(id);
  return true;
}

// ---- 9. البيانات المرجعية ----
export async function getReferenceData(): Promise<any | null> {
  const result = await apiRequest<any>('GET', '/reference-data');
  return result.ok ? result.data : null;
}

export const saveReferenceData = (refData: any): Promise<boolean> => postOrReport('/reference-data', refData);

/** يقرأ البيانات المرجعية من الخادم. ok=false عند تعذّر الاتصال؛ data=null إن لم تُحفظ على الخادم بعد */
export async function fetchReferenceData(): Promise<{ ok: boolean; data: any | null }> {
  const result = await apiRequest<any>('GET', '/reference-data');
  return { ok: result.ok, data: result.ok ? result.data : null };
}

const referenceDataListeners = new Set<() => void>();

/** يُستدعى عند تغيّر البيانات المرجعية على الخادم (من مستخدم آخر أو بعد حفظ مرفوض) */
export function onReferenceDataUpdated(listener: () => void): () => void {
  referenceDataListeners.add(listener);
  return () => referenceDataListeners.delete(listener);
}

function notifyReferenceDataListeners(): void {
  for (const l of referenceDataListeners) {
    try {
      l();
    } catch {}
  }
}

// ---- 10. ضبط المصنع وإعادة ضبط الأقسام ----
export async function triggerServerFactoryReset(
  mode: 'wipe_all_except_admin' | 'full_default' = 'wipe_all_except_admin',
  _adminUser?: SystemUser
): Promise<boolean> {
  return postOrReport('/system/factory-reset', { mode });
}

export async function triggerServerResetModule(
  moduleName: 'units' | 'maintenance' | 'inspections' | 'occupancy' | 'users' | 'audit_logs' | 'org_entities',
  actionType: 'clear' | 'default'
): Promise<boolean> {
  return postOrReport('/system/reset-module', { moduleName, actionType });
}

// ============================================================================
// 11. المزامنة اللحظية: أحداث الخادم (SSE) فقط
// ============================================================================

export interface RealtimeSyncEvent {
  type:
    | 'connected'
    | 'units_updated'
    | 'maintenance_updated'
    | 'occupancy_updated'
    | 'inspections_updated'
    | 'audit_logs_updated'
    | 'org_entities_updated'
    | 'branding_updated'
    | 'reference_data_updated'
    | 'users_updated'
    | 'all_updated';
  syncVersion: number;
  timestamp: number;
  payload?: any;
}

export async function getSyncVersion(): Promise<number> {
  const result = await apiRequest<{ syncVersion: number }>('GET', '/sync/version');
  return result.data?.syncVersion || 0;
}

export async function getSyncAll(): Promise<any | null> {
  const result = await apiRequest<any>('GET', '/sync/all');
  return result.ok ? result.data : null;
}

export function subscribeToRealtimeSync(
  onEvent: (event: RealtimeSyncEvent) => void,
  onStatusChange?: (status: 'connected' | 'reconnecting' | 'polling') => void
): () => void {
  onStatusChange?.('connected');

  // حفظ مرفوض أو تعارض نسخة: تُعاد قراءة كل شيء من الخادم
  const offResync = onResyncRequested(() => {
    notifyReferenceDataListeners();
    onEvent({ type: 'all_updated', syncVersion: Date.now(), timestamp: Date.now() });
  });

  let source: EventSource | null = null;
  try {
    const token = getSessionToken();
    source = new EventSource(`${BASE_API_URL}/sync/events${token ? `?token=${encodeURIComponent(token)}` : ''}`);
    source.onopen = () => onStatusChange?.('connected');
    source.onerror = () => onStatusChange?.('reconnecting');
    source.onmessage = (e) => {
      try {
        if (!e.data || e.data.startsWith(':')) return;
        const parsed: RealtimeSyncEvent = JSON.parse(e.data);
        if (parsed && parsed.timestamp) updateServerTimeFromTimestamp(parsed.timestamp);
        if (parsed && (parsed.type === 'reference_data_updated' || parsed.type === 'all_updated')) notifyReferenceDataListeners();
        if (parsed && parsed.type) onEvent(parsed);
      } catch {}
    };
  } catch {}

  return () => {
    offResync();
    try {
      source?.close();
    } catch {}
  };
}
