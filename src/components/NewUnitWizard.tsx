import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import {
  UnitAsset,
  ConditionGrade,
  GovernorateRef,
  OilfieldRef,
  SiteRef,
  ReferenceUnitType,
  EquipmentTypeRef,
  OrgEntity,
} from '../types';
import { QuickAddOrgEntityModal } from './QuickAddOrgEntityModal';
import { LocationPickerMap } from './LocationPickerMap';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { toArabicDigits } from '../utils/arabicUtils';

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
  sites: SiteRef[];
  unitTypes: ReferenceUnitType[];
  equipmentTypes: EquipmentTypeRef[];
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
  sites,
  unitTypes,
  equipmentTypes,
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

  // Floor Occupancy Counts & Custom Rooms
  const DEFAULT_FLOOR_ROOM_COUNTS = {
    standardRooms: 0,
    meetingHalls: 0,
    trainingHalls: 0,
    workshops: 0,
    equipmentRooms: 0,
    serviceRooms: 0,
    storageRooms: 0,
    restrooms: 0,
    kitchens: 0,
    diningHalls: 0,
    bedrooms: 0,
  };

  const [floorsRoomCountsMap, setFloorsRoomCountsMap] = useState<{ [floorNum: number]: any }>({});

  const generateRoomsForFloor = (floorNum: number, counts: any, deptOwner: string) => {
    const list: any[] = [];
    let seq = 1;

    const addCat = (cnt: number, key: string, label: string, prefix: string, area: number) => {
      for (let i = 1; i <= cnt; i++) {
        const numStr = `${floorNum}${seq.toString().padStart(2, '0')}`;
        list.push({
          id: `RM-F${floorNum}-${numStr}-${Math.random().toString(36).substr(2, 4)}`,
          floorNumber: floorNum,
          roomNumber: numStr,
          name: cnt === 1 ? prefix : `${prefix} (${i})`,
          categoryKey: key,
          categoryLabel: label,
          areaSqM: area,
          occupiedBy: deptOwner,
          capacity: key === 'meetingHalls' || key === 'diningHalls' || key === 'trainingHalls' ? 12 : 2,
        });
        seq++;
      }
    };

    addCat(counts.standardRooms || 0, 'standardRooms', 'غرفة / مكتب', 'مكتب إداري', 25);
    addCat(counts.meetingHalls || 0, 'meetingHalls', 'قاعة اجتماعات', 'قاعة اجتماعات', 40);
    addCat(counts.trainingHalls || 0, 'trainingHalls', 'قاعة تدريب', 'قاعة تدريب', 50);
    addCat(counts.workshops || 0, 'workshops', 'ورشة فنية', 'ورشة عمل', 45);
    addCat(counts.equipmentRooms || 0, 'equipmentRooms', 'غرفة معدات', 'غرفة معدات وسيرفرات', 20);
    addCat(counts.serviceRooms || 0, 'serviceRooms', 'غرفة خدمات', 'غرفة خدمات صيانة', 15);
    addCat(counts.storageRooms || 0, 'storageRooms', 'غرفة مخزن', 'مخزن أصول', 30);
    addCat(counts.restrooms || 0, 'restrooms', 'دورة مياه صحية', 'دورة مياه صحية', 10);
    addCat(counts.kitchens || 0, 'kitchens', 'مطبخ / بوفيه', 'مطبخ / بوفيه', 18);
    addCat(counts.diningHalls || 0, 'diningHalls', 'قاعة طعام', 'قاعة طعام', 60);
    addCat(counts.bedrooms || 0, 'bedrooms', 'غرفة نوم / سكن', 'غرفة نوم سكنية', 22);

    return list;
  };

  const [detailedRoomsMap, setDetailedRoomsMap] = useState<{ [floorNum: number]: any[] }>({});

  // Keep floors state in sync when floorsCount changes
  useEffect(() => {
    const fCount = typeof floorsCount === 'number' ? floorsCount : 0;
    if (fCount > 0) {
      setFloorsRoomCountsMap((prev) => {
        const next = { ...prev };
        for (let f = 1; f <= fCount; f++) {
          if (!next[f]) {
            next[f] = { ...DEFAULT_FLOOR_ROOM_COUNTS };
          }
        }
        return next;
      });

      setDetailedRoomsMap((prev) => {
        const next = { ...prev };
        for (let f = 1; f <= fCount; f++) {
          if (!next[f]) {
            const counts = floorsRoomCountsMap[f] || DEFAULT_FLOOR_ROOM_COUNTS;
            next[f] = generateRoomsForFloor(f, counts, department);
          }
        }
        return next;
      });
    }
  }, [floorsCount]);

  const handleUpdateFloorRoomCount = (floorNum: number, categoryKey: string, newVal: number) => {
    const validVal = Math.max(0, newVal);
    const updatedCounts = {
      ...(floorsRoomCountsMap[floorNum] || DEFAULT_FLOOR_ROOM_COUNTS),
      [categoryKey]: validVal,
    };

    setFloorsRoomCountsMap((prev) => ({
      ...prev,
      [floorNum]: updatedCounts,
    }));

    const regenerated = generateRoomsForFloor(floorNum, updatedCounts, department);
    setDetailedRoomsMap((prev) => ({
      ...prev,
      [floorNum]: regenerated,
    }));
  };

  const handleUpdateRoomField = (floorNum: number, roomId: string, fieldName: string, val: any) => {
    setDetailedRoomsMap((prev) => {
      const currentList = prev[floorNum] || [];
      const updatedList = currentList.map((rm) => (rm.id === roomId ? { ...rm, [fieldName]: val } : rm));
      return { ...prev, [floorNum]: updatedList };
    });
  };

  const handleDeleteRoom = (floorNum: number, roomId: string) => {
    setDetailedRoomsMap((prev) => {
      const currentList = prev[floorNum] || [];
      return { ...prev, [floorNum]: currentList.filter((rm) => rm.id !== roomId) };
    });
  };

  const handleAddCustomRoom = (floorNum: number) => {
    setDetailedRoomsMap((prev) => {
      const currentList = prev[floorNum] || [];
      const seq = currentList.length + 1;
      const numStr = `${floorNum}${seq.toString().padStart(2, '0')}`;
      const newRoom = {
        id: `RM-F${floorNum}-${numStr}-${Math.random().toString(36).substr(2, 4)}`,
        floorNumber: floorNum,
        roomNumber: numStr,
        name: `غرفة مخصصة ${numStr}`,
        categoryKey: 'standardRooms',
        categoryLabel: 'غرفة / مكتب',
        areaSqM: 20,
        occupiedBy: department,
        capacity: 2,
      };
      return { ...prev, [floorNum]: [...currentList, newRoom] };
    });
  };

  // Form State - Equipment Selection & Location
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [equipmentLocationsMap, setEquipmentLocationsMap] = useState<{ [eqId: string]: 'roof' | 'perimeter' | 'inside' }>({});

  // Form State - Evaluation & Condition
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade | ''>('');

  // Form State - Official Attachments
  const [attachments, setAttachments] = useState<AttachedFileItem[]>([]);

  // Modal Dialog States for Adding New Governorate / Oilfield / Unit Type / Equipment
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

  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [newEqNameAr, setNewEqNameAr] = useState('');
  const [newEqCode, setNewEqCode] = useState('');
  const [newEqCapacity, setNewEqCapacity] = useState('قياسي');
  const [newEqGeometry, setNewEqGeometry] = useState<'box' | 'cylinder' | 'wall_panel' | 'camera' | 'pump'>('box');

  // Active section scroll refs
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);
  const section5Ref = useRef<HTMLDivElement>(null);

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
    const randomNum = Math.floor(100 + Math.random() * 900);

    const generated = `${govPrefix}-${fieldPrefix}-${typePrefix}-${randomNum}`;
    setCode(generated);
    return generated;
  };

  const toggleEquipment = (eqId: string) => {
    setSelectedEquipmentIds((prev) =>
      prev.includes(eqId) ? prev.filter((id) => id !== eqId) : [...prev, eqId]
    );
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

  const handleSaveNewEquipment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newEqNameAr) return;

    const generatedCode = (newEqCode || `EQ_${Date.now().toString().slice(-4)}`).toUpperCase();
    const generatedId = `EQT-${Date.now()}`;
    const newEquipmentItem: EquipmentTypeRef = {
      id: generatedId,
      code: generatedCode,
      nameAr: newEqNameAr,
      iconName: 'Zap',
      renderGeometry: newEqGeometry,
      defaultCapacity: newEqCapacity || 'قياسي',
      status: 'active',
    };

    if (onAddEquipmentType) {
      onAddEquipmentType(newEquipmentItem);
    }

    // Automatically check and add this equipment to the current unit creation
    setSelectedEquipmentIds((prev) => [...prev, generatedId]);

    setShowAddEquipmentModal(false);
    setNewEqNameAr('');
    setNewEqCode('');
    setNewEqCapacity('قياسي');
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
          uploadDate: toArabicDigits(new Date().toLocaleDateString('ar-IQ')),
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

    // Generate Unified Structural Code upon saving
    const generatedCode = handleGenerateCode();

    const selectedGov = governorates.find((g) => g.id === governorateId);
    const selectedFld = oilfields.find((f) => f.id === fieldId);

    // Convert selected EquipmentRef IDs to UnitEquipmentItem with precise chosen locations
    const selectedEquipmentList = equipmentTypes
      .filter((eq) => selectedEquipmentIds.includes(eq.id))
      .map((eq, idx) => {
        const locKey = equipmentLocationsMap[eq.id] || (eq.code.includes('TNK') || eq.nameAr.includes('تكييف') || eq.nameAr.includes('خزان') ? 'roof' : eq.nameAr.includes('مولد') || eq.nameAr.includes('ضخ') ? 'perimeter' : 'inside');
        const locLabel =
          locKey === 'roof'
            ? 'سقف الوحدة'
            : locKey === 'perimeter'
            ? 'المحيط الخارجي للوحدة'
            : 'داخل الوحدة';
        return {
          id: `EQ-${idx + 101}`,
          name: eq.nameAr,
          type: eq.code,
          status: 'Active' as const,
          location: locLabel,
          capacity: eq.defaultCapacity,
        };
      });

    // Aggregate rooms from all floors
    const aggregatedRoomsList = Object.values(detailedRoomsMap)
      .flat()
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.categoryLabel,
        areaSqM: r.areaSqM,
        floor: `الطابق ${r.floorNumber}`,
        status: 'Active' as const,
        occupiedBy: r.occupiedBy || (selectedDepartments[0] || department || 'غير محدد'),
        notes: `رمز/رقم الغرفة: ${r.roomNumber}`,
      }));

    const finalDept = selectedDepartments.length > 0 ? selectedDepartments.join(' ، ') : (department || 'غير محدد');

    const newUnit: UnitAsset = {
      id: generatedCode,
      code: generatedCode,
      name: name.trim(),
      type: selectedUnitType === 'CRV' ? 'caravan' : 'building',
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
        showTrees: true,
      },
      floorsCount: Number(floorsCount),
      rooms: aggregatedRoomsList,
      equipment: selectedEquipmentList,
      attachmentsCount: attachments.length,
      lastUpdated: toArabicDigits(new Date().toLocaleDateString('ar-IQ')),
    };

    // Generate QR Code data URL
    const qrPayload = JSON.stringify({
      code: newUnit.code,
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
                  <div class="meta-item"><strong>درجة التقييم:</strong> Grade ${createdUnitWithQr.unit.conditionGrade}</div>
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
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden space-y-6 pb-8">
      {/* Page Header Window Toolbar */}
      <div className="bg-slate-950 border-b border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>تسجيل أصل جديد - نظام حركي ديناميكي</span>
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 mt-2 flex items-center gap-2">
            استمارة إدخال وحدة / مبنى / كرفان جديد
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            نافذة تسجيل موحدة تضم كافة البيانات التعريفية والموقع الجغرافي الخياري والمعدات الهندسية والتقييم
          </p>
        </div>
      </div>

      {/* Main Single Form Body */}
      <form onSubmit={handleSubmit} className="px-6 space-y-8">
        {/* ==================== SECTION 1 ==================== */}
        <div ref={section1Ref} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5 scroll-mt-24">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                {toArabicDigits(1)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">البيانات التعريفية والرمز والهوية القياسية</h3>
                <p className="text-xs text-slate-400">تحديد نوع المنشأة والاسم والرمز الموحد وسنة الإنشاء</p>
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


          </div>
        </div>

        {/* ==================== SECTION 2 ==================== */}
        <div ref={section2Ref} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5 scroll-mt-24">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                {toArabicDigits(2)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">الموقع والإحداثيات الجغرافية والخريطة التفاعلية</h3>
                <p className="text-xs text-slate-400">تحديد المحافظة، الحقل النفطي، وإحداثيات الموقع عبر خريطة حية أو إدخال يدوي</p>
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
                <label className="text-slate-200 font-bold flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>التحديد الجغرافي المباشر عبر الخريطة الحية:</span>
                </label>
                <span className="text-[11px] text-slate-400">
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
              />

              {/* Manual Lat/Lng Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <label className="block text-slate-400 font-bold text-[11px]">خط العرض (GPS Latitude):</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 32.6189"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-400 font-bold text-sm focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <label className="block text-slate-400 font-bold text-[11px]">خط الطول (GPS Longitude):</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 45.7531"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-400 font-bold text-sm focus:border-amber-500 outline-none"
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

                {/* Dropdown to add an entity from Org Structure */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDeptToAdd}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleAddDepartment(val);
                      }
                    }}
                    className={`w-full border rounded-xl p-2.5 font-bold text-xs focus:border-amber-500 outline-none transition cursor-pointer ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}
                  >
                    <option value="">-- اختر جهة شاغلة لإضافتها للمنشأة --</option>
                    {orgEntities
                      .filter((e) => e.status === 'active' && !selectedDepartments.includes(e.nameAr))
                      .map((ent) => (
                        <option key={ent.id} value={ent.nameAr}>
                          {ent.nameAr} ({ent.code}) - الكادر: {toArabicDigits(ent.employeeCount || 0)} موظف
                        </option>
                      ))}
                  </select>
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
                      لم يتم اختيار جهات شاغلة بعد. اختر جهة من القائمة أعلاه أو أضف جهة جديدة.
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
          <div className="space-y-6 pt-2">
            <div className={`flex items-center justify-between p-3.5 border rounded-2xl ${isLight ? 'bg-amber-500/10 border-amber-300 text-slate-900' : 'bg-slate-900/80 border-slate-800 text-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Layers className={`w-4 h-4 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                <h4 className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  تفاصيل وحصر غرف وقاعات كل طابق (إجمالي الطوابق: {floorsCount})
                </h4>
              </div>
              <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                تترك الخانات فارغة لإدخال البيانات عند التسجيل كطلب المستخدم
              </span>
            </div>

            {Array.from({ length: floorsCount }, (_, i) => i + 1).map((floorNum) => {
              const counts = floorsRoomCountsMap[floorNum] || DEFAULT_FLOOR_ROOM_COUNTS;
              const roomsList = detailedRoomsMap[floorNum] || [];

              const roomCategories: { key: string; label: string; icon: string }[] = [
                { key: 'standardRooms', label: 'الغرف (المكاتب)', icon: '🏢' },
                { key: 'meetingHalls', label: 'قاعات الاجتماعات', icon: '👥' },
                { key: 'trainingHalls', label: 'قاعات التدريب', icon: '🎓' },
                { key: 'workshops', label: 'الورش الفنية', icon: '🛠️' },
                { key: 'equipmentRooms', label: 'غرف المعدات', icon: '⚡' },
                { key: 'serviceRooms', label: 'غرف الخدمات', icon: '🧹' },
                { key: 'storageRooms', label: 'غرف المخزن', icon: '📦' },
                { key: 'restrooms', label: 'دورات المياه الصحية', icon: '🚽' },
                { key: 'kitchens', label: 'المطابخ / البوفيه', icon: '🍳' },
                { key: 'diningHalls', label: 'قاعات الطعام', icon: '🍽️' },
                { key: 'bedrooms', label: 'غرف النوم / السكن', icon: '🛏️' },
              ];

              return (
                <div key={floorNum} className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm transition-colors ${isLight ? 'bg-slate-50/90 border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
                  {/* Floor Header */}
                  <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 border font-black rounded-lg text-xs ${isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                        الطابق {floorNum}
                      </span>
                      <h5 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        توزيع أعداد الغرف والقاعات المخصصة للطابق {floorNum}
                      </h5>
                    </div>
                    <span className={`text-xs font-mono font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                      إجمالي المخصص: {roomsList.length} وحدة / غرفة
                    </span>
                  </div>

                  {/* 11 Categories Counters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                    {roomCategories.map((cat) => (
                      <div
                        key={cat.key}
                        className={`border rounded-xl p-2.5 flex flex-col justify-between transition ${isLight ? 'bg-white border-slate-200 hover:border-amber-400 text-slate-900' : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'}`}
                      >
                        <span className={`text-[11px] font-bold flex items-center gap-1.5 truncate mb-1.5 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                          <span>{cat.icon}</span>
                          <span className="truncate">{cat.label}</span>
                        </span>

                        <div className={`flex items-center justify-between border rounded-lg p-1 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateFloorRoomCount(floorNum, cat.key, (counts[cat.key] || 0) - 1)
                            }
                            className={`w-6 h-6 rounded font-bold flex items-center justify-center transition cursor-pointer ${isLight ? 'bg-white border border-slate-300 hover:bg-slate-200 text-slate-800 shadow-xs' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                          >
                            -
                          </button>
                          <span className={`font-mono font-black text-xs px-2 ${isLight ? 'text-slate-900' : 'text-amber-400'}`}>
                            {counts[cat.key] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateFloorRoomCount(floorNum, cat.key, (counts[cat.key] || 0) + 1)
                            }
                            className={`w-6 h-6 rounded font-bold flex items-center justify-center transition cursor-pointer ${isLight ? 'bg-white border border-slate-300 hover:bg-slate-200 text-slate-800 shadow-xs' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Room Customization Table */}
                  <div className="pt-2 space-y-3">
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-xl p-3 ${isLight ? 'bg-amber-50/80 border-amber-200 text-slate-900' : 'bg-slate-950 border-slate-800/80'}`}>
                      <div>
                        <h6 className={`font-bold text-xs flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                          <CheckCircle2 className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                          <span>قائمة ترقيم وتخصيص الغرف للطابق {floorNum}</span>
                        </h6>
                        <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          يمكنك تعديل أرقام الغرف، أسماء التخصيص، وتعيين جهة شاغلة مستقلة لكل غرفة
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddCustomRoom(floorNum)}
                        className={`border px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition ${isLight ? 'bg-white hover:bg-slate-100 text-amber-800 border-amber-300 shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة غرفة مخصصة للطابق</span>
                      </button>
                    </div>

                    {roomsList.length === 0 ? (
                      <div className={`p-6 text-center text-xs border border-dashed rounded-xl font-medium ${isLight ? 'bg-white text-slate-500 border-slate-300' : 'bg-slate-950/50 text-slate-500 border-slate-800'}`}>
                        لم يتم إضافة أو تحديد أي غرف لهذا الطابق بعد. يمكنك زيادة العدد أعلاه أو الضغط على "إضافة غرفة مخصصة".
                      </div>
                    ) : (
                      <div className={`overflow-x-auto border rounded-xl shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-900/50'}`}>
                        <table className="w-full text-right text-xs">
                          <thead className={`font-bold border-b ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                            <tr>
                              <th className="p-2.5">رمز/رقم الغرفة</th>
                              <th className="p-2.5">تسمية وتخصيص الغرفة</th>
                              <th className="p-2.5">الفئة</th>
                              <th className="p-2.5">الجهة الشاغلة للغرفة</th>
                              <th className="p-2.5">الطاقة (أفراد)</th>
                              <th className="p-2.5 text-center">حذف</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800/60 text-slate-300'}`}>
                            {roomsList.map((rm: any) => (
                              <tr key={rm.id} className={`transition ${isLight ? 'hover:bg-amber-50/50' : 'hover:bg-slate-800/30'}`}>
                                <td className="p-2 w-28">
                                  <input
                                    type="text"
                                    value={rm.roomNumber}
                                    onChange={(e) =>
                                      handleUpdateRoomField(floorNum, rm.id, 'roomNumber', e.target.value)
                                    }
                                    className={`w-full border rounded-lg px-2 py-1 font-mono font-bold text-xs outline-none ${isLight ? 'bg-white border-slate-300 text-amber-700 focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-amber-400 focus:border-amber-500'}`}
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={rm.name}
                                    onChange={(e) =>
                                      handleUpdateRoomField(floorNum, rm.id, 'name', e.target.value)
                                    }
                                    className={`w-full border rounded-lg px-2.5 py-1 text-xs outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 font-medium focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'}`}
                                  />
                                </td>
                                <td className="p-2 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded text-[11px] font-semibold border ${isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                    {rm.categoryLabel}
                                  </span>
                                </td>
                                <td className="p-2">
                                  <select
                                    value={rm.occupiedBy || (selectedDepartments[0] || department)}
                                    onChange={(e) =>
                                      handleUpdateRoomField(floorNum, rm.id, 'occupiedBy', e.target.value)
                                    }
                                    className={`w-full border rounded-lg px-2 py-1 text-xs cursor-pointer outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 font-medium focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-300 focus:border-amber-500'}`}
                                  >
                                    {selectedDepartments.length > 0 && (
                                      <optgroup label="الجهات الشاغلة للمنشأة">
                                        {selectedDepartments.map((deptName) => (
                                          <option key={deptName} value={deptName}>
                                            ★ {deptName}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    <optgroup label="كافة تشكيلات الهيكل التنظيمي">
                                      {orgEntities.filter((e) => e.status === 'active').map((ent) => (
                                        <option key={ent.id} value={ent.nameAr}>
                                          {ent.nameAr} ({ent.code})
                                        </option>
                                      ))}
                                    </optgroup>
                                    {rm.occupiedBy && !orgEntities.some((e) => e.nameAr === rm.occupiedBy) && !selectedDepartments.includes(rm.occupiedBy) && (
                                      <option value={rm.occupiedBy}>{rm.occupiedBy}</option>
                                    )}
                                  </select>
                                </td>
                                <td className="p-2 w-20">
                                  <input
                                    type="number"
                                    min={1}
                                    value={rm.capacity || 1}
                                    onChange={(e) =>
                                      handleUpdateRoomField(floorNum, rm.id, 'capacity', Number(e.target.value))
                                    }
                                    className={`w-full border rounded-lg px-2 py-1 font-bold text-xs outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'}`}
                                  />
                                </td>
                                <td className="p-2 text-center w-12">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRoom(floorNum, rm.id)}
                                    className={`p-1 rounded transition cursor-pointer ${isLight ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'}`}
                                    title="حذف الغرفة"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
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
              );
            })}
          </div>
        </div>

        {/* ==================== SECTION 4 ==================== */}
        <div ref={section4Ref} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                {toArabicDigits(4)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">المعدات والملحقات المرفقة</h3>
                <p className="text-xs text-slate-400">تحديد المولدات، التكييف، سلامة الحريق والمعدات الميدانية</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddEquipmentModal(true)}
                className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-1.5 rounded-xl border border-amber-500/30 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة معدة/ملحق جديد</span>
              </button>
              <span className="text-[11px] text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-bold">
                محددة: {selectedEquipmentIds.length} معدات
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-400">
              اختر المنظومات الملحقة بالأصل ليتم عرضها ومحاكاتها تلقائياً على نموذج الـ 3D التفاعلي:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {equipmentTypes
                .filter((eq) => eq.status === 'active')
                .map((eq) => {
                  const isSelected = selectedEquipmentIds.includes(eq.id);
                  const currentLoc =
                    equipmentLocationsMap[eq.id] ||
                    (eq.code.includes('TNK') || eq.nameAr.includes('تكييف') || eq.nameAr.includes('خزان')
                      ? 'roof'
                      : eq.nameAr.includes('مولد') || eq.nameAr.includes('ضخ')
                      ? 'perimeter'
                      : 'inside');

                  return (
                    <div
                      key={eq.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-slate-100 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div
                        onClick={() => toggleEquipment(eq.id)}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-200">{eq.nameAr}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {eq.defaultCapacity || eq.renderGeometry}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                            isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Attachment Location Selector */}
                      {isSelected && (
                        <div className="pt-2 border-t border-amber-500/30 flex flex-col gap-1 text-[11px]" onClick={(e) => e.stopPropagation()}>
                          <span className="font-bold text-amber-400">تحديد موقع التثبيت في الـ 3D:</span>
                          <select
                            value={currentLoc}
                            onChange={(e) =>
                              setEquipmentLocationsMap((prev) => ({
                                ...prev,
                                [eq.id]: e.target.value as 'roof' | 'perimeter' | 'inside',
                              }))
                            }
                            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-1.5 font-bold outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="roof">🏢 سقف الوحدة (Unit Roof)</option>
                            <option value="perimeter">🌳 المحيط الخارجي للوحدة (Outer Perimeter)</option>
                            <option value="inside">🚪 داخل الوحدة (Inside Unit)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* ==================== SECTION 5 ==================== */}
        <div ref={section5Ref} className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                {toArabicDigits(5)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">التقييم الهندسي المبدئي والمرفقات الرسمية</h3>
                <p className="text-xs text-slate-400">تحديد درجة الحالة الهندسية وإرفاق المحاضر والمخططات الرسمية</p>
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
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-6 py-3.5 rounded-2xl font-bold transition cursor-pointer border border-slate-700 flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>تراجع / إلغاء</span>
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
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

      {/* ==================== MODAL: Add New Equipment / Accessory ==================== */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>إضافة معدة / ملحق جديد للسهام الميدانية</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEquipmentModal(false)}
                className="text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المعدة / الملحق (بالعربية):</label>
                <input
                  type="text"
                  required
                  value={newEqNameAr}
                  onChange={(e) => setNewEqNameAr(e.target.value)}
                  placeholder="مثال: مولدة كتم صوت إضافية"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الرمز الموحد (Code):</label>
                <input
                  type="text"
                  value={newEqCode}
                  onChange={(e) => setNewEqCode(e.target.value.toUpperCase())}
                  placeholder="مثال: EQT-GEN-X"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono font-bold focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">السعة / المواصفة الافتراضية:</label>
                <input
                  type="text"
                  value={newEqCapacity}
                  onChange={(e) => setNewEqCapacity(e.target.value)}
                  placeholder="مثال: 500 KVA - Perkins"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الشكل الهندسي للمحاكاة ثلاثية الأبعاد (3D Geometry):</label>
                <select
                  value={newEqGeometry}
                  onChange={(e) => setNewEqGeometry(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 outline-none font-bold"
                >
                  <option value="box">مكعب / خزانة (Box Geometry)</option>
                  <option value="cylinder">أسطوانة / خزان (Cylinder Geometry)</option>
                  <option value="wall_panel">لوحة جدارية (Wall Panel)</option>
                  <option value="camera">كاميرا / مجس (Sensor / Camera)</option>
                  <option value="pump">مضخة / محرك (Pump / Engine)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentModal(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewEquipment()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 rounded-xl font-bold cursor-pointer shadow"
                >
                  حفظ واختيار المعدة
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
    </div>
  );
};
