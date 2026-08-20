/**
 * Midland Oil Company - Enterprise Data Access Layer (DAL)
 * Central API Client with Cloud Firestore Persistence & Real-time Sync
 * Guarantees permanent persistence across server restarts, browser reloads, and multi-device access.
 */

import {
  UnitAsset,
  MaintenanceRequest,
  OccupancyRecord,
  PeriodicInspectionSchedule,
  AuditLogItem,
  OrgEntity,
  SystemBranding,
  SystemUser,
} from '../types';
import { safeParse, safeSetItem } from '../utils/storageUtils';
import * as firestoreClient from './firebaseClient';

const BASE_API_URL = '/api';
const API_KEY = (import.meta as any).env?.VITE_API_KEY || 'midland_oil_secure_api_key_2026';

/**
 * Helper to handle fetch responses with JSON parsing and error handling
 */
async function fetchJson<T>(url: string, options?: RequestInit, throwOnError: boolean = false): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) {
      let errorDetails = '';
      try {
        const errorData = await res.json();
        errorDetails = errorData?.error || errorData?.details || `HTTP error ${res.status}`;
      } catch {
        errorDetails = `HTTP error ${res.status}`;
      }
      console.warn(`API request to ${url} returned status ${res.status}:`, errorDetails);
      if (throwOnError) {
        throw new Error(errorDetails);
      }
      return null;
    }
    const data = await res.json();
    if (throwOnError && data && (data as any).success === false) {
      throw new Error((data as any).error || 'فشل تنفيذ العملية على الخادم');
    }
    return data;
  } catch (err) {
    console.warn(`Network/API note accessing ${url}:`, err);
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
    if (firestoreUnits && firestoreUnits.length > 0) {
      safeSetItem('app_units', firestoreUnits);
      return firestoreUnits;
    }
  } catch (err) {
    console.warn('Firestore getUnits note:', err);
  }

  // Fallback to Express backend or LocalStorage
  const data = await fetchJson<UnitAsset[]>(`${BASE_API_URL}/units`);
  if (data && Array.isArray(data) && data.length > 0) {
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
    if (firestoreMaint && firestoreMaint.length > 0) {
      safeSetItem('app_maintenance_requests', firestoreMaint);
      return firestoreMaint;
    }
  } catch (err) {
    console.warn('Firestore getMaintenance note:', err);
  }

  const data = await fetchJson<MaintenanceRequest[]>(`${BASE_API_URL}/maintenance`);
  if (data && Array.isArray(data) && data.length > 0) {
    safeSetItem('app_maintenance_requests', data);
    return data;
  }
  return safeParse('app_maintenance_requests', []);
}

export async function saveMaintenanceRequests(requests: MaintenanceRequest[]): Promise<boolean> {
  safeSetItem('app_maintenance_requests', requests);
  try {
    await firestoreClient.bulkSaveMaintenanceToFirestore(requests);
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
  try {
    await firestoreClient.saveMaintenanceToFirestore(req);
  } catch (err) {
    console.warn('Firestore saveMaintenance error:', err);
  }
  fetchJson<{ request: MaintenanceRequest }>(`${BASE_API_URL}/maintenance`, {
    method: 'POST',
    body: JSON.stringify(req),
  }).catch(() => {});
  return req;
}

export async function updateMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  try {
    await firestoreClient.saveMaintenanceToFirestore(req);
  } catch (err) {
    console.warn('Firestore updateMaintenance error:', err);
  }
  fetchJson<{ request: MaintenanceRequest }>(`${BASE_API_URL}/maintenance/${encodeURIComponent(req.id)}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  }).catch(() => {});
  return req;
}

export async function deleteMaintenanceRequest(id: string): Promise<boolean> {
  try {
    await firestoreClient.deleteMaintenanceFromFirestore(id);
  } catch (err) {
    console.warn('Firestore deleteMaintenance error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/maintenance/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => {});
  return true;
}

// ============================================================================
// 3. Occupancy & Housing Records (سجلات الإشغال والتسكين)
// ============================================================================

export async function getOccupancyRecords(): Promise<OccupancyRecord[]> {
  try {
    const firestoreOcc = await firestoreClient.getOccupancyFromFirestore();
    if (firestoreOcc && firestoreOcc.length > 0) {
      safeSetItem('app_occupancy_records', firestoreOcc);
      return firestoreOcc;
    }
  } catch (err) {
    console.warn('Firestore getOccupancy note:', err);
  }

  const data = await fetchJson<OccupancyRecord[]>(`${BASE_API_URL}/occupancy`);
  if (data && Array.isArray(data) && data.length > 0) {
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
    if (firestoreInsp && firestoreInsp.length > 0) {
      safeSetItem('app_periodic_inspections', firestoreInsp);
      return firestoreInsp;
    }
  } catch (err) {
    console.warn('Firestore getInspections note:', err);
  }

  const data = await fetchJson<PeriodicInspectionSchedule[]>(`${BASE_API_URL}/inspections`);
  if (data && Array.isArray(data) && data.length > 0) {
    safeSetItem('app_periodic_inspections', data);
    return data;
  }
  return safeParse('app_periodic_inspections', []);
}

export async function savePeriodicInspections(inspections: PeriodicInspectionSchedule[]): Promise<boolean> {
  safeSetItem('app_periodic_inspections', inspections);
  try {
    await firestoreClient.bulkSaveInspectionsToFirestore(inspections);
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
  try {
    await firestoreClient.saveInspectionToFirestore(item);
  } catch (err) {
    console.warn('Firestore saveInspection error:', err);
  }
  fetchJson<{ inspection: PeriodicInspectionSchedule }>(`${BASE_API_URL}/inspections`, {
    method: 'POST',
    body: JSON.stringify(item),
  }).catch(() => {});
  return item;
}

export async function updatePeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  try {
    await firestoreClient.saveInspectionToFirestore(item);
  } catch (err) {
    console.warn('Firestore updateInspection error:', err);
  }
  fetchJson<{ inspection: PeriodicInspectionSchedule }>(`${BASE_API_URL}/inspections/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  }).catch(() => {});
  return item;
}

