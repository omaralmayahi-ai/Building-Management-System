import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Building,
  Box,
  Layers,
  Calendar,
  UserCheck,
  AlertTriangle,
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Plus,
  Wrench,
  Download,
  Paperclip,
  Edit3,
  MapPin,
  Trash2,
  Archive,
  Ban,
  RotateCcw,
  AlertOctagon,
  X,
  ShieldAlert,
  ArrowRight,
  Eye,
  QrCode,
  Folder,
  FolderOpen,
  ListTree,
  Grid,
  Maximize2,
  Minimize2,
  Users,
} from 'lucide-react';
import { UnitAsset, ConditionGrade, ReferenceUnitType, UnitAttachment, OrgEntity, GovernorateRef, OilfieldRef } from '../types';
import { ThreeBuildingCanvas } from './ThreeBuildingCanvas';
import { EditUnitModal } from './EditUnitModal';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { UnitQrCodeModal } from './UnitQrCodeModal';
import { UnitLocationMapModal } from './UnitLocationMapModal';
import { downloadAttachment } from '../utils/fileUtils';
import { BUILDING_SHAPE_OPTIONS } from './NewUnitWizard';
import { toArabicDigits } from '../utils/arabicUtils';
import { INITIAL_GOVERNORATES, INITIAL_OILFIELDS } from '../data/mockData';

interface UnitManagementViewProps {
  units: UnitAsset[];
  selectedUnitCode: string;
  onSelectUnit: (code: string) => void;
  onUpdateGrade: (code: string, grade: ConditionGrade) => void;
  onUpdateUnit?: (updatedUnit: UnitAsset) => void;
  onDeleteUnit?: (code: string) => void;
  onDecommissionUnit?: (code: string, reason: string) => void;
  onReactivateUnit?: (code: string) => void;
  onOpenMaintenanceModal: (code: string) => void;
  onOpenDossierModal: (unit: UnitAsset) => void;
  governorates?: GovernorateRef[];
  oilfields?: OilfieldRef[];
  unitTypes?: ReferenceUnitType[];
  orgEntities?: OrgEntity[];
  onAddOrgEntity?: (newEntity: OrgEntity) => void;
  theme?: 'dark' | 'light';
  currentUserRole?: string;
}

const FIELD_NAME_MAP: Record<string, string> = {
  Ahdab: 'حقل الأحدب (Ahdab)',
  'East Baghdad': 'شرق بغداد (East Baghdad)',
  Rumaila: 'حقل الرميلة (Rumaila)',
  Maysan: 'حقل ميسان (Maysan)',
  Badra: 'حقل بدرة (Badra)',
  'Naft Khana': 'حقل نفت خانة (Naft Khana)',
  'الأحدب': 'حقل الأحدب (Ahdab)',
  'شرق بغداد': 'شرق بغداد (East Baghdad)',
  'الرميلة': 'حقل الرميلة (Rumaila)',
  'ميسان': 'حقل ميسان (Maysan)',
  'بدرة': 'حقل بدرة (Badra)',
};

const DEFAULT_FIELDS = ['Ahdab', 'East Baghdad', 'Rumaila', 'Maysan', 'Badra'];

