import React, { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Building2,
  MapPin,
  Maximize2,
  Users,
  CheckCircle2,
  FileCheck,
  Paperclip,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Plus,
  X,
  FileText,
  Trash2,
  Compass,
  Check,
  Layers,
  ArrowRight,
  Eye,
  Download,
  Film,
  Image,
  QrCode,
  Printer,
  Network,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Search,
} from 'lucide-react';
import {
  UnitAsset,
  UnitType,
  UnitAttachment,
  ConditionGrade,
  GovernorateRef,
  OilfieldRef,
  ReferenceUnitType,
  EquipmentTypeRef,
  OrgEntity,
  Room,
} from '../types';
import { QuickAddOrgEntityModal } from './QuickAddOrgEntityModal';
import { OrgChartModal } from './OrgChartModal';
import { LocationPickerMap } from './LocationPickerMap';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { RoomQrCardModal } from './RoomQrCardModal';
import { toArabicDigits, getServerDateFormatted, getServerIsoDateOnly } from '../utils/arabicUtils';
import {
  cleanFixedAssetCodeInput,
  validateFixedAssetCodeFormat,
  checkFixedAssetCodeUniqueness,
  formatToCaravanDottedCode,
  formatToBuildingContinuousCode,
} from '../utils/assetCodeUtils';
import {
  generateUnitCode,
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

export interface BuildingShapeOption {
  id: string;
  nameAr: string;
  symbol: string;
  category: string;
  desc: string;
}

export const BUILDING_SHAPE_OPTIONS: BuildingShapeOption[] = [
  { id: 'مستطيل', nameAr: 'مستطيل (Rectangular)', symbol: '▭', category: 'الأشكال الأساسية', desc: 'الشكل الهيكلي القياسي الأكثر شيوعاً للمباني والكرفانات والورش' },
  { id: 'مربع', nameAr: 'مربع (Square)', symbol: '▢', category: 'الأشكال الأساسية', desc: 'تصميم متناظر الأبعاد للوحدات المربعة والمخازن ومراكز المراقبة' },
  { id: 'دائري', nameAr: 'دائري / أسطواني (Circular)', symbol: '◯', category: 'الأشكال الأساسية', desc: 'خزانات النفط، أبراج المراقبة والمياه، والمباني الدائرية' },
  { id: 'مثلث', nameAr: 'مثلث / منشور (Triangular)', symbol: '△', category: 'الأشكال الأساسية', desc: 'مباني زوايا المفارق والمساحات المثلثية الميدانية' },
  { id: 'L-Shape', nameAr: 'على شكل حرف L (L-Shape)', symbol: '└', category: 'أبنية حرفية/هندسية', desc: 'أجنحة إدارية وسكنية متقاطعة بزاوية قائمة' },
  { id: 'U-Shape', nameAr: 'على شكل حرف U (U-Shape)', symbol: '⊔', category: 'أبنية حرفية/هندسية', desc: 'مبانٍ إدارية وسكنية تحيط بفناء مفتوح من ثلاث جهات' },
  { id: 'T-Shape', nameAr: 'على شكل حرف T (T-Shape)', symbol: '┬', category: 'أبنية حرفية/هندسية', desc: 'جناح تشغيلي رئيسي مع مدخل أو جناح عمودي' },
  { id: 'H-Shape', nameAr: 'على شكل حرف H (H-Shape)', symbol: '⦚', category: 'أبنية حرفية/هندسية', desc: 'جناحين متوازيين يربطهما ممر رئيسي وسطي' },
  { id: 'C-Shape', nameAr: 'على شكل حرف C (C-Shape)', symbol: '⊂', category: 'أبنية حرفية/هندسية', desc: 'مبنى قوسي أو على شكل حذوة حصان مع مدخل مقعر' },
  { id: 'E-Shape', nameAr: 'على شكل حرف E / F (E-Shape)', symbol: 'ヨ', category: 'أبنية حرفية/هندسية', desc: 'مجمعات كبيرة بأجنحة ممتدة متوازية متعددة' },
  { id: 'Cross-Shape', nameAr: 'على شكل صليب / زائد (+)', symbol: '+', category: 'تصاميم متخصصة', desc: 'مراكز الطوارئ الإسعافية، مستشفيات وغرف التحكم والسيطرة' },
  { id: 'Courtyard', nameAr: 'فناء داخلي مفرغ (Courtyard)', symbol: '⧈', category: 'تصاميم متخصصة', desc: 'مبنى مغلق ذو صحن مكشوف أو فناء وسطي مفرغ' },
  { id: 'Octagonal', nameAr: 'ثماني الأضلاع / مضلع (Octagonal)', symbol: '⬡', category: 'تصاميم متخصصة', desc: 'أبراج المراقبة، غرف السيطرة الميدانية والسيطرات' },
  { id: 'Dome', nameAr: 'قُبّي / كروي (Dome / Geodesic)', symbol: '⌒', category: 'تصاميم متخصصة', desc: 'قبات ساندويتش بانل، خزانات كروية، ومستودعات مقببة' },
  { id: 'Irregular', nameAr: 'شكل مركب / غير منتظم (Irregular)', symbol: '⬟', category: 'تصاميم مخصصة', desc: 'تصميم هندسي مخصص غير منتظم أو معقد مع أضلاع متعددة' },
];

export const getShapeFactor = (shape: string): number => {
  if (shape === 'مستطيل' || shape === 'مربع') return 1.0;
  if (shape === 'دائري' || shape === 'Dome') return 0.7854; // π/4
  if (shape === 'مثلث') return 0.5;
  if (shape === 'L-Shape' || shape === 'T-Shape' || shape === 'C-Shape') return 0.75;
  if (shape === 'U-Shape' || shape === 'E-Shape' || shape === 'Courtyard') return 0.70;
  if (shape === 'H-Shape') return 0.80;
  if (shape === 'Cross-Shape') return 0.60;
  if (shape === 'Octagonal') return 0.828;
  return 0.85; // Irregular
};

export const calculateUnitArea = (length: number, width: number, shape: string): number => {
  const factor = getShapeFactor(shape);
  return Math.round(length * width * factor * 10) / 10;
};

interface NewUnitWizardProps {
  governorates: GovernorateRef[];
  oilfields: OilfieldRef[];
  unitTypes: ReferenceUnitType[];
  equipmentTypes: EquipmentTypeRef[];
  existingUnits?: UnitAsset[];
  orgEntities?: OrgEntity[];
  onAddOrgEntity?: (newEntity: OrgEntity) => void;
  onAddUnit: (unit: UnitAsset) => void;
  onAddGovernorate?: (gov: GovernorateRef) => void;
  onAddOilfield?: (field: OilfieldRef) => void;
  onAddUnitType?: (type: ReferenceUnitType) => void;
  onAddEquipmentType?: (eq: EquipmentTypeRef) => void;
  onCancel: () => void;
  theme?: 'dark' | 'light';
}

interface AttachedFileItem {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadDate: string;
  url?: string;
}

export const NewUnitWizard: React.FC<NewUnitWizardProps> = ({
  governorates,
  oilfields,
  unitTypes,
  equipmentTypes,
  existingUnits = [],
  orgEntities = [],
  onAddOrgEntity,
  onAddUnit,
  onAddGovernorate,
  onAddOilfield,
  onAddUnitType,
  onAddEquipmentType,
  onCancel,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  // Form State - Identity & Code
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [fixedAssetCode, setFixedAssetCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [constructionYear, setConstructionYear] = useState<number | ''>('');

  // Form State - Location & GPS
  const [governorateId, setGovernorateId] = useState<string>('');
  const [fieldId, setFieldId] = useState<string>('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');

  // Form State - Area, Dimensions & Allocation
  const [lengthM, setLengthM] = useState<number | ''>('');
  const [widthM, setWidthM] = useState<number | ''>('');
  const [heightM, setHeightM] = useState<number | ''>('');
  const [areaSqM, setAreaSqM] = useState<number | ''>('');
  const [buildingShape, setBuildingShape] = useState<string>('');
  const [roofType, setRoofType] = useState<'flat' | 'flat_parapet' | 'gabled' | 'pitched_tile' | 'garden' | ''>('');
  const [floorsCount, setFloorsCount] = useState<number | ''>('');
  const [department, setDepartment] = useState<string>('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
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

  // Dimension & Geometry Auto-Calculation Handlers
  const handleLengthChange = (valStr: string) => {
    if (valStr === '') {
      setLengthM('');
      setAreaSqM('');
      return;
    }
    const val = Math.max(0, Number(valStr));
    setLengthM(val);
    const w = typeof widthM === 'number' ? widthM : 0;
    setAreaSqM(calculateUnitArea(val, w, buildingShape || 'مستطيل'));
  };

  const handleWidthChange = (valStr: string) => {
    if (valStr === '') {
      setWidthM('');
      setAreaSqM('');
      return;
    }
    const val = Math.max(0, Number(valStr));
    setWidthM(val);
    const l = typeof lengthM === 'number' ? lengthM : 0;
    setAreaSqM(calculateUnitArea(l, val, buildingShape || 'مستطيل'));
  };

  const handleShapeChange = (newShape: string) => {
    setBuildingShape(newShape);
    const l = typeof lengthM === 'number' ? lengthM : 0;
    const w = typeof widthM === 'number' ? widthM : 0;
    if (l > 0 && w > 0) {
      setAreaSqM(calculateUnitArea(l, w, newShape));
    }
  };

  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showOrgChartModal, setShowOrgChartModal] = useState(false);

  const handleSaveSelectionFromOrgChart = (selectedNames: string[]) => {
    setSelectedDepartments(selectedNames);
    setDepartment(selectedNames.join(' ، '));
  };

  // =========================================================================
  // ROOMS & HALLS DETAILED STATE (Full parity with EditUnitModal)
  // =========================================================================
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsViewMode, setRoomsViewMode] = useState<'cards' | 'table'>('cards');
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [roomFloorFilter, setRoomFloorFilter] = useState<string>('all');
  const [selectedRoomForQr, setSelectedRoomForQr] = useState<Room | null>(null);
  const [roomCodeChangeWarning, setRoomCodeChangeWarning] = useState<string | null>(null);

  // Derived available floors for filter chips & selectors
  const availableFloors = useMemo(() => {
    const set = new Set<string>();
    const fCount = typeof floorsCount === 'number' && floorsCount > 0 ? floorsCount : 1;
    for (let i = 1; i <= fCount; i++) {
      set.add(`الطابق ${i}`);
    }
    rooms.forEach((r) => {
      if (r.floor && r.floor.trim()) set.add(r.floor.trim());
    });
    return Array.from(set);
  }, [floorsCount, rooms]);

  // Filtered rooms for display
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (roomFloorFilter !== 'all' && r.floor?.trim() !== roomFloorFilter) return false;
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.trim().toLowerCase();
        const code = (r.code || '').toLowerCase();
        const name = (r.name || '').toLowerCase();
        const type = (r.type || '').toLowerCase();
        const occupiedBy = (r.occupiedBy || '').toLowerCase();
        const floor = (r.floor || '').toLowerCase();
        return (
          code.includes(q) ||
          name.includes(q) ||
          type.includes(q) ||
          occupiedBy.includes(q) ||
          floor.includes(q)
        );
      }
      return true;
    });
  }, [rooms, roomSearchQuery, roomFloorFilter]);

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

            const activePrefix = code || 'UNIT';

            // When moving to a new floor, recalculate sequence number correctly for that floor
            if (key === 'floor' && newFloorNum !== oldFloorNum) {
              const sameFloorRooms = prev.filter(
                (r) => r.id !== roomId && extractFloorNumber(r.floor) === newFloorNum
              );
              const newSeqInFloor = sameFloorRooms.length + 1;
              const newFullSeq = calculateRoomSequenceNumber(newFloorNum, newSeqInFloor);
              updated.sequenceNumber = newFullSeq;
              updated.code = generateRoomCode(activePrefix, newFloorNum, typeCode, newFullSeq, true);
              setRoomCodeChangeWarning(
                `تنبيه: تم تغيير طابق الغرفة "${rm.name}" من (${rm.floor}) إلى (${value}). تم تحديث الرمز القياسي للغرفة تلقائياً إلى [${updated.code}].`
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
              updated.code = generateRoomCode(activePrefix, currentFloorNum, typeCode, fullSeq, true);
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
    const activePrefix = code || 'UNIT';
    const newCode = generateRoomCode(activePrefix, floorNum, typeCode, newFullSeq, true);
    setRooms((prev) =>
      prev.map((rm) =>
        rm.id === roomId
          ? { ...rm, sequenceNumber: newFullSeq, roomTypeCode: typeCode, code: newCode }
          : rm
      )
    );
    setRoomCodeChangeWarning(
      `تمت إعادة توليد الرمز القياسي للغرفة "${targetRoom.name}" إلى [${newCode}].`
    );
  };

  const handleRegenerateAllRoomCodes = () => {
    const activePrefix = code || 'UNIT';
    const updated = normalizeUnitRoomsSequence(activePrefix, rooms);
    setRooms(updated);
    setRoomCodeChangeWarning('تمت إعادة ترقيم وتوليد جميع رموز الغرف القياسية بنجاح.');
  };

  const handleDeleteRoom = (roomId: string) => {
    setRooms((prev) => prev.filter((rm) => rm.id !== roomId));
  };

  const handleAddRoom = (floorNumParam?: number) => {
    const fNum = floorNumParam || (typeof floorsCount === 'number' && floorsCount > 0 ? 1 : 1);
    const sameFloorRooms = rooms.filter((r) => extractFloorNumber(r.floor) === fNum);
    const nextSeqInFloor = sameFloorRooms.length + 1;
    const fullSeq = calculateRoomSequenceNumber(fNum, nextSeqInFloor);
    const typeCode = getRoomTypeCode('مكتب إداري');
    const activePrefix = code || 'UNIT';
    const roomCode = generateRoomCode(activePrefix, fNum, typeCode, fullSeq, true);

    const newRm: Room = {
      id: `RM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `غرفة مخصصة جديدة ${rooms.length + 1}`,
      type: 'مكتب إداري',
      floor: `الطابق ${fNum}`,
      areaSqM: 25,
      status: 'Active',
      occupiedBy: selectedDepartments[0] || department || '',
      code: roomCode,
      roomTypeCode: typeCode,
      sequenceNumber: fullSeq,
      occupantsCount: 2,
      capacity: 10,
      notes: '',
    };
    setRooms((prev) => [...prev, newRm]);
  };

  const handleGenerateRecommendedRooms = () => {
    const fCount = typeof floorsCount === 'number' && floorsCount > 0 ? floorsCount : 1;
    const primaryDept = selectedDepartments[0] || department || '';
    const activePrefix = code || 'UNIT';
    const newRooms: Room[] = [];

    for (let f = 1; f <= fCount; f++) {
      const floorLabel = `الطابق ${f}`;
      const floorTemplates = [
        { name: f === 1 ? 'مكتب الإدارة الرئيسي' : `مكتب إداري ${f}01`, type: 'مكتب إداري', area: 28, occ: 2, cap: 4, occBy: primaryDept },
        { name: f === 1 ? 'قاعة اجتماعات كبرى' : `قاعة اجتماعات ${f}02`, type: 'قاعة اجتماعات', area: 42, occ: 0, cap: 14, occBy: primaryDept },
        { name: `مكتب شعبة العمليات ${f}03`, type: 'مكتب إداري', area: 24, occ: 2, cap: 4, occBy: selectedDepartments[1] || primaryDept },
        { name: `دورة مياه صحية ${f}04`, type: 'دورة مياه صحية', area: 12, occ: 0, cap: 3, occBy: '' },
        { name: `غرفة سيرفرات وخدمات ${f}05`, type: 'غرفة معدات وسيرفرات', area: 18, occ: 0, cap: 2, occBy: '' },
      ];

      floorTemplates.forEach((tmpl, idx) => {
        const seqInFloor = idx + 1;
        const fullSeq = calculateRoomSequenceNumber(f, seqInFloor);
        const typeCode = getRoomTypeCode(tmpl.type);
        const roomCode = generateRoomCode(activePrefix, f, typeCode, fullSeq, true);

        newRooms.push({
          id: `RM-F${f}-${fullSeq}-${Date.now().toString(36)}-${idx}`,
          name: tmpl.name,
          type: tmpl.type,
          roomTypeCode: typeCode,
          sequenceNumber: fullSeq,
          floor: floorLabel,
          areaSqM: tmpl.area,
          status: 'Active',
          occupiedBy: tmpl.occBy,
          occupantsCount: tmpl.occ,
          capacity: tmpl.cap,
          code: roomCode,
          notes: '',
        });
      });
    }

    setRooms(newRooms);
    setRoomCodeChangeWarning(`تم توليد ${newRooms.length} غرفة مقترحة موزعة على ${fCount} طوابق بنجاح.`);
  };

  // Seed default rooms when floors count is set if rooms is currently empty
  useEffect(() => {
    const fCount = typeof floorsCount === 'number' ? floorsCount : 0;
    if (fCount > 0 && rooms.length === 0) {
      handleGenerateRecommendedRooms();
    }
  }, [floorsCount]);

  // Form State - Evaluation & Condition
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade | ''>('');

  // Form State - Official Attachments
  const [attachments, setAttachments] = useState<AttachedFileItem[]>([]);

  // Modal Dialog States for Adding New Governorate / Oilfield / Unit Type
  const [showAddGovModal, setShowAddGovModal] = useState(false);
  const [newGovNameAr, setNewGovNameAr] = useState('');
  const [newGovCode, setNewGovCode] = useState('');

  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldNameAr, setNewFieldNameAr] = useState('');
  const [newFieldCode, setNewFieldCode] = useState('');

  const [showAddUnitTypeModal, setShowAddUnitTypeModal] = useState(false);
  const [newUtNameAr, setNewUtNameAr] = useState('');
  const [newUtCode, setNewUtCode] = useState('');
  const [newUtMultiStory, setNewUtMultiStory] = useState(false);
  const [newUtDefaultRoof, setNewUtDefaultRoof] = useState<'샌드위치 판넬' | '콘크리트' | '철골 شينكو'>('샌드위치 판넬');

  // Active section scroll refs
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Filter available oilfields by governorate
  const availableOilfields = oilfields.filter(
    (f) => f.governorateId === governorateId && f.status === 'active'
  );

  const handleGenerateCode = (): string => {
    const selectedGov = governorates.find((g) => g.id === governorateId);
    const selectedFld = oilfields.find((f) => f.id === fieldId);

    const govPrefix = selectedGov ? selectedGov.code : 'WS';
    const fieldPrefix = selectedFld ? selectedFld.code : 'AHD';
    const typePrefix = selectedUnitType || 'BLD';

    const generated = generateUnitCode(govPrefix, fieldPrefix, typePrefix, existingUnits);
    setCode(generated);
    return generated;
  };

  // Handle Adding New Governorate
  const handleSaveNewGov = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newGovNameAr || !newGovCode) {
      alert('يرجى ملء اسم المحافظة والرمز الموحد');
      return;
    }

    const newGovId = `GOV-${newGovCode.toUpperCase().replace(/\s+/g, '')}`;
    const newGovItem: GovernorateRef = {
      id: newGovId,
      nameAr: newGovNameAr,
      code: newGovCode.toUpperCase(),
      status: 'active',
    };

    if (onAddGovernorate) {
      onAddGovernorate(newGovItem);
    }

    setGovernorateId(newGovId);
    setShowAddGovModal(false);
    setNewGovNameAr('');
    setNewGovCode('');
    handleGenerateCode();
  };

  // Handle Adding New Oilfield
  const handleSaveNewOilfield = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFieldNameAr || !newFieldCode) {
      alert('يرجى ملء اسم الحقل النفطي والرمز الموحد');
      return;
    }

    const newFieldId = `FLD-${newFieldCode.toUpperCase().replace(/\s+/g, '')}`;
    const newFieldItem: OilfieldRef = {
      id: newFieldId,
      governorateId: governorateId,
      nameAr: newFieldNameAr,
      code: newFieldCode.toUpperCase(),
      status: 'active',
    };

    if (onAddOilfield) {
      onAddOilfield(newFieldItem);
    }

    setFieldId(newFieldId);
    setShowAddFieldModal(false);
    setNewFieldNameAr('');
    setNewFieldCode('');
    handleGenerateCode();
  };

  const handleSaveNewUnitType = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newUtNameAr) return;

    const generatedCode = (newUtCode || newUtNameAr.slice(0, 3)).toUpperCase();
    const newUnitTypeItem: ReferenceUnitType = {
      code: generatedCode,
      nameAr: newUtNameAr,
      multiStory: newUtMultiStory,
      defaultRoof: newUtDefaultRoof,
      status: 'active',
    };

    if (onAddUnitType) {
      onAddUnitType(newUnitTypeItem);
    }

    setSelectedUnitType(generatedCode);
    setShowAddUnitTypeModal(false);
    setNewUtNameAr('');
    setNewUtCode('');
  };

  const [previewAttachment, setPreviewAttachment] = useState<AttachedFileItem | null>(null);
  const [createdUnitWithQr, setCreatedUnitWithQr] = useState<{
    unit: UnitAsset;
    qrDataUrl: string;
  } | null>(null);

  // File Attachment Upload Handler (Images, PDFs, Videos only)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file) return;

      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isVideo = file.type.startsWith('video/') || /\.(mp4|avi|mov|mkv|webm|flv|wmv)$/i.test(file.name);

      if (!isImage && !isPdf && !isVideo) {
        alert('عذراً، يُسمح فقط برفع ملفات الصور بكافة أنواعها، ملفات PDF، ومقاطع الفيديو بكافة أنواعها.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)، الرجاء ضغط الصورة أو اختيار ملف أصغر.');
        e.target.value = '';
        return;
      }

      const fileTypeLabel = isImage ? 'صورة' : isPdf ? 'وثيقة PDF' : 'مقطع فيديو';

      // Accurate human readable file size calculation
      let formattedSize = '150.0 KB';
      if (file.size > 0) {
        if (file.size < 1024 * 1024) {
          formattedSize = `${(file.size / 1024).toFixed(1)} KB`;
        } else {
          formattedSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
        }
      }

      const createItemAndAdd = (urlToUse: string) => {
        const newFileItem: AttachedFileItem = {
          id: `att-${Date.now()}`,
          name: file.name,
          size: formattedSize,
          type: fileTypeLabel,
          uploadDate: getServerDateFormatted(),
          url: urlToUse,
        };
        setAttachments((prev) => [...prev, newFileItem]);
      };

      const objectUrl = URL.createObjectURL(file);

      // Convert PDF or file to Data URL for reliable iframe/object preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = (event.target?.result as string) || objectUrl;
        createItemAndAdd(resultUrl);
      };
      reader.onerror = () => {
        createItemAndAdd(objectUrl);
      };

      try {
        reader.readAsDataURL(file);
      } catch (err) {
        createItemAndAdd(objectUrl);
      }

      // Reset file input value
      e.target.value = '';
    }
  };

  const handleViewAttachment = (file: AttachedFileItem) => {
    setPreviewAttachment(file);
  };

  const handleDownloadAttachment = (file: AttachedFileItem) => {
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const content = `جمهورية العراق - وزارة النفط\nالمستند الرسمي: ${file.name}\nالتاريخ: ${file.uploadDate}\nنوع الملف: ${file.type}\nالحالة: مستند معتمد ومحفوظ في السجل الهندسي.`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const dummyUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dummyUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(dummyUrl), 1000);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      alert('يرجى كتابة الاسم الكامل للمنشأة / المبنى');
      return;
    }
    if (!conditionGrade) {
      alert('يرجى اختيار درجة التقييم الهندسي المبدئي للوحدة (Grade A / B / C / D)');
      return;
    }

    // Validate Fixed Asset Code if entered
    if (fixedAssetCode.trim()) {
      const codeFormatVal = validateFixedAssetCodeFormat(fixedAssetCode.trim());
      if (!codeFormatVal.isValid) {
        alert(`تنبيه بخصوص رمز الأصل:\n${codeFormatVal.message}`);
        if (section1Ref.current) section1Ref.current.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      const uniquenessCheck = checkFixedAssetCodeUniqueness(fixedAssetCode.trim(), existingUnits);
      if (!uniquenessCheck.isUnique) {
        alert('تنبيه: رمز الأصل مسجل مسبقاً لوحدة أخرى في النظام. رمز الأصل يجب أن يكون فريداً وغير مكرر.');
        if (section1Ref.current) section1Ref.current.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // Generate Unified Structural Code upon saving
    const generatedCode = handleGenerateCode();

    const selectedGov = governorates.find((g) => g.id === governorateId);
    const selectedFld = oilfields.find((f) => f.id === fieldId);

    const selectedEquipmentList: any[] = [];

    // Aggregate and normalize room sequences and standard room codes using the generated unit code
    const aggregatedRoomsList = normalizeUnitRoomsSequence(generatedCode, rooms);

    const finalDept = selectedDepartments.length > 0 ? selectedDepartments.join(' ، ') : (department || 'غير محدد');

    const convertedAttachments: UnitAttachment[] = attachments.map((att, idx) => ({
      id: att.id || `ATT-${Date.now()}-${idx}`,
      name: att.name,
      type: att.name.toLowerCase().endsWith('.pdf')
        ? 'pdf'
        : att.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|svg|bmp)$/)
        ? 'image'
        : att.name.toLowerCase().match(/\.(mp4|avi|mov|webm)$/)
        ? 'video'
        : 'doc',
      sizeMB: att.size ? parseFloat(att.size) || 1.5 : 1.5,
      uploadDate: att.uploadDate || getServerDateFormatted(),
      category: 'وثائق ومرفقات رسمية',
      notes: 'ملف مرفق تم رفعه بواسطة المستخدم',
      fileUrl: att.url,
      url: att.url,
    }));

    const newUnit: UnitAsset = {
      id: generatedCode,
      code: generatedCode,
      fixedAssetCode: fixedAssetCode.trim() || undefined,
      name: name.trim(),
      type: (selectedUnitType === 'CRV' ? 'caravan' : selectedUnitType === 'BLD' ? 'building' : selectedUnitType === 'WHS' ? 'warehouse' : (selectedUnitType || 'building')) as UnitType,
      unitTypeCode: selectedUnitType || 'BLD',
      siteId: 'WST-AHD-CPF-001',
      siteName: selectedFld ? `منشأة ${selectedFld.nameAr}` : 'المحطة المركزية',
      field: selectedFld?.nameAr || 'حقل الأحدب',
      governorate: selectedGov?.nameAr || 'محافظة واسط',
      conditionGrade: conditionGrade as ConditionGrade,
      constructionYear,
      department: finalDept,
      departments: selectedDepartments.length > 0 ? selectedDepartments : [finalDept],
      coordinates: { lat, lng },
      sectorAddress: '',
      totalAreaSqM: Number(areaSqM),
      lengthM: Number(lengthM),
      widthM: Number(widthM),
      heightM: Number(heightM),
      buildingShape,
      designFinishing: {
        archStyle: 'modern',
        roofType,
        showFurniture: true,
        showWindows: true,
        showTrees: false,
      },
      floorsCount: Number(floorsCount),
      rooms: aggregatedRoomsList,
      equipment: selectedEquipmentList,
      attachments: convertedAttachments,
      attachmentsCount: convertedAttachments.length,
      lastUpdated: getServerDateFormatted(),
    };

    // Generate QR Code data URL
    const qrPayload = JSON.stringify({
      code: newUnit.code,
      fixedAssetCode: newUnit.fixedAssetCode,
      name: newUnit.name,
      field: newUnit.field,
      governorate: newUnit.governorate,
      type: newUnit.type,
      lat: newUnit.coordinates.lat,
      lng: newUnit.coordinates.lng,
      timestamp: new Date().toISOString(),
    });

    try {
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 360,
        margin: 2,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      });
      setCreatedUnitWithQr({ unit: newUnit, qrDataUrl });
      onAddUnit(newUnit);
    } catch (err) {
      console.error('Failed to generate QR Code:', err);
      onAddUnit(newUnit);
    }
  };

  const handleFinishAndNavigate = () => {
    if (createdUnitWithQr) {
      setCreatedUnitWithQr(null);
      onCancel();
    }
  };

  const handlePrintQrCard = () => {
    if (!createdUnitWithQr) return;
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(`
        <html dir="rtl">
          <head>
            <title>لوحة الشريحة المعدنية والهوية القياسية - ${createdUnitWithQr.unit.code}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; background: #fff; }
                .plate-container { page-break-inside: avoid; }
              }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #f8fafc;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
                box-sizing: border-box;
              }
              .plate-container {
                width: 135mm;
                min-height: 90mm;
                background: #ffffff;
                border: 4px solid #0f172a;
                border-radius: 12px;
                padding: 18px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                position: relative;
                box-sizing: border-box;
                direction: rtl;
              }
              .screw {
                position: absolute;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #e2e8f0;
                border: 1.5px solid #0f172a;
              }
              .screw-tl { top: 8px; right: 8px; }
              .screw-tr { top: 8px; left: 8px; }
              .screw-bl { bottom: 8px; right: 8px; }
              .screw-br { bottom: 8px; left: 8px; }
              .header {
                text-align: center;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 8px;
                margin-bottom: 12px;
              }
              .header-title { font-size: 11px; font-weight: bold; color: #475569; margin: 0; }
              .header-sub { font-size: 14px; font-weight: 900; color: #0f172a; margin: 3px 0 0 0; }
              .body-grid {
                display: flex;
                gap: 16px;
                align-items: center;
              }
              .info-side { flex: 1; text-align: right; }
              .code-box {
                background: #0f172a;
                color: #f59e0b;
                font-family: monospace;
                font-size: 20px;
                font-weight: 900;
                padding: 8px 12px;
                border-radius: 8px;
                text-align: center;
                letter-spacing: 1.5px;
                margin-bottom: 10px;
                border: 1px solid #d97706;
              }
              .unit-name {
                font-size: 14px;
                font-weight: 800;
                color: #0f172a;
                margin-bottom: 8px;
                line-height: 1.3;
              }
              .meta-item {
                font-size: 11px;
                color: #334155;
                margin-bottom: 4px;
              }
              .meta-item strong { color: #0f172a; }
              .qr-side {
                text-align: center;
                shrink: 0;
              }
              .qr-side img {
                width: 145px;
                height: 145px;
                border: 2px solid #0f172a;
                border-radius: 8px;
                padding: 4px;
                background: #fff;
              }
              .footer-tag {
                margin-top: 12px;
                border-top: 1.5px solid #cbd5e1;
                padding-top: 6px;
                text-align: center;
                font-size: 9.5px;
                font-weight: bold;
                color: #475569;
              }
            </style>
          </head>
          <body>
            <div class="plate-container">
              <div class="screw screw-tl"></div>
              <div class="screw screw-tr"></div>
              <div class="screw screw-bl"></div>
              <div class="screw screw-br"></div>

              <div class="header">
                <p class="header-title">جمهورية العراق • وزارة النفط • شركة نفط الوسط</p>
                <h1 class="header-sub">شريحة الهوية القياسية الرسمية للأصل رقمياً</h1>
              </div>

              <div class="body-grid">
                <div class="info-side">
                  <div class="code-box">${createdUnitWithQr.unit.code}</div>
                  <div class="unit-name">${createdUnitWithQr.unit.name}</div>
                  <div class="meta-item"><strong>المحافظة والحقل:</strong> ${createdUnitWithQr.unit.governorate} - ${createdUnitWithQr.unit.field}</div>
                  <div class="meta-item"><strong>سنة التشغيل:</strong> ${createdUnitWithQr.unit.constructionYear}</div>
                  <div class="meta-item"><strong>رمز الأصل:</strong> ${createdUnitWithQr.unit.fixedAssetCode || 'غير مسجل'}</div>
                  <div class="meta-item"><strong>الإحداثيات:</strong> ${createdUnitWithQr.unit.coordinates.lat.toFixed(4)}, ${createdUnitWithQr.unit.coordinates.lng.toFixed(4)}</div>
                </div>

                <div class="qr-side">
                  <img src="${createdUnitWithQr.qrDataUrl}" alt="QR Code" />
                  <div style="font-size: 9px; font-weight: bold; margin-top: 4px; color: #0f172a;">رمز المسح الفوري</div>
                </div>
              </div>

              <div class="footer-tag">
                شريحة معدنية قياسية مخصصة للتثبيت والطباعة والتثبيت على جدار / كرفان المنشأة النفطية
              </div>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  const handleDownloadQrImage = () => {
    if (!createdUnitWithQr) return;
    const a = document.createElement('a');
    a.href = createdUnitWithQr.qrDataUrl;
    a.download = `QR_${createdUnitWithQr.unit.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden space-y-4 sm:space-y-6 pb-8 transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      {/* Page Header Window Toolbar */}
      <div
        className={`p-3.5 sm:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 sticky top-0 z-30 shadow-md transition-colors ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>تسجيل أصل جديد - نظام حركي ديناميكي</span>
            </span>
          </div>
          <h2 className={`text-lg sm:text-2xl font-black mt-2 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            استمارة إدخال وحدة / مبنى / كرفان جديد
          </h2>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            نافذة تسجيل موحدة تضم كافة البيانات التعريفية والموقع الجغرافي والمواصفات الإنشائية والتقييم
          </p>
        </div>
      </div>

      {/* Main Single Form Body */}
      <form onSubmit={handleSubmit} className="px-3 sm:px-6 space-y-5 sm:space-y-8">
        {/* ==================== SECTION 1 ==================== */}
        <div
          ref={section1Ref}
          className={`border rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-4 sm:space-y-5 scroll-mt-24 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs' : 'bg-slate-950 border-slate-800 text-slate-100'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs sm:text-sm shadow">
                {toArabicDigits(1)}
              </div>
              <div>
                <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  البيانات التعريفية والرمز والهوية القياسية
                </h3>
                <p className={`text-[11px] sm:text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  تحديد نوع المنشأة والاسم والرمز الموحد وسنة الإنشاء
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              أساسي
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-300 font-bold">فئة ونوع المنشأة المرجعي:</label>
                <button
                  type="button"
                  onClick={() => setShowAddUnitTypeModal(true)}
                  className="text-amber-400 hover:text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/20 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>إضافة فئة جديدة</span>
                </button>
              </div>
              <select
                value={selectedUnitType}
                onChange={(e) => setSelectedUnitType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 font-bold focus:border-amber-500 outline-none transition cursor-pointer"
              >
                <option value="">-- اختر فئة ونوع المنشأة المرجعي --</option>
                {unitTypes
                  .filter((u) => u.status === 'active')
                  .map((ut) => (
                    <option key={ut.code} value={ut.code}>
                      {ut.nameAr} ({ut.code})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">الاسم الكامل الرسمي للمنشأة / المبنى:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مبنى إدارة حقل الأحدب الرئيسي - الجناح الغربي"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 focus:border-amber-500 outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">سنة الإنشاء والتشغيل:</label>
                <input
                  type="number"
                  value={constructionYear}
                  onChange={(e) => setConstructionYear(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="سنة الإنشاء والتشغيل (مثال: 2024)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 focus:border-amber-500 outline-none transition font-mono"
                />
              </div>
            </div>

            {/* رمز الأصل في سجلات أصول الشركة */}
            {(() => {
              const selectedTypeObj = unitTypes.find((ut) => ut.code === selectedUnitType);
              const isCaravan = selectedUnitType.toLowerCase().includes('crv') ||
                selectedUnitType.toLowerCase().includes('caravan') ||
                (selectedTypeObj?.nameAr || '').includes('كرفان');
              const inferredCategory = isCaravan ? 'caravan' : 'building';

              const validation = fixedAssetCode
                ? validateFixedAssetCodeFormat(fixedAssetCode, selectedUnitType ? inferredCategory : undefined)
                : null;
              const isUnique = fixedAssetCode
                ? checkFixedAssetCodeUniqueness(fixedAssetCode, existingUnits).isUnique
                : true;

              const isContinuous = /^\d+$/.test(fixedAssetCode.trim());
              const isDotted = fixedAssetCode.includes('.') && /^\d+(\.\d+)+$/.test(fixedAssetCode.trim());

              return (
                <div
                  className={`border rounded-2xl p-4 space-y-3.5 transition-colors ${
                    isLight
                      ? 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className={`w-4 h-4 shrink-0 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                      <label className={`font-black text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                        رمز الأصل في سجلات أصول الشركة:
                      </label>
                      <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        (حقل اختياري / فريد)
                      </span>
                    </div>

                    {fixedAssetCode && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {validation?.isValid && isUnique && (
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                              validation.isIdeal
                                ? isLight
                                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : isLight
                                ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{validation.badgeText} - رمز فريد</span>
                          </span>
                        )}
                        {!validation?.isValid && (
                          <span className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{validation?.message}</span>
                          </span>
                        )}
                        {validation?.isValid && !isUnique && (
                          <span className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>رمز الأصل مكرر ومسجل مسبقاً لمنشأة أخرى!</span>
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
                          inferredCategory === 'caravan'
                            ? '123.1234.123 (أرقام مع فواصل للكرفانات)'
                            : '0123456789 (أرقام بدون فواصل للأبنية)'
                        }
                        className={`w-full border rounded-xl p-3 font-mono font-bold text-sm tracking-wider outline-none transition focus:border-indigo-500 ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                            : 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder:text-slate-500 placeholder:text-xs'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isContinuous && fixedAssetCode.length >= 6 && (
                        <button
                          type="button"
                          onClick={() => setFixedAssetCode(formatToCaravanDottedCode(fixedAssetCode))}
                          className={`text-[11px] px-3 py-2.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border ${
                            isLight
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs'
                              : 'bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border-indigo-500/40'
                          }`}
                          title="تحويل الأرقام إلى فورمات الكرفانات المنقط (مثال: 123.1234.123)"
                        >
                          <span>تحويل لكرفانات (123.1234.123)</span>
                        </button>
                      )}

                      {isDotted && (
                        <button
                          type="button"
                          onClick={() => setFixedAssetCode(formatToBuildingContinuousCode(fixedAssetCode))}
                          className={`text-[11px] px-3 py-2.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer border ${
                            isLight
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                              : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border-emerald-500/40'
                          }`}
                          title="إزالة الفواصل والنقاط لفورمات الأبنية المتصل (مثال: 0123456789)"
                        >
                          <span>تحويل لأبنية (0123456789)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* صندوق معايير وتنسيق رمز الأصل */}
                  <div
                    className={`p-3.5 rounded-xl border space-y-2.5 text-xs ${
                      isLight
                        ? 'bg-white/90 border-indigo-100/90 shadow-xs'
                        : 'bg-slate-950/70 border-slate-800/80'
                    }`}
                  >
                    <p
                      className={`font-bold flex items-center gap-1.5 text-[11px] ${
                        isLight ? 'text-slate-800' : 'text-slate-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                      <span>المعلومات داخل الحقل تكون بهذا الشكل:</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-900/90 border-slate-800/90'
                        }`}
                      >
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                          0123456789
                        </span>
                        <span className={isLight ? 'text-slate-700 font-medium' : 'text-slate-300 font-medium'}>
                          أرقام بدون فواصل للأبنية
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-900/90 border-slate-800/90'
                        }`}
                      >
                        <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shrink-0">
                          123.1234.123
                        </span>
                        <span className={isLight ? 'text-slate-700 font-medium' : 'text-slate-300 font-medium'}>
                          أرقام مع فواصل للكرفانات
                        </span>
                      </div>
                    </div>
                    <p
                      className={`text-[10.5px] leading-relaxed pt-0.5 ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      يتم اعتماد هذا الفورمات كتقييم لحالة إدخال رمز الأصل ومطابقته للتنسيق المثالي في سجلات أصول الشركة.
                    </p>
                  </div>
                </div>
              );
            })()}


          </div>
        </div>

        {/* ==================== SECTION 2 ==================== */}
        <div
          ref={section2Ref}
          className={`border rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-4 sm:space-y-5 scroll-mt-24 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs' : 'bg-slate-950 border-slate-800 text-slate-100'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs sm:text-sm shadow">
                {toArabicDigits(2)}
              </div>
              <div>
                <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  الموقع والإحداثيات الجغرافية والخريطة التفاعلية
                </h3>
                <p className={`text-[11px] sm:text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  تحديد المحافظة، الحقل النفطي، وإحداثيات الموقع عبر خريطة حية أو إدخال يدوي
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              GPS حقيقي
            </span>
          </div>

          <div className="space-y-5 text-xs">
            {/* Governorate & Oilfield Selection with Inline Creation Modals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Governorate Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold">المحافظة العراقية:</label>
                  <button
                    type="button"
                    onClick={() => setShowAddGovModal(true)}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة محافظة جديدة</span>
                  </button>
                </div>
                <select
                  value={governorateId}
                  onChange={(e) => {
                    const gId = e.target.value;
                    setGovernorateId(gId);
                    const firstFld = oilfields.find((f) => f.governorateId === gId);
                    if (firstFld) setFieldId(firstFld.id);
                    else setFieldId('');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 font-bold focus:border-amber-500 outline-none transition cursor-pointer"
                >
                  <option value="">-- اختر المحافظة العراقية --</option>
                  {governorates
                    .filter((g) => g.status === 'active')
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nameAr} ({g.code})
                      </option>
                    ))}
                </select>
              </div>

              {/* Oilfield Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold">الحقل النفطي:</label>
                  <button
                    type="button"
                    onClick={() => setShowAddFieldModal(true)}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة حقل نفطي جديد</span>
                  </button>
                </div>
                <select
                  value={fieldId}
                  onChange={(e) => setFieldId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-100 font-bold focus:border-amber-500 outline-none transition cursor-pointer"
                >
                  <option value="">-- اختر الحقل النفطي --</option>
                  {availableOilfields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nameAr} ({f.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Interactive Map Component */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className={`font-bold flex items-center gap-2 text-sm ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span>التحديد الجغرافي المباشر عبر الخريطة الحية:</span>
                </label>
                <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  يمكن تحديد الموقع بالنقر/السحب على الخريطة أو بإدخال القيم اليدوية أدناه
                </span>
              </div>

              <LocationPickerMap
                lat={typeof lat === 'number' && lat ? lat : 32.6189}
                lng={typeof lng === 'number' && lng ? lng : 45.7531}
                onChangeLocation={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                }}
                theme={theme}
              />

              {/* Manual Lat/Lng Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className={`border rounded-2xl p-3.5 space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <label className={`block font-bold text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>خط العرض (GPS Latitude):</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 32.6189"
                    className={`w-full border rounded-xl p-2.5 font-mono font-bold text-sm focus:border-amber-500 outline-none transition ${
                      isLight
                        ? 'bg-white border-slate-300 text-amber-600 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-800 text-amber-400 placeholder-slate-600'
                    }`}
                  />
                </div>

                <div className={`border rounded-2xl p-3.5 space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <label className={`block font-bold text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>خط الطول (GPS Longitude):</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 45.7531"
                    className={`w-full border rounded-xl p-2.5 font-mono font-bold text-sm focus:border-amber-500 outline-none transition ${
                      isLight
                        ? 'bg-white border-slate-300 text-amber-600 placeholder-slate-400'
                        : 'bg-slate-950 border-slate-800 text-amber-400 placeholder-slate-600'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SECTION 3 ==================== */}
        <div ref={section3Ref} className={`border rounded-3xl p-6 space-y-6 scroll-mt-24 transition-colors ${isLight ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'}`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                {toArabicDigits(3)}
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>معلومات الإشغال، الطوابق وحصر الغرف والقاعات</h3>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>تثبيت عدد الطوابق، تخصيص القاعات والغرف، وترقيمها وحفظ الجهات الشاغلة</p>
              </div>
            </div>
          </div>

          {/* Core Building Dimensions & Area Controls */}
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-900/90 border-slate-800'} space-y-3`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className={`font-bold text-xs flex items-center gap-2 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                  <Maximize2 className="w-4 h-4" />
                  <span>الأبعاد الهندسية والحساب التلقائي لمساحة الوحدة الكلية:</span>
                </label>
                <div className={`text-[11px] font-bold px-3 py-1 rounded-lg border font-mono ${isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                  المعادلة: الطول ({toArabicDigits(lengthM || 0)}م) × العرض ({toArabicDigits(widthM || 0)}م) = {toArabicDigits(areaSqM || 0)} م²
                  {buildingShape && buildingShape !== 'مستطيل' && buildingShape !== 'مربع' && ` [معامل الهندسة: ${toArabicDigits(getShapeFactor(buildingShape))}]`}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>طول الوحدة (أمتار):</label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={lengthM}
                    onChange={(e) => handleLengthChange(e.target.value)}
                    placeholder="الطول (أمتار)..."
                    className={`w-full border rounded-xl p-2.5 font-bold font-mono text-sm focus:border-amber-500 outline-none transition ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-amber-400'}`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>عرض الوحدة (أمتار):</label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={widthM}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    placeholder="العرض (أمتار)..."
                    className={`w-full border rounded-xl p-2.5 font-bold font-mono text-sm focus:border-amber-500 outline-none transition ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-amber-400'}`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ارتفاع السقف (أمتار):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    step="0.1"
                    value={heightM}
                    onChange={(e) => setHeightM(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="الارتفاع (مثال: 3)..."
                    className={`w-full border rounded-xl p-2.5 font-bold font-mono text-sm focus:border-amber-500 outline-none transition ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'}`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>مساحة الوحدة الكلية (م²):</label>
                  <input
                    type="number"
                    min={10}
                    value={areaSqM}
                    onChange={(e) => setAreaSqM(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="المساحة الكلية (م²)..."
                    className={`w-full border rounded-xl p-2.5 font-black font-mono text-sm focus:border-amber-500 outline-none transition ${isLight ? 'bg-amber-100/50 border-amber-300 text-amber-900' : 'bg-slate-950 border-amber-500/50 text-amber-400'}`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div>
                <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>عدد الطوابق الإجمالي للمبنى:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={floorsCount}
                    onChange={(e) => setFloorsCount(e.target.value === '' ? '' : Math.max(1, Math.min(20, Number(e.target.value))))}
                    placeholder="عدد الطوابق (مثال: 1 أو 2)..."
                    className={`w-full border rounded-xl p-3 font-bold text-sm focus:border-amber-500 outline-none transition ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}
                  />
                  <span className={`text-xs font-bold whitespace-nowrap ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>طوابق</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className={`block font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    الجهات الشاغلة للمنشأة (يمكن إضافة أكثر من جهة):
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDeptModal(true)}
                    className={`text-[11px] font-bold hover:underline flex items-center gap-1 cursor-pointer ${isLight ? 'text-amber-700' : 'text-amber-400'}`}
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-[0.99]"
                    title="فتح الهيكل التنظيمي المعتمد لاختيار وتحديد التشكيلات والجهات الشاغلة"
                  >
                    <Network className="w-4 h-4 text-slate-950" />
                    <span>عرض الهيكل التنظيمي لاختيار وتحديد التشكيلات والجهات الشاغلة</span>
                    {selectedDepartments.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[11px] font-black mr-1.5">
                        {toArabicDigits(selectedDepartments.length)} محددة
                      </span>
                    )}
                  </button>
                </div>

                {/* Selected Occupying Entities Display Cards/Chips */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      الجهات الشاغلة المخصصة للمنشأة ({toArabicDigits(selectedDepartments.length)}):
                    </span>
                    {selectedDepartments.length > 0 && (
                      <span className={`text-[10px] ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                        الجهة الأولى هي "الجهة الرئيسية"
                      </span>
                    )}
                  </div>

                  {selectedDepartments.length === 0 ? (
                    <div className={`p-3 rounded-xl border border-dashed text-center text-xs ${isLight ? 'bg-amber-50/40 border-amber-200 text-slate-500' : 'bg-slate-900/40 border-slate-800 text-slate-400'}`}>
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
                                ? isLight
                                  ? 'bg-amber-100/90 border-amber-400 text-amber-950 font-bold'
                                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                                : isLight
                                  ? 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
                                  : 'bg-slate-900 border-slate-700/80 text-slate-200'
                            }`}
                          >
                            <Users className={`w-3.5 h-3.5 ${isPrimary ? 'text-amber-600' : 'text-slate-400'}`} />
                            <span className="truncate">{deptName}</span>
                            {isPrimary ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${isLight ? 'bg-amber-200 border-amber-400 text-amber-900' : 'bg-amber-500/30 border-amber-500/50 text-amber-300'}`}>
                                رئيسية
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryDepartment(deptName)}
                                className={`text-[10px] underline hover:no-underline transition cursor-pointer ${isLight ? 'text-slate-600 hover:text-amber-800' : 'text-slate-400 hover:text-amber-400'}`}
                                title="تعيين هذه الجهة كجهة شاغلة رئيسية للمنشأة"
                              >
                                جعلها رئيسية
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveDepartment(deptName)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition cursor-pointer ml-0.5"
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
            </div>
          </div>

          {/* Building Layout Shape Selection Section */}
          <div className={`p-4 rounded-2xl border space-y-3 transition-colors ${isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-900/90 border-slate-800'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className={`block font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  شكل وهندسة تصميم المبنى (Building Layout Shape):
                </label>
                <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  اختر الشكل الهندسي المعماري للمبنى أو الكرفان من القائمة أو انقر المخطط المطلوب أدناه
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                  الشكل المحدد: {buildingShape || 'لم يحدد بعد'}
                </span>
              </div>
            </div>

            {/* Select Dropdown */}
            <div>
              <select
                value={buildingShape}
                onChange={(e) => handleShapeChange(e.target.value)}
                className={`w-full border rounded-xl p-3 font-bold text-xs focus:border-amber-500 outline-none transition cursor-pointer ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'}`}
              >
                <option value="">-- اختر شكل وتصميم المبنى الهندسي --</option>
                {BUILDING_SHAPE_OPTIONS.map((shp) => (
                  <option key={shp.id} value={shp.id}>
                    {shp.symbol} {shp.nameAr} - [{shp.category}]
                  </option>
                ))}
              </select>
            </div>

            {/* Visual Shape Grid Picker */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
              {BUILDING_SHAPE_OPTIONS.map((shp) => {
                const isSelected = buildingShape === shp.id;
                return (
                  <button
                    key={shp.id}
                    type="button"
                    onClick={() => handleShapeChange(shp.id)}
                    className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between space-y-1.5 ${
                      isSelected
                        ? isLight
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black'
                          : 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                        : isLight
                          ? 'bg-white border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/50'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-base font-black px-1.5 py-0.5 rounded bg-black/10">
                        {shp.symbol}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <div className="text-[11px] font-bold truncate leading-tight">
                      {shp.id}
                    </div>
                    <div className={`text-[10px] line-clamp-1 opacity-80 ${isSelected ? 'text-slate-900' : isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {shp.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roof Design & Geometry Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className={`block font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                نوع السطح والتصميم المعماري للسقف (Roof Architecture):
              </label>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                مساحة السقف مطابقة لقاعدة البناء 100%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { id: 'flat', name: 'سطح مسطح مستوي', desc: 'سطح مستوي خرساني/صناعي بدون سياج' },
                { id: 'flat_parapet', name: 'سطح مسطح مع سياج', desc: 'سطح خرساني محاط بسياج حماية محيطي' },
                { id: 'gabled', name: 'سطح مثلث مائل (جملون)', desc: 'تصميم جملوني مدبب من الأعلى بعرض المبنى' },
                { id: 'pitched_tile', name: 'سطح قرميد مائل', desc: 'سقف قرميدي مائل متناسق' },
              ].map((rf) => {
                const isSelected = roofType === rf.id;
                return (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => setRoofType(rf.id as any)}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between space-y-1 ${
                      isSelected
                        ? isLight
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black'
                          : 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                        : isLight
                          ? 'bg-white border-slate-200 text-slate-800 hover:border-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">{rf.name}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0 text-slate-950" />}
                    </div>
                    <p className={`text-[10px] leading-relaxed ${isSelected ? 'text-slate-900 font-bold' : isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {rf.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floor-by-Floor Rooms & Halls Breakdown Section */}
          <div className="space-y-4 pt-2">
            {/* Header: Title, View Switcher & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className={`text-sm sm:text-base font-black truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      تفاصيل وحصر غرف وقاعات المبنى
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {toArabicDigits(rooms.length)} غرفة مسجلة
                    </span>
                  </div>
                  <p className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    تقسيم داخلي تفصيلي، أرقام الغرف، الرموز القياسية، وتخصيص الجهات الشاغلة
                  </p>
                </div>
              </div>

              {/* Right controls: View Mode Switcher + Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                {/* View Mode Switcher */}
                <div className={`flex items-center p-1 rounded-xl border shrink-0 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                  <button
                    type="button"
                    onClick={() => setRoomsViewMode('cards')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      roomsViewMode === 'cards'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>بطاقات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomsViewMode('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      roomsViewMode === 'table'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>جدول</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRegenerateAllRoomCodes}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  title="إعادة ترقيم وتسلسل جميع رموز الغرف القياسية وفق الطوابق"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">ترقيم الرموز</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateRecommendedRooms}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-indigo-700 border-indigo-200'
                      : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border-slate-800'
                  }`}
                  title="توليد توزيع مقترح تلقائياً لغرف المبنى وفق الطوابق"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">توليد مقترح</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddRoom()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة غرفة</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Summary Bar (5 Stat Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 block font-bold">إجمالي الغرف</span>
                <span className="text-base font-black text-amber-500 font-mono">
                  {toArabicDigits(rooms.length)}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 block font-bold">المساحة المحصورة</span>
                <span className={`text-base font-black font-mono ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {toArabicDigits(rooms.reduce((acc, r) => acc + (Number(r.areaSqM) || 0), 0))} م²
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 block font-bold">إجمالي الطاقة الاستيعابية</span>
                <span className="text-base font-black text-sky-500 dark:text-sky-400 font-mono">
                  {toArabicDigits(rooms.reduce((acc, r) => acc + (Number(r.capacity) || Number(r.occupantsCount) || 0), 0))} فرد
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 block font-bold">الغرف المشغولة</span>
                <span className="text-base font-black text-emerald-500 dark:text-emerald-400 font-mono">
                  {toArabicDigits(rooms.filter((r) => r.status === 'Active' && !isRoomVacant(r.occupiedBy)).length)}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'} col-span-2 sm:col-span-1`}>
                <span className="text-[10px] text-slate-400 block font-bold">الغرف المتوقفة</span>
                <span className="text-base font-black text-rose-500 dark:text-rose-400 font-mono">
                  {toArabicDigits(rooms.filter((r) => r.status === 'Stopped').length)}
                </span>
              </div>
            </div>

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
                    className={`w-full text-xs rounded-xl py-2 pl-7 pr-8 border outline-none font-medium transition ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-amber-500'
                    }`}
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-3 text-slate-400 pointer-events-none" />
                  {roomSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRoomSearchQuery('')}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Floor Filters (Horizontal scrolling chips) */}
                {availableFloors.length > 1 && (
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                    <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-1">الطابق:</span>
                    <button
                      type="button"
                      onClick={() => setRoomFloorFilter('all')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer ${
                        roomFloorFilter === 'all'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : isLight
                          ? 'bg-white text-slate-600 border border-slate-200'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
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
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : isLight
                            ? 'bg-white text-slate-600 border border-slate-200'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
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
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start justify-between gap-2 text-xs font-bold animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{roomCodeChangeWarning}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRoomCodeChangeWarning(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Empty States */}
            {rooms.length === 0 ? (
              <div
                className={`p-6 sm:p-8 text-center text-xs border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2.5 ${
                  isLight ? 'border-slate-300 text-slate-500 bg-white' : 'border-slate-800 text-slate-400 bg-slate-950/60'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>لا توجد غرف مخصصة لهذه المنشأة حالياً</div>
                <p className="max-w-sm text-xs opacity-80">
                  يمكنك توليد التوزيع القياسي المقترح تلقائياً لجميع الطوابق أو الضغط على "إضافة غرفة جديدة".
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={handleGenerateRecommendedRooms}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Layers className="w-4 h-4" />
                    <span>توليد غرف مقترحة تلقائياً</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddRoom()}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة غرفة جديدة الآن</span>
                  </button>
                </div>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div
                className={`p-6 text-center text-xs border border-dashed rounded-xl ${
                  isLight ? 'border-slate-300 text-slate-500 bg-white' : 'border-slate-800 text-slate-400 bg-slate-950'
                }`}
              >
                <p className="font-bold">لا توجد غرف تطابق البحث أو الفلتر المحدد</p>
                <button
                  type="button"
                  onClick={() => {
                    setRoomSearchQuery('');
                    setRoomFloorFilter('all');
                  }}
                  className="mt-2 text-amber-500 font-bold underline cursor-pointer"
                >
                  إلغاء الفلتر وعرض الكل
                </button>
              </div>
            ) : roomsViewMode === 'cards' ? (
              /* ========================================================================= */
              /* VIEW 1: RESPONSIVE CARDS VIEW (Full Parity with EditUnitModal)            */
              /* ========================================================================= */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {filteredRooms.map((rm, idx) => {
                  const isStopped = rm.status === 'Stopped' || rm.status === 'متوقفة';
                  const roomComputedCode = (rm.code && rm.code.trim()) ? rm.code.trim() : generateRoomCode(code || 'UNIT', extractFloorNumber(rm.floor), getRoomTypeCode(rm.type), rm.sequenceNumber || 101, true);
                  const isNonOcc = isNonOccupancyRoom(rm.type);
                  const isCap = isCapacityBasedRoom(rm.type);
                  const isVacant = isRoomVacant(rm.occupiedBy);

                  return (
                    <div
                      key={rm.id}
                      className={`rounded-2xl border p-3 sm:p-4 space-y-2.5 transition shadow-xs hover:shadow-sm relative ${
                        isStopped
                          ? isLight
                            ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                            : 'bg-rose-950/20 border-rose-800/80 ring-1 ring-rose-500/20'
                          : isLight
                          ? 'bg-white border-slate-200 hover:border-slate-300'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Card Header: Room Index, Standard Code, QR, Regenerate, Status toggle & Delete */}
                      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                        {/* Right side: Code Badge & Actions */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center shrink-0">
                            {toArabicDigits(idx + 1)}
                          </span>
                          <span
                            className="font-mono font-black text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/25 shrink-0"
                            dir="ltr"
                            title={`رمز الغرفة القياسي: ${roomComputedCode}`}
                          >
                            {roomComputedCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedRoomForQr({ ...rm, code: roomComputedCode })}
                            className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 transition cursor-pointer shrink-0"
                            title="استعراض وطباعة بطاقة QR للغرفة"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateSingleRoomCode(rm.id)}
                            className="p-1 rounded-lg bg-slate-500/10 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
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
                                ? 'bg-rose-500/20 text-rose-500 border-rose-500/40 hover:bg-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/30'
                            }`}
                            title={isStopped ? 'انقر لتفعيل الغرفة' : 'انقر لإيقاف الغرفة'}
                          >
                            {isStopped ? 'متوقفة 🔴' : 'فعالة 🟢'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(rm.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
                            title="حذف هذه الغرفة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Room Name Input */}
                      <div>
                        <label className={`block text-[10px] font-bold mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          اسم الغرفة / القاعة:
                        </label>
                        <input
                          type="text"
                          value={rm.name}
                          onChange={(e) => handleUpdateRoom(rm.id, 'name', e.target.value)}
                          placeholder="مثال: مكتب المهندس المقيم / غرفة الاجتماعات"
                          className={`w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none transition focus:border-amber-500 ${
                            isLight
                              ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                              : 'bg-slate-900 border-slate-800 text-slate-100 focus:bg-slate-950'
                          }`}
                        />
                      </div>

                      {/* 3-Field Specifications Grid: Type, Floor, Area */}
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
                        <div>
                          <label className={`block text-[9.5px] font-bold mb-0.5 truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            نوع الاستخدام:
                          </label>
                          <input
                            type="text"
                            value={rm.type}
                            onChange={(e) => handleUpdateRoom(rm.id, 'type', e.target.value)}
                            className={`w-full border rounded-lg px-2 py-1 text-xs outline-none transition focus:border-amber-500 ${
                              isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-900 border-slate-800 text-slate-100 focus:bg-slate-950'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[9.5px] font-bold mb-0.5 truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            الطابق:
                          </label>
                          <select
                            value={rm.floor}
                            onChange={(e) => handleUpdateRoom(rm.id, 'floor', e.target.value)}
                            className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none transition focus:border-amber-500 cursor-pointer ${
                              isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-900 border-slate-800 text-slate-100 focus:bg-slate-950'
                            }`}
                          >
                            {Array.from({ length: Math.max(1, Number(floorsCount) || 1) }, (_, i) => `الطابق ${i + 1}`).map((flr) => (
                              <option key={flr} value={flr}>{flr}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={`block text-[9.5px] font-bold mb-0.5 truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            المساحة (م²):
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={rm.areaSqM}
                            onChange={(e) => handleUpdateRoom(rm.id, 'areaSqM', Number(e.target.value))}
                            className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none transition focus:border-amber-500 ${
                              isLight ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-900 border-slate-800 text-amber-400 focus:bg-slate-950'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Occupancy / Capacity & Department Selection */}
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-200/80 dark:border-slate-800/60">
                        {/* Occupancy or Capacity Row */}
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className={`text-[10px] font-bold shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            الإشغال والسعة:
                          </span>

                          {isNonOcc ? (
                            <span className="text-slate-400 text-[10px] px-2 py-0.5 bg-slate-500/10 rounded-lg border border-slate-500/20 truncate">
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
                                className={`w-14 sm:w-16 border rounded-lg px-2 py-0.5 text-xs font-bold outline-none text-center ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                }`}
                              />
                              <span className="text-[10px] text-sky-500 font-bold whitespace-nowrap">طاقة استيعابية</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                min="0"
                                placeholder="الشاغلين"
                                value={rm.occupantsCount ?? ''}
                                onChange={(e) => handleUpdateRoom(rm.id, 'occupantsCount', Number(e.target.value) || 0)}
                                className={`w-14 sm:w-16 border rounded-lg px-2 py-0.5 text-xs font-bold outline-none text-center ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                }`}
                              />
                              <span className="text-[10px] text-emerald-500 font-bold whitespace-nowrap">شاغل</span>
                              {isVacant && (
                                <span className="text-[9.5px] text-amber-500 font-bold mr-1">(شاغرة)</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Occupying Department Selector */}
                        <div>
                          <label className={`block text-[10px] font-bold mb-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
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
                            className={`w-full border rounded-xl px-2.5 py-1.5 text-xs outline-none cursor-pointer transition font-medium ${
                              isLight
                                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                                : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                            }`}
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
                                ⚠️ حدد التشكيلات الشاغلة من الهيكل التنظيمي أعلاه أولاً
                              </option>
                            )}
                            {rm.occupiedBy && !selectedDepartments.includes(rm.occupiedBy) && (
                              <option value={rm.occupiedBy}>{rm.occupiedBy} (مخصص)</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Stopped Reason Box (Only if stopped) */}
                      {isStopped && (
                        <div className={`p-2 rounded-xl border text-xs space-y-1 animate-in fade-in duration-150 ${
                          isLight ? 'bg-rose-100/60 border-rose-300' : 'bg-rose-950/40 border-rose-900/60'
                        }`}>
                          <label className="block text-[10px] font-black text-rose-600 dark:text-rose-400">
                            سبب التوقف وملاحظات العطل:
                          </label>
                          <input
                            type="text"
                            placeholder="أدخل سبب التوقف أو متطلبات الصيانة..."
                            value={rm.notes || ''}
                            onChange={(e) => handleUpdateRoom(rm.id, 'notes', e.target.value)}
                            className={`w-full border rounded-lg px-2 py-1 text-xs outline-none font-bold transition ${
                              isLight
                                ? 'bg-white border-rose-300 text-rose-900 placeholder-rose-400 focus:border-rose-500'
                                : 'bg-slate-950 border-rose-800 text-rose-200 placeholder-rose-500/50 focus:border-rose-500'
                            }`}
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
                <div className="md:hidden p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-medium flex items-center justify-between gap-1.5">
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
                  className={`overflow-x-auto border rounded-2xl shadow-xs scrollbar-thin ${
                    isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <table className="w-full text-right text-xs min-w-[850px]">
                    <thead
                      className={`font-black border-b sticky top-0 z-10 ${
                        isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
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
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                      {filteredRooms.map((rm, idx) => {
                        const isStopped = rm.status === 'Stopped' || rm.status === 'متوقفة';
                        const roomComputedCode = (rm.code && rm.code.trim()) ? rm.code.trim() : generateRoomCode(code || 'UNIT', extractFloorNumber(rm.floor), getRoomTypeCode(rm.type), rm.sequenceNumber || 101, true);
                        const isNonOcc = isNonOccupancyRoom(rm.type);
                        const isCap = isCapacityBasedRoom(rm.type);
                        const isVacant = isRoomVacant(rm.occupiedBy);

                        return (
                          <tr
                            key={rm.id}
                            className={`transition ${
                              isStopped
                                ? isLight ? 'bg-rose-50/60' : 'bg-rose-950/20'
                                : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'
                            }`}
                          >
                            <td className="p-2 text-center font-bold text-slate-400 font-mono text-[11px]">
                              {toArabicDigits(idx + 1)}
                            </td>

                            <td className="p-2">
                              <input
                                type="text"
                                value={rm.name}
                                onChange={(e) => handleUpdateRoom(rm.id, 'name', e.target.value)}
                                className={`w-full border rounded-lg px-2.5 py-1 text-xs outline-none font-bold ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                }`}
                              />
                            </td>

                            <td className="p-2">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="font-mono font-black text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 shrink-0" dir="ltr">
                                  {roomComputedCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRoomForQr({ ...rm, code: roomComputedCode })}
                                  className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 transition cursor-pointer shrink-0"
                                  title="استعراض وطباعة بطاقة QR للغرفة"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateSingleRoomCode(rm.id)}
                                  className="p-1 rounded-lg bg-slate-500/10 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
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
                                className={`w-full border rounded-lg px-2 py-1 text-xs outline-none ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                }`}
                              />
                            </td>

                            <td className="p-2">
                              <select
                                value={rm.floor}
                                onChange={(e) => handleUpdateRoom(rm.id, 'floor', e.target.value)}
                                className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                }`}
                              >
                                {Array.from({ length: Math.max(1, Number(floorsCount) || 1) }, (_, i) => `الطابق ${i + 1}`).map((flr) => (
                                  <option key={flr} value={flr}>{flr}</option>
                                ))}
                              </select>
                            </td>

                            <td className="p-2">
                              <input
                                type="number"
                                value={rm.areaSqM}
                                onChange={(e) => handleUpdateRoom(rm.id, 'areaSqM', Number(e.target.value))}
                                className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-amber-400'
                                }`}
                              />
                            </td>

                            <td className="p-2">
                              {isNonOcc ? (
                                <span className="text-slate-400 text-[11px] font-normal px-2 py-1 bg-slate-500/5 rounded-lg border border-slate-500/10 block text-center">
                                  — (غير مخصص)
                                </span>
                              ) : isCap ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={rm.capacity ?? ''}
                                    onChange={(e) => handleUpdateRoom(rm.id, 'capacity', Number(e.target.value) || 0)}
                                    className={`w-14 border rounded-lg px-1.5 py-1 text-xs font-bold outline-none text-center ${
                                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                    }`}
                                  />
                                  <span className="text-[10px] text-sky-500 font-bold whitespace-nowrap">طاقة</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={rm.occupantsCount ?? ''}
                                    onChange={(e) => handleUpdateRoom(rm.id, 'occupantsCount', Number(e.target.value) || 0)}
                                    className={`w-14 border rounded-lg px-1.5 py-1 text-xs font-bold outline-none text-center ${
                                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                    }`}
                                  />
                                  <span className="text-[10px] text-emerald-500 font-bold whitespace-nowrap">شاغل</span>
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
                                className={`w-full border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                }`}
                              >
                                <option value="">🏢 شاغرة (بدون إشغال)</option>
                                {selectedDepartments.map((deptName, deptIdx) => (
                                  <option key={deptName} value={deptName}>
                                    {deptIdx === 0 ? `★ ${deptName}` : `• ${deptName}`}
                                  </option>
                                ))}
                                {rm.occupiedBy && !selectedDepartments.includes(rm.occupiedBy) && (
                                  <option value={rm.occupiedBy}>{rm.occupiedBy} (مخصص)</option>
                                )}
                              </select>
                            </td>

                            <td className="p-2">
                              <select
                                value={rm.status}
                                onChange={(e) => handleUpdateRoom(rm.id, 'status', e.target.value)}
                                className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer ${
                                  isStopped
                                    ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                                }`}
                              >
                                <option value="Active">🟢 فعالة</option>
                                <option value="Stopped">🔴 متوقفة</option>
                                <option value="Vacant">⚪ شاغرة</option>
                                <option value="Maintenance">🟡 صيانة</option>
                              </select>
                            </td>

                            <td className="p-2">
                              <input
                                type="text"
                                value={rm.notes || ''}
                                onChange={(e) => handleUpdateRoom(rm.id, 'notes', e.target.value)}
                                placeholder={isStopped ? 'أدخل سبب التوقف...' : 'ملاحظات...'}
                                className={`w-full border rounded-lg px-2 py-1 text-xs outline-none ${
                                  isStopped
                                    ? isLight
                                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                                      : 'bg-rose-950/40 border-rose-800 text-rose-200'
                                    : isLight
                                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                                    : 'bg-slate-900 border-slate-800 text-slate-100'
                                }`}
                              />
                            </td>

                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRoom(rm.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
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
              </div>
            )}
          </div>
        </div>

        {/* ==================== SECTION 4 ==================== */}
        <div
          ref={section4Ref}
          className={`border rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-4 sm:space-y-6 scroll-mt-24 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs' : 'bg-slate-950 border-slate-800 text-slate-100'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs sm:text-sm shadow">
                {toArabicDigits(4)}
              </div>
              <div>
                <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  التقييم الهندسي المبدئي والمرفقات الرسمية
                </h3>
                <p className={`text-[11px] sm:text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  تحديد درجة الحالة الهندسية وإرفاق المحاضر والمخططات الرسمية
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 text-xs">
            {/* Condition Grade Selection (Daylight Cards) */}
            <div>
              <label className="block text-slate-100 font-bold mb-2.5 text-xs flex items-center justify-between">
                <span>درجة التقييم الهندسي (Condition Grade):</span>
                <span className="text-amber-400 font-normal text-[11px]">حدد تصنيف حالة المبنى/الكرفان</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { grade: 'A', label: 'ممتاز', desc: 'جديد / مطابق كلياً للمواصفات', color: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
                  { grade: 'B', label: 'جيد جداً', desc: 'صالح للعمل / حالة ممتازة', color: 'border-blue-500 text-blue-700 bg-blue-50' },
                  { grade: 'C', label: 'مقبول', desc: 'صيانة بسيطة / تشغيل اعتيادي', color: 'border-amber-500 text-amber-800 bg-amber-50' },
                  { grade: 'D', label: 'حرج', desc: 'يحتاج صيانة جذريّة وعمرة', color: 'border-rose-500 text-rose-800 bg-rose-50' },
                ].map((item) => {
                  const isSelected = conditionGrade === item.grade;
                  return (
                    <button
                      type="button"
                      key={item.grade}
                      onClick={() => setConditionGrade(item.grade as ConditionGrade)}
                      className={`p-3.5 rounded-2xl font-bold transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 shadow-sm border ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-[1.02]'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-amber-400/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-base font-black ${isSelected ? 'text-slate-950' : 'text-slate-900'}`}>
                          Grade {item.grade}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${isSelected ? 'bg-slate-950 text-amber-400' : item.color}`}>
                          {item.label}
                        </span>
                      </div>
                      <span className={`text-[11px] font-medium ${isSelected ? 'text-slate-900/90 font-bold' : 'text-slate-600'}`}>
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Official Attachments Uploader & List */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <label className="text-slate-100 font-bold flex items-center gap-2 text-sm">
                    <Paperclip className="w-4 h-4 text-amber-400" />
                    <span>المرفقات والوثائق الرسمية المعتمدة:</span>
                  </label>
                  <p className="text-[11px] text-amber-400/90 font-medium mt-1">
                    يمكن رفع الملفات الخاصة بالـ (صور بكافة أنواعها وامتداداتها - PDF - فيديو بكافة أنواعه وامتداداته) فقط
                  </p>
                </div>
                <label className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition shadow shrink-0">
                  <UploadCloud className="w-4 h-4" />
                  <span>إرفاق ملف جديد</span>
                  <input type="file" accept="image/*,application/pdf,video/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Attachments List */}
              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((file) => {
                    const isImage = file.type.includes('صورة') || file.type.includes('image');
                    const isVideo = file.type.includes('فيديو') || file.type.includes('video');

                    return (
                      <div
                        key={file.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
                            {isImage ? (
                              <Image className="w-5 h-5 text-emerald-400" />
                            ) : isVideo ? (
                              <Film className="w-5 h-5 text-purple-400" />
                            ) : (
                              <FileText className="w-5 h-5 text-amber-400" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-bold text-slate-200 truncate text-xs">{file.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {file.type} • {file.size} • {file.uploadDate}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewAttachment(file)}
                            className="bg-slate-800 hover:bg-amber-500/10 text-slate-300 hover:text-amber-400 p-2 rounded-xl transition cursor-pointer border border-slate-700/80"
                            title="عرض / معاينة المرفق"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file)}
                            className="bg-slate-800 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 p-2 rounded-xl transition cursor-pointer border border-slate-700/80"
                            title="تنزيل المرفق"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(file.id)}
                            className="bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 p-2 rounded-xl transition cursor-pointer border border-slate-700/80"
                            title="حذف المرفق"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
                  لا توجد مرفقات رسمية مضافة حتى الآن
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== BOTTOM FORM ACTIONS ==================== */}
        <div
          className={`border rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={onCancel}
            className={`w-full sm:w-auto text-xs px-6 py-3 rounded-xl font-bold transition cursor-pointer border flex items-center justify-center gap-2 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>تراجع / إلغاء</span>
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm px-8 py-3 rounded-xl font-black shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>حفظ الوحدة وتوليد الهوية القياسية</span>
          </button>
        </div>

        {/* ==================== GENERATED STRUCTURAL CODE & QR CODE SECTION (Post-Save) ==================== */}
        {createdUnitWithQr && (
          <div className="bg-slate-950 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-amber-500/10 text-slate-100 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-400">تم حفظ الوحدة وتوليد الرمز الهيكلي ورمز QR بنجاح!</h3>
                  <p className="text-xs text-slate-400">الرمز الموحد ورمز الوصول السريع جاهزان للطباعة على شريحة معدنية والتثبيت الميداني</p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 shrink-0 self-start md:self-auto">
                <CheckCircle2 className="w-4 h-4" />
                <span>محفوظة في السجل الرقمي</span>
              </span>
            </div>

            {/* Grid displaying Generated Structural Code and QR Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-900 border border-slate-800 rounded-2xl p-6">
              {/* Structural Code Box */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  الرمز الهيكلي الموحد المولد (Code):
                </span>
                <div className="bg-slate-950 border-2 border-amber-500/60 rounded-2xl p-4 text-center font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-widest shadow-inner">
                  {createdUnitWithQr.unit.code}
                </div>
                <div className="text-xs text-slate-300 space-y-1 pt-1">
                  <p><strong>اسم المنشأة:</strong> {createdUnitWithQr.unit.name}</p>
                  <p><strong>الموقع الميداني:</strong> {createdUnitWithQr.unit.governorate} • {createdUnitWithQr.unit.field}</p>
                  <p><strong>سنة الإنشاء:</strong> {createdUnitWithQr.unit.constructionYear}</p>
                  {createdUnitWithQr.unit.fixedAssetCode && (
                    <p className="text-indigo-400 font-mono font-bold"><strong>رمز الأصل:</strong> {createdUnitWithQr.unit.fixedAssetCode}</p>
                  )}
                </div>
              </div>

              {/* QR Code Box */}
              <div className="flex flex-col items-center justify-center space-y-3 border-t md:border-t-0 md:border-r border-slate-800 pt-4 md:pt-0 md:pr-6">
                <span className="text-xs font-bold text-slate-400 block">
                  رمز الوصول السريع (QR Code):
                </span>
                <div className="bg-white p-3 rounded-2xl border-2 border-amber-500/50 shadow-md">
                  <img
                    src={createdUnitWithQr.qrDataUrl}
                    alt="QR Code"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center font-medium">
                  يتضمن كافة البيانات التعريفية والموقع الجغرافي للمسح الفوري
                </p>
              </div>
            </div>

            {/* Bottom Actions: Print Metallic Plate, Download QR, Finish */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintQrCard}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-6 py-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الشريحة المعدنية / الرمز والهوية</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQrImage}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-5 py-3.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>تحميل صورة الرمز (PNG)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleFinishAndNavigate}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3.5 rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                <span>الإنهاء والعودة إلى جدول الوحدات</span>
              </button>
            </div>
          </div>
        )}
      </form>

      {/* ==================== MODAL: Add New Governorate ==================== */}
      {showAddGovModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>إضافة محافظة عراقية جديدة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddGovModal(false)}
                className="text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المحافظة:</label>
                <input
                  type="text"
                  required
                  value={newGovNameAr}
                  onChange={(e) => setNewGovNameAr(e.target.value)}
                  placeholder="مثال: محافظة كركوك"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الرمز الموحد (Code):</label>
                <input
                  type="text"
                  required
                  value={newGovCode}
                  onChange={(e) => setNewGovCode(e.target.value)}
                  placeholder="مثال: KIR"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGovModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewGov()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 rounded-xl font-bold cursor-pointer shadow"
                >
                  حفظ واختيار المحافظة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Add New Oilfield ==================== */}
      {showAddFieldModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>إضافة حقل نفطي جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFieldModal(false)}
                className="text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم الحقل النفطي:</label>
                <input
                  type="text"
                  required
                  value={newFieldNameAr}
                  onChange={(e) => setNewFieldNameAr(e.target.value)}
                  placeholder="مثال: حقل مجنون النفطي"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الرمز الموحد (Code):</label>
                <input
                  type="text"
                  required
                  value={newFieldCode}
                  onChange={(e) => setNewFieldCode(e.target.value)}
                  placeholder="مثال: MAJ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddFieldModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewOilfield()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 rounded-xl font-bold cursor-pointer shadow"
                >
                  حفظ واختيار الحقل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Add New Reference Unit Type ==================== */}
      {showAddUnitTypeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>إضافة فئة ونوع منشأة مرجعي جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUnitTypeModal(false)}
                className="text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم فئة المنشأة (بالعربية):</label>
                <input
                  type="text"
                  required
                  value={newUtNameAr}
                  onChange={(e) => setNewUtNameAr(e.target.value)}
                  placeholder="مثال: وحدة معالجة المياه"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">رمز الفئة (Code):</label>
                <input
                  type="text"
                  required
                  value={newUtCode}
                  onChange={(e) => setNewUtCode(e.target.value.toUpperCase())}
                  placeholder="مثال: WTP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="multiStoryCheck"
                  checked={newUtMultiStory}
                  onChange={(e) => setNewUtMultiStory(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="multiStoryCheck" className="text-slate-300 font-bold cursor-pointer">
                  منشأة متعددة الطوابق
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">نوع السقف الافتراضي:</label>
                <select
                  value={newUtDefaultRoof}
                  onChange={(e) => setNewUtDefaultRoof(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option value="ساندويج بانل">ساندويج بانل</option>
                  <option value="كونكريت">كونكريت</option>
                  <option value="حديد شينكو">حديد شينكو</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUnitTypeModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewUnitType()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 rounded-xl font-bold cursor-pointer shadow"
                >
                  حفظ واختيار الفئة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Attachment Preview / View ==================== */}
      {previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment}
          theme={theme}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
      {/* ==================== MODAL: Success & Generated QR Code ==================== */}
      {createdUnitWithQr && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-xl space-y-6 shadow-2xl relative text-center">
            {/* Header / Success Indicator */}
            <div className="space-y-2">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-100">تم حفظ الأصل وتوليد رمز QR بنجاح!</h2>
              <p className="text-xs text-slate-400">
                تم تسجيل الوحدة في السجل الهيكلي الرقمي وتوليد رمز الوصول السريع المعتمد للمتابعة الميدانية.
              </p>
            </div>

            {/* Generated QR Code Display Box */}
            <div className="bg-white border-2 border-amber-400/80 rounded-2xl p-5 max-w-xs mx-auto shadow-xl space-y-3">
              <div className="text-slate-950 font-black text-xs tracking-wider font-mono bg-amber-100 py-1.5 px-3 rounded-lg border border-amber-300/80">
                {createdUnitWithQr.unit.code}
              </div>
              <img
                src={createdUnitWithQr.qrDataUrl}
                alt={`QR Code ${createdUnitWithQr.unit.code}`}
                className="w-52 h-52 mx-auto object-contain rounded-lg border border-slate-200 p-1"
              />
              <div className="text-slate-800 font-bold text-xs truncate">
                {createdUnitWithQr.unit.name}
              </div>
            </div>

            {/* Unit Info Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-right grid grid-cols-2 gap-3 font-medium">
              <div>
                <span className="text-slate-500 block mb-0.5">الحقل والمحافظة:</span>
                <span className="text-slate-200 font-bold">{createdUnitWithQr.unit.governorate} • {createdUnitWithQr.unit.field}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">نوع المنشأة:</span>
                <span className="text-slate-200 font-bold">{createdUnitWithQr.unit.type === 'caravan' ? 'كرفان موقعي' : 'مبنى ثابت'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">درجة التقييم:</span>
                <span className="text-amber-400 font-bold">Grade {createdUnitWithQr.unit.conditionGrade}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">الإحداثيات الجغرافية:</span>
                <span className="text-slate-300 font-mono">{createdUnitWithQr.unit.coordinates.lat.toFixed(4)}, {createdUnitWithQr.unit.coordinates.lng.toFixed(4)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintQrCard}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة بطاقة QR</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQrImage}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow"
              >
                <Download className="w-4 h-4" />
                <span>تحميل صورة QR</span>
              </button>

              <button
                type="button"
                onClick={handleFinishAndNavigate}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>انتقال إلى إدارة الوحـدات</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Dialog for Adding New Saved Department */}
      {/* Quick Add Org Entity Modal (Linked to Org Structure) */}
      {showAddDeptModal && (
        <QuickAddOrgEntityModal
          isOpen={showAddDeptModal}
          onClose={() => setShowAddDeptModal(false)}
          isLight={isLight}
          orgEntities={orgEntities}
          onAddOrgEntity={onAddOrgEntity || (() => {})}
          onSelectNewlyCreated={(newDeptName) => {
            setDepartment(newDeptName);
          }}
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

      {/* Room QR Card Modal */}
      {selectedRoomForQr && (
        <RoomQrCardModal
          unit={{
            id: code || 'NEW-UNIT',
            code: code || 'NEW-UNIT',
            name: name || 'منشأة جديدة',
            type: (selectedUnitType === 'CRV' ? 'caravan' : selectedUnitType === 'BLD' ? 'building' : selectedUnitType === 'WHS' ? 'warehouse' : 'building') as UnitType,
            field: availableOilfields.find((f) => f.id === fieldId)?.nameAr || 'الحقل النفطي',
            governorate: governorates.find((g) => g.id === governorateId)?.nameAr || 'المحافظة',
            constructionYear: Number(constructionYear) || new Date().getFullYear(),
            department: selectedDepartments.join(' ، ') || department || '',
            coordinates: { lat: Number(lat) || 0, lng: Number(lng) || 0 },
            sectorAddress: '',
            totalAreaSqM: Number(areaSqM) || 0,
            floorsCount: Number(floorsCount) || 1,
            conditionGrade: (conditionGrade || 'A') as ConditionGrade,
            rooms: rooms,
            equipment: [],
            attachmentsCount: attachments.length,
            lastUpdated: getServerDateFormatted(),
          }}
          room={selectedRoomForQr}
          allRooms={rooms}
          theme={theme}
          onClose={() => setSelectedRoomForQr(null)}
        />
      )}
    </div>
  );
};
