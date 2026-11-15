import React, { useState, useMemo } from 'react';
import { Badge, Button, CardHeader, EmptyState, PageHeader, Select, Table, Tabs, Td } from './ui';
import {
  Building2,
  Users,
  AlertOctagon,
  Wrench,
  TrendingUp,
  Clock,
  ChevronLeft,
  CheckCircle2,
  ShieldAlert,
  MapPin,
  Activity,
  Layers,
  AlertTriangle,
  FileText,
  PieChart,
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  Zap,
  Building,
  CheckCircle,
  ExternalLink,
  Info,
  ShieldCheck,
  UserCheck,
  Compass,
  Map as MapIcon,
} from 'lucide-react';
import {
  UnitAsset,
  MaintenanceRequest,
  OccupancyRecord,
  PeriodicInspectionSchedule,
  GovernorateRef,
  OilfieldRef,
  OrgEntity,
  ReferenceUnitType,
  SystemBranding,
} from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import { INITIAL_GOVERNORATES, INITIAL_OILFIELDS } from '../data/mockData';

interface DashboardViewProps {
  units: UnitAsset[];
  maintenanceRequests: MaintenanceRequest[];
  occupancyRecords?: OccupancyRecord[];
  periodicInspections?: PeriodicInspectionSchedule[];
  governorates?: GovernorateRef[];
  oilfields?: OilfieldRef[];
  orgEntities?: OrgEntity[];
  unitTypes?: ReferenceUnitType[];
  branding?: SystemBranding;
  onSelectUnit: (unitCode: string) => void;
  onNavigateTab: (tab: any) => void;
  theme?: 'dark' | 'light';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  units,
  maintenanceRequests,
  occupancyRecords = [],
  periodicInspections = [],
  governorates = [],
  oilfields = [],
  orgEntities = [],
  unitTypes = [],
  branding,
  onSelectUnit,
  onNavigateTab,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const companyName = branding?.companyName?.trim() || 'شركة نفط الوسط';

  // Selected Governorate Filter
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all');
  // Selected Analysis Sub-Tab inside Dashboard
  const [activeSubTab, setActiveSubTab] = useState<'geo' | 'org' | 'maintenance' | 'grades'>('geo');

  // Effective Reference Lists
  const effectiveGovernorates = useMemo(() => {
    return governorates && governorates.length > 0 ? governorates : INITIAL_GOVERNORATES;
  }, [governorates]);

  const effectiveOilfields = useMemo(() => {
    return oilfields && oilfields.length > 0 ? oilfields : INITIAL_OILFIELDS;
  }, [oilfields]);

  // Selected Governorate Object
  const selectedGovObj = useMemo(() => {
    if (selectedGovernorate === 'all') return null;
    return effectiveGovernorates.find(
      (g) =>
        g.id === selectedGovernorate ||
        g.nameAr === selectedGovernorate ||
        g.code === selectedGovernorate ||
        (g.nameAr && selectedGovernorate.includes(g.nameAr)) ||
        (g.nameAr && g.nameAr.includes(selectedGovernorate))
    );
  }, [selectedGovernorate, effectiveGovernorates]);

  // Filter Units by Selected Governorate
  const filteredUnits = useMemo(() => {
    if (selectedGovernorate === 'all') return units;
    if (!selectedGovObj) return units;

    const govNameAr = selectedGovObj.nameAr.toLowerCase();
    const govCode = selectedGovObj.code ? selectedGovObj.code.toLowerCase() : '';
    const govId = selectedGovObj.id.toLowerCase();

    return units.filter((u) => {
      if (!u.governorate) return false;
      const uGov = u.governorate.toLowerCase();
      return (
        uGov === govNameAr ||
        uGov.includes(govNameAr) ||
        govNameAr.includes(uGov) ||
        (govCode && uGov.includes(govCode)) ||
        uGov.includes(govId)
      );
    });
  }, [units, selectedGovernorate, selectedGovObj]);

  // Filter Maintenance Requests by Selected Governorate / Filtered Units
  const filteredMaintenance = useMemo(() => {
    if (selectedGovernorate === 'all') return maintenanceRequests;
    const allowedCodes = new Set(filteredUnits.map((u) => u.code));
    return maintenanceRequests.filter((r) => allowedCodes.has(r.unitCode));
  }, [maintenanceRequests, filteredUnits, selectedGovernorate]);

  // Filter Periodic Inspections by Selected Governorate / Filtered Units
  const filteredInspections = useMemo(() => {
    if (selectedGovernorate === 'all') return periodicInspections;
    const allowedCodes = new Set(filteredUnits.map((u) => u.code));
    return periodicInspections.filter((ins) => allowedCodes.has(ins.unitCode));
  }, [periodicInspections, filteredUnits, selectedGovernorate]);

  // ==================== CORE STATISTICAL COMPUTATIONS ====================

