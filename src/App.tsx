import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { UnitManagementView } from './components/UnitManagementView';
import { NewUnitWizard } from './components/NewUnitWizard';
import { PeriodicInspectionView } from './components/PeriodicInspectionView';
import { MaintenanceView } from './components/MaintenanceView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { NewMaintenanceModal } from './components/NewMaintenanceModal';
import { ExportDossierModal } from './components/ExportDossierModal';
import { LoginView } from './components/LoginView';

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
  SystemBranding,
  SystemUser,
  AuditLogItem,
  OrgEntity,
  OrgLevel,
  UserAccountRole,
} from './types';
import { toArabicDigits } from './utils/arabicUtils';
import { safeParse, safeSetItem } from './utils/storageUtils';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('app_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');

  // Authentication & Current User State (default initial login screen)
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() =>
    safeParse('app_current_user', null)
  );

  useEffect(() => {
    safeSetItem('app_current_user', currentUser);
  }, [currentUser]);

  const handleLogin = (user: SystemUser) => {
    setCurrentUser(user);
    const role = user.role;
    if (role === 'مستخدم' || role === 'user') {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
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

  // Datasets with LocalStorage Persistence
  const [units, setUnits] = useState<UnitAsset[]>(() =>
    safeParse('app_units', INITIAL_UNITS)
  );

  useEffect(() => {
    safeSetItem('app_units', units);
  }, [units]);

  const [selectedUnitCode, setSelectedUnitCode] = useState<string>('');
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>(() =>
    safeParse('app_maintenance_requests', INITIAL_MAINTENANCE_REQUESTS)
  );

  useEffect(() => {
    safeSetItem('app_maintenance_requests', maintenanceRequests);
  }, [maintenanceRequests]);

  const [occupancyRecords, setOccupancyRecords] = useState<OccupancyRecord[]>(() =>
    safeParse('app_occupancy_records', INITIAL_OCCUPANCY_RECORDS)
  );

  useEffect(() => {
    safeSetItem('app_occupancy_records', occupancyRecords);
  }, [occupancyRecords]);

  const [periodicInspections, setPeriodicInspections] = useState<PeriodicInspectionSchedule[]>(() => {
    const saved = localStorage.getItem('app_periodic_inspections');
    if (!saved) return INITIAL_PERIODIC_INSPECTIONS;
    try {
      const parsed = JSON.parse(saved);
      return parsed.filter((item: PeriodicInspectionSchedule) => !item.id?.startsWith('INS-2026-00'));
    } catch {
      return INITIAL_PERIODIC_INSPECTIONS;
    }
  });

  useEffect(() => {
    safeSetItem('app_periodic_inspections', periodicInspections);
  }, [periodicInspections]);

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() =>
    safeParse('app_audit_logs', INITIAL_AUDIT_LOGS)
  );

  useEffect(() => {
    safeSetItem('app_audit_logs', auditLogs);
  }, [auditLogs]);

  // System Branding State
  const [branding, setBranding] = useState<SystemBranding>(() =>
    safeParse('app_branding', INITIAL_BRANDING)
  );

  useEffect(() => {
    safeSetItem('app_branding', branding);
  }, [branding]);

  // System Users State
  const [users, setUsers] = useState<SystemUser[]>(() =>
    safeParse('app_users', INITIAL_USERS)
  );

  // Sidebar Collapsed State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    safeSetItem('app_users', users);
  }, [users]);

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
    safeSetItem('app_ref_org_entities', orgEntities);
  }, [unitTypes, governorates, oilfields, sites, roomTypes, equipmentTypes, orgEntities]);

  const handleAddOrgEntity = (newEntity: OrgEntity) => {
    setOrgEntities((prev) => [newEntity, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
        action: 'إضافة تشكيل تنظيمـي',
        user: 'أحمد كريم',
        userInitials: 'AK',
        affectedField: 'الهيكل التنظيمي',
        previousValue: '-',
        newValue: newEntity.nameAr,
      },
      ...prev,
    ]);
  };

  const handleUpdateOrgEntity = (updatedEntity: OrgEntity) => {
    setOrgEntities((prev) =>
      prev.map((e) => (e.id === updatedEntity.id ? updatedEntity : e))
    );
    setAuditLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
        action: 'تعديل تشكيل تنظيمـي',
        user: 'أحمد كريم',
        userInitials: 'AK',
        affectedField: 'الهيكل التنظيمي',
        previousValue: 'بيانات سابقة',
        newValue: updatedEntity.nameAr,
      },
      ...prev,
    ]);
  };

  const handleDeleteOrgEntity = (id: string) => {
    const entity = orgEntities.find((e) => e.id === id);
    setOrgEntities((prev) => prev.filter((e) => e.id !== id));
    if (entity) {
      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now()}`,
          timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
          action: 'حذف تشكيل تنظيمـي',
          user: 'أحمد كريم',
          userInitials: 'AK',
          affectedField: 'الهيكل التنظيمي',
          previousValue: entity.nameAr,
          newValue: 'تم الحذف',
        },
        ...prev,
      ]);
    }
  };

  const handleToggleOrgEntityStatus = (id: string) => {
    setOrgEntities((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: e.status === 'active' ? 'disabled' : 'active' } : e
      )
    );
  };

  const handleResetOrgEntitiesToDefault = () => {
    setOrgEntities(INITIAL_ORG_ENTITIES);
    localStorage.setItem('app_ref_org_entities', JSON.stringify(INITIAL_ORG_ENTITIES));
  };

  // Modals
  const [showNewMaintenanceModal, setShowNewMaintenanceModal] = useState(false);
  const [maintenanceUnitCode, setMaintenanceUnitCode] = useState('WS-AHD-BLD-014');
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [dossierUnit, setDossierUnit] = useState<UnitAsset | null>(null);

  // Quick unit selection handler
  const handleSelectUnit = (code: string) => {
    setSelectedUnitCode(code);
    setActiveTab('units');
  };

  // Grade Update handler
  const handleUpdateGrade = (code: string, newGrade: ConditionGrade) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.code === code) {
          return { ...u, conditionGrade: newGrade, lastUpdated: 'الآن' };
        }
        return u;
      })
    );

    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(10 + Math.random() * 90)}`,
      unitCode: code,
      timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
      action: 'تحديث درجة التقييم الهندسي',
      user: 'أحمد كريم',
      userInitials: 'AK',
      affectedField: 'درجة التقييم',
      previousValue: 'الدرجة السابقة',
      newValue: newGrade,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // User Management Handlers with Immediate System Reflection & Audit Logging
  const handleAddUser = (newUser: SystemUser) => {
    setUsers((prev) => [newUser, ...prev]);
    setAuditLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
        action: 'إضافة حساب مستخدم جديد',
        user: currentUser?.name || 'مدير النظام',
        userInitials: currentUser ? currentUser.name.slice(0, 2) : 'AD',
        affectedField: 'المستخدمين',
        previousValue: '-',
        newValue: `${newUser.name} (${newUser.role})`,
      },
      ...prev,
    ]);
  };

  const handleUpdateUser = (updatedUser: SystemUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    setAuditLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
        action: 'تعديل حساب وصلاحيات مستخدم',
        user: currentUser?.name || 'مدير النظام',
        userInitials: currentUser ? currentUser.name.slice(0, 2) : 'AD',
        affectedField: 'المستخدمين',
        previousValue: 'بيانات سابقة',
        newValue: `${updatedUser.name} (${updatedUser.role})`,
      },
      ...prev,
    ]);
  };

  const handleDeleteUser = (userId: string) => {
    const usr = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (currentUser?.id === userId) {
      handleLogout();
    }
    if (usr) {
      setAuditLogs((prev) => [
        {
          id: `LOG-${Date.now()}`,
          timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
          action: 'حذف حساب مستخدم نهائياً',
          user: currentUser?.name || 'مدير النظام',
          userInitials: currentUser ? currentUser.name.slice(0, 2) : 'AD',
          affectedField: 'المستخدمين',
          previousValue: usr.name,
          newValue: 'تم الحذف',
        },
        ...prev,
      ]);
    }
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus = u.status === 'active' ? 'disabled' : 'active';
          if (currentUser?.id === userId && newStatus === 'disabled') {
            setTimeout(() => handleLogout(), 100);
          }
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  const handleChangePassword = (
    currentPass: string,
    newPass: string
  ): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'لا يوجد حساب مستخدم مسجل حالياً' };
    }

    // If current user has a password in state or users list, verify it
    const existingUser = users.find((u) => u.id === currentUser.id);
    const expectedPassword = existingUser?.password || currentUser.password || '123';

    if (currentPass !== expectedPassword) {
      return { success: false, message: 'كلمة المرور الحالية غير صحيحة، يرجى المحاولة ثانية' };
    }

    const updatedUser: SystemUser = {
      ...currentUser,
      password: newPass,
    };

    setCurrentUser(updatedUser);
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, password: newPass } : u))
    );

    setAuditLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
        action: 'تغيير كلمة المرور الشخصية',
        user: currentUser.name,
        userInitials: currentUser.name.slice(0, 2),
        affectedField: 'كلمة المرور',
        previousValue: '••••••',
        newValue: '••••••',
      },
      ...prev,
    ]);

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
  const handleClearUnits = () => setUnits([]);
  const handleResetUnitsToDefault = () => setUnits(INITIAL_UNITS);

  const handleClearOilfields = () => setOilfields([]);
  const handleResetOilfieldsToDefault = () => setOilfields(INITIAL_OILFIELDS);

  const handleClearUnitTypes = () => setUnitTypes([]);
  const handleResetUnitTypesToDefault = () => setUnitTypes(INITIAL_REFERENCE_UNIT_TYPES);

  const handleClearGovernorates = () => setGovernorates([]);
  const handleResetGovernoratesToDefault = () => setGovernorates(INITIAL_GOVERNORATES);

  const handleClearSites = () => setSites([]);
  const handleResetSitesToDefault = () => setSites(INITIAL_SITES);

  const handleClearUsers = () => setUsers([]);
  const handleResetUsersToDefault = () => setUsers(INITIAL_USERS);

  const handleClearRoomTypes = () => setRoomTypes([]);
  const handleResetRoomTypesToDefault = () => setRoomTypes(INITIAL_ROOM_TYPES);

  const handleClearEquipmentTypes = () => setEquipmentTypes([]);
  const handleResetEquipmentTypesToDefault = () => setEquipmentTypes(INITIAL_EQUIPMENT_TYPES);

  const handleClearMaintenanceRequests = () => setMaintenanceRequests([]);
  const handleResetMaintenanceRequestsToDefault = () => setMaintenanceRequests(INITIAL_MAINTENANCE_REQUESTS);

  const handleClearOccupancyRecords = () => setOccupancyRecords([]);
  const handleResetOccupancyRecordsToDefault = () => setOccupancyRecords(INITIAL_OCCUPANCY_RECORDS);

  // Factory Reset Handler
  const handleFactoryReset = () => {
    localStorage.clear();
    setBranding(INITIAL_BRANDING);
    setUsers(INITIAL_USERS);
    setUnits(INITIAL_UNITS);
    setUnitTypes(INITIAL_REFERENCE_UNIT_TYPES);
    setGovernorates(INITIAL_GOVERNORATES);
    setOilfields(INITIAL_OILFIELDS);
    setSites(INITIAL_SITES);
    setRoomTypes(INITIAL_ROOM_TYPES);
    setEquipmentTypes(INITIAL_EQUIPMENT_TYPES);
    setMaintenanceRequests(INITIAL_MAINTENANCE_REQUESTS);
    setOccupancyRecords(INITIAL_OCCUPANCY_RECORDS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
  };

  // Add new unit handler from Wizard
  const handleAddUnit = (newUnit: UnitAsset) => {
    setUnits((prev) => [newUnit, ...prev]);
    setSelectedUnitCode(newUnit.code);
    setActiveTab('units');
  };

  // Update existing unit handler
  const handleUpdateUnit = (updatedUnit: UnitAsset) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === updatedUnit.id || u.code === updatedUnit.code ? updatedUnit : u))
    );
    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      unitCode: updatedUnit.code,
      timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
      action: 'تحديث بيانات الأصل والمبنى الـ 3D',
      user: 'أحمد كريم',
      userInitials: 'AK',
      affectedField: 'تصميم وهيكلية الـ 3D والبيانات العامة',
      previousValue: 'البيانات السابقة',
      newValue: `تم تحديث المبنى (${updatedUnit.name})`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Delete unit handler (Permanent removal)
  const handleDeleteUnit = (unitCode: string) => {
    const targetUnit = units.find((u) => u.code === unitCode);
    setUnits((prev) => {
      const remaining = prev.filter((u) => u.code !== unitCode);
      if (selectedUnitCode === unitCode) {
        setSelectedUnitCode(remaining[0]?.code || '');
      }
      return remaining;
    });

    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      unitCode: unitCode,
      timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
      action: 'حذف وحدة نهائياً من قاعدة البيانات',
      user: 'أحمد كريم',
      userInitials: 'AK',
      affectedField: 'قائمة المباني والأصول',
      previousValue: targetUnit?.name || unitCode,
      newValue: 'تم الحذف النهائي وإزالة كافة سجلات المنشأة',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Decommission unit handler (Freeze & mark as written off)
  const handleDecommissionUnit = (unitCode: string, reason: string) => {
    const timestampStr = toArabicDigits(new Date().toLocaleDateString('ar-IQ'));
    setUnits((prev) =>
      prev.map((u) => {
        if (u.code === unitCode) {
          return {
            ...u,
            status: 'decommissioned' as const,
            decommissionedAt: timestampStr,
            decommissionReason: reason || 'تم الشطب والتجميد بناءً على توصيات السلامة والتقييم الإنشائي',
            lastUpdated: 'الآن',
          };
        }
        return u;
      })
    );

    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      unitCode: unitCode,
      timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
      action: 'شطب وتجميد المنشأة',
      user: 'أحمد كريم',
      userInitials: 'AK',
      affectedField: 'حالة التفعيل التشغيلي',
      previousValue: 'نشطة / تشغيلية',
      newValue: `مشطوبة ومجمدة (السبب: ${reason})`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Reactivate unit handler
  const handleReactivateUnit = (unitCode: string) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.code === unitCode) {
          return {
            ...u,
            status: 'active' as const,
            decommissionedAt: undefined,
            decommissionReason: undefined,
            lastUpdated: 'الآن',
          };
        }
        return u;
      })
    );

    const newLog: AuditLogItem = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      unitCode: unitCode,
      timestamp: toArabicDigits(new Date().toLocaleString('ar-IQ')),
      action: 'إعادة تفعيل منشأة مشطوبة',
      user: 'أحمد كريم',
      userInitials: 'AK',
      affectedField: 'حالة التفعيل التشغيلي',
      previousValue: 'مشطوبة ومجمدة',
      newValue: 'نشطة / تشغيلية',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
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
    setMaintenanceRequests((prev) => [req, ...prev]);
  };

  // Open maintenance modal for specific unit
  const handleOpenMaintenanceForUnit = (code: string) => {
    setMaintenanceUnitCode(code);
    setShowNewMaintenanceModal(true);
  };

  // Open dossier report modal
  const handleOpenDossier = (unit: UnitAsset) => {
    setDossierUnit(unit);
    setShowDossierModal(true);
  };

  // Periodic Inspection Handlers
  const handleAddPeriodicInspection = (schedule: PeriodicInspectionSchedule) => {
    setPeriodicInspections((prev) => [schedule, ...prev]);
  };

  const handleUpdatePeriodicInspection = (updated: PeriodicInspectionSchedule) => {
    setPeriodicInspections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeletePeriodicInspection = (id: string) => {
    setPeriodicInspections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCompletePeriodicInspection = (
    id: string,
    outcome: {
      completionDate: string;
      grade: ConditionGrade;
      findings: string;
      recommendations: string;
      autoScheduleNext: boolean;
      reportFileName?: string;
      reportFileUrl?: string;
      createMaintenance?: boolean;
      maintenanceIssue?: string;
      maintenancePriority?: 'critical' | 'normal' | 'low';
      maintenanceAssignedTo?: string;
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
        assignedTo: outcome.maintenanceAssignedTo || 'فريق الصيانة الميدانية',
        status: 'open',
        createdAt: outcome.maintenanceDate || outcome.completionDate,
        reportedBy: existing.inspectorName || 'موظف الإدخال (معاينة دورية)',
        details: `صادر عن كشف المعاينة ${existing.id}. التقييم الممنوح: ${outcome.grade}. التوصيات: ${outcome.recommendations || 'لا يوجد'}`,
        sourceInspectionId: existing.id,
      };
      setMaintenanceRequests((prev) => [newReq, ...prev]);
    }

    // Mark existing as completed
    const updatedExisting: PeriodicInspectionSchedule = {
      ...existing,
      status: 'completed',
      completionDate: outcome.completionDate,
      conditionGradeGiven: outcome.grade,
      findings: outcome.findings,
      recommendations: outcome.recommendations,
      reportFileName: outcome.reportFileName,
      reportFileUrl: outcome.reportFileUrl,
      createdMaintenanceRequestId: createdMaintId,
    };

    // Update unit condition grade
    setUnits((prev) =>
      prev.map((u) => (u.code === existing.unitCode ? { ...u, conditionGrade: outcome.grade } : u))
    );

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
        createdAt: new Date().toISOString().split('T')[0],
      };
      nextSchedules.push(newNextSchedule);
    }

    setPeriodicInspections((prev) => [
      ...nextSchedules,
      ...prev.map((s) => (s.id === id ? updatedExisting : s)),
    ]);
  };

  const handleUpdateMaintenanceRequest = (updatedReq: MaintenanceRequest) => {
    setMaintenanceRequests((prev) =>
      prev.map((r) => (r.id === updatedReq.id ? updatedReq : r))
    );
  };

  const handleDeleteMaintenanceRequest = (id: string) => {
    setMaintenanceRequests((prev) => prev.filter((r) => r.id !== id));
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
        onLogin={handleLogin}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  const currentUserRole = currentUser.role || 'مستخدم';
  const isRoleAdmin = currentUserRole === 'مدير النظام' || currentUserRole === 'admin';
  const isRoleOperator = currentUserRole === 'مشغل النظام' || currentUserRole === 'operator';
  const isRoleUser = currentUserRole === 'مستخدم' || currentUserRole === 'user';

  return (
    <div
      dir="rtl"
      className={`min-h-screen font-sans antialiased selection:bg-amber-500 selection:text-slate-950 transition-colors duration-300 ${
        theme === 'light' ? 'light bg-slate-100 text-slate-900' : 'dark bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navigation Header */}
      <Header
        onOpenNewAssetModal={!isRoleUser ? () => setActiveTab('new_unit') : undefined}
        onOpenNewMaintenanceModal={
          !isRoleUser
            ? () => {
                setMaintenanceUnitCode(selectedUnitCode);
                setShowNewMaintenanceModal(true);
              }
            : undefined
        }
        searchTerm={globalSearchTerm}
        onSearchChange={setGlobalSearchTerm}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        branding={branding}
        currentUser={currentUser}
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
      />

      {/* Main Body Layout: Sidebar + Dynamic Main Content */}
      <div className="flex w-full px-2 md:px-4">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          branding={branding}
          unitsCount={units.length}
          occupancyPercentage={currentOccupancyRate}
          maintenanceCount={maintenanceRequests.length}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          theme={theme}
          currentUserRole={currentUserRole}
        />

        <main className="flex-1 p-3 md:p-5 min-w-0 overflow-x-hidden space-y-4 md:space-y-5">
          {/* Mobile Navigation Pills */}
          <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold border-b border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
              }`}
            >
              لوحة القيادة
            </button>
            <button
              onClick={() => setActiveTab('units')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeTab === 'units' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
              }`}
            >
              الوحدات و 3D
            </button>
            {!isRoleUser && (
              <button
                onClick={() => setActiveTab('new_unit')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                  activeTab === 'new_unit' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                }`}
              >
                + تسجيل جديد
              </button>
            )}
            {!isRoleUser && (
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                  activeTab === 'maintenance' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                }`}
              >
                الصيانة
              </button>
            )}
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeTab === 'reports' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
              }`}
            >
              التقارير
            </button>
            {isRoleAdmin && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                  activeTab === 'settings' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                }`}
              >
                إعدادات النظام
              </button>
            )}
          </div>

          {/* Active View Router */}
          {activeTab === 'dashboard' && (
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

          {activeTab === 'units' && (
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

          {activeTab === 'new_unit' && !isRoleUser && (
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

          {activeTab === 'periodic_inspection' && !isRoleUser && (
            <PeriodicInspectionView
              schedules={periodicInspections}
              units={units}
              governorates={governorates}
              oilfields={oilfields}
              maintenanceRequests={maintenanceRequests}
              onAddSchedule={handleAddPeriodicInspection}
              onUpdateSchedule={handleUpdatePeriodicInspection}
              onDeleteSchedule={handleDeletePeriodicInspection}
              onCompleteInspection={handleCompletePeriodicInspection}
              onUpdateMaintenanceRequest={handleUpdateMaintenanceRequest}
              onNavigateTab={setActiveTab}
              theme={theme}
            />
          )}

          {activeTab === 'maintenance' && !isRoleUser && (
            <MaintenanceView
              requests={maintenanceRequests}
              units={units}
              onOpenNewMaintenanceModal={() => {
                setMaintenanceUnitCode(selectedUnitCode);
                setShowNewMaintenanceModal(true);
              }}
              onUpdateMaintenanceRequest={handleUpdateMaintenanceRequest}
              onDeleteMaintenanceRequest={handleDeleteMaintenanceRequest}
              theme={theme}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              units={units}
              periodicInspections={periodicInspections}
              maintenanceRequests={maintenanceRequests}
              governorates={governorates}
              oilfields={oilfields}
              orgEntities={orgEntities}
              theme={theme}
              branding={branding}
            />
          )}

          {activeTab === 'settings' && isRoleAdmin && (
            <SettingsView
              units={units}
              branding={branding}
              users={users}
              unitTypes={unitTypes}
              governorates={governorates}
              oilfields={oilfields}
              sites={sites}
              roomTypes={roomTypes}
              equipmentTypes={equipmentTypes}
              auditLogs={auditLogs}
              orgEntities={orgEntities}
              onAddOrgEntity={handleAddOrgEntity}
              onUpdateOrgEntity={handleUpdateOrgEntity}
              onDeleteOrgEntity={handleDeleteOrgEntity}
              onToggleOrgEntityStatus={handleToggleOrgEntityStatus}
              onResetOrgEntitiesToDefault={handleResetOrgEntitiesToDefault}
              onUpdateBranding={setBranding}
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

      {/* Maintenance Request Modal */}
      {showNewMaintenanceModal && (
        <NewMaintenanceModal
          units={units}
          initialUnitCode={maintenanceUnitCode}
          onAddRequest={handleAddMaintenanceRequest}
          onClose={() => setShowNewMaintenanceModal(false)}
          isLight={theme === 'light'}
        />
      )}

      {/* Export Technical Dossier PDF Modal */}
      {showDossierModal && dossierUnit && (
        <ExportDossierModal unit={dossierUnit} branding={branding} onClose={() => setShowDossierModal(false)} />
      )}
    </div>
  );
}

export default App;
