import React, { useState, useMemo, lazy, Suspense } from 'react';
import { generateUnitCode } from '../utils/unitAndRoomCodeUtils';
import { Button, Field, Input, Modal, Tabs, fieldLook, fieldLookSm, useConfirm } from './ui';
import {
  X,
  Save,
  Edit3,
  Building,
  MapPin,
  Layers,
  Plus,
  Trash2,
  Check,
  Box,
  Wrench,
  Paperclip,
  ShieldCheck,
  FileText,
  Download,
  Eye,
  Upload,
  FileCheck,
  FolderArchive,
  FileCode,
  Image,
  Users,
  QrCode,
  Network,
  AlertTriangle,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Search,
} from 'lucide-react';
import { UnitAsset, ConditionGrade, UnitType, Room, EquipmentItem, ReferenceUnitType, UnitAttachment, OrgEntity, GovernorateRef, OilfieldRef } from '../types';
import { BUILDING_SHAPE_OPTIONS, getShapeFactor, calculateUnitArea } from '../utils/buildingShapes';
import { toArabicDigits, getServerDateFormatted, getServerIsoDateOnly } from '../utils/arabicUtils';
import { safeSetItem } from '../utils/storageUtils';
import { QuickAddOrgEntityModal } from './QuickAddOrgEntityModal';
import {
  generateRoomCode,
  getRoomTypeCode,
  isOccupantsBasedRoom,
  isCapacityBasedRoom,
  isNonOccupancyRoom,
  isRoomVacant,
  formatRoomOccupancyDisplay,
  getStandardRoomCode,
  normalizeUnitRoomsSequence,
  extractFloorNumber,
  calculateRoomSequenceNumber,
} from '../utils/unitAndRoomCodeUtils';
import {

  cleanFixedAssetCodeInput,
  validateFixedAssetCodeFormat,
  checkFixedAssetCodeUniqueness,
  formatToCaravanDottedCode,
  formatToBuildingContinuousCode,
} from '../utils/assetCodeUtils';

// تُحمَّل عند الطلب (4-ل)
const LocationPickerMapLazy = lazy(() => import('./LocationPickerMap').then((m) => ({ default: m.LocationPickerMap })));
const LocationPickerMap = (props: React.ComponentProps<typeof LocationPickerMapLazy>) => (
  <Suspense fallback={null}>
    <LocationPickerMapLazy {...props} />
  </Suspense>
);
const AttachmentViewerModalLazy = lazy(() => import('./AttachmentViewerModal').then((m) => ({ default: m.AttachmentViewerModal })));
const AttachmentViewerModal = (props: React.ComponentProps<typeof AttachmentViewerModalLazy>) => (
  <Suspense fallback={null}>
    <AttachmentViewerModalLazy {...props} />
  </Suspense>
);
const RoomQrCardModalLazy = lazy(() => import('./RoomQrCardModal').then((m) => ({ default: m.RoomQrCardModal })));
const RoomQrCardModal = (props: React.ComponentProps<typeof RoomQrCardModalLazy>) => (
  <Suspense fallback={null}>
    <RoomQrCardModalLazy {...props} />
  </Suspense>
);
const OrgChartModalLazy = lazy(() => import('./OrgChartModal').then((m) => ({ default: m.OrgChartModal })));
const OrgChartModal = (props: React.ComponentProps<typeof OrgChartModalLazy>) => (
  <Suspense fallback={null}>
    <OrgChartModalLazy {...props} />
  </Suspense>
);


type RefItem = { id?: string; code?: string; nameAr: string; governorateId?: string; status?: string };

interface UnitFormProps {
  /** create: وحدة جديدة (unit مسودة فارغة والرمز يُولَّد)؛ edit: تعديل وحدة موجودة */
  mode?: 'create' | 'edit';
  /** modal: نافذة فوق الشاشة؛ page: داخل الصفحة */
  layout?: 'modal' | 'page';
  onAddGovernorate?: (gov: GovernorateRef) => void;
  onAddOilfield?: (field: OilfieldRef) => void;
  onAddUnitType?: (type: ReferenceUnitType) => void;
  unit: UnitAsset;
  onSave: (updatedUnit: UnitAsset) => void | boolean | Promise<void | boolean>;
  onClose: () => void;
  governorates?: RefItem[];
  oilfields?: RefItem[];
  unitTypes?: ReferenceUnitType[];
  existingUnits?: UnitAsset[];
  orgEntities?: OrgEntity[];
  onAddOrgEntity?: (newEntity: OrgEntity) => void;
  theme?: 'dark' | 'light';
  initialTab?: 'basic' | 'shape3d' | 'location' | 'rooms' | 'docs';
}

