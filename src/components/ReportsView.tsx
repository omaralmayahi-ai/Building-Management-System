import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Filter,
  RotateCcw,
  Search,
  Calendar,
  Building2,
  MapPin,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  CalendarCheck,
  Box,
  TrendingUp,
  FileCheck,
  ChevronDown,
  Layers,
  Archive,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  Users,
  Network,
} from 'lucide-react';
import {
  UnitAsset,
  PeriodicInspectionSchedule,
  MaintenanceRequest,
  GovernorateRef,
  OilfieldRef,
  ConditionGrade,
  InspectionStatus,
  MaintenanceStatus,
  MaintenancePriority,
  OrgEntity,
  SystemBranding,
  SystemUser,
  ReportAttachment,
} from '../types';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import {
  INITIAL_GOVERNORATES,
  INITIAL_OILFIELDS,
  INITIAL_USERS,
  INITIAL_ORG_ENTITIES,
} from '../data/mockData';
import { OrgEntityPickerModal } from './OrgEntityPickerModal';
import {
  toArabicDigits,
  formatDateOnly,
  getCompletionOrCancellationDate,
  calculateMaintenanceDurationDays,
  getServerNow,
  getServerDateFormatted,
  getServerDateTimeFormatted,
} from '../utils/arabicUtils';

// Arabic Translation & Format Helpers for Reports & Export/Print Tables
const GOVERNORATE_ARABIC_MAP: Record<string, string> = {
  wasit: 'محافظة واسط',
  baghdad: 'محافظة بغداد',
  diyala: 'محافظة ديالى',
  basra: 'محافظة البصرة',
  maysan: 'محافظة ميسان',
  kirkuk: 'محافظة كركوك',
  nineveh: 'محافظة نينوى',
  erbil: 'محافظة أربيل',
  sulaymaniyah: 'محافظة السليمانية',
  duhok: 'محافظة دهوك',
  anbar: 'محافظة الأنبار',
  najaf: 'محافظة النجف الأشرف',
  karbala: 'محافظة كربلاء المقدسة',
  babil: 'محافظة بابل',
  qadisiyyah: 'محافظة القادسية',
  muthanna: 'محافظة المثنى',
  dhiqar: 'محافظة ذي قار',
  'dhi qar': 'محافظة ذي قار',
  salahaldin: 'محافظة صلاح الدين',
  'salah al-din': 'محافظة صلاح الدين',
};

const FIELD_ARABIC_MAP: Record<string, string> = {
  ahdab: 'حقل الأحدب النفطي',
  'al-ahdab': 'حقل الأحدب النفطي',
  'east baghdad': 'حقل شرق بغداد',
  eastbaghdad: 'حقل شرق بغداد',
  badra: 'حقل بدرة',
  maysan: 'حقول ميسان',
  'naft khana': 'حقل نفط خانة',
  naftkhana: 'حقل نفط خانة',
  rumaila: 'حقل الرميلة',
  mansuriya: 'حقل المنصورية الغازي',
  akashat: 'حقل عكاشات',
  majnoon: 'حقل مجنون',
  halfaya: 'حقل الحلفاية',
  'west qurna': 'حقل غرب القرنة',
  zubair: 'حقل الزبير',
  kirkuk: 'حقول كركوك',
  baiji: 'مصفى ومنشآت بيجي',
};

const translateGovernorate = (gov?: string): string => {
  if (!gov) return '-';
  const key = gov.toLowerCase().trim();
  return GOVERNORATE_ARABIC_MAP[key] || gov;
};

const translateField = (field?: string): string => {
  if (!field) return '-';
  const key = field.toLowerCase().trim();
  return FIELD_ARABIC_MAP[key] || field;
};

const translateUnitType = (type?: string): string => {
  if (!type) return '-';
  const t = type.toLowerCase().trim();
  if (t === 'building') return 'مبنى خرساني / منشأة';
  if (t === 'caravan') return 'كرفان / وحدة متنقلة';
  if (t === 'warehouse') return 'مستودع / مخزن';
  if (t === 'equipment') return 'معدة هندسية';
  if (t === 'safety_system') return 'منظومة سلامة';
  if (t === 'storage_tank') return 'خزان تشغيلي';
  return type;
};

const translateFrequency = (freq?: string): string => {
  if (!freq) return '-';
  const f = freq.toLowerCase().trim();
  if (f === 'monthly') return 'شهري';
  if (f === 'quarterly') return 'ربع سنوي';
  if (f === 'semi_annual' || f === 'semiannual' || f === 'half_yearly') return 'نصف سنوي';
  if (f === 'annual' || f === 'yearly') return 'سنوي';
  if (f === 'weekly') return 'أسبوعي';
  if (f === 'daily') return 'يومي';
  if (f === 'biennial') return 'كل سنتين';
  if (f === 'custom') return 'مخصص';
  return freq;
};

const translateInspectionType = (type?: string): string => {
  if (!type) return '-';
  const t = type.toLowerCase().trim();
  if (t === 'routine') return 'دوري اعتيادي';
  if (t === 'structural') return 'إنشائي وهيكلي';
  if (t === 'safety' || t === 'safety_hse') return 'سلامة وبيئة (HSE)';
  if (t === 'electrical') return 'كهربائي';
  if (t === 'mechanical') return 'ميكانيكي';
  if (t === 'mechanical_electrical') return 'ميكانيكي وكهربائي';
  if (t === 'architectural') return 'معماري';
  if (t === 'civil') return 'مدني';
  if (t === 'comprehensive') return 'شامل';
  return type;
};

const translatePriority = (prio?: string): string => {
  if (!prio) return '-';
  const p = prio.toLowerCase().trim();
  if (p === 'critical' || p === 'urgent') return 'حرج جداً وعاجل';
  if (p === 'high') return 'عالي الأهمية';
  if (p === 'normal' || p === 'medium') return 'متوسط الأهمية';
  if (p === 'low') return 'منخفض الأهمية';
  return prio;
};

const translateInspectionStatus = (status?: string): string => {
  if (!status) return '-';
  const s = status.toLowerCase().trim();
  if (s === 'completed') return 'مكتمل وموثق';
  if (s === 'overdue') return 'متأخر';
  if (s === 'scheduled') return 'مجدول';
  if (s === 'in_progress') return 'قيد الفحص والتدقيق';
  if (s === 'cancelled') return 'ملغى';
  return status;
};

const translateMaintenanceStatus = (status?: string): string => {
  if (!status) return '-';
  const s = status.toLowerCase().trim();
  if (s === 'completed') return 'منجز ومغلق';
  if (s === 'rejected') return 'مرفوض';
  if (s === 'cancelled') return 'ملغى';
  if (s === 'overdue') return 'متأخر عن الموعد';
  if (s === 'in_progress') return 'قيد المعالجة والتنفيذ';
  if (s === 'assigned') return 'مكلف ومسند';
  if (s === 'open') return 'مفتوح جديد';
  return status;
};

const formatGradeArabic = (grade?: string): string => {
  if (!grade) return '-';
  const g = grade.toUpperCase().trim();
  if (g === 'A') return 'الدرجة A (ممتاز)';
  if (g === 'B') return 'الدرجة B (جيد جداً)';
  if (g === 'C') return 'الدرجة C (متوسط)';
  if (g === 'D') return 'الدرجة D (حرج / متضرر)';
  return `الدرجة ${grade}`;
};

const getCleanInspectorName = (inspector?: string, performedBy?: string, users?: SystemUser[]): string => {
  const raw = (performedBy || inspector || '').trim();
  if (!raw) return 'موظف الكشف';

  // Check matching user in system users list
  const userList = users && users.length > 0 ? users : INITIAL_USERS;
  const matchedUser = userList.find((u) => {
    if (u.name === raw || u.username === raw || u.id === raw) return true;
    const cleanUName = u.name.replace(/\s*\([^)]*\)/g, '').trim();
    const cleanRaw = raw.replace(/\s*\([^)]*\)/g, '').trim();
    return (
      cleanUName === cleanRaw ||
      (cleanRaw.length > 2 && cleanUName.includes(cleanRaw)) ||
      (cleanRaw.length > 2 && cleanRaw.includes(cleanUName))
    );
  });

  if (matchedUser) {
    const cleanName = matchedUser.name.replace(/\s*\([^)]*\)/g, '').trim();
    if (
      matchedUser.role === 'موظف الكشف والصيانة' ||
      matchedUser.role.includes('كشف') ||
      matchedUser.role.includes('مفتش')
    ) {
      return cleanName ? `موظف الكشف: ${cleanName}` : 'موظف الكشف';
    }
    if (matchedUser.role === 'مشغل النظام' || matchedUser.role.includes('مشغل')) {
      return cleanName ? `مشغل النظام: ${cleanName}` : 'مشغل النظام';
    }
    if (matchedUser.role === 'مدير النظام' || matchedUser.role.includes('مدير')) {
      return cleanName ? `مدير النظام: ${cleanName}` : 'مدير النظام';
    }
    return cleanName ? `${matchedUser.role || 'مستخدم'}: ${cleanName}` : (matchedUser.role || 'مستخدم');
  }

  // String matching heuristics fallback
  if (
    raw.includes('مشغل') ||
    raw.includes('operator') ||
    raw.includes('سيف الدين') ||
    raw.includes('علي حسن')
  ) {
    let clean = raw.replace(/\s*\([^)]*مشغل[^)]*\)/g, '').trim();
    clean = clean.replace(/^(?:مشغل النظام|مشغل)\s*[:\-\/]?\s*/g, '').trim();
    return (clean && clean !== 'مشغل النظام' && clean !== 'مشغل') ? `مشغل النظام: ${clean}` : 'مشغل النظام';
  }

  if (
    raw.includes('مدير') ||
    raw.includes('admin') ||
    raw.includes('أحمد كريم')
  ) {
    let clean = raw.replace(/\s*\([^)]*مدير[^)]*\)/g, '').trim();
    clean = clean.replace(/^(?:مدير النظام|مدير)\s*[:\-\/]?\s*/g, '').trim();
    return (clean && clean !== 'مدير النظام' && clean !== 'مدير') ? `مدير النظام: ${clean}` : 'مدير النظام';
  }

  if (
    raw.includes('كشف') ||
    raw.includes('مفتش') ||
    raw.includes('حيدر') ||
    raw.includes('صباح') ||
    raw.includes('فحص') ||
    raw.includes('مهندس الموقع')
  ) {
    let clean = raw.replace(/\s*\([^)]*(?:شعبة|قسم|فريق|هندسي|تفتيش|كشف|صيانة|مفتش|فحص|مهندس الموقع)[^)]*\)/g, '').trim();
    clean = clean.replace(/^(?:موظف الكشف|موظف كشف|مهندس الموقع|مفتش)\s*[:\-\/]?\s*/g, '').trim();
    return (clean && clean !== 'موظف الكشف') ? `موظف الكشف: ${clean}` : 'موظف الكشف';
  }

  const cleaned = raw.replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned ? `موظف الكشف: ${cleaned}` : 'موظف الكشف';
};

const getCleanReporterName = (reportedBy?: string): string => {
  const raw = (reportedBy || '').trim();
  if (!raw) return 'مشغل النظام';
  if (
    raw === 'شعبة الفحص الهندسي والسلامة الإنشائية' ||
    raw === 'شعبة الصيانة والتشغيل' ||
    raw === 'فريق الصيانة الميدانية بالموقع'
  ) {
    return 'موظف الكشف';
  }
  return raw;
};