  // 1. Units Overview Metrics
  const totalUnits = filteredUnits.length;
  const activeUnitsCount = filteredUnits.filter((u) => u.status !== 'decommissioned').length;
  const decommissionedUnitsCount = filteredUnits.filter((u) => u.status === 'decommissioned').length;
  const totalBuiltArea = filteredUnits.reduce((sum, u) => sum + (u.totalAreaSqM || 0), 0);
  const totalRoomsCount = filteredUnits.reduce((sum, u) => sum + (u.rooms ? u.rooms.length : 0), 0);
  const totalEquipmentCount = filteredUnits.reduce((sum, u) => sum + (u.equipment ? u.equipment.length : 0), 0);

  // 2. Occupancy Metrics
  const occupiedRoomsCount = filteredUnits.reduce(
    (sum, u) => sum + (u.rooms ? u.rooms.filter((r) => r.occupiedBy || r.status === 'Active').length : 0),
    0
  );
  const vacantRoomsCount = Math.max(0, totalRoomsCount - occupiedRoomsCount);
  const occupancyPercentage =
    totalRoomsCount > 0 ? Math.min(100, Math.round((occupiedRoomsCount / totalRoomsCount) * 100)) : 0;

  // 3. Maintenance Metrics
  const totalMaintenanceCount = filteredMaintenance.length;
  const activeMaintenanceTickets = filteredMaintenance.filter(
    (r) => r.status !== 'completed' && r.status !== 'cancelled'
  );
  const overdueMaintenanceTickets = filteredMaintenance.filter(
    (r) => (r.status === 'overdue' || (r.daysOverdue && r.daysOverdue > 0)) && r.status !== 'completed' && r.status !== 'cancelled'
  );
  const criticalMaintenanceTickets = filteredMaintenance.filter(
    (r) => r.priority === 'critical' && r.status !== 'completed' && r.status !== 'cancelled'
  );
  const completedMaintenanceTickets = filteredMaintenance.filter((r) => r.status === 'completed');
  const maintenanceCompletionRate =
    totalMaintenanceCount > 0 ? Math.round((completedMaintenanceTickets.length / totalMaintenanceCount) * 100) : 100;

  // 4. Periodic Inspection Metrics
  const totalInspectionsCount = filteredInspections.length;
  const completedInspectionsCount = filteredInspections.filter((ins) => ins.status === 'completed').length;
  const overdueInspectionsCount = filteredInspections.filter((ins) => ins.status === 'overdue').length;
  const scheduledInspectionsCount = filteredInspections.filter(
    (ins) => ins.status === 'scheduled' || ins.status === 'in_progress'
  ).length;
  const inspectionComplianceRate =
    totalInspectionsCount > 0 ? Math.round((completedInspectionsCount / totalInspectionsCount) * 100) : 100;

  // 5. Condition Grades Breakdown
  const gradeACount = filteredUnits.filter((u) => u.conditionGrade === 'A').length;
  const gradeBCount = filteredUnits.filter((u) => u.conditionGrade === 'B').length;
  const gradeCCount = filteredUnits.filter((u) => u.conditionGrade === 'C').length;
  const gradeDCount = filteredUnits.filter((u) => u.conditionGrade === 'D').length;

  const totalForGrade = Math.max(totalUnits, 1);
  const gradeAPct = Math.round((gradeACount / totalForGrade) * 100);
  const gradeBPct = Math.round((gradeBCount / totalForGrade) * 100);
  const gradeCPct = Math.round((gradeCCount / totalForGrade) * 100);
  const gradeDPct = Math.round((gradeDCount / totalForGrade) * 100);

  // 6. Distribution by Governorates
  const governorateBreakdown = useMemo(() => {
    const map: { [key: string]: { nameAr: string; count: number; totalArea: number; gradeD: number } } = {};
    
    // Seed with active governorates
    effectiveGovernorates.forEach((g) => {
      map[g.nameAr] = { nameAr: g.nameAr, count: 0, totalArea: 0, gradeD: 0 };
    });

    units.forEach((u) => {
      const gName = u.governorate || 'غير محدد';
      if (!map[gName]) {
        map[gName] = { nameAr: gName, count: 0, totalArea: 0, gradeD: 0 };
      }
      map[gName].count += 1;
      map[gName].totalArea += u.totalAreaSqM || 0;
      if (u.conditionGrade === 'D') map[gName].gradeD += 1;
    });

    const list = Object.values(map).filter((item) => item.count > 0 || selectedGovernorate === 'all');
    const totalAllUnits = Math.max(units.length, 1);

    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.count / totalAllUnits) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [units, effectiveGovernorates, selectedGovernorate]);

