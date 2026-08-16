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

/**
 * Helper to handle fetch responses with JSON parsing and error handling
 */
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) {
      console.warn(`API request to ${url} failed with status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`Network/API error accessing ${url}:`, err);
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
  });
  return result?.success ?? false;
}

export async function addUnit(unit: UnitAsset): Promise<UnitAsset> {
  const result = await fetchJson<{ unit: UnitAsset }>(`${BASE_API_URL}/units`, {
    method: 'POST',
    body: JSON.stringify(unit),
  });
  return result?.unit || unit;
}

export async function updateUnit(unit: UnitAsset): Promise<UnitAsset> {
  const result = await fetchJson<{ unit: UnitAsset }>(`${BASE_API_URL}/units/${encodeURIComponent(unit.code)}`, {
    method: 'PUT',
    body: JSON.stringify(unit),
  });
  return result?.unit || unit;
}

export async function deleteUnit(code: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/units/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
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
  });
  return result?.success ?? false;
}

export async function addMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  const result = await fetchJson<{ request: MaintenanceRequest }>(`${BASE_API_URL}/maintenance`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
  return result?.request || req;
}

export async function updateMaintenanceRequest(req: MaintenanceRequest): Promise<MaintenanceRequest> {
  const result = await fetchJson<{ request: MaintenanceRequest }>(`${BASE_API_URL}/maintenance/${encodeURIComponent(req.id)}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
  return result?.request || req;
}

export async function deleteMaintenanceRequest(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/maintenance/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
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
  });
  return result?.success ?? false;
}

export async function addOccupancyRecord(record: OccupancyRecord): Promise<OccupancyRecord> {
  const result = await fetchJson<{ record: OccupancyRecord }>(`${BASE_API_URL}/occupancy`, {
    method: 'POST',
    body: JSON.stringify(record),
  });
  return result?.record || record;
}

export async function updateOccupancyRecord(record: OccupancyRecord): Promise<OccupancyRecord> {
  const result = await fetchJson<{ record: OccupancyRecord }>(`${BASE_API_URL}/occupancy/${encodeURIComponent(record.id)}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  });
  return result?.record || record;
}

export async function deleteOccupancyRecord(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/occupancy/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
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
  });
  return result?.success ?? false;
}

export async function addPeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  const result = await fetchJson<{ inspection: PeriodicInspectionSchedule }>(`${BASE_API_URL}/inspections`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return result?.inspection || item;
}

export async function updatePeriodicInspection(item: PeriodicInspectionSchedule): Promise<PeriodicInspectionSchedule> {
  const result = await fetchJson<{ inspection: PeriodicInspectionSchedule }>(`${BASE_API_URL}/inspections/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  });
  return result?.inspection || item;
}

export async function deletePeriodicInspection(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/inspections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
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
  });
  return result?.success ?? false;
}

export async function addAuditLog(log: AuditLogItem): Promise<AuditLogItem> {
  const result = await fetchJson<{ log: AuditLogItem }>(`${BASE_API_URL}/audit-logs`, {
    method: 'POST',
    body: JSON.stringify(log),
  });
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
  });
  return result?.success ?? false;
}

export async function addOrgEntity(entity: OrgEntity): Promise<OrgEntity> {
  const result = await fetchJson<{ entity: OrgEntity }>(`${BASE_API_URL}/org-entities`, {
    method: 'POST',
    body: JSON.stringify(entity),
  });
  return result?.entity || entity;
}

export async function updateOrgEntity(entity: OrgEntity): Promise<OrgEntity> {
  const result = await fetchJson<{ entity: OrgEntity }>(`${BASE_API_URL}/org-entities/${encodeURIComponent(entity.id)}`, {
    method: 'PUT',
    body: JSON.stringify(entity),
  });
  return result?.entity || entity;
}

export async function deleteOrgEntity(id: string): Promise<boolean> {
  const result = await fetchJson<{ success: boolean }>(`${BASE_API_URL}/org-entities/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return result?.success ?? true;
}
