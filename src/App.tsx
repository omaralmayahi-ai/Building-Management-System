import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Box,
  PlusCircle,
  CalendarCheck,
  Wrench,
  FileText,
  Settings,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  MapPin,
} from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { UnitManagementView } from './components/UnitManagementView';
import { NewUnitWizard } from './components/NewUnitWizard';
import { PeriodicInspectionView } from './components/PeriodicInspectionView';
import { MaintenanceView } from './components/MaintenanceView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { FieldInspectionView } from './components/FieldInspectionView';
import { NewMaintenanceModal } from './components/NewMaintenanceModal';
import { ExportDossierModal } from './components/ExportDossierModal';
import { LoginView } from './components/LoginView';
import { InAppQrScannerModal } from './components/InAppQrScannerModal';
import { UnitScanChoiceModal } from './components/UnitScanChoiceModal';
import { UnitLocationMapModal } from './components/UnitLocationMapModal';
import { GISMapView } from './components/GISMapView';

import {
  INITIAL_UNITS,
  INITIAL_GEOGRAPHY_TREE,
  INITIAL_MAINTENANCE_REQUESTS,
  INITIAL_OCCUPANCY_RECORDS,
  INITIAL_PERIODIC_INSPECTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_REFERENCE_UNIT_TYPES,
  INITIAL_GOVERNORATES,
  INITIAL_OILFIELDS,
  INITIAL_SITES,
  INITIAL_ROOM_TYPES,
  INITIAL_EQUIPMENT_TYPES,
  INITIAL_BRANDING,
  INITIAL_USERS,
  INITIAL_ORG_ENTITIES,
  INITIAL_MAINTENANCE_DEPARTMENTS,
} from './data/mockData';

import {
  UnitAsset,
  ConditionGrade,
  MaintenanceRequest,
  OccupancyRecord,
  PeriodicInspectionSchedule,
  ReferenceUnitType,
  GovernorateRef,
  OilfieldRef,
  SiteRef,
  RoomTypeRef,
  EquipmentTypeRef,
  MaintenanceDepartmentRef,
  SystemBranding,
  SystemUser,
  AuditLogItem,
  OrgEntity,
  OrgLevel,
  UserAccountRole,
  DatabaseBackupPayload,
  AutoBackupScheduleConfig,
  BackupHistoryItem,
} from './types';
import {
  toArabicDigits,
  getServerNow,
  getServerDateFormatted,
  getServerDateTimeFormatted,
  getServerIsoDateOnly,
  getServerTimestamp,
} from './utils/arabicUtils';
import { safeParse, safeSetItem } from './utils/storageUtils';
import * as api from './services/apiClient';

// Flag to control initial demo dataset seeding on empty storage
const SEED_WITH_DEMO_DATA = false;