export const UnitManagementView: React.FC<UnitManagementViewProps> = ({
  units,
  selectedUnitCode,
  onSelectUnit,
  onUpdateGrade,
  onUpdateUnit,
  onDeleteUnit,
  onDecommissionUnit,
  onReactivateUnit,
  onOpenMaintenanceModal,
  onOpenDossierModal,
  governorates = [],
  oilfields = [],
  unitTypes = [],
  orgEntities = [],
  onAddOrgEntity,
  theme = 'dark',
  currentUserRole = 'مدير النظام',
}) => {
  const isLight = theme === 'light';
  const isReadOnly = currentUserRole === 'مستخدم' || currentUserRole === 'user';
  const [filterGovernorate, setFilterGovernorate] = useState<string>('all');
  const [filterField, setFilterField] = useState<string>('all');
  const [filterOrgEntity, setFilterOrgEntity] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'decommissioned'>('all');
  const [searchCode, setSearchCode] = useState<string>('');

  // Effective list of governorates & oilfields
  const effectiveGovernorates = useMemo(() => {
    return governorates && governorates.length > 0 ? governorates : INITIAL_GOVERNORATES;
  }, [governorates]);

  const effectiveOilfields = useMemo(() => {
    return oilfields && oilfields.length > 0 ? oilfields : INITIAL_OILFIELDS;
  }, [oilfields]);

  // Selected Governorate object
  const selectedGovObj = useMemo(() => {
    if (filterGovernorate === 'all') return null;
    return effectiveGovernorates.find(
      (g) =>
        g.id === filterGovernorate ||
        g.nameAr === filterGovernorate ||
        g.code === filterGovernorate ||
        (g.nameAr && filterGovernorate.includes(g.nameAr)) ||
        (g.nameAr && g.nameAr.includes(filterGovernorate))
    );
  }, [filterGovernorate, effectiveGovernorates]);

  // Available Oilfields dropdown list:
  // If governorate is selected -> show only fields linked to that governorate
  // If governorate is NOT selected ('all') -> show ALL fields in the system
  const availableOilfieldOptions = useMemo(() => {
    if (filterGovernorate === 'all') {
      return effectiveOilfields.filter((f) => f.status !== 'disabled');
    }
    if (selectedGovObj) {
      return effectiveOilfields.filter(
        (f) => f.governorateId === selectedGovObj.id && f.status !== 'disabled'
      );
    }
    return effectiveOilfields.filter((f) => f.status !== 'disabled');
  }, [filterGovernorate, selectedGovObj, effectiveOilfields]);

  const handleGovernorateFilterChange = (govVal: string) => {
    setFilterGovernorate(govVal);
    if (govVal !== 'all') {
      const newGovObj = effectiveGovernorates.find(
        (g) => g.id === govVal || g.nameAr === govVal || g.code === govVal
      );
      if (newGovObj && filterField !== 'all') {
        const belongs = effectiveOilfields.some(
          (f) =>
            f.governorateId === newGovObj.id &&
            (f.nameAr === filterField || f.id === filterField || f.code === filterField)
        );
        if (!belongs) {
          setFilterField('all');
        }
      }
    }
  };

  // Extract list of org entities / departments for filter
  const availableOrgEntities = useMemo(() => {
    const set = new Set<string>();
    orgEntities.forEach((e) => {
      if (e.status === 'active' && e.nameAr) set.add(e.nameAr);
    });
    units.forEach((u) => {
      if (u.department) set.add(u.department);
      u.rooms?.forEach((r) => {
        if (r.occupiedBy) set.add(r.occupiedBy);
      });
    });
    return Array.from(set);
  }, [orgEntities, units]);
  const [activeTab, setActiveTab] = useState<'rooms' | 'equipment' | 'history' | 'attachments'>('rooms');
  const [view3DMode, setView3DMode] = useState<'exterior' | 'floor_cut' | 'walkthrough' | 'blueprint2d'>('exterior');
  const [selectedFloor, setSelectedFloor] = useState<string>('G');
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDecommissionModal, setShowDecommissionModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showLocationMapModal, setShowLocationMapModal] = useState<boolean>(false);
  const [decommissionReasonInput, setDecommissionReasonInput] = useState<string>('');
  const [previewAttachment, setPreviewAttachment] = useState<UnitAttachment | null>(null);

  // New states for selector collapse and tree view hierarchy
  const [isSelectorCollapsed, setIsSelectorCollapsed] = useState<boolean>(false);
  const [expandedGovs, setExpandedGovs] = useState<Record<string, boolean>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [viewLayoutMode, setViewLayoutMode] = useState<'tree' | 'flat'>('tree');

  // Pagination State (50 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 50;

  // Selected unit (null if no unit code selected or matched)
  const selectedUnit = units.find((u) => u.code === selectedUnitCode) || null;

  const filteredUnits = units.filter((u) => {
    // Governorate filter match
    let matchGov = filterGovernorate === 'all';
    if (!matchGov && u.governorate) {
      const uGov = (u.governorate || '').toLowerCase();
      const filterGovStr = (filterGovernorate || '').toLowerCase();
      if (uGov === filterGovStr) {
        matchGov = true;
      } else if (selectedGovObj) {
        matchGov =
          (selectedGovObj.nameAr && uGov.includes(selectedGovObj.nameAr.toLowerCase())) ||
          (selectedGovObj.nameAr && selectedGovObj.nameAr.toLowerCase().includes(uGov)) ||
          (selectedGovObj.code && uGov.includes(selectedGovObj.code.toLowerCase())) ||
          (selectedGovObj.nameEn && uGov.includes(selectedGovObj.nameEn.toLowerCase())) ||
          (selectedGovObj.id && uGov.includes(selectedGovObj.id.toLowerCase()));
      }
    }

    // Field filter match
    let matchField = filterField === 'all';
    if (!matchField && u.field) {
      const uFld = (u.field || '').toLowerCase();
      const filterFldStr = (filterField || '').toLowerCase();
      if (uFld === filterFldStr) {
        matchField = true;
      } else {
        const selFieldObj = effectiveOilfields.find(
          (f) => f.id === filterField || f.nameAr === filterField || f.code === filterField
        );
        if (selFieldObj) {
          matchField =
            (selFieldObj.nameAr && uFld.includes(selFieldObj.nameAr.toLowerCase())) ||
            (selFieldObj.nameAr && selFieldObj.nameAr.toLowerCase().includes(uFld)) ||
            (selFieldObj.code && uFld.includes(selFieldObj.code.toLowerCase())) ||
            (selFieldObj.nameEn && uFld.includes(selFieldObj.nameEn.toLowerCase())) ||
            (selFieldObj.id && uFld.includes(selFieldObj.id.toLowerCase()));
        } else {
          if (filterFldStr.includes('ahdab') || filterFldStr.includes('أحدب')) matchField = uFld.includes('ahdab') || uFld.includes('أحدب');
          else if (filterFldStr.includes('rumaila') || filterFldStr.includes('رميلة')) matchField = uFld.includes('rumaila') || uFld.includes('رميلة');
          else if (filterFldStr.includes('baghdad') || filterFldStr.includes('بغداد')) matchField = uFld.includes('baghdad') || uFld.includes('بغداد');
          else if (filterFldStr.includes('maysan') || filterFldStr.includes('ميسان')) matchField = uFld.includes('maysan') || uFld.includes('ميسان');
          else if (filterFldStr.includes('badra') || filterFldStr.includes('بدرة')) matchField = uFld.includes('badra') || uFld.includes('بدرة');
          else matchField = uFld.includes(filterFldStr) || filterFldStr.includes(uFld);
        }
      }
    }

    const matchOrgEntity =
      filterOrgEntity === 'all' ||
      u.department === filterOrgEntity ||
      u.rooms?.some((r) => r.occupiedBy === filterOrgEntity);
    const matchGrade = filterGrade === 'all' || u.conditionGrade === filterGrade;
    const matchType = filterType === 'all' || u.type === filterType;
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && (u.status === 'active' || !u.status)) ||
      (filterStatus === 'decommissioned' && u.status === 'decommissioned');
    const searchLower = (searchCode || '').trim().toLowerCase();
    const matchSearch =
      !searchLower ||
      (u.code && u.code.toLowerCase().includes(searchLower)) ||
      (u.name && u.name.toLowerCase().includes(searchLower)) ||
      (u.sectorAddress && u.sectorAddress.toLowerCase().includes(searchLower)) ||
      (u.department && u.department.toLowerCase().includes(searchLower)) ||
      (u.governorate && u.governorate.toLowerCase().includes(searchLower)) ||
      u.rooms?.some((r) => r.occupiedBy && r.occupiedBy.toLowerCase().includes(searchLower));

    return matchGov && matchField && matchOrgEntity && matchGrade && matchType && matchStatus && matchSearch;
  });

  // Auto-reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterGovernorate,
    filterField,
    filterOrgEntity,
    filterGrade,
    filterType,
    filterStatus,
    searchCode,
  ]);

  const totalUnitsCount = filteredUnits.length;
  const totalPages = Math.max(1, Math.ceil(totalUnitsCount / PAGE_SIZE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalUnitsCount);

  // Paginated slice for instant DOM rendering
  const paginatedUnits = useMemo(() => {
    return filteredUnits.slice(startIndex, endIndex);
  }, [filteredUnits, startIndex, endIndex]);

  const isFiltered =
    filterGovernorate !== 'all' ||
    filterField !== 'all' ||
    filterOrgEntity !== 'all' ||
    filterGrade !== 'all' ||
    filterType !== 'all' ||
    filterStatus !== 'all' ||
    searchCode.trim() !== '';

  // Hierarchy grouping: Governorate -> Oilfield -> Units (based on paginated units on current page)
  const hierarchyData = useMemo(() => {
    const govMap = new Map<string, Map<string, UnitAsset[]>>();

    paginatedUnits.forEach((unit) => {
      const gov = unit.governorate?.trim() || 'غير محدد';
      const field = unit.field?.trim() || 'غير محدد';

      if (!govMap.has(gov)) {
        govMap.set(gov, new Map<string, UnitAsset[]>());
      }
      const fieldMap = govMap.get(gov)!;
      if (!fieldMap.has(field)) {
        fieldMap.set(field, []);
      }
      fieldMap.get(field)!.push(unit);
    });

    const result: {
      governorate: string;
      totalUnits: number;
      fields: {
        field: string;
        units: UnitAsset[];
      }[];
    }[] = [];

    govMap.forEach((fieldMap, govName) => {
      const fieldsArr: { field: string; units: UnitAsset[] }[] = [];
      let totalGovUnits = 0;

      fieldMap.forEach((unitsList, fieldName) => {
        fieldsArr.push({
          field: fieldName,
          units: unitsList,
        });
        totalGovUnits += unitsList.length;
      });

      result.push({
        governorate: govName,
        totalUnits: totalGovUnits,
        fields: fieldsArr,
      });
    });

    return result;
  }, [paginatedUnits]);

  const toggleGov = (govName: string) => {
    setExpandedGovs((prev) => ({
      ...prev,
      [govName]: prev[govName] === false ? true : false,
    }));
  };

  const isGovOpen = (govName: string) => {
    if (isFiltered) return true;
    return expandedGovs[govName] !== false;
  };

  const toggleField = (key: string) => {
    setExpandedFields((prev) => ({
      ...prev,
      [key]: prev[key] === false ? true : false,
    }));
  };

  const isFieldOpen = (key: string) => {
    if (isFiltered) return true;
    return expandedFields[key] !== false;
  };

  const handleExpandAll = () => {
    const newGovs: Record<string, boolean> = {};
    const newFields: Record<string, boolean> = {};
    hierarchyData.forEach((g) => {
      newGovs[g.governorate] = true;
      g.fields.forEach((f) => {
        newFields[`${g.governorate}:${f.field}`] = true;
      });
    });
    setExpandedGovs(newGovs);
    setExpandedFields(newFields);
  };

  const handleCollapseAll = () => {
    const newGovs: Record<string, boolean> = {};
    const newFields: Record<string, boolean> = {};
    hierarchyData.forEach((g) => {
      newGovs[g.governorate] = false;
      g.fields.forEach((f) => {
        newFields[`${g.governorate}:${f.field}`] = false;
      });
    });
    setExpandedGovs(newGovs);
    setExpandedFields(newFields);
  };

  const getUnitTypeLabel = (typeStr: string) => {
    if (unitTypes && unitTypes.length > 0) {
      const match = unitTypes.find(
        (ut) =>
          (ut.code === 'BLD' && typeStr === 'building') ||
          (ut.code === 'CRV' && typeStr === 'caravan') ||
          (ut.code === 'WHS' && typeStr === 'warehouse') ||
          (ut.code === 'EQP' && typeStr === 'equipment') ||
          (ut.code === 'SFT' && typeStr === 'safety_system') ||
          (ut.code === 'TNK' && typeStr === 'storage_tank') ||
          ut.code === typeStr
      );
      if (match) return `${match.nameAr} (${match.code})`;
    }
    switch (typeStr) {
      case 'caravan':
        return 'كرفان حقلي ساندويتش بانل (CRV)';
      case 'warehouse':
        return 'مخزن جملون هيكل حديدي (WHS)';
      case 'equipment':
        return 'محطة ضخ ومعدة ثقيلة (EQP)';
      case 'safety_system':
        return 'منظومة إطفاء وسلامة (SFT)';
      case 'storage_tank':
        return 'خزانات تجمع خام (TNK)';
      case 'building':
      default:
        return 'مبنى خرساني / إداري (BLD)';
    }
  };

  const handleResetFilters = () => {
    setFilterGovernorate('all');
    setFilterField('all');
    setFilterOrgEntity('all');
    setFilterGrade('all');
    setFilterType('all');
    setFilterStatus('all');
    setSearchCode('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Filter Bar */}
      <div className={`border rounded-2xl p-4 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Box className="w-5 h-5 text-amber-500" />
            <span>الوحدات والمشاهدة ثلاثية الأبعاد (3D)</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            استعراض المنشآت النفطية بالـ 3D، قطع الطوابق، التقييم الهندسي، وتعديل كافة البيانات الهندسية
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Governorate Filter */}
          <select
            value={filterGovernorate}
            onChange={(e) => handleGovernorateFilterChange(e.target.value)}
            className={`border rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          >
            <option value="all">كافة المحافظات</option>
            {effectiveGovernorates
              .filter((g) => g.status !== 'disabled')
              .map((g) => (
                <option key={g.id} value={g.nameAr}>
                  {g.nameAr}
                </option>
              ))}
          </select>

          {/* Field Filter */}
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            className={`border rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          >
            <option value="all">كافة الحقول النفطية</option>
            {availableOilfieldOptions.map((f) => (
              <option key={f.id} value={f.nameAr}>
                {f.nameAr}
              </option>
            ))}
          </select>

          {/* Org Entity / Department Filter */}
          <select
            value={filterOrgEntity}
            onChange={(e) => setFilterOrgEntity(e.target.value)}
            className={`border rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          >
            <option value="all">كافة التشكيلات / الجهات الشاغلة</option>
            {availableOrgEntities.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Condition Grade Filter */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className={`border rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          >
            <option value="all">كافة درجات التقييم (A, B, C, D)</option>
            <option value="A">Grade A - ممتاز</option>
            <option value="B">Grade B - جيد</option>
            <option value="C">Grade C - متوسط</option>
            <option value="D">Grade D - حرج</option>
          </select>

          {/* Unit Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`border rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          >
            <option value="all">كافة أنواع المنشآت</option>
            <option value="building">مبانٍ خرسانية إدارية (BLD)</option>
            <option value="caravan">كرفانات ساندويتش بانل (CRV)</option>
            <option value="warehouse">مخازن جملون حديدية (WHS)</option>
            <option value="equipment">محطات ضخ ومعدات ثقيلة (EQP)</option>
            <option value="safety_system">منظومات إطفاء وسلامة (SFT)</option>
            <option value="storage_tank">خزانات تجمع خام (TNK)</option>
          </select>

          {/* Unit Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className={`border rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}
          >
            <option value="all">كافة الحالات (نشطة ومشطوبة)</option>
            <option value="active">المنشآت التشغيلية النشطة</option>
            <option value="decommissioned">المنشآت المشطوبة والمجمدة</option>
          </select>

          {/* Quick Search */}
          <div className="relative w-52">
            <Search className={`absolute right-2.5 top-2 w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="ابحث بالرمز، الاسم، التشكيل..."
              className={`w-full border rounded-lg pr-8 pl-2 py-1 text-xs focus:outline-none focus:border-amber-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                isLight
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/40'
              }`}
              title="إلغاء تصفية البحث وإظهار كافة المباني"
            >
              <span>إعادة ضبط ({toArabicDigits(filteredUnits.length)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Unit Selection Card with Collapse & Hierarchy (Governorate -> Oilfield -> Units) */}
      <div className={`border rounded-2xl p-4 shadow-md transition-all ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Card Header Bar */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b text-xs ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  اختر المنشأة أو الأصل النفطي للعرض والتحكم
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {toArabicDigits(filteredUnits.length)} منشأة
                </span>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                مرتبة ضمن هرم جغرافية شركة نفط الوسط (المحافظة ← الحقل النفطي ← المنشآت)
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Layout Toggle: Tree vs Flat Ribbon */}
            {!isSelectorCollapsed && (
              <>
                <div className={`flex items-center p-0.5 rounded-xl border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
                  <button
                    onClick={() => setViewLayoutMode('tree')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      viewLayoutMode === 'tree'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="عرض شجرة الهيكلية (محافظات وحقول)"
                  >
                    <ListTree className="w-3.5 h-3.5" />
                    <span>عرض الشجرة</span>
                  </button>
                  <button
                    onClick={() => setViewLayoutMode('flat')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      viewLayoutMode === 'flat'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="عرض شريط أفقي سريع لكافة المنشآت"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>شريط أفقي</span>
                  </button>
                </div>

                {viewLayoutMode === 'tree' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleExpandAll}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                      title="توسيع كافة المحافظات والحقول"
                    >
                      توسيع الكل
                    </button>
                    <button
                      onClick={handleCollapseAll}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                      title="طي كافة المحافظات والحقول"
                    >
                      طي الكل
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Collapse/Expand Selector Toggle Button */}
            <button
              onClick={() => setIsSelectorCollapsed(!isSelectorCollapsed)}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/40 shadow-xs"
              title={isSelectorCollapsed ? 'توسيع قائمة المنشآت' : 'طي قائمة المنشآت'}
            >
              {isSelectorCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                  <span>توسيع البطاقة</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4 text-amber-400" />
                  <span>طي البطاقة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsed State Summary */}
        {isSelectorCollapsed ? (
          <div className="py-2 px-1 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={`font-semibold flex items-center gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <Building className="w-3.5 h-3.5 text-amber-500" />
              <span>بطاقة المنشآت مطوية حالياً ({toArabicDigits(filteredUnits.length)} منشأة متاحة)</span>
              {selectedUnit && (
                <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  المحددة: {selectedUnit.name} ({toArabicDigits(selectedUnit.code)})
                </span>
              )}
            </span>
            <button
              onClick={() => setIsSelectorCollapsed(false)}
              className="text-amber-500 font-bold hover:underline cursor-pointer"
            >
              اضغط هنا للتوسيع
            </button>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              لا توجد نتائج مطابقة لمعايير البحث والتصفية الحالية.
            </p>
            <button
              onClick={handleResetFilters}
              className="text-xs text-amber-600 dark:text-amber-400 font-bold underline hover:opacity-80 cursor-pointer"
            >
              إلغاء التصفية وإظهار كافة المباني
            </button>
          </div>
        ) : viewLayoutMode === 'tree' ? (
          /* Tree View: Governorate -> Oilfield -> Units */
          <div className="mt-3 space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {hierarchyData.map((govGroup) => {
              const govOpen = isGovOpen(govGroup.governorate);
              return (
                <div
                  key={govGroup.governorate}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isLight ? 'border-slate-200 bg-slate-50/60' : 'border-slate-800/90 bg-slate-950/50'
                  }`}
                >
                  {/* Governorate Node Header */}
                  <div
                    onClick={() => toggleGov(govGroup.governorate)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer select-none transition ${
                      isLight ? 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-800' : 'bg-slate-900 hover:bg-slate-800/90 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-extrabold text-xs sm:text-sm">{govGroup.governorate}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {toArabicDigits(govGroup.totalUnits)} منشأة ({toArabicDigits(govGroup.fields.length)} حقل)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                        {govOpen ? 'انقر للطي' : 'انقر للتوسيع'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          govOpen ? 'rotate-180 text-amber-400' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Fields within Governorate */}
                  {govOpen && (
                    <div className="p-2 sm:p-3 space-y-2.5">
                      {govGroup.fields.map((fieldGroup) => {
                        const fieldKey = `${govGroup.governorate}:${fieldGroup.field}`;
                        const fieldOpen = isFieldOpen(fieldKey);
                        return (
                          <div
                            key={fieldKey}
                            className={`border rounded-lg mr-2 sm:mr-4 transition-all ${
                              isLight ? 'border-slate-200 bg-white' : 'border-slate-800/80 bg-slate-900/60'
                            }`}
                          >
                            {/* Field Node Header */}
                            <div
                              onClick={() => toggleField(fieldKey)}
                              className={`p-2 flex items-center justify-between cursor-pointer select-none rounded-lg transition ${
                                isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="font-bold text-xs">{fieldGroup.field}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-sky-500/15 text-sky-300 border border-sky-500/25">
                                  {toArabicDigits(fieldGroup.units.length)} وحدة
                                </span>
                              </div>

                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                  fieldOpen ? 'rotate-180 text-sky-400' : ''
                                }`}
                              />
                            </div>

                            {/* Units Grid inside Field */}
                            {fieldOpen && (
                              <div className="p-2 pt-1 mr-2 sm:mr-4 border-t border-slate-800/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {fieldGroup.units.map((u) => {
                                  const isSelected = selectedUnit?.code === u.code;
                                  const isDecom = u.status === 'decommissioned';
                                  return (
                                    <button
                                      key={u.id}
                                      onClick={() => onSelectUnit(u.code)}
                                      className={`p-2 rounded-xl border text-right transition cursor-pointer flex items-center justify-between gap-2 text-xs group ${
                                        isSelected
                                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg ring-2 ring-amber-400/50'
                                          : isDecom
                                          ? isLight ? 'bg-rose-50 border-rose-300 text-rose-900 hover:border-rose-400' : 'bg-rose-950/40 border-rose-800 text-rose-300 hover:border-rose-700'
                                          : isLight
                                          ? 'bg-slate-50 border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/50'
                                          : 'bg-slate-950 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                                      }`}
                                    >
                                      <div className="space-y-0.5 truncate">
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono text-[11px] font-black">{toArabicDigits(u.code)}</span>
                                        </div>
                                        <div className="truncate font-bold text-[11px]">{u.name}</div>
                                      </div>

                                      <div className="shrink-0 flex flex-col items-end gap-1">
                                        {isDecom ? (
                                          <span className="text-[9px] px-1 py-0.2 rounded font-black bg-rose-600 text-white">
                                            مشطوبة
                                          </span>
                                        ) : (
                                          <span
                                            className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                                              isSelected
                                                ? 'bg-slate-950/20 text-slate-950'
                                                : u.conditionGrade === 'A'
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : u.conditionGrade === 'B'
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : u.conditionGrade === 'C'
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                            }`}
                                          >
                                            Grade {u.conditionGrade}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat Horizontal Ribbon View */
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 text-xs">
            {paginatedUnits.map((u) => {
              const isSelected = selectedUnit?.code === u.code;
              const isDecom = u.status === 'decommissioned';
              return (
                <button
                  key={u.id}
                  onClick={() => onSelectUnit(u.code)}
                  className={`px-3 py-2 rounded-xl border text-right transition cursor-pointer whitespace-nowrap flex items-center gap-2.5 shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                      : isDecom
                      ? isLight ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-rose-950/40 border-rose-800 text-rose-300'
                      : isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/50'
                      : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono text-xs font-black">{toArabicDigits(u.code)}</span>
                  <span className="truncate max-w-[140px]">{u.name}</span>
                  {isDecom ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-rose-600 text-white flex items-center gap-0.5">
                      <Archive className="w-2.5 h-2.5" />
                      <span>مشطوبة</span>
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        isSelected
                          ? 'bg-slate-950/20 text-slate-950'
                          : u.conditionGrade === 'A'
                          ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-400'
                          : u.conditionGrade === 'B'
                          ? isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-400'
                          : u.conditionGrade === 'C'
                          ? isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-400'
                          : isLight ? 'bg-red-100 text-red-800' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      Grade {u.conditionGrade}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination Controls Bar */}
        {totalUnitsCount > 0 && (
          <div className={`mt-3 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800 text-slate-300'
          }`}>
            {/* Pagination Range Summary */}
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                عرض <strong className="font-mono text-amber-500">{toArabicDigits(startIndex + 1)}</strong> إلى{' '}
                <strong className="font-mono text-amber-500">{toArabicDigits(endIndex)}</strong> من إجمالي{' '}
                <strong className="font-mono text-amber-500">{toArabicDigits(totalUnitsCount)}</strong> منشأة
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                50 وحدة / صفحة
              </span>
            </div>

            {/* Pagination Navigation Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 select-none">
                {/* Previous Button (RTL: right arrow goes back to page - 1) */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  className={`px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1 transition ${
                    validPage === 1
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 cursor-pointer'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer'
                  }`}
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">السابق</span>
                </button>

                {/* Page Number Chips */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages: (number | string)[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (validPage > 3) pages.push('ellipsis-start');
                      const start = Math.max(2, validPage - 1);
                      const end = Math.min(totalPages - 1, validPage + 1);
                      for (let i = start; i <= end; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      if (validPage < totalPages - 2) pages.push('ellipsis-end');
                      if (!pages.includes(totalPages)) pages.push(totalPages);
                    }

                    return pages.map((item, idx) => {
                      if (typeof item === 'string') {
                        return (
                          <span key={`el-${idx}`} className="px-1.5 text-slate-400 font-mono">
                            ...
                          </span>
                        );
                      }

                      const isActive = item === validPage;
                      return (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition flex items-center justify-center cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                              : isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {toArabicDigits(item)}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Next Button (RTL: left arrow goes forward to page + 1) */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  className={`px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1 transition ${
                    validPage === totalPages
                      ? 'opacity-40 cursor-not-allowed border-transparent'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 cursor-pointer'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer'
                  }`}
                  title="الصفحة التالية"
                >
                  <span className="hidden sm:inline">التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* When NO unit is selected: Show informative placeholder */}
      {!selectedUnit ? (
        <div className={`border rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl transition-all ${
          isLight ? 'bg-slate-50/90 border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-800 text-slate-200'
        }`}>
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center shadow-lg animate-pulse">
            <Box className="w-10 h-10" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h3 className={`font-black text-lg sm:text-xl ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              اختر منشأة أو أصلاً نفطياً لمشاهدة مجسم الـ 3D والبيانات الهندسية
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              الرجاء تحديد أي منشأة من شجرة الهيكلية التنظيمية (المحافظات والحقول) أعلاه لمشاهدة النموذج ثلاثي الأبعاد، استعراض تفاصيل الغرف والمعدات، تقارير الفحص الدوري، وتوليد بطاقات الوصول السريع QR.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Top Return / Selection Switch Bar */}
          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md transition-colors ${
            isLight
              ? 'bg-amber-500/10 border-amber-300 text-slate-900'
              : 'bg-slate-900/90 border-amber-500/30 text-slate-100'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold block text-amber-600 dark:text-amber-400">المنشأة المحددة حالياً:</span>
                <h4 className="font-extrabold text-sm">{selectedUnit.name} <span className="font-mono text-xs opacity-80">({toArabicDigits(selectedUnit.code)})</span></h4>
              </div>
            </div>

            <button
              onClick={() => onSelectUnit('')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md shrink-0"
              title="العودة لشاشة الاختيار وتصفح كافة المنشآت والأصول النفطية"
            >
              <ArrowRight className="w-4 h-4 shrink-0" />
              <span>العودة إلى (اختر منشأة أو أصلاً نفطياً)</span>
            </button>
          </div>

      {/* Notice Banner for Decommissioned Unit */}
      {selectedUnit.status === 'decommissioned' && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
            <div>
              <h4 className="font-black text-rose-400 text-sm">⚠️ هذه المنشأة مشطوبة ومجمدة عن الخدمة التشغيلية</h4>
              <p className="text-slate-300 mt-0.5">
                تاريخ الشطب والتجميد: <strong className="font-mono text-white">{selectedUnit.decommissionedAt || 'الآن'}</strong> | سبب الشطب: <span className="text-amber-300 font-semibold">{selectedUnit.decommissionReason || 'غير محدد'}</span>
              </p>
            </div>
          </div>
          {onReactivateUnit && (
            <button
              onClick={() => onReactivateUnit(selectedUnit.code)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة تفعيل الوحدة</span>
            </button>
          )}
        </div>
      )}

      {/* 1. MASTER UNIFIED ASSET & 3D METADATA CARD (بطاقة البيانات الهندسية والشغل الإشغالي الموحدة الشاملة) */}
      <div className={`w-full border rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Top Header Row of Asset Details */}
        <div className={`flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b gap-4 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg shrink-0">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowQrModal(true)}
                  className={`font-mono text-xs px-3 py-1 rounded-full font-black border flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                    isLight ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                  }`}
                  title="عرض وتنزيل وطباعة رمز الوصول السريع (Quick Access QR) والبيانات الجغرافية"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-500" />
                  <span>{toArabicDigits(selectedUnit.code)}</span>
                </button>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {getUnitTypeLabel(selectedUnit.type)}
                </span>
                {selectedUnit.status === 'decommissioned' ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-black bg-rose-600 text-white flex items-center gap-1">
                    <Archive className="w-3 h-3" />
                    <span>مشطوبة ومجمدة</span>
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>نشطة وتشغيلية</span>
                  </span>
                )}
              </div>
              <h3 className={`font-extrabold text-lg sm:text-xl mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedUnit.name}</h3>
            </div>
          </div>

          {/* Action Buttons Toolbar - Formatted in a single row */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            {/* Direct Map Location & GPS Navigation Button */}
            <button
              onClick={() => setShowLocationMapModal(true)}
              className={`font-black py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 border transition cursor-pointer whitespace-nowrap shadow-xs ${
                isLight
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-300'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
              }`}
              title="عرض موقع المنشأة على الخريطة التفاعلية وتوجيه الملاحة GPS"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span>الموقع على الخريطة</span>
            </button>

            <button
              onClick={() => onSelectUnit('')}
              className={`font-black py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 border transition cursor-pointer whitespace-nowrap shadow-xs ${
                isLight
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
              }`}
              title="إلغاء اختيار الوحدة الحالية والعودة إلى القائمة الرئيسية"
            >
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>العودة لاختيار منشأة</span>
            </button>

            {isReadOnly && (
              <div
                className={`font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 border whitespace-nowrap ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
                title="صلاحية حسابك الحالية هي استعراض وتصفح وطباعة التقارير فقط"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>وضع الاستعراض (مستخدم)</span>
              </div>
            )}

            {!isReadOnly && onUpdateUnit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                <span>تعديل كافة بيانات وتصميم المبنى (3D)</span>
              </button>
            )}

            <button
              onClick={() => setShowQrModal(true)}
              className={`font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 border transition cursor-pointer whitespace-nowrap shadow-xs ${
                isLight
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-950 hover:bg-slate-800 text-amber-400 border-amber-500/40'
              }`}
              title="عرض وطباعة رمز الوصول السريع (Quick Access QR Code) الخاص بهذه الوحدة"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>رمز الوصول السريع (QR)</span>
            </button>

            {/* Decommission / Reactivate Button */}
            {!isReadOnly && (selectedUnit.status === 'decommissioned' ? (
              onReactivateUnit && (
                <button
                  onClick={() => onReactivateUnit(selectedUnit.code)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer whitespace-nowrap"
                  title="إعادة تفعيل الوحدة وتغيير حالتها إلى نشطة"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>إعادة تفعيل الوحدة</span>
                </button>
              )
            ) : (
              onDecommissionUnit && (
                <button
                  onClick={() => {
                    setDecommissionReasonInput('');
                    setShowDecommissionModal(true);
                  }}
                  className={`font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 border transition cursor-pointer whitespace-nowrap ${
                    isLight
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}
                  title="تجميد الوحدة ونقلها إلى حالة مشطوبة"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>شطب وتجميد المنشأة</span>
                </button>
              )
            ))}

            {/* Permanent Delete Button */}
            {!isReadOnly && onDeleteUnit && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer whitespace-nowrap"
                title="حذف الوحدة نهائياً مع كافة معلوماتها وبياناتها من النظام وقاعدة البيانات"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>حذف نهائي</span>
              </button>
            )}
          </div>
        </div>

        {/* Combined & Well-Distributed Metadata Grid (ممتدة على عرض النافذة بدون بطاقات منفصلة وبدون أشرطة تمرير) */}
        <div className="space-y-4">
          {/* Row 1: Core 5 Metadata Columns */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 p-4 rounded-xl border text-xs ${
            isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-800'
          }`}>
            {/* 1. الحقل والقطاع */}
            <div className="space-y-1">
              <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>الحقل والقطاع:</span>
              </span>
              <p className="font-extrabold text-sm text-amber-600 dark:text-amber-400">{selectedUnit.field}</p>
              <span className={`text-[11px] font-medium block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {selectedUnit.governorate}
              </span>
            </div>

            {/* 2. شكل وهندسة المبنى (3D) */}
            <div className="space-y-1">
              <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Box className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>شكل وهندسة المبنى (3D):</span>
              </span>
              {(() => {
                const shapeObj = BUILDING_SHAPE_OPTIONS.find((s) => s.id === selectedUnit.buildingShape) || {
                  nameAr: selectedUnit.buildingShape || 'مستطيل',
                  symbol: '▭',
                  category: 'الأشكال الأساسية',
                };
                return (
                  <>
                    <p className={`font-extrabold text-sm flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      <span className="text-amber-500 font-black text-base leading-none">{shapeObj.symbol}</span>
                      <span>{shapeObj.nameAr}</span>
                    </p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {shapeObj.category} {selectedUnit.lengthM && selectedUnit.widthM ? `(${toArabicDigits(selectedUnit.lengthM)}م × ${toArabicDigits(selectedUnit.widthM)}م)` : ''}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* 3. المساحة والطوابق */}
            <div className="space-y-1">
              <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Maximize2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>المساحة والطوابق:</span>
              </span>
              <p className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {toArabicDigits(selectedUnit.totalAreaSqM)} م²
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                {toArabicDigits(selectedUnit.floorsCount)} طوابق | {toArabicDigits(selectedUnit.rooms?.length || 0)} غرفة
              </span>
            </div>

            {/* 4. سنة الإنشاء والإحداثيات */}
            <div className="space-y-1">
              <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>سنة الإنشاء والإحداثيات:</span>
              </span>
              <p className={`font-extrabold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {toArabicDigits(selectedUnit.constructionYear)} م
              </p>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400/90 block">
                {toArabicDigits(selectedUnit.coordinates.lat)}°, {toArabicDigits(selectedUnit.coordinates.lng)}°
              </span>
            </div>

            {/* 5. التقييم الهندسي (Grade) */}
            <div className="space-y-1">
              <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>التقييم الهندسي (Grade):</span>
              </span>
              {isReadOnly ? (
                <div className="pt-0.5">
                  <span
                    className={`inline-flex items-center justify-center w-full py-1.5 rounded-lg text-xs font-black border ${
                      selectedUnit.conditionGrade === 'A'
                        ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/40'
                        : selectedUnit.conditionGrade === 'B'
                        ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400 border-blue-500/40'
                        : selectedUnit.conditionGrade === 'C'
                        ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/40'
                        : 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500/40'
                    }`}
                  >
                    الدرجة {selectedUnit.conditionGrade}
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {(['A', 'B', 'C', 'D'] as ConditionGrade[]).map((g) => {
                    const isActive = selectedUnit.conditionGrade === g;
                    return (
                      <button
                        key={g}
                        onClick={() => onUpdateGrade(selectedUnit.code, g)}
                        className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer border ${
                          g === 'A'
                            ? isActive
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : g === 'B'
                            ? isActive
                              ? 'bg-blue-500 text-slate-950 border-blue-400 shadow'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                            : g === 'C'
                            ? isActive
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                            : isActive
                            ? 'bg-red-500 text-white border-red-400 shadow'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'
                        }`}
                        title={`تحديث التقييم الهندسي إلى الدرجة ${g}`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Occupying Entities (الجهات الشاغلة للمنشأة) - ممتدة بعرض البطاقة وبدون أي شريط تمرير */}
          {(() => {
            const deptsSet = new Set<string>();
            if (selectedUnit.departments && selectedUnit.departments.length > 0) {
              selectedUnit.departments.forEach((d) => d && d.trim() && deptsSet.add(d.trim()));
            }
            if (selectedUnit.department && selectedUnit.department.trim()) {
              selectedUnit.department
                .split(/[\n،,;/|]+/)
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((d) => deptsSet.add(d));
            }
            selectedUnit.rooms?.forEach((r) => {
              if (r.occupiedBy && r.occupiedBy.trim()) {
                deptsSet.add(r.occupiedBy.trim());
              }
            });

            const depts = Array.from(deptsSet);
            if (depts.length === 0) depts.push('غير محدد');

            return (
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                isLight ? 'bg-amber-50/70 border-amber-200/90 text-slate-800' : 'bg-slate-950/80 border-slate-800 text-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 shrink-0 text-xs">
                    <Users className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>الجهات الشاغلة للمنشأة:</span>
                  </div>

                  {/* All entities wrapped naturally with NO scrollbars */}
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    {depts.map((deptName, idx) => {
                      const entityRooms = (selectedUnit.rooms || []).filter((r) => r.occupiedBy === deptName);
                      const roomCount = entityRooms.length;
                      return (
                        <div
                          key={idx}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            idx === 0
                              ? isLight
                                ? 'bg-white text-amber-950 border-amber-300 shadow-xs'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : isLight
                              ? 'bg-white text-slate-800 border-slate-300 shadow-xs'
                              : 'bg-slate-900 text-slate-200 border-slate-700'
                          }`}
                          title={`الجهة الشاغلة: ${deptName}${roomCount > 0 ? ` (تشغل ${roomCount} غرف في هذه المنشأة)` : ''}`}
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <span>{deptName}</span>
                          {roomCount > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              isLight ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            }`}>
                              {toArabicDigits(roomCount)} غرف
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                  <span>إجمالي الجهات:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {toArabicDigits(depts.length)}
                  </span>
                  <span className="mr-1">| إجمالي الغرف:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {toArabicDigits(selectedUnit.rooms?.length || 0)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 2. HUGE 3D CANVAS VIEWPORT (المخطط ثلاثي الأبعاد بمساحة ممتدة ومتكاملة) */}
      <div className="w-full">
        <ThreeBuildingCanvas
          unitCode={selectedUnit.code}
          unitName={selectedUnit.name}
          unitType={selectedUnit.type}
          conditionGrade={selectedUnit.conditionGrade}
          buildingShape={selectedUnit.buildingShape}
          totalAreaSqM={selectedUnit.totalAreaSqM}
          lengthM={selectedUnit.lengthM}
          widthM={selectedUnit.widthM}
          heightM={selectedUnit.heightM}
          floorsCount={selectedUnit.floorsCount}
          rooms={selectedUnit.rooms}
          selectedFloor={selectedFloor}
          viewMode={view3DMode}
          equipment={selectedUnit.equipment}
          onViewModeChange={setView3DMode}
          onFloorChange={setSelectedFloor}
          theme={theme}
          designFinishing={selectedUnit.designFinishing}
          onUpdateDesignFinishing={(updatedFinishing) => {
            if (onUpdateUnit) {
              onUpdateUnit({
                ...selectedUnit,
                designFinishing: updatedFinishing,
              });
            }
          }}
          unitStatus={selectedUnit.status}
          decommissionReason={selectedUnit.decommissionReason}
        />
      </div>

      {/* Bottom Tabs Area: Rooms, Equipment, History, Attachments */}
      <div className={`border rounded-2xl p-5 shadow-lg transition-colors ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Tab Headers */}
        <div className={`flex items-center gap-2 border-b pb-3 mb-4 text-xs font-bold ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'rooms'
                ? 'bg-amber-500 text-slate-950 shadow font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            سجل الغرف والقاعات ({toArabicDigits(selectedUnit.rooms.length)})
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'equipment'
                ? 'bg-amber-500 text-slate-950 shadow font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المعدات والمنظومات ({toArabicDigits(selectedUnit.equipment.length)})
          </button>
          <button
            onClick={() => setActiveTab('attachments')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'attachments'
                ? 'bg-amber-500 text-slate-950 shadow font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المرفقات والمخططات الرسمية ({toArabicDigits(selectedUnit.attachments?.length || 0)})
          </button>
        </div>

        {/* Rooms Tab Content */}
        {activeTab === 'rooms' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className={`${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'} border-b`}>
                  <th className="p-3 font-semibold">رمز الغرفة</th>
                  <th className="p-3 font-semibold">اسم الغرفة</th>
                  <th className="p-3 font-semibold">نوع الاستخدام</th>
                  <th className="p-3 font-semibold">الطابق</th>
                  <th className="p-3 font-semibold">المساحة (م²)</th>
                  <th className="p-3 font-semibold">الجهة الشاغلة</th>
                  <th className="p-3 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-300'}`}>
                {selectedUnit.rooms.map((rm) => {
                  const isStopped = rm.status === 'Stopped' || rm.status === 'متوقفة';
                  return (
                    <tr key={rm.id} className={`${isStopped ? (isLight ? 'bg-red-50/50' : 'bg-red-950/20') : isLight ? 'hover:bg-amber-50/40' : 'hover:bg-slate-800/40'} transition`}>
                      <td className={`p-3 font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{rm.id}</td>
                      <td className={`p-3 font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{rm.name}</td>
                      <td className="p-3">{rm.type}</td>
                      <td className="p-3">{rm.floor}</td>
                      <td className="p-3 font-semibold">{rm.areaSqM} م²</td>
                      <td className={`p-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{rm.occupiedBy || selectedUnit.department}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`border px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                            isStopped
                              ? isLight ? 'bg-red-100 text-red-800 border-red-300' : 'bg-red-500/20 text-red-400 border-red-500/30'
                              : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isStopped ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                            {isStopped ? 'متوقفة 🔴' : 'فعالة 🟢'}
                          </span>
                          {isStopped && rm.notes && (
                            <span className={`text-[11px] font-bold ${isLight ? 'text-red-700' : 'text-red-300'}`}>
                              سبب التوقف: {rm.notes}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Equipment Tab Content */}
        {activeTab === 'equipment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedUnit.equipment.map((eq) => (
              <div key={eq.id} className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{eq.id}</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-400'}`}>{eq.status}</span>
                </div>
                <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{eq.name}</h4>
                <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>النوع: {eq.type}</p>
                <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>الموقع: {eq.location}</p>
                {eq.capacity && <p className="text-amber-600 dark:text-amber-400/80 font-semibold">السعة: {eq.capacity}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Attachments Tab Content */}
        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
              <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                الوثائق والمرفقات الرقمية الأرشيفية للوحدة ({toArabicDigits(selectedUnit.attachments?.length || 0)})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                معاينة وتنزيل المرفقات الرقمية
              </span>
            </div>

            {(!selectedUnit.attachments || selectedUnit.attachments.length === 0) ? (
              <div className={`p-8 border border-dashed rounded-2xl text-center space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <Paperclip className={`w-8 h-8 mx-auto opacity-50 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                <p className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>لا توجد مرفقات أو مخططات رسمية مضافة لهذه المنشأة.</p>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>يمكنك إضافة وتعديل المرفقات الرقمية يدوياً من خلال نافذة تعديل كافة بيانات وتصميم المنشأة.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedUnit.attachments.map((att) => (
                  <div key={att.id} className={`p-3.5 border rounded-xl flex items-start justify-between gap-3 text-xs transition ${
                    isLight ? 'bg-slate-50 border-slate-200 hover:border-amber-400' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}>
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Paperclip className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className={`font-bold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{att.name}</p>
                        <p className="text-[10px] text-amber-500 font-semibold">{att.category}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {att.sizeMB ? `${toArabicDigits(att.sizeMB)} MB` : '1.5 MB'} | {toArabicDigits(att.uploadDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPreviewAttachment(att)}
                        className="p-1.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-slate-950 rounded-lg transition cursor-pointer"
                        title="معاينة وفتح بالبرنامج المخصص"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => downloadAttachment(att)}
                        className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-lg transition cursor-pointer"
                        title="تنزيل المرفق للجهاز"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Edit Unit Modal */}
      {selectedUnit && showEditModal && onUpdateUnit && (
        <EditUnitModal
          unit={selectedUnit}
          governorates={governorates}
          oilfields={oilfields}
          unitTypes={unitTypes}
          orgEntities={orgEntities}
          onAddOrgEntity={onAddOrgEntity}
          theme={theme}
          onSave={(updatedUnit) => {
            onUpdateUnit(updatedUnit);
            setShowEditModal(false);
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Decommission / Freeze Unit Modal */}
      {selectedUnit && showDecommissionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/30">
              <div className="flex items-center gap-2">
                <Archive className="w-6 h-6 text-amber-500" />
                <h3 className="font-black text-base">شطب وتجميد المنشأة ({selectedUnit.code})</h3>
              </div>
              <button onClick={() => setShowDecommissionModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <p className={isLight ? 'text-slate-600' : 'text-slate-300'}>
                <strong>الشطب والتجميد:</strong> سيتم نقل المنشأة <strong>"{selectedUnit.name}"</strong> إلى حالة <strong>"مشطوبة ومجمدة"</strong> مع الاحتفاظ بكافة بياناتها، غرفها، ومعداتها في النظام لتبقى متاحة في تقارير الوحدات المشطوبة.
              </p>

              <div className="space-y-1.5">
                <label className="font-bold block text-amber-600 dark:text-amber-400">سبب الشطب والتجميد (إلزامي للتوثيق):</label>
                <textarea
                  value={decommissionReasonInput}
                  onChange={(e) => setDecommissionReasonInput(e.target.value)}
                  placeholder="أدخل سبب الشطب (مثال: أضرار إنشائية جسيمة، عدم صلاحية للاستخدام الإداري، انتهاء العمر التشغيلي)..."
                  rows={3}
                  className={`w-full border rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
              <button
                onClick={() => setShowDecommissionModal(false)}
                className={`px-4 py-2 rounded-xl font-bold border ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (onDecommissionUnit) {
                    onDecommissionUnit(selectedUnit.code, decommissionReasonInput || 'تم الشطب والتجميد بناءً على تقرير السلامة والتقييم الإنشائي');
                  }
                  setShowDecommissionModal(false);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Archive className="w-4 h-4" />
                <span>تأكيد شطب وتجميد المنشأة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Unit Permanent Confirmation Modal */}
      {selectedUnit && showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-rose-500/30">
              <div className="flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-rose-500" />
                <h3 className="font-black text-base text-rose-500">حذف المنشأة نهائياً ({selectedUnit.code})</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-200">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p>
                  <strong>تحذير نهائي:</strong> الحذف هو إزالة نهائية مع كل معلومات المنشأة وبياناتها (الغرف، المعدات، المخططات ثلاثية الأبعاد، والسجلات) من النظام ومن قاعدة البيانات. لا يمكن التراجع أو الاستعادة!
                </p>
              </div>

              <p className={isLight ? 'text-slate-600' : 'text-slate-300'}>
                هل أنت متأكد من رغبتك بالحذف النهائي للمنشأة <strong>"{selectedUnit.name}"</strong> (رمز: <span className="font-mono">{selectedUnit.code}</span>)؟
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={`px-4 py-2 rounded-xl font-bold border ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                إلغاء الأمر
              </button>
              <button
                onClick={() => {
                  if (onDeleteUnit) {
                    onDeleteUnit(selectedUnit.code);
                  }
                  setShowDeleteModal(false);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black px-5 py-2 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف نهائياً من النظام</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview & Program Launcher Modal */}
      {selectedUnit && previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment}
          unitCode={selectedUnit.code}
          theme={theme}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* Quick Access QR Code & GPS Modal */}
      {selectedUnit && showQrModal && (
        <UnitQrCodeModal
          unit={selectedUnit}
          theme={theme}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {/* Unit Location Map Modal */}
      {selectedUnit && showLocationMapModal && (
        <UnitLocationMapModal
          unit={selectedUnit}
          theme={theme}
          onClose={() => setShowLocationMapModal(false)}
          onOpenMaintenance={(code) => {
            setShowLocationMapModal(false);
            onOpenMaintenanceModal(code);
          }}
        />
      )}
    </div>
  );
};
