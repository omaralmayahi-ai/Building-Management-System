/**
 * Midland Oil Company - Enterprise Data Access Layer (DAL)
 * Central API Client for communicating with the Central PostgreSQL / Express Backend
 * Maintains full type parity with src/types.ts and provides identical function signatures.
 */

import {
  UnitAsset,
  MaintenanceRequest,
  OccupancyRecord,
  PeriodicInspectionSchedule,
  AuditLogItem,
  OrgEntity,
} from '../types';
import { safeParse, safeSetItem } from '../utils/storageUtils';

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
      console.warn(`API request to ${url} failed with status ${res.status}:`, errorDetails);
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
    console.warn(`Network/API error accessing ${url}:`, err);
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
  const data = await fetchJson<UnitAsset[]>(`${BASE_API_URL}/units`);
  if (data && Array.isArray(data)) {
    safeSetItem('app_units', data);
    return data;
  }
  // Local fallback if API is not yet reachable
  return safeParse('app_units', []);
}

export async function saveUnits(units: UnitAsset[]): Promise<boolean> {
  safeSetItem('app_units', units);
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/units/bulk`, {
    method: 'POST',
    body: JSON.stringify({ units }),
  }, true);
  return result?.success ?? false;
}

export async function addUnit(unit: UnitAsset): Promise<UnitAsset> {
  const result = await fetchJson<{ unit: UnitAsset }>(`${BASE_API_URL}/units`, {
    method: 'POST',
    body: JSON.stringify(unit),
  }, true);
  return result?.unit || unit;
}

export async function updateUnit(unit: UnitAsset): Promise<UnitAsset> {
  const result = await fetchJson<{ unit: UnitAsset }>(`${BASE_API_URL}/units/${encodeURIComponent(unit.code)}`, {
    method: 'PUT',
    body: JSON.stringify(unit),
  }, true);
  return result?.unit || unit;
}

export async function deleteUnit(code: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/units/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  }, true);
  return result?.success ?? true;
}

// ============================================================================
// 2. Maintenance Requests (أوامر وطلبات الصيانة)
// ============================================================================

export async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const data = await fetchJson<MaintenanceRequest[]>(`${BASE_API_URL}/maintenance`);
  if (data && Array.isArray(data)) {
    safeSetItem('app_maintenance_requests', data);
    return data;
  }
  return safeParse('app_maintenance_requests', []);
}

export async function saveMaintenanceRequests(requests: MaintenanceRequest[]): Promise<boolean> {
  safeSetItem('app_maintenance_requests', requests);
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/maintenance/bulk`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  }, true);
  return result?.success ?? false;
}

export async function addMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  const result = await fetchJson<{ request: MaintenanceRequest }>(`${BASE_API_URL}/maintenance`, {
    method: 'POST',
    body: JSON.stringify(req),
  }, true);
  return result?.request || req;
}

export async function updateMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  const result = await fetchJson<{ request: MaintenanceRequest }>(`${BASE_API_URL}/maintenance/${encodeURIComponent(req.id)}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  }, true);
  return result?.request || req;
}

export async function deleteMaintenanceRequest(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/maintenance/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, true);
  return result?.success ?? true;
}

// ============================================================================
// 3. Occupancy & Housing Records (سجلات الإشغال والتسكين)
// ============================================================================

export async function getOccupancyRecords(): Promise<OccupancyRecord[]> {
  const data = await fetchJson<OccupancyRecord[]>(`${BASE_API_URL}/occupancy`);
  if (data && Array.isArray(data)) {
    safeSetItem('app_occupancy_records', data);
    return data;
  }
  return safeParse('app_occupancy_records', []);
}

export async function saveOccupancyRecords(records: OccupancyRecord[]): Promise<boolean> {
  safeSetItem('app_occupancy_records', records);
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/occupancy/bulk`, {
    method: 'POST',
    body: JSON.stringify({ records }),
  }, true);
  return result?.success ?? false;
}

export async function addOccupancyRecord(record: OccupancyRecord): Promise<OccupancyRecord> {
  const result = await fetchJson<{ record: OccupancyRecord }>(`${BASE_API_URL}/occupancy`, {
    method: 'POST',
    body: JSON.stringify(record),
  }, true);
  return result?.record || record;
}

