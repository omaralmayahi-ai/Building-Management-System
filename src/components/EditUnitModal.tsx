import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { UnitAsset, ConditionGrade, UnitType, Room, EquipmentItem, ReferenceUnitType, UnitAttachment, OrgEntity } from '../types';
import { BUILDING_SHAPE_OPTIONS, getShapeFactor, calculateUnitArea } from './NewUnitWizard';
import { toArabicDigits, getServerDateFormatted, getServerIsoDateOnly } from '../utils/arabicUtils';
import { safeSetItem } from '../utils/storageUtils';
import { LocationPickerMap } from './LocationPickerMap';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { QuickAddOrgEntityModal } from './QuickAddOrgEntityModal';
import { RoomQrCardModal } from './RoomQrCardModal';
import { OrgChartModal } from './OrgChartModal';
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

interface EditUnitModalProps {
  unit: UnitAsset;
  onSave: (updatedUnit: UnitAsset) => void;
  onClose: () => void;
  governorates?: { code?: string; nameAr: string }[];
  oilfields?: { code?: string; nameAr: string }[];
  unitTypes?: ReferenceUnitType[];
  existingUnits?: UnitAsset[];
  orgEntities?: OrgEntity[];
  onAddOrgEntity?: (newEntity: OrgEntity) => void;
  theme?: 'dark' | 'light';
  initialTab?: 'basic' | 'shape3d' | 'location' | 'rooms' | 'equipment' | 'docs';
}

