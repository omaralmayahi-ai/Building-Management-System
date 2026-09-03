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
import * as firestoreClient from './firebaseClient';
import { syncQueue, SyncQueueStatus } from './syncQueue';
import { INITIAL_ORG_ENTITIES } from '../data/mockData';

export { syncQueue, type SyncQueueStatus };


const BASE_API_URL = '/api';

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

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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
// 1. Units & Fixed Assets (الأصول والوحدات الثابتة)
// ============================================================================

export async function getUnits(): Promise<UnitAsset[]> {
  try {
    const firestoreUnits = await firestoreClient.getUnitsFromFirestore();
    if (Array.isArray(firestoreUnits) && firestoreUnits.length > 0) {
      safeSetItem('app_units', firestoreUnits);
      return firestoreUnits;
    }
  } catch (err) {
    console.warn('Firestore getUnits note:', err);
  }

  // Fallback to Express backend or LocalStorage
  const data = await fetchJson<UnitAsset[]>(`${BASE_API_URL}/units`);
  if (Array.isArray(data) && data.length > 0) {
    safeSetItem('app_units', data);
    return data;
  }
  return safeParse('app_units', []);
}

export async function saveUnits(units: UnitAsset[]): Promise<boolean> {
  safeSetItem('app_units', units);
  try {
    await firestoreClient.bulkSaveUnitsToFirestore(units);
  } catch (err) {
    console.warn('Firestore bulkSaveUnits error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/units/bulk`, {
    method: 'POST',
    body: JSON.stringify({ units }),
  }).catch(() => {});
  return true;
}

export async function addUnit(unit: UnitAsset): Promise<UnitAsset> {
  try {
    await firestoreClient.saveUnitToFirestore(unit);
  } catch (err) {
    console.warn('Firestore saveUnit error:', err);
  }
  fetchJson<{ unit: UnitAsset }>(`${BASE_API_URL}/units`, {
    method: 'POST',
    body: JSON.stringify(unit),
  }).catch(() => {});
  return unit;
}

export async function updateUnit(unit: UnitAsset): Promise<UnitAsset> {
  try {
    await firestoreClient.saveUnitToFirestore(unit);
  } catch (err) {
    console.warn('Firestore updateUnit error:', err);
  }
  fetchJson<{ unit: UnitAsset }>(`${BASE_API_URL}/units/${encodeURIComponent(unit.code)}`, {
    method: 'PUT',
    body: JSON.stringify(unit),
  }).catch(() => {});
  return unit;
}