export const UnitForm: React.FC<UnitFormProps> = ({
  mode = 'edit',
  layout = 'modal',
  onAddGovernorate,
  onAddOilfield,
  onAddUnitType,
  unit,
  onSave,
  onClose,
  governorates = [],
  oilfields = [],
  unitTypes = [],
  existingUnits = [],
  orgEntities = [],
  onAddOrgEntity,
  theme = 'dark',
  initialTab,
}) => {
  const isLight = theme === 'light';
  const isCreate = mode === 'create';
  const isPage = layout === 'page';

  // Active edit step tab
  const [activeTab, setActiveTab] = useState<'basic' | 'shape3d' | 'location' | 'rooms' | 'docs'>(
    initialTab || 'basic'
  );
  const [showQuickAddOrgModal, setShowQuickAddOrgModal] = useState(false);
  const [showOrgChartModal, setShowOrgChartModal] = useState(false);
  const [selectedRoomForQr, setSelectedRoomForQr] = useState<Room | null>(null);

  // Rooms Tab View Mode & Filter State
  const confirm = useConfirm();
  const [roomsViewMode, setRoomsViewMode] = useState<'cards' | 'table'>('cards');
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [roomFloorFilter, setRoomFloorFilter] = useState<string>('all');

  // Editable Form State initialized from unit
  const initialType = useMemo<UnitType>(() => {
    if (unit.unitTypeCode) {
      if (unit.unitTypeCode === 'CRV') return 'caravan';
      if (unit.unitTypeCode === 'BLD') return 'building';
      if (unit.unitTypeCode === 'WHS') return 'warehouse';
      return unit.unitTypeCode;
    }
    if (unit.code) {
      const parts = unit.code.split('-');
      if (parts.length >= 4) {
        const c = parts[2].toUpperCase();
        if (c === 'CRV') return 'caravan';
        if (c === 'BLD') return 'building';
        if (c === 'WHS') return 'warehouse';
        return c;
      }
    }
    return unit.type || 'building';
  }, [unit]);

  const [name, setName] = useState<string>(unit.name);
  const [fixedAssetCode, setFixedAssetCode] = useState<string>(unit.fixedAssetCode || '');
  const [type, setType] = useState<UnitType>(initialType);
  const [field, setField] = useState<string>(unit.field);
  const [governorate, setGovernorate] = useState<string>(unit.governorate);
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>(unit.conditionGrade);
  const [constructionYear, setConstructionYear] = useState<number>(unit.constructionYear);
  const [department, setDepartment] = useState<string>(unit.department);

  const [codeSuffix] = useState<string>(() => generateUnitCode('X', 'X', 'X', existingUnits).split('-').pop() || 'AAAA');
  const typeCodeOf = (t: string) => (t === 'caravan' ? 'CRV' : t === 'building' ? 'BLD' : t === 'warehouse' ? 'WHS' : t === 'equipment' ? 'EQP' : t);
  const cleanCodePart = (v: string | undefined, fallback: string) => (v || fallback).toUpperCase().replace(/[^A-Z0-9]/g, '') || fallback;
  const selectedGovRef = governorates.find((g) => g.nameAr === governorate);
  const selectedFieldRef = oilfields.find((f) => f.nameAr === field);
  const unitCode = isCreate
    ? `${cleanCodePart(selectedGovRef?.code, 'EBD')}-${cleanCodePart(selectedFieldRef?.code, 'EBD')}-${cleanCodePart(typeCodeOf(type), 'BLD')}-${codeSuffix}`
    : unit.code;
  const assetCodeType = isCreate ? undefined : unit.type;
  // الحقول التابعة للمحافظة المختارة (إن كانت القوائم تحمل المعرّفات)
  const visibleOilfields = oilfields.filter((f) => !f.governorateId || !selectedGovRef?.id || f.governorateId === selectedGovRef.id);
  const handleGovernorateChange = (value: string) => {
    setGovernorate(value);
    const gov = governorates.find((g) => g.nameAr === value);
    const inGov = oilfields.filter((f) => !f.governorateId || !gov?.id || f.governorateId === gov.id);
    if (!inGov.some((f) => f.nameAr === field)) setField(inGov[0]?.nameAr || '');
  };

  // إضافة محافظة / حقل / نوع وحدة من داخل النموذج (للمدير)
  const [showAddGovModal, setShowAddGovModal] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showAddUnitTypeModal, setShowAddUnitTypeModal] = useState(false);
  const [newRefName, setNewRefName] = useState('');
  const [newRefCode, setNewRefCode] = useState('');
  const openRefModal = (which: 'gov' | 'field' | 'type') => {
    setNewRefName('');
    setNewRefCode('');
    setShowAddGovModal(which === 'gov');
    setShowAddFieldModal(which === 'field');
    setShowAddUnitTypeModal(which === 'type');
  };
  const closeRefModal = () => {
    setShowAddGovModal(false);
    setShowAddFieldModal(false);
    setShowAddUnitTypeModal(false);
  };
  const handleSaveNewRef = () => {
    const nameAr = newRefName.trim();
    const code = newRefCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!nameAr || !code) {
      alert('يرجى ملء الاسم والرمز');
      return;
    }
    if (showAddGovModal) {
      onAddGovernorate?.({ id: `GOV-${code}`, nameAr, code, status: 'active' } as GovernorateRef);
      setGovernorate(nameAr);
      setField('');
    } else if (showAddFieldModal) {
      onAddOilfield?.({ id: `FLD-${code}`, governorateId: selectedGovRef?.id || '', nameAr, code, status: 'active' } as OilfieldRef);
      setField(nameAr);
    } else if (showAddUnitTypeModal) {
      onAddUnitType?.({ code, nameAr, multiStory: false, defaultRoof: 'كونكريت', status: 'active' } as unknown as ReferenceUnitType);
      setType(code as UnitType);
    }
    closeRefModal();
  };

  const initialDepartments = useMemo(() => {
    if (unit.departments && unit.departments.length > 0) {
      return unit.departments;
    }
    if (unit.department) {
      if (unit.department.includes(' ، ')) {
        return unit.department.split(' ، ').map((s) => s.trim()).filter(Boolean);
      }
      if (unit.department.includes(',')) {
        return unit.department.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [unit.department.trim()];
    }
    return [];
  }, [unit]);

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(initialDepartments);
  const [selectedDeptToAdd, setSelectedDeptToAdd] = useState<string>('');

  const handleAddDepartment = (deptName: string) => {
    const trimmed = deptName.trim();
    if (!trimmed) return;
    if (!selectedDepartments.includes(trimmed)) {
      const updated = [...selectedDepartments, trimmed];
      setSelectedDepartments(updated);
      setDepartment(updated.join(' ، '));
    }
    setSelectedDeptToAdd('');
  };

  const handleRemoveDepartment = (deptNameToRemove: string) => {
    const updated = selectedDepartments.filter((d) => d !== deptNameToRemove);
    setSelectedDepartments(updated);
    setDepartment(updated.join(' ، '));
  };

  const handleSetPrimaryDepartment = (deptName: string) => {
    const otherDepts = selectedDepartments.filter((d) => d !== deptName);
    const updated = [deptName, ...otherDepts];
    setSelectedDepartments(updated);
    setDepartment(updated.join(' ، '));
  };

  const handleSaveSelectionFromOrgChart = (selectedNames: string[]) => {
    setSelectedDepartments(selectedNames);
    setDepartment(selectedNames.join(' ، '));
  };
  const [lengthM, setLengthM] = useState<number>(unit.lengthM || 20);
  const [widthM, setWidthM] = useState<number>(unit.widthM || 16);
  const [heightM, setHeightM] = useState<number>(unit.heightM || 3);
  const [totalAreaSqM, setTotalAreaSqM] = useState<number>(unit.totalAreaSqM);
  const [buildingShape, setBuildingShape] = useState<string>(unit.buildingShape || 'مستطيل');

  // Custom 3D Design Finishing State per unit
  const [archStyle, setArchStyle] = useState<'modern' | 'classic' | 'industrial' | 'minimalist'>(
    unit.designFinishing?.archStyle || 'modern'
  );
  const [roofType, setRoofType] = useState<'flat' | 'flat_parapet' | 'gabled' | 'pitched_tile' | 'garden' | 'pitched'>(
    unit.designFinishing?.roofType || 'flat_parapet'
  );
  const [showFurniture, setShowFurniture] = useState<boolean>(
    unit.designFinishing?.showFurniture ?? true
  );
  const [showWindows, setShowWindows] = useState<boolean>(
    unit.designFinishing?.showWindows ?? true
  );
  const [showTrees, setShowTrees] = useState<boolean>(
    unit.designFinishing?.showTrees ?? false
  );
  const [interiorLightIntensity, setInteriorLightIntensity] = useState<number>(
    unit.designFinishing?.interiorLightIntensity ?? 3.5
  );
  const [exteriorLightIntensity, setExteriorLightIntensity] = useState<number>(
    unit.designFinishing?.exteriorLightIntensity ?? 3.5
  );

  const handleLengthChange = (newL: number) => {
    const val = Math.max(0, newL);
    setLengthM(val);
    setTotalAreaSqM(calculateUnitArea(val, widthM, buildingShape));
  };

  const handleWidthChange = (newW: number) => {
    const val = Math.max(0, newW);
    setWidthM(val);
    setTotalAreaSqM(calculateUnitArea(lengthM, val, buildingShape));
  };

  const handleShapeChange = (newShape: string) => {
    setBuildingShape(newShape);
    setTotalAreaSqM(calculateUnitArea(lengthM, widthM, newShape));
  };
  const [floorsCount, setFloorsCount] = useState<number>(unit.floorsCount);
  const [lat, setLat] = useState<number>(unit.coordinates.lat);
  const [lng, setLng] = useState<number>(unit.coordinates.lng);
  const [sectorAddress, setSectorAddress] = useState<string>(unit.sectorAddress || '');
  const [rooms, setRooms] = useState<Room[]>(() => {
    if (!unit.rooms || unit.rooms.length === 0) return [];
    return unit.rooms.map((r, idx) => {
      const floorNum = extractFloorNumber(r.floor);
      const seq = r.sequenceNumber || calculateRoomSequenceNumber(floorNum, idx + 1);
      const typeCode = r.roomTypeCode || getRoomTypeCode(r.type);
      const code = (r.code && r.code.trim()) ? r.code.trim() : generateRoomCode(unitCode, floorNum, typeCode, seq, true);
      return {
        ...r,
        sequenceNumber: seq,
        roomTypeCode: typeCode,
        code,
      };
    });
  });
  const [roomCodeChangeWarning, setRoomCodeChangeWarning] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UnitAttachment[]>(
    unit.attachments && Array.isArray(unit.attachments) ? unit.attachments : []
  );
  const [attachmentsCount, setAttachmentsCount] = useState<number>(
    unit.attachments && Array.isArray(unit.attachments) ? unit.attachments.length : 0
  );

  // Attachment Modal & Form States
  const [editingAttachment, setEditingAttachment] = useState<UnitAttachment | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<UnitAttachment | null>(null);
  const [showAddAttachmentModal, setShowAddAttachmentModal] = useState<boolean>(false);

  // Add attachment form inputs
  const [newAttName, setNewAttName] = useState('');
  const [newAttCategory, setNewAttCategory] = useState('مخططات هندسية');
  const [newAttType, setNewAttType] = useState('pdf');
  const [newAttSizeMB, setNewAttSizeMB] = useState<number>(2.5);
  const [newAttNotes, setNewAttNotes] = useState('');

  // Handle Uploading Files from Desktop or Drag & Drop
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const processFilesAndAdd = (files: File[]) => {
    const validFiles: File[] = [];
    let hasOverSized = false;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        hasOverSized = true;
      } else {
        validFiles.push(file);
      }
    }

    if (hasOverSized) {
      alert('حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)، الرجاء ضغط الصورة أو اختيار ملف أصغر.');
    }

    if (validFiles.length === 0) return;

    const filePromises = validFiles.map((file, idx) => {
      return new Promise<UnitAttachment>((resolve) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'file';
        let docType = 'pdf';
        if (['dwg', 'dxf', 'cad'].includes(ext)) docType = 'dwg';
        else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) docType = 'image';
        else if (['doc', 'docx', 'xls', 'xlsx'].includes(ext)) docType = 'doc';
        else if (['zip', 'rar', '7z'].includes(ext)) docType = 'archive';

        const objectUrl = URL.createObjectURL(file);
        const reader = new FileReader();

        const createItem = (dataUrl: string) => {
          resolve({
            id: `ATT-${Date.now()}-${idx}`,
            name: file.name,
            type: docType,
            sizeMB: Number((file.size / (1024 * 1024)).toFixed(2)) || 1.5,
            uploadDate: getServerIsoDateOnly(),
            category: 'مخططات هندسية',
            notes: `ملف مرفق تم رفعه بواسطة المستخدم بتاريخ ${getServerDateFormatted()}`,
            fileUrl: dataUrl,
            url: dataUrl,
          });
        };

        reader.onload = (event) => {
          const resultUrl = (event.target?.result as string) || objectUrl;
          createItem(resultUrl);
        };
        reader.onerror = () => {
          createItem(objectUrl);
        };

        try {
          reader.readAsDataURL(file);
        } catch (err) {
          createItem(objectUrl);
        }
      });
    });

    Promise.all(filePromises).then((newItems) => {
      setAttachments((prev) => {
        const updated = [...prev, ...newItems];
        setAttachmentsCount(updated.length);
        return updated;
      });
    });
  };

  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesAndAdd(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const [newAttFileUrl, setNewAttFileUrl] = useState<string>('');

  const handleModalFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert('حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)، الرجاء ضغط الصورة أو اختيار ملف أصغر.');
        e.target.value = '';
        return;
      }

      if (!newAttName.trim()) {
        setNewAttName(file.name);
      }
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) setNewAttType('image');
      else if (ext === 'pdf') setNewAttType('pdf');
      else if (['dwg', 'dxf'].includes(ext)) setNewAttType('dwg');

      setNewAttSizeMB(Number((file.size / (1024 * 1024)).toFixed(2)) || 1.5);

      const objectUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        setNewAttFileUrl((evt.target?.result as string) || objectUrl);
      };
      reader.onerror = () => {
        setNewAttFileUrl(objectUrl);
      };
      try {
        reader.readAsDataURL(file);
      } catch (err) {
        setNewAttFileUrl(objectUrl);
      }
    }
  };

  const handleSaveNewAttachment = () => {
    if (!newAttName.trim()) return;
    const newItem: UnitAttachment = {
      id: `ATT-${Date.now()}`,
      name: newAttName.trim(),
      category: newAttCategory,
      type: newAttType,
      sizeMB: newAttSizeMB,
      uploadDate: getServerIsoDateOnly(),
      notes: newAttNotes.trim() || 'وثيقة رسمية مؤرشفة بملف المنشأة',
      fileUrl: newAttFileUrl || undefined,
      url: newAttFileUrl || undefined,
    };
    const updated = [...attachments, newItem];
    setAttachments(updated);
    setAttachmentsCount(updated.length);
    setShowAddAttachmentModal(false);
    setNewAttName('');
    setNewAttNotes('');
    setNewAttFileUrl('');
  };

  const handleSaveEditAttachment = () => {
    if (!editingAttachment) return;
    const updated = attachments.map((att) =>
      att.id === editingAttachment.id ? editingAttachment : att
    );
    setAttachments(updated);
    setAttachmentsCount(updated.length);
    setEditingAttachment(null);
  };

  const handleDeleteAttachment = async (id: string) => {
    const target = attachments.find((att) => att.id === id);
    if (!(await confirm({ title: 'تأكيد حذف المرفق', message: <>هل تريد حذف المرفق «{target?.name || id}» من الوحدة؟ يُنفَّذ الحذف عند حفظ التعديلات.</>, danger: true }))) return;
    const updated = attachments.filter((att) => att.id !== id);
    setAttachments(updated);
    setAttachmentsCount(updated.length);
  };

  const getFileIcon = (typeStr: string) => {
    switch (typeStr.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'dwg':
      case 'cad':
        return <FileCode className="w-5 h-5 text-indigo-600 shrink-0" />;
      case 'image':
      case 'png':
      case 'jpg':
        return <Image className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'doc':
      case 'docx':
        return <FileCheck className="w-5 h-5 text-sky-600 shrink-0" />;
      case 'archive':
      case 'zip':
      case 'rar':
        return <FolderArchive className="w-5 h-5 text-brand-700 shrink-0" />;
      default:
        return <Paperclip className="w-5 h-5 text-brand-700 shrink-0" />;
    }
  };

  // Reference lists fallback handling
  const defaultUnitTypesList = [
    { code: 'BLD', nameAr: 'مبنى خرساني / إداري', typeValue: 'building' as UnitType },
    { code: 'CRV', nameAr: 'كرفان حقلي ساندويتش بانل', typeValue: 'caravan' as UnitType },
    { code: 'WHS', nameAr: 'مخزن جملون هيكل حديدي', typeValue: 'warehouse' as UnitType },
    { code: 'EQP', nameAr: 'محطة ضخ ومعدة ثقيلة', typeValue: 'equipment' as UnitType },
    { code: 'SFT', nameAr: 'منظومة إطفاء وسلامة', typeValue: 'safety_system' as UnitType },
    { code: 'TNK', nameAr: 'خزانات تجمع خام', typeValue: 'storage_tank' as UnitType },
  ];

  const defaultGovernorates = [
    'محافظة واسط',
    'محافظة بغداد',
    'محافظة ديالى',
    'محافظة البصرة',
    'محافظة ميسان',
    'محافظة كركوك',
  ];

  const defaultOilfields = [
    'حقل الأحدب النفطي',
    'حقل بدرة النفطي',
    'حقل شرق بغداد',
    'حقل نفت خانة',
    'حقل الرميلة الشمالي والجنوبي',
    'حقول شركة نفط ميسان الموحدة',
  ];

  // Room Handlers
  const handleUpdateRoom = (roomId: string, key: keyof Room, value: any) => {
    setRooms((prev) =>
      prev.map((rm) => {
        if (rm.id === roomId) {
          const updated = { ...rm, [key]: value };
          if (key === 'status') {
            const isReactivating = value === 'Active' || value === 'فعالة' || value === 'نشطة';
            updated.status = isReactivating ? 'Active' : value;
            updated.notes = isReactivating ? '' : rm.notes;
          }
          if (key === 'floor' || key === 'type') {
            const oldFloorNum = extractFloorNumber(rm.floor);
            const newFloorNum = parseInt(String(key === 'floor' ? value : rm.floor || '').replace(/\D/g, ''), 10) || 1;
            const roomType = key === 'type' ? value : rm.type;
            const typeCode = getRoomTypeCode(roomType);
            updated.roomTypeCode = typeCode;

            // When moving to a new floor, recalculate sequence number correctly for that floor
            if (key === 'floor' && newFloorNum !== oldFloorNum) {
              const sameFloorRooms = prev.filter(
                (r) => r.id !== roomId && extractFloorNumber(r.floor) === newFloorNum
              );
              const newSeqInFloor = sameFloorRooms.length + 1;
              const newFullSeq = calculateRoomSequenceNumber(newFloorNum, newSeqInFloor);
              updated.sequenceNumber = newFullSeq;
              updated.code = generateRoomCode(unitCode, newFloorNum, typeCode, newFullSeq, true);
              setRoomCodeChangeWarning(
                `تنبيه: تم تغيير طابق الغرفة "${rm.name}" من (${rm.floor}) إلى (${value}). تم تحديث الرمز القياسي للغرفة تلقائياً إلى [${updated.code}]. يرجى طباعة بطاقة QR جديدة ولصقها على باب الغرفة.`
              );
            } else if (key === 'type') {
              const currentFloorNum = extractFloorNumber(rm.floor);
              const fullSeq =
                rm.sequenceNumber &&
                rm.sequenceNumber >= currentFloorNum * 100 &&
                rm.sequenceNumber < (currentFloorNum + 1) * 100
                  ? rm.sequenceNumber
                  : calculateRoomSequenceNumber(currentFloorNum, 1);
              updated.sequenceNumber = fullSeq;
              updated.code = generateRoomCode(unitCode, currentFloorNum, typeCode, fullSeq, true);
            }
          }
          return updated;
        }
        return rm;
      })
    );
  };

  const handleRegenerateSingleRoomCode = (roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;
    const floorNum = extractFloorNumber(targetRoom.floor);
    const sameFloorRooms = rooms.filter(
      (r) => r.id !== roomId && extractFloorNumber(r.floor) === floorNum
    );
    const newSeqInFloor = sameFloorRooms.length + 1;
    const newFullSeq = calculateRoomSequenceNumber(floorNum, newSeqInFloor);
    const typeCode = getRoomTypeCode(targetRoom.type);
    const newCode = generateRoomCode(unitCode, floorNum, typeCode, newFullSeq, true);
    setRooms((prev) =>
      prev.map((rm) =>
        rm.id === roomId
          ? { ...rm, sequenceNumber: newFullSeq, roomTypeCode: typeCode, code: newCode }
          : rm
      )
    );
    setRoomCodeChangeWarning(
      `تمت إعادة توليد الرمز القياسي للغرفة "${targetRoom.name}" إلى [${newCode}]. تذكير: يرجى طباعة بطاقة QR جديدة ولصقها على الباب.`
    );
  };

  const handleRegenerateAllRoomCodes = async () => {
    if (
      await confirm({
        title: 'تأكيد إعادة ترقيم الغرف',
        message: 'هل تريد إعادة توليد رموز كل الغرف؟ تتغير الرموز الحالية، ويلزم طباعة بطاقات QR جديدة ولصقها على الأبواب.',
      })
    ) {
      const updated = normalizeUnitRoomsSequence(unitCode, rooms);
      setRooms(updated);
      setRoomCodeChangeWarning(
        'تمت إعادة ترقيم وتوليد جميع رموز الغرف بنجاح. تذكير: يرجى طباعة بطاقات QR الجديدة ولصقها على أبواب الغرف لضمان تطابق الرموز.'
      );
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    const target = rooms.find((rm) => rm.id === roomId);
    if (!(await confirm({ title: 'تأكيد حذف الغرفة', message: <>هل تريد حذف الغرفة «{target?.name || roomId}» مع معداتها من الوحدة؟ يُنفَّذ الحذف عند حفظ التعديلات.</>, danger: true }))) return;
    setRooms((prev) => prev.filter((rm) => rm.id !== roomId));
  };

  const handleAddRoom = () => {
    const nextNum = rooms.length + 1;
    const floorNum = 1;
    const sameFloorRooms = rooms.filter(
      (r) => extractFloorNumber(r.floor) === floorNum
    );
    const seqNum = calculateRoomSequenceNumber(floorNum, sameFloorRooms.length + 1);
    const typeCode = getRoomTypeCode('مكتب إداري');
    const roomCode = generateRoomCode(unitCode, floorNum, 'مكتب إداري', seqNum, true);

    const newRm: Room = {
      id: `RM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `غرفة مخصصة جديدة ${nextNum}`,
      type: 'مكتب إداري',
      floor: 'الطابق 1',
      areaSqM: 25,
      status: 'Active',
      occupiedBy: selectedDepartments[0] || department || '',
      code: roomCode,
      roomTypeCode: typeCode,
      sequenceNumber: seqNum,
      occupantsCount: 1,
    };
    setRooms((prev) => [...prev, newRm]);
  };

  const availableFloors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.floor && r.floor.trim()) set.add(r.floor.trim());
    });
    return Array.from(set);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (roomFloorFilter !== 'all' && r.floor?.trim() !== roomFloorFilter) return false;
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.trim().toLowerCase();
        const code = (r.code || '').toLowerCase();
        const name = (r.name || '').toLowerCase();
        const type = (r.type || '').toLowerCase();
        const dept = (r.occupiedBy || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !type.includes(q) && !dept.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rooms, roomFloorFilter, roomSearchQuery]);

  const roomStats = useMemo(() => {
    let totalArea = 0;
    let activeCount = 0;
    let stoppedCount = 0;
    let vacantCount = 0;
    rooms.forEach((r) => {
      totalArea += Number(r.areaSqM) || 0;
      if (r.status === 'Stopped' || r.status === 'متوقفة') stoppedCount++;
      else activeCount++;
      if (isRoomVacant(r.occupiedBy)) vacantCount++;
    });
    return { totalArea, activeCount, stoppedCount, vacantCount };
  }, [rooms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('يرجى كتابة الاسم الكامل للوحدة');
      setActiveTab('basic');
      return;
    }
    if (isCreate && (!governorate || !field)) {
      alert('يرجى اختيار المحافظة والحقل');
      setActiveTab('basic');
      return;
    }
    if (!conditionGrade) {
      alert('يرجى اختيار درجة التقييم الهندسي للوحدة (A / B / C / D)');
      setActiveTab('shape3d');
      return;
    }

    // Validate Fixed Asset Code if provided
    if (fixedAssetCode.trim()) {
      const codeFormatVal = validateFixedAssetCodeFormat(fixedAssetCode.trim(), assetCodeType);
      if (!codeFormatVal.isValid) {
        alert(`تنبيه بخصوص رمز الأصل:\n${codeFormatVal.message}`);
        setActiveTab('basic');
        return;
      }
      const uniquenessCheck = checkFixedAssetCodeUniqueness(fixedAssetCode.trim(), existingUnits, unit.id);
      if (!uniquenessCheck.isUnique) {
        alert('تنبيه: رمز الأصل مسجل مسبقاً لوحدة أخرى في النظام. رمز الأصل يجب أن يكون فريداً وغير مكرر.');
        setActiveTab('basic');
        return;
      }
    }

    const updatedFinishing = {
      archStyle,
      roofType,
      showFurniture,
      showWindows,
      showTrees,
      interiorLightIntensity,
      exteriorLightIntensity,
    };
    safeSetItem(`unit_finishing_${unitCode}`, updatedFinishing);

    const finalDept =
      selectedDepartments.length > 0 ? selectedDepartments.join(' ، ') : department || 'غير محدد';

    const normalizedRooms = normalizeUnitRoomsSequence(unitCode, rooms);

    const updated: UnitAsset = {
      ...unit,
      id: isCreate ? unitCode : unit.id,
      code: unitCode,
      ...(isCreate ? { siteName: field ? `منشأة ${field}` : unit.siteName } : {}),
      name: name.trim() || unit.name,
      fixedAssetCode: fixedAssetCode.trim() || undefined,
      type,
      unitTypeCode: type === 'caravan' ? 'CRV' : type === 'building' ? 'BLD' : type === 'warehouse' ? 'WHS' : type,
      field,
      governorate,
      conditionGrade,
      constructionYear: Number(constructionYear) || unit.constructionYear,
      department: finalDept,
      departments: selectedDepartments.length > 0 ? selectedDepartments : [finalDept],
      coordinates: { lat: Number(lat), lng: Number(lng) },
      sectorAddress,
      totalAreaSqM: Number(totalAreaSqM) || unit.totalAreaSqM,
      lengthM: Number(lengthM),
      widthM: Number(widthM),
      heightM: Number(heightM),
      buildingShape,
      floorsCount: Number(floorsCount) || unit.floorsCount,
      rooms: normalizedRooms,
      equipment: unit.equipment || [],
      attachments,
      attachmentsCount: attachments.length,
      designFinishing: updatedFinishing,
      lastUpdated: getServerIsoDateOnly(),
    };

    if (!isCreate && !(await confirm({ title: 'تأكيد تعديل الوحدة', message: <>هل تريد حفظ التعديلات على الوحدة <strong className="font-mono">{unitCode}</strong>؟</> }))) return;
    // 5-ز: النافذة لا تُغلق قبل تأكيد الخادم
    const saved = await onSave(updated);
    if (saved === false) return;
    if (!isCreate) onClose();
  };

  return (
    <div className={isPage ? 'w-full' : 'fixed inset-0 z-50 flex items-center justify-center bg-card/80 backdrop-blur-md p-1.5 sm:p-4 overflow-y-auto'}>
      <div
        className={`w-full rounded-2xl border flex flex-col bg-card border-slate-200 text-slate-900 ${isPage ? 'shadow-sm' : 'max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[96dvh] sm:max-h-[92vh]'}`}
      >
        {/* Header */}
        <div
          className={`px-3 sm:px-6 py-2.5 sm:py-4 border-b flex items-center justify-between gap-2.5 shrink-0 bg-slate-50 border-slate-200`}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand-700 text-on-brand flex items-center justify-center font-bold shadow-md shrink-0">
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black truncate">{isCreate ? 'تسجيل وحدة جديدة' : 'تعديل بيانات الوحدة'}</h3>
                <span className="font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-brand-100 text-brand-700 border border-brand-200">
                  {toArabicDigits(unitCode)}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs mt-0.5 truncate hidden sm:block text-slate-600">
                {isCreate ? 'الرمز القياسي يُولَّد من المحافظة والحقل والنوع، ويُعتمد عند الحفظ' : 'الهوية، الأبعاد، الموقع، الغرف، والمرفقات'}
              </p>
            </div>
          </div>

{!isPage && (
          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl transition cursor-pointer shrink-0 hover:bg-slate-200 text-slate-600`}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          )}
        </div>

        {/* التبويبات */}
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-2.5 pt-2 sm:px-6 [&>div]:mb-2">
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { key: 'basic', label: 'الهوية والمكان', icon: Building },
              { key: 'shape3d', label: 'الأبعاد 3D', icon: Box },
              { key: 'location', label: 'الموقع', icon: MapPin },
              { key: 'rooms', label: 'الغرف', icon: Layers, count: rooms.length },
              { key: 'docs', label: 'المرفقات', icon: Paperclip, count: attachments.length },
            ]}
          />
        </div>

        {/* Form Body with Fixed Bottom Action Footer */}
        <form onSubmit={handleSubmit} className={isPage ? 'flex flex-col' : 'flex flex-col flex-1 min-h-0 overflow-hidden'}>
          <div className={`p-3 sm:p-6 space-y-4 sm:space-y-6 ${isPage ? '' : 'overflow-y-auto flex-1'}`}>
          {/* TAB 1: Basic Identity */}
          {activeTab === 'basic' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 bg-slate-50/70 border-slate-200`}
            >
              <h4 className="text-xs font-bold text-brand-700 flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span>البيانات الأساسية والتعريفية للمنشأة</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block font-bold text-slate-700">فئة ونوع المنشأة المرجعي:</label>
                    {onAddUnitType && (
                      <button type="button" onClick={() => openRefModal('type')} className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline">
                        <Plus className="h-3 w-3" />
                        <span>إضافة</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as UnitType)}
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    {unitTypes.length > 0 ? (
                      unitTypes.map((ut) => {
                        const val: UnitType = ut.code === 'CRV' ? 'caravan' : ut.code === 'BLD' ? 'building' : ut.code === 'WHS' ? 'warehouse' : ut.code === 'EQP' ? 'equipment' : ut.code === 'SFT' ? 'safety_system' : ut.code === 'TNK' ? 'storage_tank' : ut.code;
                        return (
                          <option key={ut.code} value={val}>
                            {ut.nameAr} ({ut.code})
                          </option>
                        );
                      })
                    ) : (
                      defaultUnitTypesList.map((ut) => (
                        <option key={ut.code} value={ut.typeValue}>
                          {ut.nameAr} ({ut.code})
                        </option>
                      ))
                    )}
                    {type && unitTypes.length > 0 && !unitTypes.some((ut) => typeCodeOf(type) === ut.code) && <option value={type}>{type}</option>}
                  </select>
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    الاسم الكامل الرسمي للمنشأة / المبنى:
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${fieldLook} w-full`}
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block font-bold text-slate-700">المحافظة العراقية:</label>
                    {onAddGovernorate && (
                      <button type="button" onClick={() => openRefModal('gov')} className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline">
                        <Plus className="h-3 w-3" />
                        <span>إضافة</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={governorate}
                    onChange={(e) => handleGovernorateChange(e.target.value)}
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    {governorates.length > 0 ? (
                      governorates.map((g) => (
                        <option key={g.nameAr} value={g.nameAr}>
                          {g.nameAr}
                        </option>
                      ))
                    ) : (
                      defaultGovernorates.map((gName) => (
                        <option key={gName} value={gName}>
                          {gName}
                        </option>
                      ))
                    )}
                    {governorate && !governorates.some((g) => g.nameAr === governorate) && !defaultGovernorates.includes(governorate) && (
                      <option value={governorate}>{governorate}</option>
                    )}
                  </select>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="block font-bold text-slate-700">الحقل النفطي الميداني:</label>
                    {onAddOilfield && (
                      <button type="button" onClick={() => openRefModal('field')} className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline">
                        <Plus className="h-3 w-3" />
                        <span>إضافة</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    {isCreate && !field && <option value="">-- اختر الحقل --</option>}
                    {oilfields.length > 0 ? (
                      visibleOilfields.map((f) => (
                        <option key={f.nameAr} value={f.nameAr}>
                          {f.nameAr}
                        </option>
                      ))
                    ) : (
                      defaultOilfields.map((fName) => (
                        <option key={fName} value={fName}>
                          {fName}
                        </option>
                      ))
                    )}
                    {field && !visibleOilfields.some((f) => f.nameAr === field) && !(oilfields.length === 0 && defaultOilfields.includes(field)) && (
                      <option value={field}>{field}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-3 md:col-span-2 border-t pt-3 mt-1 border-slate-200 ">
                  <div className="flex items-center justify-between">
                    <label className={`block font-bold text-slate-700`}>
                      الجهات الشاغلة للمنشأة (يمكن إضافة أكثر من جهة):
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddOrgModal(true)}
                      className={`text-[11px] font-bold hover:underline flex items-center gap-1 cursor-pointer text-brand-700`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة جهة جديدة الى الهيكل التنظيمي</span>
                    </button>
                  </div>

                  {/* Selection Controls: Button to open Org Chart Modal */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowOrgChartModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-on-brand font-black text-xs sm:text-sm transition cursor-pointer shadow-md active:scale-[0.99]"
                      title="فتح الهيكل التنظيمي المعتمد لاختيار وتحديد التشكيلات والجهات الشاغلة"
                    >
                      <Network className="w-4 h-4 text-slate-950" />
                      <span>عرض الهيكل التنظيمي لاختيار وتحديد التشكيلات والجهات الشاغلة</span>
                      {selectedDepartments.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-card text-brand-700 text-[11px] font-black mr-1.5">
                          {toArabicDigits(selectedDepartments.length)} محددة
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Selected Occupying Entities Display Cards/Chips */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-bold text-slate-600`}>
                        الجهات الشاغلة المخصصة للمنشأة ({toArabicDigits(selectedDepartments.length)}):
                      </span>
                      {selectedDepartments.length > 0 && (
                        <span className={`text-[10px] text-brand-800`}>
                          الجهة الأولى هي "الجهة الرئيسية"
                        </span>
                      )}
                    </div>

                    {selectedDepartments.length === 0 ? (
                      <div
                        className={`p-3 rounded-xl border border-dashed text-center text-xs bg-brand-50 border-brand-200 text-slate-500`}
                      >
                        لم يتم اختيار جهات شاغلة بعد. اضغط على زر "عرض الهيكل التنظيمي" أعلاه لتحديد التشكيلات الشاغلة.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedDepartments.map((deptName, idx) => {
                          const isPrimary = idx === 0;
                          return (
                            <div
                              key={deptName}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition shadow-xs ${
                                isPrimary
                                  ? 'bg-brand-100 border-brand-200 text-brand-800 font-bold'
                                  : 'bg-card border-slate-300 text-slate-800 hover:border-slate-400'
                              }`}
                            >
                              <Users className={`w-3.5 h-3.5 ${isPrimary ? 'text-brand-700' : 'text-slate-500'}`} />
                              <span className="truncate">{deptName}</span>
                              {isPrimary ? (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-black border bg-brand-100 border-brand-200 text-brand-800`}
                                >
                                  رئيسية
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryDepartment(deptName)}
                                  className={`text-[10px] underline hover:no-underline transition cursor-pointer text-slate-600 hover:text-brand-800`}
                                  title="تعيين هذه الجهة كجهة شاغلة رئيسية للمنشأة"
                                >
                                  جعلها رئيسية
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveDepartment(deptName)}
                                className="text-slate-500 hover:text-rose-600 p-0.5 rounded transition cursor-pointer ml-0.5"
                                title="إزالة الجهة الشاغلة"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    سنة الإنشاء والتشغيل:
                  </label>
                  <input
                    type="number"
                    min={1970}
                    max={2030}
                    value={constructionYear}
                    onChange={(e) => setConstructionYear(Number(e.target.value))}
                    className={`${fieldLook} w-full`}
                  />
                </div>

                {/* رمز الأصل في سجلات أصول الشركة */}
                {(() => {
                  const validation = fixedAssetCode
                    ? validateFixedAssetCodeFormat(fixedAssetCode, assetCodeType)
                    : null;
                  const isUnique = fixedAssetCode
                    ? checkFixedAssetCodeUniqueness(fixedAssetCode, existingUnits, unit.id).isUnique
                    : true;

                  const isContinuous = /^\d+$/.test(fixedAssetCode.trim());
                  const isDotted = fixedAssetCode.includes('.') && /^\d+(\.\d+)+$/.test(fixedAssetCode.trim());

                  return (
                    <div
                      className={`md:col-span-2 p-4 rounded-2xl border space-y-3 bg-indigo-50/50 border-indigo-200`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                          <label className={`font-black text-xs text-slate-800`}>
                            رمز الأصل في سجلات أصول الشركة:
                          </label>
                          <span className="text-[10px] text-brand-700 font-bold bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                            (حقل اختياري / فريد)
                          </span>
                        </div>

                        {fixedAssetCode && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {validation?.isValid && isUnique && (
                              <span
                                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                                  validation.isIdeal
                                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                                    : 'bg-brand-100 text-brand-700 border-brand-200'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>{validation.badgeText} - رمز فريد</span>
                              </span>
                            )}
                            {!validation?.isValid && (
                              <span className="bg-rose-500/20 text-rose-600 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                                {validation?.message}
                              </span>
                            )}
                            {validation?.isValid && !isUnique && (
                              <span className="bg-rose-500/20 text-rose-600 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                                رمز الأصل مكرر ومسجل مسبقاً لمنشأة أخرى!
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            dir="ltr"
                            value={fixedAssetCode}
                            onChange={(e) => {
                              const cleaned = cleanFixedAssetCodeInput(e.target.value);
                              setFixedAssetCode(cleaned);
                            }}
                            placeholder={
                              type === 'caravan'
                                ? '123.1234.123 (أرقام مع فواصل للكرفانات)'
                                : '0123456789 (أرقام بدون فواصل للأبنية)'
                            }
                            className={`${fieldLook} w-full font-mono tracking-wider`}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isContinuous && fixedAssetCode.length >= 6 && (
                            <button
                              type="button"
                              onClick={() => setFixedAssetCode(formatToCaravanDottedCode(fixedAssetCode))}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] px-3 py-2.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                              title="تحويل الأرقام إلى فورمات الكرفانات المنقط (مثال: 123.1234.123)"
                            >
                              <span>تحويل لكرفانات (123.1234.123)</span>
                            </button>
                          )}

                          {isDotted && (
                            <button
                              type="button"
                              onClick={() => setFixedAssetCode(formatToBuildingContinuousCode(fixedAssetCode))}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-3 py-2.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                              title="إزالة الفواصل والنقاط لفورمات الأبنية المتصل (مثال: 0123456789)"
                            >
                              <span>تحويل لأبنية (0123456789)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* صندوق معايير وتنسيق رمز الأصل */}
                      <div
                        className={`p-3 rounded-xl border space-y-2 text-xs bg-card/80 border-indigo-100`}
                      >
                        <p
                          className={`font-bold flex items-center gap-1.5 text-[11px] text-slate-800`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-700 inline-block"></span>
                          <span>المعلومات داخل الحقل تكون بهذا الشكل:</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div
                            className={`flex items-center gap-2 p-2 rounded-lg border bg-slate-50 border-slate-200`}
                          >
                            <span className="font-mono text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                              0123456789
                            </span>
                            <span className={'text-slate-700 font-medium'}>
                              أرقام بدون فواصل للأبنية
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-2 p-2 rounded-lg border bg-slate-50 border-slate-200`}
                          >
                            <span className="font-mono text-cyan-600 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shrink-0">
                              123.1234.123
                            </span>
                            <span className={'text-slate-700 font-medium'}>
                              أرقام مع فواصل للكرفانات
                            </span>
                          </div>
                        </div>
                        <p
                          className={`text-[10px] leading-relaxed pt-0.5 text-slate-500`}
                        >
                          يتم اعتماد هذا الفورمات كتقييم لحالة إدخال رمز الأصل ومطابقته للتنسيق المثالي في سجلات أصول الشركة.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: 3D Shape & Dimensions */}
          {activeTab === 'shape3d' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 bg-brand-50 border-brand-200`}
            >
              <h4 className="text-xs font-bold text-brand-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  <span>أبعاد وهندسة تصميم المبنى الـ 3D</span>
                </span>
                <span className="font-mono text-[11px] bg-brand-100 text-brand-700 px-2.5 py-0.5 rounded-md border border-brand-200">
                  المساحة الكلية = {toArabicDigits(totalAreaSqM)} م²
                </span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    طول الوحدة (أمتار):
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={lengthM}
                    onChange={(e) => handleLengthChange(Number(e.target.value))}
                    className={`${fieldLook} w-full font-mono`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    عرض الوحدة (أمتار):
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={widthM}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className={`${fieldLook} w-full font-mono`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    ارتفاع السقف (أمتار): <span className="text-[10px] text-brand-700 font-normal">(افتراضي 3م)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    step="0.1"
                    value={heightM}
                    onChange={(e) => setHeightM(Number(e.target.value))}
                    className={`${fieldLook} w-full font-mono`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    مساحة الوحدة الكلية (م²):
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    value={totalAreaSqM}
                    onChange={(e) => setTotalAreaSqM(Number(e.target.value))}
                    className={`${fieldLook} w-full font-mono`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    عدد الطوابق الإجمالي:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={floorsCount}
                    onChange={(e) => setFloorsCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                    className={`${fieldLook} w-full`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    حالة جودة وصلاحية المبنى (Condition Grade):
                  </label>
                  <select
                    value={conditionGrade}
                    onChange={(e) => setConditionGrade(e.target.value as ConditionGrade)}
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    {!conditionGrade && <option value="">-- اختر درجة التقييم --</option>}
                    <option value="A">درجة A - ممتاز وشغال بالكامل</option>
                    <option value="B">درجة B - جيد مع ملاحظات خفيفة</option>
                    <option value="C">درجة C - متوسط بحاجة صيانة دورية</option>
                    <option value="D">درجة D - حرج بحاجة صيانة عاجلة</option>
                  </select>
                </div>
              </div>

              {/* Building Shape Selector Options */}
              <div className="space-y-2 pt-2">
                <label className={`block font-bold text-xs text-slate-900`}>
                  شكل وهندسة تصميم المبنى (Building Layout Shape):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {BUILDING_SHAPE_OPTIONS.map((shp) => {
                    const isSelected = buildingShape === shp.id;
                    return (
                      <button
                        key={shp.id}
                        type="button"
                        onClick={() => handleShapeChange(shp.id)}
                        className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-brand-700 text-on-brand border-brand-600 font-bold shadow-md'
                            : 'bg-card border-slate-200 text-slate-800 hover:border-brand-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-base font-black px-1.5 rounded bg-black/10">
                            {shp.symbol}
                          </span>
                          {isSelected && <Check className="w-4 h-4 shrink-0" />}
                        </div>
                        <span className="text-[11px] font-bold truncate mt-1.5">{shp.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Unit Custom Architectural Features & Finishings Section */}
              <div className={`space-y-3 pt-3 border-t border-brand-200`}>
                <label className={`block font-bold text-xs text-slate-900`}>
                  المعالم واللمسات المعمارية المخصصة لهذه الوحدة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className={`block font-bold mb-1 text-slate-700`}>
                      النمط المعماري للواجهة:
                    </label>
                    <select
                      value={archStyle}
                      onChange={(e) => setArchStyle(e.target.value as any)}
                      className={`${fieldLook} w-full cursor-pointer`}
                    >
                      <option value="modern">حديث معاصر (Modern Glass & Steel)</option>
                      <option value="classic">كلاسيكي صناعي (Classic Industrial)</option>
                      <option value="industrial">هيكل حقلي مقوى (Reinforced Structural)</option>
                      <option value="minimalist">تبسيط هادئ (Minimalist Clean)</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 text-slate-700`}>
                      نوع السطح والتصميم (متوافق مع أبعاد الوحدة):
                    </label>
                    <select
                      value={roofType}
                      onChange={(e) => setRoofType(e.target.value as any)}
                      className={`${fieldLook} w-full cursor-pointer`}
                    >
                      <option value="flat">سطح مسطح (سطح مستوي)</option>
                      <option value="flat_parapet">سطح مسطح مع سياج السطح</option>
                      <option value="gabled">سطح مثلث مائل الشكل (مخصص للجملونات)</option>
                      <option value="pitched_tile">سطح من القرميد مائل الشكل</option>
                      <option value="garden">سطح حديقة خضراء (Roof Garden)</option>
                    </select>
                    <p className="text-[11px] font-bold text-brand-700 mt-1 flex items-center gap-1">
                      <span>✓ مساحة السطح المطابقة لأبعاد الوحدة:</span>
                      <span className="font-mono bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                        {toArabicDigits((lengthM && widthM) ? (lengthM * widthM) : Math.round(totalAreaSqM / Math.max(1, floorsCount)))} م²
                      </span>
                    </p>
                  </div>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 p-3 rounded-xl border bg-card border-slate-200`}>
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={showFurniture}
                      onChange={(e) => setShowFurniture(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>إظهار الأثاث الداخلي</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={showWindows}
                      onChange={(e) => setShowWindows(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>نوافذ وواجهات زجاجية</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={showTrees}
                      onChange={(e) => setShowTrees(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>إظهار الأشجار والمحيط</span>
                  </label>
                </div>

                {/* Lighting Control Section */}
                <div className={`p-3.5 rounded-xl border space-y-3 bg-brand-50 border-brand-200`}>
                  <label className={`block font-extrabold text-xs flex items-center gap-1.5 text-brand-800`}>
                    <span>💡 التحكم بشدة وصلابة الإنارة للنموذج الـ 3D:</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1 font-bold">
                        <span className={'text-slate-700'}>الإنارة الداخلية (الغرف والواجهات):</span>
                        <span className="font-mono text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                          {toArabicDigits(interiorLightIntensity.toFixed(1))}×
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8.0"
                        step="0.5"
                        value={interiorLightIntensity}
                        onChange={(e) => setInteriorLightIntensity(parseFloat(e.target.value))}
                        className="w-full accent-brand-700 cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1 font-bold">
                        <span className={'text-slate-700'}>الإنارة الخارجية (الكشافات والمحيط):</span>
                        <span className="font-mono text-sky-600 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                          {toArabicDigits(exteriorLightIntensity.toFixed(1))}×
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8.0"
                        step="0.5"
                        value={exteriorLightIntensity}
                        onChange={(e) => setExteriorLightIntensity(parseFloat(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Location & Coordinates */}
          {activeTab === 'location' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 bg-slate-50/70 border-slate-200`}
            >
              {/* Interactive Location Picker Map Component */}
              <div className="space-y-2">
                <LocationPickerMap
                  lat={lat}
                  lng={lng}
                  onChangeLocation={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                  }}
                  theme={theme}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    خط العرض (GPS Latitude):
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className={`${fieldLook} w-full font-mono`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 text-slate-700`}>
                    خط الطول (GPS Longitude):
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className={`${fieldLook} w-full font-mono`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Rooms */}
          {activeTab === 'rooms' && (
            <div
              className={`p-3.5 sm:p-5 rounded-2xl border space-y-3.5 sm:space-y-4 bg-slate-50/70 border-slate-200`}
            >
              {/* Header: Title, View Switcher & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-brand-700 flex items-center gap-1.5 flex-wrap">
                      <span>تفاصيل وحصر غرف وقاعات المبنى</span>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 border border-brand-200 shrink-0">
                        {toArabicDigits(rooms.length)}
                      </span>
                    </h4>
                    <p className={`text-[10px] sm:text-[11px] truncate text-slate-500`}>
                      إدارة تقسيم الغرف، الرموز القياسية، الطوابق، السعة، والجهات الشاغلة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end shrink-0">
                  {/* View Mode Switcher: Cards vs Table */}
                  <div className={`p-0.5 rounded-xl border flex items-center gap-0.5 shrink-0 bg-slate-100 border-slate-300`}>
                    <button
                      type="button"
                      onClick={() => setRoomsViewMode('cards')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        roomsViewMode === 'cards'
                          ? 'bg-brand-700 text-on-brand font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="عرض الغرف كبطاقات تفاعلية (مثالي للهواتف والتحكم السريع)"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>بطاقات</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomsViewMode('table')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        roomsViewMode === 'table'
                          ? 'bg-brand-700 text-on-brand font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="عرض الغرف كجدول شامل (للشاشات الكبيرة والمكتبية)"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>جدول</span>
                    </button>
                  </div>

                  {/* Action Buttons: Regenerate codes + Add Room */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleRegenerateAllRoomCodes}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer shadow-xs bg-card hover:bg-slate-100 text-slate-700 border-slate-300`}
                      title="إعادة توليد وترقيم كافة الرموز القياسية للغرف دفعة واحدة"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-brand-700" />
                      <span className="hidden xs:inline">ترقيم الرموز</span>
                      <span className="xs:hidden">ترقيم</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddRoom}
                      className="bg-brand-700 hover:bg-brand-800 text-on-brand px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>إضافة غرفة</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics & Quick Summary Bar */}
              {rooms.length > 0 && (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 text-xs">
                  <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center bg-card border-slate-200`}>
                    <span className="text-[10px] text-slate-500 font-bold">إجمالي الغرف</span>
                    <span className="font-black text-brand-700 text-xs sm:text-sm font-mono mt-0.5">
                      {toArabicDigits(rooms.length)}
                    </span>
                  </div>

                  <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center bg-card border-slate-200`}>
                    <span className="text-[10px] text-slate-500 font-bold">المساحة الإجمالية</span>
                    <span className="font-black text-sky-600 text-xs sm:text-sm font-mono mt-0.5">
                      {toArabicDigits(roomStats.totalArea)} م²
                    </span>
                  </div>

                  <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center bg-card border-slate-200`}>
                    <span className="text-[10px] text-slate-500 font-bold">نشطة بالخدمة</span>
                    <span className="font-black text-emerald-600 text-xs sm:text-sm font-mono mt-0.5">
                      {toArabicDigits(roomStats.activeCount)} 🟢
                    </span>
                  </div>

                  <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center bg-card border-slate-200`}>
                    <span className="text-[10px] text-slate-500 font-bold">متوقفة / معطلة</span>
                    <span className="font-black text-rose-600 text-xs sm:text-sm font-mono mt-0.5">
                      {toArabicDigits(roomStats.stoppedCount)} {roomStats.stoppedCount > 0 ? '🔴' : ''}
                    </span>
                  </div>

                  <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center col-span-2 xs:col-span-1 bg-card border-slate-200`}>
                    <span className="text-[10px] text-slate-500 font-bold">شاغرة (فارغة)</span>
                    <span className="font-black text-brand-700 text-xs sm:text-sm font-mono mt-0.5">
                      {toArabicDigits(roomStats.vacantCount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Search & Floor Filters Toolbar */}
              {rooms.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-full sm:max-w-xs">
                    <input
                      type="text"
                      value={roomSearchQuery}
                      onChange={(e) => setRoomSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم، الرمز، أو الجهة..."
                      className={`${fieldLook} w-full pl-7 pr-8`}
                    />
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" />
                    {roomSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setRoomSearchQuery('')}
                        className="absolute left-2.5 top-2 text-slate-500 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Floor Filters (Horizontal scrolling chips) */}
                  {availableFloors.length > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                      <span className="text-[10px] text-slate-500 font-bold shrink-0 ml-1">الطابق:</span>
                      <button
                        type="button"
                        onClick={() => setRoomFloorFilter('all')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer ${
                          roomFloorFilter === 'all'
                            ? 'bg-brand-700 text-on-brand font-black'
                            : 'bg-card text-slate-600 border border-slate-200'
                        }`}
                      >
                        الكل
                      </button>
                      {availableFloors.map((flr) => (
                        <button
                          key={flr}
                          type="button"
                          onClick={() => setRoomFloorFilter(flr)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer ${
                            roomFloorFilter === flr
                              ? 'bg-brand-700 text-on-brand font-black'
                              : 'bg-card text-slate-600 border border-slate-200'
                          }`}
                        >
                          {flr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Warning Banner after re-generating codes */}
              {roomCodeChangeWarning && (
                <div className="p-3 rounded-xl bg-brand-100 border border-brand-200 text-brand-700 flex items-start justify-between gap-2 text-xs font-bold animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-brand-700" />
                    <span>{roomCodeChangeWarning}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoomCodeChangeWarning(null)}
                    className="text-slate-500 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Empty States */}
              {rooms.length === 0 ? (
                <div
                  className={`p-6 sm:p-8 text-center text-xs border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2.5 border-slate-300 text-slate-500 bg-card`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-sm text-slate-800">لا توجد غرف مخصصة لهذا المبنى حالياً</div>
                  <p className="max-w-sm text-slate-500 text-xs">
                    اضغط زر "إضافة غرفة جديدة" للبدء في تقسيم وحصر غرف وقاعات المنشأة.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddRoom}
                    className="mt-1 bg-brand-700 hover:bg-brand-800 text-on-brand px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة غرفة جديدة الآن</span>
                  </button>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div
                  className={`p-6 text-center text-xs border border-dashed rounded-xl border-slate-300 text-slate-500 bg-card`}
                >
                  لا توجد غرف مطابقة لخيارات البحث أو الفلترة الحالية.
                  <button
                    type="button"
                    onClick={() => {
                      setRoomSearchQuery('');
                      setRoomFloorFilter('all');
                    }}
                    className="block mx-auto mt-2 text-brand-700 font-bold hover:underline cursor-pointer"
                  >
                    إعادة ضبط البحث والفلاتر
                  </button>
                </div>
              ) : roomsViewMode === 'cards' ? (
                /* ========================================================================= */
                /* VIEW 1: RESPONSIVE CARDS VIEW (Perfect for Mobile & Great on Desktop)    */
                /* ========================================================================= */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {filteredRooms.map((rm, idx) => {
                    const isStopped = rm.status === 'Stopped' || rm.status === 'متوقفة';
                    const roomComputedCode = (rm.code && rm.code.trim()) ? rm.code.trim() : getStandardRoomCode(unitCode, rm, rooms);
                    const isNonOcc = isNonOccupancyRoom(rm.type);
                    const isCap = isCapacityBasedRoom(rm.type);
                    const isVacant = isRoomVacant(rm.occupiedBy);

                    return (
                      <div
                        key={rm.id}
                        className={`rounded-2xl border p-3 sm:p-4 space-y-2.5 transition shadow-xs hover:shadow-sm relative ${
                          isStopped
                            ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-200'
                            : 'bg-card border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Card Header: Room Index, Standard Code, QR, Regenerate, Status toggle & Delete */}
                        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-200 ">
                          {/* Right side: Code Badge & Actions */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-brand-700 text-on-brand text-[10px] font-black flex items-center justify-center shrink-0">
                              {toArabicDigits(idx + 1)}
                            </span>
                            <span
                              className="font-mono font-black text-[11px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 shrink-0"
                              dir="ltr"
                              title={`رمز الغرفة القياسي: ${roomComputedCode}`}
                            >
                              {roomComputedCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedRoomForQr({ ...rm, code: roomComputedCode })}
                              className="p-1 rounded-lg bg-brand-50 hover:bg-brand-800 text-brand-700 hover:text-on-brand transition cursor-pointer shrink-0"
                              title="استعراض وطباعة بطاقة QR للغرفة"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRegenerateSingleRoomCode(rm.id)}
                              className="p-1 rounded-lg bg-slate-500/10 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer shrink-0"
                              title="إعادة توليد الرمز القياسي لهذه الغرفة"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Left side: Operational Status & Delete */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateRoom(rm.id, 'status', isStopped ? 'Active' : 'Stopped')}
                              className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold border transition cursor-pointer shrink-0 ${
                                isStopped
                                  ? 'bg-rose-500/20 text-rose-600 border-rose-500/40 hover:bg-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/30'
                              }`}
                              title={isStopped ? 'انقر لتفعيل الغرفة' : 'انقر لإيقاف الغرفة'}
                            >
                              {isStopped ? 'متوقفة 🔴' : 'فعالة 🟢'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteRoom(rm.id)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
                              title="حذف هذه الغرفة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Room Name Input */}
                        <div>
                          <label className={`block text-[10px] font-bold mb-1 text-slate-600`}>
                            اسم الغرفة / القاعة:
                          </label>
                          <input
                            type="text"
                            value={rm.name}
                            onChange={(e) => handleUpdateRoom(rm.id, 'name', e.target.value)}
                            placeholder="مثال: مكتب المهندس المقيم / غرفة الاجتماعات"
                            className={`${fieldLook} w-full`}
                          />
                        </div>

                        {/* 3-Field Specifications Grid: Type, Floor, Area */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
                          <div>
                            <label className={`block text-[9.5px] font-bold mb-0.5 truncate text-slate-600`}>
                              نوع الاستخدام:
                            </label>
                            <input
                              type="text"
                              value={rm.type}
                              onChange={(e) => handleUpdateRoom(rm.id, 'type', e.target.value)}
                              className={`${fieldLookSm} w-full`}
                            />
                          </div>

                          <div>
                            <label className={`block text-[9.5px] font-bold mb-0.5 truncate text-slate-600`}>
                              الطابق:
                            </label>
                            <input
                              type="text"
                              value={rm.floor}
                              onChange={(e) => handleUpdateRoom(rm.id, 'floor', e.target.value)}
                              className={`${fieldLookSm} w-full`}
                            />
                          </div>

                          <div>
                            <label className={`block text-[9.5px] font-bold mb-0.5 truncate text-slate-600`}>
                              المساحة (م²):
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={rm.areaSqM}
                              onChange={(e) => handleUpdateRoom(rm.id, 'areaSqM', Number(e.target.value))}
                              className={`${fieldLookSm} w-full`}
                            />
                          </div>
                        </div>

                        {/* Occupancy / Capacity & Department Selection */}
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-200/80 ">
                          {/* Occupancy or Capacity Row */}
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className={`text-[10px] font-bold shrink-0 text-slate-600`}>
                              الإشغال والسعة:
                            </span>

                            {isNonOcc ? (
                              <span className="text-slate-500 text-[10px] px-2 py-0.5 bg-slate-500/10 rounded-lg border border-slate-500/20 truncate">
                                — (غير مخصص للإشغال البشري)
                              </span>
                            ) : isCap ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="السعة"
                                  value={rm.capacity ?? ''}
                                  onChange={(e) => handleUpdateRoom(rm.id, 'capacity', Number(e.target.value) || 0)}
                                  className={`${fieldLookSm} w-14 sm:w-16 text-center`}
                                />
                                <span className="text-[10px] text-sky-600 font-bold whitespace-nowrap">طاقة استيعابية</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="الشاغلين"
                                  value={rm.occupantsCount ?? ''}
                                  onChange={(e) => handleUpdateRoom(rm.id, 'occupantsCount', Number(e.target.value) || 0)}
                                  className={`${fieldLookSm} w-14 sm:w-16 text-center`}
                                />
                                <span className="text-[10px] text-emerald-600 font-bold whitespace-nowrap">شاغل</span>
                                {isVacant && (
                                  <span className="text-[9.5px] text-brand-700 font-bold mr-1">(شاغرة)</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Occupying Department Selector */}
                          <div>
                            <label className={`block text-[10px] font-bold mb-0.5 text-slate-600`}>
                              الجهة الشاغلة المخصصة للغرفة:
                            </label>
                            <select
                              value={rm.occupiedBy ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdateRoom(rm.id, 'occupiedBy', val);
                                if (!val) {
                                  handleUpdateRoom(rm.id, 'status', 'Vacant');
                                } else if (rm.status === 'Vacant') {
                                  handleUpdateRoom(rm.id, 'status', 'Active');
                                }
                              }}
                              className={`${fieldLook} w-full cursor-pointer`}
                            >
                              <option value="">🏢 شاغرة (بدون إشغال / فارغة)</option>
                              {selectedDepartments.length > 0 ? (
                                selectedDepartments.map((deptName, deptIdx) => (
                                  <option key={deptName} value={deptName}>
                                    {deptIdx === 0 ? `★ ${deptName} (الجهة الرئيسية)` : `• ${deptName}`}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>
                                  ⚠️ حدد التشكيلات الشاغلة من تبويب الهوية أولاً
                                </option>
                              )}
                              {rm.occupiedBy && !selectedDepartments.includes(rm.occupiedBy) && (
                                <option value={rm.occupiedBy}>{rm.occupiedBy} (سابق)</option>
                              )}
                            </select>
                          </div>
                        </div>

                        {/* Stopped Reason Box (Only if stopped) */}
                        {isStopped && (
                          <div className={`p-2 rounded-xl border text-xs space-y-1 animate-in fade-in duration-150 bg-rose-100/60 border-rose-200`}>
                            <label className="block text-[10px] font-black text-rose-600 ">
                              سبب التوقف وملاحظات العطل:
                            </label>
                            <input
                              type="text"
                              placeholder="أدخل سبب التوقف أو متطلبات الصيانة..."
                              value={rm.notes || ''}
                              onChange={(e) => handleUpdateRoom(rm.id, 'notes', e.target.value)}
                              className={`${fieldLookSm} w-full`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ========================================================================= */
                /* VIEW 2: HIGH-DENSITY TABLE VIEW (Optimized for Desktop & Scrollable Phone) */
                /* ========================================================================= */
                <div className="space-y-2">
                  {/* Subtle helper banner on mobile */}
                  <div className="md:hidden p-2 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-medium flex items-center justify-between gap-1.5">
                    <span>💡 مرّر الجدول أفقياً لتعديل كافة الأعمدة، أو بدّل إلى وضع "بطاقات" لتحكم أسهل باللمس.</span>
                    <button
                      type="button"
                      onClick={() => setRoomsViewMode('cards')}
                      className="text-xs font-black underline shrink-0 px-1 py-0.5 rounded cursor-pointer"
                    >
                      عرض بطاقات
                    </button>
                  </div>

                  <div
                    className={`overflow-x-auto border rounded-2xl shadow-xs scrollbar-thin border-slate-200 bg-card`}
                  >
                    <table className="w-full text-right text-xs min-w-[850px]">
                      <thead
                        className={`font-black border-b sticky top-0 z-10 bg-slate-100 text-slate-700 border-slate-200`}
                      >
                        <tr>
                          <th className="p-2.5 w-10 text-center">#</th>
                          <th className="p-2.5 min-w-[150px]">اسم الغرفة / القاعة</th>
                          <th className="p-2.5 min-w-[145px]">رمز الغرفة القياسي</th>
                          <th className="p-2.5 w-28">نوع الاستخدام</th>
                          <th className="p-2.5 w-20">الطابق</th>
                          <th className="p-2.5 w-20">المساحة (م²)</th>
                          <th className="p-2.5 w-32">عدد الشاغلين</th>
                          <th className="p-2.5 min-w-[170px]">الجهة الشاغلة</th>
                          <th className="p-2.5 w-28">الحالة</th>
                          <th className="p-2.5 min-w-[140px]">سبب التوقف / ملاحظات</th>
                          <th className="p-2.5 text-center w-12">حذف</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y divide-slate-200`}>
                        {filteredRooms.map((rm, idx) => {
                          const isStopped = rm.status === 'Stopped' || rm.status === 'متوقفة';
                          const roomComputedCode = (rm.code && rm.code.trim()) ? rm.code.trim() : getStandardRoomCode(unitCode, rm, rooms);
                          const isNonOcc = isNonOccupancyRoom(rm.type);
                          const isCap = isCapacityBasedRoom(rm.type);
                          const isVacant = isRoomVacant(rm.occupiedBy);

                          return (
                            <tr
                              key={rm.id}
                              className={`transition ${
                                isStopped
                                  ? 'bg-rose-50/60'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="p-2 text-center font-bold text-slate-500 font-mono text-[11px]">
                                {toArabicDigits(idx + 1)}
                              </td>

                              <td className="p-2">
                                <input
                                  type="text"
                                  value={rm.name}
                                  onChange={(e) => handleUpdateRoom(rm.id, 'name', e.target.value)}
                                  className={`${fieldLookSm} w-full`}
                                />
                              </td>

                              <td className="p-2">
                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                  <span className="font-mono font-black text-[11px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200 shrink-0" dir="ltr">
                                    {roomComputedCode}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRoomForQr({ ...rm, code: roomComputedCode })}
                                    className="p-1 rounded-lg bg-brand-50 hover:bg-brand-800 text-brand-700 hover:text-on-brand transition cursor-pointer shrink-0"
                                    title="استعراض وطباعة بطاقة QR للغرفة"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateSingleRoomCode(rm.id)}
                                    className="p-1 rounded-lg bg-slate-500/10 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer shrink-0"
                                    title="إعادة توليد الرمز القياسي لهذه الغرفة"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                              <td className="p-2">
                                <input
                                  type="text"
                                  value={rm.type}
                                  onChange={(e) => handleUpdateRoom(rm.id, 'type', e.target.value)}
                                  className={`${fieldLookSm} w-full`}
                                />
                              </td>

                              <td className="p-2">
                                <input
                                  type="text"
                                  value={rm.floor}
                                  onChange={(e) => handleUpdateRoom(rm.id, 'floor', e.target.value)}
                                  className={`${fieldLookSm} w-full`}
                                />
                              </td>

                              <td className="p-2">
                                <input
                                  type="number"
                                  value={rm.areaSqM}
                                  onChange={(e) => handleUpdateRoom(rm.id, 'areaSqM', Number(e.target.value))}
                                  className={`${fieldLookSm} w-full`}
                                />
                              </td>

                              <td className="p-2">
                                {isNonOcc ? (
                                  <span className="text-slate-500 text-[11px] font-normal px-2 py-1 bg-slate-500/5 rounded-lg border border-slate-500/10 block text-center">
                                    — (غير مخصص)
                                  </span>
                                ) : isCap ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="السعة"
                                      value={rm.capacity ?? ''}
                                      onChange={(e) => handleUpdateRoom(rm.id, 'capacity', Number(e.target.value) || 0)}
                                      className={`${fieldLookSm} w-full`}
                                    />
                                    <span className="text-[10px] text-sky-600 font-semibold whitespace-nowrap">طاقة</span>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        placeholder="شاغلين"
                                        value={rm.occupantsCount ?? ''}
                                        onChange={(e) => handleUpdateRoom(rm.id, 'occupantsCount', Number(e.target.value) || 0)}
                                        className={`${fieldLookSm} w-full`}
                                      />
                                      <span className="text-[10px] text-emerald-600 font-semibold whitespace-nowrap">شاغل</span>
                                    </div>
                                    {isVacant && (
                                      <span className="text-[9px] text-brand-700 block">شاغرة</span>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="p-2">
                                <select
                                  value={rm.occupiedBy ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateRoom(rm.id, 'occupiedBy', val);
                                    if (!val) {
                                      handleUpdateRoom(rm.id, 'status', 'Vacant');
                                    } else if (rm.status === 'Vacant') {
                                      handleUpdateRoom(rm.id, 'status', 'Active');
                                    }
                                  }}
                                  className={`${fieldLookSm} w-full cursor-pointer`}
                                >
                                  <option value="">🏢 شاغرة (بدون إشغال / فارغة)</option>
                                  {selectedDepartments.length > 0 ? (
                                    selectedDepartments.map((deptName, deptIdx) => (
                                      <option key={deptName} value={deptName}>
                                        {deptIdx === 0 ? `★ ${deptName} (الجهة الرئيسية)` : `• ${deptName}`}
                                      </option>
                                    ))
                                  ) : (
                                    <option value="" disabled>
                                      ⚠️ يرجى تحديد الجهات الشاغلة من تبويب الهوية أولاً
                                    </option>
                                  )}
                                  {rm.occupiedBy && !selectedDepartments.includes(rm.occupiedBy) && (
                                    <option value={rm.occupiedBy}>{rm.occupiedBy} (سابق)</option>
                                  )}
                                </select>
                              </td>

                              <td className="p-2">
                                <select
                                  value={isStopped ? 'Stopped' : 'Active'}
                                  onChange={(e) => handleUpdateRoom(rm.id, 'status', e.target.value)}
                                  className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer transition ${
                                    isStopped
                                      ? 'bg-rose-500/20 text-rose-600 border-rose-500/40'
                                      : 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
                                  }`}
                                >
                                  <option value="Active">فعالة 🟢</option>
                                  <option value="Stopped">متوقفة 🔴</option>
                                </select>
                              </td>

                              <td className="p-2">
                                {isStopped ? (
                                  <input
                                    type="text"
                                    placeholder="أدخل سبب التوقف..."
                                    value={rm.notes || ''}
                                    onChange={(e) => handleUpdateRoom(rm.id, 'notes', e.target.value)}
                                    className={`${fieldLookSm} w-full`}
                                  />
                                ) : (
                                  <span className={`text-[11px] font-semibold italic text-slate-400`}>
                                    نشطة (تحذف ملاحظة التوقف تلقائياً)
                                  </span>
                                )}
                              </td>

                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRoom(rm.id)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-500/10 rounded transition cursor-pointer"
                                  title="حذف الغرفة"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Advice for mobile users while on table view */}
                  <div className="sm:hidden text-center text-[10.5px] text-brand-700 flex items-center justify-center gap-1">
                    <span>💡 نصيحة: وضع</span>
                    <button
                      type="button"
                      onClick={() => setRoomsViewMode('cards')}
                      className="font-bold underline cursor-pointer"
                    >
                      البطاقات
                    </button>
                    <span>أكثر راحة وملاءمة لشاشات الهواتف.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Attachments & Archives */}
          {activeTab === 'docs' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 bg-slate-50/70 border-slate-200`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div>
                  <h4 className="text-sm font-bold text-brand-700 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    <span>المرفقات والوثائق الهندسية والأرشيف الرقمي للوحدة</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    إدارة واستعراض وإضافة وحذف المخططات الهندسية ومستندات الاستلام والوثائق الرسمية.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label
                    htmlFor="edit-modal-file-input"
                    className="bg-brand-700 hover:bg-brand-800 text-on-brand px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
                  >
                    <Upload className="w-4 h-4" />
                    <span>رفع ملفات سريعة</span>
                  </label>
                  <input
                    id="edit-modal-file-input"
                    type="file"
                    multiple
                    onChange={handleDirectFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => setShowAddAttachmentModal(true)}
                    className="bg-slate-100 hover:bg-slate-100 text-brand-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة وثيقة يدوياً</span>
                  </button>
                </div>
              </div>

              {/* Drag & Drop Quick Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processFilesAndAdd(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => document.getElementById('edit-modal-file-input')?.click()}
                className={`p-4 border-2 border-dashed rounded-2xl text-center space-y-1.5 cursor-pointer transition hover:border-brand-200 border-slate-300 bg-slate-100/60 hover:bg-slate-200/50`}
              >
                <Upload className="w-7 h-7 text-brand-700 mx-auto opacity-80" />
                <p className={`text-xs font-bold text-slate-800`}>
                  اسحب وأسقط المخططات الهندسية أو اضغط لتصفح جهازك (PDF, DWG, PNG, DOC, ZIP)
                </p>
                <p className="text-[11px] text-slate-500">
                  عدد الوثائق الأرشيفية المرفقة حالياً: <strong className="text-brand-700 font-mono text-xs">{toArabicDigits(attachments.length)}</strong> وثيقة
                </p>
              </div>

              {/* Attachments List */}
              {attachments.length === 0 ? (
                <div className={`p-8 text-center text-xs border border-dashed rounded-2xl border-slate-300 text-slate-500`}>
                  لا توجد مرفقات أو وثائق مضافة لهذه المنشأة حالياً. اضغط "رفع ملفات" أو "إضافة وثيقة" للبدء.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold px-1 text-slate-500">
                    <span>سجل الوثائق والمرفقات المعتمدة ({toArabicDigits(attachments.length)}):</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition bg-card border-slate-200 hover:border-brand-200`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2.5 bg-card/80 border border-slate-200 rounded-xl shrink-0">
                            {getFileIcon(att.type)}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-xs truncate text-slate-900`}>
                                {att.name}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                                {att.category}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 leading-relaxed truncate">
                              {att.notes || 'لا توجد ملاحظات إضافية'}
                            </p>

                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                              <span>تاريخ الإرفاق: {toArabicDigits(att.uploadDate)}</span>
                              <span>•</span>
                              <span>الحجم: {att.sizeMB ? `${toArabicDigits(att.sizeMB)} MB` : 'غير محدد'}</span>
                              <span>•</span>
                              <span className="uppercase text-brand-700">{att.type}</span>
                            </div>
                          </div>
                        </div>

                        {/* Document Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="p-2 bg-brand-50 text-brand-700 hover:bg-brand-800 hover:text-on-brand rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="معاينة واستعراض الوثيقة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingAttachment({ ...att })}
                            className="p-2 bg-slate-100 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="تعديل اسم أو بيانات المرفق"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="حذف هذا المرفق نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          </div>

          {/* Actions Footer - Docked at Bottom of Modal */}
          <div
            className={`px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-t shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 bg-slate-50 border-slate-200 ${isPage ? 'sticky bottom-0 z-10 rounded-b-2xl' : ''}`}
          >
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 order-2 sm:order-1 text-center sm:text-right">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{isCreate ? 'تُسجَّل الإضافة في سجل النشاطات' : 'تُسجَّل التعديلات في سجل النشاطات'}</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
              <Button type="submit" variant="primary" icon={Save} className="flex-1 sm:flex-initial">
                {isCreate ? 'حفظ الوحدة وتوليد رمزها' : 'حفظ التعديلات'}
              </Button>
              <Button onClick={onClose} className="flex-1 sm:flex-initial">
                إلغاء
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* MODAL 1: Add New Attachment */}
      <Modal
        open={!!(showAddAttachmentModal)}
        staticBackdrop
        icon={Paperclip}
        title="إضافة وثيقة / مرفق جديد للوحدة"
        onClose={() => setShowAddAttachmentModal(false)}
        footer={
          <>
            <Button variant="primary" icon={Check} onClick={handleSaveNewAttachment} disabled={!newAttName.trim()}>
              حفظ الوثيقة
            </Button>
            <Button onClick={() => setShowAddAttachmentModal(false)}>إلغاء</Button>
          </>
        }
      >
        {showAddAttachmentModal && (
          <>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-600">اختيار الملف (معاينة وتحميل مباشر):</label>
                <input
                  type="file"
                  onChange={handleModalFileSelected}
                  className={`w-full text-xs p-2 rounded-xl border cursor-pointer bg-slate-50 border-slate-300 text-slate-800`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-600">اسم الوثيقة / المستند:</label>
                <input
                  type="text"
                  value={newAttName}
                  onChange={(e) => setNewAttName(e.target.value)}
                  placeholder="مثال: المخطط الهندسي لشبكة الإطفاء.pdf"
                  className={`${fieldLook} w-full`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-600">التصنيف الأرشيفي:</label>
                  <select
                    value={newAttCategory}
                    onChange={(e) => setNewAttCategory(e.target.value)}
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    <option value="مخططات هندسية">مخططات هندسية</option>
                    <option value="محاضر استلام">محاضر استلام</option>
                    <option value="شهادات فحص وسلامة">شهادات فحص وسلامة</option>
                    <option value="وثائق ملكية وتخصيص">وثائق ملكية وتخصيص</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-600">نوع الملف:</label>
                  <select
                    value={newAttType}
                    onChange={(e) => setNewAttType(e.target.value)}
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="dwg">AutoCAD (DWG)</option>
                    <option value="image">صورة (PNG/JPG)</option>
                    <option value="doc">مستند Word (DOCX)</option>
                    <option value="archive">أرشيف مضغوط (ZIP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-600">حجم الملف المقدر (MB):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newAttSizeMB}
                  onChange={(e) => setNewAttSizeMB(Number(e.target.value))}
                  className={`${fieldLook} w-full`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-600">ملاحظات إضافية:</label>
                <textarea
                  value={newAttNotes}
                  onChange={(e) => setNewAttNotes(e.target.value)}
                  placeholder="ملاحظات حول المرفق أو أرقام الصادر والوارد..."
                  rows={2}
                  className={`${fieldLook} w-full h-auto min-h-20`}
                />
              </div>
            </div>

            
          </>
        )}
      </Modal>

      {/* MODAL 2: Edit Attachment */}
      <Modal
        open={!!(editingAttachment)}
        staticBackdrop
        icon={Edit3}
        title="تعديل بيانات المرفق الأرشيفي"
        onClose={() => setEditingAttachment(null)}
        footer={
          <>
            <Button variant="primary" icon={Check} onClick={handleSaveEditAttachment}>
              تعديل وحفظ
            </Button>
            <Button onClick={() => setEditingAttachment(null)}>إلغاء</Button>
          </>
        }
      >
        {editingAttachment && (
          <>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-600">اسم الوثيقة / المستند:</label>
                <input
                  type="text"
                  value={editingAttachment.name}
                  onChange={(e) => setEditingAttachment({ ...editingAttachment, name: e.target.value })}
                  className={`${fieldLook} w-full`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-600">التصنيف الأرشيفي:</label>
                  <select
                    value={editingAttachment.category}
                    onChange={(e) => setEditingAttachment({ ...editingAttachment, category: e.target.value })}
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    <option value="مخططات هندسية">مخططات هندسية</option>
                    <option value="محاضر استلام">محاضر استلام</option>
                    <option value="شهادات فحص وسلامة">شهادات فحص وسلامة</option>
                    <option value="وثائق ملكية وتخصيص">وثائق ملكية وتخصيص</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-600">نوع الملف:</label>
                  <select
                    value={editingAttachment.type}
                    onChange={(e) => setEditingAttachment({ ...editingAttachment, type: e.target.value })}
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="dwg">AutoCAD (DWG)</option>
                    <option value="image">صورة (PNG/JPG)</option>
                    <option value="doc">مستند Word (DOCX)</option>
                    <option value="archive">أرشيف مضغوط (ZIP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-600">تاريخ الإرفاق:</label>
                <input
                  type="date"
                  value={editingAttachment.uploadDate}
                  onChange={(e) => setEditingAttachment({ ...editingAttachment, uploadDate: e.target.value })}
                  className={`${fieldLook} w-full`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-600">ملاحظات وتفاصيل إضافية:</label>
                <textarea
                  value={editingAttachment.notes || ''}
                  onChange={(e) => setEditingAttachment({ ...editingAttachment, notes: e.target.value })}
                  rows={2}
                  className={`${fieldLook} w-full h-auto min-h-20`}
                />
              </div>
            </div>

            
          </>
        )}
      </Modal>

      <Modal
        open={showAddGovModal || showAddFieldModal || showAddUnitTypeModal}
        staticBackdrop
        icon={Plus}
        title={showAddGovModal ? 'إضافة محافظة جديدة' : showAddFieldModal ? `إضافة حقل جديد في ${governorate || 'المحافظة'}` : 'إضافة نوع وحدة جديد'}
        onClose={closeRefModal}
        footer={
          <>
            <Button variant="primary" icon={Save} onClick={handleSaveNewRef} disabled={!newRefName.trim() || !newRefCode.trim()}>
              حفظ واختيار
            </Button>
            <Button onClick={closeRefModal}>إلغاء</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field label="الاسم" required>
            <Input value={newRefName} onChange={(e) => setNewRefName(e.target.value)} />
          </Field>
          <Field label="الرمز" required hint="أحرف إنجليزية وأرقام، يدخل في رمز الوحدة (مثال: KIR)">
            <Input value={newRefCode} onChange={(e) => setNewRefCode(e.target.value)} dir="ltr" className="font-mono uppercase" maxLength={8} />
          </Field>
        </div>
      </Modal>

      {/* MODAL 3: Preview Attachment */}
      {previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment}
          unitCode={unitCode}
          theme={theme}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
      {/* Quick Add Org Entity Modal */}
      {showQuickAddOrgModal && (
        <QuickAddOrgEntityModal
          isOpen={showQuickAddOrgModal}
          onClose={() => setShowQuickAddOrgModal(false)}
          isLight={isLight}
          orgEntities={orgEntities}
          onAddOrgEntity={onAddOrgEntity || (() => {})}
          onSelectNewlyCreated={(newDeptName) => {
            setDepartment(newDeptName);
          }}
        />
      )}
      {/* Room QR Card Modal */}
      {selectedRoomForQr && (
        <RoomQrCardModal
          unit={unit}
          room={selectedRoomForQr}
          allRooms={rooms}
          theme={theme}
          onClose={() => setSelectedRoomForQr(null)}
        />
      )}

      {/* Org Chart Modal for Occupant Entities Selection */}
      {showOrgChartModal && (
        <OrgChartModal
          isOpen={showOrgChartModal}
          onClose={() => setShowOrgChartModal(false)}
          orgEntities={orgEntities}
          units={existingUnits}
          isParentLight={isLight}
          selectionMode={true}
          initialSelectedEntities={selectedDepartments}
          onSaveSelection={handleSaveSelectionFromOrgChart}
        />
      )}
    </div>
  );
};