export async function updateOccupancyRecord(record: OccupancyRecord): Promise<OccupancyRecord> {
  const result = await fetchJson<{ record: OccupancyRecord }>(`${BASE_API_URL}/occupancy/${encodeURIComponent(record.id)}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  }, true);
  return result?.record || record;
}

export async function deleteOccupancyRecord(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/occupancy/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, true);
  return result?.success ?? true;
}

// ============================================================================
// 4. Periodic Safety & Technical Inspections (الكشوفات الدورية)
// ============================================================================

export async function getPeriodicInspections(): Promise<PeriodicInspectionSchedule[]> {
  const data = await fetchJson<PeriodicInspectionSchedule[]>(`${BASE_API_URL}/inspections`);
  if (data && Array.isArray(data)) {
    safeSetItem('app_periodic_inspections', data);
    return data;
  }
  return safeParse('app_periodic_inspections', []);
}

export async function savePeriodicInspections(inspections: PeriodicInspectionSchedule[]): Promise<boolean> {
  safeSetItem('app_periodic_inspections', inspections);
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/inspections/bulk`, {
    method: 'POST',
    body: JSON.stringify({ inspections }),
  }, true);
  return result?.success ?? false;
}

export async function addPeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  const result = await fetchJson<{ inspection: PeriodicInspectionSchedule }>(`${BASE_API_URL}/inspections`, {
    method: 'POST',
    body: JSON.stringify(item),
  }, true);
  return result?.inspection || item;
}

export async function updatePeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  const result = await fetchJson<{ inspection: PeriodicInspectionSchedule }>(`${BASE_API_URL}/inspections/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  }, true);
  return result?.inspection || item;
}

export async function deletePeriodicInspection(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/inspections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, true);
  return result?.success ?? true;
}

// ============================================================================
// 5. Audit Logs (سجل التدقيق والعمليات)
// ============================================================================

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  const data = await fetchJson<AuditLogItem[]>(`${BASE_API_URL}/audit-logs`);
  if (data && Array.isArray(data)) {
    safeSetItem('app_audit_logs', data);
    return data;
  }
  return safeParse('app_audit_logs', []);
}

export async function saveAuditLogs(logs: AuditLogItem[]): Promise<boolean> {
  safeSetItem('app_audit_logs', logs);
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/audit-logs/bulk`, {
    method: 'POST',
    body: JSON.stringify({ logs }),
  }, true);
  return result?.success ?? false;
}

export async function addAuditLog(log: AuditLogItem): Promise<AuditLogItem> {
  const result = await fetchJson<{ log: AuditLogItem }>(`${BASE_API_URL}/audit-logs`, {
    method: 'POST',
    body: JSON.stringify(log),
  }, true);
  return result?.log || log;
}

// ============================================================================
// 6. Organization Hierarchy Entities (الهيكل التنظيمي)
// ============================================================================

export async function getOrgEntities(): Promise<OrgEntity[]> {
  const data = await fetchJson<OrgEntity[]>(`${BASE_API_URL}/org-entities`);
  if (data && Array.isArray(data)) {
    safeSetItem('app_ref_org_entities', data);
    return data;
  }
  return safeParse('app_ref_org_entities', []);
}

export async function saveOrgEntities(entities: OrgEntity[]): Promise<boolean> {
  safeSetItem('app_ref_org_entities', entities);
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/org-entities/bulk`, {
    method: 'POST',
    body: JSON.stringify({ entities }),
  }, true);
  return result?.success ?? false;
}

export async function addOrgEntity(entity: OrgEntity): Promise<OrgEntity> {
  const result = await fetchJson<{ entity: OrgEntity }>(`${BASE_API_URL}/org-entities`, {
    method: 'POST',
    body: JSON.stringify(entity),
  }, true);
  return result?.entity || entity;
}

export async function updateOrgEntity(entity: OrgEntity): Promise<OrgEntity> {
  const result = await fetchJson<{ entity: OrgEntity }>(`${BASE_API_URL}/org-entities/${encodeURIComponent(entity.id)}`, {
    method: 'PUT',
    body: JSON.stringify(entity),
  }, true);
  return result?.entity || entity;
}

export async function deleteOrgEntity(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/org-entities/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, true);
  return result?.success ?? true;
}

// ============================================================================
// 7. System Branding (الهوية البصرية وشعار النظام)
// ============================================================================

import { SystemBranding, SystemUser } from '../types';

export async function getBranding(): Promise<SystemBranding | null> {
  const data = await fetchJson<SystemBranding>(`${BASE_API_URL}/branding`);
  if (data && typeof data === 'object' && data.systemName) {
    safeSetItem('app_branding', data);
    return data;
  }
  return safeParse('app_branding', null);
}

export async function saveBranding(branding: SystemBranding): Promise<boolean> {
  safeSetItem('app_branding', branding);
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/branding`, {
    method: 'POST',
    body: JSON.stringify(branding),
  }, true);
  return result?.success ?? true;
}