export async function deleteUnit(code: string): Promise<boolean> {
  try {
    await firestoreClient.deleteUnitFromFirestore(code);
  } catch (err) {
    console.warn('Firestore deleteUnit error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/units/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  }).catch(() => {});
  return true;
}

// ============================================================================
// 2. Maintenance Requests (أوامر وطلبات الصيانة)
// ============================================================================

export async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  try {
    const firestoreMaint = await firestoreClient.getMaintenanceFromFirestore();
    if (Array.isArray(firestoreMaint) && firestoreMaint.length > 0) {
      safeSetItem('app_maintenance_requests', firestoreMaint);
      return firestoreMaint;
    }
  } catch (err) {
    console.warn('Firestore getMaintenance note:', err);
  }

  const data = await fetchJson<MaintenanceRequest[]>(`${BASE_API_URL}/maintenance`);
  if (Array.isArray(data) && data.length > 0) {
    safeSetItem('app_maintenance_requests', data);
    return data;
  }
  return safeParse('app_maintenance_requests', []);
}

export async function saveMaintenanceRequests(requests: MaintenanceRequest[]): Promise<boolean> {
  safeSetItem('app_maintenance_requests', requests);
  try {
    // Compress attachments in bulk if any
    const compressedRequests = await Promise.all(
      requests.map((r) => sanitizeAndCompressAttachments(r))
    );
    await firestoreClient.bulkSaveMaintenanceToFirestore(compressedRequests);
  } catch (err) {
    console.warn('Firestore bulkSaveMaintenance error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/maintenance/bulk`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  }).catch(() => {});
  return true;
}

export async function addMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  // 1. Ensure any attached photo is safely compressed
  const compressed = await sanitizeAndCompressAttachments(req);

  // 2. Enqueue in Offline Sync & Retry Queue (persisted locally and auto-pushed)
  syncQueue.enqueue('create_maintenance', compressed.id, compressed).catch((err) => {
    console.warn('Sync queue error on addMaintenanceRequest:', err);
  });

  return compressed;
}

export async function updateMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  // 1. Ensure any attached photo is safely compressed
  const compressed = await sanitizeAndCompressAttachments(req);

  // 2. Enqueue in Offline Sync & Retry Queue
  syncQueue.enqueue('update_maintenance', compressed.id, compressed).catch((err) => {
    console.warn('Sync queue error on updateMaintenanceRequest:', err);
  });

  return compressed;
}

export async function deleteMaintenanceRequest(id: string): Promise<boolean> {
  syncQueue.enqueue('delete_maintenance', id, null).catch((err) => {
    console.warn('Sync queue error on deleteMaintenanceRequest:', err);
  });
  return true;
}

// ============================================================================
// 3. Occupancy Records (سجلات الإشغال والتسكين)
// ============================================================================

export async function getOccupancyRecords(): Promise<OccupancyRecord[]> {
  try {
    const firestoreOcc = await firestoreClient.getOccupancyFromFirestore();
    if (Array.isArray(firestoreOcc) && firestoreOcc.length > 0) {
      safeSetItem('app_occupancy_records', firestoreOcc);
      return firestoreOcc;
    }
  } catch (err) {
    console.warn('Firestore getOccupancy note:', err);
  }

  const data = await fetchJson<OccupancyRecord[]>(`${BASE_API_URL}/occupancy`);
  if (Array.isArray(data) && data.length > 0) {
    safeSetItem('app_occupancy_records', data);
    return data;
  }
  return safeParse('app_occupancy_records', []);
}

export async function saveOccupancyRecords(records: OccupancyRecord[]): Promise<boolean> {
  safeSetItem('app_occupancy_records', records);
  try {
    await firestoreClient.bulkSaveOccupancyToFirestore(records);
  } catch (err) {
    console.warn('Firestore bulkSaveOccupancy error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/occupancy/bulk`, {
    method: 'POST',
    body: JSON.stringify({ records }),
  }).catch(() => {});
  return true;
}

export async function addOccupancyRecord(record: OccupancyRecord): Promise<OccupancyRecord> {
  try {
    await firestoreClient.saveOccupancyToFirestore(record);
  } catch (err) {
    console.warn('Firestore saveOccupancy error:', err);
  }
  fetchJson<{ record: OccupancyRecord }>(`${BASE_API_URL}/occupancy`, {
    method: 'POST',
    body: JSON.stringify(record),
  }).catch(() => {});
  return record;
}

export async function updateOccupancyRecord(record: OccupancyRecord): Promise<OccupancyRecord> {
  try {
    await firestoreClient.saveOccupancyToFirestore(record);
  } catch (err) {
    console.warn('Firestore updateOccupancy error:', err);
  }
  fetchJson<{ record: OccupancyRecord }>(`${BASE_API_URL}/occupancy/${encodeURIComponent(record.id)}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  }).catch(() => {});
  return record;
}

export async function deleteOccupancyRecord(id: string): Promise<boolean> {
  try {
    await firestoreClient.deleteOccupancyFromFirestore(id);
  } catch (err) {
    console.warn('Firestore deleteOccupancy error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/occupancy/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => {});
  return true;
}

// ============================================================================
// 4. Periodic Safety & Technical Inspections (الكشوفات الدورية)
// ============================================================================

export async function getPeriodicInspections(): Promise<PeriodicInspectionSchedule[]> {
  try {
    const firestoreInsp = await firestoreClient.getInspectionsFromFirestore();
    if (Array.isArray(firestoreInsp) && firestoreInsp.length > 0) {
      safeSetItem('app_periodic_inspections', firestoreInsp);
      return firestoreInsp;
    }
  } catch (err) {
    console.warn('Firestore getInspections note:', err);
  }

  const data = await fetchJson<PeriodicInspectionSchedule[]>(`${BASE_API_URL}/inspections`);
  if (Array.isArray(data) && data.length > 0) {
    safeSetItem('app_periodic_inspections', data);
    return data;
  }
  return safeParse('app_periodic_inspections', []);
}

export async function savePeriodicInspections(inspections: PeriodicInspectionSchedule[]): Promise<boolean> {
  safeSetItem('app_periodic_inspections', inspections);
  try {
    const compressedInspections = await Promise.all(
      inspections.map((i) => sanitizeAndCompressAttachments(i))
    );
    await firestoreClient.bulkSaveInspectionsToFirestore(compressedInspections);
  } catch (err) {
    console.warn('Firestore bulkSaveInspections error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/inspections/bulk`, {
    method: 'POST',
    body: JSON.stringify({ inspections }),
  }).catch(() => {});
  return true;
}

export async function addPeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  // 1. Ensure any attached report/images are compressed
  const compressed = await sanitizeAndCompressAttachments(item);

  // 2. Enqueue in Offline Sync & Retry Queue
  syncQueue.enqueue('create_inspection', compressed.id, compressed).catch((err) => {
    console.warn('Sync queue error on addPeriodicInspection:', err);
  });

  return compressed;
}

