import React, { useState, useEffect, useMemo } from 'react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, PageHeader, Pagination, Table, Tabs, Td, fieldLookSm } from './ui';
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
  Network,
  DoorOpen,
} from 'lucide-react';
import { UnitAsset, ConditionGrade, ReferenceUnitType, UnitAttachment, OrgEntity, GovernorateRef, OilfieldRef, Room, SystemBranding } from '../types';
import { ThreeBuildingCanvas } from './ThreeBuildingCanvas';
import { EditUnitModal } from './EditUnitModal';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { UnitQrCodeModal } from './UnitQrCodeModal';
import { UnitLocationMapModal } from './UnitLocationMapModal';
import { RoomQrCardModal } from './RoomQrCardModal';
import {
  generateRoomCode,
  getStandardRoomCode,
  formatRoomOccupancyDisplay,
  isCapacityBasedRoom,
  isRoomVacant,
} from '../utils/unitAndRoomCodeUtils';
import { downloadAttachment } from '../utils/fileUtils';
import { BUILDING_SHAPE_OPTIONS } from './NewUnitWizard';
import { toArabicDigits } from '../utils/arabicUtils';
import { INITIAL_GOVERNORATES, INITIAL_OILFIELDS, INITIAL_ORG_ENTITIES, INITIAL_REFERENCE_UNIT_TYPES } from '../data/mockData';
import { OrgEntityPickerModal } from './OrgEntityPickerModal';

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
  branding?: SystemBranding;
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
  branding,
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

  // Effective reference unit types synchronized with System Settings
  const effectiveUnitTypes = useMemo(() => {
    return unitTypes && unitTypes.length > 0 ? unitTypes : INITIAL_REFERENCE_UNIT_TYPES;
  }, [unitTypes]);

  // Synchronized strictly with Reference Building Types in System Settings (including future additions)
  const availableFilterTypes = useMemo(() => {
    return effectiveUnitTypes.filter((ut) => ut.status !== 'disabled');
  }, [effectiveUnitTypes]);

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

  // Effective Org Entities (with fallback to INITIAL_ORG_ENTITIES)
  const effectiveOrgEntities = useMemo(() => {
    if (Array.isArray(orgEntities) && orgEntities.length > 0) {
      return orgEntities;
    }
    return INITIAL_ORG_ENTITIES;
  }, [orgEntities]);

  // Extract list of org entities / departments for filter
  const availableOrgEntities = useMemo(() => {
    const set = new Set<string>();
    effectiveOrgEntities.forEach((e) => {
      if (e.status !== 'disabled' && e.nameAr) set.add(e.nameAr.trim());
    });
    units.forEach((u) => {
      if (u.department) set.add(u.department.trim());
      u.rooms?.forEach((r) => {
        if (r.occupiedBy) set.add(r.occupiedBy.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [effectiveOrgEntities, units]);

  const [showOrgPickerModal, setShowOrgPickerModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'attachments'>('rooms');
  const [view3DMode, setView3DMode] = useState<'exterior' | 'floor_cut' | 'walkthrough' | 'blueprint2d'>('exterior');
  const [selectedFloor, setSelectedFloor] = useState<string>('G');
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDecommissionModal, setShowDecommissionModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [selectedRoomForQrCard, setSelectedRoomForQrCard] = useState<Room | null>(null);
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

  // Room filtering state for selected unit (by floor, room type, search)
  const [roomFloorFilter, setRoomFloorFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');

  // Reset room filters whenever selected unit changes
  useEffect(() => {
    setRoomFloorFilter('all');
    setRoomTypeFilter('all');
    setRoomSearchQuery('');
  }, [selectedUnitCode]);

  // Available floors in the current unit
  const availableFloors = useMemo(() => {
    if (!selectedUnit?.rooms) return [];
    const set = new Set<string>();
    selectedUnit.rooms.forEach((r) => {
      if (r.floor && r.floor.trim()) set.add(r.floor.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar', { numeric: true }));
  }, [selectedUnit?.rooms]);

  // Available room types in the current unit
  const availableRoomTypes = useMemo(() => {
    if (!selectedUnit?.rooms) return [];
    const set = new Set<string>();
    selectedUnit.rooms.forEach((r) => {
      if (r.type && r.type.trim()) set.add(r.type.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [selectedUnit?.rooms]);

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    if (!selectedUnit?.rooms) return [];
    return selectedUnit.rooms.filter((rm) => {
      if (roomFloorFilter !== 'all' && rm.floor?.trim() !== roomFloorFilter) return false;
      if (roomTypeFilter !== 'all' && rm.type?.trim() !== roomTypeFilter) return false;
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.toLowerCase().trim();
        const code = (rm.code || '').toLowerCase();
        const name = (rm.name || '').toLowerCase();
        const occ = (rm.occupiedBy || '').toLowerCase();
        const type = (rm.type || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !occ.includes(q) && !type.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [selectedUnit?.rooms, roomFloorFilter, roomTypeFilter, roomSearchQuery]);

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
    let matchType = false;
    if (filterType === 'all') {
      matchType = true;
    } else {
      const targetCode = filterType.trim().toUpperCase();
      const unitTypeStr = (u.type || '').trim().toUpperCase();
      const explicitCode = (u.unitTypeCode || '').trim().toUpperCase();

      if (explicitCode && explicitCode === targetCode) {
        matchType = true;
      } else if (unitTypeStr === targetCode) {
        matchType = true;
      } else if (targetCode === 'BLD' && (unitTypeStr === 'BUILDING' || (u.code && u.code.toUpperCase().includes('-BLD-')))) {
        matchType = true;
      } else if (targetCode === 'CRV' && (unitTypeStr === 'CARAVAN' || (u.code && u.code.toUpperCase().includes('-CRV-')))) {
        matchType = true;
      } else if (targetCode === 'WHS' && (unitTypeStr === 'WAREHOUSE' || (u.code && u.code.toUpperCase().includes('-WHS-')))) {
        matchType = true;
      } else if (targetCode === 'EQP' && unitTypeStr === 'EQUIPMENT') {
        matchType = true;
      } else if (targetCode === 'SFT' && unitTypeStr === 'SAFETY_SYSTEM') {
        matchType = true;
      } else if (targetCode === 'TNK' && unitTypeStr === 'STORAGE_TANK') {
        matchType = true;
      } else if (u.code && u.code.toUpperCase().includes(`-${targetCode}-`)) {
        matchType = true;
      }
    }
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

  const getUnitTypeLabel = (typeStr: string, unitCode?: string) => {
    const list = availableFilterTypes;
    let codeFromUnit = '';
    if (unitCode) {
      const parts = unitCode.split('-');
      if (parts.length >= 4) {
        codeFromUnit = parts[2].toUpperCase();
      }
    }

    const match = list.find(
      (ut) =>
        (codeFromUnit && ut.code.toUpperCase() === codeFromUnit) ||
        (typeStr && ut.code.toUpperCase() === typeStr.toUpperCase()) ||
        (ut.code === 'BLD' && typeStr === 'building') ||
        (ut.code === 'CRV' && typeStr === 'caravan') ||
        (ut.code === 'WHS' && typeStr === 'warehouse') ||
        (ut.code === 'EQP' && typeStr === 'equipment') ||
        (ut.code === 'SFT' && typeStr === 'safety_system') ||
        (ut.code === 'TNK' && typeStr === 'storage_tank') ||
        ut.code === typeStr
    );
    if (match) return `${match.nameAr} (${match.code})`;

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
    <div className="space-y-4 sm:space-y-6 text-right dir-rtl w-full max-w-full min-w-0 overflow-hidden break-words">
      {/* Top Header & Search Filter Bar */}
      <div className={`border rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col gap-3 transition-colors w-full min-w-0 overflow-hidden bg-card border-slate-200 text-slate-900 shadow-sm [&>div:first-child]:mb-1`}>
        <PageHeader
          icon={Box}
          title="الوحدات المسجلة"
          description="استعراض الوحدات ومجسّمها ثلاثي الأبعاد، التقييم الهندسي، وتعديل بياناتها"
          actions={
            <Badge tone="blue">
              المطابقة: {toArabicDigits(filteredUnits.length)} من {toArabicDigits(units.length)}
            </Badge>
          }
        />

        {/* Filter Controls Bar - Responsive Grid on Mobile, Flex on Desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-0.5 text-xs w-full min-w-0">
          {/* Governorate Filter */}
          <select
            value={filterGovernorate}
            onChange={(e) => handleGovernorateFilterChange(e.target.value)}
            className={`${fieldLookSm} w-full sm:w-auto min-w-0 cursor-pointer truncate`}
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
            className={`${fieldLookSm} w-full sm:w-auto min-w-0 cursor-pointer truncate`}
          >
            <option value="all">كافة الحقول</option>
            {availableOilfieldOptions.map((f) => (
              <option key={f.id} value={f.nameAr}>
                {f.nameAr}
              </option>
            ))}
          </select>

          {/* زر التشكيلات / الجهات الشاغلة - يظهر صفحة التشكيلات للاختيار منها */}
          <div className="flex items-center gap-1 col-span-2 sm:col-span-1 min-w-0 w-full sm:w-auto">
            <Button
              size="sm"
              variant={filterOrgEntity !== 'all' ? 'primary' : 'secondary'}
              icon={Network}
              onClick={() => setShowOrgPickerModal(true)}
              title="فتح صفحة التشكيلات والجهات الشاغلة للاختيار منها"
              className="w-full sm:w-auto"
            >
              <span className="max-w-[200px] truncate">{filterOrgEntity !== 'all' ? `التشكيل: ${filterOrgEntity}` : 'التشكيلات / الجهات الشاغلة'}</span>
            </Button>
            {filterOrgEntity !== 'all' && (
              <Button size="sm" variant="danger-ghost" icon={X} onClick={() => setFilterOrgEntity('all')} title="إلغاء تصفية التشكيل" aria-label="إلغاء تصفية التشكيل" />
            )}
          </div>

          {/* Condition Grade Filter */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className={`${fieldLookSm} w-full sm:w-auto min-w-0 cursor-pointer truncate`}
          >
            <option value="all">كافة درجات التقييم</option>
            <option value="A">Grade A - ممتاز</option>
            <option value="B">Grade B - جيد</option>
            <option value="C">Grade C - متوسط</option>
            <option value="D">Grade D - حرج</option>
          </select>

          {/* Unit Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`${fieldLookSm} w-full sm:w-auto min-w-0 cursor-pointer truncate`}
          >
            <option value="all">كافة الأنواع ({toArabicDigits(availableFilterTypes.length)})</option>
            {availableFilterTypes.map((ut) => (
              <option key={ut.code} value={ut.code}>
                {ut.nameAr} ({ut.code})
              </option>
            ))}
          </select>

          {/* Unit Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className={`${fieldLookSm} w-full sm:w-auto min-w-0 cursor-pointer truncate`}
          >
            <option value="all">كافة الحالات</option>
            <option value="active">نشطة وتشغيلية</option>
            <option value="decommissioned">مشطوبة ومجمدة</option>
          </select>

          {/* Quick Search */}
          <div className="relative w-full sm:w-56 col-span-2 sm:col-span-1 min-w-0">
            <Search className={`absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-400`} />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="ابحث بالرمز، الاسم، التشكيل..."
              className={`${fieldLookSm} w-full pr-8 pl-2`}
            />
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <Button size="sm" icon={RotateCcw} onClick={handleResetFilters} title="إلغاء التصفية وإظهار كل الوحدات" className="col-span-2 sm:col-span-1">
              إعادة ضبط
            </Button>
          )}
        </div>
      </div>

      {/* Unit Selection Card with Collapse & Hierarchy (Governorate -> Oilfield -> Units) */}
      <div className={`border rounded-2xl p-4 shadow-md transition-all bg-card border-slate-200`}>
        {/* Card Header Bar */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2.5 sm:gap-3 border-b text-xs min-w-0 border-slate-200`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold shrink-0">
              <Building className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <h3 className={`font-extrabold text-xs sm:text-sm truncate text-slate-900`}>
                  اختر المنشأة أو الأصل النفطي للعرض والتحكم
                </h3>
                <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold bg-brand-100 text-brand-700 border border-brand-200 shrink-0">
                  {toArabicDigits(filteredUnits.length)} منشأة
                </span>
              </div>
              <p className={`text-[10px] sm:text-[11px] mt-0.5 leading-relaxed break-words text-slate-500`}>
                مرتبة ضمن هرم جغرافية شركة نفط الوسط (المحافظة ← الحقل النفطي ← المنشآت)
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
            {/* View Layout Toggle: Tree vs Flat Ribbon */}
            {!isSelectorCollapsed && (
              <>
                <div className={`flex items-center p-0.5 rounded-xl border bg-slate-100 border-slate-200`}>
                  <button
                    onClick={() => setViewLayoutMode('tree')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer ${
                      viewLayoutMode === 'tree'
                        ? 'bg-brand-700 text-on-brand shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="عرض شجرة الهيكلية (محافظات وحقول)"
                  >
                    <ListTree className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>عرض الشجرة</span>
                  </button>
                  <button
                    onClick={() => setViewLayoutMode('flat')}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer ${
                      viewLayoutMode === 'flat'
                        ? 'bg-brand-700 text-on-brand shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="عرض شريط أفقي سريع لكافة المنشآت"
                  >
                    <Grid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>شريط سريع</span>
                  </button>
                </div>

                {viewLayoutMode === 'tree' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleExpandAll}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200`}
                      title="توسيع كافة المحافظات والحقول"
                    >
                      توسيع
                    </button>
                    <button
                      onClick={handleCollapseAll}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition cursor-pointer bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200`}
                      title="طي كافة المحافظات والحقول"
                    >
                      طي
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Collapse/Expand Selector Toggle Button */}
            <button
              onClick={() => setIsSelectorCollapsed(!isSelectorCollapsed)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 cursor-pointer bg-brand-100 hover:bg-brand-100 text-brand-700 border-brand-200 shadow-xs"
              title={isSelectorCollapsed ? 'توسيع قائمة المنشآت' : 'طي قائمة المنشآت'}
            >
              {isSelectorCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-700" />
                  <span>توسيع</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-700" />
                  <span>طي</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsed State Summary */}
        {isSelectorCollapsed ? (
          <div className="py-2 px-1 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={`font-semibold flex items-center gap-2 text-slate-600`}>
              <Building className="w-3.5 h-3.5 text-brand-700" />
              <span>بطاقة المنشآت مطوية حالياً ({toArabicDigits(filteredUnits.length)} منشأة متاحة)</span>
              {selectedUnit && (
                <span className="font-mono text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  المحددة: {selectedUnit.name} ({toArabicDigits(selectedUnit.code)})
                </span>
              )}
            </span>
            <button
              onClick={() => setIsSelectorCollapsed(false)}
              className="text-brand-700 font-bold hover:underline cursor-pointer"
            >
              اضغط هنا للتوسيع
            </button>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className={`text-xs font-bold text-slate-700`}>
              لا توجد نتائج مطابقة لمعايير البحث والتصفية الحالية.
            </p>
            <button
              onClick={handleResetFilters}
              className="text-xs text-brand-700 font-bold underline hover:opacity-80 cursor-pointer"
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
                  className={`border rounded-xl transition-all overflow-hidden border-slate-200 bg-slate-50/60`}
                >
                  {/* Governorate Node Header */}
                  <div
                    onClick={() => toggleGov(govGroup.governorate)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer select-none transition bg-slate-100/90 hover:bg-slate-200/80 text-slate-800`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-700 shrink-0" />
                      <span className="font-extrabold text-xs sm:text-sm">{govGroup.governorate}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-100 text-brand-700 border border-brand-200">
                        {toArabicDigits(govGroup.totalUnits)} منشأة ({toArabicDigits(govGroup.fields.length)} حقل)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">
                        {govOpen ? 'انقر للطي' : 'انقر للتوسيع'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                          govOpen ? 'rotate-180 text-brand-700' : ''
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
                            className={`border rounded-lg mr-2 sm:mr-4 transition-all border-slate-200 bg-card`}
                          >
                            {/* Field Node Header */}
                            <div
                              onClick={() => toggleField(fieldKey)}
                              className={`p-2 flex items-center justify-between cursor-pointer select-none rounded-lg transition hover:bg-slate-100 text-slate-800`}
                            >
                              <div className="flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <span className="font-bold text-xs">{fieldGroup.field}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-sky-500/15 text-sky-600 border border-sky-500/25">
                                  {toArabicDigits(fieldGroup.units.length)} وحدة
                                </span>
                              </div>

                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                                  fieldOpen ? 'rotate-180 text-sky-600' : ''
                                }`}
                              />
                            </div>

                            {/* Units Grid inside Field */}
                            {fieldOpen && (
                              <div className="p-2 pt-1 mr-2 sm:mr-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                {fieldGroup.units.map((u) => {
                                  const isSelected = selectedUnit?.code === u.code;
                                  const isDecom = u.status === 'decommissioned';
                                  return (
                                    <button
                                      key={u.id}
                                      onClick={() => onSelectUnit(u.code)}
                                      className={`p-2 rounded-xl border text-right transition cursor-pointer flex items-center justify-between gap-2 text-xs group ${
                                        isSelected
                                          ? 'bg-brand-700 text-on-brand border-brand-200 font-extrabold shadow-lg ring-2 ring-brand-600/50'
                                          : isDecom
                                          ? 'bg-rose-50 border-rose-200 text-rose-900 hover:border-rose-200'
                                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-brand-200 hover:bg-brand-50'
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
                                                ? 'bg-card/20 text-slate-950'
                                                : u.conditionGrade === 'A'
                                                ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                                                : u.conditionGrade === 'B'
                                                ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                                                : u.conditionGrade === 'C'
                                                ? 'bg-brand-100 text-brand-700 border border-brand-200'
                                                : 'bg-rose-500/20 text-rose-600 border border-rose-500/30'
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
          /* Flat Ribbon View (Grid on mobile, flex ribbon on desktop) */
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:items-center gap-2 sm:overflow-x-auto pt-2 pb-1 text-xs w-full min-w-0">
            {paginatedUnits.map((u) => {
              const isSelected = selectedUnit?.code === u.code;
              const isDecom = u.status === 'decommissioned';
              return (
                <button
                  key={u.id}
                  onClick={() => onSelectUnit(u.code)}
                  className={`px-2.5 sm:px-3 py-2 rounded-xl border text-right transition cursor-pointer flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto shrink-0 ${
                    isSelected
                      ? 'bg-brand-700 text-on-brand border-brand-200 font-bold shadow-md'
                      : isDecom
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-brand-200 hover:bg-brand-50'
                  }`}
                >
                  <span className="font-mono text-xs font-black shrink-0">{toArabicDigits(u.code)}</span>
                  <span className="truncate flex-1 min-w-0 max-w-[130px] sm:max-w-[140px] text-xs">{u.name}</span>
                  {isDecom ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-rose-600 text-white flex items-center gap-0.5 shrink-0">
                      <Archive className="w-2.5 h-2.5" />
                      <span>مشطوبة</span>
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                        isSelected
                          ? 'bg-card/20 text-slate-950'
                          : u.conditionGrade === 'A'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.conditionGrade === 'B'
                          ? 'bg-blue-100 text-blue-800'
                          : u.conditionGrade === 'C'
                          ? 'bg-brand-100 text-brand-800'
                          : 'bg-red-100 text-red-800'
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

        {/* ترقيم الصفحات */}
        {totalUnitsCount > 0 && (
          <div className="mt-3">
            <Pagination page={validPage} pages={totalPages} onPage={setCurrentPage} total={totalUnitsCount} unit="وحدة (50 في الصفحة)" />
          </div>
        )}
      </div>

      {/* When NO unit is selected: Show informative placeholder */}
      {!selectedUnit ? (
        <Card>
          <EmptyState icon={Box} text="اختر وحدة من القائمة أعلاه لعرض مجسّمها ثلاثي الأبعاد وبياناتها وغرفها ومرفقاتها." />
        </Card>
      ) : (
        <>
          {/* Top Return / Selection Switch Bar */}
          <div className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-md transition-colors w-full min-w-0 bg-brand-50 border-brand-200 text-slate-900`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-brand-700 text-on-brand flex items-center justify-center font-bold shrink-0 shadow">
                <Building className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold block text-brand-700 ">المنشأة المحددة حالياً:</span>
                <h4 className="font-extrabold text-xs sm:text-sm truncate">{selectedUnit.name} <span className="font-mono text-xs opacity-80">({toArabicDigits(selectedUnit.code)})</span></h4>
              </div>
            </div>

            <button
              onClick={() => onSelectUnit('')}
              className="bg-brand-700 hover:bg-brand-800 text-on-brand font-black px-3.5 py-1.5 sm:py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-md w-full sm:w-auto shrink-0"
              title="العودة لشاشة الاختيار وتصفح كافة المنشآت والأصول النفطية"
            >
              <ArrowRight className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">العودة إلى (اختر منشأة أو أصلاً نفطياً)</span>
              <span className="sm:hidden">العودة لقائمة المنشآت</span>
            </button>
          </div>

      {/* Notice Banner for Decommissioned Unit */}
      {selectedUnit.status === 'decommissioned' && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs w-full min-w-0">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <h4 className="font-black text-rose-600 text-xs sm:text-sm">⚠️ هذه المنشأة مشطوبة ومجمدة عن الخدمة التشغيلية</h4>
              <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed break-words">
                تاريخ الشطب: <strong className="font-mono text-slate-900">{selectedUnit.decommissionedAt || 'الآن'}</strong> | السبب: <span className="text-brand-700 font-semibold">{selectedUnit.decommissionReason || 'غير محدد'}</span>
              </p>
            </div>
          </div>
          {onReactivateUnit && (
            <button
              onClick={() => onReactivateUnit(selectedUnit.code)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-1.5 sm:py-2 rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer shadow w-full sm:w-auto text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة تفعيل الوحدة</span>
            </button>
          )}
        </div>
      )}

      {/* 1. MASTER UNIFIED ASSET & 3D METADATA CARD */}
      <div className={`w-full border rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-4 sm:space-y-5 transition-colors min-w-0 overflow-hidden bg-card border-slate-200`}>
        {/* Top Header Section: Building Title, Status Badges & Action Toolbar */}
        <div className={`flex flex-col items-center justify-center text-center pb-4 sm:pb-5 border-b gap-3 sm:gap-4 min-w-0 border-slate-200/80`}>
          {/* Building Name and Status & Quality Badges */}
          <div className="flex flex-col items-center justify-center gap-2 max-w-full">
            <div className="flex items-center justify-center gap-2 max-w-full">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-brand-100 text-brand-700 border border-brand-200 flex items-center justify-center font-black shadow-xs shrink-0">
                <Box className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <h3 className={`font-black text-lg sm:text-2xl md:text-3xl tracking-tight break-words text-center text-slate-900`}>
                {selectedUnit.name}
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {selectedUnit.status === 'decommissioned' ? (
                <span className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 rounded-full font-black bg-rose-600 text-white flex items-center gap-1 shadow-xs shrink-0">
                  <Archive className="w-3.5 h-3.5 shrink-0" />
                  <span>مشطوبة ومجمدة</span>
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center gap-1 shadow-xs shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>نشطة وتشغيلية</span>
                </span>
              )}

              <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold border bg-slate-100 text-slate-800 border-slate-300`}>
                درجة الجودة: {selectedUnit.conditionGrade || 'A'}
              </span>
            </div>
          </div>

          {/* Action Buttons Hub - Centered Categorized Toolbar */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full pt-1">
            {/* Cluster 1: Navigation & Map & QR */}
            <div className={`flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 sm:gap-1.5 p-1 rounded-xl border max-w-full bg-slate-100/80 border-slate-200 shadow-2xs`}>
              <button
                onClick={() => onSelectUnit('')}
                className={`font-bold py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer whitespace-nowrap hover:bg-card text-slate-700 hover:text-slate-900 shadow-xs`}
                title="إلغاء اختيار الوحدة الحالية والعودة إلى قائمة المنشآت"
              >
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-brand-700" />
                <span>العودة</span>
              </button>

              <div className={`hidden sm:block w-px h-4 bg-slate-300`} />

              <button
                onClick={() => setShowLocationMapModal(true)}
                className={`font-bold py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer whitespace-nowrap hover:bg-card text-emerald-800 hover:text-emerald-900 shadow-xs`}
                title="عرض موقع المنشأة على الخريطة التفاعلية وتوجيه الملاحة GPS"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span className="hidden xs:inline">الموقع بالخريطة</span>
                <span className="xs:hidden">الخريطة</span>
              </button>

              <div className={`hidden sm:block w-px h-4 bg-slate-300`} />

              {/* QR Code button with unit code */}
              <button
                onClick={() => setShowQrModal(true)}
                className={`font-mono font-bold py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer whitespace-nowrap shadow-xs hover:bg-card text-brand-800 bg-brand-50 border border-brand-200 hover:border-brand-200`}
                title="عرض وتنزيل وطباعة رمز الوصول السريع (Quick Access QR Code) للوحدة"
              >
                <QrCode className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span className="hidden sm:inline">QR ({toArabicDigits(selectedUnit.code)})</span>
                <span className="sm:hidden">QR</span>
              </button>
            </div>

            {/* Cluster 2: Primary Edit & 3D Customizer */}
            {!isReadOnly && onUpdateUnit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="bg-linear-to-r from-brand-600 to-brand-800 hover:from-brand-600 hover:to-brand-800 text-on-brand font-black py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg transition-all cursor-pointer transform active:scale-98"
                title="تعديل كافة الخصائص، الأبعاد، الطوابق، والتصميم ثلاثي الأبعاد للمبنى"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">تعديل بيانات وتصميم المبنى (3D)</span>
                <span className="sm:hidden">تعديل المنشأة (3D)</span>
              </button>
            )}

            {/* Read-Only Badge */}
            {isReadOnly && (
              <div
                className={`font-bold py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs flex items-center gap-1.5 border whitespace-nowrap bg-slate-100 border-slate-300 text-slate-700`}
                title="صلاحية حسابك الحالية هي استعراض وتصفح وطباعة التقارير فقط"
              >
                <Eye className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                <span className="hidden sm:inline">وضع الاستعراض (مستخدم)</span>
                <span className="sm:hidden">استعراض</span>
              </div>
            )}

            {/* Cluster 3: Lifecycle & Deletion */}
            {!isReadOnly && (
              <div className={`flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl border bg-slate-100/80 border-slate-200 shadow-2xs`}>
                {selectedUnit.status === 'decommissioned' ? (
                  onReactivateUnit && (
                    <button
                      onClick={() => onReactivateUnit(selectedUnit.code)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs flex items-center gap-1 shadow-xs transition cursor-pointer whitespace-nowrap"
                      title="إعادة تفعيل الوحدة وتغيير حالتها إلى نشطة"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>إعادة تفعيل</span>
                    </button>
                  )
                ) : (
                  onDecommissionUnit && (
                    <button
                      onClick={() => {
                        setDecommissionReasonInput('');
                        setShowDecommissionModal(true);
                      }}
                      className={`font-bold py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs flex items-center gap-1 transition cursor-pointer whitespace-nowrap hover:bg-brand-100 text-brand-800`}
                      title="تجميد الوحدة ونقلها إلى حالة مشطوبة"
                    >
                      <Archive className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                      <span className="hidden xs:inline">شطب وتجميد</span>
                      <span className="xs:hidden">شطب</span>
                    </button>
                  )
                )}

                {onDeleteUnit && (
                  <>
                    <div className={`w-px h-4 bg-slate-300`} />
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs flex items-center gap-1 shadow-xs transition cursor-pointer whitespace-nowrap"
                      title="حذف الوحدة نهائياً مع كافة معلوماتها وبياناتها من النظام وقاعدة البيانات"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden xs:inline">حذف نهائي</span>
                      <span className="xs:hidden">حذف</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Unified 8-Card Specifications Grid (بطاقات هوية ومواصفات المنشأة المنظمة والمتوازنة) */}
        {(() => {
          const shapeObj = BUILDING_SHAPE_OPTIONS.find((s) => s.id === selectedUnit.buildingShape) || {
            nameAr: selectedUnit.buildingShape || 'مستطيل',
            symbol: '▭',
            category: 'الأشكال الأساسية',
          };
          const occupiedRoomsCount = selectedUnit.rooms?.filter((r) => r.occupiedBy && !isRoomVacant(r.occupiedBy)).length || 0;
          const vacantRoomsCount = selectedUnit.rooms?.filter((r) => !r.occupiedBy || isRoomVacant(r.occupiedBy)).length || 0;

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
              {/* Card 1: رمز المنشأة */}
              <div className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between transition bg-brand-50 border-brand-200 shadow-2xs`}>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                    <span>رمز المنشأة</span>
                  </span>
                  <p className="font-mono font-black text-xs sm:text-sm text-brand-700 truncate" title={selectedUnit.code}>
                    {toArabicDigits(selectedUnit.code)}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[10px] sm:text-[10.5px] text-slate-500 truncate">
                  رمز هيكلي فريد
                </div>
              </div>

              {/* Card 2: رمز الأصل */}
              <div className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between transition bg-indigo-50/40 border-indigo-200/80 shadow-2xs`}>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>رمز الأصل</span>
                  </span>
                  <p className="font-mono font-black text-xs sm:text-sm text-indigo-600 truncate" title={selectedUnit.fixedAssetCode || 'غير مسجل'}>
                    {selectedUnit.fixedAssetCode || 'غير مسجل'}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[10px] sm:text-[10.5px] text-slate-500 truncate">
                  {selectedUnit.fixedAssetCode ? 'سجل أصول معتمد' : 'بانتظار التوثيق'}
                </div>
              </div>

              {/* Card 3: نوع المنشأة */}
              <div className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between transition bg-sky-50/40 border-sky-200/80 shadow-2xs`}>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>نوع المنشأة</span>
                  </span>
                  <p className="font-bold text-xs sm:text-sm text-slate-800 truncate" title={getUnitTypeLabel(selectedUnit.type, selectedUnit.code)}>
                    {getUnitTypeLabel(selectedUnit.type, selectedUnit.code)}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[10px] sm:text-[10.5px] text-slate-500 truncate">
                  التصنيف المعماري
                </div>
              </div>

              {/* Card 4: الحقل والقطاع */}
              <div className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between transition bg-rose-50/40 border-rose-200/80 shadow-2xs`}>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>الحقل والقطاع</span>
                  </span>
                  <p className="font-bold text-xs sm:text-sm text-rose-700 truncate" title={selectedUnit.field}>
                    {selectedUnit.field}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[10px] sm:text-[10.5px] text-slate-500 truncate">
                  محافظة {selectedUnit.governorate}
                </div>
              </div>

              {/* Card 5: شكل وهندسة المبنى 3D */}
              <div className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between transition bg-purple-50/40 border-purple-200/80 shadow-2xs`}>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>الهندسة والأبعاد (3D)</span>
                  </span>
                  <p className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5 truncate">
                    <span className="text-purple-600 font-black text-base leading-none">{shapeObj.symbol}</span>
                    <span className="truncate">{shapeObj.nameAr}</span>
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[10px] sm:text-[10.5px] text-slate-500 truncate font-mono" dir="ltr">
                  {selectedUnit.lengthM ? `${toArabicDigits(selectedUnit.lengthM)}L` : '—'} × {selectedUnit.widthM ? `${toArabicDigits(selectedUnit.widthM)}W` : '—'} × {toArabicDigits(selectedUnit.heightM || ((selectedUnit.floorsCount || 1) * 3.5))}H
                </div>
              </div>

              {/* Card 6: المساحة والطوابق */}
              <div className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between transition bg-emerald-50/40 border-emerald-200/80 shadow-2xs`}>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>المساحة والطوابق</span>
                  </span>
                  <p className="font-black text-xs sm:text-sm text-emerald-700 truncate">
                    {toArabicDigits(selectedUnit.totalAreaSqM)} م²
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[10px] sm:text-[10.5px] text-slate-500 truncate">
                  {toArabicDigits(selectedUnit.floorsCount)} طوابق • {toArabicDigits(selectedUnit.rooms?.length || 0)} غرفة
                </div>
              </div>

              {/* Card 7: سنة الإنشاء والإحداثيات */}
              <div className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between transition bg-teal-50/40 border-teal-200/80 shadow-2xs`}>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>سنة الإنشاء و GPS</span>
                  </span>
                  <p className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                    {toArabicDigits(selectedUnit.constructionYear)} م
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[10px] sm:text-[10.5px] text-teal-600 truncate font-mono">
                  {toArabicDigits(selectedUnit.coordinates.lat)}°, {toArabicDigits(selectedUnit.coordinates.lng)}°
                </div>
              </div>

              {/* Card 8: إشغال الغرف والقاعات */}
              <div className={`p-3 sm:p-3.5 rounded-xl border flex flex-col justify-between transition bg-brand-50 border-brand-200 shadow-2xs`}>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                    <span>إشغال الغرف والقاعات</span>
                  </span>
                  <p className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                    {toArabicDigits(occupiedRoomsCount)} مشغولة
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[10px] sm:text-[10.5px] text-brand-700 truncate font-bold">
                  {toArabicDigits(vacantRoomsCount)} شاغرة (متاحة)
                </div>
              </div>
            </div>
          );
        })()}

        {/* Row 2: Occupying Entities Showcase (الجهات الشاغلة للمنشأة) - لوحة فاخرة منظمة وتوزيع متناسق */}
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
            <div className={`p-4 rounded-xl border space-y-3 text-xs transition bg-brand-50 border-brand-200 text-slate-800`}>
              {/* Header Title */}
              <div className="flex items-center gap-2 font-black text-brand-700 text-xs">
                <div className="p-1 rounded-lg bg-brand-50 border border-brand-200">
                  <Users className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                </div>
                <span>الجهات الشاغلة للمنشأة:</span>
              </div>

              {/* Horizontal List of Compact Entity Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {depts.map((deptName, idx) => {
                  const entityRooms = (selectedUnit.rooms || []).filter((r) => r.occupiedBy === deptName);
                  const roomCount = entityRooms.length;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition ${
                        idx === 0
                          ? 'bg-card text-brand-800 border-brand-200 shadow-2xs'
                          : 'bg-card text-slate-800 border-slate-200 shadow-2xs hover:border-slate-300'
                      }`}
                      title={`الجهة الشاغلة: ${deptName}${roomCount > 0 ? ` (تشغل ${roomCount} غرف في هذه المنشأة)` : ''}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-700 shrink-0" />
                        <span className="text-[11.5px] font-bold truncate">{deptName}</span>
                      </div>
                      {roomCount > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 bg-brand-100 text-brand-800 border border-brand-200`}>
                          {toArabicDigits(roomCount)} غرف
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Summary Cards (إجمالي الجهات وإجمالي الغرف) */}
              <div className={`pt-2 border-t flex flex-wrap items-center justify-end gap-2.5 text-xs font-semibold border-brand-200 text-slate-600`}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-2xs bg-card border-brand-200 text-brand-800`}>
                  <span className="text-[11px] font-bold">إجمالي الجهات:</span>
                  <span className="font-mono font-black text-xs px-1.5 py-0.2 rounded bg-brand-100 text-brand-700 ">
                    {toArabicDigits(depts.length)}
                  </span>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-2xs bg-card border-slate-200 text-slate-800`}>
                  <span className="text-[11px] font-bold">إجمالي الغرف:</span>
                  <span className="font-mono font-black text-xs px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 ">
                    {toArabicDigits(selectedUnit.rooms?.length || 0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
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

      {/* Bottom Tabs Area: Rooms, Attachments */}
      <div className={`border rounded-2xl p-3.5 sm:p-5 shadow-lg transition-colors w-full min-w-0 overflow-hidden bg-card border-slate-200`}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { key: 'rooms', label: 'الغرف والقاعات', icon: DoorOpen, count: selectedUnit.rooms.length },
            { key: 'attachments', label: 'المرفقات والمخططات', icon: Paperclip, count: selectedUnit.attachments?.length || 0 },
          ]}
        />

        {/* Rooms Tab Content */}
        {activeTab === 'rooms' && (
          <div className="space-y-3">
            {/* Filter Toolbar for Rooms & Halls (فلترة الغرف بحسب الطابق، النوع، والبحث) */}
            <div className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition bg-slate-50 border-slate-200 shadow-2xs`}>
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {/* Floor Filter */}
                <div className="flex items-center gap-1.5 min-w-[140px] flex-1 sm:flex-initial">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">الطابق:</span>
                  <select
                    value={roomFloorFilter}
                    onChange={(e) => setRoomFloorFilter(e.target.value)}
                    className={`${fieldLookSm} w-full cursor-pointer`}
                  >
                    <option value="all">كافة الطوابق ({toArabicDigits(selectedUnit.rooms?.length || 0)})</option>
                    {availableFloors.map((floor) => {
                      const count = selectedUnit.rooms.filter((r) => r.floor?.trim() === floor).length;
                      return (
                        <option key={floor} value={floor}>
                          الطابق {floor} ({toArabicDigits(count)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Room Type Filter */}
                <div className="flex items-center gap-1.5 min-w-[150px] flex-1 sm:flex-initial">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">نوع الغرفة:</span>
                  <select
                    value={roomTypeFilter}
                    onChange={(e) => setRoomTypeFilter(e.target.value)}
                    className={`${fieldLookSm} w-full cursor-pointer`}
                  >
                    <option value="all">كافة أنواع الغرف</option>
                    {availableRoomTypes.map((type) => {
                      const count = selectedUnit.rooms.filter((r) => r.type?.trim() === type).length;
                      return (
                        <option key={type} value={type}>
                          {type} ({toArabicDigits(count)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Quick Search */}
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={roomSearchQuery}
                    onChange={(e) => setRoomSearchQuery(e.target.value)}
                    placeholder="بحث بالرمز، الاسم، أو الشاغل..."
                    className={`${fieldLookSm} w-full pr-8 pl-7`}
                  />
                  {roomSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRoomSearchQuery('')}
                      className="absolute left-2 top-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Reset Filters button */}
                {(roomFloorFilter !== 'all' || roomTypeFilter !== 'all' || roomSearchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoomFloorFilter('all');
                      setRoomTypeFilter('all');
                      setRoomSearchQuery('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
                    title="إلغاء التصفية وإعادة عرض كافة الغرف"
                  >
                    <X className="w-3 h-3" />
                    <span>إلغاء التصفية</span>
                  </button>
                )}
              </div>

              {/* Counter Display */}
              <div className="text-[11px] font-bold text-slate-500 shrink-0 self-end md:self-center">
                <span>عرض </span>
                <strong className="text-brand-700 font-black">{toArabicDigits(filteredRooms.length)}</strong>
                <span> من أصل </span>
                <strong>{toArabicDigits(selectedUnit.rooms?.length || 0)}</strong>
                <span> غرفة وقاعة</span>
              </div>
            </div>

            {/* Empty state when no rooms match filter */}
            {filteredRooms.length === 0 ? (
              <EmptyState icon={DoorOpen} text="لا توجد غرف مطابقة للفلاتر المحددة">
                <Button
                  size="sm"
                  onClick={() => {
                    setRoomFloorFilter('all');
                    setRoomTypeFilter('all');
                    setRoomSearchQuery('');
                  }}
                >
                  عرض كل الغرف
                </Button>
              </EmptyState>
            ) : (
              <Table head={['رمز الغرفة', 'اسم الغرفة', 'نوع الاستخدام', 'الطابق', 'المساحة', 'عدد الشاغلين', 'الجهة الشاغلة', 'الحالة', 'بطاقة QR']}>
                {filteredRooms.map((rm) => {
                  const isStopped = rm.status === 'Stopped' || rm.status === 'متوقفة';
                  const roomComputedCode =
                    (rm.code && rm.code.trim()) ? rm.code.trim() : getStandardRoomCode(selectedUnit.code, rm, selectedUnit.rooms);
                  const occDisplay = formatRoomOccupancyDisplay(rm);
                  return (
                    <tr key={rm.id}>
                      <Td className="font-mono font-bold text-brand-700">{roomComputedCode}</Td>
                      <Td className="font-bold text-slate-900">{rm.name}</Td>
                      <Td>{rm.type}</Td>
                      <Td>{rm.floor}</Td>
                      <Td>{toArabicDigits(rm.areaSqM)} م²</Td>
                      <Td>
                        <span className={occDisplay.badgeClass}>{toArabicDigits(occDisplay.text)}</span>
                      </Td>
                      <Td>
                        {rm.occupiedBy && rm.occupiedBy.trim() && !isRoomVacant(rm.occupiedBy) ? rm.occupiedBy : <Badge tone="blue">شاغرة</Badge>}
                      </Td>
                      <Td>
                        <Badge tone={isStopped ? 'red' : 'green'}>{isStopped ? 'متوقفة' : 'فعالة'}</Badge>
                        {isStopped && rm.notes && <div className="mt-1 text-xs text-rose-700">سبب التوقف: {rm.notes}</div>}
                      </Td>
                      <Td>
                        <Button size="sm" icon={QrCode} onClick={() => setSelectedRoomForQrCard({ ...rm, code: roomComputedCode })} title="استعراض وطباعة بطاقة QR للغرفة">
                          QR
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            )}
          </div>
        )}

        {/* Attachments Tab Content */}
        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className={`text-xs font-bold text-slate-700`}>
                الوثائق والمرفقات الرقمية الأرشيفية للوحدة ({toArabicDigits(selectedUnit.attachments?.length || 0)})
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                معاينة وتنزيل المرفقات الرقمية
              </span>
            </div>

            {(!selectedUnit.attachments || selectedUnit.attachments.length === 0) ? (
              <div className={`p-8 border border-dashed rounded-2xl text-center space-y-2 bg-slate-50 border-slate-300`}>
                <Paperclip className={`w-8 h-8 mx-auto opacity-50 text-slate-400`} />
                <p className={`text-xs font-bold text-slate-800`}>لا توجد مرفقات أو مخططات رسمية مضافة لهذه المنشأة.</p>
                <p className={`text-[11px] text-slate-500`}>يمكنك إضافة وتعديل المرفقات الرقمية يدوياً من خلال نافذة تعديل كافة بيانات وتصميم المنشأة.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedUnit.attachments.map((att) => (
                  <div key={att.id} className={`p-3.5 border rounded-xl flex items-start justify-between gap-3 text-xs transition bg-slate-50 border-slate-200 hover:border-brand-200`}>
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Paperclip className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className={`font-bold truncate text-slate-800`}>{att.name}</p>
                        <p className="text-[10px] text-brand-700 font-semibold">{att.category}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {att.sizeMB ? `${toArabicDigits(att.sizeMB)} MB` : '1.5 MB'} | {toArabicDigits(att.uploadDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setPreviewAttachment(att)}
                        className="p-1.5 bg-sky-500/10 text-sky-600 hover:bg-sky-500 hover:text-on-brand rounded-lg transition cursor-pointer"
                        title="معاينة وفتح بالبرنامج المخصص"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => downloadAttachment(att)}
                        className="p-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-on-brand rounded-lg transition cursor-pointer"
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
          existingUnits={units}
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

      {/* نافذتا التأكيد الموحدتان: الشطب والحذف */}
      <ConfirmDialog
        open={!!selectedUnit && showDecommissionModal}
        title={`شطب وتجميد الوحدة (${selectedUnit?.code ?? ''})`}
        confirmDisabled={!decommissionReasonInput.trim()}
        message={
          selectedUnit && (
            <div className="space-y-3">
              <p>تُنقل الوحدة «<strong>{selectedUnit.name}</strong>» إلى حالة «مشطوبة ومجمدة»، وتبقى بياناتها وغرفها ومعداتها محفوظة وتظهر في تقارير الوحدات المشطوبة.</p>
              <label className="block space-y-1.5 text-xs">
                <span className="font-bold text-brand-700">سبب الشطب (إلزامي):</span>
                <textarea
                  value={decommissionReasonInput}
                  onChange={(e) => setDecommissionReasonInput(e.target.value)}
                  placeholder="مثال: أضرار إنشائية جسيمة، انتهاء العمر التشغيلي"
                  rows={3}
                  className={`${fieldLookSm} w-full h-auto min-h-20`}
                />
              </label>
            </div>
          )
        }
        onClose={() => setShowDecommissionModal(false)}
        onConfirm={() => {
          if (selectedUnit && onDecommissionUnit) onDecommissionUnit(selectedUnit.code, decommissionReasonInput.trim());
          setShowDecommissionModal(false);
        }}
      />
      <ConfirmDialog
        open={!!selectedUnit && showDeleteModal}
        danger
        title={`حذف الوحدة نهائياً (${selectedUnit?.code ?? ''})`}
        message={
          selectedUnit && (
            <>هل تريد حذف الوحدة «<strong>{selectedUnit.name}</strong>» (<span className="font-mono">{selectedUnit.code}</span>) مع غرفها ومعداتها ومخططاتها نهائياً؟ لا يمكن التراجع ولا الاستعادة. وحدة لها صيانة أو كشوفات أو إشغال لا تُحذف، وتُشطب بدل ذلك.</>
          )
        }
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          if (selectedUnit && onDeleteUnit) onDeleteUnit(selectedUnit.code);
          setShowDeleteModal(false);
        }}
      />

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
          branding={branding}
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
        />
      )}
      {/* Room QR Card Modal */}
      {selectedUnit && selectedRoomForQrCard && (
        <RoomQrCardModal
          unit={selectedUnit}
          room={selectedRoomForQrCard}
          allRooms={selectedUnit.rooms}
          branding={branding}
          theme={theme}
          onClose={() => setSelectedRoomForQrCard(null)}
        />
      )}

      {/* Org Entity Picker Modal (صفحة التشكيلات للاختيار منها) */}
      {showOrgPickerModal && (
        <OrgEntityPickerModal
          isOpen={showOrgPickerModal}
          onClose={() => setShowOrgPickerModal(false)}
          orgEntities={effectiveOrgEntities}
          selectedEntity={filterOrgEntity}
          onSelectEntity={(entityName) => setFilterOrgEntity(entityName)}
          title="اختيار التشكيل / الجهة الشاغلة للمنشآت النفطية"
          subtitle="اختر تشكيلاً أو قسماً من الهيكل الإداري للشركة لتصفية وعرض المباني والمنشآت التابعة له بالـ 3D"
          theme={theme}
        />
      )}
    </div>
  );
};
