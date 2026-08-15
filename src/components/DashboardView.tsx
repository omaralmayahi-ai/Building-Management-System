import React, { useState, useMemo } from 'react';
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
  onSelectUnit,
  onNavigateTab,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

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
    const map: { [key: string]: { nameAr: string; count: number; totalArea: number; roomsCount: number } } = {};

    filteredUnits.forEach((u) => {
      const dept = u.department || 'غير مخصص';
      if (!map[dept]) {
        map[dept] = { nameAr: dept, count: 0, totalArea: 0, roomsCount: 0 };
      }
      map[dept].count += 1;
      map[dept].totalArea += u.totalAreaSqM || 0;
      map[dept].roomsCount += u.rooms ? u.rooms.length : 0;
    });

    const list = Object.values(map);
    const denom = Math.max(totalUnits, 1);

    return list.map((item) => ({
      ...item,
      percentage: Math.round((item.count / denom) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [filteredUnits, totalUnits]);

  // 9. Distribution by Unit Types
  const unitTypesBreakdown = useMemo(() => {
    const map: { [key: string]: number } = {};
    const typeLabelMap: { [key: string]: string } = {
      caravan: 'كرفانات سكن ومكاتب',
      building: 'مبانٍ إنشائية ثابتة',
      warehouse: 'مخازن ومستودعات',
      equipment: 'معدات ومرافق خاصة',
      safety_system: 'أنظمة سلامة وإطفاء',
      storage_tank: 'خزانات ومجمعات',
    };

    filteredUnits.forEach((u) => {
      const typeKey = u.type || 'building';
      const label = typeLabelMap[typeKey] || typeKey;
      map[label] = (map[label] || 0) + 1;
    });

    const denom = Math.max(totalUnits, 1);
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / denom) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [filteredUnits, totalUnits]);

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* HEADER & GOVERNORATE FILTER BAR */}
      <div
        className={`p-5 rounded-2xl border transition shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                لوحة القيادة والمؤشرات الإستراتيجية
              </h1>
              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                مزامنة حية
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              متابعة شامـلة لأصول شركة نفط الوسط، طلبات الصيانة الميدانية، والكشوفات الدورية عبر المحافظات والحقول
            </p>
          </div>
        </div>

        {/* Global Governorate Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>فلتر نطاق المحافظة:</span>
          </div>
          <select
            value={selectedGovernorate}
            onChange={(e) => setSelectedGovernorate(e.target.value)}
            className={`text-xs font-bold rounded-xl px-3 py-2 border outline-none cursor-pointer transition ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                : 'bg-slate-950 border-slate-800 text-amber-400 focus:border-amber-500'
            }`}
          >
            <option value="all">كافة المحافظات العراقية (شامل)</option>
            {effectiveGovernorates
              .filter((g) => g.status !== 'disabled')
              .map((g) => (
                <option key={g.id} value={g.nameAr}>
                  محافظة {g.nameAr} ({g.code})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* KPI METRICS GRID (6 HIGH-IMPACT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Total Assets */}
        <div
          onClick={() => onNavigateTab('units')}
          className={`p-4 rounded-xl border transition shadow-sm cursor-pointer flex flex-col justify-between group ${
            isLight
              ? 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              الوحدات والأصول
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:scale-110 transition">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {toArabicDigits(totalUnits)} أصل
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-emerald-500 font-bold">{toArabicDigits(activeUnitsCount)} نشط</span>
              <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>
                {toArabicDigits(totalBuiltArea.toLocaleString('ar-IQ'))} م²
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Occupancy Rate */}
        <div
          onClick={() => onNavigateTab('units')}
          className={`p-4 rounded-xl border transition shadow-sm cursor-pointer flex flex-col justify-between group ${
            isLight
              ? 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-sky-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              نسبة الإشغال
            </span>
            <div className="p-2 bg-sky-500/10 text-sky-500 rounded-lg group-hover:scale-110 transition">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {toArabicDigits(occupancyPercentage)}%
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-sky-500 font-bold">{toArabicDigits(occupiedRoomsCount)} مأهولة</span>
              <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>
                {toArabicDigits(vacantRoomsCount)} شاغرة
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Maintenance Requests */}
        <div
          onClick={() => onNavigateTab('maintenance')}
          className={`p-4 rounded-xl border transition shadow-sm cursor-pointer flex flex-col justify-between group ${
            isLight
              ? 'bg-white border-slate-200 hover:border-red-400 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              بلاغات الصيانة
            </span>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg group-hover:scale-110 transition">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-red-500 flex items-center gap-1.5">
              <span>{toArabicDigits(activeMaintenanceTickets.length)} نشط</span>
              {overdueMaintenanceTickets.length > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                  {toArabicDigits(overdueMaintenanceTickets.length)} متأخر
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-emerald-500 font-bold">{toArabicDigits(completedMaintenanceTickets.length)} منجز</span>
              <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>
                نسبة الإنجاز {toArabicDigits(maintenanceCompletionRate)}%
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Periodic Inspections */}
        <div
          onClick={() => onNavigateTab('inspections')}
          className={`p-4 rounded-xl border transition shadow-sm cursor-pointer flex flex-col justify-between group ${
            isLight
              ? 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              الكشوفات الدورية
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg group-hover:scale-110 transition">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {toArabicDigits(totalInspectionsCount)} كشف
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-emerald-500 font-bold">{toArabicDigits(completedInspectionsCount)} مكتمل</span>
              <span className={overdueInspectionsCount > 0 ? 'text-red-500 font-bold' : isLight ? 'text-slate-500' : 'text-slate-500'}>
                {overdueInspectionsCount > 0 ? `${toArabicDigits(overdueInspectionsCount)} متأخر` : `${toArabicDigits(scheduledInspectionsCount)} مجدول`}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Grade D Critical Units */}
        <div
          onClick={() => onNavigateTab('units')}
          className={`p-4 rounded-xl border transition shadow-sm cursor-pointer flex flex-col justify-between group ${
            isLight
              ? 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              وحدات حرجة (Grade D)
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg group-hover:scale-110 transition">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-amber-500">
              {toArabicDigits(gradeDCount)} وحدة
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-amber-500 font-bold">{toArabicDigits(gradeDPct)}% من الإجمالي</span>
              <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>
                {gradeDCount > 0 ? 'تتطلب تأهيلاً' : 'سلامة متكاملة'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 6: Formations & Reach */}
        <div
          onClick={() => onNavigateTab('org_structure')}
          className={`p-4 rounded-xl border transition shadow-sm cursor-pointer flex flex-col justify-between group ${
            isLight
              ? 'bg-white border-slate-200 hover:border-purple-400 hover:shadow-md'
              : 'bg-slate-900 border-slate-800 hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              التشكيلات والحقول
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg group-hover:scale-110 transition">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {toArabicDigits(oilfieldsBreakdown.length)} حقل
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-purple-500 font-bold">{toArabicDigits(orgEntitiesBreakdown.length)} تشكيل</span>
              <span className={isLight ? 'text-slate-500' : 'text-slate-500'}>
                {toArabicDigits(governorateBreakdown.length)} محافظة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EXECUTIVE AUTOMATED INSIGHTS BANNER */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs ${
          isLight
            ? 'bg-amber-50/60 border-amber-200 text-slate-800'
            : 'bg-amber-500/10 border-amber-500/20 text-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-lg font-bold shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <span className="font-black text-amber-600 dark:text-amber-400">ملخص الرصد التلقائي للنظام:</span>
            <p className={isLight ? 'text-slate-700' : 'text-slate-300'}>
              تم تسريب {toArabicDigits(overdueMaintenanceTickets.length)} بلاغات صيانة متأخرة عن الجدول المحدد، وتوجد{' '}
              {toArabicDigits(gradeDCount)} وحدة مصنفة بدرجة سلامة حرجة D في قطاعات النفط. ينصح بتكليف الكوادر الهندسية.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 font-bold">
          <button
            onClick={() => onNavigateTab('maintenance')}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>متابعة الصيانة المتأخرة</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ANALYTICS SECTION WITH TABS */}
      <div
        className={`rounded-2xl border shadow-sm transition ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Navigation Tabs Header */}
        <div
          className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
            isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <h2 className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              التحليلات والمؤشرات التفصيلية
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('geo')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'geo'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>توزيع المحافظات والحقول ({oilfieldsBreakdown.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('org')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'org'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>التشكيلات والجهات الشاغلة ({orgEntitiesBreakdown.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('maintenance')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'maintenance'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>الصيانة والتفتيش الدوري</span>
            </button>

            <button
              onClick={() => setActiveSubTab('grades')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'grades'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>السلامة وأنواع المباني</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Governorates & Oilfields Breakdown */}
        {activeSubTab === 'geo' && (
          <div className="p-5 space-y-6">
            {/* Oilfields Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  توزيع الأصول والمساحات على الحقول والقطاعات النفطية:
                </h3>
                <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  مرتبة حسب كثافة الأصول
                </span>
              </div>

              {oilfieldsBreakdown.length === 0 ? (
                <div className={`p-6 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  لا توجد أصول مسجلة في هذا النطاق
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {oilfieldsBreakdown.map((fld, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition space-y-2.5 ${
                        isLight
                          ? 'bg-slate-50/80 border-slate-200 hover:border-amber-400'
                          : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                          <span className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                            حقل {fld.nameAr}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md">
                          {toArabicDigits(fld.percentage)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                        <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                          <div className={isLight ? 'text-slate-500' : 'text-slate-400'}>الوحدات</div>
                          <div className="text-amber-500 font-black text-sm">{toArabicDigits(fld.count)}</div>
                        </div>
                        <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                          <div className={isLight ? 'text-slate-500' : 'text-slate-400'}>المساحة</div>
                          <div className={`font-black text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {toArabicDigits(fld.totalArea.toLocaleString('ar-IQ'))} م²
                          </div>
                        </div>
                        <div className={`p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                          <div className={isLight ? 'text-slate-500' : 'text-slate-400'}>بلاغات الصيانة</div>
                          <div className={fld.maintenanceCount > 0 ? 'text-red-500 font-black text-sm' : 'text-emerald-500 font-black text-sm'}>
                            {toArabicDigits(fld.maintenanceCount)}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className={`w-full rounded-full h-2 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(fld.percentage, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Governorates Distribution Progress List */}
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
              <h3 className={`font-bold text-xs mb-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                التوزيع الجغرافي الكلي للمحافظات العراقية:
              </h3>
              <div className="space-y-3">
                {governorateBreakdown.map((gov, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                        محافظة {gov.nameAr}
                      </span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                        {toArabicDigits(gov.count)} أصل ({toArabicDigits(gov.percentage)}%) - الإجمالي:{' '}
                        {toArabicDigits(gov.totalArea.toLocaleString('ar-IQ'))} م²
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-2.5 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
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
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                توزيع الوحدات والمباني على التشكيلات والجهات الشاغلة بالهيكل التنظيمي:
              </h3>
              <button
                onClick={() => onNavigateTab('org_structure')}
                className="text-xs text-amber-500 hover:underline font-bold flex items-center gap-1"
              >
                <span>إدارة الهيكل التنظيمي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {orgEntitiesBreakdown.length === 0 ? (
              <div className={`p-6 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                لا توجد تشكيلات مخصصة حالياً
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {orgEntitiesBreakdown.map((org, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition space-y-2 ${
                      isLight
                        ? 'bg-slate-50/80 border-slate-200 hover:border-amber-400'
                        : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        {org.nameAr}
                      </span>
                      <span className="text-xs font-mono font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2 py-0.5 rounded-md">
                        {toArabicDigits(org.percentage)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>عدد المباني المخصصة:</span>
                      <span className="font-bold text-amber-500">{toArabicDigits(org.count)} وحدة</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>إجمالي الغرف والمكاتب:</span>
                      <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        {toArabicDigits(org.roomsCount)} غرفة
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>المساحة المغلولة:</span>
                      <span className={`font-mono font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        {toArabicDigits(org.totalArea.toLocaleString('ar-IQ'))} م²
                      </span>
                    </div>

                    <div className={`w-full rounded-full h-2 overflow-hidden mt-2 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(org.percentage, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Maintenance & Inspections */}
        {activeSubTab === 'maintenance' && (
          <div className="p-5 space-y-6">
            {/* KPI Progress Bars for Maintenance & Inspections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    معدل إنجاز طلبات الصيانة الميدانية:
                  </span>
                  <span className="font-black text-amber-500">{toArabicDigits(maintenanceCompletionRate)}%</span>
                </div>
                <div className={`w-full rounded-full h-3 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${maintenanceCompletionRate}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] mt-2 text-slate-500">
                  <span>منجز: {toArabicDigits(completedMaintenanceTickets.length)}</span>
                  <span>نشط: {toArabicDigits(activeMaintenanceTickets.length)}</span>
                  <span>متأخر: {toArabicDigits(overdueMaintenanceTickets.length)}</span>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    معدل الالتزام بالكشوفات الدورية (HSE & إنشائي):
                  </span>
                  <span className="font-black text-indigo-500">{toArabicDigits(inspectionComplianceRate)}%</span>
                </div>
                <div className={`w-full rounded-full h-3 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
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

            {/* Recent Maintenance Requests Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  أحدث طلبات الصيانة الميدانية المسجلة:
                </h3>
                <button
                  onClick={() => onNavigateTab('maintenance')}
                  className="text-xs text-amber-500 hover:underline font-bold flex items-center gap-1"
                >
                  <span>عرض جميع الطلبات</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {filteredMaintenance.length === 0 ? (
                <div className={`p-6 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  لا توجد طلبات صيانة في هذا النطاق
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className={isLight ? 'bg-slate-100 text-slate-700 border-b border-slate-200' : 'bg-slate-950 text-slate-400 border-b border-slate-800'}>
                        <th className="p-3 font-semibold">رقم الطلب</th>
                        <th className="p-3 font-semibold">رمز الأصل</th>
                        <th className="p-3 font-semibold">الحقل</th>
                        <th className="p-3 font-semibold">طبيعة العطل</th>
                        <th className="p-3 font-semibold">الأولوية</th>
                        <th className="p-3 font-semibold">الفريق المكلف</th>
                        <th className="p-3 font-semibold">الحالة</th>
                        <th className="p-3 font-semibold text-center">معاينة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredMaintenance.slice(0, 6).map((req) => (
                        <tr key={req.id} className={isLight ? 'hover:bg-amber-50/40 text-slate-800' : 'hover:bg-slate-800/40 text-slate-200'}>
                          <td className="p-3 font-mono font-bold text-amber-500">{req.id}</td>
                          <td className="p-3 font-mono font-semibold">{req.unitCode}</td>
                          <td className="p-3">{req.field}</td>
                          <td className="p-3 font-medium">{req.issue}</td>
                          <td className="p-3">
                            {req.priority === 'critical' ? (
                              <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                طارئة جداً
                              </span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                اعتيادية
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500">{req.assignedTo}</td>
                          <td className="p-3">
                            {req.status === 'completed' ? (
                              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                منجز
                              </span>
                            ) : req.status === 'overdue' ? (
                              <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                متأخر
                              </span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                                قيد التنفيذ
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => onSelectUnit(req.unitCode)}
                              className="bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-slate-950 px-2.5 py-1 rounded transition text-[11px] font-bold cursor-pointer"
                            >
                              معاينة الأصل
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Engineering Grades & Unit Types */}
        {activeSubTab === 'grades' && (
          <div className="p-5 space-y-6">
            {/* Condition Grade Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-emerald-50/60 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">Grade A - ممتاز</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{toArabicDigits(gradeAPct)}%</span>
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{toArabicDigits(gradeACount)} وحدة</div>
                <p className="text-[11px] text-slate-500 mt-1">مطابقة لمعايير HSE السلامة والإنشاء الكلي</p>
              </div>

              <div className={`p-4 rounded-xl border ${isLight ? 'bg-blue-50/60 border-blue-200' : 'bg-blue-500/10 border-blue-500/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-600 dark:text-blue-400">Grade B - جيد جداً</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">{toArabicDigits(gradeBPct)}%</span>
                </div>
                <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-2">{toArabicDigits(gradeBCount)} وحدة</div>
                <p className="text-[11px] text-slate-500 mt-1">عيوب طفيفة جداً لا تؤثر على الكفاءة التشغيلية</p>
              </div>

              <div className={`p-4 rounded-xl border ${isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-600 dark:text-amber-400">Grade C - متوسط</span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">{toArabicDigits(gradeCPct)}%</span>
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-2">{toArabicDigits(gradeCCount)} وحدة</div>
                <p className="text-[11px] text-slate-500 mt-1">بحاجة لصيانة وقائية وتأهيل بعض الأجزاء</p>
              </div>

              <div className={`p-4 rounded-xl border ${isLight ? 'bg-red-50/60 border-red-200' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-red-600 dark:text-red-400">Grade D - حرج</span>
                  <span className="text-lg font-black text-red-600 dark:text-red-400">{toArabicDigits(gradeDPct)}%</span>
                </div>
                <div className="text-xl font-black text-red-600 dark:text-red-400 mt-2">{toArabicDigits(gradeDCount)} وحدة</div>
                <p className="text-[11px] text-slate-500 mt-1">حالة حرجة تتطلب إيقاف التشغيل وإعادة تأهيل شاملة</p>
              </div>
            </div>

            {/* Breakdown by Unit Types */}
            <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
              <h3 className={`font-bold text-xs mb-3 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                توزيع الوحدات حسب الفئة والتصنيف الهيكلي:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unitTypesBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{item.name}</span>
                      <span className="text-amber-500 font-black">{toArabicDigits(item.count)} وحدة</span>
                    </div>
                    <div className={`w-full rounded-full h-1.5 overflow-hidden mt-2 ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`}>
                      <div
                        className="bg-amber-500 h-full rounded-full"
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