// ============================================================================
// 8. System Users (حسابات المستخدمين والصلاحيات)
// ============================================================================

export async function getUsers(): Promise<SystemUser[]> {
  const data = await fetchJson<SystemUser[]>(`${BASE_API_URL}/users`);
  if (data && Array.isArray(data) && data.length > 0) {
    safeSetItem('app_users', data);
    return data;
  }
  return safeParse('app_users', []);
}

export async function saveUsers(users: SystemUser[]): Promise<boolean> {
  safeSetItem('app_users', users);
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/users/bulk`, {
    method: 'POST',
    body: JSON.stringify({ users }),
  }, true);
  return result?.success ?? true;
}

export async function addUser(user: SystemUser): Promise<SystemUser> {
  const result = await fetchJson<{ user: SystemUser }>(`${BASE_API_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(user),
  }, true);
  return result?.user || user;
}

export async function updateUser(user: SystemUser): Promise<SystemUser> {
  const result = await fetchJson<{ user: SystemUser }>(`${BASE_API_URL}/users/${encodeURIComponent(user.id)}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  }, true);
  return result?.user || user;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, true);
  return result?.success ?? true;
}

// ============================================================================
// 9. Reference Data (البيانات المرجعية - المحافظات، الحقول، المواقع، الأنواع)
// ============================================================================

export async function getReferenceData(): Promise<any | null> {
  const data = await fetchJson<any>(`${BASE_API_URL}/reference-data`);
  return data;
}

export async function saveReferenceData(refData: any): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/reference-data`, {
    method: 'POST',
    body: JSON.stringify(refData),
  }, true);
  return result?.success ?? true;
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
 * Subscribes to real-time synchronization events via Server-Sent Events (SSE)
 * with robust auto-reconnect and polling fallback.
 */
export function subscribeToRealtimeSync(
  onEvent: (event: RealtimeSyncEvent) => void,
  onStatusChange?: (status: 'connected' | 'reconnecting' | 'polling') => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let retryTimeout: any = null;
  let pollingInterval: any = null;
  let lastKnownVersion = 0;

  function startSSE() {
    if (isClosed) return;
    try {
      if (eventSource) {
        eventSource.close();
      }
      eventSource = new EventSource(`${BASE_API_URL}/sync/events`);

      eventSource.onopen = () => {
        onStatusChange?.('connected');
      };

      eventSource.onmessage = (e) => {
        try {
          if (!e.data || e.data.startsWith(':')) return;
          const parsed: RealtimeSyncEvent = JSON.parse(e.data);
          if (parsed && parsed.type) {
            lastKnownVersion = parsed.syncVersion || Date.now();
            onEvent(parsed);
          }
        } catch (err) {
          console.warn('Failed to parse SSE sync event:', err);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        onStatusChange?.('reconnecting');
        if (!isClosed) {
          clearTimeout(retryTimeout);
          retryTimeout = setTimeout(startSSE, 4000);
        }
      };
    } catch (err) {
      console.warn('SSE connection failed, switching to polling fallback:', err);
      onStatusChange?.('polling');
    }
  }

  // Backup polling checker (every 6 seconds) to ensure synchronization if SSE is disconnected
  pollingInterval = setInterval(async () => {
    if (isClosed) return;
    try {
      const v = await getSyncVersion();
      if (v > 0 && lastKnownVersion > 0 && v !== lastKnownVersion) {
        lastKnownVersion = v;
        onEvent({
          type: 'all_updated',
          syncVersion: v,
          timestamp: Date.now(),
        });
      } else if (v > 0 && lastKnownVersion === 0) {
        lastKnownVersion = v;
      }
    } catch {
      // ignore transient poll error
    }
  }, 6000);

  startSSE();

  // Return unsubscribe cleanup function
  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    clearTimeout(retryTimeout);
    clearInterval(pollingInterval);
  };
}

