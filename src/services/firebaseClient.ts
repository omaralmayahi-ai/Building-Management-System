import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
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
import {
  INITIAL_UNITS,
  INITIAL_MAINTENANCE_REQUESTS,
  INITIAL_OCCUPANCY_RECORDS,
  INITIAL_PERIODIC_INSPECTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ORG_ENTITIES,
  INITIAL_USERS,
  INITIAL_BRANDING,
} from '../data/mockData';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfigJson) : getApp();

// Initialize Firestore with custom database ID if provided
export const db: Firestore = (firebaseConfigJson as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfigJson as any).firestoreDatabaseId)
  : getFirestore(app);

// Helper to remove undefined fields from objects before saving to Firestore
function sanitizeDoc<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        clean[key] = value.map((item) =>
          typeof item === 'object' && item !== null ? sanitizeDoc(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        clean[key] = sanitizeDoc(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

// ============================================================================
// Automatic Seeding (Executes once if database is clean)
// ============================================================================
let isSeeded = false;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (isSeeded) return;
  try {
    const unitsCol = collection(db, 'units');
    const snap = await getDocs(query(unitsCol, limit(1)));
    if (snap.empty) {
      console.log('🌱 Firestore database is empty. Seeding initial enterprise assets & data...');
      const batch = writeBatch(db);

      // Seed Units
      for (const u of INITIAL_UNITS) {
        const ref = doc(db, 'units', u.code);
        batch.set(ref, sanitizeDoc(u));
      }

      // Seed Users
      for (const user of INITIAL_USERS) {
        const ref = doc(db, 'system_users', user.id);
        batch.set(ref, sanitizeDoc(user));
      }

      // Seed Org Entities
      for (const org of INITIAL_ORG_ENTITIES) {
        const ref = doc(db, 'org_entities', org.id);
        batch.set(ref, sanitizeDoc(org));
      }

      // Seed Maintenance
      for (const m of INITIAL_MAINTENANCE_REQUESTS) {
        const ref = doc(db, 'maintenance_requests', m.id);
        batch.set(ref, sanitizeDoc(m));
      }

      // Seed Occupancy
      for (const occ of INITIAL_OCCUPANCY_RECORDS) {
        const ref = doc(db, 'occupancy_records', occ.id);
        batch.set(ref, sanitizeDoc(occ));
      }

      // Seed Inspections
      for (const insp of INITIAL_PERIODIC_INSPECTIONS) {
        const ref = doc(db, 'periodic_inspections', insp.id);
        batch.set(ref, sanitizeDoc(insp));
      }

      // Seed Audit Logs
      for (const log of INITIAL_AUDIT_LOGS) {
        const ref = doc(db, 'audit_logs', log.id);
        batch.set(ref, sanitizeDoc(log));
      }

      // Seed Branding
      const brandingRef = doc(db, 'system_settings', 'branding');
      batch.set(brandingRef, sanitizeDoc(INITIAL_BRANDING));

      await batch.commit();
      console.log('✅ Firestore enterprise seeding completed successfully.');
    }
    isSeeded = true;
  } catch (err) {
    console.warn('Firestore seed check note:', err);
  }
}

// ============================================================================
// 1. Units
// ============================================================================
export async function getUnitsFromFirestore(): Promise<UnitAsset[]> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDocs(collection(db, 'units'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as UnitAsset);
    }
  } catch (err) {
    console.warn('Firestore getUnits error:', err);
  }
  return INITIAL_UNITS;
}

export async function saveUnitToFirestore(unit: UnitAsset): Promise<void> {
  const ref = doc(db, 'units', unit.code);
  await setDoc(ref, sanitizeDoc(unit), { merge: true });
}

export async function bulkSaveUnitsToFirestore(units: UnitAsset[]): Promise<void> {
  const batch = writeBatch(db);
  for (const u of units) {
    const ref = doc(db, 'units', u.code);
    batch.set(ref, sanitizeDoc(u), { merge: true });
  }
  await batch.commit();
}