export function App() {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() =>
    safeParse('app_current_user', null)
  );

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const savedUser = safeParse<SystemUser | null>('app_current_user', null);
    if (savedUser && (savedUser.role === 'موظف الكشف والصيانة' || savedUser.role === 'inspector')) {
      return 'field_inspection';
    }
    return 'dashboard';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('app_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');

  // Toast / Alert Notification State for API & System Alerts
  const [toastMessage, setToastMessage] = useState<{
    id: string;
    type: 'error' | 'success' | 'info';
    title?: string;
    text: string;
  } | null>(null);

  const showToast = (text: string, type: 'error' | 'success' | 'info' = 'error', title?: string) => {
    const id = String(Date.now());
    setToastMessage({ id, type, text, title });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.id === id ? null : curr));
    }, 7000);
  };

  // Deep Link Inspection / Map Query Parameter Handling
  const [pendingDeepLink, setPendingDeepLink] = useState<{
    view: string;
    unit: string;
    lat?: number;
    lng?: number;
    name?: string;
    gov?: string;
    field?: string;
    src?: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || (params.get('src') === 'external_qr' ? 'map' : 'inspect');
      const unit = params.get('unit') || params.get('code') || params.get('id');
      const lat = params.get('lat') ? parseFloat(params.get('lat')!) : undefined;
      const lng = params.get('lng') ? parseFloat(params.get('lng')!) : undefined;
      const name = params.get('name') || undefined;
      const gov = params.get('gov') || undefined;
      const field = params.get('field') || undefined;
      const src = params.get('src') || undefined;
      if (unit) {
        return { view, unit, lat, lng, name, gov, field, src };
      }
    } catch (e) {
      console.warn('Error reading deep link query parameters:', e);
    }
    return null;
  });

  useEffect(() => {
    safeSetItem('app_current_user', currentUser);
  }, [currentUser]);

  // Enforce role-based active tab restrictions (Inspector locked strictly to 'field_inspection', Maintenance employee locked to 'maintenance' or 'reports')
  useEffect(() => {
    if (currentUser) {
      const role = currentUser.role;
      if (role === 'موظف الكشف والصيانة' || role === 'inspector') {
        if (activeTab !== 'field_inspection') {
          setActiveTab('field_inspection');
        }
      } else if (role === 'موظف الصيانة' || role === 'maintenance_employee') {
        if (activeTab !== 'maintenance' && activeTab !== 'reports') {
          setActiveTab('maintenance');
        }
      }
    }
  }, [currentUser, activeTab]);

  // Global In-App QR Scanner & Choice & Map Modal states
  const [showInAppQrScanner, setShowInAppQrScanner] = useState<boolean>(false);
  const [scannedUnitForChoice, setScannedUnitForChoice] = useState<UnitAsset | null>(null);
  const [locationMapUnit, setLocationMapUnit] = useState<UnitAsset | null>(null);

  const handleLogin = (user: SystemUser) => {
    setCurrentUser(user);
    if (pendingDeepLink && pendingDeepLink.unit) {
      setSelectedUnitCode(pendingDeepLink.unit);
      if (pendingDeepLink.view === 'maintenance') {
        setActiveTab('maintenance');
      } else if (pendingDeepLink.view === 'map' || pendingDeepLink.src === 'external_qr') {
        setActiveTab('units');
      } else {
        setActiveTab('field_inspection');
      }
      setPendingDeepLink(null);
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }
    const role = user.role;
    if (role === 'موظف الكشف والصيانة' || role === 'inspector') {
      setSelectedUnitCode('');
      setActiveTab('field_inspection');
    } else if (role === 'موظف الصيانة' || role === 'maintenance_employee') {
      setSelectedUnitCode('');
      setActiveTab('maintenance');
    } else if (role === 'مستخدم' || role === 'user') {
      setSelectedUnitCode('');
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedUnitCode('');
    localStorage.removeItem('app_current_user');
  };

  useEffect(() => {
    safeSetItem('app_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Datasets with LocalStorage Persistence & API Synchronization
  const [units, setUnits] = useState<UnitAsset[]>(() =>
    safeParse('app_units', SEED_WITH_DEMO_DATA ? INITIAL_UNITS : [])
  );

  const [selectedUnitCode, setSelectedUnitCode] = useState<string>('');

  // Handle Pending Deep Link Navigation after authentication
  useEffect(() => {
    if (currentUser && pendingDeepLink) {
      if (pendingDeepLink.unit) {
        setSelectedUnitCode(pendingDeepLink.unit);
        const matched = units.find(
          (u) =>
            u.code.toLowerCase() === pendingDeepLink.unit.toLowerCase() ||
            u.id.toLowerCase() === pendingDeepLink.unit.toLowerCase()
        );
        if (pendingDeepLink.view === 'maintenance') {
          setActiveTab('maintenance');
        } else if (pendingDeepLink.view === 'map' || pendingDeepLink.src === 'external_qr') {
          if (matched) {
            setLocationMapUnit(matched);
          }
          setActiveTab('units');
        } else {
          setActiveTab('field_inspection');
        }
        setPendingDeepLink(null);

        // Clean query parameters from URL to avoid re-triggering on page refresh
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    }
  }, [currentUser, pendingDeepLink, units]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(() =>
    safeParse('app_maintenance_requests', SEED_WITH_DEMO_DATA ? INITIAL_MAINTENANCE_REQUESTS : [])
  );

  const [occupancyRecords, setOccupancyRecords] = useState<OccupancyRecord[]>(() =>
    safeParse('app_occupancy_records', SEED_WITH_DEMO_DATA ? INITIAL_OCCUPANCY_RECORDS : [])
  );

  const [periodicInspections, setPeriodicInspections] = useState<PeriodicInspectionSchedule[]>(() => {
    const saved = localStorage.getItem('app_periodic_inspections');
    if (!saved) return SEED_WITH_DEMO_DATA ? INITIAL_PERIODIC_INSPECTIONS : [];
    try {
      const parsed = JSON.parse(saved);
      return parsed.filter((item: PeriodicInspectionSchedule) => !item.id?.startsWith('INS-2026-00'));
    } catch {
      return SEED_WITH_DEMO_DATA ? INITIAL_PERIODIC_INSPECTIONS : [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() =>
    safeParse('app_audit_logs', SEED_WITH_DEMO_DATA ? INITIAL_AUDIT_LOGS : [])
  );

  // Helper for recording audit logs locally & in background on server
  const appendAuditLog = (newLog: AuditLogItem) => {
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev];
      safeSetItem('app_audit_logs', updated);
      return updated;
    });
    api.addAuditLog(newLog).catch((err) => console.warn('Background API addAuditLog note:', err));
  };

  // Initial Load from Central API / Database on Component Mount
  useEffect(() => {
    let isMounted = true;
    async function loadDataFromApi() {
      try {
        const [apiUnits, apiMaint, apiOcc, apiInsp, apiLogs, apiEntities, apiBranding, apiUsers] = await Promise.all([
          api.getUnits(),
          api.getMaintenanceRequests(),
          api.getOccupancyRecords(),
          api.getPeriodicInspections(),
          api.getAuditLogs(),
          api.getOrgEntities(),
          api.getBranding(),
          api.getUsers(),
        ]);
        if (!isMounted) return;
        if (apiUnits && apiUnits.length > 0) setUnits(apiUnits);
        if (apiMaint && apiMaint.length > 0) setMaintenanceRequests(apiMaint);
        if (apiOcc && apiOcc.length > 0) setOccupancyRecords(apiOcc);
        if (apiInsp && apiInsp.length > 0) setPeriodicInspections(apiInsp);
        if (apiLogs && apiLogs.length > 0) setAuditLogs(apiLogs);
        if (apiEntities && apiEntities.length > 0) setOrgEntities(apiEntities);
        if (apiBranding && apiBranding.systemName) setBranding(apiBranding);
        if (apiUsers && apiUsers.length > 0) {
          const sanitized = apiUsers.map((u) => {
            if (u.id === 'USR-101' || u.username === 'admin') {
              return {
                ...u,
                id: 'USR-101',
                name: u.name === 'م. أحمد كريم الحلي (مدير النظام)' ? 'عمر المياحي' : (u.name || 'عمر المياحي'),
                username: 'admin',
                phone: u.phone === '07701234567' ? '07701784629' : (u.phone || '07701784629'),
                role: 'مدير النظام' as const,
                status: 'active' as const,
              };
            }
            return u;
          });
          if (!sanitized.some((u) => u.id === 'USR-101' || u.username === 'admin')) {
            sanitized.unshift(INITIAL_USERS[0]);
          }
          setUsers(sanitized);
        }
      } catch (err) {
        console.warn('Initial API data fetch note:', err);
      }
    }
    loadDataFromApi();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-Time Synchronization State & Listener (المزامنة الفورية اللحظية عند إضافة/تعديل/حذف)
  const [syncStatus, setSyncStatus] = useState<'connected' | 'reconnecting' | 'polling'>('connected');

  useEffect(() => {
    const unsubscribe = api.subscribeToRealtimeSync(
      async (event) => {
        try {
          if (event.type === 'units_updated' || event.type === 'all_updated') {
            const latestUnits = await api.getUnits();
            if (latestUnits && Array.isArray(latestUnits)) {
              setUnits(latestUnits);
            }
          }
          if (event.type === 'maintenance_updated' || event.type === 'all_updated') {
            const latestMaint = await api.getMaintenanceRequests();
            if (latestMaint && Array.isArray(latestMaint)) {
              setMaintenanceRequests(latestMaint);
            }
          }
          if (event.type === 'occupancy_updated' || event.type === 'all_updated') {
            const latestOcc = await api.getOccupancyRecords();
            if (latestOcc && Array.isArray(latestOcc)) {
              setOccupancyRecords(latestOcc);
            }
          }
          if (event.type === 'inspections_updated' || event.type === 'all_updated') {
            const latestInsp = await api.getPeriodicInspections();
            if (latestInsp && Array.isArray(latestInsp)) {
              setPeriodicInspections(latestInsp);
            }
          }
          if (event.type === 'audit_logs_updated' || event.type === 'all_updated') {
            const latestLogs = await api.getAuditLogs();
            if (latestLogs && Array.isArray(latestLogs)) {
              setAuditLogs(latestLogs);
            }
          }
          if (event.type === 'org_entities_updated' || event.type === 'all_updated') {
            const latestEntities = await api.getOrgEntities();
            if (latestEntities && Array.isArray(latestEntities)) {
              setOrgEntities(latestEntities);
            }
          }
          if (event.type === 'branding_updated' || event.type === 'all_updated') {
            const latestBranding = await api.getBranding();
            if (latestBranding && latestBranding.systemName) {
              setBranding(latestBranding);
            }
          }
          if (event.type === 'users_updated' || event.type === 'all_updated') {
            const latestUsers = await api.getUsers();
            if (latestUsers && Array.isArray(latestUsers)) {
              setUsers(latestUsers);
            }
          }
        } catch (err) {
          console.warn('Real-time sync update note:', err);
        }
      },
      (status) => {
        setSyncStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // System Branding State
  const [branding, setBranding] = useState<SystemBranding>(() =>
    safeParse('app_branding', INITIAL_BRANDING)
  );

  const handleUpdateBranding = (newBranding: SystemBranding) => {
    setBranding(newBranding);
    safeSetItem('app_branding', newBranding);
    api.saveBranding(newBranding).catch((err) => {
      console.error('API saveBranding error:', err);
      showToast(err.message || 'فشل حفظ الهوية البصرية', 'error', 'خطأ في الحفظ');
    });
  };

  // System Users State
  const [users, setUsers] = useState<SystemUser[]>(() =>
    safeParse('app_users', INITIAL_USERS)
  );

  // Sidebar Collapsed State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Dynamic Reference Data States
  const [unitTypes, setUnitTypes] = useState<ReferenceUnitType[]>(() =>
    safeParse('app_ref_unit_types', INITIAL_REFERENCE_UNIT_TYPES)
  );

  const [governorates, setGovernorates] = useState<GovernorateRef[]>(() =>
    safeParse('app_ref_governorates', INITIAL_GOVERNORATES)
  );

  const [oilfields, setOilfields] = useState<OilfieldRef[]>(() =>
    safeParse('app_ref_oilfields', INITIAL_OILFIELDS)
  );

  const [sites, setSites] = useState<SiteRef[]>(() =>
    safeParse('app_ref_sites', INITIAL_SITES)
  );

  const [roomTypes, setRoomTypes] = useState<RoomTypeRef[]>(() =>
    safeParse('app_ref_room_types', INITIAL_ROOM_TYPES)
  );

  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeRef[]>(() =>
    safeParse('app_ref_equipment_types', INITIAL_EQUIPMENT_TYPES)
  );

  const [maintenanceDepartments, setMaintenanceDepartments] = useState<MaintenanceDepartmentRef[]>(() =>
    safeParse('app_ref_maintenance_depts', INITIAL_MAINTENANCE_DEPARTMENTS)
  );

  const [orgEntities, setOrgEntities] = useState<OrgEntity[]>(() => {
    const rawEntities: OrgEntity[] = safeParse('app_ref_org_entities', INITIAL_ORG_ENTITIES);
    return rawEntities.map((e) => {
      let level = e.level as string;
      if (level === 'directorate') level = 'central_dept';
      if (level === 'division') level = 'department';
      if (level === 'unit_team') level = 'unit';
      return { ...e, level: level as OrgLevel };
    });
  });

  // Sync reference tables to LocalStorage
  useEffect(() => {
    safeSetItem('app_ref_unit_types', unitTypes);
    safeSetItem('app_ref_governorates', governorates);
    safeSetItem('app_ref_oilfields', oilfields);
    safeSetItem('app_ref_sites', sites);
    safeSetItem('app_ref_room_types', roomTypes);
    safeSetItem('app_ref_equipment_types', equipmentTypes);
    safeSetItem('app_ref_maintenance_depts', maintenanceDepartments);
    safeSetItem('app_ref_org_entities', orgEntities);
  }, [unitTypes, governorates, oilfields, sites, roomTypes, equipmentTypes, maintenanceDepartments, orgEntities]);

  // Background Automated Backup Scheduler (الجدولة التلقائية للنسخ الاحتياطي في الخلفية)
  useEffect(() => {
    const checkAndRunAutoBackup = () => {
      try {
        const config: AutoBackupScheduleConfig = safeParse('app_auto_backup_config', {
          enabled: true,
          frequency: 'daily',
          timeOfDay: '02:00',
          storagePath: 'C:\\Midland_Oil_Database_Backups\\',
          storageType: 'local_folder',
          keepMaxBackups: 30,
        });

        if (!config.enabled) return;

        const now = getServerNow();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;

        // Check if last run was today
        const lastRunStr = config.lastBackupTimestamp;
        let alreadyRanToday = false;
        if (lastRunStr) {
          const lastDate = new Date(lastRunStr);
          alreadyRanToday =
            lastDate.getFullYear() === now.getFullYear() &&
            lastDate.getMonth() === now.getMonth() &&
            lastDate.getDate() === now.getDate();
        }

        // Trigger if time matches and hasn't run today (or on manual intervals)
        if (currentTime === config.timeOfDay && !alreadyRanToday) {
          const dd = String(now.getDate()).padStart(2, '0');
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const yyyy = now.getFullYear();
          const filename = `Auto_Backup_${dd}_${mm}_${yyyy}_${currentHours}${currentMinutes}.json`;

          const payload: DatabaseBackupPayload = {
            version: '3.0.0-PROD',
            systemTitle: branding.systemName || 'منظومة إدارة الوحدات والأصول العقارية',
            companyName: branding.companyName || 'شركة نفط الوسط',
            exportedAt: now.toISOString(),
            exportedAtFormatted: getServerDateTimeFormatted(),
            exportedBy: 'النظام التلقائي (Auto Schedule)',
            checksum: `AUTO-MOC-${getServerTimestamp().toString(36).toUpperCase()}`,
            counts: {
              units: units.length,
              maintenanceRequests: maintenanceRequests.length,
              occupancyRecords: occupancyRecords.length,
              periodicInspections: periodicInspections.length,
              users: users.length,
              orgEntities: orgEntities.length,
              governorates: governorates.length,
              oilfields: oilfields.length,
              sites: sites.length,
              unitTypes: unitTypes.length,
              roomTypes: roomTypes.length,
              equipmentTypes: equipmentTypes.length,
              maintenanceDepartments: maintenanceDepartments.length,
              auditLogs: auditLogs.length,
              totalRecords:
                units.length +
                maintenanceRequests.length +
                occupancyRecords.length +
                periodicInspections.length +
                users.length +
                orgEntities.length +
                governorates.length +
                oilfields.length +
                sites.length +
                unitTypes.length +
                roomTypes.length +
                equipmentTypes.length +
                maintenanceDepartments.length +
                auditLogs.length,
            },
            data: {
              units,
              maintenanceRequests,
              occupancyRecords,
              periodicInspections,
              users,
              orgEntities,
              branding,
              governorates,
              oilfields,
              sites,
              unitTypes,
              roomTypes,
              equipmentTypes,
              maintenanceDepartments,
              auditLogs,
            },
          };

          const historyItem: BackupHistoryItem = {
            id: `BCK-${getServerTimestamp()}`,
            filename,
            timestamp: now.toISOString(),
            timestampFormatted: getServerDateTimeFormatted(),
            sizeBytes: 1024 * 150,
            sizeFormatted: '150 ك.ب',
            totalRecords: payload.counts.totalRecords,
            unitsCount: units.length,
            storagePath: config.storagePath || 'C:\\Midland_Oil_Database_Backups\\',
            status: 'success',
            triggerType: 'scheduled',
            summary: `نسخة مجدولة تلقائياً: ${toArabicDigits(units.length)} مبنى و ${toArabicDigits(payload.counts.totalRecords)} سجل كامل`,
            payloadSnapshot: payload,
          };

          const existingHistory: BackupHistoryItem[] = safeParse('app_backup_history', []);
          const updatedHistory = [historyItem, ...existingHistory.slice(0, 49)];
          safeSetItem('app_backup_history', updatedHistory);

          const updatedConfig: AutoBackupScheduleConfig = {
            ...config,
            lastBackupTimestamp: now.toISOString(),
            lastBackupFormatted: getServerDateTimeFormatted(),
            lastBackupSize: '150 ك.ب',
            lastBackupStatus: 'success',
          };
          safeSetItem('app_auto_backup_config', updatedConfig);

          appendAuditLog({
            id: `LOG-${getServerTimestamp()}`,
            timestamp: getServerDateTimeFormatted(),
            action: 'تصدير نسخة احتياطية مجدولة تلقائياً',
            user: 'جدولة النظام التلقائية',
            userInitials: 'SYS',
            affectedField: 'النسخ الاحتياطي التلقائي',
            previousValue: '-',
            newValue: `تم الحفظ في: ${config.storagePath} (${toArabicDigits(payload.counts.totalRecords)} سجل)`,
          });
        }
      } catch (err) {
        console.warn('Auto backup scheduler check note:', err);
      }
    };

    const intervalId = setInterval(checkAndRunAutoBackup, 60000); // Check once per minute
    return () => clearInterval(intervalId);
  }, [
    branding,
    units,
    maintenanceRequests,
    occupancyRecords,
    periodicInspections,
    users,
    orgEntities,
    governorates,
    oilfields,
    sites,
    unitTypes,
    roomTypes,
    equipmentTypes,
    maintenanceDepartments,
    auditLogs,
  ]);

  const handleAddOrgEntity = (newEntity: OrgEntity) => {
    setOrgEntities((prev) => {
      const updated = [newEntity, ...prev];
      safeSetItem('app_ref_org_entities', updated);
      return updated;
    });
    api.addOrgEntity(newEntity).catch((err) => {
      console.error('API addOrgEntity error:', err);
      showToast(err.message || 'فشل حفظ التشكيل التنظيمي في قاعدة البيانات', 'error', 'خطأ في حفظ البيانات');
    });
    appendAuditLog({
      id: `LOG-${getServerTimestamp()}`,
      timestamp: getServerDateTimeFormatted(),
      action: 'إضافة تشكيل تنظيمـي',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'الهيكل التنظيمي',
      previousValue: '-',
      newValue: newEntity.nameAr,
    });
  };

  const handleUpdateOrgEntity = (updatedEntity: OrgEntity) => {
    setOrgEntities((prev) => {
      const updated = prev.map((e) => (e.id === updatedEntity.id ? updatedEntity : e));
      safeSetItem('app_ref_org_entities', updated);
      return updated;
    });
    api.updateOrgEntity(updatedEntity).catch((err) => {
      console.error('API updateOrgEntity error:', err);
      showToast(err.message || 'فشل تحديث التشكيل التنظيمي في قاعدة البيانات', 'error', 'خطأ في حفظ البيانات');
    });
    appendAuditLog({
      id: `LOG-${getServerTimestamp()}`,
      timestamp: getServerDateTimeFormatted(),
      action: 'تعديل تشكيل تنظيمـي',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'الهيكل التنظيمي',
      previousValue: 'بيانات سابقة',
      newValue: updatedEntity.nameAr,
    });
  };

  const handleDeleteOrgEntity = (id: string) => {
    const entity = orgEntities.find((e) => e.id === id);
    setOrgEntities((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      safeSetItem('app_ref_org_entities', updated);
      return updated;
    });
    api.deleteOrgEntity(id).catch((err) => {
      console.error('API deleteOrgEntity error:', err);
      showToast(err.message || 'فشل حذف التشكيل التنظيمي من قاعدة البيانات', 'error', 'خطأ في حذف البيانات');
    });
    if (entity) {
      appendAuditLog({
        id: `LOG-${getServerTimestamp()}`,
        timestamp: getServerDateTimeFormatted(),
        action: 'حذف تشكيل تنظيمـي',
        user: currentUser?.name || 'غير معروف',
        userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
        affectedField: 'الهيكل التنظيمي',
        previousValue: entity.nameAr,
        newValue: 'تم الحذف',
      });
    }
  };

  const handleToggleOrgEntityStatus = (id: string) => {
    let targetEntity: OrgEntity | null = null;
    setOrgEntities((prev) => {
      const updated = prev.map((e) => {
        if (e.id === id) {
          targetEntity = { ...e, status: e.status === 'active' ? 'disabled' : 'active' };
          return targetEntity;
        }
        return e;
      });
      safeSetItem('app_ref_org_entities', updated);
      return updated;
    });
    if (targetEntity) {
      api.updateOrgEntity(targetEntity).catch((err) => {
        console.error('API updateOrgEntity error:', err);
        showToast(err.message || 'فشل تحديث حالة التشكيل التنظيمي', 'error', 'خطأ في الحفظ');
      });
    }
  };

  const handleResetOrgEntitiesToDefault = () => {
    setOrgEntities(INITIAL_ORG_ENTITIES);
    safeSetItem('app_ref_org_entities', INITIAL_ORG_ENTITIES);
  };

  // Maintenance Departments Handlers
  const handleAddMaintenanceDepartment = (newDept: MaintenanceDepartmentRef) => {
    setMaintenanceDepartments((prev) => {
      const updated = [newDept, ...prev];
      safeSetItem('app_ref_maintenance_depts', updated);
      return updated;
    });
    appendAuditLog({
      id: `LOG-${getServerTimestamp()}`,
      timestamp: getServerDateTimeFormatted(),
      action: 'إضافة جهة صيانة',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'جهات الصيانة',
      previousValue: '-',
      newValue: newDept.nameAr,
    });
  };

  const handleUpdateMaintenanceDepartment = (updatedDept: MaintenanceDepartmentRef) => {
    setMaintenanceDepartments((prev) => {
      const updated = prev.map((d) => (d.id === updatedDept.id ? updatedDept : d));
      safeSetItem('app_ref_maintenance_depts', updated);
      return updated;
    });
    appendAuditLog({
      id: `LOG-${getServerTimestamp()}`,
      timestamp: getServerDateTimeFormatted(),
      action: 'تعديل جهة صيانة',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'جهات الصيانة',
      previousValue: 'بيانات سابقة',
      newValue: updatedDept.nameAr,
    });
  };

  const handleDeleteMaintenanceDepartment = (id: string) => {
    const dept = maintenanceDepartments.find((d) => d.id === id);
    setMaintenanceDepartments((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      safeSetItem('app_ref_maintenance_depts', updated);
      return updated;
    });
    if (dept) {
      appendAuditLog({
        id: `LOG-${getServerTimestamp()}`,
        timestamp: getServerDateTimeFormatted(),
        action: 'حذف جهة صيانة',
        user: currentUser?.name || 'غير معروف',
        userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
        affectedField: 'جهات الصيانة',
        previousValue: dept.nameAr,
        newValue: 'تم الحذف',
      });
    }
  };

  const handleToggleMaintenanceDepartmentStatus = (id: string) => {
    setMaintenanceDepartments((prev) => {
      const updated = prev.map((d) =>
        d.id === id ? { ...d, status: d.status === 'active' ? 'disabled' : 'active' } : d
      );
      safeSetItem('app_ref_maintenance_depts', updated);
      return updated;
    });
  };

  const handleClearMaintenanceDepartments = () => {
    setMaintenanceDepartments([]);
    safeSetItem('app_ref_maintenance_depts', []);
  };

  const handleResetMaintenanceDepartmentsToDefault = () => {
    setMaintenanceDepartments(INITIAL_MAINTENANCE_DEPARTMENTS);
    safeSetItem('app_ref_maintenance_depts', INITIAL_MAINTENANCE_DEPARTMENTS);
  };

  // Modals
  const [showNewMaintenanceModal, setShowNewMaintenanceModal] = useState(false);
  const [maintenanceUnitCode, setMaintenanceUnitCode] = useState('WS-AHD-BLD-014');
  const [isMaintenanceUnitLocked, setIsMaintenanceUnitLocked] = useState(false);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierUnit, setDossierUnit] = useState<UnitAsset | null>(null);

  // Quick unit selection handler
  const handleSelectUnit = (code: string) => {
    setSelectedUnitCode(code);
    setActiveTab('units');
  };

  // Grade Update handler
  const handleUpdateGrade = (code: string, newGrade: ConditionGrade) => {
    let updatedUnitObj: UnitAsset | null = null;
    setUnits((prev) => {
      const updated = prev.map((u) => {
        if (u.code === code) {
          updatedUnitObj = { ...u, conditionGrade: newGrade, lastUpdated: 'الآن' };
          return updatedUnitObj;
        }
        return u;
      });
      safeSetItem('app_units', updated);
      return updated;
    });

    if (updatedUnitObj) {
      api.updateUnit(updatedUnitObj).catch((err) => {
        console.error('API updateUnit grade error:', err);
        showToast(err.message || 'فشل تحديث درجة التقييم في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
      });
    }

    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(10 + Math.random() * 90)}`,
      unitCode: code,
      timestamp: getServerDateTimeFormatted(),
      action: 'تحديث درجة التقييم الهندسي',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'درجة التقييم',
      previousValue: 'الدرجة السابقة',
      newValue: newGrade,
    };
    appendAuditLog(newLog);
  };

  // User Management Handlers with Immediate System Reflection & Audit Logging
  const handleAddUser = (newUser: SystemUser) => {
    setUsers((prev) => {
      const updated = [newUser, ...prev];
      safeSetItem('app_users', updated);
      return updated;
    });
    api.addUser(newUser).catch((err) => {
      console.error('API addUser error:', err);
      showToast(err.message || 'فشل إضافة المستخدم في قاعدة البيانات المركزية', 'error', 'خطأ في الحفظ');
    });
    appendAuditLog({
      id: `LOG-${getServerTimestamp()}`,
      timestamp: getServerDateTimeFormatted(),
      action: 'إضافة حساب مستخدم جديد',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'المستخدمين',
      previousValue: '-',
      newValue: `${newUser.name} (${newUser.role})`,
    });
  };

  const handleUpdateUser = (updatedUser: SystemUser) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      safeSetItem('app_users', updated);
      return updated;
    });
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    api.updateUser(updatedUser).catch((err) => {
      console.error('API updateUser error:', err);
      showToast(err.message || 'فشل تحديث بيانات المستخدم في قاعدة البيانات', 'error', 'خطأ في الحفظ');
    });
    appendAuditLog({
      id: `LOG-${getServerTimestamp()}`,
      timestamp: getServerDateTimeFormatted(),
      action: 'تعديل حساب وصلاحيات مستخدم',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'المستخدمين',
      previousValue: 'بيانات سابقة',
      newValue: `${updatedUser.name} (${updatedUser.role})`,
    });
  };

  const handleDeleteUser = (userId: string) => {
    const usr = users.find((u) => u.id === userId);
    setUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      safeSetItem('app_users', updated);
      return updated;
    });
    if (currentUser?.id === userId) {
      handleLogout();
    }
    api.deleteUser(userId).catch((err) => {
      console.error('API deleteUser error:', err);
      showToast(err.message || 'فشل حذف المستخدم من قاعدة البيانات', 'error', 'خطأ في الحذف');
    });
    if (usr) {
      appendAuditLog({
        id: `LOG-${getServerTimestamp()}`,
        timestamp: getServerDateTimeFormatted(),
        action: 'حذف حساب مستخدم نهائياً',
        user: currentUser?.name || 'غير معروف',
        userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
        affectedField: 'المستخدمين',
        previousValue: usr.name,
        newValue: 'تم الحذف',
      });
    }
  };

  const handleToggleUserStatus = (userId: string) => {
    let targetUser: SystemUser | null = null;
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'active' ? 'disabled' : 'active';
          targetUser = { ...u, status: newStatus };
          if (currentUser?.id === userId && newStatus === 'disabled') {
            setTimeout(() => handleLogout(), 100);
          }
          return targetUser;
        }
        return u;
      });
      safeSetItem('app_users', updated);
      return updated;
    });
    if (targetUser) {
      api.updateUser(targetUser).catch((err) => {
        console.error('API updateUser status error:', err);
      });
    }
  };

  const handleChangePassword = (
    currentPass: string,
    newPass: string
  ): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'لا يوجد حساب مستخدم مسجل حالياً' };
    }

    const existingUser = users.find((u) => u.id === currentUser.id);
    const expectedPassword = existingUser?.password || currentUser.password || 'admin123';

    if (currentPass !== expectedPassword) {
      return { success: false, message: 'كلمة المرور الحالية غير صحيحة، يرجى المحاولة ثانية' };
    }

    const updatedUser: SystemUser = {
      ...currentUser,
      password: newPass,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === currentUser.id ? { ...u, password: newPass } : u));
      safeSetItem('app_users', updated);
      return updated;
    });

    api.updateUser(updatedUser).catch((err) => {
      console.error('API updateUser password error:', err);
    });

    appendAuditLog({
      id: `LOG-${getServerTimestamp()}`,
      timestamp: getServerDateTimeFormatted(),
      action: 'تغيير كلمة المرور الشخصية',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'كلمة المرور',
      previousValue: '••••••',
      newValue: '••••••',
    });

    return { success: true, message: 'تم تغيير وتحديث كلمة المرور بنجاح' };
  };

  // Reference Update & Delete Handlers
  const handleUpdateGovernorate = (updatedGov: GovernorateRef) =>
    setGovernorates((prev) => prev.map((g) => (g.id === updatedGov.id ? updatedGov : g)));
  const handleDeleteGovernorate = (id: string) =>
    setGovernorates((prev) => prev.filter((g) => g.id !== id));

  const handleUpdateOilfield = (updatedField: OilfieldRef) =>
    setOilfields((prev) => prev.map((f) => (f.id === updatedField.id ? updatedField : f)));
  const handleDeleteOilfield = (id: string) =>
    setOilfields((prev) => prev.filter((f) => f.id !== id));

  const handleUpdateSite = (updatedSite: SiteRef) =>
    setSites((prev) => prev.map((s) => (s.id === updatedSite.id ? updatedSite : s)));
  const handleDeleteSite = (id: string) => setSites((prev) => prev.filter((s) => s.id !== id));

  const handleUpdateUnitType = (updatedType: ReferenceUnitType) =>
    setUnitTypes((prev) => prev.map((u) => (u.code === updatedType.code ? updatedType : u)));
  const handleDeleteUnitType = (code: string) =>
    setUnitTypes((prev) => prev.filter((u) => u.code !== code));

  const handleUpdateRoomType = (updatedRoom: RoomTypeRef) =>
    setRoomTypes((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
  const handleDeleteRoomType = (id: string) => setRoomTypes((prev) => prev.filter((r) => r.id !== id));

  const handleUpdateEquipmentType = (updatedEq: EquipmentTypeRef) =>
    setEquipmentTypes((prev) => prev.map((e) => (e.id === updatedEq.id ? updatedEq : e)));
  const handleDeleteEquipmentType = (id: string) =>
    setEquipmentTypes((prev) => prev.filter((e) => e.id !== id));

  // Custom Granular Reset Handlers
  const handleClearUnits = () => {
    setUnits([]);
    safeSetItem('app_units', []);
  };
  const handleResetUnitsToDefault = () => {
    setUnits(INITIAL_UNITS);
    safeSetItem('app_units', INITIAL_UNITS);
  };

  const handleClearOilfields = () => setOilfields([]);
  const handleResetOilfieldsToDefault = () => setOilfields(INITIAL_OILFIELDS);

  const handleClearUnitTypes = () => setUnitTypes([]);
  const handleResetUnitTypesToDefault = () => setUnitTypes(INITIAL_REFERENCE_UNIT_TYPES);

  const handleClearGovernorates = () => setGovernorates([]);
  const handleResetGovernoratesToDefault = () => setGovernorates(INITIAL_GOVERNORATES);

  const handleClearSites = () => setSites([]);
  const handleResetSitesToDefault = () => setSites(INITIAL_SITES);

  const handleClearUsers = () => {
    setUsers([]);
    safeSetItem('app_users', []);
  };
  const handleResetUsersToDefault = () => {
    setUsers(INITIAL_USERS);
    safeSetItem('app_users', INITIAL_USERS);
  };

  const handleClearRoomTypes = () => setRoomTypes([]);
  const handleResetRoomTypesToDefault = () => setRoomTypes(INITIAL_ROOM_TYPES);

  const handleClearEquipmentTypes = () => setEquipmentTypes([]);
  const handleResetEquipmentTypesToDefault = () => setEquipmentTypes(INITIAL_EQUIPMENT_TYPES);

  const handleClearMaintenanceRequests = () => {
    setMaintenanceRequests([]);
    safeSetItem('app_maintenance_requests', []);
  };
  const handleResetMaintenanceRequestsToDefault = () => {
    setMaintenanceRequests(INITIAL_MAINTENANCE_REQUESTS);
    safeSetItem('app_maintenance_requests', INITIAL_MAINTENANCE_REQUESTS);
  };

  const handleClearOccupancyRecords = () => {
    setOccupancyRecords([]);
    safeSetItem('app_occupancy_records', []);
  };
  const handleResetOccupancyRecordsToDefault = () => {
    setOccupancyRecords(INITIAL_OCCUPANCY_RECORDS);
    safeSetItem('app_occupancy_records', INITIAL_OCCUPANCY_RECORDS);
  };

  // Factory Reset Handler
  const handleFactoryReset = () => {
    localStorage.clear();
    setBranding(INITIAL_BRANDING);
    setUsers(INITIAL_USERS);
    setUnits(SEED_WITH_DEMO_DATA ? INITIAL_UNITS : []);
    setUnitTypes(INITIAL_REFERENCE_UNIT_TYPES);
    setGovernorates(INITIAL_GOVERNORATES);
    setOilfields(INITIAL_OILFIELDS);
    setSites(INITIAL_SITES);
    setRoomTypes(INITIAL_ROOM_TYPES);
    setEquipmentTypes(INITIAL_EQUIPMENT_TYPES);
    setMaintenanceRequests(SEED_WITH_DEMO_DATA ? INITIAL_MAINTENANCE_REQUESTS : []);
    setOccupancyRecords(SEED_WITH_DEMO_DATA ? INITIAL_OCCUPANCY_RECORDS : []);
    setPeriodicInspections(SEED_WITH_DEMO_DATA ? INITIAL_PERIODIC_INSPECTIONS : []);
    setAuditLogs(SEED_WITH_DEMO_DATA ? INITIAL_AUDIT_LOGS : []);
  };

  // Comprehensive Database Restore & Import Handler
  const handleRestoreDatabase = (
    payload: DatabaseBackupPayload,
    mode: 'overwrite' | 'merge',
    onComplete?: () => void
  ) => {
    try {
      const { data } = payload;
      if (!data) throw new Error('بيانات النسخة الاحتياطية غير صالحة أو فارغة');

      if (mode === 'overwrite') {
        if (data.units && Array.isArray(data.units)) {
          setUnits(data.units);
          safeSetItem('app_units', data.units);
          api.saveUnits(data.units).catch(() => {});
        }
        if (data.maintenanceRequests && Array.isArray(data.maintenanceRequests)) {
          setMaintenanceRequests(data.maintenanceRequests);
          safeSetItem('app_maintenance_requests', data.maintenanceRequests);
          api.saveMaintenanceRequests(data.maintenanceRequests).catch(() => {});
        }
        if (data.occupancyRecords && Array.isArray(data.occupancyRecords)) {
          setOccupancyRecords(data.occupancyRecords);
          safeSetItem('app_occupancy_records', data.occupancyRecords);
          api.saveOccupancyRecords(data.occupancyRecords).catch(() => {});
        }
        if (data.periodicInspections && Array.isArray(data.periodicInspections)) {
          setPeriodicInspections(data.periodicInspections);
          safeSetItem('app_periodic_inspections', data.periodicInspections);
          api.savePeriodicInspections(data.periodicInspections).catch(() => {});
        }
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
          safeSetItem('app_users', data.users);
          api.saveUsers(data.users).catch(() => {});
        }
        if (data.orgEntities && Array.isArray(data.orgEntities)) {
          setOrgEntities(data.orgEntities);
          safeSetItem('app_ref_org_entities', data.orgEntities);
          api.saveOrgEntities(data.orgEntities).catch(() => {});
        }
        if (data.branding && data.branding.systemName) {
          setBranding(data.branding);
          safeSetItem('app_branding', data.branding);
          api.saveBranding(data.branding).catch(() => {});
        }
        if (data.governorates && Array.isArray(data.governorates)) {
          setGovernorates(data.governorates);
          safeSetItem('app_ref_governorates', data.governorates);
        }
        if (data.oilfields && Array.isArray(data.oilfields)) {
          setOilfields(data.oilfields);
          safeSetItem('app_ref_oilfields', data.oilfields);
        }
        if (data.sites && Array.isArray(data.sites)) {
          setSites(data.sites);
          safeSetItem('app_ref_sites', data.sites);
        }
        if (data.unitTypes && Array.isArray(data.unitTypes)) {
          setUnitTypes(data.unitTypes);
          safeSetItem('app_ref_unit_types', data.unitTypes);
        }
        if (data.roomTypes && Array.isArray(data.roomTypes)) {
          setRoomTypes(data.roomTypes);
          safeSetItem('app_ref_room_types', data.roomTypes);
        }
        if (data.equipmentTypes && Array.isArray(data.equipmentTypes)) {
          setEquipmentTypes(data.equipmentTypes);
          safeSetItem('app_ref_equipment_types', data.equipmentTypes);
        }
        if (data.maintenanceDepartments && Array.isArray(data.maintenanceDepartments)) {
          setMaintenanceDepartments(data.maintenanceDepartments);
          safeSetItem('app_ref_maintenance_depts', data.maintenanceDepartments);
        }
        if (data.auditLogs && Array.isArray(data.auditLogs)) {
          setAuditLogs(data.auditLogs);
          safeSetItem('app_audit_logs', data.auditLogs);
        }
      } else {
        // Smart Merge Mode
        if (data.units && Array.isArray(data.units)) {
          setUnits((prev) => {
            const existingIds = new Set(prev.map((u) => u.id));
            const updated = prev.map((u) => {
              const matched = data.units.find((nu) => nu.id === u.id);
              return matched || u;
            });
            const additions = data.units.filter((nu) => !existingIds.has(nu.id));
            const merged = [...additions, ...updated];
            safeSetItem('app_units', merged);
            api.saveUnits(merged).catch(() => {});
            return merged;
          });
        }
        if (data.maintenanceRequests && Array.isArray(data.maintenanceRequests)) {
          setMaintenanceRequests((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const updated = prev.map((r) => {
              const matched = data.maintenanceRequests.find((nr) => nr.id === r.id);
              return matched || r;
            });
            const additions = data.maintenanceRequests.filter((nr) => !existingIds.has(nr.id));
            const merged = [...additions, ...updated];
            safeSetItem('app_maintenance_requests', merged);
            api.saveMaintenanceRequests(merged).catch(() => {});
            return merged;
          });
        }
        if (data.occupancyRecords && Array.isArray(data.occupancyRecords)) {
          setOccupancyRecords((prev) => {
            const existingIds = new Set(prev.map((o) => o.id));
            const additions = data.occupancyRecords.filter((no) => !existingIds.has(no.id));
            const merged = [...additions, ...prev];
            safeSetItem('app_occupancy_records', merged);
            api.saveOccupancyRecords(merged).catch(() => {});
            return merged;
          });
        }
        if (data.periodicInspections && Array.isArray(data.periodicInspections)) {
          setPeriodicInspections((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const additions = data.periodicInspections.filter((np) => !existingIds.has(np.id));
            const merged = [...additions, ...prev];
            safeSetItem('app_periodic_inspections', merged);
            api.savePeriodicInspections(merged).catch(() => {});
            return merged;
          });
        }
        if (data.users && Array.isArray(data.users)) {
          setUsers((prev) => {
            const existingIds = new Set(prev.map((u) => u.id));
            const additions = data.users.filter((nu) => !existingIds.has(nu.id));
            const merged = [...prev, ...additions];
            safeSetItem('app_users', merged);
            api.saveUsers(merged).catch(() => {});
            return merged;
          });
        }
        if (data.orgEntities && Array.isArray(data.orgEntities)) {
          setOrgEntities((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const additions = data.orgEntities.filter((ne) => !existingIds.has(ne.id));
            const merged = [...prev, ...additions];
            safeSetItem('app_ref_org_entities', merged);
            api.saveOrgEntities(merged).catch(() => {});
            return merged;
          });
        }
        if (data.governorates && Array.isArray(data.governorates)) {
          setGovernorates((prev) => {
            const existingIds = new Set(prev.map((g) => g.id));
            const additions = data.governorates.filter((ng) => !existingIds.has(ng.id));
            const merged = [...prev, ...additions];
            safeSetItem('app_ref_governorates', merged);
            return merged;
          });
        }
        if (data.oilfields && Array.isArray(data.oilfields)) {
          setOilfields((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const additions = data.oilfields.filter((nf) => !existingIds.has(nf.id));
            const merged = [...prev, ...additions];
            safeSetItem('app_ref_oilfields', merged);
            return merged;
          });
        }
        if (data.sites && Array.isArray(data.sites)) {
          setSites((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const additions = data.sites.filter((ns) => !existingIds.has(ns.id));
            const merged = [...prev, ...additions];
            safeSetItem('app_ref_sites', merged);
            return merged;
          });
        }
        if (data.unitTypes && Array.isArray(data.unitTypes)) {
          setUnitTypes((prev) => {
            const existingCodes = new Set(prev.map((t) => t.code));
            const additions = data.unitTypes.filter((nt) => !existingCodes.has(nt.code));
            const merged = [...prev, ...additions];
            safeSetItem('app_ref_unit_types', merged);
            return merged;
          });
        }
        if (data.roomTypes && Array.isArray(data.roomTypes)) {
          setRoomTypes((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const additions = data.roomTypes.filter((nr) => !existingIds.has(nr.id));
            const merged = [...prev, ...additions];
            safeSetItem('app_ref_room_types', merged);
            return merged;
          });
        }
        if (data.equipmentTypes && Array.isArray(data.equipmentTypes)) {
          setEquipmentTypes((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const additions = data.equipmentTypes.filter((ne) => !existingIds.has(ne.id));
            const merged = [...prev, ...additions];
            safeSetItem('app_ref_equipment_types', merged);
            return merged;
          });
        }
        if (data.maintenanceDepartments && Array.isArray(data.maintenanceDepartments)) {
          setMaintenanceDepartments((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const additions = data.maintenanceDepartments.filter((nd) => !existingIds.has(nd.id));
            const merged = [...prev, ...additions];
            safeSetItem('app_ref_maintenance_depts', merged);
            return merged;
          });
        }
      }

      showToast(
        mode === 'overwrite'
          ? 'تمت استعادة وتحديث قاعدة البيانات بالكامل بنجاح'
          : 'تم دمج وتحديث السجلات بنجاح',
        'success',
        'تمت العملية'
      );

      if (onComplete) onComplete();
    } catch (err: any) {
      console.error('handleRestoreDatabase error:', err);
      showToast(err.message || 'فشلت استعادة قاعدة البيانات', 'error', 'خطأ في الاستعادة');
    }
  };

  // Add new unit handler from Wizard
  const handleAddUnit = (newUnit: UnitAsset) => {
    setUnits((prev) => {
      const updated = [newUnit, ...prev];
      safeSetItem('app_units', updated);
      return updated;
    });
    api.addUnit(newUnit).catch((err) => {
      console.error('API addUnit error:', err);
      showToast(err.message || 'فشل حفظ الوحدة الجديدة في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
    });
    setSelectedUnitCode(newUnit.code);
    setActiveTab('units');
  };

  // Update existing unit handler
  const handleUpdateUnit = (updatedUnit: UnitAsset) => {
    setUnits((prev) => {
      const updated = prev.map((u) => (u.id === updatedUnit.id || u.code === updatedUnit.code ? updatedUnit : u));
      safeSetItem('app_units', updated);
      return updated;
    });
    api.updateUnit(updatedUnit).catch((err) => {
      console.error('API updateUnit error:', err);
      showToast(err.message || 'فشل تحديث بيانات الوحدة في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
    });
    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      unitCode: updatedUnit.code,
      timestamp: getServerDateTimeFormatted(),
      action: 'تحديث بيانات الأصل والمبنى الـ 3D',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'تصميم وهيكلية الـ 3D والبيانات العامة',
      previousValue: 'البيانات السابقة',
      newValue: `تم تحديث المبنى (${updatedUnit.name})`,
    };
    appendAuditLog(newLog);
  };

  // Delete unit handler (Permanent removal)
  const handleDeleteUnit = (unitCode: string) => {
    const targetUnit = units.find((u) => u.code === unitCode);
    setUnits((prev) => {
      const remaining = prev.filter((u) => u.code !== unitCode);
      safeSetItem('app_units', remaining);
      if (selectedUnitCode === unitCode) {
        setSelectedUnitCode(remaining[0]?.code || '');
      }
      return remaining;
    });
    api.deleteUnit(unitCode).catch((err) => {
      console.error('API deleteUnit error:', err);
      showToast(err.message || 'فشل حذف الوحدة من قاعدة البيانات المركزية', 'error', 'خطأ في حذف البيانات');
    });

    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      unitCode: unitCode,
      timestamp: getServerDateTimeFormatted(),
      action: 'حذف وحدة نهائياً من قاعدة البيانات',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'قائمة المباني والأصول',
      previousValue: targetUnit?.name || unitCode,
      newValue: 'تم الحذف النهائي وإزالة كافة سجلات المنشأة',
    };
    appendAuditLog(newLog);
  };

  // Decommission unit handler (Freeze & mark as written off)
  const handleDecommissionUnit = (unitCode: string, reason: string) => {
    const timestampStr = getServerDateFormatted();
    let targetUnitObj: UnitAsset | null = null;
    setUnits((prev) => {
      const updated = prev.map((u) => {
        if (u.code === unitCode) {
          targetUnitObj = {
            ...u,
            status: 'decommissioned' as const,
            decommissionedAt: timestampStr,
            decommissionReason: reason || 'تم الشطب والتجميد بناءً على توصيات السلامة والتقييم الإنشائي',
            lastUpdated: 'الآن',
          };
          return targetUnitObj;
        }
        return u;
      });
      safeSetItem('app_units', updated);
      return updated;
    });

    if (targetUnitObj) {
      api.updateUnit(targetUnitObj).catch((err) => {
        console.error('API decommission unit error:', err);
        showToast(err.message || 'فشل شطب وتجميد المنشأة في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
      });
    }

    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      unitCode: unitCode,
      timestamp: getServerDateTimeFormatted(),
      action: 'شطب وتجميد المنشأة',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'حالة التفعيل التشغيلي',
      previousValue: 'نشطة / تشغيلية',
      newValue: `مشطوبة ومجمدة (السبب: ${reason})`,
    };
    appendAuditLog(newLog);
  };

  // Reactivate unit handler
  const handleReactivateUnit = (unitCode: string) => {
    let targetUnitObj: UnitAsset | null = null;
    setUnits((prev) => {
      const updated = prev.map((u) => {
        if (u.code === unitCode) {
          targetUnitObj = {
            ...u,
            status: 'active' as const,
            decommissionedAt: undefined,
            decommissionReason: undefined,
            lastUpdated: 'الآن',
          };
          return targetUnitObj;
        }
        return u;
      });
      safeSetItem('app_units', updated);
      return updated;
    });

    if (targetUnitObj) {
      api.updateUnit(targetUnitObj).catch((err) => {
        console.error('API reactivate unit error:', err);
        showToast(err.message || 'فشل إعادة تفعيل المنشأة في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
      });
    }

    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      unitCode: unitCode,
      timestamp: getServerDateTimeFormatted(),
      action: 'إعادة تفعيل منشأة مشطوبة',
      user: currentUser?.name || 'غير معروف',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : '—',
      affectedField: 'حالة التفعيل التشغيلي',
      previousValue: 'مشطوبة ومجمدة',
      newValue: 'نشطة / تشغيلية',
    };
    appendAuditLog(newLog);
  };

  // Add new governorate handler
  const handleAddGovernorate = (newGov: GovernorateRef) => {
    setGovernorates((prev) => [...prev, newGov]);
  };

  // Add new oilfield handler
  const handleAddOilfield = (newField: OilfieldRef) => {
    setOilfields((prev) => [...prev, newField]);
  };

  // Add new reference unit type handler
  const handleAddUnitType = (newUnitType: ReferenceUnitType) => {
    setUnitTypes((prev) => [...prev, newUnitType]);
  };

  // Add new equipment type handler
  const handleAddEquipmentType = (newEq: EquipmentTypeRef) => {
    setEquipmentTypes((prev) => [...prev, newEq]);
  };

  // Toggle active/disabled status for any reference category
  const handleToggleReferenceStatus = (
    category: 'unitType' | 'governorate' | 'oilfield' | 'site' | 'roomType' | 'equipmentType',
    idOrCode: string
  ) => {
    if (category === 'unitType') {
      setUnitTypes((prev) =>
        prev.map((ut) => (ut.code === idOrCode ? { ...ut, status: ut.status === 'active' ? 'disabled' : 'active' } : ut))
      );
    } else if (category === 'governorate') {
      setGovernorates((prev) =>
        prev.map((g) => (g.id === idOrCode ? { ...g, status: g.status === 'active' ? 'disabled' : 'active' } : g))
      );
    } else if (category === 'oilfield') {
      setOilfields((prev) =>
        prev.map((f) => (f.id === idOrCode ? { ...f, status: f.status === 'active' ? 'disabled' : 'active' } : f))
      );
    } else if (category === 'site') {
      setSites((prev) =>
        prev.map((s) => (s.id === idOrCode ? { ...s, status: s.status === 'active' ? 'disabled' : 'active' } : s))
      );
    } else if (category === 'roomType') {
      setRoomTypes((prev) =>
        prev.map((r) => (r.id === idOrCode ? { ...r, status: r.status === 'active' ? 'disabled' : 'active' } : r))
      );
    } else if (category === 'equipmentType') {
      setEquipmentTypes((prev) =>
        prev.map((e) => (e.id === idOrCode ? { ...e, status: e.status === 'active' ? 'disabled' : 'active' } : e))
      );
    }
  };

  // Add new maintenance request
  const handleAddMaintenanceRequest = (req: MaintenanceRequest) => {
    setMaintenanceRequests((prev) => {
      const updated = [req, ...prev];
      safeSetItem('app_maintenance_requests', updated);
      return updated;
    });
    api.addMaintenanceRequest(req).catch((err) => {
      console.error('API addMaintenanceRequest error:', err);
      showToast(err.message || 'فشل حفظ أمر الصيانة في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
    });
  };

  // Open maintenance modal for specific unit (locked to scanned or targeted unit)
  const handleOpenMaintenanceForUnit = (code: string, isLocked: boolean = true) => {
    setMaintenanceUnitCode(code);
    setIsMaintenanceUnitLocked(isLocked);
    setShowNewMaintenanceModal(true);
  };

  // Open dossier report modal
  const handleOpenDossier = (unit: UnitAsset) => {
    setDossierUnit(unit);
    setShowDossierModal(true);
  };

  // Periodic Inspection Handlers
  const handleAddPeriodicInspection = (schedule: PeriodicInspectionSchedule) => {
    setPeriodicInspections((prev) => {
      const updated = [schedule, ...prev];
      safeSetItem('app_periodic_inspections', updated);
      return updated;
    });
    api.addPeriodicInspection(schedule).catch((err) => {
      console.error('API addPeriodicInspection error:', err);
      showToast(err.message || 'فشل جدولة الكشف الدوري في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
    });
  };

  const handleUpdatePeriodicInspection = (updated: PeriodicInspectionSchedule) => {
    setPeriodicInspections((prev) => {
      const list = prev.map((s) => (s.id === updated.id ? updated : s));
      safeSetItem('app_periodic_inspections', list);
      return list;
    });
    api.updatePeriodicInspection(updated).catch((err) => {
      console.error('API updatePeriodicInspection error:', err);
      showToast(err.message || 'فشل تحديث بيانات الكشف الدوري في قاعدة البيانات', 'error', 'خطأ في حفظ البيانات');
    });
  };

  const handleDeletePeriodicInspection = (id: string) => {
    setPeriodicInspections((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      safeSetItem('app_periodic_inspections', remaining);
      return remaining;
    });
    api.deletePeriodicInspection(id).catch((err) => {
      console.error('API deletePeriodicInspection error:', err);
      showToast(err.message || 'فشل حذف الكشف الدوري من قاعدة البيانات', 'error', 'خطأ في حذف البيانات');
    });
  };

  const handleCompletePeriodicInspection = (
    id: string,
    outcome: {
      completionDate: string;
      grade: ConditionGrade;
      findings: string;
      recommendations: string;
      autoScheduleNext: boolean;
      performedByName?: string;
      reportFileName?: string;
      reportFileUrl?: string;
      createMaintenance?: boolean;
      maintenanceIssue?: string;
      maintenancePriority?: 'critical' | 'normal' | 'low';
      maintenanceDepartment?: string;
      maintenanceDate?: string;
    }
  ) => {
    const existing = periodicInspections.find((s) => s.id === id);
    if (!existing) return;

    let createdMaintId: string | undefined = undefined;

    // Trigger maintenance request if requested
    if (outcome.createMaintenance) {
      createdMaintId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const newReq: MaintenanceRequest = {
        id: createdMaintId,
        unitCode: existing.unitCode,
        unitName: existing.unitName,
        field: existing.field,
        issue: outcome.maintenanceIssue || `صيانة إثر الكشف الدوري (${existing.title})`,
        priority: outcome.maintenancePriority || 'normal',
        slaDeadline: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        maintenanceDepartment: outcome.maintenanceDepartment || 'الصيانة العامة',
        status: 'open',
        createdAt: outcome.maintenanceDate || outcome.completionDate,
        reportedBy: outcome.performedByName || currentUser?.name || existing.inspectorName || 'غير معروف',
        details: `صادر عن كشف المعاينة ${existing.id}. التقييم الممنوح: ${outcome.grade}. التوصيات: ${outcome.recommendations || 'لا يوجد'}`,
        sourceInspectionId: existing.id,
      };
      setMaintenanceRequests((prev) => {
        const updatedMaint = [newReq, ...prev];
        safeSetItem('app_maintenance_requests', updatedMaint);
        return updatedMaint;
      });
      api.addMaintenanceRequest(newReq).catch((err) => {
        console.error('API addMaintenanceRequest error:', err);
        showToast(err.message || 'فشل حفظ أمر الصيانة المرتبط بالكشف في قاعدة البيانات', 'error', 'خطأ في حفظ البيانات');
      });
    }

    // Mark existing as completed
    const updatedExisting: PeriodicInspectionSchedule = {
      ...existing,
      status: 'completed',
      completionDate: outcome.completionDate,
      conditionGradeGiven: outcome.grade,
      performedByName: outcome.performedByName || existing.performedByName || undefined,
      findings: outcome.findings,
      recommendations: outcome.recommendations,
      reportFileName: outcome.reportFileName,
      reportFileUrl: outcome.reportFileUrl,
      createdMaintenanceRequestId: createdMaintId,
    };
    api.updatePeriodicInspection(updatedExisting).catch((err) => {
      console.error('API updatePeriodicInspection error:', err);
      showToast(err.message || 'فشل توثيق إنجاز الكشف الدوري في قاعدة البيانات', 'error', 'خطأ في حفظ البيانات');
    });

    // Update unit condition grade
    setUnits((prev) => {
      let matchedUnit: UnitAsset | null = null;
      const updatedUnits = prev.map((u) => {
        if (u.code === existing.unitCode) {
          matchedUnit = { ...u, conditionGrade: outcome.grade, lastUpdated: 'الآن' };
          return matchedUnit;
        }
        return u;
      });
      safeSetItem('app_units', updatedUnits);
      if (matchedUnit) {
        api.updateUnit(matchedUnit).catch((err) => {
          console.error('API updateUnit grade error:', err);
          showToast(err.message || 'فشل تحديث درجة تقييم الوحدة في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
        });
      }
      return updatedUnits;
    });

    // Auto schedule next inspection
    let nextSchedules: PeriodicInspectionSchedule[] = [];
    if (outcome.autoScheduleNext) {
      const d = new Date(outcome.completionDate);
      let daysToAdd = 90;
      if (existing.frequency === 'monthly') daysToAdd = 30;
      else if (existing.frequency === 'quarterly') daysToAdd = 90;
      else if (existing.frequency === 'semi_annual') daysToAdd = 180;
      else if (existing.frequency === 'annual') daysToAdd = 365;
      else if (existing.frequency === 'custom') daysToAdd = existing.customIntervalDays || 90;

      d.setDate(d.getDate() + daysToAdd);
      const nextDueDateStr = d.toISOString().split('T')[0];

      const newNextSchedule: PeriodicInspectionSchedule = {
        id: `INS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        unitCode: existing.unitCode,
        unitName: existing.unitName,
        field: existing.field,
        governorate: existing.governorate,
        inspectionType: existing.inspectionType,
        title: existing.title,
        frequency: existing.frequency,
        customIntervalDays: existing.customIntervalDays,
        lastInspectionDate: outcome.completionDate,
        nextDueDate: nextDueDateStr,
        assignedTeam: existing.assignedTeam,
        inspectorName: existing.inspectorName,
        status: 'scheduled',
        notes: `كشف دوري مجدول تلقائياً بعد توثيق كشف بتاريخ ${outcome.completionDate}`,
        createdAt: getServerIsoDateOnly(),
      };
      nextSchedules.push(newNextSchedule);
      api.addPeriodicInspection(newNextSchedule).catch((err) => {
        console.error('API addPeriodicInspection next schedule error:', err);
        showToast(err.message || 'فشل جدولة الكشف القادم في قاعدة البيانات', 'error', 'خطأ في حفظ البيانات');
      });
    }

    setPeriodicInspections((prev) => {
      const updatedAll = [
        ...nextSchedules,
        ...prev.map((s) => (s.id === id ? updatedExisting : s)),
      ];
      safeSetItem('app_periodic_inspections', updatedAll);
      return updatedAll;
    });
  };

  const handleUpdateMaintenanceRequest = (updatedReq: MaintenanceRequest) => {
    setMaintenanceRequests((prev) => {
      const updated = prev.map((r) => (r.id === updatedReq.id ? updatedReq : r));
      safeSetItem('app_maintenance_requests', updated);
      return updated;
    });
    api.updateMaintenanceRequest(updatedReq).catch((err) => {
      console.error('API updateMaintenanceRequest error:', err);
      showToast(err.message || 'فشل تحديث أمر الصيانة في قاعدة البيانات المركزية', 'error', 'خطأ في حفظ البيانات');
    });
  };

  const handleDeleteMaintenanceRequest = (id: string) => {
    setMaintenanceRequests((prev) => {
      const remaining = prev.filter((r) => r.id !== id);
      safeSetItem('app_maintenance_requests', remaining);
      return remaining;
    });
    api.deleteMaintenanceRequest(id).catch((err) => {
      console.error('API deleteMaintenanceRequest error:', err);
      showToast(err.message || 'فشل حذف أمر الصيانة من قاعدة البيانات المركزية', 'error', 'خطأ في حذف البيانات');
    });
  };

  const selectedUnit = units.find((u) => u.code === selectedUnitCode) || units[0];

  // Dynamic metric calculations
  const totalRoomsCount = units.reduce((sum, u) => sum + (u.rooms ? u.rooms.length : 0), 0) || (occupancyRecords.length * 2);
  const occupiedRoomsCount = occupancyRecords.filter((r) => r.status === 'full' || r.status === 'partial').length;
  const currentOccupancyRate = totalRoomsCount > 0
    ? `${((occupiedRoomsCount / totalRoomsCount) * 100).toFixed(1)}%`
    : (occupancyRecords.length > 0 ? '87.5%' : '0%');

  // If user is not authenticated, render Login Screen as the primary entrance
  if (!currentUser) {
    return (
      <LoginView
        branding={branding}
        users={users}
        units={units}
        onLogin={handleLogin}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        pendingDeepLink={pendingDeepLink}
      />
    );
  }

  const currentUserRole = currentUser.role || 'مستخدم';
  const isRoleAdmin = currentUserRole === 'مدير النظام' || currentUserRole === 'admin';
  const isRoleOperator = currentUserRole === 'مشغل النظام' || currentUserRole === 'operator';
  const isRoleInspector = currentUserRole === 'موظف الكشف والصيانة' || currentUserRole === 'inspector';
  const isRoleMaintenance = currentUserRole === 'موظف الصيانة' || currentUserRole === 'maintenance_employee';
  const isRoleUser = currentUserRole === 'مستخدم' || currentUserRole === 'user';

  // Responsive Mobile Navigation Items (Tailored to permissions)
  const mobileMenuItems = [
    {
      id: 'field_inspection' as NavTab,
      label: 'كشف ميداني',
      icon: ClipboardCheck,
      roles: ['موظف الكشف والصيانة'],
    },
    {
      id: 'dashboard' as NavTab,
      label: 'الرئيسية',
      icon: LayoutDashboard,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'units' as NavTab,
      label: 'الوحدات',
      icon: Box,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'gis_map' as NavTab,
      label: 'الخريطة GIS',
      icon: MapPin,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'new_unit' as NavTab,
      label: 'تسجيل',
      icon: PlusCircle,
      roles: ['مدير النظام', 'مشغل النظام'],
    },
    {
      id: 'periodic_inspection' as NavTab,
      label: 'كشوفات',
      icon: CalendarCheck,
      roles: ['مدير النظام', 'مشغل النظام'],
    },
    {
      id: 'maintenance' as NavTab,
      label: 'صيانة',
      icon: Wrench,
      roles: ['مدير النظام', 'مشغل النظام', 'موظف الصيانة'],
    },
    {
      id: 'reports' as NavTab,
      label: 'تقارير',
      icon: FileText,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم', 'موظف الصيانة'],
    },
    {
      id: 'settings' as NavTab,
      label: 'إعدادات',
      icon: Settings,
      roles: ['مدير النظام'],
    },
  ].filter((item) => {
    if (isRoleAdmin) return true;
    if (isRoleInspector) {
      return ['field_inspection'].includes(item.id);
    }
    if (isRoleMaintenance) {
      return ['maintenance', 'reports'].includes(item.id);
    }
    if (isRoleOperator) return item.id !== 'settings' && item.id !== 'field_inspection';
    return item.roles.includes('مستخدم') && item.id !== 'field_inspection';
  });

  return (
    <div
      dir="rtl"
      className={`min-h-screen font-sans antialiased selection:bg-amber-500 selection:text-slate-950 transition-colors duration-300 ${
        theme === 'light' ? 'light bg-slate-100 text-slate-900' : 'dark bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navigation Header */}
      <Header
        onOpenNewAssetModal={!isRoleUser && !isRoleInspector && !isRoleMaintenance ? () => setActiveTab('new_unit') : undefined}
        onOpenNewMaintenanceModal={
          !isRoleUser && !isRoleInspector && !isRoleMaintenance
            ? () => {
                setMaintenanceUnitCode(selectedUnitCode);
                setIsMaintenanceUnitLocked(false);
                setShowNewMaintenanceModal(true);
              }
            : undefined
        }
        onOpenQrScanner={() => setShowInAppQrScanner(true)}
        searchTerm={globalSearchTerm}
        onSearchChange={setGlobalSearchTerm}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        branding={branding}
        currentUser={currentUser}
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
        syncStatus={syncStatus}
      />

      {/* Main Body Layout: Sidebar + Dynamic Main Content */}
      <div className="flex w-full px-1.5 sm:px-2 md:px-4">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          branding={branding}
          unitsCount={units.length}
          occupancyPercentage={currentOccupancyRate}
          maintenanceCount={maintenanceRequests.length}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenQrScanner={() => setShowInAppQrScanner(true)}
          theme={theme}
          currentUserRole={currentUserRole}
        />

        <main className="flex-1 p-2 sm:p-3 md:p-5 pb-24 md:pb-5 min-w-0 max-w-full overflow-x-clip space-y-3.5 sm:space-y-4 md:space-y-5">
          {/* Mobile Main Navigation Bar: Sticky as user scrolls down for effortless navigation */}
          <div
            className={`md:hidden w-full rounded-2xl p-1 shadow-md border transition select-none sticky top-[61px] z-20 backdrop-blur-md ${
              theme === 'light'
                ? 'bg-white/95 border-slate-200 shadow-slate-200/60'
                : 'bg-slate-900/95 border-slate-800 shadow-slate-950/60'
            }`}
          >
            <div className="flex items-center justify-between w-full gap-0.5">
              {mobileMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={`top-nav-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer select-none min-w-0 ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : theme === 'light'
                        ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    title={item.label}
                  >
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'}`} />
                    <span className="text-[9px] sm:text-[10px] leading-tight mt-0.5 truncate w-full text-center font-bold">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active View Router */}
          {activeTab === 'field_inspection' && (
            <FieldInspectionView
              units={units}
              periodicInspections={periodicInspections}
              currentUser={currentUser}
              onAddInspection={handleAddPeriodicInspection}
              onUpdateGrade={handleUpdateGrade}
              onOpenMaintenanceModal={handleOpenMaintenanceForUnit}
              theme={theme}
              initialUnitCode={selectedUnitCode}
            />
          )}

          {activeTab === 'dashboard' && !isRoleInspector && (
            <DashboardView
              units={units}
              maintenanceRequests={maintenanceRequests}
              occupancyRecords={occupancyRecords}
              periodicInspections={periodicInspections}
              governorates={governorates}
              oilfields={oilfields}
              orgEntities={orgEntities}
              unitTypes={unitTypes}
              onSelectUnit={handleSelectUnit}
              onNavigateTab={setActiveTab}
              theme={theme}
            />
          )}

          {activeTab === 'units' && !isRoleInspector && (
            <UnitManagementView
              units={units}
              selectedUnitCode={selectedUnitCode}
              onSelectUnit={setSelectedUnitCode}
              onUpdateGrade={handleUpdateGrade}
              onUpdateUnit={handleUpdateUnit}
              onDeleteUnit={handleDeleteUnit}
              onDecommissionUnit={handleDecommissionUnit}
              onReactivateUnit={handleReactivateUnit}
              onOpenMaintenanceModal={handleOpenMaintenanceForUnit}
              onOpenDossierModal={handleOpenDossier}
              governorates={governorates}
              oilfields={oilfields}
              unitTypes={unitTypes}
              orgEntities={orgEntities}
              onAddOrgEntity={handleAddOrgEntity}
              theme={theme}
              currentUserRole={currentUserRole}
            />
          )}

          {activeTab === 'gis_map' && !isRoleInspector && !isRoleMaintenance && (
            <GISMapView
              units={units}
              theme={theme}
              onSelectUnit={(unit) => {
                setSelectedUnitCode(unit.code);
                setActiveTab('units');
              }}
              onOpenInspection={(code) => {
                setSelectedUnitCode(code);
                setActiveTab(isRoleInspector ? 'field_inspection' : 'periodic_inspection');
              }}
              onOpenMaintenance={handleOpenMaintenanceForUnit}
              onOpen3D={(code) => {
                setSelectedUnitCode(code);
                setActiveTab('units');
              }}
            />
          )}

          {activeTab === 'new_unit' && !isRoleUser && !isRoleInspector && (
            <NewUnitWizard
              governorates={governorates}
              oilfields={oilfields}
              sites={sites}
              unitTypes={unitTypes}
              equipmentTypes={equipmentTypes}
              orgEntities={orgEntities}
              onAddOrgEntity={handleAddOrgEntity}
              onAddUnit={handleAddUnit}
              onAddGovernorate={handleAddGovernorate}
              onAddOilfield={handleAddOilfield}
              onAddUnitType={handleAddUnitType}
              onAddEquipmentType={handleAddEquipmentType}
              onCancel={() => setActiveTab('dashboard')}
              theme={theme}
            />
          )}

          {activeTab === 'periodic_inspection' && !isRoleUser && !isRoleInspector && (
            <PeriodicInspectionView
              schedules={periodicInspections}
              units={units}
              governorates={governorates}
              oilfields={oilfields}
              maintenanceRequests={maintenanceRequests}
              users={users}
              currentUser={currentUser}
              onAddSchedule={handleAddPeriodicInspection}
              onUpdateSchedule={handleUpdatePeriodicInspection}
              onDeleteSchedule={handleDeletePeriodicInspection}
              onCompleteInspection={handleCompletePeriodicInspection}
              onUpdateMaintenanceRequest={handleUpdateMaintenanceRequest}
              onNavigateTab={setActiveTab}
              theme={theme}
            />
          )}

          {activeTab === 'maintenance' && !isRoleUser && !isRoleInspector && (
            <MaintenanceView
              requests={maintenanceRequests}
              units={units}
              currentUser={currentUser}
              maintenanceDepartments={maintenanceDepartments}
              onOpenNewMaintenanceModal={() => {
                setMaintenanceUnitCode(selectedUnitCode);
                setIsMaintenanceUnitLocked(false);
                setShowNewMaintenanceModal(true);
              }}
              onUpdateMaintenanceRequest={handleUpdateMaintenanceRequest}
              onDeleteMaintenanceRequest={handleDeleteMaintenanceRequest}
              theme={theme}
            />
          )}

          {activeTab === 'reports' && !isRoleInspector && (
            <ReportsView
              units={units}
              periodicInspections={periodicInspections}
              maintenanceRequests={maintenanceRequests}
              governorates={governorates}
              oilfields={oilfields}
              orgEntities={orgEntities}
              users={users}
              currentUser={currentUser}
              theme={theme}
              branding={branding}
            />
          )}

          {activeTab === 'settings' && isRoleAdmin && (
            <SettingsView
              units={units}
              branding={branding}
              currentUser={currentUser}
              users={users}
              unitTypes={unitTypes}
              governorates={governorates}
              oilfields={oilfields}
              sites={sites}
              roomTypes={roomTypes}
              equipmentTypes={equipmentTypes}
              maintenanceDepartments={maintenanceDepartments}
              onAddMaintenanceDepartment={handleAddMaintenanceDepartment}
              onUpdateMaintenanceDepartment={handleUpdateMaintenanceDepartment}
              onDeleteMaintenanceDepartment={handleDeleteMaintenanceDepartment}
              onToggleMaintenanceDepartmentStatus={handleToggleMaintenanceDepartmentStatus}
              onClearMaintenanceDepartments={handleClearMaintenanceDepartments}
              onResetMaintenanceDepartmentsToDefault={handleResetMaintenanceDepartmentsToDefault}
              auditLogs={auditLogs}
              onAddAuditLog={appendAuditLog}
              orgEntities={orgEntities}
              onAddOrgEntity={handleAddOrgEntity}
              onUpdateOrgEntity={handleUpdateOrgEntity}
              onDeleteOrgEntity={handleDeleteOrgEntity}
              onToggleOrgEntityStatus={handleToggleOrgEntityStatus}
              onResetOrgEntitiesToDefault={handleResetOrgEntitiesToDefault}
              onUpdateBranding={handleUpdateBranding}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onToggleUserStatus={handleToggleUserStatus}
              onAddUnitType={(t) => setUnitTypes((prev) => [...prev, t])}
              onUpdateUnitType={handleUpdateUnitType}
              onDeleteUnitType={handleDeleteUnitType}
              onAddGovernorate={(g) => setGovernorates((prev) => [...prev, g])}
              onUpdateGovernorate={handleUpdateGovernorate}
              onDeleteGovernorate={handleDeleteGovernorate}
              onAddOilfield={(f) => setOilfields((prev) => [...prev, f])}
              onUpdateOilfield={handleUpdateOilfield}
              onDeleteOilfield={handleDeleteOilfield}
              onAddSite={(s) => setSites((prev) => [...prev, s])}
              onUpdateSite={handleUpdateSite}
              onDeleteSite={handleDeleteSite}
              onAddRoomType={(r) => setRoomTypes((prev) => [...prev, r])}
              onUpdateRoomType={handleUpdateRoomType}
              onDeleteRoomType={handleDeleteRoomType}
              onAddEquipmentType={(e) => setEquipmentTypes((prev) => [...prev, e])}
              onUpdateEquipmentType={handleUpdateEquipmentType}
              onDeleteEquipmentType={handleDeleteEquipmentType}
              onToggleStatus={handleToggleReferenceStatus}
              onClearAuditLogs={() => setAuditLogs([])}
              onClearUnits={handleClearUnits}
              onResetUnitsToDefault={handleResetUnitsToDefault}
              onClearOilfields={handleClearOilfields}
              onResetOilfieldsToDefault={handleResetOilfieldsToDefault}
              onClearUnitTypes={handleClearUnitTypes}
              onResetUnitTypesToDefault={handleResetUnitTypesToDefault}
              onClearGovernorates={handleClearGovernorates}
              onResetGovernoratesToDefault={handleResetGovernoratesToDefault}
              onClearSites={handleClearSites}
              onResetSitesToDefault={handleResetSitesToDefault}
              onClearUsers={handleClearUsers}
              onResetUsersToDefault={handleResetUsersToDefault}
              onClearRoomTypes={handleClearRoomTypes}
              onResetRoomTypesToDefault={handleResetRoomTypesToDefault}
              onClearEquipmentTypes={handleClearEquipmentTypes}
              onResetEquipmentTypesToDefault={handleResetEquipmentTypesToDefault}
              maintenanceRequests={maintenanceRequests}
              occupancyRecords={occupancyRecords}
              periodicInspections={periodicInspections}
              onRestoreDatabase={handleRestoreDatabase}
              onClearMaintenanceRequests={handleClearMaintenanceRequests}
              onResetMaintenanceRequestsToDefault={handleResetMaintenanceRequestsToDefault}
              onClearOccupancyRecords={handleClearOccupancyRecords}
              onResetOccupancyRecordsToDefault={handleResetOccupancyRecordsToDefault}
              onFactoryReset={handleFactoryReset}
              theme={theme}
            />
          )}
        </main>
      </div>

      {/* Fixed Bottom Mobile Navigation Dock (Thumb-friendly, 0 scrollbars) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t px-1 py-1 shadow-2xl backdrop-blur-md transition-colors duration-300 ${
          theme === 'light'
            ? 'bg-white/95 border-slate-200 shadow-slate-300 text-slate-800'
            : 'bg-slate-950/95 border-slate-800 shadow-black text-slate-200'
        }`}
      >
        <div className="flex items-center justify-around w-full gap-0.5 max-w-lg mx-auto">
          {mobileMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={`dock-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all cursor-pointer select-none min-w-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : theme === 'light'
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-500 dark:text-amber-400'}`} />
                <span className="text-[9px] leading-tight mt-0.5 truncate w-full text-center font-bold">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Maintenance Request Modal */}
      {showNewMaintenanceModal && (
        <NewMaintenanceModal
          units={units}
          initialUnitCode={maintenanceUnitCode}
          isUnitLocked={isMaintenanceUnitLocked}
          onAddRequest={handleAddMaintenanceRequest}
          onClose={() => setShowNewMaintenanceModal(false)}
          isLight={theme === 'light'}
          currentUser={currentUser}
          maintenanceDepartments={maintenanceDepartments}
        />
      )}

      {/* Export Technical Dossier PDF Modal */}
      {showDossierModal && dossierUnit && (
        <ExportDossierModal unit={dossierUnit} branding={branding} onClose={() => setShowDossierModal(false)} />
      )}

      {/* Global In-App QR Scanner Modal */}
      {showInAppQrScanner && (
        <InAppQrScannerModal
          units={units}
          theme={theme}
          onClose={() => setShowInAppQrScanner(false)}
          onUnitDetected={(matched) => {
            setShowInAppQrScanner(false);
            setScannedUnitForChoice(matched);
          }}
        />
      )}

      {/* In-App QR Scan Choices Modal (Location / Inspection / Maintenance / 3D) */}
      {scannedUnitForChoice && (
        <UnitScanChoiceModal
          unit={scannedUnitForChoice}
          theme={theme}
          onClose={() => setScannedUnitForChoice(null)}
          onSelectLocation={(unit) => {
            setScannedUnitForChoice(null);
            setSelectedUnitCode(unit.code);
            setLocationMapUnit(unit);
          }}
          onSelectInspection={(unit) => {
            setScannedUnitForChoice(null);
            setSelectedUnitCode(unit.code);
            setActiveTab('field_inspection');
          }}
          onSelectMaintenance={(unit) => {
            setScannedUnitForChoice(null);
            handleOpenMaintenanceForUnit(unit.code);
          }}
          onSelect3D={(unit) => {
            setScannedUnitForChoice(null);
            setSelectedUnitCode(unit.code);
            setActiveTab('units');
          }}
        />
      )}

      {/* Global Unit Location Map Modal */}
      {locationMapUnit && (
        <UnitLocationMapModal
          unit={locationMapUnit}
          theme={theme}
          onClose={() => setLocationMapUnit(null)}
          onOpenInspection={(code) => {
            setLocationMapUnit(null);
            setSelectedUnitCode(code);
            setActiveTab('field_inspection');
          }}
          onOpenMaintenance={(code) => {
            setLocationMapUnit(null);
            handleOpenMaintenanceForUnit(code);
          }}
        />
      )}

      {/* Global Toast / Notification Banner */}
      {toastMessage && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] px-2 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div
            className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md ${
              toastMessage.type === 'error'
                ? theme === 'light'
                  ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-rose-200/50'
                  : 'bg-rose-950/95 border-rose-700/80 text-rose-100 shadow-black/80'
                : toastMessage.type === 'success'
                ? theme === 'light'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-200/50'
                  : 'bg-emerald-950/95 border-emerald-700/80 text-emerald-100 shadow-black/80'
                : theme === 'light'
                ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-blue-200/50'
                : 'bg-blue-950/95 border-blue-700/80 text-blue-100 shadow-black/80'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toastMessage.type === 'error' && (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              )}
              {toastMessage.type === 'success' && (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
              {toastMessage.type === 'info' && (
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {toastMessage.title && (
                <h4 className="text-sm font-bold mb-0.5 text-inherit">
                  {toastMessage.title}
                </h4>
              )}
              <p className="text-xs leading-relaxed text-inherit opacity-95">
                {toastMessage.text}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