export async function updatePeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  // 1. Ensure any attached report/images are compressed
  const compressed = await sanitizeAndCompressAttachments(item);

  // 2. Enqueue in Offline Sync & Retry Queue
  syncQueue.enqueue('update_inspection', compressed.id, compressed).catch((err) => {
    console.warn('Sync queue error on updatePeriodicInspection:', err);
  });

  return compressed;
}

export async function deletePeriodicInspection(id: string): Promise<boolean> {
  syncQueue.enqueue('delete_inspection', id, null).catch((err) => {
    console.warn('Sync queue error on deletePeriodicInspection:', err);
  });
  return true;
}

// ============================================================================
// 5. Audit Logs (سجل التدقيق والعمليات)
// ============================================================================

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const firestoreLogs = await firestoreClient.getAuditLogsFromFirestore();
    if (Array.isArray(firestoreLogs) && firestoreLogs.length > 0) {
      safeSetItem('app_audit_logs', firestoreLogs);
      return firestoreLogs;
    }
  } catch (err) {
    console.warn('Firestore getAuditLogs note:', err);
  }

  const data = await fetchJson<AuditLogItem[]>(`${BASE_API_URL}/audit-logs`);
  if (Array.isArray(data) && data.length > 0) {
    safeSetItem('app_audit_logs', data);
    return data;
  }
  return safeParse('app_audit_logs', []);
}

export async function addAuditLog(log: AuditLogItem): Promise<AuditLogItem> {
  try {
    await firestoreClient.addAuditLogToFirestore(log);
  } catch (err) {
    console.warn('Firestore addAuditLog error:', err);
  }
  fetchJson<{ log: AuditLogItem }>(`${BASE_API_URL}/audit-logs`, {
    method: 'POST',
    body: JSON.stringify(log),
  }).catch(() => {});
  return log;
}

// ============================================================================
// 6. Organizational Entities (الهيكل التنظيمي والتشكيلات)
// ============================================================================