  // 7. Distribution by Oilfields
  const oilfieldsBreakdown = useMemo(() => {
    const map: {
      [key: string]: {
        nameAr: string;
        count: number;
        totalArea: number;
        activeCount: number;
        maintenanceCount: number;
        gradeDCount: number;
      };
    } = {};

    // Seed with active oilfields
    effectiveOilfields.forEach((f) => {
      map[f.nameAr] = {
        nameAr: f.nameAr,
        count: 0,
        totalArea: 0,
        activeCount: 0,
        maintenanceCount: 0,
        gradeDCount: 0,
      };
    });

    filteredUnits.forEach((u) => {
      const fName = u.field || 'غير محدد';
      if (!map[fName]) {
        map[fName] = {
          nameAr: fName,
          count: 0,
          totalArea: 0,
          activeCount: 0,
          maintenanceCount: 0,
          gradeDCount: 0,
        };
      }
      map[fName].count += 1;
      map[fName].totalArea += u.totalAreaSqM || 0;
      if (u.status !== 'decommissioned') map[fName].activeCount += 1;
      if (u.conditionGrade === 'D') map[fName].gradeDCount += 1;
    });

    // Count maintenance requests per field
    filteredMaintenance.forEach((req) => {
      if (req.field && map[req.field]) {
        map[req.field].maintenanceCount += 1;
      }
    });

    const list = Object.values(map).filter((item) => item.count > 0);
    const denom = Math.max(totalUnits, 1);

    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.count / denom) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [filteredUnits, filteredMaintenance, effectiveOilfields, totalUnits]);

  // 8. Distribution by Org Entities / Formations
  const orgEntitiesBreakdown = useMemo(() => {
    const map: {
      [key: string]: {
        nameAr: string;
        count: number;
        totalArea: number;
        roomsCount: number;
        occupiedRooms: number;
        vacantRooms: number;
      };
    } = {};

    filteredUnits.forEach((u) => {
      const dept = u.department || 'غير مخصص';
      if (!map[dept]) {
        map[dept] = {
          nameAr: dept,
          count: 0,
          totalArea: 0,
          roomsCount: 0,
          occupiedRooms: 0,
          vacantRooms: 0,
        };
      }
      map[dept].count += 1;
      map[dept].totalArea += u.totalAreaSqM || 0;

      const unitRooms = u.rooms || [];
      const totalRms = unitRooms.length;
      let occRms = 0;
      let vacRms = 0;

      if (totalRms === 0) {
        if (u.occupancyStatus === 'vacant') {
          vacRms = 0;
        }
      } else {
        unitRooms.forEach((r) => {
          const isOcc = !!(
            r.occupiedBy &&
            r.occupiedBy.trim().length > 0 &&
            r.occupiedBy !== 'شاغر' &&
            r.occupiedBy !== 'فارغ' &&
            r.occupiedBy !== 'فارغة' &&
            r.occupiedBy !== '-'
          );
          if (isOcc) {
            occRms += 1;
          } else {
            vacRms += 1;
          }
        });
      }

      map[dept].roomsCount += totalRms;
      map[dept].occupiedRooms += occRms;
      map[dept].vacantRooms += vacRms;
    });

    const list = Object.values(map);
    const denom = Math.max(totalUnits, 1);

    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.count / denom) * 100),
      occupancyRate: item.roomsCount > 0 ? Math.round((item.occupiedRooms / item.roomsCount) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [filteredUnits, totalUnits]);

  // 9. Distribution by Unit Types
  const unitTypesBreakdown = useMemo(() => {
    const map: { [key: string]: number } = {};
    const typeLabelMap: { [key: string]: string } = {
      caravan: 'كرفانات سكن ومكاتب (CRV)',
      building: 'مبانٍ إنشائية إدارية (BLD)',
      warehouse: 'مخازن ومستودعات (WHS)',
      equipment: 'معدات ومرافق خاصة (EQP)',
      safety_system: 'أنظمة سلامة وإطفاء (SFT)',
      storage_tank: 'خزانات ومجمعات (TNK)',
    };

    if (unitTypes && unitTypes.length > 0) {
      unitTypes.forEach((ut) => {
        typeLabelMap[ut.code] = `${ut.nameAr} (${ut.code})`;
        typeLabelMap[ut.code.toLowerCase()] = `${ut.nameAr} (${ut.code})`;
        if (ut.code === 'BLD') typeLabelMap['building'] = `${ut.nameAr} (${ut.code})`;
        if (ut.code === 'CRV') typeLabelMap['caravan'] = `${ut.nameAr} (${ut.code})`;
        if (ut.code === 'WHS') typeLabelMap['warehouse'] = `${ut.nameAr} (${ut.code})`;
      });
    }

    filteredUnits.forEach((u) => {
      let typeKey = u.unitTypeCode || u.type || 'building';
      if (!u.unitTypeCode && u.code) {
        const parts = u.code.split('-');
        if (parts.length >= 4) {
          const c = parts[2].toUpperCase();
          if (typeLabelMap[c]) typeKey = c;
        }
      }
      const label = typeLabelMap[typeKey] || (u.unitTypeCode ? `${u.unitTypeCode}` : typeKey);
      map[label] = (map[label] || 0) + 1;
    });

    const denom = Math.max(totalUnits, 1);
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / denom) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [filteredUnits, totalUnits, unitTypes]);