export async function deleteUnitFromFirestore(code: string): Promise<void> {
  const ref = doc(db, 'units', code);
  await deleteDoc(ref);
}

// ============================================================================
// 2. Users
// ============================================================================
export async function getUsersFromFirestore(): Promise<SystemUser[]> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDocs(collection(db, 'system_users'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as SystemUser);
    }
  } catch (err) {
    console.warn('Firestore getUsers error:', err);
  }
  return INITIAL_USERS;
}

export async function saveUserToFirestore(user: SystemUser): Promise<void> {
  const ref = doc(db, 'system_users', user.id);
  await setDoc(ref, sanitizeDoc(user), { merge: true });
}

export async function deleteUserFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'system_users', id);
  await deleteDoc(ref);
}

// ============================================================================
// 3. Maintenance Requests
// ============================================================================
export async function getMaintenanceFromFirestore(): Promise<MaintenanceRequest[]> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDocs(collection(db, 'maintenance_requests'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as MaintenanceRequest);
    }
  } catch (err) {
    console.warn('Firestore getMaintenance error:', err);
  }
  return INITIAL_MAINTENANCE_REQUESTS;
}

export async function saveMaintenanceToFirestore(req: MaintenanceRequest): Promise<void> {
  const ref = doc(db, 'maintenance_requests', req.id);
  await setDoc(ref, sanitizeDoc(req), { merge: true });
}

export async function bulkSaveMaintenanceToFirestore(requests: MaintenanceRequest[]): Promise<void> {
  const batch = writeBatch(db);
  for (const r of requests) {
    const ref = doc(db, 'maintenance_requests', r.id);
    batch.set(ref, sanitizeDoc(r), { merge: true });
  }
  await batch.commit();
}

export async function deleteMaintenanceFromFirestore(id: string): Promise<void> {
  const ref = doc(db, 'maintenance_requests', id);
  await deleteDoc(ref);
}

// ============================================================================
// 4. Occupancy Records
// ============================================================================
export async function getOccupancyFromFirestore(): Promise<OccupancyRecord[]> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDocs(collection(db, 'occupancy_records'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as OccupancyRecord);
    }
  } catch (err) {
    console.warn('Firestore getOccupancy error:', err);
  }
  return INITIAL_OCCUPANCY_RECORDS;
}

export async function saveOccupancyToFirestore(occ: OccupancyRecord): Promise<void> {
  const ref = doc(db, 'occupancy_records', occ.id);
  await setDoc(ref, sanitizeDoc(occ), { merge: true });
}

export async function bulkSaveOccupancyToFirestore(records: OccupancyRecord[]): Promise<void> {
  const batch = writeBatch(db);
  for (const r of records) {
    const ref = doc(db, 'occupancy_records', r.id);
    batch.set(ref, sanitizeDoc(r), { merge: true });
  }
  await batch.commit();
}

// ============================================================================
// 5. Periodic Inspections
// ============================================================================
export async function getInspectionsFromFirestore(): Promise<PeriodicInspectionSchedule[]> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDocs(collection(db, 'periodic_inspections'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as PeriodicInspectionSchedule);
    }
  } catch (err) {
    console.warn('Firestore getInspections error:', err);
  }
  return INITIAL_PERIODIC_INSPECTIONS;
}

export async function saveInspectionToFirestore(insp: PeriodicInspectionSchedule): Promise<void> {
  const ref = doc(db, 'periodic_inspections', insp.id);
  await setDoc(ref, sanitizeDoc(insp), { merge: true });
}

export async function bulkSaveInspectionsToFirestore(schedules: PeriodicInspectionSchedule[]): Promise<void> {
  const batch = writeBatch(db);
  for (const s of schedules) {
    const ref = doc(db, 'periodic_inspections', s.id);
    batch.set(ref, sanitizeDoc(s), { merge: true });
  }
  await batch.commit();
}