export const EditUnitModal: React.FC<EditUnitModalProps> = ({
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

  // Active edit step tab
  const [activeTab, setActiveTab] = useState<'basic' | 'shape3d' | 'location' | 'rooms' | 'equipment' | 'docs'>(
    initialTab || 'basic'
  );
  const [showQuickAddOrgModal, setShowQuickAddOrgModal] = useState(false);
  const [showOrgChartModal, setShowOrgChartModal] = useState(false);
  const [selectedRoomForQr, setSelectedRoomForQr] = useState<Room | null>(null);

  // Editable Form State initialized from unit
  const [name, setName] = useState<string>(unit.name);
  const [fixedAssetCode, setFixedAssetCode] = useState<string>(unit.fixedAssetCode || '');
  const [type, setType] = useState<UnitType>(unit.type);
  const [field, setField] = useState<string>(unit.field);
  const [governorate, setGovernorate] = useState<string>(unit.governorate);
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>(unit.conditionGrade);
  const [constructionYear, setConstructionYear] = useState<number>(unit.constructionYear);
  const [department, setDepartment] = useState<string>(unit.department);

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
    unit.designFinishing?.showTrees ?? true
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
  const [rooms, setRooms] = useState<Room[]>(unit.rooms || []);
  const [equipment, setEquipment] = useState<EquipmentItem[]>(unit.equipment || []);
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
      uploadDate: new Date().toISOString().split('T')[0],
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

  const handleDeleteAttachment = (id: string) => {
    const updated = attachments.filter((att) => att.id !== id);
    setAttachments(updated);
    setAttachmentsCount(updated.length);
  };

  const getFileIcon = (typeStr: string) => {
    switch (typeStr.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'dwg':
      case 'cad':
        return <FileCode className="w-5 h-5 text-indigo-400 shrink-0" />;
      case 'image':
      case 'png':
      case 'jpg':
        return <Image className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'doc':
      case 'docx':
        return <FileCheck className="w-5 h-5 text-sky-400 shrink-0" />;
      case 'archive':
      case 'zip':
      case 'rar':
        return <FolderArchive className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Paperclip className="w-5 h-5 text-amber-500 shrink-0" />;
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
          if (key === 'type' || key === 'floor') {
            const floorNum = parseInt(String(key === 'floor' ? value : rm.floor || '').replace(/\D/g, ''), 10) || 1;
            const roomType = key === 'type' ? value : rm.type;
            const typeCode = getRoomTypeCode(roomType);
            updated.roomTypeCode = typeCode;
            updated.code = generateRoomCode(unit.code, floorNum, roomType, rm.sequenceNumber || 101, true);
          }
          return updated;
        }
        return rm;
      })
    );
  };

  const handleDeleteRoom = (roomId: string) => {
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
    const roomCode = generateRoomCode(unit.code, floorNum, 'مكتب إداري', seqNum, true);

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

  // Equipment Handlers
  const handleUpdateEquipment = (eqId: string, key: keyof EquipmentItem, value: any) => {
    setEquipment((prev) =>
      prev.map((eq) => (eq.id === eqId ? { ...eq, [key]: value } : eq))
    );
  };

  const handleDeleteEquipment = (eqId: string) => {
    setEquipment((prev) => prev.filter((eq) => eq.id !== eqId));
  };

  const handleAddEquipment = () => {
    const nextNum = equipment.length + 1;
    const newEq: EquipmentItem = {
      id: `EQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `منظومة تشغيلية جديدة ${nextNum}`,
      type: 'generator',
      capacity: '250 kVA',
      location: 'سقف الوحدة',
      status: 'Active',
      lastServiceDate: new Date().toISOString().split('T')[0],
    };
    setEquipment((prev) => [...prev, newEq]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Fixed Asset Code if provided
    if (fixedAssetCode.trim()) {
      const codeFormatVal = validateFixedAssetCodeFormat(fixedAssetCode.trim(), unit.type);
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
    safeSetItem(`unit_finishing_${unit.code}`, updatedFinishing);

    const finalDept =
      selectedDepartments.length > 0 ? selectedDepartments.join(' ، ') : department || 'غير محدد';

    const normalizedRooms = normalizeUnitRoomsSequence(unit.code, rooms);

    const updated: UnitAsset = {
      ...unit,
      name: name.trim() || unit.name,
      fixedAssetCode: fixedAssetCode.trim() || undefined,
      type,
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
      equipment,
      attachments,
      attachmentsCount: attachments.length,
      designFinishing: updatedFinishing,
      lastUpdated: 'الآن (تحديث شامل)',
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div
        className={`w-full max-w-5xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-slate-950 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between gap-3 shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold truncate">تعديل بيانات وتصميم المنشأة (3D)</h3>
                <span className="font-mono text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  {toArabicDigits(unit.code)}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs mt-0.5 truncate hidden sm:block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                تحديث شامل مطابق لاستمارة تسجيل الوحدات الجديدة (الهوية، أبعاد 3D، الإحداثيات، الغرف، والمعدات)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
              isLight
                ? 'hover:bg-slate-200 text-slate-600'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className={`px-3 sm:px-6 py-2 border-b flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-xs font-bold shrink-0 ${
          isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-900/60 border-slate-800/80'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'basic'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>1. الهوية والاسم والمكان</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shape3d')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'shape3d'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>2. أبعاد وهندسة الـ 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'location'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>3. الموقع وحسابات GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'rooms'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. تقسيم الغرف ({toArabicDigits(rooms.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('equipment')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'equipment'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>5. المنظومات والمعدات ({toArabicDigits(equipment.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'docs'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>6. المرفقات والأرشيف</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* TAB 1: Basic Identity */}
          {activeTab === 'basic' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <h4 className="text-xs font-bold text-amber-500 flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span>البيانات الأساسية والتعريفية للمنشأة</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    فئة ونوع المنشأة المرجعي:
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as UnitType)}
                    className={`w-full border rounded-xl p-2.5 font-bold outline-none transition focus:border-amber-500 cursor-pointer ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    {unitTypes.length > 0 ? (
                      unitTypes.map((ut) => {
                        const val: UnitType = ut.code === 'CRV' ? 'caravan' : ut.code === 'WHS' ? 'warehouse' : ut.code === 'EQP' ? 'equipment' : ut.code === 'SFT' ? 'safety_system' : ut.code === 'TNK' ? 'storage_tank' : 'building';
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
                  </select>
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    الاسم الكامل الرسمي للمنشأة / المبنى:
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 font-bold outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    المحافظة العراقية:
                  </label>
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 font-bold outline-none transition focus:border-amber-500 cursor-pointer ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
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
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    الحقل النفطي الميداني:
                  </label>
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 font-bold outline-none transition focus:border-amber-500 cursor-pointer ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    {oilfields.length > 0 ? (
                      oilfields.map((f) => (
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
                    {field && !oilfields.some((f) => f.nameAr === field) && !defaultOilfields.includes(field) && (
                      <option value={field}>{field}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-3 md:col-span-2 border-t pt-3 mt-1 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className={`block font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      الجهات الشاغلة للمنشأة (يمكن إضافة أكثر من جهة):
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddOrgModal(true)}
                      className={`text-[11px] font-bold hover:underline flex items-center gap-1 cursor-pointer ${
                        isLight ? 'text-amber-700' : 'text-amber-400'
                      }`}
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
                      <div
                        className={`p-3 rounded-xl border border-dashed text-center text-xs ${
                          isLight
                            ? 'bg-amber-50/40 border-amber-200 text-slate-500'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400'
                        }`}
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
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${
                                    isLight
                                      ? 'bg-amber-200 border-amber-400 text-amber-900'
                                      : 'bg-amber-500/30 border-amber-500/50 text-amber-300'
                                  }`}
                                >
                                  رئيسية
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryDepartment(deptName)}
                                  className={`text-[10px] underline hover:no-underline transition cursor-pointer ${
                                    isLight ? 'text-slate-600 hover:text-amber-800' : 'text-slate-400 hover:text-amber-400'
                                  }`}
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

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    سنة الإنشاء والتشغيل:
                  </label>
                  <input
                    type="number"
                    min={1970}
                    max={2030}
                    value={constructionYear}
                    onChange={(e) => setConstructionYear(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2.5 font-bold outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                {/* رمز الأصل في سجلات أصول الشركة */}
                {(() => {
                  const validation = fixedAssetCode
                    ? validateFixedAssetCodeFormat(fixedAssetCode, unit.type)
                    : null;
                  const isUnique = fixedAssetCode
                    ? checkFixedAssetCodeUniqueness(fixedAssetCode, existingUnits, unit.id).isUnique
                    : true;

                  const isContinuous = /^\d+$/.test(fixedAssetCode.trim());
                  const isDotted = fixedAssetCode.includes('.') && /^\d+(\.\d+)+$/.test(fixedAssetCode.trim());

                  return (
                    <div
                      className={`md:col-span-2 p-4 rounded-2xl border space-y-3 ${
                        isLight
                          ? 'bg-indigo-50/50 border-indigo-200'
                          : 'bg-indigo-950/20 border-indigo-900/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
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
                                <Check className="w-3 h-3" />
                                <span>{validation.badgeText} - رمز فريد</span>
                              </span>
                            )}
                            {!validation?.isValid && (
                              <span className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                                {validation?.message}
                              </span>
                            )}
                            {validation?.isValid && !isUnique && (
                              <span className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
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
                              unit.type === 'caravan'
                                ? '123.1234.123 (أرقام مع فواصل للكرفانات)'
                                : '0123456789 (أرقام بدون فواصل للأبنية)'
                            }
                            className={`w-full border rounded-xl p-2.5 font-mono font-bold text-xs tracking-wider outline-none transition focus:border-indigo-500 ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                                : 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
                            }`}
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
                        className={`p-3 rounded-xl border space-y-2 text-xs ${
                          isLight
                            ? 'bg-white/80 border-indigo-100'
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
                          className={`text-[10px] leading-relaxed pt-0.5 ${
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
          )}

          {/* TAB 2: 3D Shape & Dimensions */}
          {activeTab === 'shape3d' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <h4 className="text-xs font-bold text-amber-500 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  <span>أبعاد وهندسة تصميم المبنى الـ 3D</span>
                </span>
                <span className="font-mono text-[11px] bg-amber-500/20 text-amber-500 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                  المساحة الكلية = {toArabicDigits(totalAreaSqM)} م²
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    طول الوحدة (أمتار):
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={lengthM}
                    onChange={(e) => handleLengthChange(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2.5 font-bold font-mono outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-amber-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    عرض الوحدة (أمتار):
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={widthM}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2.5 font-bold font-mono outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-amber-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ارتفاع السقف (أمتار): <span className="text-[10px] text-amber-500 font-normal">(افتراضي 3م)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    step="0.1"
                    value={heightM}
                    onChange={(e) => setHeightM(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2.5 font-bold font-mono outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    مساحة الوحدة الكلية (م²):
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50000}
                    value={totalAreaSqM}
                    onChange={(e) => setTotalAreaSqM(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2.5 font-black font-mono outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-amber-100/60 border-amber-300 text-amber-950'
                        : 'bg-slate-950 border-amber-500/50 text-amber-400'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    عدد الطوابق الإجمالي:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={floorsCount}
                    onChange={(e) => setFloorsCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                    className={`w-full border rounded-xl p-2.5 font-bold outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    حالة جودة وصلاحية المبنى (Condition Grade):
                  </label>
                  <select
                    value={conditionGrade}
                    onChange={(e) => setConditionGrade(e.target.value as ConditionGrade)}
                    className={`w-full border rounded-xl p-2.5 font-bold outline-none transition focus:border-amber-500 cursor-pointer ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="A">درجة A - ممتاز وشغال بالكامل</option>
                    <option value="B">درجة B - جيد مع ملاحظات خفيفة</option>
                    <option value="C">درجة C - متوسط بحاجة صيانة دورية</option>
                    <option value="D">درجة D - حرج بحاجة صيانة عاجلة</option>
                  </select>
                </div>
              </div>

              {/* Building Shape Selector Options */}
              <div className="space-y-2 pt-2">
                <label className={`block font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
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
                            ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-md'
                            : isLight
                              ? 'bg-white border-slate-200 text-slate-800 hover:border-amber-400'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
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
              <div className={`space-y-3 pt-3 border-t ${isLight ? 'border-amber-200/80' : 'border-slate-800'}`}>
                <label className={`block font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  المعالم واللمسات المعمارية المخصصة لهذه الوحدة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      النمط المعماري للواجهة:
                    </label>
                    <select
                      value={archStyle}
                      onChange={(e) => setArchStyle(e.target.value as any)}
                      className={`w-full border rounded-xl p-2.5 font-bold outline-none cursor-pointer transition ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                      }`}
                    >
                      <option value="modern">حديث معاصر (Modern Glass & Steel)</option>
                      <option value="classic">كلاسيكي صناعي (Classic Industrial)</option>
                      <option value="industrial">هيكل حقلي مقوى (Reinforced Structural)</option>
                      <option value="minimalist">تبسيط هادئ (Minimalist Clean)</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      نوع السطح والتصميم (متوافق مع أبعاد الوحدة):
                    </label>
                    <select
                      value={roofType}
                      onChange={(e) => setRoofType(e.target.value as any)}
                      className={`w-full border rounded-xl p-2.5 font-bold outline-none cursor-pointer transition ${
                        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                      }`}
                    >
                      <option value="flat">سطح مسطح (سطح مستوي)</option>
                      <option value="flat_parapet">سطح مسطح مع سياج السطح</option>
                      <option value="gabled">سطح مثلث مائل الشكل (مخصص للجملونات)</option>
                      <option value="pitched_tile">سطح من القرميد مائل الشكل</option>
                      <option value="garden">سطح حديقة خضراء (Roof Garden)</option>
                    </select>
                    <p className="text-[11px] font-bold text-amber-500 mt-1 flex items-center gap-1">
                      <span>✓ مساحة السطح المطابقة لأبعاد الوحدة:</span>
                      <span className="font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {toArabicDigits((lengthM && widthM) ? (lengthM * widthM) : Math.round(totalAreaSqM / Math.max(1, floorsCount)))} م²
                      </span>
                    </p>
                  </div>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 p-3 rounded-xl border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}>
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
                <div className={`p-3.5 rounded-xl border space-y-3 ${
                  isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <label className={`block font-extrabold text-xs flex items-center gap-1.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                    <span>💡 التحكم بشدة وصلابة الإنارة للنموذج الـ 3D:</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1 font-bold">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>الإنارة الداخلية (الغرف والواجهات):</span>
                        <span className="font-mono text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
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
                        className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1 font-bold">
                        <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>الإنارة الخارجية (الكشافات والمحيط):</span>
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
                        className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
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
              className={`p-5 rounded-2xl border space-y-4 ${
                isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
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
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    خط العرض (GPS Latitude):
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2.5 font-mono font-bold outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-amber-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    خط الطول (GPS Longitude):
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className={`w-full border rounded-xl p-2.5 font-mono font-bold outline-none transition focus:border-amber-500 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-amber-400'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Rooms */}
          {activeTab === 'rooms' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-500 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>تفاصيل وحصر غرف وقاعات المبنى ({toArabicDigits(rooms.length)})</span>
                </h4>

                <button
                  type="button"
                  onClick={handleAddRoom}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة غرفة جديدة</span>
                </button>
              </div>

              {rooms.length === 0 ? (
                <div
                  className={`p-6 text-center text-xs border border-dashed rounded-xl ${
                    isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'
                  }`}
                >
                  لا توجد غرف مخصصة لهذا المبنى حالياً. اضغط "إضافة غرفة جديدة" للبدء.
                </div>
              ) : (
                <div
                  className={`overflow-x-auto border rounded-xl ${
                    isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <table className="w-full text-right text-xs">
                    <thead
                      className={`font-bold border-b ${
                        isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <tr>
                        <th className="p-2.5">اسم الغرفة / القاعة</th>
                        <th className="p-2.5">رمز الغرفة القياسي</th>
                        <th className="p-2.5">نوع الاستخدام</th>
                        <th className="p-2.5">الطابق</th>
                        <th className="p-2.5">المساحة (م²)</th>
                        <th className="p-2.5">عدد الشاغلين</th>
                        <th className="p-2.5">الجهة الشاغلة</th>
                        <th className="p-2.5 w-28">الحالة التشغيلية</th>
                        <th className="p-2.5">سبب التوقف / ملاحظات</th>
                        <th className="p-2.5 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                      {rooms.map((rm) => {
                        const isStopped = rm.status === 'Stopped' || rm.status === 'متوقفة';
                        const roomComputedCode = getStandardRoomCode(unit.code, rm, rooms);
                        const isNonOcc = isNonOccupancyRoom(rm.type);
                        const isCap = isCapacityBasedRoom(rm.type);
                        const isVacant = isRoomVacant(rm.occupiedBy);

                        return (
                          <tr key={rm.id} className={isStopped ? (isLight ? 'bg-red-50/60' : 'bg-red-950/20') : ''}>
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
                                <span className="font-mono font-black text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                                  {roomComputedCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRoomForQr({ ...rm, code: roomComputedCode })}
                                  className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-slate-950 transition cursor-pointer"
                                  title="استعراض وطباعة بطاقة QR للغرفة"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2 w-28">
                              <input
                                type="text"
                                value={rm.type}
                                onChange={(e) => handleUpdateRoom(rm.id, 'type', e.target.value)}
                                className={`w-full border rounded-lg px-2 py-1 text-xs outline-none ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                                }`}
                              />
                            </td>
                            <td className="p-2 w-20">
                              <input
                                type="text"
                                value={rm.floor}
                                onChange={(e) => handleUpdateRoom(rm.id, 'floor', e.target.value)}
                                className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none ${
                                  isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-800'
                                }`}
                              />
                            </td>
                            <td className="p-2 w-20">
                              <input
                                type="number"
                                value={rm.areaSqM}
                                onChange={(e) => handleUpdateRoom(rm.id, 'areaSqM', Number(e.target.value))}
                                className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none ${
                                  isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-800'
                                }`}
                              />
                            </td>
                            <td className="p-2 w-32">
                              {isNonOcc ? (
                                <span className="text-slate-400 text-[11px] font-normal px-2 py-1 bg-slate-500/5 rounded-lg border border-slate-500/10 block text-center">
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
                                    className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none ${
                                      isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-800'
                                    }`}
                                  />
                                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold whitespace-nowrap">طاقة</span>
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
                                      className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none ${
                                        isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-800'
                                      }`}
                                    />
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">شاغل</span>
                                  </div>
                                  {isVacant && (
                                    <span className="text-[9px] text-amber-500 block">تظهر (—) لأنها شاغرة</span>
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
                                className={`w-full border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer transition ${
                                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900 font-medium focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                                }`}
                              >
                                <option value="">🏢 شاغرة (بدون إشغال / فارغة)</option>
                                {selectedDepartments.length > 0 ? (
                                  selectedDepartments.map((deptName, idx) => (
                                    <option key={deptName} value={deptName}>
                                      {idx === 0 ? `★ ${deptName} (الجهة الرئيسية)` : `• ${deptName}`}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>
                                    ⚠️ يرجى تحديد الجهات الشاغلة للمنشأة أولاً من الهيكل التنظيمي أعلاه
                                  </option>
                                )}
                                {rm.occupiedBy && !selectedDepartments.includes(rm.occupiedBy) && (
                                  <option value={rm.occupiedBy}>{rm.occupiedBy} (سابق)</option>
                                )}
                              </select>
                            </td>
                            <td className="p-2 w-28">
                              <select
                                value={isStopped ? 'Stopped' : 'Active'}
                                onChange={(e) => handleUpdateRoom(rm.id, 'status', e.target.value)}
                                className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer transition ${
                                  isStopped
                                    ? 'bg-red-500/20 text-red-500 border-red-500/40'
                                    : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                                }`}
                              >
                                <option value="Active">فعالة 🟢</option>
                                <option value="Stopped">متوقفة 🔴</option>
                              </select>
                            </td>
                            <td className="p-2 min-w-[170px]">
                              {isStopped ? (
                                <input
                                  type="text"
                                  placeholder="أدخل سبب التوقف..."
                                  value={rm.notes || ''}
                                  onChange={(e) => handleUpdateRoom(rm.id, 'notes', e.target.value)}
                                  className={`w-full border rounded-lg px-2 py-1 text-xs outline-none font-bold transition ${
                                    isLight
                                      ? 'bg-red-50 border-red-300 text-red-900 placeholder-red-400 focus:border-red-500'
                                      : 'bg-red-950/40 border-red-800 text-red-200 placeholder-red-500/60 focus:border-red-500'
                                  }`}
                                />
                              ) : (
                                <span className={`text-[11px] font-semibold italic ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                  نشطة (تحذف ملاحظة التوقف تلقائياً)
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center w-12">
                              <button
                                type="button"
                                onClick={() => handleDeleteRoom(rm.id)}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
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
              )}
            </div>
          )}

          {/* TAB 5: Equipment */}
          {activeTab === 'equipment' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-500 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  <span>المنظومات والمعدات التشغيلية الملحقة ({toArabicDigits(equipment.length)})</span>
                </h4>

                <button
                  type="button"
                  onClick={handleAddEquipment}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة معدة جديدة</span>
                </button>
              </div>

              {equipment.length === 0 ? (
                <div
                  className={`p-6 text-center text-xs border border-dashed rounded-xl ${
                    isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'
                  }`}
                >
                  لا توجد معدات مسجلة ملحقة بهذا المبنى. اضغط "إضافة معدة جديدة" للبدء.
                </div>
              ) : (
                <div
                  className={`overflow-x-auto border rounded-xl ${
                    isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <table className="w-full text-right text-xs">
                    <thead
                      className={`font-bold border-b ${
                        isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <tr>
                        <th className="p-2.5">اسم المعدة / المنظومة</th>
                        <th className="p-2.5">النوع</th>
                        <th className="p-2.5">السعة / القدرة</th>
                        <th className="p-2.5">الموقع</th>
                        <th className="p-2.5">الحالة التشغيلية</th>
                        <th className="p-2.5 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                      {equipment.map((eq) => (
                        <tr key={eq.id}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={eq.name}
                              onChange={(e) => handleUpdateEquipment(eq.id, 'name', e.target.value)}
                              className={`w-full border rounded-lg px-2.5 py-1 text-xs outline-none font-bold ${
                                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                              }`}
                            />
                          </td>
                          <td className="p-2 w-32">
                            <select
                              value={eq.type}
                              onChange={(e) => handleUpdateEquipment(eq.id, 'type', e.target.value)}
                              className={`w-full border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer ${
                                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                              }`}
                            >
                              <option value="generator">مولدة ديزل</option>
                              <option value="ac_unit">منظومة تكييف</option>
                              <option value="water_tank">خزان مياه</option>
                              <option value="fire_extinguisher">منظومة إطفاء</option>
                              <option value="it_rack">كابينة شبكة IT</option>
                            </select>
                          </td>
                          <td className="p-2 w-28">
                            <input
                              type="text"
                              value={eq.capacity || ''}
                              onChange={(e) => handleUpdateEquipment(eq.id, 'capacity', e.target.value)}
                              className={`w-full border rounded-lg px-2 py-1 text-xs font-bold outline-none ${
                                isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900 border-slate-800'
                              }`}
                            />
                          </td>
                          <td className="p-2 w-36">
                            <select
                              value={eq.location || 'سقف الوحدة'}
                              onChange={(e) => handleUpdateEquipment(eq.id, 'location', e.target.value)}
                              className={`w-full border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer font-bold ${
                                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                              }`}
                            >
                              <option value="سقف الوحدة">🏢 سقف الوحدة</option>
                              <option value="المحيط الخارجي للوحدة">🌳 المحيط الخارجي للوحدة</option>
                              <option value="داخل الوحدة">🚪 داخل الوحدة</option>
                            </select>
                          </td>
                          <td className="p-2 w-28">
                            <select
                              value={eq.status}
                              onChange={(e) => handleUpdateEquipment(eq.id, 'status', e.target.value as any)}
                              className={`w-full border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer font-bold ${
                                eq.status === 'Active'
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : eq.status === 'Maintenance'
                                  ? 'text-amber-400 bg-amber-500/10'
                                  : 'text-red-400 bg-red-500/10'
                              }`}
                            >
                              <option value="Active">شغال (Active)</option>
                              <option value="Maintenance">صيانة (Maintenance)</option>
                              <option value="Critical">حرج (Critical)</option>
                            </select>
                          </td>
                          <td className="p-2 text-center w-12">
                            <button
                              type="button"
                              onClick={() => handleDeleteEquipment(eq.id)}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                              title="حذف المعدة"
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
          )}

          {/* TAB 6: Attachments & Archives */}
          {activeTab === 'docs' && (
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    <span>المرفقات والوثائق الهندسية والأرشيف الرقمي للوحدة</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    إدارة واستعراض وإضافة وحذف المخططات الهندسية ومستندات الاستلام والوثائق الرسمية.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label
                    htmlFor="edit-modal-file-input"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
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
                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
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
                className={`p-4 border-2 border-dashed rounded-2xl text-center space-y-1.5 cursor-pointer transition hover:border-amber-500/80 ${
                  isLight ? 'border-slate-300 bg-slate-100/60 hover:bg-slate-200/50' : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/60'
                }`}
              >
                <Upload className="w-7 h-7 text-amber-500 mx-auto opacity-80" />
                <p className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  اسحب وأسقط المخططات الهندسية أو اضغط لتصفح جهازك (PDF, DWG, PNG, DOC, ZIP)
                </p>
                <p className="text-[11px] text-slate-500">
                  عدد الوثائق الأرشيفية المرفقة حالياً: <strong className="text-amber-400 font-mono text-xs">{toArabicDigits(attachments.length)}</strong> وثيقة
                </p>
              </div>

              {/* Attachments List */}
              {attachments.length === 0 ? (
                <div className={`p-8 text-center text-xs border border-dashed rounded-2xl ${
                  isLight ? 'border-slate-300 text-slate-500' : 'border-slate-800 text-slate-500'
                }`}>
                  لا توجد مرفقات أو وثائق مضافة لهذه المنشأة حالياً. اضغط "رفع ملفات" أو "إضافة وثيقة" للبدء.
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold px-1 text-slate-400">
                    <span>سجل الوثائق والمرفقات المعتمدة ({toArabicDigits(attachments.length)}):</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                          isLight ? 'bg-white border-slate-200 hover:border-amber-400' : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl shrink-0">
                            {getFileIcon(att.type)}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                {att.name}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                {att.category}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed truncate">
                              {att.notes || 'لا توجد ملاحظات إضافية'}
                            </p>

                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                              <span>تاريخ الإرفاق: {toArabicDigits(att.uploadDate)}</span>
                              <span>•</span>
                              <span>الحجم: {att.sizeMB ? `${toArabicDigits(att.sizeMB)} MB` : 'غير محدد'}</span>
                              <span>•</span>
                              <span className="uppercase text-amber-400">{att.type}</span>
                            </div>
                          </div>
                        </div>

                        {/* Document Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="معاينة واستعراض الوثيقة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingAttachment({ ...att })}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="تعديل اسم أو بيانات المرفق"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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

          {/* Actions Footer */}
          <div
            className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-slate-400 order-2 sm:order-1 text-center sm:text-right">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>يتم توثيق التعديلات مباشرة بسجل التدقيق الأمني للشركة</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto order-1 sm:order-2">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                إلغاء
              </button>

              <button
                type="submit"
                className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ كافة التعديلات والـ 3D</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* MODAL 1: Add New Attachment */}
      {showAddAttachmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/30">
              <h4 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                <span>إضافة وثيقة / مرفق جديد للوحدة</span>
              </h4>
              <button onClick={() => setShowAddAttachmentModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-300">اختيار الملف (معاينة وتحميل مباشر):</label>
                <input
                  type="file"
                  onChange={handleModalFileSelected}
                  className={`w-full text-xs p-2 rounded-xl border cursor-pointer ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-300">اسم الوثيقة / المستند:</label>
                <input
                  type="text"
                  value={newAttName}
                  onChange={(e) => setNewAttName(e.target.value)}
                  placeholder="مثال: المخطط الهندسي لشبكة الإطفاء.pdf"
                  className={`w-full border rounded-xl p-2.5 outline-none font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-300">التصنيف الأرشيفي:</label>
                  <select
                    value={newAttCategory}
                    onChange={(e) => setNewAttCategory(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 outline-none font-bold cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="مخططات هندسية">مخططات هندسية</option>
                    <option value="محاضر استلام">محاضر استلام</option>
                    <option value="شهادات فحص وسلامة">شهادات فحص وسلامة</option>
                    <option value="وثائق ملكية وتخصيص">وثائق ملكية وتخصيص</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-300">نوع الملف:</label>
                  <select
                    value={newAttType}
                    onChange={(e) => setNewAttType(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 outline-none font-bold cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
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
                <label className="block font-bold mb-1 text-slate-300">حجم الملف المقدر (MB):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newAttSizeMB}
                  onChange={(e) => setNewAttSizeMB(Number(e.target.value))}
                  className={`w-full border rounded-xl p-2.5 outline-none font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-300">ملاحظات إضافية:</label>
                <textarea
                  value={newAttNotes}
                  onChange={(e) => setNewAttNotes(e.target.value)}
                  placeholder="ملاحظات حول المرفق أو أرقام الصادر والوارد..."
                  rows={2}
                  className={`w-full border rounded-xl p-2.5 outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowAddAttachmentModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveNewAttachment}
                disabled={!newAttName.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow disabled:opacity-50"
              >
                حفظ الوثيقة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Attachment */}
      {editingAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/30">
              <h4 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                <span>تعديل بيانات المرفق الأرشيفي</span>
              </h4>
              <button onClick={() => setEditingAttachment(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-300">اسم الوثيقة / المستند:</label>
                <input
                  type="text"
                  value={editingAttachment.name}
                  onChange={(e) => setEditingAttachment({ ...editingAttachment, name: e.target.value })}
                  className={`w-full border rounded-xl p-2.5 outline-none font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-300">التصنيف الأرشيفي:</label>
                  <select
                    value={editingAttachment.category}
                    onChange={(e) => setEditingAttachment({ ...editingAttachment, category: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-bold cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="مخططات هندسية">مخططات هندسية</option>
                    <option value="محاضر استلام">محاضر استلام</option>
                    <option value="شهادات فحص وسلامة">شهادات فحص وسلامة</option>
                    <option value="وثائق ملكية وتخصيص">وثائق ملكية وتخصيص</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-300">نوع الملف:</label>
                  <select
                    value={editingAttachment.type}
                    onChange={(e) => setEditingAttachment({ ...editingAttachment, type: e.target.value })}
                    className={`w-full border rounded-xl p-2.5 outline-none font-bold cursor-pointer ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
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
                <label className="block font-bold mb-1 text-slate-300">تاريخ الإرفاق:</label>
                <input
                  type="date"
                  value={editingAttachment.uploadDate}
                  onChange={(e) => setEditingAttachment({ ...editingAttachment, uploadDate: e.target.value })}
                  className={`w-full border rounded-xl p-2.5 outline-none font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-300">ملاحظات وتفاصيل إضافية:</label>
                <textarea
                  value={editingAttachment.notes || ''}
                  onChange={(e) => setEditingAttachment({ ...editingAttachment, notes: e.target.value })}
                  rows={2}
                  className={`w-full border rounded-xl p-2.5 outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setEditingAttachment(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEditAttachment}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow"
              >
                تعديل وحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Preview Attachment */}
      {previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment}
          unitCode={unit.code}
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