interface ReportsViewProps {
  units: UnitAsset[];
  periodicInspections: PeriodicInspectionSchedule[];
  maintenanceRequests: MaintenanceRequest[];
  governorates?: GovernorateRef[];
  oilfields?: OilfieldRef[];
  orgEntities?: OrgEntity[];
  users?: SystemUser[];
  currentUser?: SystemUser | null;
  theme?: 'dark' | 'light';
  branding?: SystemBranding;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  units,
  periodicInspections,
  maintenanceRequests,
  governorates = [],
  oilfields = [],
  orgEntities = [],
  users = [],
  currentUser = null,
  theme = 'dark',
  branding,
}) => {
  const isLight = theme === 'light';

  // Maintenance Employee check & restrictions
  const isRoleMaintenance = currentUser?.role === 'موظف الصيانة' || currentUser?.role === 'maintenance_employee';
  const userMaintDept = currentUser?.maintenanceDepartment || '';

  // Category Tab
  const [activeTab, setActiveTab] = useState<'all' | 'inspections' | 'maintenance' | 'units' | 'decommissioned'>(() => {
    return isRoleMaintenance ? 'maintenance' : 'all';
  });

  useEffect(() => {
    if (isRoleMaintenance && activeTab !== 'maintenance') {
      setActiveTab('maintenance');
    }
  }, [isRoleMaintenance, activeTab]);

  // Attachment Viewer Preview State
  const [previewAttachment, setPreviewAttachment] = useState<any>(null);

  // Multi-Filters State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedField, setSelectedField] = useState('all');
  const [selectedGovernorate, setSelectedGovernorate] = useState('all');
  const [selectedOrgEntity, setSelectedOrgEntity] = useState('all');
  const [showOrgPickerModal, setShowOrgPickerModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedInspectionStatus, setSelectedInspectionStatus] = useState<string>('all');
  const [selectedMaintenanceStatus, setSelectedMaintenanceStatus] = useState<string>('all');
  const [selectedOccupancyFilter, setSelectedOccupancyFilter] = useState<'all' | 'has_vacant' | 'fully_vacant' | 'fully_occupied'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [presetFilter, setPresetFilter] = useState<'all' | 'current_month' | 'current_quarter' | 'current_year' | 'vacant_rooms_only'>('all');

  // Modal Print Preview State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);

  // Reset page to 1 when modal opens or tab/filters change
  useEffect(() => {
    setPreviewPage(1);
  }, [showPrintModal, activeTab, searchKeyword, selectedField, selectedGovernorate, selectedOrgEntity, selectedGrade, selectedInspectionStatus, selectedMaintenanceStatus, selectedOccupancyFilter, dateFrom, dateTo, presetFilter]);

  // Governorate normalization & label mapping
  const GOVERNORATE_DEFINITIONS = useMemo(() => [
    { key: 'wasit', label: 'محافظة واسط', aliases: ['wasit', 'واسط', 'محافظة واسط', 'gov-wasit', 'ws'] },
    { key: 'basra', label: 'محافظة البصرة', aliases: ['basra', 'البصرة', 'بصرة', 'محافظة البصرة', 'gov-basra', 'bsr'] },
    { key: 'baghdad', label: 'محافظة بغداد', aliases: ['baghdad', 'بغداد', 'محافظة بغداد', 'gov-baghdad', 'ebd'] },
    { key: 'maysan', label: 'محافظة ميسان', aliases: ['maysan', 'ميسان', 'محافظة ميسان', 'gov-maysan', 'mys'] },
    { key: 'diyala', label: 'محافظة ديالى', aliases: ['diyala', 'ديالى', 'محافظة ديالى', 'gov-diyala', 'diy'] },
    { key: 'kirkuk', label: 'محافظة كركوك', aliases: ['kirkuk', 'كركوك', 'محافظة كركوك', 'gov-kirkuk', 'krk'] },
  ], []);

  const getCanonicalGovKey = useCallback((val?: string): string => {
    if (!val) return '';
    const lower = val.trim().toLowerCase();
    for (const item of GOVERNORATE_DEFINITIONS) {
      if (item.aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
        return item.key;
      }
    }
    return lower;
  }, [GOVERNORATE_DEFINITIONS]);

  // Field normalization & label mapping
  const FIELD_DEFINITIONS = useMemo(() => [
    { key: 'ahdab', label: 'حقل الأحدب النفطي', aliases: ['ahdab', 'الأحدب', 'احدب', 'حقل الأحدب', 'fld-ahdab', 'ahd'] },
    { key: 'badra', label: 'حقل بدرة النفطي', aliases: ['badra', 'بدرة', 'حقل بدرة', 'fld-badra', 'bdr'] },
    { key: 'east_baghdad', label: 'حقل شرق بغداد', aliases: ['east baghdad', 'شرق بغداد', 'حقل شرق بغداد', 'fld-east-baghdad', 'ebd'] },
    { key: 'naft_khana', label: 'حقل نفت خانة', aliases: ['naft khana', 'نفت خانة', 'حقل نفت خانة', 'fld-naft-khana', 'nk'] },
    { key: 'rumaila', label: 'حقل الرميلة', aliases: ['rumaila', 'الرميلة', 'رميلة', 'حقل الرميلة', 'fld-rumaila', 'rml'] },
    { key: 'maysan', label: 'حقول ميسان', aliases: ['maysan', 'ميسان', 'حقول ميسان', 'fld-maysan', 'mys'] },
  ], []);

  const getCanonicalFieldKey = useCallback((val?: string): string => {
    if (!val) return '';
    const lower = val.trim().toLowerCase();
    for (const item of FIELD_DEFINITIONS) {
      if (item.aliases.some((alias) => lower.includes(alias.toLowerCase()))) {
        return item.key;
      }
    }
    return lower;
  }, [FIELD_DEFINITIONS]);

  // Active Governorates in system
  const activeGovernoratesList = useMemo(() => {
    const list = governorates && governorates.length > 0 ? governorates : INITIAL_GOVERNORATES;
    return list.filter((g) => g.status === 'active');
  }, [governorates]);

  // Active Oilfields in system
  const activeOilfieldsList = useMemo(() => {
    const list = oilfields && oilfields.length > 0 ? oilfields : INITIAL_OILFIELDS;
    return list.filter((f) => f.status === 'active');
  }, [oilfields]);

  // Displayed Oilfields filtered by selected governorate
  const displayedOilfieldsList = useMemo(() => {
    if (selectedGovernorate === 'all') {
      return activeOilfieldsList;
    }
    const selectedGovObj = activeGovernoratesList.find((g) => g.id === selectedGovernorate);
    return activeOilfieldsList.filter((f) => {
      if (f.governorateId === selectedGovernorate) return true;
      if (selectedGovObj) {
        if (f.governorateId === selectedGovObj.id) return true;
        if (getCanonicalGovKey(f.governorateId) === getCanonicalGovKey(selectedGovObj.nameAr)) return true;
      }
      return false;
    });
  }, [activeOilfieldsList, selectedGovernorate, activeGovernoratesList, getCanonicalGovKey]);

  // Handle Governorate Selection Change
  const handleGovernorateChange = (govId: string) => {
    setSelectedGovernorate(govId);
    if (govId === 'all') return;

    if (selectedField !== 'all') {
      const selectedGovObj = activeGovernoratesList.find((g) => g.id === govId);
      const fieldBelongs = activeOilfieldsList.some(
        (f) =>
          f.id === selectedField &&
          (f.governorateId === govId ||
            (selectedGovObj && (f.governorateId === selectedGovObj.id || getCanonicalGovKey(f.governorateId) === getCanonicalGovKey(selectedGovObj.nameAr))))
      );
      if (!fieldBelongs) {
        setSelectedField('all');
      }
    }
  };

  const matchesGovernorate = useCallback(
    (itemGov?: string, selectedGovId?: string) => {
      if (!selectedGovId || selectedGovId === 'all') return true;
      if (!itemGov) return false;

      const selectedGovObj = activeGovernoratesList.find((g) => g.id === selectedGovId);
      if (selectedGovObj) {
        if (
          itemGov === selectedGovObj.id ||
          itemGov === selectedGovObj.nameAr ||
          itemGov === selectedGovObj.nameEn ||
          itemGov === selectedGovObj.code
        ) {
          return true;
        }
        return getCanonicalGovKey(itemGov) === getCanonicalGovKey(selectedGovObj.nameAr);
      }
      return getCanonicalGovKey(itemGov) === getCanonicalGovKey(selectedGovId);
    },
    [activeGovernoratesList, getCanonicalGovKey]
  );

  const matchesField = useCallback(
    (itemField?: string, selectedFieldId?: string) => {
      if (!selectedFieldId || selectedFieldId === 'all') return true;
      if (!itemField) return false;

      const selectedFieldObj = activeOilfieldsList.find((f) => f.id === selectedFieldId);
      if (selectedFieldObj) {
        if (
          itemField === selectedFieldObj.id ||
          itemField === selectedFieldObj.nameAr ||
          itemField === selectedFieldObj.nameEn ||
          itemField === selectedFieldObj.code
        ) {
          return true;
        }
        return getCanonicalFieldKey(itemField) === getCanonicalFieldKey(selectedFieldObj.nameAr);
      }
      return getCanonicalFieldKey(itemField) === getCanonicalFieldKey(selectedFieldId);
    },
    [activeOilfieldsList, getCanonicalFieldKey]
  );

  // Effective Org Entities (with fallback to INITIAL_ORG_ENTITIES so it never empties)
  const effectiveOrgEntities = useMemo(() => {
    if (Array.isArray(orgEntities) && orgEntities.length > 0) {
      return orgEntities;
    }
    return INITIAL_ORG_ENTITIES;
  }, [orgEntities]);

  // Available Org Entities list
  const availableOrgEntities = useMemo(() => {
    const set = new Set<string>();
    effectiveOrgEntities.forEach((e) => {
      if (e.status !== 'disabled' && e.nameAr) {
        set.add(e.nameAr.trim());
      }
    });
    units.forEach((u) => {
      if (u.department) set.add(u.department.trim());
      u.rooms?.forEach((r) => {
        if (r.occupiedBy) set.add(r.occupiedBy.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [effectiveOrgEntities, units]);

  // Unit lookup map for fast checks
  const unitByCode = useMemo(() => {
    const map = new Map<string, UnitAsset>();
    units.forEach((u) => map.set(u.code, u));
    return map;
  }, [units]);

  // Match Org Entity helper
  const matchesOrgEntity = useCallback(
    (deptOrUnitCode?: string, isUnitCode = false, extraDept?: string) => {
      if (!selectedOrgEntity || selectedOrgEntity === 'all') return true;

      if (isUnitCode && deptOrUnitCode) {
        const unit = unitByCode.get(deptOrUnitCode);
        if (unit) {
          if (unit.department === selectedOrgEntity) return true;
          if (unit.departments?.includes(selectedOrgEntity)) return true;
          if (unit.department?.includes(selectedOrgEntity)) return true;
          if (unit.rooms?.some((r) => r.occupiedBy === selectedOrgEntity)) return true;
        }
      }

      if (deptOrUnitCode) {
        if (deptOrUnitCode === selectedOrgEntity) return true;
        if (deptOrUnitCode.includes(selectedOrgEntity)) return true;
      }
      if (extraDept) {
        if (extraDept === selectedOrgEntity) return true;
        if (extraDept.includes(selectedOrgEntity)) return true;
      }

      return false;
    },
    [selectedOrgEntity, unitByCode]
  );

  // Calculate detailed occupancy statistics for a unit and an entity
  const getUnitOccupancyStats = useCallback((u: UnitAsset, targetEntity: string) => {
    const deptsSet = new Set<string>();
    if (u.departments && u.departments.length > 0) {
      u.departments.forEach((d) => d && d.trim() && deptsSet.add(d.trim()));
    }
    if (u.department && u.department.trim()) {
      u.department
        .split(/[\n،,;/|]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((d) => deptsSet.add(d));
    }
    u.rooms?.forEach((r) => {
      if (r.occupiedBy && r.occupiedBy.trim()) {
        deptsSet.add(r.occupiedBy.trim());
      }
    });
    const allOccupants = Array.from(deptsSet);
    if (allOccupants.length === 0) allOccupants.push(u.department || 'غير محدد');

    const totalRooms = u.rooms?.length || 0;
    const allUnitRooms = u.rooms || [];

    const vacantRooms = allUnitRooms.filter(
      (r) =>
        !r.occupiedBy ||
        !r.occupiedBy.trim() ||
        r.occupiedBy === 'شاغر' ||
        r.occupiedBy === 'فارغ' ||
        r.occupiedBy === 'فارغة' ||
        r.occupiedBy === '-'
    );
    const occupiedRooms = allUnitRooms.filter(
      (r) =>
        r.occupiedBy &&
        r.occupiedBy.trim().length > 0 &&
        r.occupiedBy !== 'شاغر' &&
        r.occupiedBy !== 'فارغ' &&
        r.occupiedBy !== 'فارغة' &&
        r.occupiedBy !== '-'
    );

    if (!targetEntity || targetEntity === 'all') {
      return {
        entity: allOccupants.join(' ، '),
        allOccupants,
        occupiedRoomsCount: occupiedRooms.length,
        vacantRoomsCount: vacantRooms.length,
        totalRooms,
        occupiedRooms,
        vacantRooms,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms.length / totalRooms) * 100) : 0,
        isFilteredEntity: false,
      };
    }

    // Target entity is specified
    const explicitRooms = (u.rooms || []).filter((r) => r.occupiedBy === targetEntity);
    if (explicitRooms.length > 0) {
      return {
        entity: targetEntity,
        allOccupants,
        occupiedRoomsCount: explicitRooms.length,
        vacantRoomsCount: vacantRooms.length,
        totalRooms,
        occupiedRooms: explicitRooms,
        vacantRooms,
        occupancyRate: totalRooms > 0 ? Math.round((explicitRooms.length / totalRooms) * 100) : 0,
        isFilteredEntity: true,
      };
    }

    const isUnitOwner = u.department === targetEntity || (u.departments && u.departments.includes(targetEntity)) || (u.department && u.department.includes(targetEntity));
    if (isUnitOwner) {
      const assignedRooms = (u.rooms || []).filter((r) => !r.occupiedBy || r.occupiedBy === targetEntity);
      const count = assignedRooms.length > 0 ? assignedRooms.length : totalRooms;
      return {
        entity: targetEntity,
        allOccupants,
        occupiedRoomsCount: count,
        vacantRoomsCount: vacantRooms.length,
        totalRooms,
        occupiedRooms: assignedRooms.length > 0 ? assignedRooms : (u.rooms || []),
        vacantRooms,
        occupancyRate: totalRooms > 0 ? Math.round((count / totalRooms) * 100) : 0,
        isFilteredEntity: true,
      };
    }

    return {
      entity: targetEntity,
      allOccupants,
      occupiedRoomsCount: 0,
      vacantRoomsCount: vacantRooms.length,
      totalRooms,
      occupiedRooms: [],
      vacantRooms,
      occupancyRate: 0,
      isFilteredEntity: true,
    };
  }, []);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchKeyword('');
    setSelectedField('all');
    setSelectedGovernorate('all');
    setSelectedOrgEntity('all');
    setSelectedGrade('all');
    setSelectedInspectionStatus('all');
    setSelectedMaintenanceStatus('all');
    setSelectedOccupancyFilter('all');
    setDateFrom('');
    setDateTo('');
    setPresetFilter('all');
  };

  // Helper date checker
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return true;

    if (dateFrom) {
      const fromObj = new Date(dateFrom);
      if (dateObj < fromObj) return false;
    }

    if (dateTo) {
      const toObj = new Date(dateTo);
      toObj.setHours(23, 59, 59, 999);
      if (dateObj > toObj) return false;
    }

    // Apply presets
    const now = getServerNow();
    if (presetFilter === 'current_month') {
      return dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    }
    if (presetFilter === 'current_year') {
      return dateObj.getFullYear() === now.getFullYear();
    }
    if (presetFilter === 'current_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const itemQuarter = Math.floor(dateObj.getMonth() / 3);
      return itemQuarter === currentQuarter && dateObj.getFullYear() === now.getFullYear();
    }

    return true;
  };

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    if (isRoleMaintenance) return [];
    return periodicInspections.filter((item) => {
      const targetUnit = unitByCode.get(item.unitCode);

      // Keyword search
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchesCode = (item.unitCode || '').toLowerCase().includes(kw);
        const matchesName = (item.unitName || '').toLowerCase().includes(kw);
        const matchesTitle = (item.title || '').toLowerCase().includes(kw);
        const matchesTeam = (item.assignedTeam || '').toLowerCase().includes(kw);
        const matchesInspector = (item.inspectorName || '').toLowerCase().includes(kw);
        const matchesFindings = (item.findings || '').toLowerCase().includes(kw);
        const matchesUnitDept = (targetUnit?.department || '').toLowerCase().includes(kw);
        if (!matchesCode && !matchesName && !matchesTitle && !matchesTeam && !matchesInspector && !matchesFindings && !matchesUnitDept) {
          return false;
        }
      }

      // Field filter
      if (!matchesField(item.field, selectedField)) return false;

      // Governorate filter
      if (!matchesGovernorate(item.governorate, selectedGovernorate)) return false;

      // Org Entity filter
      if (!matchesOrgEntity(item.unitCode, true, item.assignedTeam)) return false;

      // Status filter
      if (selectedInspectionStatus !== 'all' && item.status !== selectedInspectionStatus) return false;

      // Grade filter
      if (selectedGrade !== 'all' && item.conditionGradeGiven !== selectedGrade) return false;

      // Date range check
      const dateToCheck = item.lastInspectionDate || item.nextDueDate || item.createdAt;
      if (!isDateInRange(dateToCheck)) return false;

      return true;
    });
  }, [
    isRoleMaintenance,
    periodicInspections,
    searchKeyword,
    selectedField,
    selectedGovernorate,
    selectedOrgEntity,
    selectedInspectionStatus,
    selectedGrade,
    presetFilter,
    dateFrom,
    dateTo,
    matchesField,
    matchesGovernorate,
    matchesOrgEntity,
    unitByCode,
  ]);

  // Filtered Maintenance Requests
  const filteredMaintenance = useMemo(() => {
    return maintenanceRequests.filter((item) => {
      // Role maintenance restriction to assigned department
      if (isRoleMaintenance && userMaintDept) {
        const itemDept = item.maintenanceDepartment || '';
        if (itemDept !== userMaintDept) return false;
      }

      const targetUnit = unitByCode.get(item.unitCode);

      // Keyword search
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchesId = (item.id || '').toLowerCase().includes(kw);
        const matchesCode = (item.unitCode || '').toLowerCase().includes(kw);
        const matchesIssue = (item.issue || '').toLowerCase().includes(kw);
        const matchesAssigned = (item.assignedTo || '').toLowerCase().includes(kw);
        const matchesReported = (item.reportedBy || '').toLowerCase().includes(kw);
        const matchesUnitDept = (targetUnit?.department || '').toLowerCase().includes(kw);
        const matchesMaintDept = (item.maintenanceDepartment || '').toLowerCase().includes(kw);
        if (!matchesId && !matchesCode && !matchesIssue && !matchesAssigned && !matchesReported && !matchesUnitDept && !matchesMaintDept) {
          return false;
        }
      }

      // Field filter
      if (!matchesField(item.field, selectedField)) return false;

      // Governorate filter
      if (!matchesGovernorate(item.governorate, selectedGovernorate)) return false;

      // Org Entity filter
      if (!matchesOrgEntity(item.unitCode, true, item.assignedTo)) return false;

      // Maintenance Status filter (منجز - مرفوض - ملغى - قيد المعالجة)
      if (selectedMaintenanceStatus !== 'all') {
        if (selectedMaintenanceStatus === 'completed') {
          if (item.status !== 'completed') return false;
        } else if (selectedMaintenanceStatus === 'rejected') {
          if (item.status !== 'rejected') return false;
        } else if (selectedMaintenanceStatus === 'cancelled') {
          if (item.status !== 'cancelled') return false;
        } else if (selectedMaintenanceStatus === 'in_progress') {
          if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'rejected') return false;
        }
      }

      // Date range check
      const dateToCheck = item.createdAt || item.slaDeadline;
      if (!isDateInRange(dateToCheck)) return false;

      return true;
    });
  }, [
    isRoleMaintenance,
    userMaintDept,
    maintenanceRequests,
    searchKeyword,
    selectedField,
    selectedGovernorate,
    selectedOrgEntity,
    selectedMaintenanceStatus,
    presetFilter,
    dateFrom,
    dateTo,
    matchesField,
    matchesGovernorate,
    matchesOrgEntity,
    unitByCode,
  ]);

  // Filtered Units
  const filteredUnits = useMemo(() => {
    if (isRoleMaintenance) return [];
    return units.filter((unit) => {
      if (unit.status === 'decommissioned') return false;

      // Keyword search
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchesCode = (unit.code || '').toLowerCase().includes(kw);
        const matchesAssetCode = (unit.fixedAssetCode || '').toLowerCase().includes(kw);
        const matchesName = (unit.name || '').toLowerCase().includes(kw);
        const matchesSite = (unit.siteName || '').toLowerCase().includes(kw);
        const matchesDept = (unit.department || '').toLowerCase().includes(kw);
        const matchesRoomOccupant = unit.rooms?.some((r) => (r.occupiedBy || '').toLowerCase().includes(kw));
        if (!matchesCode && !matchesAssetCode && !matchesName && !matchesSite && !matchesDept && !matchesRoomOccupant) {
          return false;
        }
      }

      // Field filter
      if (!matchesField(unit.field, selectedField)) return false;

      // Governorate filter
      if (!matchesGovernorate(unit.governorate, selectedGovernorate)) return false;

      // Org Entity filter
      if (!matchesOrgEntity(unit.department) && !unit.rooms?.some((r) => r.occupiedBy === selectedOrgEntity)) return false;

      // Grade filter
      if (selectedGrade !== 'all' && unit.conditionGrade !== selectedGrade) return false;

      // Occupancy / Vacancy filter
      const unitTotalRooms = unit.rooms?.length || 0;
      const unitVacantRooms = (unit.rooms || []).filter(
        (r) =>
          !r.occupiedBy ||
          !r.occupiedBy.trim() ||
          r.occupiedBy === 'شاغر' ||
          r.occupiedBy === 'فارغ' ||
          r.occupiedBy === 'فارغة' ||
          r.occupiedBy === '-'
      );
      const unitHasVacant = (unitTotalRooms > 0 && unitVacantRooms.length > 0) || unit.occupancyStatus === 'vacant';
      const unitIsFullyVacant = (unitTotalRooms > 0 && unitVacantRooms.length === unitTotalRooms) || unit.occupancyStatus === 'vacant';
      const unitIsFullyOccupied = unitTotalRooms > 0 && unitVacantRooms.length === 0 && unit.occupancyStatus !== 'vacant';

      if (presetFilter === 'vacant_rooms_only' && !unitHasVacant) return false;

      if (selectedOccupancyFilter === 'has_vacant' && !unitHasVacant) return false;
      if (selectedOccupancyFilter === 'fully_vacant' && !unitIsFullyVacant) return false;
      if (selectedOccupancyFilter === 'fully_occupied' && !unitIsFullyOccupied) return false;

      // Overdue / Critical preset
      if (presetFilter === 'critical_grade_d' && unit.conditionGrade !== 'D') return false;
      if (presetFilter === 'overdue_only' && unit.conditionGrade !== 'D' && unit.conditionGrade !== 'C') return false;

      // Date range check
      if (dateFrom || dateTo) {
        const dateToCheck = unit.lastUpdated || `${unit.constructionYear}-01-01`;
        if (!isDateInRange(dateToCheck)) return false;
      }

      return true;
    });
  }, [
    units,
    searchKeyword,
    selectedField,
    selectedGovernorate,
    selectedOrgEntity,
    selectedGrade,
    selectedOccupancyFilter,
    presetFilter,
    dateFrom,
    dateTo,
    matchesField,
    matchesGovernorate,
    matchesOrgEntity,
  ]);

  const decommissionedUnits = useMemo(() => {
    if (isRoleMaintenance) return [];
    return units.filter((unit) => {
      if (unit.status !== 'decommissioned') return false;

      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchesCode = (unit.code || '').toLowerCase().includes(kw);
        const matchesAssetCode = (unit.fixedAssetCode || '').toLowerCase().includes(kw);
        const matchesName = (unit.name || '').toLowerCase().includes(kw);
        const matchesReason = (unit.decommissionReason || '').toLowerCase().includes(kw);
        const matchesDept = (unit.department || '').toLowerCase().includes(kw);
        if (!matchesCode && !matchesAssetCode && !matchesName && !matchesReason && !matchesDept) return false;
      }

      if (!matchesField(unit.field, selectedField)) return false;
      if (!matchesGovernorate(unit.governorate, selectedGovernorate)) return false;
      if (!matchesOrgEntity(unit.department)) return false;

      return true;
    });
  }, [units, searchKeyword, selectedField, selectedGovernorate, selectedOrgEntity, matchesField, matchesGovernorate, matchesOrgEntity]);

  // Combined metrics for KPIs
  const totalFilteredRecords = useMemo(() => {
    if (activeTab === 'inspections') return filteredInspections.length;
    if (activeTab === 'maintenance') return filteredMaintenance.length;
    if (activeTab === 'units') return filteredUnits.length;
    if (activeTab === 'decommissioned') return decommissionedUnits.length;
    return filteredInspections.length + filteredMaintenance.length + filteredUnits.length + decommissionedUnits.length;
  }, [activeTab, filteredInspections, filteredMaintenance, filteredUnits, decommissionedUnits]);

  const overdueInspectionsCount = useMemo(() => {
    return filteredInspections.filter((i) => i.status === 'overdue').length;
  }, [filteredInspections]);

  const overdueMaintenanceCount = useMemo(() => {
    return filteredMaintenance.filter((m) => m.status === 'overdue' || (m.daysOverdue && m.daysOverdue > 0)).length;
  }, [filteredMaintenance]);

  const gradeDUnitsCount = useMemo(() => {
    return filteredUnits.filter((u) => u.conditionGrade === 'D').length;
  }, [filteredUnits]);

  const companyName = branding?.companyName || 'شركة نفط الوسط';
  const systemName = branding?.systemName || 'السجل الرقمي الموحد للأصول الهندسية والإنشائية';
  const ministryName = branding?.ministryName || 'وزارة النفط العراقية';
  const countryName = branding?.countryName || 'جمهورية العراق';
  const logoUrl = branding?.logoUrl;

  // Compute Active Report Title
  const reportTitle = useMemo(() => {
    switch (activeTab) {
      case 'inspections':
        return 'تقرير الكشوفات والمعاينة الدورية للأصول';
      case 'maintenance':
        return 'تقرير بلاغات متابعة الصيانة والتشغيل';
      case 'units':
        return 'تقرير حصر وتصنيف الوحدات والأصول الهندسية';
      case 'decommissioned':
        return 'تقرير سجل الوحدات المشطوبة والمجمدة';
      default:
        return 'التقرير التجميعي الشامل للأصول والكشوفات والصيانة';
    }
  }, [activeTab]);

  // Compute Dynamic KPI Cards tailored to active report domain and filtered data
  const reportKpis = useMemo(() => {
    switch (activeTab) {
      case 'maintenance': {
        const inProgressCount = filteredMaintenance.filter(
          (m) => m.status !== 'completed' && m.status !== 'rejected' && m.status !== 'cancelled'
        ).length;
        const completedCount = filteredMaintenance.filter((m) => m.status === 'completed').length;
        const criticalCount = filteredMaintenance.filter((m) => m.priority === 'critical').length;
        return [
          { label: 'إجمالي طلبات الصيانة', value: filteredMaintenance.length, color: '#78350f' },
          { label: 'قيد المعالجة والإنجاز', value: inProgressCount, color: '#d97706' },
          { label: 'بلاغات منجزة ومكتملة', value: completedCount, color: '#059669' },
          { label: 'بلاغات حرجة / طارئة', value: criticalCount, color: '#dc2626' },
        ];
      }
      case 'inspections': {
        const completedCount = filteredInspections.filter((i) => i.status === 'completed').length;
        const scheduledCount = filteredInspections.filter((i) => i.status === 'scheduled').length;
        const overdueOrCritical = filteredInspections.filter(
          (i) => i.status === 'overdue' || i.conditionGradeGiven === 'D'
        ).length;
        return [
          { label: 'إجمالي الكشوفات المسجلة', value: filteredInspections.length, color: '#78350f' },
          { label: 'كشوفات مكتملة وموثقة', value: completedCount, color: '#059669' },
          { label: 'كشوفات مجدولة قادمة', value: scheduledCount, color: '#0284c7' },
          { label: 'كشوفات متأخرة أو حرجة', value: overdueOrCritical, color: '#dc2626' },
        ];
      }
      case 'units': {
        const gradeABCount = filteredUnits.filter((u) => u.conditionGrade === 'A' || u.conditionGrade === 'B').length;
        const totalRooms = filteredUnits.reduce((acc, u) => acc + (u.rooms?.length || 0), 0);
        const totalOccupied = filteredUnits.reduce((acc, u) => acc + getUnitOccupancyStats(u, selectedOrgEntity).occupiedRoomsCount, 0);
        const totalVacant = filteredUnits.reduce((acc, u) => acc + getUnitOccupancyStats(u, selectedOrgEntity).vacantRoomsCount, 0);
        return [
          { label: 'إجمالي المنشآت والأصول', value: filteredUnits.length, color: '#78350f' },
          { label: 'إجمالي الغرف والمكاتب', value: totalRooms, color: '#0284c7' },
          { label: 'الغرف المشغولة', value: totalOccupied, color: '#059669' },
          { label: 'الغرف الشاغرة (فارغة)', value: totalVacant, color: '#d97706' },
        ];
      }
      case 'decommissioned': {
        const uniqueFields = new Set(decommissionedUnits.map((u) => u.field).filter(Boolean)).size;
        const uniqueDepts = new Set(decommissionedUnits.map((u) => u.department).filter(Boolean)).size;
        return [
          { label: 'إجمالي المنشآت المشطوبة', value: decommissionedUnits.length, color: '#9f1239' },
          { label: 'الحقول والمواقع المشمولة', value: uniqueFields, color: '#78350f' },
          { label: 'التشكيلات السابقة المشمولة', value: uniqueDepts, color: '#0284c7' },
          { label: 'الحالة الرسمية', textValue: 'مشطوبة ومجمدة', color: '#9f1239' },
        ];
      }
      default: {
        // Comprehensive Report ('all')
        const totalVacantAll = filteredUnits.reduce((acc, u) => acc + getUnitOccupancyStats(u, selectedOrgEntity).vacantRoomsCount, 0);
        return [
          { label: 'إجمالي الأصول والمنشآت', value: filteredUnits.length, color: '#78350f' },
          { label: 'غرف شاغرة (فارغة)', value: totalVacantAll, color: '#d97706' },
          { label: 'كشوفات ومعاينة دورية', value: filteredInspections.length, color: '#0284c7' },
          { label: 'طلبات وبلاغات الصيانة', value: filteredMaintenance.length, color: '#b45309' },
        ];
      }
    }
  }, [
    activeTab,
    filteredMaintenance,
    filteredInspections,
    filteredUnits,
    decommissionedUnits,
    selectedOrgEntity,
    getUnitOccupancyStats,
  ]);

  // Compute Active Filters Summary String for Printing and Reporting
  const activeFiltersSummary = useMemo(() => {
    const parts: string[] = [];

    // Include specific section filter if not comprehensive
    if (activeTab === 'inspections') {
      parts.push('نوع التقرير: الكشوفات والمعاينة الدورية');
    } else if (activeTab === 'maintenance') {
      parts.push('نوع التقرير: بلاغات وطلبات الصيانة ومتابعتها');
    } else if (activeTab === 'units') {
      parts.push('نوع التقرير: حصر وتصنيف الأصول والوحدات');
    } else if (activeTab === 'decommissioned') {
      parts.push('نوع التقرير: سجل الوحدات المشطوبة والمجمدة');
    }

    if (isRoleMaintenance && userMaintDept) {
      parts.push(`جهة الصيانة المعتمدة: ${userMaintDept}`);
    }

    if (selectedGovernorate !== 'all') {
      const govObj = activeGovernoratesList.find(
        (g) => g.id === selectedGovernorate || g.code === selectedGovernorate || g.nameAr === selectedGovernorate
      );
      parts.push(`المحافظة: ${govObj?.nameAr || translateGovernorate(selectedGovernorate) || selectedGovernorate}`);
    }

    if (selectedField !== 'all') {
      const fieldObj = activeOilfieldsList.find(
        (f) => f.id === selectedField || f.code === selectedField || f.nameAr === selectedField
      );
      parts.push(`الحقل النفطي: ${fieldObj?.nameAr || translateField(selectedField) || selectedField}`);
    }

    if (selectedOrgEntity !== 'all') {
      parts.push(`التشكيل الشاغل: ${selectedOrgEntity}`);
    }

    if (selectedOccupancyFilter !== 'all') {
      const occLabel =
        selectedOccupancyFilter === 'has_vacant'
          ? 'تحتوي على غرف شاغرة (فارغة)'
          : selectedOccupancyFilter === 'fully_vacant'
          ? 'شاغرة بالكامل (100% فارغة)'
          : 'مشغولة بالكامل (لا توجد غرف فارغة)';
      parts.push(`حالة الإشغال: ${occLabel}`);
    }

    if (selectedGrade !== 'all') {
      parts.push(`التقييم الإنشائي: ${formatGradeArabic(selectedGrade)}`);
    }

    if (selectedInspectionStatus !== 'all' && (activeTab === 'all' || activeTab === 'inspections')) {
      parts.push(`حالة الكشف: ${translateInspectionStatus(selectedInspectionStatus)}`);
    }

    if (selectedMaintenanceStatus !== 'all' && (activeTab === 'all' || activeTab === 'maintenance')) {
      parts.push(`حالة الصيانة: ${translateMaintenanceStatus(selectedMaintenanceStatus)}`);
    }

    if (dateFrom || dateTo) {
      parts.push(`الفترة: من ${toArabicDigits(dateFrom) || 'البداية'} إلى ${toArabicDigits(dateTo) || 'الآن'}`);
    } else if (presetFilter !== 'all') {
      const presetLabel =
        presetFilter === 'current_month'
          ? 'الشهر الحالي'
          : presetFilter === 'current_quarter'
          ? 'الربع الحالي'
          : presetFilter === 'current_year'
          ? 'السنة الحالية'
          : 'حصر الغرف الشاغرة (فارغة)';
      parts.push(`الفترة: ${presetLabel}`);
    }

    if (searchKeyword.trim()) {
      parts.push(`كلمة البحث: "${searchKeyword.trim()}"`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'شامل لجميع البيانات (بدون تصفية خاصة)';
  }, [
    activeTab,
    isRoleMaintenance,
    userMaintDept,
    selectedGovernorate,
    selectedField,
    selectedOrgEntity,
    selectedOccupancyFilter,
    selectedGrade,
    selectedInspectionStatus,
    selectedMaintenanceStatus,
    dateFrom,
    dateTo,
    presetFilter,
    searchKeyword,
    activeGovernoratesList,
    activeOilfieldsList,
    translateGovernorate,
    translateField,
    formatGradeArabic,
    translateInspectionStatus,
    translateMaintenanceStatus,
  ]);

  // Export to Excel / CSV according to selected report tab & applied filters with pure Arabic translation
  const handleExportCSV = () => {
    let content = '';
    let filename = '';
    const dateStr = new Date().toISOString().slice(0, 10);
    const bom = '\uFEFF'; // UTF-8 BOM for Excel Arabic support

    if (activeTab === 'inspections') {
      filename = `تقرير_الكشوفات_الدورية_والمعاينة_${dateStr}.csv`;
      content += 'كود الوحدة,اسم الوحدة,الحقل النفطي,المحافظة,نوع الكشف,عنوان وموضوع الكشف,دورية الكشف,تاريخ الكشف السابق,تاريخ الكشف القادم,القائم بالكشف,حالة الكشف,التقييم الإنشائي,الملاحظات والنتائج الفنية,التوصيات والإجراءات,المرفق والملفات\n';
      filteredInspections.forEach((i) => {
        content += `"${toArabicDigits(i.unitCode)}","${i.unitName || ''}","${translateField(i.field)}","${translateGovernorate(i.governorate)}","${translateInspectionType(i.inspectionType)}","${i.title}","${translateFrequency(i.frequency)}","${toArabicDigits(i.lastInspectionDate || 'غير مسجل')}","${toArabicDigits(i.nextDueDate)}","${getCleanInspectorName(i.inspectorName, i.performedByName, users)}","${translateInspectionStatus(i.status)}","${i.conditionGradeGiven ? formatGradeArabic(i.conditionGradeGiven) : '-'}","${(i.findings || i.notes || '').replace(/"/g, '""')}","${(i.recommendations || '').replace(/"/g, '""')}","${(i.reportFileName || (i.reportFileUrl ? 'ملف مرفق' : 'لا يوجد')).replace(/"/g, '""')}"\n`;
      });
    } else if (activeTab === 'maintenance') {
      filename = `تقرير_بلاغات_الصيانة_والتشغيل_${dateStr}.csv`;
      content += 'رقم الطلب,رمز المنشأة,جهة الصيانة,الحقل النفطي,المحافظة,وصف العطل والبلاغ,درجة الأهمية,محرر الطلب,تاريخ تسجيل البلاغ,تاريخ الإنجاز أو الإلغاء,مدة المعالجة (أيام),المرفق / الصورة,الحالة الحالية\n';
      filteredMaintenance.forEach((m) => {
        const u = units.find((unit) => unit.code === m.unitCode);
        const codeDisplay = m.roomCode ? `${toArabicDigits(m.unitCode)} [غرفة: ${toArabicDigits(m.roomCode)}]` : toArabicDigits(m.unitCode);
        content += `"${toArabicDigits(m.id)}","${codeDisplay}","${(m.maintenanceDepartment || 'الصيانة العامة').replace(/"/g, '""')}","${translateField(m.field)}","${translateGovernorate(u?.governorate || '')}","${m.issue.replace(/"/g, '""')}","${translatePriority(m.priority)}","${getCleanReporterName(m.reportedBy)}","${formatDateOnly(m.createdAt)}","${getCompletionOrCancellationDate(m.completedAt, m.status)}","${calculateMaintenanceDurationDays(m.createdAt, m.completedAt, m.status)}","${(m.attachmentName || (m.attachmentUrl ? 'صورة مرفقة' : 'لا يوجد')).replace(/"/g, '""')}","${translateMaintenanceStatus(m.status)}"\n`;
      });
    } else if (activeTab === 'units') {
      filename = `تقرير_حصر_الأصول_والوحدات_الهندسية_${dateStr}.csv`;
      content += 'رمز المنشأة,اسم المنشأة,نوع المنشأة,الحقل النفطي,المحافظة,التقييم الإنشائي,الجهة الشاغلة,الغرف المشغولة,الغرف الشاغرة (فارغة),إجمالي غرف الوحدة,سنة الإنشاء,المساحة الإجمالية (م²),عدد الطوابق,عدد المعدات\n';
      filteredUnits.forEach((u) => {
        const stats = getUnitOccupancyStats(u, selectedOrgEntity);
        const codeDisplay = u.fixedAssetCode ? `${toArabicDigits(u.code)} [أصل: ${u.fixedAssetCode}]` : toArabicDigits(u.code);
        content += `"${codeDisplay}","${u.name}","${translateUnitType(u.type)}","${translateField(u.field)}","${translateGovernorate(u.governorate)}","${formatGradeArabic(u.conditionGrade)}","${stats.entity}","${toArabicDigits(stats.occupiedRoomsCount)}","${toArabicDigits(stats.vacantRoomsCount)}","${toArabicDigits(stats.totalRooms)}","${toArabicDigits(u.constructionYear)}","${toArabicDigits(u.totalAreaSqM)}","${toArabicDigits(u.floorsCount)}","${toArabicDigits(u.equipment.length)}"\n`;
      });
    } else if (activeTab === 'decommissioned') {
      filename = `تقرير_سجل_الوحدات_المشطوبة_والمجمدة_${dateStr}.csv`;
      content += 'رمز المنشأة / الأصل,اسم المنشأة المشطوبة,الحقل النفطي,المحافظة,الجهة السابقة,الحالة,تاريخ الشطب والتجميد,سبب ومبررات الشطب التوثيقي\n';
      decommissionedUnits.forEach((u) => {
        const codeDisplay = u.fixedAssetCode ? `${toArabicDigits(u.code)} [أصل: ${u.fixedAssetCode}]` : toArabicDigits(u.code);
        content += `"${codeDisplay}","${u.name}","${translateField(u.field)}","${translateGovernorate(u.governorate)}","${u.department}","مشطوبة ومجمدة عن الخدمة","${toArabicDigits(u.decommissionedAt || '2026')}","${(u.decommissionReason || 'تم الشطب بموجب محضر فحص فني').replace(/"/g, '""')}"\n`;
      });
    } else {
      // activeTab === 'all'
      filename = `التقرير_الشامل_التجميعي_للأصول_والكشوفات_والصيانة_${dateStr}.csv`;
      content += `=== ${companyName} - ${reportTitle} ===\n`;
      content += `الفلاتر المطبقة: ${activeFiltersSummary}\n`;
      content += `تاريخ التصدير: ${toArabicDigits(dateStr)}\n\n`;

      content += '=== 1. تقرير وتاريخ الكشوفات والمعاينة الدورية ===\n';
      content += 'كود الوحدة,اسم الوحدة,الحقل النفطي,المحافظة,نوع الكشف,عنوان الكشف,الدورية,تاريخ الكشف السابق,تاريخ الكشف القادم,القائم بالكشف,حالة الكشف,التقييم الإنشائي,الملاحظات,التوصيات,المرفق\n';
      filteredInspections.forEach((i) => {
        content += `"${toArabicDigits(i.unitCode)}","${i.unitName || ''}","${translateField(i.field)}","${translateGovernorate(i.governorate)}","${translateInspectionType(i.inspectionType)}","${i.title}","${translateFrequency(i.frequency)}","${toArabicDigits(i.lastInspectionDate || 'غير مسجل')}","${toArabicDigits(i.nextDueDate)}","${getCleanInspectorName(i.inspectorName, i.performedByName, users)}","${translateInspectionStatus(i.status)}","${i.conditionGradeGiven ? formatGradeArabic(i.conditionGradeGiven) : '-'}","${(i.findings || i.notes || '').replace(/"/g, '""')}","${(i.recommendations || '').replace(/"/g, '""')}","${(i.reportFileName || (i.reportFileUrl ? 'مرفق' : '-')).replace(/"/g, '""')}"\n`;
      });

      content += '\n=== 2. تقرير بلاغات الصيانة ومتابعة الإنجاز ===\n';
      content += 'رقم الطلب,رمز المنشأة,الحقل النفطي,وصف العطل,درجة الأهمية,محرر الطلب,تاريخ البلاغ,تاريخ الإنجاز,المدة (أيام),المرفق,الحالة\n';
      filteredMaintenance.forEach((m) => {
        const codeDisplay = m.roomCode ? `${toArabicDigits(m.unitCode)} [غرفة: ${toArabicDigits(m.roomCode)}]` : toArabicDigits(m.unitCode);
        content += `"${toArabicDigits(m.id)}","${codeDisplay}","${translateField(m.field)}","${m.issue.replace(/"/g, '""')}","${translatePriority(m.priority)}","${getCleanReporterName(m.reportedBy)}","${formatDateOnly(m.createdAt)}","${getCompletionOrCancellationDate(m.completedAt, m.status)}","${calculateMaintenanceDurationDays(m.createdAt, m.completedAt, m.status)}","${(m.attachmentName || (m.attachmentUrl ? 'صورة مرفقة' : '-')).replace(/"/g, '""')}","${translateMaintenanceStatus(m.status)}"\n`;
      });

      content += '\n=== 3. تقرير حصر الأصول والوحدات الهندسية ===\n';
      content += 'رمز المنشأة,اسم المنشأة,نوع المنشأة,الحقل النفطي,المحافظة,التقييم الإنشائي,الجهة الشاغلة,الغرف المشغولة,الغرف الشاغرة (فارغة),إجمالي غرف الوحدة,سنة الإنشاء,المساحة (م²),عدد الطوابق,عدد المعدات\n';
      filteredUnits.forEach((u) => {
        const stats = getUnitOccupancyStats(u, selectedOrgEntity);
        const codeDisplay = u.fixedAssetCode ? `${toArabicDigits(u.code)} [أصل: ${u.fixedAssetCode}]` : toArabicDigits(u.code);
        content += `"${codeDisplay}","${u.name}","${translateUnitType(u.type)}","${translateField(u.field)}","${translateGovernorate(u.governorate)}","${formatGradeArabic(u.conditionGrade)}","${stats.entity}","${toArabicDigits(stats.occupiedRoomsCount)}","${toArabicDigits(stats.vacantRoomsCount)}","${toArabicDigits(stats.totalRooms)}","${toArabicDigits(u.constructionYear)}","${toArabicDigits(u.totalAreaSqM)}","${toArabicDigits(u.floorsCount)}","${toArabicDigits(u.equipment.length)}"\n`;
      });

      content += '\n=== 4. سجل وتقارير الوحدات المشطوبة والمجمدة ===\n';
      content += 'رمز المنشأة / الأصل,اسم المنشأة,الحقل النفطي,المحافظة,الجهة السابقة,الحالة,تاريخ الشطب,سبب الشطب\n';
      decommissionedUnits.forEach((u) => {
        const codeDisplay = u.fixedAssetCode ? `${toArabicDigits(u.code)} [أصل: ${u.fixedAssetCode}]` : toArabicDigits(u.code);
        content += `"${codeDisplay}","${u.name}","${translateField(u.field)}","${translateGovernorate(u.governorate)}","${u.department}","مشطوبة ومجمدة","${toArabicDigits(u.decommissionedAt || '2026')}","${(u.decommissionReason || 'تم الشطب بموجب محضر فحص فني').replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Multi-Page A4 Landscape Chunking & Section Separation Logic
  const PAGE_1_CAPACITY = 8;
  const SECTION_START_CAPACITY = 13;
  const CONTINUATION_PAGE_CAPACITY = 14;

  type ReportItem = 
    | { type: 'inspection'; data: PeriodicInspectionSchedule; indexInSection: number }
    | { type: 'maintenance'; data: MaintenanceRequest; indexInSection: number }
    | { type: 'unit'; data: UnitAsset; indexInSection: number }
    | { type: 'decommissioned'; data: UnitAsset; indexInSection: number };

  interface ReportPageData {
    pageNumber: number;
    sectionKey: 'inspections' | 'maintenance' | 'units' | 'decommissioned' | 'empty';
    sectionNumberText: string;
    sectionTitle: string;
    sectionSubtitle: string;
    totalSectionRecords: number;
    isFirstPageOfDocument: boolean;
    isFirstPageOfSection: boolean;
    pageIndexInSection: number;
    totalPagesInSection: number;
    items: ReportItem[];
  }

  const previewPagesData: ReportPageData[] = useMemo(() => {
    interface SectionDef {
      key: 'inspections' | 'maintenance' | 'units' | 'decommissioned';
      numberText: string;
      title: string;
      subtitle: string;
      items: ReportItem[];
    }

    const sections: SectionDef[] = [];

    if (activeTab === 'all' || activeTab === 'inspections') {
      sections.push({
        key: 'inspections',
        numberText: activeTab === 'all' ? 'القسم الأول' : '',
        title: 'كشوفات الفحص والتقييم الدوري للأصول',
        subtitle: 'بيانات الفحص الفني الدوري والتقييم الإنشائي',
        items: filteredInspections.map((data, idx) => ({ type: 'inspection', data, indexInSection: idx })),
      });
    }

    if (activeTab === 'all' || activeTab === 'maintenance') {
      sections.push({
        key: 'maintenance',
        numberText: activeTab === 'all' ? 'القسم الثاني' : '',
        title: 'بلاغات وطلبات الصيانة ومتابعتها',
        subtitle: 'أوامر العمل وبلاغات الصيانة الطارئة والروتينية',
        items: filteredMaintenance.map((data, idx) => ({ type: 'maintenance', data, indexInSection: idx })),
      });
    }

    if (activeTab === 'all' || activeTab === 'units') {
      sections.push({
        key: 'units',
        numberText: activeTab === 'all' ? 'القسم الثالث' : '',
        title: 'سجل حصر الأصول والمنشآت النفطية',
        subtitle: 'السجل العام للمباني والمنشآت الخدمية والإنتاجية',
        items: filteredUnits.map((data, idx) => ({ type: 'unit', data, indexInSection: idx })),
      });
    }

    if (activeTab === 'all' || activeTab === 'decommissioned') {
      sections.push({
        key: 'decommissioned',
        numberText: activeTab === 'all' ? 'القسم الرابع' : '',
        title: 'المنشآت والأصول المشطوبة والمجمدة',
        subtitle: 'المنشآت الخارجة عن الخدمة بموجب محاضر لجان الشطب',
        items: decommissionedUnits.map((data, idx) => ({ type: 'decommissioned', data, indexInSection: idx })),
      });
    }

    // When viewing comprehensive report ('all'), include only sections with records unless all are empty
    const nonFilteredSections = activeTab === 'all' 
      ? sections.filter(s => s.items.length > 0)
      : sections;

    if (nonFilteredSections.length === 0) {
      return [{
        pageNumber: 1,
        sectionKey: 'empty',
        sectionNumberText: '',
        sectionTitle: reportTitle,
        sectionSubtitle: '',
        totalSectionRecords: 0,
        isFirstPageOfDocument: true,
        isFirstPageOfSection: true,
        pageIndexInSection: 1,
        totalPagesInSection: 1,
        items: [],
      }];
    }

    const pages: ReportPageData[] = [];
    let globalPageNum = 1;

    nonFilteredSections.forEach((sec) => {
      const totalSecItems = sec.items.length;
      if (totalSecItems === 0) {
        pages.push({
          pageNumber: globalPageNum,
          sectionKey: sec.key,
          sectionNumberText: sec.numberText,
          sectionTitle: sec.title,
          sectionSubtitle: sec.subtitle,
          totalSectionRecords: 0,
          isFirstPageOfDocument: globalPageNum === 1,
          isFirstPageOfSection: true,
          pageIndexInSection: 1,
          totalPagesInSection: 1,
          items: [],
        });
        globalPageNum++;
        return;
      }

      let secItemIdx = 0;
      let secPageIndex = 1;
      const secPagesList: { isFirstDocPage: boolean; isFirstSecPage: boolean; items: ReportItem[] }[] = [];

      while (secItemIdx < totalSecItems) {
        const isDocPage1 = globalPageNum === 1 && secPageIndex === 1;
        const capacity = isDocPage1 
          ? PAGE_1_CAPACITY 
          : (secPageIndex === 1 ? SECTION_START_CAPACITY : CONTINUATION_PAGE_CAPACITY);
        const chunk = sec.items.slice(secItemIdx, secItemIdx + capacity);
        secPagesList.push({
          isFirstDocPage: isDocPage1,
          isFirstSecPage: secPageIndex === 1,
          items: chunk,
        });
        secItemIdx += capacity;
        secPageIndex++;
      }

      const totalPagesInThisSec = secPagesList.length;

      secPagesList.forEach((sp, idx) => {
        pages.push({
          pageNumber: globalPageNum,
          sectionKey: sec.key,
          sectionNumberText: sec.numberText,
          sectionTitle: sec.title,
          sectionSubtitle: sec.subtitle,
          totalSectionRecords: totalSecItems,
          isFirstPageOfDocument: sp.isFirstDocPage,
          isFirstPageOfSection: sp.isFirstSecPage,
          pageIndexInSection: idx + 1,
          totalPagesInSection: totalPagesInThisSec,
          items: sp.items,
        });
        globalPageNum++;
      });
    });

    return pages;
  }, [activeTab, filteredInspections, filteredMaintenance, filteredUnits, decommissionedUnits, reportTitle]);

  const totalPages = Math.max(1, previewPagesData.length);
  const activePageData = previewPagesData[Math.min(previewPage, totalPages) - 1] || previewPagesData[0];

  const [isPrintingDoc, setIsPrintingDoc] = useState(false);
  const [printSuccessFeedback, setPrintSuccessFeedback] = useState<string | null>(null);

  // Reset printing state on afterprint event
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintingDoc(false);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Ensure current preview page is valid when dataset or tab changes
  useEffect(() => {
    if (previewPage > totalPages) {
      setPreviewPage(1);
    }
  }, [totalPages, previewPage]);

  // Generate pure HTML tables for standalone printing and popup documents
  const generateTableHtml = useCallback((page: ReportPageData) => {
    if (page.items.length === 0) {
      return '<div style="padding: 24px; text-align: center; color: #64748b; font-weight: bold; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 4px;">لا توجد سجلات مسجلة مطابقة لمعايير الفلترة في هذا القسم</div>';
    }

    if (page.sectionKey === 'inspections') {
      let rows = '';
      page.items.forEach((item, idx) => {
        if (item.type !== 'inspection') return;
        const i = item.data;
        const bg = idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;';
        rows += `
          <tr style="${bg}">
            <td style="text-align: center; font-weight: bold; font-family: monospace;">${toArabicDigits(item.indexInSection + 1)}</td>
            <td style="line-height: 1.45;">
              <div style="font-weight: bold; font-family: monospace; color: #78350f; font-size: 8.5pt;">${toArabicDigits(i.unitCode)}</div>
              <div style="font-weight: bold; color: #0f172a; font-size: 8.5pt;">${i.unitName || i.title || '-'}</div>
              <div style="font-size: 7.5pt; color: #64748b;">${translateField(i.field)} / ${translateGovernorate(i.governorate)}</div>
            </td>
            <td><b>${translateInspectionType(i.inspectionType)}</b> <span style="font-size: 8pt; color: #475569;">(${translateFrequency(i.frequency)})</span></td>
            <td style="font-family: monospace; color: #475569;">${toArabicDigits(i.lastInspectionDate || 'غير مسجل')}</td>
            <td style="font-family: monospace; font-weight: bold; color: #0369a1;">${toArabicDigits(i.nextDueDate)}</td>
            <td style="font-weight: 600; color: #0f172a;">${getCleanInspectorName(i.inspectorName, i.performedByName, users)}</td>
            <td style="text-align: center; font-weight: 600; color: #0f172a;">
              ${translateInspectionStatus(i.status)}${i.conditionGradeGiven ? ` - الدرجة ${i.conditionGradeGiven}` : ''}
            </td>
            <td style="font-size: 8pt; color: #334155;">${i.findings || i.notes || '-'}</td>
            <td style="font-size: 8pt; color: #78350f; font-weight: 600;">${i.recommendations || '-'}</td>
            <td style="text-align: center; font-size: 8pt;">${i.reportFileName ? `📎 ${i.reportFileName}` : (i.reportFileUrl ? '📎 ملف مرفق' : '-')}</td>
          </tr>
        `;
      });
      return `
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th style="min-width: 140px;">بيانات المنشأة والموقع</th>
              <th>نوع ودورية الكشف</th>
              <th>تاريخ الكشف السابق</th>
              <th>تاريخ الاستحقاق</th>
              <th>القائم بالكشف</th>
              <th style="text-align: center;">الحالة والتقييم</th>
              <th>الملاحظات والنتائج</th>
              <th>التوصيات والإجراءات</th>
              <th style="text-align: center;">المرفق</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    if (page.sectionKey === 'maintenance') {
      let rows = '';
      page.items.forEach((item, idx) => {
        if (item.type !== 'maintenance') return;
        const m = item.data;
        const bg = idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;';
        rows += `
          <tr style="${bg}">
            <td style="text-align: center; font-weight: bold; font-family: monospace;">${toArabicDigits(item.indexInSection + 1)}</td>
            <td style="font-weight: bold; font-family: monospace; color: #78350f;">${toArabicDigits(m.id)}</td>
            <td style="line-height: 1.45;">
              <div style="font-weight: bold; font-family: monospace; color: #78350f; font-size: 8.5pt;">${toArabicDigits(m.unitCode)}</div>
              ${m.roomCode ? `
                <div style="display: inline-block; background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 3px; padding: 1px 4px; font-size: 7.5pt; font-weight: bold; font-family: monospace; margin-top: 2px;">
                  🚪 غرفة: ${toArabicDigits(m.roomCode)}
                </div>
              ` : ''}
            </td>
            <td style="font-weight: bold; color: #78350f;">${m.maintenanceDepartment || 'الصيانة العامة'}</td>
            <td style="font-weight: 600; color: #0f172a;">${m.issue}</td>
            <td>${translateField(m.field)}</td>
            <td style="text-align: center; font-weight: bold;">${translatePriority(m.priority)}</td>
            <td style="font-weight: 600; color: #0f172a;">${getCleanReporterName(m.reportedBy)}</td>
            <td style="font-family: monospace;">${formatDateOnly(m.createdAt)}</td>
            <td style="font-family: monospace;">${getCompletionOrCancellationDate(m.completedAt, m.status)}</td>
            <td style="text-align: center; font-size: 8pt;">${
              m.attachments && m.attachments.length > 1
                ? `📷 ${toArabicDigits(m.attachments.length)} مرفقات`
                : m.attachmentName
                ? `📷 ${m.attachmentName}`
                : m.attachmentUrl
                ? '📷 صورة مرفقة'
                : '-'
            }</td>
            <td style="text-align: center; font-weight: bold; color: #78350f;">${translateMaintenanceStatus(m.status)}</td>
          </tr>
        `;
      });
      return `
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>رقم الطلب</th>
              <th>رمز المنشأة</th>
              <th>جهة الصيانة</th>
              <th>وصف العطل / البلاغ</th>
              <th>الحقل</th>
              <th style="text-align: center;">درجة الأهمية</th>
              <th>محرر الطلب</th>
              <th>تاريخ البلاغ</th>
              <th>تاريخ الإنجاز/الإلغاء</th>
              <th style="text-align: center;">المرفق / الصورة</th>
              <th style="text-align: center;">حالة البلاغ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    if (page.sectionKey === 'units') {
      let rows = '';
      page.items.forEach((item, idx) => {
        if (item.type !== 'unit') return;
        const u = item.data;
        const stats = getUnitOccupancyStats(u, selectedOrgEntity);
        const bg = idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;';
        rows += `
          <tr style="${bg}">
            <td style="text-align: center; font-weight: bold; font-family: monospace;">${toArabicDigits(item.indexInSection + 1)}</td>
            <td style="font-weight: bold; font-family: monospace; color: #78350f;">
              <div>${toArabicDigits(u.code)}</div>
              ${u.fixedAssetCode ? `<div style="font-size: 10px; color: #4338ca; font-weight: bold; margin-top: 2px;">أصل: ${u.fixedAssetCode}</div>` : ''}
            </td>
            <td style="font-weight: bold; color: #0f172a;">${u.name}</td>
            <td>
              <div style="font-weight: bold; color: #0f172a;">${translateGovernorate(u.governorate) || u.governorate}</div>
              <div style="font-size: 8.5pt; color: #64748b;">${translateField(u.field) || u.field}</div>
            </td>
            <td>${translateUnitType(u.type)}</td>
            <td style="font-weight: 600; font-size: 8.5pt;">
              ${stats.allOccupants && stats.allOccupants.length > 0 ? stats.allOccupants.map((occ: string) => `<div style="margin-bottom: 2px;">• ${occ}</div>`).join('') : (stats.entity || 'عام / غير محدد')}
            </td>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #059669;">${toArabicDigits(stats.occupiedRoomsCount)}</td>
            <td style="text-align: center; font-weight: bold; font-family: monospace; color: #d97706;">${stats.vacantRoomsCount > 0 ? `${toArabicDigits(stats.vacantRoomsCount)} فارغة` : '0'}</td>
            <td style="text-align: center; font-family: monospace;">${toArabicDigits(stats.totalRooms)}</td>
            <td style="font-family: monospace;">${toArabicDigits(u.constructionYear)}</td>
            <td style="font-family: monospace;">${u.totalAreaSqM ? `${toArabicDigits(u.totalAreaSqM)} م²` : '-'}</td>
            <td style="text-align: center; font-weight: 600; color: #0f172a;">${formatGradeArabic(u.conditionGrade)}</td>
          </tr>
        `;
      });
      return `
        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>رمز المنشأة</th>
              <th>اسم المنشأة</th>
              <th>المحافظة والحقل</th>
              <th>نوع المنشأة</th>
              <th>الجهة الشاغلة</th>
              <th style="text-align: center;">المشغولة</th>
              <th style="text-align: center;">الشاغرة (فارغة)</th>
              <th style="text-align: center;">الإجمالي</th>
              <th>سنة الإنشاء</th>
              <th>المساحة (م²)</th>
              <th style="text-align: center;">التقييم</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    }

    // Decommissioned Units Section Table
    let rows = '';
    page.items.forEach((item, idx) => {
      if (item.type !== 'decommissioned') return;
      const d = item.data;
      const bg = idx % 2 === 1 ? 'background-color: #fff1f2;' : 'background-color: #ffffff;';
      rows += `
        <tr style="${bg}">
          <td style="text-align: center; font-weight: bold; font-family: monospace;">${toArabicDigits(item.indexInSection + 1)}</td>
          <td style="font-weight: bold; font-family: monospace; color: #9f1239;">${toArabicDigits(d.code)}</td>
          <td style="font-weight: bold; color: #0f172a;">${d.name}</td>
          <td>${translateField(d.field)} / ${translateGovernorate(d.governorate)}</td>
          <td>${d.department}</td>
          <td style="font-family: monospace;">${toArabicDigits(d.constructionYear)}</td>
          <td style="font-family: monospace; font-weight: bold; color: #881337;">${toArabicDigits(d.decommissionedAt || '2026')}</td>
          <td style="font-size: 8pt;">${d.decommissionReason || 'محضر لجان فنية وشطب هندسي'}</td>
          <td style="text-align: center; font-weight: bold; color: #9f1239;">مشطوبة ومجمدة</td>
        </tr>
      `;
    });
    return `
      <table>
        <thead>
          <tr style="background-color: #ffe4e6; color: #881337;">
            <th style="width: 30px; text-align: center;">#</th>
            <th>رمز المنشأة</th>
            <th>اسم المنشأة</th>
            <th>الحقل / المحافظة</th>
            <th>الجهة الشاغلة السابقة</th>
            <th>سنة الإنشاء</th>
            <th>تاريخ الشطب</th>
            <th>سبب الشطب والتجميد</th>
            <th style="text-align: center;">الحالة الرسمية</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }, [
    translateField,
    translateGovernorate,
    translateInspectionType,
    translateFrequency,
    translateInspectionStatus,
    formatGradeArabic,
    translatePriority,
    formatDateOnly,
    getCompletionOrCancellationDate,
    translateMaintenanceStatus,
    translateUnitType,
  ]);

  // Generate self-contained standalone HTML document for printing in new window or downloading
  const generateStandaloneReportHtml = useCallback(() => {
    const currentDateFormatted = getServerDateFormatted();
    const printTimestamp = getServerDateTimeFormatted();

    let pagesHtml = '';

    previewPagesData.forEach((page) => {
      const isFirstPage = page.pageNumber === 1;
      const isLastPage = page.pageNumber === totalPages;

      const pageHeader = isFirstPage ? `
        <div class="official-header">
          <div class="header-right">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo-img" />` : `<div class="logo-fallback">${companyName.slice(0, 2)}</div>`}
            <div>
              <div class="country-line">${countryName} - ${ministryName}</div>
              <div class="company-line">${companyName}</div>
              <div class="system-line">${systemName}</div>
            </div>
          </div>
          <div class="header-left">
            <div>تاريخ الطباعة: <b>${currentDateFormatted}</b></div>
            <div>نوع التقرير: <b style="color: #78350f;">${reportTitle}</b></div>
            <div>إجمالي السجلات: <b>${toArabicDigits(totalFilteredRecords)}</b></div>
          </div>
        </div>
        <div class="filters-banner">
          <b>الفلاتر المطبقة: </b> <span>${activeFiltersSummary}</span>
        </div>
        <div class="kpi-grid">
          ${reportKpis
            .map(
              (kpi) => `
            <div class="kpi-box">
              <div class="kpi-label">${kpi.label}</div>
              <div class="kpi-val" style="color: ${kpi.color};">${kpi.textValue || toArabicDigits(kpi.value ?? 0)}</div>
            </div>
          `
            )
            .join('')}
        </div>
      ` : `
        <div class="continuation-header">
          <div>
            <b>${companyName}</b> | <span style="color: #78350f; font-weight: bold;">${reportTitle}</span>
            ${page.sectionNumberText ? ` - <b>${page.sectionNumberText}: ${page.sectionTitle}</b>` : ''}
          </div>
          <div>تاريخ الطباعة: <b>${printTimestamp}</b></div>
        </div>
      `;

      const sectionBadge = `
        <div class="section-banner">
          <div class="section-title">
            ${page.sectionNumberText ? `${page.sectionNumberText}: ` : ''}${page.sectionTitle}
            ${page.totalPagesInSection > 1 ? `<span style="font-size: 8.5pt; color: #78350f; margin-right: 6px;">(صفحة ${toArabicDigits(page.pageIndexInSection)} من ${toArabicDigits(page.totalPagesInSection)} لهذا القسم)</span>` : ''}
          </div>
          <div class="section-count">عرض ${toArabicDigits(page.items.length)} من إجمالي ${toArabicDigits(page.totalSectionRecords)} سجل</div>
        </div>
      `;

      const tableContent = generateTableHtml(page);

      const pageFooter = `
        <div class="official-footer">
          <div>صفحة ${toArabicDigits(page.pageNumber)} من ${toArabicDigits(totalPages)}</div>
          <div>وثيقة إلكترونية معتمدة - ${companyName}</div>
        </div>
      `;

      pagesHtml += `
        <div class="sheet-page ${!isLastPage ? 'page-break' : ''}">
          <div class="page-body">
            ${pageHeader}
            ${sectionBadge}
            <div class="table-container">${tableContent}</div>
          </div>
          ${pageFooter}
        </div>
      `;
    });

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${reportTitle} - ${companyName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      color: #0f172a;
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
      font-size: 9.5pt;
      line-height: 1.4;
      direction: rtl;
    }
    
    /* Screen Toolbar */
    .top-action-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background-color: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .top-action-bar button {
      cursor: pointer;
      font-family: 'Cairo', sans-serif;
      font-weight: 800;
      font-size: 13px;
      padding: 8px 18px;
      border-radius: 8px;
      border: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print {
      background-color: #f59e0b;
      color: #0f172a;
    }
    .btn-print:hover {
      background-color: #d97706;
    }
    .btn-close {
      background-color: #334155;
      color: #ffffff;
    }
    .btn-close:hover {
      background-color: #475569;
    }
    
    /* Page Container */
    .sheet-page {
      background: #ffffff;
      width: 297mm;
      min-height: 210mm;
      margin: 16px auto;
      padding: 8mm 10mm;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    
    .page-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    /* Header Styles */
    .official-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      width: 55px;
      height: 55px;
      object-fit: contain;
    }
    .logo-fallback {
      width: 48px;
      height: 48px;
      background: #fef3c7;
      border: 1px solid #d97706;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      color: #78350f;
      font-size: 16px;
    }
    .country-line { font-size: 8.5pt; font-weight: 700; color: #475569; }
    .company-line { font-size: 13pt; font-weight: 900; color: #78350f; margin: 2px 0; }
    .system-line { font-size: 8.5pt; font-weight: 700; color: #1e293b; }
    .header-left {
      text-align: left;
      font-size: 8.5pt;
      font-family: monospace;
      line-height: 1.5;
    }
    
    .continuation-header {
      border-bottom: 1px solid #94a3b8;
      padding: 6px 10px;
      background-color: #f8fafc;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8.5pt;
    }
    
    /* Banners & KPIs */
    .filters-banner {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      border-radius: 4px;
      font-size: 8pt;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      text-align: center;
    }
    .kpi-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      background: #f8fafc;
      padding: 4px 6px;
    }
    .kpi-label { font-size: 7.5pt; color: #475569; font-weight: bold; }
    .kpi-val { font-size: 11pt; font-weight: 900; color: #0f172a; }
    
    /* Section Badge */
    .section-banner {
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
    }
    .section-title { font-size: 9.5pt; font-weight: 900; color: #0f172a; }
    .section-count { font-size: 8pt; color: #64748b; font-family: monospace; }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      text-align: right;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 3px 5px;
    }
    th {
      background-color: #e2e8f0;
      color: #0f172a;
      font-weight: 800;
    }
    
    /* Footer */
    .official-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #64748b;
    }
    
    /* Print Rules */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .top-action-bar {
        display: none !important;
      }
      .sheet-page {
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        width: 100% !important;
        min-height: 190mm !important;
      }
      .page-break {
        page-break-after: always !important;
        break-after: page !important;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="top-action-bar">
    <div style="font-weight: 900; font-size: 14px; display: flex; align-items: center; gap: 8px;">
      <span>📑 وثيقة التقرير الرسمي: ${reportTitle}</span>
      <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-size: 11px;">${toArabicDigits(totalPages)} صفحات A4</span>
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <button class="btn-print" onclick="window.focus(); window.print();">
        🖨️ طباعة المستند الآن (Ctrl + P)
      </button>
      <button class="btn-close" onclick="window.close();">
        ❌ إغلاق النافذة
      </button>
    </div>
  </div>
  
  ${pagesHtml}

  <script>
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch(e) {
          console.error(e);
        }
      }, 500);
    });
  </script>
</body>
</html>`;
  }, [
    previewPagesData,
    totalPages,
    logoUrl,
    companyName,
    countryName,
    ministryName,
    systemName,
    reportTitle,
    totalFilteredRecords,
    activeFiltersSummary,
    reportKpis,
    generateTableHtml,
  ]);

  // Master Unified Print Engine
  const handlePrintAction = useCallback((mode: 'direct' | 'window' | 'download' | 'preview') => {
    setShowPrintDropdown(false);

    if (mode === 'preview') {
      setShowPrintModal(true);
      return;
    }

    if (mode === 'download') {
      const html = generateStandaloneReportHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setPrintSuccessFeedback('تم تنزيل ملف التقرير للطباعة بنجاح');
      setTimeout(() => setPrintSuccessFeedback(null), 3000);
      return;
    }

    if (mode === 'window') {
      const html = generateStandaloneReportHtml();
      try {
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.open();
          printWin.document.write(html);
          printWin.document.close();
          printWin.focus();
          setPrintSuccessFeedback('تم فتح نافذة الطباعة المخصصة بنجاح');
          setTimeout(() => setPrintSuccessFeedback(null), 3000);
        } else {
          // If popup is blocked by browser or iframe constraints, download printable file directly
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `تقرير_${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setPrintSuccessFeedback('تم حفظ ملف الطباعة مباشرة (نظراً لحظر النوافذ المنبثقة)');
          setTimeout(() => setPrintSuccessFeedback(null), 3500);
        }
      } catch (err) {
        console.warn('Window open failed:', err);
        // Fallback to file download
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `تقرير_${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      return;
    }

    // mode === 'direct': Instant native window print execution with safety fallback
    setIsPrintingDoc(true);
    setTimeout(() => {
      try {
        window.focus();
        window.print();
        setPrintSuccessFeedback('تم إرسال أمر الطباعة');
        setTimeout(() => setPrintSuccessFeedback(null), 2500);
      } catch (err) {
        console.warn('Direct window.print encountered restriction, falling back to standalone window...', err);
        // Fallback to standalone window
        const html = generateStandaloneReportHtml();
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.open();
          printWin.document.write(html);
          printWin.document.close();
        }
      } finally {
        setTimeout(() => {
          setIsPrintingDoc(false);
        }, 600);
      }
    }, 100);
  }, [generateStandaloneReportHtml, reportTitle]);

  // Render Table strictly tailored to each section type
  const renderReportTable = (page: ReportPageData) => {
    if (page.items.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500 font-semibold border border-slate-300 rounded bg-slate-50">
          لا توجد سجلات مسجلة مطابقة لمعايير الفلترة في هذا القسم
        </div>
      );
    }

    if (page.sectionKey === 'inspections') {
      return (
        <table className="w-full border-collapse border border-slate-400 text-[9.5px] text-right">
          <thead className="bg-slate-200 font-bold text-slate-900">
            <tr>
              <th className="border border-slate-400 p-1.5 w-8 text-center">#</th>
              <th className="border border-slate-400 p-1.5 min-w-[130px]">بيانات المنشأة والموقع</th>
              <th className="border border-slate-400 p-1.5">نوع ودورية الكشف</th>
              <th className="border border-slate-400 p-1.5">تاريخ الكشف السابق</th>
              <th className="border border-slate-400 p-1.5">تاريخ الاستحقاق</th>
              <th className="border border-slate-400 p-1.5">القائم بالكشف</th>
              <th className="border border-slate-400 p-1.5 text-center">الحالة والتقييم</th>
              <th className="border border-slate-400 p-1.5">الملاحظات والنتائج</th>
              <th className="border border-slate-400 p-1.5">التوصيات والإجراءات</th>
              <th className="border border-slate-400 p-1.5 text-center">المرفق</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((item, rowIdx) => {
              if (item.type !== 'inspection') return null;
              const i = item.data;
              return (
                <tr key={`insp-row-${i.id}`} className={rowIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="border border-slate-400 p-1.5 text-center font-mono font-bold text-slate-700">
                    {toArabicDigits(item.indexInSection + 1)}
                  </td>
                  <td className="border border-slate-400 p-1.5 leading-snug">
                    <div className="font-bold font-mono text-amber-900 text-[10px]">{toArabicDigits(i.unitCode)}</div>
                    <div className="font-bold text-slate-900 text-[9.5px]">{i.unitName || i.title || '-'}</div>
                    <div className="text-[8.5px] text-slate-600">{translateField(i.field)} / {translateGovernorate(i.governorate)}</div>
                  </td>
                  <td className="border border-slate-400 p-1.5">
                    <span className="font-semibold text-slate-900">{translateInspectionType(i.inspectionType)}</span>
                    <span className="text-[9px] text-slate-600 mr-1 font-medium">({translateFrequency(i.frequency)})</span>
                  </td>
                  <td className="border border-slate-400 p-1.5 font-mono text-slate-600">
                    {toArabicDigits(i.lastInspectionDate || 'غير مسجل')}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-mono font-bold text-sky-900">
                    {toArabicDigits(i.nextDueDate)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-semibold text-slate-900">
                    {getCleanInspectorName(i.inspectorName, i.performedByName, users)}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-semibold text-slate-900">
                    {translateInspectionStatus(i.status)}
                    {i.conditionGradeGiven ? ` - الدرجة ${i.conditionGradeGiven}` : ''}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-[8.5px] max-w-[130px] truncate" title={i.findings || i.notes}>
                    {i.findings || i.notes || '-'}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-[8.5px] max-w-[130px] font-semibold text-amber-900 truncate" title={i.recommendations}>
                    {i.recommendations || '-'}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center whitespace-nowrap">
                    {i.reportFileName || i.reportFileUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          const ext = i.reportFileName?.split('.').pop() || 'pdf';
                          setPreviewAttachment({
                            id: 'rep-insp-' + i.id,
                            name: i.reportFileName || 'تقرير_الكشف.pdf',
                            type: ext,
                            url: i.reportFileUrl || '#',
                            uploadedAt: i.lastInspectionDate || new Date().toISOString().split('T')[0],
                            size: '1.5 MB',
                          });
                        }}
                        className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer text-[9px] inline-flex items-center gap-1"
                        title="معاينة الملف المرفق"
                      >
                        <Eye className="w-3 h-3" />
                        <span>معاينة</span>
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (page.sectionKey === 'maintenance') {
      return (
        <table className="w-full border-collapse border border-slate-400 text-[9.5px] text-right">
          <thead className="bg-slate-200 font-bold text-slate-900">
            <tr>
              <th className="border border-slate-400 p-1.5 w-8 text-center">#</th>
              <th className="border border-slate-400 p-1.5 font-mono">رقم الطلب</th>
              <th className="border border-slate-400 p-1.5 font-mono">رمز المنشأة</th>
              <th className="border border-slate-400 p-1.5">جهة الصيانة</th>
              <th className="border border-slate-400 p-1.5">وصف العطل / البلاغ</th>
              <th className="border border-slate-400 p-1.5">الحقل</th>
              <th className="border border-slate-400 p-1.5 text-center">درجة الأهمية</th>
              <th className="border border-slate-400 p-1.5">محرر الطلب</th>
              <th className="border border-slate-400 p-1.5 font-mono">تاريخ البلاغ</th>
              <th className="border border-slate-400 p-1.5 font-mono">تاريخ الإنجاز/الإلغاء</th>
              <th className="border border-slate-400 p-1.5 text-center">المرفق / الصورة</th>
              <th className="border border-slate-400 p-1.5 font-bold text-center">حالة البلاغ</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((item, rowIdx) => {
              if (item.type !== 'maintenance') return null;
              const m = item.data;
              return (
                <tr key={`maint-row-${m.id}`} className={rowIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="border border-slate-400 p-1.5 text-center font-mono font-bold text-slate-700">
                    {toArabicDigits(item.indexInSection + 1)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-bold font-mono text-amber-900">
                    {toArabicDigits(m.id)}
                  </td>
                  <td className="border border-slate-400 p-1.5 leading-snug">
                    <div className="font-mono font-bold text-amber-900">{toArabicDigits(m.unitCode)}</div>
                    {m.roomCode && (
                      <div className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[8.5px] font-bold font-mono">
                        🚪 غرفة: {toArabicDigits(m.roomCode)}
                      </div>
                    )}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-semibold text-amber-900">
                    {m.maintenanceDepartment || 'الصيانة العامة'}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-semibold text-slate-900">
                    {m.issue}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-slate-700">
                    {translateField(m.field)}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-bold">
                    {translatePriority(m.priority)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-semibold text-slate-900">
                    {getCleanReporterName(m.reportedBy)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-mono text-slate-700">
                    {formatDateOnly(m.createdAt)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-mono text-slate-700">
                    {getCompletionOrCancellationDate(m.completedAt, m.status)}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center whitespace-nowrap">
                    {(() => {
                      const reqAttachments: ReportAttachment[] =
                        m.attachments && m.attachments.length > 0
                          ? m.attachments
                          : m.attachmentUrl || m.attachmentName
                          ? [
                              {
                                id: `rep-maint-${m.id}`,
                                name: m.attachmentName || 'صورة_البلاغ.jpg',
                                url: m.attachmentUrl || '#',
                                type: 'image/jpeg',
                              },
                            ]
                          : [];

                      if (reqAttachments.length === 0) {
                        return <span className="text-slate-400">-</span>;
                      }

                      if (reqAttachments.length === 1) {
                        const single = reqAttachments[0];
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewAttachment({
                                attachments: [
                                  {
                                    id: single.id || `rep-maint-${m.id}`,
                                    name: single.name || m.attachmentName || 'صورة_البلاغ.jpg',
                                    type: single.type || 'image/jpeg',
                                    url: single.url || m.attachmentUrl || '#',
                                    uploadDate: formatDateOnly(m.createdAt),
                                    category: 'صورة بلاغ صيانة',
                                  },
                                ],
                                initialIndex: 0,
                                unitCode: m.unitCode,
                              });
                            }}
                            className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer text-[9px] inline-flex items-center gap-1"
                            title="معاينة الصورة المرفقة"
                          >
                            <Eye className="w-3 h-3" />
                            <span>معاينة الصورة</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewAttachment({
                              attachments: reqAttachments.map((a, i) => ({
                                id: a.id || `rep-maint-${m.id}-${i}`,
                                name: a.name || `صورة_${i + 1}.jpg`,
                                type: a.type || 'image/jpeg',
                                url: a.url || '#',
                                uploadDate: formatDateOnly(m.createdAt),
                                category: `صورة بلاغ صيانة (${toArabicDigits(i + 1)} من ${toArabicDigits(reqAttachments.length)})`,
                              })),
                              initialIndex: 0,
                              unitCode: m.unitCode,
                            });
                          }}
                          className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer text-[9px] inline-flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300"
                          title="عرض جميع الصور المحملة مع الطلب"
                        >
                          <Layers className="w-3 h-3" />
                          <span>عرض ({toArabicDigits(reqAttachments.length)} صور)</span>
                        </button>
                      );
                    })()}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-bold text-amber-900">
                    {translateMaintenanceStatus(m.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (page.sectionKey === 'units') {
      return (
        <table className="w-full border-collapse border border-slate-400 text-[9.5px] text-right">
          <thead className="bg-slate-200 font-bold text-slate-900">
            <tr>
              <th className="border border-slate-400 p-1.5 w-9 text-center">#</th>
              <th className="border border-slate-400 p-1.5 font-mono">رمز المنشأة</th>
              <th className="border border-slate-400 p-1.5">اسم المنشأة</th>
              <th className="border border-slate-400 p-1.5">المحافظة والحقل</th>
              <th className="border border-slate-400 p-1.5">نوع المنشأة</th>
              <th className="border border-slate-400 p-1.5">الجهة الشاغلة</th>
              <th className="border border-slate-400 p-1.5 text-center font-bold text-emerald-800">المشغولة</th>
              <th className="border border-slate-400 p-1.5 text-center font-bold text-amber-800">الشاغرة (فارغة)</th>
              <th className="border border-slate-400 p-1.5 text-center">إجمالي الغرف</th>
              <th className="border border-slate-400 p-1.5 font-mono">سنة الإنشاء</th>
              <th className="border border-slate-400 p-1.5 font-mono">المساحة (م²)</th>
              <th className="border border-slate-400 p-1.5 text-center font-bold">التقييم</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((item, rowIdx) => {
              if (item.type !== 'unit') return null;
              const u = item.data;
              const stats = getUnitOccupancyStats(u, selectedOrgEntity);
              return (
                <tr key={`unit-row-${u.id}`} className={rowIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="border border-slate-400 p-1.5 text-center font-mono font-bold text-slate-700">
                    {toArabicDigits(item.indexInSection + 1)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-bold font-mono text-amber-900">
                    <div>{toArabicDigits(u.code)}</div>
                    {u.fixedAssetCode && (
                      <div className="text-[9.5px] text-indigo-700 font-bold tracking-tight mt-0.5">
                        أصل: {u.fixedAssetCode}
                      </div>
                    )}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-bold text-slate-900">
                    {u.name}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-slate-700">
                    <div className="font-bold text-slate-900">{translateGovernorate(u.governorate) || u.governorate}</div>
                    <div className="text-[9px] text-slate-600">{translateField(u.field) || u.field}</div>
                  </td>
                  <td className="border border-slate-400 p-1.5">
                    {translateUnitType(u.type)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-semibold text-slate-900">
                    {stats.allOccupants && stats.allOccupants.length > 0 ? (
                      <div className="space-y-0.5">
                        {stats.allOccupants.map((occ: string, oIdx: number) => (
                          <div key={oIdx} className="leading-tight flex items-start gap-1">
                            <span className="text-amber-700 font-bold">•</span>
                            <span>{occ}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      stats.entity || 'عام / غير محدد'
                    )}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-mono font-bold text-emerald-800">
                    {toArabicDigits(stats.occupiedRoomsCount)}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-mono font-bold text-amber-800">
                    {stats.vacantRoomsCount > 0 ? `${toArabicDigits(stats.vacantRoomsCount)} فارغة` : '0'}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-mono text-slate-700">
                    {toArabicDigits(stats.totalRooms)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-mono text-slate-700">
                    {toArabicDigits(u.constructionYear)}
                  </td>
                  <td className="border border-slate-400 p-1.5 font-mono text-slate-700">
                    {u.totalAreaSqM ? `${toArabicDigits(u.totalAreaSqM)} م²` : '-'}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-center font-semibold text-slate-900">
                    {formatGradeArabic(u.conditionGrade)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    // Decommissioned Units Table
    return (
      <table className="w-full border-collapse border border-slate-400 text-[9.5px] text-right">
        <thead className="bg-rose-100 font-bold text-rose-950">
          <tr>
            <th className="border border-slate-400 p-1.5 w-9 text-center">#</th>
            <th className="border border-slate-400 p-1.5 font-mono">رمز المنشأة</th>
            <th className="border border-slate-400 p-1.5">اسم المنشأة</th>
            <th className="border border-slate-400 p-1.5">الحقل / المحافظة</th>
            <th className="border border-slate-400 p-1.5">الجهة الشاغلة السابقة</th>
            <th className="border border-slate-400 p-1.5 font-mono">سنة الإنشاء</th>
            <th className="border border-slate-400 p-1.5 font-mono">تاريخ الشطب</th>
            <th className="border border-slate-400 p-1.5">سبب الشطب والتجميد</th>
            <th className="border border-slate-400 p-1.5 text-center font-bold">الحالة الرسمية</th>
          </tr>
        </thead>
        <tbody>
          {page.items.map((item, rowIdx) => {
            if (item.type !== 'decommissioned') return null;
            const d = item.data;
            return (
              <tr key={`decom-row-${d.id}`} className={rowIdx % 2 === 1 ? 'bg-rose-50/70' : 'bg-white'}>
                <td className="border border-slate-400 p-1.5 text-center font-mono font-bold text-slate-700">
                  {toArabicDigits(item.indexInSection + 1)}
                </td>
                <td className="border border-slate-400 p-1.5 font-bold font-mono text-rose-800">
                  {toArabicDigits(d.code)}
                </td>
                <td className="border border-slate-400 p-1.5 font-bold text-slate-900">
                  {d.name}
                </td>
                <td className="border border-slate-400 p-1.5 text-slate-700">
                  {translateField(d.field)} / {translateGovernorate(d.governorate)}
                </td>
                <td className="border border-slate-400 p-1.5 text-slate-800">
                  {d.department}
                </td>
                <td className="border border-slate-400 p-1.5 font-mono text-slate-700">
                  {toArabicDigits(d.constructionYear)}
                </td>
                <td className="border border-slate-400 p-1.5 font-mono font-bold text-rose-900">
                  {toArabicDigits(d.decommissionedAt || '2026')}
                </td>
                <td className="border border-slate-400 p-1.5 text-slate-700 text-[9px]">
                  {d.decommissionReason || 'محضر لجان فنية وشطب هندسي'}
                </td>
                <td className="border border-slate-400 p-1.5 text-center font-bold text-rose-800">
                  مشطوبة ومجمدة
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="space-y-5">
      {/* Global Embedded Print CSS for Direct Multi-Page A4 Landscape Printing */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
          /* Hide non-printable app UI elements */
          aside,
          nav,
          header,
          button,
          input,
          select,
          .print-hidden-element,
          .print-modal-overlay,
          .print-modal-header,
          .reports-screen-ui {
            display: none !important;
          }
          /* Ensure printable container is shown cleanly */
          #full-official-report-printable {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .print-page-sheet {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 100% !important;
            min-height: 185mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: 3.5px 5px !important;
            text-align: right !important;
            font-size: 7.8pt !important;
          }
          th {
            background-color: #e2e8f0 !important;
            color: #0f172a !important;
            font-weight: 800 !important;
          }
          tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
        }
      `}</style>

      {/* Full Multi-Page Document Container (Hidden on screen, Visible on Print) */}
      <div id="full-official-report-printable" className="hidden print:block w-full">
        {previewPagesData.map((page) => {
          const isFirstPage = page.pageNumber === 1;
          const isLastPage = page.pageNumber === totalPages;

          return (
            <div
              key={`full-print-page-${page.pageNumber}`}
              className={`print-page-sheet w-full bg-white text-slate-900 font-sans text-xs flex flex-col justify-between ${
                !isLastPage ? 'page-break' : ''
              }`}
              style={{
                minHeight: '185mm',
                padding: '4mm 0',
              }}
            >
              <div className="space-y-2.5 flex-1">
                {/* Official Header (Page 1) vs Continuation Header (Pages 2+) */}
                {isFirstPage ? (
                  <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                      ) : (
                        <div className="w-14 h-14 bg-amber-100 border border-amber-600 rounded-lg flex items-center justify-center font-black text-amber-900 text-xl">
                          {companyName.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <h1 className="text-xs font-black text-slate-700">{countryName} - {ministryName}</h1>
                        <h2 className="text-base font-black text-amber-900 mt-0.5">{companyName}</h2>
                        <p className="text-[11px] font-bold text-slate-800">{systemName}</p>
                      </div>
                    </div>

                    <div className="text-left font-mono text-[11px] text-slate-800 space-y-0.5">
                      <p className="font-bold">تاريخ الطباعة: {getServerDateFormatted()}</p>
                      <p>نوع التقرير: <span className="font-bold text-amber-900">{reportTitle}</span></p>
                      <p>إجمالي السجلات: <span className="font-bold">{toArabicDigits(totalFilteredRecords)}</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-slate-400 pb-2 flex items-center justify-between text-slate-700 bg-slate-50 px-3 py-1.5 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{companyName}</span>
                      <span className="text-slate-400">|</span>
                      <span className="font-semibold text-amber-900">{reportTitle}</span>
                      {page.sectionNumberText && (
                        <>
                          <span className="text-slate-400">-</span>
                          <span className="font-bold text-slate-800">{page.sectionNumberText}: {page.sectionTitle}</span>
                        </>
                      )}
                    </div>
                    <div className="text-left font-mono text-[10px]">
                      <span>تاريخ الطباعة: {getServerDateFormatted()}</span>
                    </div>
                  </div>
                )}

                {/* Filters Applied & KPIs on Page 1 */}
                {isFirstPage && (
                  <>
                    <div className="bg-slate-100 border border-slate-300 p-2 rounded text-[11px] font-semibold text-slate-800">
                      <span className="font-bold text-slate-900">الفلاتر المطبقة: </span>
                      <span>{activeFiltersSummary}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {reportKpis.map((kpi, kIdx) => (
                        <div key={`full-print-kpi-${kIdx}`} className="p-2 border border-slate-300 rounded bg-slate-50">
                          <div className="text-[10px] text-slate-600 font-bold">{kpi.label}</div>
                          <div className="text-sm font-black" style={{ color: kpi.color }}>
                            {kpi.textValue || toArabicDigits(kpi.value ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Section Title Banner */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                    <div className="flex items-center gap-2">
                      {page.sectionKey === 'inspections' && <CalendarCheck className="w-4 h-4 text-amber-700" />}
                      {page.sectionKey === 'maintenance' && <Wrench className="w-4 h-4 text-amber-700" />}
                      {page.sectionKey === 'units' && <Box className="w-4 h-4 text-amber-700" />}
                      {page.sectionKey === 'decommissioned' && <Archive className="w-4 h-4 text-rose-700" />}
                      <h4 className="font-black text-xs text-slate-900">
                        {page.sectionNumberText ? `${page.sectionNumberText}: ` : ''}
                        {page.sectionTitle}
                        {page.totalPagesInSection > 1 && (
                          <span className="text-[10px] font-bold text-amber-800 mr-1.5">
                            (صفحة {toArabicDigits(page.pageIndexInSection)} من {toArabicDigits(page.totalPagesInSection)} لهذا القسم)
                          </span>
                        )}
                      </h4>
                    </div>
                    <span className="font-mono text-[10px] text-slate-600">
                      عرض {toArabicDigits(page.items.length)} من إجمالي {toArabicDigits(page.totalSectionRecords)} سجل
                    </span>
                  </div>

                  {/* Section-Specific Table */}
                  {renderReportTable(page)}
                </div>
              </div>

              {/* Page Footer */}
              <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-600 mt-2">
                <div className="font-mono">
                  صفحة {toArabicDigits(page.pageNumber)} من {toArabicDigits(totalPages)}
                </div>
                <div>
                  وثيقة إلكترونية معتمدة - {companyName}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Main Screen Control Bar & Header (Hidden on Print) */}
      <div className="reports-screen-ui print:hidden space-y-5">
        <div className={`p-4 md:p-5 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  التقارير
                </h2>
                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {companyName}
                </span>
              </div>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                تقارير معتمدة لنتائج الكشف الدوري، بلاغات الصيانة، وحصر تقييم جودة الأصول
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 print:hidden relative">
            {printSuccessFeedback && (
              <div className="absolute -top-9 left-0 sm:left-auto sm:right-0 bg-amber-500 text-slate-950 text-[11px] font-black px-3 py-1 rounded-lg shadow-lg flex items-center gap-1.5 animate-bounce z-20 border border-amber-400">
                <Printer className="w-3.5 h-3.5" />
                <span>{printSuccessFeedback}</span>
              </div>
            )}

            <button
              onClick={handleExportCSV}
              className={`font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border cursor-pointer ${
                isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
              title="تصدير جدول السجلات الحالية كملف Excel / CSV"
            >
              <Download className="w-4 h-4" />
              <span>تصدير ملف إكسل</span>
            </button>

            {/* Preview Pages Button Group */}
            <div className="relative inline-flex items-stretch rounded-xl shadow-sm">
              {/* Primary Preview Button */}
              <button
                type="button"
                onClick={() => handlePrintAction('preview')}
                className="font-black px-4 py-2 rounded-r-xl text-xs flex items-center gap-2 transition border border-l-0 cursor-pointer bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 active:scale-95 shadow-sm select-none"
                title="معاينة الصفحات والتحقق من التنسيق الرسمي قبل الطباعة"
              >
                <Eye className="w-4 h-4" />
                <span>معاينة الصفحات</span>
              </button>

              {/* Options Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setShowPrintDropdown((prev) => !prev)}
                className="px-2.5 py-2 rounded-l-xl text-xs font-bold transition border border-r-0 border-amber-400 bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer flex items-center justify-center"
                title="خيارات إضافية"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPrintDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Backdrop & Menu */}
              {showPrintDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowPrintDropdown(false)}
                  />
                  <div
                    className={`absolute left-0 top-full mt-1.5 w-60 rounded-xl border shadow-xl z-50 p-1.5 space-y-1 ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handlePrintAction('preview')}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
                        isLight ? 'hover:bg-amber-50 text-slate-800' : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <Eye className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="font-black">معاينة الصفحات تفاعلياً</div>
                        <div className="text-[10px] text-slate-500 font-normal">تصفح صفحات التقرير صفحة بصفحة</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintAction('window')}
                      className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
                        isLight ? 'hover:bg-amber-50 text-slate-800' : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <Printer className="w-4 h-4 text-sky-500" />
                      <div>
                        <div className="font-black">معاينة الطباعة / PDF</div>
                        <div className="text-[10px] text-slate-500 font-normal">مستند مستقل جاهز للطباعة والحفظ PDF</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleResetFilters}
              title="إعادة ضبط الفلاتر"
              className={`p-2 rounded-xl text-xs flex items-center justify-center transition border cursor-pointer ${
                isLight
                  ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Domain Category Tabs */}
        {isRoleMaintenance ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>تقارير وأوامر الصيانة الموجهة إلى:</span>
                  <span className="text-amber-400 font-black underline decoration-amber-500/40">{userMaintDept || 'جهة الصيانة المحددة'}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  استعراض وطباعة وتصدير كافة بلاغات وأوامر الصيانة الخاصة باختصاصكم فقط
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs shadow">
                {toArabicDigits(filteredMaintenance.length)} بلاغ صيانة
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 pb-2 text-xs font-bold overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 transition cursor-pointer shrink-0 ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>التقرير الشامل التجميعي</span>
              <span className="bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px]">{toArabicDigits(totalFilteredRecords)}</span>
            </button>

            <button
              onClick={() => setActiveTab('inspections')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 ${
                activeTab === 'inspections'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>الكشوفات والمعاينة الدورية</span>
              <span className="bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px]">{toArabicDigits(filteredInspections.length)}</span>
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 ${
                activeTab === 'maintenance'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>الصيانة ومتابعتها</span>
              <span className="bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px]">{toArabicDigits(filteredMaintenance.length)}</span>
            </button>

            <button
              onClick={() => setActiveTab('units')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 ${
                activeTab === 'units'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>الأصول والوحدات</span>
              <span className="bg-slate-950/20 px-1.5 py-0.5 rounded text-[10px]">{toArabicDigits(filteredUnits.length)}</span>
            </button>

            <button
              onClick={() => setActiveTab('decommissioned')}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap transition cursor-pointer shrink-0 ${
                activeTab === 'decommissioned'
                  ? 'bg-rose-600 text-white font-black shadow'
                  : isLight
                  ? 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  : 'bg-rose-950/30 text-rose-400 border border-rose-900/40 hover:bg-rose-900/50'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>سجل الوحدات المشطوبة والمجمدة</span>
              <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">{toArabicDigits(decommissionedUnits.length)}</span>
            </button>
          </div>
        )}

        {/* Dynamic Multi-Filters Panel */}
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'} space-y-3`}>
          <div className="flex items-center justify-between text-xs font-bold text-amber-500">
            <span className="flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              <span>فلاتر البحث والتصفية المتقدمة:</span>
            </span>
            {presetFilter !== 'all' && (
              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 text-[11px]">
                فلتر سريع نشط
              </span>
            )}
          </div>

          {/* Quick Presets Bar */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>فلاتر سريعة:</span>
            <button
              onClick={() => setPresetFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                presetFilter === 'all'
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                  : 'bg-slate-800/40 text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setPresetFilter('current_month')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                presetFilter === 'current_month'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/40 text-slate-400 hover:text-white'
              }`}
            >
              📅 الشهر الحالي
            </button>
            <button
              onClick={() => setPresetFilter('current_quarter')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                presetFilter === 'current_quarter'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/40 text-slate-400 hover:text-white'
              }`}
            >
              📊 الربع الحالي
            </button>
            <button
              onClick={() => setPresetFilter('current_year')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                presetFilter === 'current_year'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/40 text-slate-400 hover:text-white'
              }`}
            >
              📆 السنة الحالية
            </button>
            <button
              onClick={() => {
                if (presetFilter === 'vacant_rooms_only') {
                  setPresetFilter('all');
                  setSelectedOccupancyFilter('all');
                } else {
                  setPresetFilter('vacant_rooms_only');
                  setSelectedOccupancyFilter('has_vacant');
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                presetFilter === 'vacant_rooms_only'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
              }`}
            >
              🚪 حصر الغرف الشاغرة (فارغة)
            </button>
          </div>

          {/* Detailed Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/60">
            {/* Search Keyword */}
            <div className="space-y-1 sm:col-span-2">
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>بحث بالنص / الكود / التشكيل:</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="ابحث بالرمز، الاسم، التشكيل، الفحص، المقاول..."
                  className={`w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border outline-none transition ${
                    isLight ? 'bg-white border-slate-300 text-slate-800 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-200 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            {/* Org Entity / Department Select */}
            <div className="space-y-1">
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>التشكيل / الجهة الشاغلة:</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowOrgPickerModal(true)}
                  className={`w-full px-3 py-1.5 text-xs rounded-lg border font-bold transition flex items-center justify-between gap-2 cursor-pointer shadow-sm ${
                    selectedOrgEntity !== 'all'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black ring-1 ring-amber-400'
                      : isLight
                      ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                  title="فتح صفحة التشكيلات للاختيار منها"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Network className={`w-3.5 h-3.5 shrink-0 ${selectedOrgEntity !== 'all' ? 'text-slate-950' : 'text-amber-500'}`} />
                    <span className="truncate">
                      {selectedOrgEntity !== 'all' ? selectedOrgEntity : 'اختيار التشكيل / الجهة الشاغلة...'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </button>

                {selectedOrgEntity !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedOrgEntity('all')}
                    className="p-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition cursor-pointer shrink-0"
                    title="إلغاء تصفية التشكيل"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Governorate Select */}
            <div className="space-y-1">
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>المحافظة:</label>
              <select
                value={selectedGovernorate}
                onChange={(e) => handleGovernorateChange(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="all">كافة المحافظات</option>
                {activeGovernoratesList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Field Select */}
            <div className="space-y-1">
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>الحقل النفطي:</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="all">جميع الحقول</option>
                {displayedOilfieldsList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Occupancy / Vacancy Filter (Shown for All & Units) */}
            {(activeTab === 'all' || activeTab === 'units') && (
              <div className="space-y-1">
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>حالة الإشغال / الغرف الشاغرة:</label>
                <select
                  value={selectedOccupancyFilter}
                  onChange={(e) => setSelectedOccupancyFilter(e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition font-semibold ${
                    selectedOccupancyFilter !== 'all'
                      ? isLight ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-amber-950/40 border-amber-500 text-amber-300'
                      : isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <option value="all">كافة حالات الإشغال (شامل)</option>
                  <option value="has_vacant">🚪 مبانٍ بها غرف شاغرة (فارغة)</option>
                  <option value="fully_vacant">📦 مبانٍ شاغرة بالكامل (100% فارغة)</option>
                  <option value="fully_occupied">🏢 مبانٍ مشغولة بالكامل (لا توجد غرف فارغة)</option>
                </select>
              </div>
            )}

            {/* Condition Grade (Shown for All, Inspections, Units) */}
            {(activeTab === 'all' || activeTab === 'inspections' || activeTab === 'units') && (
              <div className="space-y-1">
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>التقييم الإنشائي:</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <option value="all">جميع الدرجات</option>
                  <option value="A">الدرجة A - ممتاز</option>
                  <option value="B">الدرجة B - جيد جداً</option>
                  <option value="C">الدرجة C - متوسط</option>
                  <option value="D">الدرجة D - حرج / متضرر</option>
                </select>
              </div>
            )}

            {/* Inspection Status Filter (Shown for All & Inspections) */}
            {(activeTab === 'all' || activeTab === 'inspections') && (
              <div className="space-y-1">
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>حالة الكشف الدوري:</label>
                <select
                  value={selectedInspectionStatus}
                  onChange={(e) => setSelectedInspectionStatus(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <option value="all">جميع حالات الكشف</option>
                  <option value="completed">مكتمل وموثق</option>
                  <option value="scheduled">مجدول قادم</option>
                  <option value="overdue">متأخر</option>
                </select>
              </div>
            )}

            {/* Maintenance Status Filter (Shown for All & Maintenance) */}
            {(activeTab === 'all' || activeTab === 'maintenance') && (
              <div className="space-y-1">
                <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>حالة الصيانة:</label>
                <select
                  value={selectedMaintenanceStatus}
                  onChange={(e) => setSelectedMaintenanceStatus(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition ${
                    isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <option value="all">جميع حالات الصيانة</option>
                  <option value="completed">منجز</option>
                  <option value="rejected">مرفوض</option>
                  <option value="cancelled">ملغى</option>
                  <option value="in_progress">قيد المعالجة</option>
                </select>
              </div>
            )}

            {/* Date From */}
            <div className="space-y-1">
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>من تاريخ:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`w-full px-2 py-1.5 text-xs rounded-lg border outline-none transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              />
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <label className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>إلى تاريخ:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`w-full px-2 py-1.5 text-xs rounded-lg border outline-none transition ${
                  isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Screen KPI Summary & Active Filters Banner */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
            isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs flex-1">
            <span className={`font-black shrink-0 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
              الفلاتر المطبقة:
            </span>
            <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              {activeFiltersSummary}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto shrink-0">
            {reportKpis.map((kpi, kIdx) => (
              <div
                key={`screen-kpi-${kIdx}`}
                className={`px-3 py-1.5 rounded-lg border text-center text-xs ${
                  isLight ? 'bg-white border-amber-200 shadow-xs' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {kpi.label}
                </span>
                <span className="text-xs font-black" style={{ color: kpi.color }}>
                  {kpi.textValue || toArabicDigits(kpi.value ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Tables */}

      {/* SECTION 1: Periodic Inspections Table */}
      {(activeTab === 'all' || activeTab === 'inspections') && (
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} space-y-3`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-amber-500" />
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                1. تقرير وتاريخ الكشوفات والمعاينة الدورية ({toArabicDigits(filteredInspections.length)} سجل)
              </h3>
            </div>
            <span className="text-[11px] text-amber-500 font-mono font-bold">الكشوفات الدورية للاصول</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={`border-b ${isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'} font-bold`}>
                <tr>
                  <th className="p-2.5 min-w-[140px]">بيانات المنشأة والموقع</th>
                  <th className="p-2.5">نوع ودورية الكشف</th>
                  <th className="p-2.5">تاريخ الكشف السابق</th>
                  <th className="p-2.5">التاريخ القادم</th>
                  <th className="p-2.5">القائم بالكشف</th>
                  <th className="p-2.5">الحالة والتصنيف</th>
                  <th className="p-2.5">الملاحظات والنتائج</th>
                  <th className="p-2.5">التوصيات والإجراءات</th>
                  <th className="p-2.5 text-center">المرفقات / الصور</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-300'}`}>
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 font-semibold">
                      لا توجد سجلات كشف تطابق معايير الفلترة المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((item) => (
                    <tr key={item.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                      <td className="p-2.5 leading-snug whitespace-nowrap">
                        <div className="font-mono font-bold text-amber-500">{toArabicDigits(item.unitCode)}</div>
                        <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{item.unitName || 'غير مسمى'}</div>
                        <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {translateField(item.field)} / {translateGovernorate(item.governorate)}
                        </div>
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="font-semibold">{item.title}</span>
                        <div className="text-[10px] text-slate-500">{item.frequency === 'monthly' ? 'شهري' : item.frequency === 'quarterly' ? 'ربع سنوي' : 'سنوي'}</div>
                      </td>
                      <td className="p-2.5 font-mono whitespace-nowrap">{toArabicDigits(item.lastInspectionDate || 'غير مسجل')}</td>
                      <td className="p-2.5 font-mono whitespace-nowrap font-bold text-sky-400">{toArabicDigits(item.nextDueDate)}</td>
                      <td className="p-2.5 whitespace-nowrap font-semibold">
                        {getCleanInspectorName(item.inspectorName, item.performedByName, users)}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'overdue'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {item.status === 'completed' ? 'مكتمل وموثق' : item.status === 'overdue' ? 'متأخر' : 'مجدول'}
                        </span>
                        {item.conditionGradeGiven && (
                          <span className="mr-1 font-mono font-bold text-[10px] px-1.5 py-0.5 bg-slate-800 text-amber-400 border border-slate-700 rounded">
                            الدرجة {item.conditionGradeGiven}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 max-w-xs text-[11px] text-slate-300 truncate" title={item.findings || item.notes}>
                        {item.findings || item.notes || 'لا توجد ملاحظات'}
                      </td>
                      <td className="p-2.5 max-w-xs text-[11px] font-semibold text-amber-400 truncate" title={item.recommendations}>
                        {item.recommendations || 'لا توجد توصيات'}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {item.reportFileName || item.reportFileUrl ? (
                          <button
                            type="button"
                            onClick={() => {
                              const ext = item.reportFileName?.split('.').pop() || 'pdf';
                              setPreviewAttachment({
                                id: 'rep-live-insp-' + item.id,
                                name: item.reportFileName || 'تقرير_الكشف.pdf',
                                type: ext,
                                url: item.reportFileUrl || '#',
                                uploadedAt: item.lastInspectionDate || new Date().toISOString().split('T')[0],
                                size: '1.5 MB',
                              });
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border shadow-sm ${
                              isLight
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            }`}
                            title="معاينة الملف المرفق أو الصورة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[80px]">{item.reportFileName || 'معاينة'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[10px]">لا يوجد</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: Maintenance Request & SLA History Table */}
      {(activeTab === 'all' || activeTab === 'maintenance') && (
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} space-y-3`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                2. تقرير بلاغات الصيانة ومتابعتها ({toArabicDigits(filteredMaintenance.length)} طلب)
              </h3>
            </div>
            <span className="text-[11px] text-amber-500 font-mono font-bold">إدارة الصيانة والتشغيل</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={`border-b ${isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'} font-bold`}>
                <tr>
                  <th className="p-2.5">رقم الطلب</th>
                  <th className="p-2.5">رمز المنشأة</th>
                  <th className="p-2.5">جهة الصيانة</th>
                  <th className="p-2.5">وصف العطل / البلاغ</th>
                  <th className="p-2.5">درجة الأهمية</th>
                  <th className="p-2.5">محرر الطلب</th>
                  <th className="p-2.5">تاريخ البلاغ</th>
                  <th className="p-2.5">تاريخ الإنجاز / الإلغاء</th>
                  <th className="p-2.5">المدة (بالأيام)</th>
                  <th className="p-2.5 text-center">المرفق / الصورة</th>
                  <th className="p-2.5">الحالة الحالية</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-300'}`}>
                {filteredMaintenance.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-500 font-semibold">
                      لا توجد بلاغات صيانة تطابق معايير الفلترة المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredMaintenance.map((req) => (
                    <tr key={req.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                      <td className="p-2.5 font-mono font-bold text-amber-500 whitespace-nowrap">{toArabicDigits(req.id)}</td>
                      <td className="p-2.5 leading-snug whitespace-nowrap">
                        <div className="font-mono font-bold text-amber-500">{toArabicDigits(req.unitCode)}</div>
                        {req.roomCode && (
                          <div className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold">
                            🚪 غرفة: {toArabicDigits(req.roomCode)}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 font-semibold text-amber-400 whitespace-nowrap">{req.maintenanceDepartment || 'الصيانة العامة'}</td>
                      <td className="p-2.5 font-bold max-w-xs">{req.issue}</td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.priority === 'critical'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : req.priority === 'normal'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {req.priority === 'critical' ? 'حرج جدًا' : req.priority === 'normal' ? 'متوسط' : 'منخفض'}
                        </span>
                      </td>
                      <td className="p-2.5 whitespace-nowrap font-semibold">
                        {getCleanReporterName(req.reportedBy)}
                      </td>
                      <td className="p-2.5 font-mono whitespace-nowrap">{formatDateOnly(req.createdAt)}</td>
                      <td className="p-2.5 font-mono whitespace-nowrap">{getCompletionOrCancellationDate(req.completedAt, req.status)}</td>
                      <td className="p-2.5 font-bold text-amber-400 whitespace-nowrap">{calculateMaintenanceDurationDays(req.createdAt, req.completedAt, req.status)}</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {(() => {
                          const reqAttachments: ReportAttachment[] =
                            req.attachments && req.attachments.length > 0
                              ? req.attachments
                              : req.attachmentUrl || req.attachmentName
                              ? [
                                  {
                                    id: `rep-live-maint-${req.id}`,
                                    name: req.attachmentName || 'صورة_البلاغ.jpg',
                                    url: req.attachmentUrl,
                                    type: 'image/jpeg',
                                  },
                                ]
                              : [];

                          if (reqAttachments.length === 0) {
                            return <span className="text-slate-500 text-[10px]">لا يوجد</span>;
                          }

                          if (reqAttachments.length === 1) {
                            const single = reqAttachments[0];
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewAttachment({
                                    attachments: [
                                      {
                                        id: single.id || `rep-live-maint-${req.id}`,
                                        name: single.name || req.attachmentName || 'صورة_البلاغ.jpg',
                                        type: single.type || 'image/jpeg',
                                        url: single.url || req.attachmentUrl || '#',
                                        uploadDate: formatDateOnly(req.createdAt),
                                        category: 'صورة بلاغ صيانة',
                                      },
                                    ],
                                    initialIndex: 0,
                                    unitCode: req.unitCode,
                                  });
                                }}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border shadow-sm ${
                                  isLight
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                }`}
                                title="معاينة الصورة المرفقة بطلب الصيانة"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[70px]">{single.name || 'معاينة'}</span>
                              </button>
                            );
                          }

                          return (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center justify-center gap-1">
                                {reqAttachments.slice(0, 3).map((att, idx) => (
                                  <button
                                    key={att.id || idx}
                                    type="button"
                                    onClick={() => {
                                      setPreviewAttachment({
                                        attachments: reqAttachments.map((a, i) => ({
                                          id: a.id || `rep-live-maint-${req.id}-${i}`,
                                          name: a.name || `صورة_${i + 1}.jpg`,
                                          type: a.type || 'image/jpeg',
                                          url: a.url || '#',
                                          uploadDate: formatDateOnly(req.createdAt),
                                          category: `صورة بلاغ صيانة (${toArabicDigits(i + 1)} من ${toArabicDigits(reqAttachments.length)})`,
                                        })),
                                        initialIndex: idx,
                                        unitCode: req.unitCode,
                                      });
                                    }}
                                    className="w-6 h-6 rounded-md overflow-hidden border border-amber-500/40 hover:border-amber-400 bg-black/40 transition hover:scale-110 cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
                                    title={`معاينة الصورة ${toArabicDigits(idx + 1)}`}
                                  >
                                    {att.url && (att.url.startsWith('data:image/') || att.name.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) ? (
                                      <img src={att.url} alt={att.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <FileText className="w-3 h-3 text-amber-400" />
                                    )}
                                  </button>
                                ))}
                                {reqAttachments.length > 3 && (
                                  <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 border border-slate-700 font-mono text-[9px] font-bold flex items-center justify-center">
                                    +{toArabicDigits(reqAttachments.length - 3)}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewAttachment({
                                    attachments: reqAttachments.map((a, i) => ({
                                      id: a.id || `rep-live-maint-${req.id}-${i}`,
                                      name: a.name || `صورة_${i + 1}.jpg`,
                                      type: a.type || 'image/jpeg',
                                      url: a.url || '#',
                                      uploadDate: formatDateOnly(req.createdAt),
                                      category: `صورة بلاغ صيانة (${toArabicDigits(i + 1)} من ${toArabicDigits(reqAttachments.length)})`,
                                    })),
                                    initialIndex: 0,
                                    unitCode: req.unitCode,
                                  });
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer border flex items-center gap-1 ${
                                  isLight
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                                }`}
                                title="عرض جميع الصور المحملة مع الطلب"
                              >
                                <Layers className="w-2.5 h-2.5 text-amber-400" />
                                <span>عرض الكل ({toArabicDigits(reqAttachments.length)} صور)</span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-2.5 whitespace-nowrap font-bold">
                        {req.status === 'completed' ? (
                          <span className="text-emerald-400">منجز</span>
                        ) : req.status === 'rejected' ? (
                          <span className="text-rose-400">مرفوض</span>
                        ) : req.status === 'cancelled' ? (
                          <span className="text-slate-400">ملغى</span>
                        ) : req.status === 'overdue' ? (
                          <span className="text-red-400">متأخر</span>
                        ) : (
                          <span className="text-amber-400">قيد المعالجة</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: Units & Infrastructure Inventory Table */}
      {(activeTab === 'all' || activeTab === 'units') && (
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} space-y-3`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-amber-500" />
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                3. تقرير حصر الأصول والمنشآت ({toArabicDigits(filteredUnits.length)} منشأة)
              </h3>
            </div>
            <span className="text-[11px] text-amber-500 font-mono font-bold">السجل العام للاصول</span>
          </div>

          {/* Org Entity Filter Highlight Banner */}
          {selectedOrgEntity !== 'all' && (
            <div className={`p-3 px-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
              isLight ? 'bg-amber-50 border-amber-200 text-slate-800' : 'bg-slate-950 border-amber-500/30 text-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  حصر إشغال التشكيل: <span className="underline decoration-amber-500 underline-offset-4">{selectedOrgEntity}</span>
                </span>
                <span className="text-slate-500 text-[11px]">
                  (يشغل عدد <b>{toArabicDigits(filteredUnits.length)}</b> منشأة / وحدة هندسية)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold font-mono text-xs">
                  إجمالي الغرف الشاغلة للتشكيل: {toArabicDigits(
                    filteredUnits.reduce((acc, u) => acc + getUnitOccupancyStats(u, selectedOrgEntity).occupiedRoomsCount, 0)
                  )} غرفة
                </span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={`border-b ${isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'} font-bold`}>
                <tr>
                  <th className="p-2.5">رمز المنشأة</th>
                  <th className="p-2.5">اسم المنشأة</th>
                  <th className="p-2.5">المحافظة والحقل</th>
                  <th className="p-2.5">التقييم الإنشائي</th>
                  <th className="p-2.5">الجهة الشاغلة</th>
                  <th className="p-2.5 text-center font-black text-emerald-600 dark:text-emerald-400">
                    {selectedOrgEntity !== 'all' ? 'الغرف الشاغلة للتشكيل' : 'الغرف المشغولة'}
                  </th>
                  <th className="p-2.5 text-center font-black text-amber-600 dark:text-amber-400">
                    الغرف الشاغرة (فارغة)
                  </th>
                  <th className="p-2.5 text-center">إجمالي الغرف</th>
                  <th className="p-2.5">سنة الإنشاء</th>
                  <th className="p-2.5">المساحة (م²)</th>
                  <th className="p-2.5">المعدات</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-300'}`}>
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-slate-500 font-semibold">
                      لا توجد وحدات هندسية تطابق معايير الفلترة المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((u) => {
                    const stats = getUnitOccupancyStats(u, selectedOrgEntity);
                    return (
                      <tr key={u.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                        <td className="p-2.5 font-mono font-bold whitespace-nowrap">
                          <div className="text-amber-500">{toArabicDigits(u.code)}</div>
                          {u.fixedAssetCode && (
                            <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mt-0.5">
                              أصل: {u.fixedAssetCode}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-bold whitespace-nowrap">
                          <div>{u.name}</div>
                          <span className="text-[10px] text-slate-500 font-normal">{translateUnitType(u.type)}</span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <div className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {translateGovernorate(u.governorate) || u.governorate}
                          </div>
                          <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            {translateField(u.field) || u.field}
                          </div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              u.conditionGrade === 'A'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : u.conditionGrade === 'B'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : u.conditionGrade === 'C'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            الدرجة {u.conditionGrade}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {selectedOrgEntity !== 'all' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="truncate">{selectedOrgEntity}</span>
                            </span>
                          ) : stats.allOccupants && stats.allOccupants.length > 0 ? (
                            <div className="space-y-1">
                              {stats.allOccupants.map((occ: string, oIdx: number) => (
                                <div
                                  key={oIdx}
                                  className={`text-[11px] font-semibold leading-tight flex items-start gap-1.5 ${
                                    isLight ? 'text-slate-800' : 'text-slate-200'
                                  }`}
                                  title={occ}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                                  <span className="whitespace-normal leading-tight">{occ}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-500 text-xs">{stats.entity || 'عام / غير محدد'}</span>
                          )}
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-black font-mono border ${
                              selectedOrgEntity !== 'all'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}>
                              {toArabicDigits(stats.occupiedRoomsCount)} غرف
                            </span>
                            {selectedOrgEntity !== 'all' && stats.occupiedRooms.length > 0 && (
                              <span
                                className="text-[9.5px] text-slate-400 max-w-[140px] truncate block mt-0.5"
                                title={stats.occupiedRooms.map((r) => r.name).join(' ، ')}
                              >
                                {stats.occupiedRooms.map((r) => r.name).slice(0, 2).join('، ')}
                                {stats.occupiedRooms.length > 2 ? ' ...' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-black font-mono border ${
                              stats.vacantRoomsCount > 0
                                ? isLight
                                  ? 'bg-amber-100/90 text-amber-900 border-amber-400 shadow-xs font-bold'
                                  : 'bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-xs font-bold'
                                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 border-slate-300 dark:border-slate-700/60'
                            }`}>
                              {stats.vacantRoomsCount > 0 ? (
                                <span className="flex items-center gap-1">
                                  <span>{toArabicDigits(stats.vacantRoomsCount)} فارغة</span>
                                </span>
                              ) : (
                                '0'
                              )}
                            </span>
                            {stats.vacantRooms.length > 0 && (
                              <span
                                className={`text-[9.5px] max-w-[140px] truncate block mt-0.5 ${
                                  isLight ? 'text-amber-800 font-semibold' : 'text-amber-400 font-semibold'
                                }`}
                                title={stats.vacantRooms.map((r) => r.name).join(' ، ')}
                              >
                                {stats.vacantRooms.map((r) => r.name).slice(0, 2).join('، ')}
                                {stats.vacantRooms.length > 2 ? ' ...' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-center text-slate-400 whitespace-nowrap">
                          {toArabicDigits(stats.totalRooms)} غرفة
                        </td>
                        <td className="p-2.5 font-mono whitespace-nowrap">{toArabicDigits(u.constructionYear)}</td>
                        <td className="p-2.5 font-mono whitespace-nowrap">{toArabicDigits(u.totalAreaSqM)} م²</td>
                        <td className="p-2.5 text-[11px] text-slate-400 whitespace-nowrap font-mono">
                          {toArabicDigits(u.equipment.length)} معدة
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: Decommissioned Units Table */}
      {(activeTab === 'all' || activeTab === 'decommissioned') && (
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} space-y-3`}>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-rose-500" />
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                4. سجل وتقارير الوحدات والمنشآت المشطوبة والمجمدة عن الخدمة ({toArabicDigits(decommissionedUnits.length)} منشأة)
              </h3>
            </div>
            <span className="text-[11px] text-rose-500 font-mono font-bold">الاصول المشطوبة و المجمدة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={`border-b ${isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-400'} font-bold`}>
                <tr>
                  <th className="p-2.5">رمز المنشأة</th>
                  <th className="p-2.5">اسم المنشأة المشطوبة</th>
                  <th className="p-2.5">الحقل / المحافظة</th>
                  <th className="p-2.5">الجهة السابقة</th>
                  <th className="p-2.5">الحالة الحالية</th>
                  <th className="p-2.5">تاريخ الشطب</th>
                  <th className="p-2.5">سبب الشطب والتجميد التوثيقي</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-300'}`}>
                {decommissionedUnits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 font-semibold">
                      لا توجد منشآت مشطوبة أو مجمدة حالياً بالنظام.
                    </td>
                  </tr>
                ) : (
                  decommissionedUnits.map((u) => (
                    <tr key={u.id} className={isLight ? 'hover:bg-rose-50/50' : 'hover:bg-rose-950/20'}>
                      <td className="p-2.5 font-mono font-bold whitespace-nowrap">
                        <div className="text-rose-500">{toArabicDigits(u.code)}</div>
                        {u.fixedAssetCode && (
                          <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mt-0.5">
                            أصل: {u.fixedAssetCode}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 font-bold whitespace-nowrap">{u.name}</td>
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">{u.field} / {u.governorate}</td>
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">{u.department}</td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white flex items-center gap-1 w-fit">
                          <Archive className="w-3 h-3" />
                          <span>مشطوبة ومجمدة</span>
                        </span>
                      </td>
                      <td className="p-2.5 font-mono whitespace-nowrap font-bold text-amber-500">{toArabicDigits(u.decommissionedAt || '2026')}</td>
                      <td className="p-2.5 max-w-md text-slate-300 font-semibold">{u.decommissionReason || 'تم الشطب بموجب محضر الفحص الفني والإنشائي'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Print Preview & Official Document Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto print-modal-overlay">
          <div
            className={`w-full max-w-6xl max-h-[94vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border print-modal-wrapper ${
              isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            {/* Modal Header Bar (Hidden in Print) */}
            <div
              className={`flex items-center justify-between gap-3 px-5 py-3.5 border-b print:hidden shrink-0 print-modal-header ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileText className={`w-5 h-5 ${isLight ? 'text-amber-600' : 'text-amber-500'}`} />
                  <h3 className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    معاينة وثيقة التقرير الرسمي المعتمد
                  </h3>
                </div>

                {/* Page Indicator Badge */}
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                  isLight ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                }`}>
                  <span>الصفحة</span>
                  <span className="font-mono">{toArabicDigits(previewPage)}</span>
                  <span>من</span>
                  <span className="font-mono">{toArabicDigits(totalPages)}</span>
                  <span className="text-[10px] opacity-75 font-sans">(ورقة A4 أفقية)</span>
                </div>
              </div>

              {/* Navigation & Actions */}
              <div className="flex items-center gap-2">
                {/* Pagination Controls */}
                <div className={`flex items-center rounded-xl border p-0.5 ${
                  isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'
                }`}>
                  <button
                    type="button"
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    disabled={previewPage <= 1}
                    className={`p-1.5 rounded-lg transition text-xs font-bold flex items-center gap-1 ${
                      previewPage <= 1
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : isLight
                        ? 'hover:bg-white text-slate-800 shadow-sm cursor-pointer'
                        : 'hover:bg-slate-700 text-slate-200 cursor-pointer'
                    }`}
                    title="الصفحة السابقة"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span className="hidden sm:inline">السابق</span>
                  </button>

                  <div className="px-2 font-mono text-xs font-bold select-none text-slate-700 dark:text-slate-300">
                    {toArabicDigits(previewPage)} / {toArabicDigits(totalPages)}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                    disabled={previewPage >= totalPages}
                    className={`p-1.5 rounded-lg transition text-xs font-bold flex items-center gap-1 ${
                      previewPage >= totalPages
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : isLight
                        ? 'hover:bg-white text-slate-800 shadow-sm cursor-pointer'
                        : 'hover:bg-slate-700 text-slate-200 cursor-pointer'
                    }`}
                    title="الصفحة التالية"
                  >
                    <span className="hidden sm:inline">التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handlePrintAction('window')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer select-none border border-amber-400"
                  title="معاينة الطباعة في نافذة مخصصة للطباعة وتصدير PDF"
                >
                  <Printer className="w-4 h-4" />
                  <span>معاينة الطباعة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isLight
                      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="إغلاق المعاينة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body - A4 Landscape Formatted */}
            <div
              className={`p-4 sm:p-6 overflow-y-auto flex flex-col items-center print-modal-scroll ${
                isLight ? 'bg-slate-200/80' : 'bg-slate-950/60'
              }`}
            >
              {/* Single A4 Landscape Page Container */}
              <div
                id="printable-report-area"
                className="w-full max-w-5xl bg-white text-slate-900 p-6 sm:p-8 rounded-lg shadow-xl border border-slate-300 font-sans text-xs space-y-4 min-h-[580px] flex flex-col justify-between"
                style={{
                  aspectRatio: '297 / 210', // A4 Landscape ratio
                }}
              >
                <div className="space-y-4 flex-1">
                  {/* Page 1 Official Full Header (Logo, Ministry, Company, System, Type, Date) */}
                  {previewPage === 1 ? (
                    <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                        ) : (
                          <div className="w-14 h-14 bg-amber-100 border border-amber-600 rounded-lg flex items-center justify-center font-black text-amber-900 text-xl">
                            {companyName.slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <h1 className="text-xs font-black text-slate-700">{countryName} - {ministryName}</h1>
                          <h2 className="text-base font-black text-amber-900 mt-0.5">{companyName}</h2>
                          <p className="text-[11px] font-bold text-slate-800">{systemName}</p>
                        </div>
                      </div>

                      <div className="text-left font-mono text-[11px] text-slate-800 space-y-0.5">
                        <p className="font-bold">تاريخ الطباعة: {getServerDateFormatted()}</p>
                        <p>نوع التقرير: <span className="font-bold text-amber-900">{reportTitle}</span></p>
                        <p>عدد السجلات: <span className="font-bold">{toArabicDigits(totalFilteredRecords)}</span></p>
                      </div>
                    </div>
                  ) : (
                    /* Supplementary Pages Header (Simplified compact header) */
                    <div className="border-b border-slate-400 pb-2 flex items-center justify-between text-slate-700 bg-slate-50 px-3 py-1.5 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{companyName}</span>
                        <span className="text-slate-400">|</span>
                        <span className="font-semibold text-amber-900">{reportTitle}</span>
                        {activePageData.sectionNumberText && (
                          <>
                            <span className="text-slate-400">-</span>
                            <span className="font-bold text-slate-800">{activePageData.sectionNumberText}: {activePageData.sectionTitle}</span>
                          </>
                        )}
                      </div>
                      <div className="text-left font-mono text-[10px] space-x-2">
                        <span>تاريخ الطباعة: {getServerDateFormatted()}</span>
                      </div>
                    </div>
                  )}

                  {/* Filters Applied Banner (Shown only on Page 1) */}
                  {previewPage === 1 && (
                    <div className="bg-slate-100 border border-slate-300 p-2 rounded text-[11px] font-semibold text-slate-800">
                      <span className="font-bold text-slate-900">الفلاتر المطبقة: </span>
                      <span>{activeFiltersSummary}</span>
                    </div>
                  )}

                  {/* KPI Summary Block (Shown only on Page 1) */}
                  {previewPage === 1 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      {reportKpis.map((kpi, kIdx) => (
                        <div key={`modal-kpi-${kIdx}`} className="p-2 border border-slate-300 rounded bg-slate-50">
                          <div className="text-[10px] text-slate-600 font-bold">{kpi.label}</div>
                          <div className="text-sm font-black" style={{ color: kpi.color }}>
                            {kpi.textValue || toArabicDigits(kpi.value ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Document Records for Current Page with Dedicated Table */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                      <div className="flex items-center gap-2">
                        {activePageData.sectionKey === 'inspections' && <CalendarCheck className="w-4 h-4 text-amber-700" />}
                        {activePageData.sectionKey === 'maintenance' && <Wrench className="w-4 h-4 text-amber-700" />}
                        {activePageData.sectionKey === 'units' && <Box className="w-4 h-4 text-amber-700" />}
                        {activePageData.sectionKey === 'decommissioned' && <Archive className="w-4 h-4 text-rose-700" />}
                        <h4 className="font-black text-xs text-slate-900">
                          {activePageData.sectionNumberText ? `${activePageData.sectionNumberText}: ` : ''}
                          {activePageData.sectionTitle}
                          {activePageData.totalPagesInSection > 1 && (
                            <span className="text-[10px] font-bold text-amber-800 mr-1.5">
                              (صفحة {toArabicDigits(activePageData.pageIndexInSection)} من {toArabicDigits(activePageData.totalPagesInSection)} لهذا القسم)
                            </span>
                          )}
                        </h4>
                      </div>
                      <span className="font-mono text-[10px] text-slate-600">
                        عرض {toArabicDigits(activePageData.items.length)} من إجمالي {toArabicDigits(activePageData.totalSectionRecords)} سجل
                      </span>
                    </div>

                    {renderReportTable(activePageData)}
                  </div>
                </div>

                {/* Page Footer */}
                <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] text-slate-600">
                  <div className="font-mono">
                    صفحة {toArabicDigits(previewPage)} من {toArabicDigits(totalPages)}
                  </div>
                  <div>
                    وثيقة إلكترونية معتمدة - {companyName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Viewer Modal */}
      {previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment.attachments ? undefined : previewAttachment}
          attachments={previewAttachment.attachments}
          initialIndex={previewAttachment.initialIndex}
          unitCode={previewAttachment.unitCode}
          theme={theme}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* Org Entity Picker Modal */}
      {showOrgPickerModal && (
        <OrgEntityPickerModal
          isOpen={showOrgPickerModal}
          onClose={() => setShowOrgPickerModal(false)}
          orgEntities={effectiveOrgEntities}
          selectedEntity={selectedOrgEntity}
          onSelectEntity={(entityName) => setSelectedOrgEntity(entityName)}
          title="اختيار التشكيل / الجهة الشاغلة للتقارير"
          subtitle="اختر تشكيلاً أو قسماً من الهيكل الإداري للشركة لتصفية وطباعة وتصدير كافة السجلات والمنشآت التابعة له"
          theme={theme}
        />
      )}
    </div>
  );
};