  return (
    <div className="ds space-y-3.5 sm:space-y-5 text-right dir-rtl w-full max-w-full overflow-hidden">
      {/* الترويسة وفلتر المحافظة */}
      <PageHeader
        icon={BarChart3}
        title="لوحة القيادة والمؤشرات"
        description={`متابعة أصول ${companyName}، الصيانة، والكشوفات عبر الحقول`}
        actions={
          <>
            <div className="w-full sm:w-56">
            <Select
              aria-label="المحافظة"
              value={selectedGovernorate}
              onChange={(e) => setSelectedGovernorate(e.target.value)}
              className="h-9 font-semibold"
            >
              <option value="all">كافة المحافظات</option>
              {effectiveGovernorates
                .filter((g) => g.status !== 'disabled')
                .map((g) => (
                  <option key={g.id} value={g.nameAr}>
                    محافظة {g.nameAr} ({g.code})
                  </option>
                ))}
            </Select>
            </div>
            <Button variant="primary" icon={MapIcon} onClick={() => onNavigateTab('gis_map')}>
              خريطة GIS
            </Button>
          </>
        }
      />

      {/* KPI METRICS GRID (COMPACT & TOUCH-FRIENDLY ON MOBILE) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        {/* KPI 1: Total Assets */}
        <div
          className={`p-2.5 sm:p-4 rounded-xl border transition shadow-xs flex flex-col justify-between min-w-0 overflow-hidden bg-card border-slate-200 shadow-xs`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className={`text-[11px] sm:text-xs font-bold truncate text-slate-600`}>
              الوحدات والأصول
            </span>
            <div className="p-1.5 sm:p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className={`text-base sm:text-xl font-black truncate text-slate-900`}>
              {toArabicDigits(totalUnits)} أصل
            </div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-1 text-[10px] sm:text-[11px] gap-0.5 min-w-0">
              <span className="text-emerald-600 font-bold truncate">{toArabicDigits(activeUnitsCount)} نشط</span>
              <span className={`truncate text-slate-500`}>
                {toArabicDigits(totalBuiltArea.toLocaleString('ar-IQ'))} م²
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Occupancy Rate */}
        <div
          className={`p-2.5 sm:p-4 rounded-xl border transition shadow-xs flex flex-col justify-between min-w-0 overflow-hidden bg-card border-slate-200 shadow-xs`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className={`text-[11px] sm:text-xs font-bold truncate text-slate-600`}>
              نسبة الإشغال
            </span>
            <div className="p-1.5 sm:p-2 bg-sky-500/10 text-sky-600 rounded-lg shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className={`text-base sm:text-xl font-black truncate text-slate-900`}>
              {toArabicDigits(occupancyPercentage)}%
            </div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-1 text-[10px] sm:text-[11px] gap-0.5 min-w-0">
              <span className="text-sky-600 font-bold truncate">{toArabicDigits(occupiedRoomsCount)} مأهولة</span>
              <span className={`truncate text-slate-500`}>
                {toArabicDigits(vacantRoomsCount)} شاغرة
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Maintenance Requests */}
        <div
          className={`p-2.5 sm:p-4 rounded-xl border transition shadow-xs flex flex-col justify-between min-w-0 overflow-hidden bg-card border-slate-200 shadow-xs`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className={`text-[11px] sm:text-xs font-bold truncate text-slate-600`}>
              بلاغات الصيانة
            </span>
            <div className="p-1.5 sm:p-2 bg-red-500/10 text-red-600 rounded-lg shrink-0">
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className="text-base sm:text-xl font-black text-red-600 flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="truncate">{toArabicDigits(activeMaintenanceTickets.length)} نشط</span>
              {overdueMaintenanceTickets.length > 0 && (
                <span className="text-[9px] sm:text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-mono font-bold animate-pulse shrink-0">
                  {toArabicDigits(overdueMaintenanceTickets.length)} متأخر
                </span>
              )}
            </div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-1 text-[10px] sm:text-[11px] gap-0.5 min-w-0">
              <span className="text-emerald-600 font-bold truncate">{toArabicDigits(completedMaintenanceTickets.length)} منجز</span>
              <span className={`truncate text-slate-500`}>
                إنجاز {toArabicDigits(maintenanceCompletionRate)}%
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Periodic Inspections */}
        <div
          className={`p-2.5 sm:p-4 rounded-xl border transition shadow-xs flex flex-col justify-between min-w-0 overflow-hidden bg-card border-slate-200 shadow-xs`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className={`text-[11px] sm:text-xs font-bold truncate text-slate-600`}>
              الكشوفات الدورية
            </span>
            <div className="p-1.5 sm:p-2 bg-indigo-500/10 text-indigo-600 rounded-lg shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className={`text-base sm:text-xl font-black truncate text-slate-900`}>
              {toArabicDigits(totalInspectionsCount)} كشف
            </div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-1 text-[10px] sm:text-[11px] gap-0.5 min-w-0">
              <span className="text-emerald-600 font-bold truncate">{toArabicDigits(completedInspectionsCount)} مكتمل</span>
              <span className={`truncate ${overdueInspectionsCount > 0 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                {overdueInspectionsCount > 0 ? `${toArabicDigits(overdueInspectionsCount)} متأخر` : `${toArabicDigits(scheduledInspectionsCount)} مجدول`}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Grade D Critical Units */}
        <div
          className={`p-2.5 sm:p-4 rounded-xl border transition shadow-xs flex flex-col justify-between min-w-0 overflow-hidden bg-card border-slate-200 shadow-xs`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className={`text-[11px] sm:text-xs font-bold truncate text-slate-600`}>
              وحدات حرجة (D)
            </span>
            <div className="p-1.5 sm:p-2 bg-brand-50 text-brand-700 rounded-lg shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className="text-base sm:text-xl font-black text-brand-700 truncate">
              {toArabicDigits(gradeDCount)} وحدة
            </div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-1 text-[10px] sm:text-[11px] gap-0.5 min-w-0">
              <span className="text-brand-700 font-bold truncate">{toArabicDigits(gradeDPct)}% حرجة</span>
              <span className={`truncate text-slate-500`}>
                {gradeDCount > 0 ? 'تتطلب تأهيلاً' : 'سلامة تامة'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 6: Formations & Reach */}
        <div
          className={`p-2.5 sm:p-4 rounded-xl border transition shadow-xs flex flex-col justify-between min-w-0 overflow-hidden bg-card border-slate-200 shadow-xs`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className={`text-[11px] sm:text-xs font-bold truncate text-slate-600`}>
              التشكيلات والحقول
            </span>
            <div className="p-1.5 sm:p-2 bg-purple-500/10 text-purple-600 rounded-lg shrink-0">
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 min-w-0">
            <div className={`text-base sm:text-xl font-black truncate text-slate-900`}>
              {toArabicDigits(oilfieldsBreakdown.length)} حقل
            </div>
            <div className="flex flex-col xs:flex-row xs:items-center justify-between mt-1 text-[10px] sm:text-[11px] gap-0.5 min-w-0">
              <span className="text-purple-600 font-bold truncate">{toArabicDigits(orgEntitiesBreakdown.length)} تشكيل</span>
              <span className={`truncate text-slate-500`}>
                {toArabicDigits(governorateBreakdown.length)} محافظة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EXECUTIVE AUTOMATED INSIGHTS BANNER */}
      <div
        className={`p-3 sm:p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-3 text-xs bg-brand-50 border-brand-200 text-slate-800`}
      >
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="p-1.5 sm:p-2 bg-brand-700 text-on-brand rounded-lg font-bold shrink-0 mt-0.5 sm:mt-0">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="font-black text-brand-700 block sm:inline">ملخص الرصد:</span>{' '}
            <span className={`text-[11px] sm:text-xs leading-relaxed text-slate-700`}>
              يوجد {toArabicDigits(overdueMaintenanceTickets.length)} بلاغ صيانة متأخر و {toArabicDigits(gradeDCount)} وحدة حرجة D.
            </span>
          </div>
        </div>
        <div className="w-full md:w-auto flex items-center justify-end shrink-0 font-bold">
          <button
            onClick={() => onNavigateTab('maintenance')}
            className="w-full md:w-auto bg-brand-700 hover:bg-brand-800 text-on-brand px-3 py-2 rounded-lg transition text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <span>متابعة الصيانة المتأخرة</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ANALYTICS SECTION WITH TABS */}
      <div
        className={`rounded-2xl border shadow-sm transition overflow-hidden bg-card border-slate-200`}
      >
        <CardHeader icon={Layers} title="التحليلات والمؤشرات التفصيلية" />
        <div className="px-3 pt-3 sm:px-5 sm:pt-4">
          <Tabs
            value={activeSubTab}
            onChange={setActiveSubTab}
            tabs={[
              { key: 'geo', label: 'المحافظات والحقول', icon: MapPin, count: oilfieldsBreakdown.length },
              { key: 'org', label: 'التشكيلات والجهات الشاغلة', icon: Building, count: orgEntitiesBreakdown.length },
              { key: 'maintenance', label: 'الصيانة والكشف الدوري', icon: Activity, count: filteredMaintenance.length },
              { key: 'grades', label: 'السلامة وأنواع المباني', icon: ShieldCheck },
            ]}
          />
        </div>

        {/* Tab 1: Governorates & Oilfields Breakdown */}
        {activeSubTab === 'geo' && (
          <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-6">
            {/* Oilfields Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold text-xs text-slate-800`}>
                  توزيع الأصول والمساحات على الحقول والقطاعات النفطية:
                </h3>
                <span className={`text-[11px] text-slate-500`}>
                  مرتبة حسب كثافة الأصول
                </span>
              </div>

              {oilfieldsBreakdown.length === 0 ? (
                <div className={`p-6 text-center text-xs text-slate-500`}>
                  لا توجد أصول مسجلة في هذا النطاق
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {oilfieldsBreakdown.map((fld, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition space-y-2.5 bg-slate-50/80 border-slate-200 hover:border-brand-200`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-brand-700"></div>
                          <span className={`font-black text-sm text-slate-900`}>
                            حقل {fld.nameAr}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-md">
                          {toArabicDigits(fld.percentage)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 xs:gap-2 text-center text-[10px] xs:text-[11px] font-bold">
                        <div className={`p-1.5 xs:p-2 rounded-lg border min-w-0 overflow-hidden bg-card border-slate-200`}>
                          <div className={`truncate text-slate-500`}>الوحدات</div>
                          <div className="text-brand-700 font-black text-xs xs:text-sm truncate">{toArabicDigits(fld.count)}</div>
                        </div>
                        <div className={`p-1.5 xs:p-2 rounded-lg border min-w-0 overflow-hidden bg-card border-slate-200`}>
                          <div className={`truncate text-slate-500`}>المساحة</div>
                          <div className={`font-black text-[10px] xs:text-xs truncate text-slate-800`}>
                            {toArabicDigits(fld.totalArea.toLocaleString('ar-IQ'))} م²
                          </div>
                        </div>
                        <div className={`p-1.5 xs:p-2 rounded-lg border min-w-0 overflow-hidden bg-card border-slate-200`}>
                          <div className={`truncate text-slate-500`}>بلاغات الصيانة</div>
                          <div className={`font-black text-xs xs:text-sm truncate ${fld.maintenanceCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {toArabicDigits(fld.maintenanceCount)}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className={`w-full rounded-full h-2 overflow-hidden bg-slate-200`}>
                        <div
                          className="bg-brand-700 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(fld.percentage, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Governorates Distribution Progress List */}
            <div className={`p-3.5 sm:p-4 rounded-xl border bg-slate-50/50 border-slate-200`}>
              <h3 className={`font-bold text-xs mb-3 text-slate-800`}>
                التوزيع الجغرافي الكلي للمحافظات العراقية:
              </h3>
              <div className="space-y-3">
                {governorateBreakdown.map((gov, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold gap-2 min-w-0 flex-wrap">
                      <span className={`truncate text-slate-800`}>
                        محافظة {gov.nameAr}
                      </span>
                      <span className={`text-[10px] xs:text-[11px] sm:text-xs shrink-0 text-slate-600`}>
                        {toArabicDigits(gov.count)} أصل ({toArabicDigits(gov.percentage)}%) • {toArabicDigits(gov.totalArea.toLocaleString('ar-IQ'))} م²
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-2.5 overflow-hidden bg-slate-200`}>
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(gov.percentage, 3)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Formations & Org Entities */}
        {activeSubTab === 'org' && (
          <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-bold text-xs text-slate-800`}>
                توزيع الوحدات والمباني على التشكيلات والجهات الشاغلة بالهيكل التنظيمي ومتابعة الغرف الشاغرة:
              </h3>
            </div>

            {/* Quick Summary KPIs for Occupancy & Vacancy across Formations */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border bg-slate-50 border-slate-200`}>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 min-w-0">
                <span className={`text-[10.5px] sm:text-xs truncate text-slate-600`}>التشكيلات النشطة:</span>
                <span className="font-bold font-mono text-[10.5px] sm:text-xs text-purple-600 truncate">{toArabicDigits(orgEntitiesBreakdown.length)} تشكيل</span>
              </div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 min-w-0">
                <span className={`text-[10.5px] sm:text-xs truncate text-slate-600`}>المباني المخصصة:</span>
                <span className="font-bold font-mono text-[10.5px] sm:text-xs text-brand-700 truncate">{toArabicDigits(filteredUnits.length)} مبنى</span>
              </div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 min-w-0">
                <span className={`text-[10.5px] sm:text-xs truncate text-slate-600`}>الغرف المشغولة:</span>
                <span className="font-bold font-mono text-[10.5px] sm:text-xs text-sky-600 truncate">
                  {toArabicDigits(orgEntitiesBreakdown.reduce((sum, o) => sum + o.occupiedRooms, 0))} غرفة
                </span>
              </div>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 bg-brand-50 px-2 py-1 rounded-lg border border-brand-200 min-w-0">
                <span className="text-[10.5px] sm:text-xs font-bold text-brand-700 truncate">الغرف الشاغرة:</span>
                <span className="font-black font-mono text-[10.5px] sm:text-xs text-brand-700 truncate">
                  {toArabicDigits(orgEntitiesBreakdown.reduce((sum, o) => sum + o.vacantRooms, 0))} غرفة
                </span>
              </div>
            </div>

            {orgEntitiesBreakdown.length === 0 ? (
              <div className={`p-6 text-center text-xs text-slate-500`}>
                لا توجد تشكيلات مخصصة حالياً
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {orgEntitiesBreakdown.map((org, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition space-y-2.5 bg-slate-50/80 border-slate-200 hover:border-brand-200 shadow-xs`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-black text-sm text-slate-900`}>
                        {org.nameAr}
                      </span>
                      <span className="text-xs font-mono font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 px-2 py-0.5 rounded-md">
                        {toArabicDigits(org.percentage)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className={'text-slate-600'}>عدد المباني المخصصة:</span>
                      <span className="font-bold text-brand-700">{toArabicDigits(org.count)} وحدة</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={'text-slate-600'}>إجمالي الغرف والمكاتب:</span>
                      <span className={`font-bold text-slate-800`}>
                        {toArabicDigits(org.roomsCount)} غرفة
                      </span>
                    </div>

                    {/* Occupied vs Vacant Rooms detail */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className={`p-2 rounded-lg border text-xs flex flex-col items-center bg-sky-50 border-sky-200 text-sky-900`}>
                        <span className="text-[10px] text-slate-500">الغرف المشغولة</span>
                        <span className="font-black font-mono text-xs text-sky-600">
                          {toArabicDigits(org.occupiedRooms)} غرفة
                        </span>
                      </div>

                      <div className={`p-2 rounded-lg border text-xs flex flex-col items-center ${
                        org.vacantRooms > 0
                          ? 'bg-brand-50 border-brand-200 text-brand-800'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        <span className="text-[10px] text-slate-500">الغرف الشاغرة (فارغة)</span>
                        <span className={`font-black font-mono text-xs ${org.vacantRooms > 0 ? 'text-brand-700' : 'text-slate-500'}`}>
                          {toArabicDigits(org.vacantRooms)} فارغة
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className={'text-slate-600'}>المساحة المغلولة:</span>
                      <span className={`font-mono font-bold text-slate-800`}>
                        {toArabicDigits(org.totalArea.toLocaleString('ar-IQ'))} م²
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className={'text-slate-500'}>نسبة إشغال الغرف:</span>
                        <span className="font-mono font-bold text-purple-600">{toArabicDigits(org.occupancyRate)}%</span>
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden bg-slate-200`}>
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(org.occupancyRate, 3)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Maintenance & Inspections */}
        {activeSubTab === 'maintenance' && (
          <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-6">
            {/* KPI Progress Bars for Maintenance & Inspections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border bg-slate-50/80 border-slate-200`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold text-xs text-slate-800`}>
                    معدل إنجاز طلبات الصيانة الميدانية:
                  </span>
                  <span className="font-black text-brand-700">{toArabicDigits(maintenanceCompletionRate)}%</span>
                </div>
                <div className={`w-full rounded-full h-3 overflow-hidden bg-slate-200`}>
                  <div
                    className="bg-brand-700 h-full rounded-full transition-all duration-500"
                    style={{ width: `${maintenanceCompletionRate}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] mt-2 text-slate-500">
                  <span>منجز: {toArabicDigits(completedMaintenanceTickets.length)}</span>
                  <span>نشط: {toArabicDigits(activeMaintenanceTickets.length)}</span>
                  <span>متأخر: {toArabicDigits(overdueMaintenanceTickets.length)}</span>
                </div>
              </div>

              <div className={`p-4 rounded-xl border bg-slate-50/80 border-slate-200`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold text-xs text-slate-800`}>
                    معدل الالتزام بالكشوفات الدورية (HSE & إنشائي):
                  </span>
                  <span className="font-black text-indigo-600">{toArabicDigits(inspectionComplianceRate)}%</span>
                </div>
                <div className={`w-full rounded-full h-3 overflow-hidden bg-slate-200`}>
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${inspectionComplianceRate}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] mt-2 text-slate-500">
                  <span>مكتمل: {toArabicDigits(completedInspectionsCount)}</span>
                  <span>مجدول: {toArabicDigits(scheduledInspectionsCount)}</span>
                  <span>متأخر: {toArabicDigits(overdueInspectionsCount)}</span>
                </div>
              </div>
            </div>

            {/* أحدث طلبات الصيانة */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <CardHeader
                title="أحدث طلبات الصيانة"
                actions={
                  <Button size="sm" variant="ghost" onClick={() => onNavigateTab('maintenance')}>
                    عرض كل الطلبات
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                }
              />
              {filteredMaintenance.length === 0 ? (
                <EmptyState text="لا توجد طلبات صيانة في هذا النطاق" />
              ) : (
                <Table head={['رقم الطلب', 'رمز الوحدة', 'الحقل', 'طبيعة العطل', 'الأولوية', 'جهة الصيانة', 'الحالة', '']}>
                  {filteredMaintenance.slice(0, 6).map((req) => (
                    <tr key={req.id}>
                      <Td className="font-mono font-bold text-brand-700">{req.id}</Td>
                      <Td className="font-mono font-semibold">{req.unitCode}</Td>
                      <Td>{req.field}</Td>
                      <Td>{req.issue}</Td>
                      <Td>{req.priority === 'critical' ? <Badge tone="red">طارئة جداً</Badge> : <Badge>اعتيادية</Badge>}</Td>
                      <Td>{req.maintenanceDepartment || 'الصيانة العامة'}</Td>
                      <Td>
                        {req.status === 'completed' ? (
                          <Badge tone="green">منجز</Badge>
                        ) : req.status === 'overdue' ? (
                          <Badge tone="red">متأخر</Badge>
                        ) : req.status === 'rejected' ? (
                          <Badge tone="red">مرفوض</Badge>
                        ) : req.status === 'cancelled' ? (
                          <Badge>ملغى</Badge>
                        ) : (
                          <Badge tone="blue">قيد التنفيذ</Badge>
                        )}
                      </Td>
                      <Td>
                        <Button size="sm" onClick={() => onSelectUnit(req.unitCode)}>
                          معاينة الوحدة
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Engineering Grades & Unit Types */}
        {activeSubTab === 'grades' && (
          <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-6">
            {/* Condition Grade Grid (2x2 on mobile, 4-col on desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className={`p-2.5 sm:p-4 rounded-xl border min-w-0 overflow-hidden break-words bg-emerald-50/60 border-emerald-200`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[11px] sm:text-xs text-emerald-600 truncate">Grade A ممتاز</span>
                  <span className="text-sm xs:text-base sm:text-lg font-black text-emerald-600 shrink-0">{toArabicDigits(gradeAPct)}%</span>
                </div>
                <div className="text-base sm:text-xl font-black text-emerald-600 mt-1 sm:mt-2 truncate">{toArabicDigits(gradeACount)} وحدة</div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-snug break-words">مطابقة لمعايير HSE السلامة</p>
              </div>

              <div className={`p-2.5 sm:p-4 rounded-xl border min-w-0 overflow-hidden break-words bg-blue-50/60 border-blue-200`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[11px] sm:text-xs text-blue-600 truncate">Grade B جيد جداً</span>
                  <span className="text-sm xs:text-base sm:text-lg font-black text-blue-600 shrink-0">{toArabicDigits(gradeBPct)}%</span>
                </div>
                <div className="text-base sm:text-xl font-black text-blue-600 mt-1 sm:mt-2 truncate">{toArabicDigits(gradeBCount)} وحدة</div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-snug break-words">عيوب طفيفة لا تؤثر تشغيلياً</p>
              </div>

              <div className={`p-2.5 sm:p-4 rounded-xl border min-w-0 overflow-hidden break-words bg-brand-50 border-brand-200`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[11px] sm:text-xs text-brand-700 truncate">Grade C متوسط</span>
                  <span className="text-sm xs:text-base sm:text-lg font-black text-brand-700 shrink-0">{toArabicDigits(gradeCPct)}%</span>
                </div>
                <div className="text-base sm:text-xl font-black text-brand-700 mt-1 sm:mt-2 truncate">{toArabicDigits(gradeCCount)} وحدة</div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-snug break-words">بحاجة لصيانة وتأهيل</p>
              </div>

              <div className={`p-2.5 sm:p-4 rounded-xl border min-w-0 overflow-hidden break-words bg-red-50/60 border-red-200`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[11px] sm:text-xs text-red-600 truncate">Grade D حرج</span>
                  <span className="text-sm xs:text-base sm:text-lg font-black text-red-600 shrink-0">{toArabicDigits(gradeDPct)}%</span>
                </div>
                <div className="text-base sm:text-xl font-black text-red-600 mt-1 sm:mt-2 truncate">{toArabicDigits(gradeDCount)} وحدة</div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-snug break-words">حالة حرجة تتطلب تدخلاً</p>
              </div>
            </div>

            {/* Breakdown by Unit Types */}
            <div className={`p-4 rounded-xl border bg-slate-50/50 border-slate-200`}>
              <h3 className={`font-bold text-xs mb-3 text-slate-800`}>
                توزيع الوحدات حسب الفئة والتصنيف الهيكلي:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unitTypesBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border bg-card border-slate-200`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-bold text-slate-800`}>{item.name}</span>
                      <span className="text-brand-700 font-black">{toArabicDigits(item.count)} وحدة</span>
                    </div>
                    <div className={`w-full rounded-full h-1.5 overflow-hidden mt-2 bg-slate-100`}>
                      <div
                        className="bg-brand-700 h-full rounded-full"
                        style={{ width: `${Math.max(item.percentage, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