// ============================================================================
// 6. Audit Logs
// ============================================================================
export async function getAuditLogsFromFirestore(): Promise<AuditLogItem[]> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as AuditLogItem);
    }
  } catch (err) {
    console.warn('Firestore getAuditLogs error:', err);
  }
  return INITIAL_AUDIT_LOGS;
}

export async function addAuditLogToFirestore(log: AuditLogItem): Promise<void> {
  const ref = doc(db, 'audit_logs', log.id);
  await setDoc(ref, sanitizeDoc(log));
}

// ============================================================================
// 7. Org Entities
// ============================================================================
export async function getOrgEntitiesFromFirestore(): Promise<OrgEntity[]> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDocs(collection(db, 'org_entities'));
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as OrgEntity);
    }
  } catch (err) {
    console.warn('Firestore getOrgEntities error:', err);
  }
  return INITIAL_ORG_ENTITIES;
}

export async function saveOrgEntitiesToFirestore(entities: OrgEntity[]): Promise<void> {
  const batch = writeBatch(db);
  for (const e of entities) {
    const ref = doc(db, 'org_entities', e.id);
    batch.set(ref, sanitizeDoc(e), { merge: true });
  }
  await batch.commit();
}

// ============================================================================
// 8. System Branding & Reference Data
// ============================================================================
export async function getBrandingFromFirestore(): Promise<SystemBranding> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'branding'));
    if (snap.exists()) {
      return snap.data() as SystemBranding;
    }
  } catch (err) {
    console.warn('Firestore getBranding error:', err);
  }
  return INITIAL_BRANDING;
}

export async function saveBrandingToFirestore(branding: SystemBranding): Promise<void> {
  const ref = doc(db, 'system_settings', 'branding');
  await setDoc(ref, sanitizeDoc(branding), { merge: true });
}

export async function getReferenceDataFromFirestore(): Promise<any> {
  await ensureDatabaseSeeded();
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'reference_data'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Firestore getReferenceData error:', err);
  }
  return null;
}

export async function saveReferenceDataToFirestore(data: any): Promise<void> {
  const ref = doc(db, 'system_settings', 'reference_data');
  await setDoc(ref, sanitizeDoc(data), { merge: true });
}

// ============================================================================
// Real-time Firestore Listeners
// ============================================================================
export function subscribeToFirestoreUnits(callback: (units: UnitAsset[]) => void): () => void {
  return onSnapshot(collection(db, 'units'), (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as UnitAsset);
      callback(list);
    }
  }, (err) => {
    console.warn('Firestore units subscription note:', err);
  });
}

export function subscribeToFirestoreMaintenance(callback: (requests: MaintenanceRequest[]) => void): () => void {
  return onSnapshot(collection(db, 'maintenance_requests'), (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as MaintenanceRequest);
      callback(list);
    }
  }, (err) => {
    console.warn('Firestore maintenance subscription note:', err);
  });
}

export function subscribeToFirestoreOccupancy(callback: (records: OccupancyRecord[]) => void): () => void {
  return onSnapshot(collection(db, 'occupancy_records'), (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as OccupancyRecord);
      callback(list);
    }
  }, (err) => {
    console.warn('Firestore occupancy subscription note:', err);
  });
}

export function subscribeToFirestoreInspections(callback: (schedules: PeriodicInspectionSchedule[]) => void): () => void {
  return onSnapshot(collection(db, 'periodic_inspections'), (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as PeriodicInspectionSchedule);
      callback(list);
    }
  }, (err) => {
    console.warn('Firestore inspections subscription note:', err);
  });
}

export function subscribeToFirestoreUsers(callback: (users: SystemUser[]) => void): () => void {
  return onSnapshot(collection(db, 'system_users'), (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as SystemUser);
      callback(list);
    }
  }, (err) => {
    console.warn('Firestore users subscription note:', err);
  });
}