export async function getOrgEntities(): Promise<OrgEntity[]> {
  try {
    const firestoreEntities = await firestoreClient.getOrgEntitiesFromFirestore();
    if (Array.isArray(firestoreEntities) && firestoreEntities.length > 0) {
      const sorted = [...firestoreEntities].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      safeSetItem('app_ref_org_entities', sorted);
      return sorted;
    }
  } catch (err) {
    console.warn('Firestore getOrgEntities note:', err);
  }

  const data = await fetchJson<OrgEntity[]>(`${BASE_API_URL}/org-entities`);
  if (Array.isArray(data) && data.length > 0) {
    const sorted = [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    safeSetItem('app_ref_org_entities', sorted);
    return sorted;
  }
  const cached = safeParse('app_ref_org_entities', INITIAL_ORG_ENTITIES);
  if (Array.isArray(cached) && cached.length > 0) {
    return [...cached].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return INITIAL_ORG_ENTITIES.map((e, idx) => ({ ...e, sortOrder: e.sortOrder ?? idx }));
}

export async function saveOrgEntities(entities: OrgEntity[]): Promise<boolean> {
  const ordered = entities.map((e, idx) => ({
    ...e,
    sortOrder: e.sortOrder !== undefined ? e.sortOrder : idx,
  }));
  safeSetItem('app_ref_org_entities', ordered);
  try {
    await firestoreClient.saveOrgEntitiesToFirestore(ordered);
  } catch (err) {
    console.warn('Firestore saveOrgEntities error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/org-entities/bulk`, {
    method: 'POST',
    body: JSON.stringify({ entities: ordered }),
  }).catch(() => {});
  return true;
}

export async function addOrgEntity(entity: OrgEntity): Promise<OrgEntity> {
  const current = safeParse<OrgEntity[]>('app_ref_org_entities', []);
  const updated = [entity, ...current.filter((e) => e.id !== entity.id)];
  safeSetItem('app_ref_org_entities', updated);
  try {
    await firestoreClient.saveOrgEntitiesToFirestore(updated);
  } catch (err) {
    console.warn('Firestore addOrgEntity error:', err);
  }
  fetchJson<{ entity: OrgEntity }>(`${BASE_API_URL}/org-entities`, {
    method: 'POST',
    body: JSON.stringify(entity),
  }).catch(() => {});
  return entity;
}

export async function updateOrgEntity(entity: OrgEntity): Promise<OrgEntity> {
  const current = safeParse<OrgEntity[]>('app_ref_org_entities', []);
  const updated = current.map((e) => (e.id === entity.id ? entity : e));
  safeSetItem('app_ref_org_entities', updated);
  try {
    await firestoreClient.saveOrgEntitiesToFirestore(updated);
  } catch (err) {
    console.warn('Firestore updateOrgEntity error:', err);
  }
  fetchJson<{ entity: OrgEntity }>(`${BASE_API_URL}/org-entities/${encodeURIComponent(entity.id)}`, {
    method: 'PUT',
    body: JSON.stringify(entity),
  }).catch(() => {});
  return entity;
}

export async function deleteOrgEntity(id: string): Promise<boolean> {
  const current = safeParse<OrgEntity[]>('app_ref_org_entities', []);
  const updated = current.filter((e) => e.id !== id);
  safeSetItem('app_ref_org_entities', updated);
  try {
    await firestoreClient.deleteOrgEntityFromFirestore(id);
  } catch (err) {
    console.warn('Firestore deleteOrgEntity error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/org-entities/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => {});
  return true;
}

export async function deleteOrgEntitiesBatch(ids: string[]): Promise<boolean> {
  const current = safeParse<OrgEntity[]>('app_ref_org_entities', []);
  const idSet = new Set(ids);
  const updated = current.filter((e) => !idSet.has(e.id));
  safeSetItem('app_ref_org_entities', updated);
  try {
    await firestoreClient.deleteOrgEntitiesBatchFromFirestore(ids);
  } catch (err) {
    console.warn('Firestore deleteOrgEntitiesBatch error:', err);
  }
  for (const id of ids) {
    fetchJson<{ success: boolean }>(`${BASE_API_URL}/org-entities/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  }
  return true;
}

export async function clearOrgEntities(): Promise<boolean> {
  safeSetItem('app_ref_org_entities', []);
  try {
    await firestoreClient.clearOrgEntitiesFromFirestore();
  } catch (err) {
    console.warn('Firestore clearOrgEntities error:', err);
  }
  triggerServerResetModule('org_entities', 'clear').catch(() => {});
  return true;
}

export async function resetOrgEntitiesToDefault(): Promise<boolean> {
  safeSetItem('app_ref_org_entities', INITIAL_ORG_ENTITIES);
  try {
    await firestoreClient.saveOrgEntitiesToFirestore(INITIAL_ORG_ENTITIES);
  } catch (err) {
    console.warn('Firestore resetOrgEntitiesToDefault error:', err);
  }
  triggerServerResetModule('org_entities', 'default').catch(() => {});
  return true;
}

// ============================================================================
// 7. System Branding (الهوية البصرية وإعدادات النظام)
// ============================================================================

export async function getBranding(): Promise<SystemBranding | null> {
  try {
    const firestoreBranding = await firestoreClient.getBrandingFromFirestore();
    if (firestoreBranding) {
      safeSetItem('app_branding', firestoreBranding);
      return firestoreBranding;
    }
  } catch (err) {
    console.warn('Firestore getBranding note:', err);
  }

  const data = await fetchJson<SystemBranding>(`${BASE_API_URL}/branding`);
  if (data && typeof data === 'object' && data.systemName) {
    safeSetItem('app_branding', data);
    return data;
  }
  return safeParse('app_branding', null);
}

export async function saveBranding(branding: SystemBranding): Promise<boolean> {
  safeSetItem('app_branding', branding);
  try {
    await firestoreClient.saveBrandingToFirestore(branding);
  } catch (err) {
    console.warn('Firestore saveBranding error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/branding`, {
    method: 'POST',
    body: JSON.stringify(branding),
  }).catch(() => {});
  return true;
}

// ============================================================================
// 8. System Users (حسابات المستخدمين والصلاحيات)
// ============================================================================

export async function getUsers(): Promise<SystemUser[]> {
  try {
    const firestoreUsers = await firestoreClient.getUsersFromFirestore();
    if (Array.isArray(firestoreUsers) && firestoreUsers.length > 0) {
      safeSetItem('app_users', firestoreUsers);
      return firestoreUsers;
    }
  } catch (err) {
    console.warn('Firestore getUsers note:', err);
  }

  const data = await fetchJson<SystemUser[]>(`${BASE_API_URL}/users`);
  if (Array.isArray(data) && data.length > 0) {
    safeSetItem('app_users', data);
    return data;
  }
  return safeParse('app_users', []);
}

export async function saveUsers(users: SystemUser[]): Promise<boolean> {
  safeSetItem('app_users', users);
  try {
    for (const u of users) {
      await firestoreClient.saveUserToFirestore(u);
    }
  } catch (err) {
    console.warn('Firestore saveUsers error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/users/bulk`, {
    method: 'POST',
    body: JSON.stringify({ users }),
  }).catch(() => {});
  return true;
}

export async function addUser(user: SystemUser): Promise<SystemUser> {
  try {
    await firestoreClient.saveUserToFirestore(user);
  } catch (err) {
    console.warn('Firestore addUser error:', err);
  }
  fetchJson<{ user: SystemUser }>(`${BASE_API_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(user),
  }).catch(() => {});
  return user;
}

export async function updateUser(user: SystemUser): Promise<SystemUser> {
  try {
    await firestoreClient.saveUserToFirestore(user);
  } catch (err) {
    console.warn('Firestore updateUser error:', err);
  }
  fetchJson<{ user: SystemUser }>(`${BASE_API_URL}/users/${encodeURIComponent(user.id)}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  }).catch(() => {});
  return user;
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await firestoreClient.deleteUserFromFirestore(id);
  } catch (err) {
    console.warn('Firestore deleteUser error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => {});
  return true;
}

// ============================================================================
// 9. Reference Data (البيانات المرجعية - المحافظات، الحقول، المواقع، الأنواع)
// ============================================================================

export async function getReferenceData(): Promise<any | null> {
  try {
    const firestoreRef = await firestoreClient.getReferenceDataFromFirestore();
    if (firestoreRef) return firestoreRef;
  } catch (err) {
    console.warn('Firestore getReferenceData note:', err);
  }
  const data = await fetchJson<any>(`${BASE_API_URL}/reference-data`);
  return data;
}

export async function saveReferenceData(refData: any): Promise<boolean> {
  try {
    await firestoreClient.saveReferenceDataToFirestore(refData);
  } catch (err) {
    console.warn('Firestore saveReferenceData error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/reference-data`, {
    method: 'POST',
    body: JSON.stringify(refData),
  }).catch(() => {});
  return true;
}

// ============================================================================
// 10. System Factory Reset & Granular Reset API Actions
// ============================================================================

export async function triggerServerFactoryReset(
  mode: 'wipe_all_except_admin' | 'full_default' = 'wipe_all_except_admin',
  adminUser?: SystemUser
): Promise<boolean> {
  try {
    if (adminUser) {
      await firestoreClient.resetFirestoreComprehensive(adminUser);
    }
  } catch (err) {
    console.warn('Firestore factory reset note:', err);
  }

  const res = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/system/factory-reset`, {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
  return !!res?.success;
}

export async function triggerServerResetModule(
  moduleName: 'units' | 'maintenance' | 'inspections' | 'occupancy' | 'users' | 'audit_logs' | 'org_entities',
  actionType: 'clear' | 'default'
): Promise<boolean> {
  try {
    if (actionType === 'clear') {
      const colMap: Record<string, string> = {
        units: 'units',
        maintenance: 'maintenance_requests',
        inspections: 'periodic_inspections',
        occupancy: 'occupancy_records',
        audit_logs: 'audit_logs',
        org_entities: 'org_entities',
      };
      if (colMap[moduleName]) {
        await firestoreClient.clearFirestoreCollection(colMap[moduleName]);
      }
    } else if (actionType === 'default') {
      if (moduleName === 'org_entities') {
        await firestoreClient.saveOrgEntitiesToFirestore(INITIAL_ORG_ENTITIES);
      }
    }
  } catch (err) {
    console.warn('Firestore reset module note:', err);
  }

  const res = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/system/reset-module`, {
    method: 'POST',
    body: JSON.stringify({ moduleName, actionType }),
  });
  return !!res?.success;
}

// ============================================================================
// 11. Real-Time Synchronization Listener (المزامنة الفورية اللحظية للبيانات)
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
    | 'users_updated'
    | 'all_updated';
  syncVersion: number;
  timestamp: number;
  payload?: any;
}

export async function getSyncVersion(): Promise<number> {
  const data = await fetchJson<{ syncVersion: number }>(`${BASE_API_URL}/sync/version`);
  return data?.syncVersion || 0;
}

export async function getSyncAll(): Promise<any | null> {
  const data = await fetchJson<any>(`${BASE_API_URL}/sync/all`);
  return data;
}

/**
 * Subscribes to real-time synchronization events via Firestore real-time listeners
 * and fallback Server-Sent Events (SSE).
 */
export function subscribeToRealtimeSync(
  onEvent: (event: RealtimeSyncEvent) => void,
  onStatusChange?: (status: 'connected' | 'reconnecting' | 'polling') => void
): () => void {
  onStatusChange?.('connected');

  // Firestore real-time listeners
  const unsubs: Array<() => void> = [];

  try {
    const unsubUnits = firestoreClient.subscribeToFirestoreUnits((units) => {
      onEvent({
        type: 'units_updated',
        syncVersion: Date.now(),
        timestamp: Date.now(),
        payload: units,
      });
    });
    unsubs.push(unsubUnits);

    const unsubMaint = firestoreClient.subscribeToFirestoreMaintenance((reqs) => {
      onEvent({
        type: 'maintenance_updated',
        syncVersion: Date.now(),
        timestamp: Date.now(),
        payload: reqs,
      });
    });
    unsubs.push(unsubMaint);

    const unsubOcc = firestoreClient.subscribeToFirestoreOccupancy((records) => {
      onEvent({
        type: 'occupancy_updated',
        syncVersion: Date.now(),
        timestamp: Date.now(),
        payload: records,
      });
    });
    unsubs.push(unsubOcc);

    const unsubInsp = firestoreClient.subscribeToFirestoreInspections((schedules) => {
      onEvent({
        type: 'inspections_updated',
        syncVersion: Date.now(),
        timestamp: Date.now(),
        payload: schedules,
      });
    });
    unsubs.push(unsubInsp);

    const unsubUsers = firestoreClient.subscribeToFirestoreUsers((users) => {
      onEvent({
        type: 'users_updated',
        syncVersion: Date.now(),
        timestamp: Date.now(),
        payload: users,
      });
    });
    unsubs.push(unsubUsers);
  } catch (err) {
    console.warn('Firestore live listener setup note:', err);
  }

  // Also hook into SSE if available for server-originated broadcasts
  let sseEventSource: EventSource | null = null;
  try {
    sseEventSource = new EventSource(`${BASE_API_URL}/sync/events`);
    sseEventSource.onmessage = (e) => {
      try {
        if (!e.data || e.data.startsWith(':')) return;
        const parsed: RealtimeSyncEvent = JSON.parse(e.data);
        if (parsed && parsed.timestamp) {
          updateServerTimeFromTimestamp(parsed.timestamp);
        }
        if (parsed && parsed.type) {
          onEvent(parsed);
        }
      } catch {}
    };
  } catch {}

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    if (sseEventSource) {
      try {
        sseEventSource.close();
      } catch {}
    }
  };
}