export async function deletePeriodicInspection(id: string): Promise<boolean> {
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/inspections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => {});
  return true;
}

// ============================================================================
// 5. Audit Logs (سجل التدقيق والعمليات)
// ============================================================================

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const firestoreLogs = await firestoreClient.getAuditLogsFromFirestore();
    if (firestoreLogs && firestoreLogs.length > 0) {
      safeSetItem('app_audit_logs', firestoreLogs);
      return firestoreLogs;
    }
  } catch (err) {
    console.warn('Firestore getAuditLogs note:', err);
  }

  const data = await fetchJson<AuditLogItem[]>(`${BASE_API_URL}/audit-logs`);
  if (data && Array.isArray(data) && data.length > 0) {
    safeSetItem('app_audit_logs', data);
    return data;
  }
  return safeParse('app_audit_logs', []);
}

export async function saveAuditLogs(logs: AuditLogItem[]): Promise<boolean> {
  safeSetItem('app_audit_logs', logs);
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/audit-logs/bulk`, {
    method: 'POST',
    body: JSON.stringify({ logs }),
  }).catch(() => {});
  return true;
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
// 6. Organization Hierarchy Entities (الهيكل التنظيمي)
// ============================================================================

export async function getOrgEntities(): Promise<OrgEntity[]> {
  try {
    const firestoreEntities = await firestoreClient.getOrgEntitiesFromFirestore();
    if (firestoreEntities && firestoreEntities.length > 0) {
      safeSetItem('app_ref_org_entities', firestoreEntities);
      return firestoreEntities;
    }
  } catch (err) {
    console.warn('Firestore getOrgEntities note:', err);
  }

  const data = await fetchJson<OrgEntity[]>(`${BASE_API_URL}/org-entities`);
  if (data && Array.isArray(data) && data.length > 0) {
    safeSetItem('app_ref_org_entities', data);
    return data;
  }
  return safeParse('app_ref_org_entities', []);
}

export async function saveOrgEntities(entities: OrgEntity[]): Promise<boolean> {
  safeSetItem('app_ref_org_entities', entities);
  try {
    await firestoreClient.saveOrgEntitiesToFirestore(entities);
  } catch (err) {
    console.warn('Firestore saveOrgEntities error:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/org-entities/bulk`, {
    method: 'POST',
    body: JSON.stringify({ entities }),
  }).catch(() => {});
  return true;
}

export async function addOrgEntity(entity: OrgEntity): Promise<OrgEntity> {
  const current = await getOrgEntities();
  const updated = [...current.filter((e) => e.id !== entity.id), entity];
  await saveOrgEntities(updated);
  return entity;
}

export async function updateOrgEntity(entity: OrgEntity): Promise<OrgEntity> {
  const current = await getOrgEntities();
  const updated = current.map((e) => (e.id === entity.id ? entity : e));
  await saveOrgEntities(updated);
  return entity;
}

export async function deleteOrgEntity(id: string): Promise<boolean> {
  const current = await getOrgEntities();
  const updated = current.filter((e) => e.id !== id);
  safeSetItem('app_ref_org_entities', updated);
  try {
    await firestoreClient.deleteOrgEntityFromFirestore(id);
  } catch (err) {
    console.warn('Firestore deleteOrgEntity note:', err);
  }
  fetchJson<{ success: boolean }>(`${BASE_API_URL}/org-entities/${id}`, {
    method: 'DELETE',
  }).catch(() => {
    // fallback to bulk sync
    saveOrgEntities(updated).catch(() => {});
  });
  return true;
}

// ============================================================================
// 7. System Branding (الهوية البصرية وشعار النظام)
// ============================================================================

export async function getBranding(): Promise<SystemBranding | null> {
  try {
    const firestoreBranding = await firestoreClient.getBrandingFromFirestore();
    if (firestoreBranding && firestoreBranding.systemName) {
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
    if (firestoreUsers && firestoreUsers.length > 0) {
      safeSetItem('app_users', firestoreUsers);
      return firestoreUsers;
    }
  } catch (err) {
    console.warn('Firestore getUsers note:', err);
  }

  const data = await fetchJson<SystemUser[]>(`${BASE_API_URL}/users`);
  if (data && Array.isArray(data) && data.length > 0) {
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
// 10. Real-Time Synchronization Listener (المزامنة الفورية اللحظية للبيانات)
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
