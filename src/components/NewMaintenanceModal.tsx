import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wrench,
  GitBranch,
  SlidersHorizontal,
  List,
  Building2,
  MapPin,
  Flame,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Camera,
  Upload,
  FileCheck,
  Eye,
  Trash2,
  Download,
  ImageIcon,
  FileText,
  Lock,
  Loader2,
  DoorClosed,
  Layers,
  UserCheck,
  LayoutGrid,
  Briefcase,
  Users,
  Archive,
  Server,
  FlaskConical,
  Bath,
  Utensils,
  Bed,
  Cpu,
  Edit3,
  Filter,
  Sparkles,
} from 'lucide-react';
import {
  MaintenanceRequest,
  MaintenancePriority,
  UnitAsset,
  SystemUser,
  ReportAttachment,
  MaintenanceDepartmentRef,
  Room,
} from '../types';
import { INITIAL_MAINTENANCE_DEPARTMENTS } from '../data/mockData';
import { compressImageFile } from '../utils/imageCompressor';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // Up to 15 MB before compression

// Helper to determine room type visual styling & icon
const getRoomTypeConfig = (typeStr: string) => {
  const t = (typeStr || '').toLowerCase();
  if (t.includes('مكتب') || t.includes('off') || t.includes('office')) {
    return { name: 'مكتب إداري', color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30', icon: Briefcase };
  }
  if (t.includes('اجتماع') || t.includes('mtg') || t.includes('meeting')) {
    return { name: 'قاعة اجتماعات', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30', icon: Users };
  }
  if (t.includes('مخزن') || t.includes('مستودع') || t.includes('str') || t.includes('storage')) {
    return { name: 'مخزن ومستودع', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Archive };
  }
  if (t.includes('سيرفر') || t.includes('شبك') || t.includes('srv') || t.includes('server')) {
    return { name: 'سيرفرات وتقنية', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30', icon: Server };
  }
  if (t.includes('مختبر') || t.includes('تحليل') || t.includes('lab')) {
    return { name: 'مختبر وتحاليل', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: FlaskConical };
  }
  if (t.includes('صحي') || t.includes('حمام') || t.includes('مياه') || t.includes('wsh') || t.includes('bath')) {
    return { name: 'خدمات وصحيات', color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30', icon: Bath };
  }
  if (t.includes('استراح') || t.includes('سكن') || t.includes('bed') || t.includes('living')) {
    return { name: 'سكن واستراحة', color: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/30', icon: Bed };
  }
  if (t.includes('مطبخ') || t.includes('بوفيه') || t.includes('طعام') || t.includes('ktn') || t.includes('din')) {
    return { name: 'مطبخ وبوفيه', color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30', icon: Utensils };
  }
  if (t.includes('سيطرة') || t.includes('تحكم') || t.includes('مراقبة')) {
    return { name: 'سيطرة ومراقبة', color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30', icon: Cpu };
  }
  return { name: typeStr || 'فضاء / غرفة', color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30', icon: DoorClosed };
};

interface NewMaintenanceModalProps {
  units?: UnitAsset[];
  initialUnitCode?: string;
  initialRoom?: Room | { code?: string; name: string; floor?: string; occupiedBy?: string } | null;
  initialRoomCode?: string;
  initialOccupyingEntity?: string;
  initialRoomFloor?: string;
  isUnitLocked?: boolean;
  isRoomLocked?: boolean;
  onAddRequest: (req: MaintenanceRequest) => void;
  onClose: () => void;
  isLight?: boolean;
  currentUser?: SystemUser | null;
  maintenanceDepartments?: MaintenanceDepartmentRef[];
}

export const NewMaintenanceModal: React.FC<NewMaintenanceModalProps> = ({
  units = [],
  initialUnitCode = 'WS-AHD-BLD-014',
  initialRoom = null,
  initialRoomCode = '',
  initialOccupyingEntity = '',
  initialRoomFloor = '',
  isUnitLocked = false,
  isRoomLocked = false,
  onAddRequest,
  onClose,
  isLight = false,
  currentUser,
  maintenanceDepartments = INITIAL_MAINTENANCE_DEPARTMENTS,
}) => {
  const isRoomLockedEffective = Boolean(isRoomLocked || initialRoom || initialRoomCode);
  const isUnitLockedByQr = Boolean(isUnitLocked && !isRoomLockedEffective);
  const isLocked = isUnitLocked || isRoomLockedEffective || (currentUser?.role === 'موظف الكشف والصيانة' && Boolean(initialUnitCode));
  const [unitCode, setUnitCode] = useState(initialUnitCode || (units[0]?.code ?? 'WS-AHD-BLD-014'));

  // Selected unit asset details
  const selectedUnitAsset = useMemo(() => {
    return units.find((u) => u.code === unitCode);
  }, [units, unitCode]);

  // Scope: 'unit' = Whole unit maintenance, 'room' = Specific room maintenance
  const [maintenanceScope, setMaintenanceScope] = useState<'unit' | 'room'>(
    isRoomLockedEffective ? 'room' : 'unit'
  );

  // Room Specific state
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>(
    isUnitLockedByQr ? '' : (initialRoom?.code || initialRoomCode || '')
  );
  const [selectedRoomName, setSelectedRoomName] = useState<string>(
    isUnitLockedByQr ? '' : (initialRoom?.name || '')
  );
  const [selectedRoomFloor, setSelectedRoomFloor] = useState<string>(
    isUnitLockedByQr ? '' : (initialRoom?.floor || initialRoomFloor || '')
  );
  const [occupyingEntity, setOccupyingEntity] = useState<string>(
    isUnitLockedByQr
      ? (selectedUnitAsset?.department || initialOccupyingEntity || '')
      : (initialRoom?.occupiedBy || initialOccupyingEntity || selectedUnitAsset?.department || '')
  );

  // Room selection UI filters & view mode
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [roomFloorFilter, setRoomFloorFilter] = useState<string>('all');
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>('');
  const [roomViewMode, setRoomViewMode] = useState<'cards' | 'dropdown' | 'manual'>('cards');

  useEffect(() => {
    if (initialUnitCode) {
      setUnitCode(initialUnitCode);
    }
  }, [initialUnitCode]);

  useEffect(() => {
    if (isUnitLockedByQr) {
      setMaintenanceScope('unit');
      setSelectedRoomCode('');
      setSelectedRoomName('');
      setSelectedRoomFloor('');
      if (selectedUnitAsset?.department) {
        setOccupyingEntity(selectedUnitAsset.department);
      }
    } else if (initialRoom) {
      setMaintenanceScope('room');
      setSelectedRoomCode(initialRoom.code || '');
      setSelectedRoomName(initialRoom.name || '');
      setSelectedRoomFloor(initialRoom.floor || '');
      if (initialRoom.occupiedBy) {
        setOccupyingEntity(initialRoom.occupiedBy);
      }
    }
  }, [isUnitLockedByQr, initialRoom, selectedUnitAsset]);

  // Available room types in the active unit
  const availableRoomTypes = useMemo(() => {
    if (!selectedUnitAsset?.rooms) return [];
    const typesMap: Record<string, number> = {};
    selectedUnitAsset.rooms.forEach((r) => {
      const typeKey = r.type?.trim() || 'عام';
      typesMap[typeKey] = (typesMap[typeKey] || 0) + 1;
    });
    return Object.entries(typesMap).map(([type, count]) => ({ type, count }));
  }, [selectedUnitAsset]);

  // Available floors in the active unit
  const availableFloors = useMemo(() => {
    if (!selectedUnitAsset?.rooms) return [];
    const floorsMap: Record<string, number> = {};
    selectedUnitAsset.rooms.forEach((r) => {
      const floorKey = r.floor?.trim() || 'الطابق 1';
      floorsMap[floorKey] = (floorsMap[floorKey] || 0) + 1;
    });
    return Object.entries(floorsMap).map(([floor, count]) => ({ floor, count }));
  }, [selectedUnitAsset]);

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    if (!selectedUnitAsset?.rooms) return [];
    return selectedUnitAsset.rooms.filter((rm) => {
      if (roomTypeFilter !== 'all' && (rm.type?.trim() || 'عام') !== roomTypeFilter) {
        return false;
      }
      if (roomFloorFilter !== 'all' && (rm.floor?.trim() || 'الطابق 1') !== roomFloorFilter) {
        return false;
      }
      if (roomSearchQuery.trim()) {
        const q = roomSearchQuery.trim().toLowerCase();
        const codeMatch = (rm.code || '').toLowerCase().includes(q);
        const nameMatch = (rm.name || '').toLowerCase().includes(q);
        const typeMatch = (rm.type || '').toLowerCase().includes(q);
        const occMatch = (rm.occupiedBy || '').toLowerCase().includes(q);
        const floorMatch = (rm.floor || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !typeMatch && !occMatch && !floorMatch) {
          return false;
        }
      }
      return true;
    });
  }, [selectedUnitAsset, roomTypeFilter, roomFloorFilter, roomSearchQuery]);

  // When room is selected from cards or dropdown, update room details automatically
  const handleSelectRoom = (rCode: string) => {
    setSelectedRoomCode(rCode);
    if (!rCode) {
      setSelectedRoomName('');
      setSelectedRoomFloor('');
      setOccupyingEntity(selectedUnitAsset?.department || '');
      return;
    }

    const foundRoom = selectedUnitAsset?.rooms?.find(
      (r) => (r.code && r.code === rCode) || r.id === rCode || r.name === rCode
    );
    if (foundRoom) {
      setSelectedRoomName(foundRoom.name);
      setSelectedRoomFloor(foundRoom.floor || 'الطابق 1');
      setOccupyingEntity(foundRoom.occupiedBy || selectedUnitAsset?.department || '');
    }
  };

  // Handler for scope change (whole unit vs room)
  const handleScopeChange = (newScope: 'unit' | 'room') => {
    setMaintenanceScope(newScope);
    if (newScope === 'unit') {
      setSelectedRoomCode('');
      setSelectedRoomName('');
      setSelectedRoomFloor('');
      if (selectedUnitAsset?.department) {
        setOccupyingEntity(selectedUnitAsset.department);
      }
    } else {
      // If switching to room and unit has rooms, auto select or prompt
      if (!selectedRoomCode && selectedUnitAsset?.rooms && selectedUnitAsset.rooms.length > 0) {
        // Keep ready for selection
      }
    }
  };

  // Reset room filters when unit changes
  useEffect(() => {
    if (selectedUnitAsset) {
      setRoomTypeFilter('all');
      setRoomFloorFilter('all');
      setRoomSearchQuery('');
      if (maintenanceScope === 'unit') {
        setOccupyingEntity(selectedUnitAsset.department || '');
      }
    }
  }, [unitCode]);

  const [unitPickerMode, setUnitPickerMode] = useState<'tree_vertical' | 'tree_horizontal' | 'dropdown'>('tree_vertical');
  const [unitSearch, setUnitSearch] = useState('');
  const [expandedGovs, setExpandedGovs] = useState<Record<string, boolean>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [activeGovHoriz, setActiveGovHoriz] = useState<string>('');
  const [activeFieldHoriz, setActiveFieldHoriz] = useState<string>('');

  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('normal');
  const [maintenanceDepartment, setMaintenanceDepartment] = useState<string>(() => {
    const activeDepts = maintenanceDepartments.filter((d) => d.status === 'active');
    return activeDepts[0]?.nameAr || 'الصيانة الكهربائية';
  });
  const [validationError, setValidationError] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  // Multi-file Attachments State
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [previewItem, setPreviewItem] = useState<{ title: string; url: string; fileName: string } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setValidationError('');
    setIsProcessingFiles(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_FILE_SIZE) {
          setValidationError('حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت). الرجاء اختيار ملف أصغر.');
          continue;
        }

        // Compress image to ensure it fits safely in Firestore & Storage without failure
        const compressed = await compressImageFile(file, 1024, 1024, 0.72);
        const newAtt: ReportAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          url: compressed.dataUrl,
          type: file.type || 'image/jpeg',
          size: compressed.sizeBytes,
        };
        setAttachments((prev) => [...prev, newAtt]);
      }
    } catch (err: any) {
      console.error('File compression/upload error:', err);
      setValidationError('حدث خطأ أثناء معالجة الصور المرفقة، يرجى المحاولة ثانية.');
    } finally {
      setIsProcessingFiles(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Group units by governorate -> field
  const groupedUnits = useMemo(() => {
    const map: Record<string, Record<string, UnitAsset[]>> = {};
    units.forEach((u) => {
      const gov = u.governorate || 'غير محدد';
      const fld = u.field || 'عام';
      if (!map[gov]) map[gov] = {};
      if (!map[gov][fld]) map[gov][fld] = [];
      map[gov][fld].push(u);
    });
    return map;
  }, [units]);

  const currentUnitGov = selectedUnitAsset?.governorate || '';
  const currentUnitField = selectedUnitAsset?.field || '';

  const effectiveGov = activeGovHoriz || currentUnitGov || Object.keys(groupedUnits)[0] || '';
  const effectiveField =
    activeFieldHoriz ||
    currentUnitField ||
    (effectiveGov && groupedUnits[effectiveGov] ? Object.keys(groupedUnits[effectiveGov])[0] : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!unitCode || !unitCode.trim()) {
      setValidationError('يرجى تحديد الوحدة الهندسية / الأصل المطلوب فتح طلب الصيانة له.');
      return;
    }

    const selectedAsset = units.find((u) => u.code === unitCode);
    if (!selectedAsset) {
      setValidationError('لم يتم العثور على الوحدة المحددة في قاعدة البيانات. يرجى اختيار وحدة صالحة.');
      return;
    }

    if (maintenanceScope === 'room' && !selectedRoomCode.trim() && !selectedRoomName.trim()) {
      setValidationError('لقد اخترت نطاق الصيانة (لغرفة محددة)، يرجى تحديد الغرفة من السجل أو إدخال تفاصيلها.');
      return;
    }

    if (!issue.trim()) {
      setValidationError('يرجى كتابة وصف المشكلة أو الأعمال المطلوبة.');
      return;
    }

    const year = new Date().getFullYear();
    const uniqueSuffix = Date.now().toString(36).slice(-6).toUpperCase();

    const effectiveOccupyingEntity = occupyingEntity.trim() || selectedAsset.department || 'هيئة التشغيل الميدانية';

    const newReq: MaintenanceRequest = {
      id: `MR-${year}-${uniqueSuffix}`,
      unitCode: selectedAsset.code,
      unitName: selectedAsset.name,
      roomCode: maintenanceScope === 'room' && selectedRoomCode.trim() ? selectedRoomCode.trim() : undefined,
      roomName: maintenanceScope === 'room' && selectedRoomName.trim() ? selectedRoomName.trim() : undefined,
      roomFloor: maintenanceScope === 'room' && selectedRoomFloor.trim() ? selectedRoomFloor.trim() : undefined,
      occupyingEntity: effectiveOccupyingEntity,
      field: selectedAsset.field,
      issue: issue.trim(),
      priority,
      slaDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      maintenanceDepartment: maintenanceDepartment || 'الصيانة الكهربائية',
      status: 'open',
      createdAt: requestDate || new Date().toISOString().split('T')[0],
      reportedBy: currentUser?.name || 'غير معروف',
      attachmentName: attachments[0]?.name || undefined,
      attachmentUrl: attachments[0]?.url || undefined,
      attachments: attachments,
    };

    onAddRequest(newReq);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto ${
      isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'
    }`}>
      <div
        className={`rounded-2xl max-w-4xl w-full p-5 shadow-2xl border flex flex-col max-h-[92vh] space-y-4 text-xs ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                طلب صيانة جديد
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                توثيق وإصدار طلب صيانة جديد وتكليف الجهة الفنية المختصة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* SECTION 1: UNIT SELECTION */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
            {isLocked ? (
              /* LOCKED UNIT VIEW (e.g. Scanned QR Code) */
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                  <label className={`block font-extrabold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    1. المنشأة / الأصل المحدد للطلب:
                  </label>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-black text-[11px] flex items-center gap-1.5 shadow-sm">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {isRoomLockedEffective
                        ? 'تم التحديد والقفل عبر رمز الوصول السريع للغرفة (QR)'
                        : 'تم التحديد والقفل عبر رمز الوصول السريع للمنشأة (QR)'}
                    </span>
                  </span>
                </div>

                {/* Locked Unit Details Card */}
                <div className={`p-3.5 rounded-2xl border transition ${
                  isLight ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-sm' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            {selectedUnitAsset?.code || unitCode}
                          </span>
                          <span className="opacity-60">•</span>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {selectedUnitAsset?.name || 'الوحدة الهندسية'}
                          </span>
                        </div>
                        <div className="text-xs opacity-90 flex items-center gap-3 mt-1.5 flex-wrap font-medium">
                          {selectedUnitAsset?.governorate && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              محافظة {selectedUnitAsset.governorate}
                            </span>
                          )}
                          {selectedUnitAsset?.field && (
                            <span className="flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              حقل {selectedUnitAsset.field}
                            </span>
                          )}
                          {selectedUnitAsset?.site && (
                            <span className="text-[11px] text-slate-600 dark:text-slate-400">
                              (الموقع: {selectedUnitAsset.site})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>أصل معتمد ومقفل</span>
                    </div>
                  </div>

                  {selectedUnitAsset?.department && (
                    <div className="mt-3 pt-2.5 border-t border-amber-500/20 text-xs flex items-center justify-between flex-wrap gap-2 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-900 dark:text-slate-100">الجهة الشاغلة:</strong>
                        <span>{selectedUnitAsset.department}</span>
                      </div>
                      {selectedUnitAsset.conditionGrade && (
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-900 dark:text-slate-100">التقييم الفني:</strong>
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md">
                            {selectedUnitAsset.conditionGrade}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                  isLight ? 'bg-slate-100/90 border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-800 text-slate-300'
                }`}>
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    {isRoomLockedEffective
                      ? 'تم قفل طلب الصيانة على هذه المنشأة بموجب مسح رمز الوصول السريع للغرفة (QR) ولا يمكن تغيير المنشأة.'
                      : 'تم قفل المنشأة بموجب مسح رمز الوصول السريع للمنشأة (QR). لا يمكن تغيير المنشأة إلا بإعادة مسح رمز منشأة أخرى.'}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                  <label className={`block font-extrabold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    1. تحديد الوحدة الهندسية / الأصل:
                  </label>

              {/* View Mode Switcher */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setUnitPickerMode('tree_vertical')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer ${
                    unitPickerMode === 'tree_vertical'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="عرض الشجرة الهيكلية (محافظات وحقول)"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>شجرة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUnitPickerMode('tree_horizontal')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer ${
                    unitPickerMode === 'tree_horizontal'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="العرض الأفقي الهيكلي"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>أفقي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUnitPickerMode('dropdown')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition cursor-pointer ${
                    unitPickerMode === 'dropdown'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="قائمة اختيار بسيطة"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>قائمة</span>
                </button>
              </div>
            </div>

            {/* Active Selected Unit Badge Summary */}
            {selectedUnitAsset ? (
              <div className={`p-3 rounded-2xl border flex items-center justify-between flex-wrap gap-2 transition ${
                isLight ? 'bg-amber-50/90 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs flex items-center gap-2">
                      <span>{selectedUnitAsset.code}</span>
                      <span className="opacity-60">•</span>
                      <span>{selectedUnitAsset.name}</span>
                    </div>
                    <div className="text-[10px] opacity-80 flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        محافظة {selectedUnitAsset.governorate}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        حقل {selectedUnitAsset.field}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  تم التحديد
                </span>
              </div>
            ) : null}

            {/* SEARCH INPUT BAR */}
            {unitPickerMode !== 'dropdown' && (
              <div className="relative">
                <Search className={`w-3.5 h-3.5 absolute right-3 top-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="تصفية / بحث عن وحدة بالاسم أو الكود..."
                  className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs font-bold outline-none border ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
                  }`}
                />
              </div>
            )}

            {/* VIEW 1: VERTICAL TREE VIEW */}
            {unitPickerMode === 'tree_vertical' && (
              <div className={`p-3 rounded-2xl border space-y-2 max-h-56 overflow-y-auto ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="font-bold text-slate-500 text-[10px]">
                    شجرة المحافظات والحقول والمنشآت
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allG: Record<string, boolean> = {};
                        const allF: Record<string, boolean> = {};
                        Object.keys(groupedUnits).forEach((g) => {
                          allG[g] = true;
                          Object.keys(groupedUnits[g]).forEach((f) => {
                            allF[`${g}_${f}`] = true;
                          });
                        });
                        setExpandedGovs(allG);
                        setExpandedFields(allF);
                      }}
                      className="text-amber-600 hover:underline font-bold text-[10px] cursor-pointer"
                    >
                      توسيع الكل
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => {
                        const noG: Record<string, boolean> = {};
                        const noF: Record<string, boolean> = {};
                        Object.keys(groupedUnits).forEach((g) => {
                          noG[g] = false;
                          Object.keys(groupedUnits[g]).forEach((f) => {
                            noF[`${g}_${f}`] = false;
                          });
                        });
                        setExpandedGovs(noG);
                        setExpandedFields(noF);
                      }}
                      className="text-slate-400 hover:underline font-bold text-[10px] cursor-pointer"
                    >
                      طي الكل
                    </button>
                  </div>
                </div>

                {Object.keys(groupedUnits).length === 0 ? (
                  <p className="text-center py-4 text-slate-500">لا توجد وحدات هندسية متوفرة.</p>
                ) : (
                  Object.entries(groupedUnits).map(([gov, fieldsMap]) => {
                    const isGovExpanded = expandedGovs[gov] !== false;
                    const govUnitsCount = (Object.values(fieldsMap) as UnitAsset[][]).reduce((acc, arr) => acc + arr.length, 0);

                    return (
                      <div key={gov} className="space-y-1">
                        {/* GOVERNORATE NODE */}
                        <button
                          type="button"
                          onClick={() => setExpandedGovs((prev) => ({ ...prev, [gov]: !isGovExpanded }))}
                          className={`w-full flex items-center justify-between p-2 rounded-xl font-bold text-xs transition cursor-pointer border ${
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                              : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isGovExpanded ? (
                              <ChevronDown className="w-4 h-4 text-amber-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            <MapPin className="w-4 h-4 text-amber-500" />
                            <span>محافظة {gov}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                            {govUnitsCount} وحدة
                          </span>
                        </button>

                        {/* OILFIELDS UNDER GOVERNORATE */}
                        {isGovExpanded && (
                          <div className="pr-4 pl-1 space-y-1.5 border-r-2 border-amber-500/30 mr-3 my-1">
                            {Object.entries(fieldsMap).map(([fld, unitArr]) => {
                              const fieldKey = `${gov}_${fld}`;
                              const isFldExpanded = expandedFields[fieldKey] !== false;

                              // Filter units if searching
                              const matchedUnits = unitArr.filter((u) =>
                                !unitSearch.trim()
                                  ? true
                                  : u.code.toLowerCase().includes(unitSearch.toLowerCase()) ||
                                    u.name.toLowerCase().includes(unitSearch.toLowerCase())
                              );

                              if (unitSearch.trim() && matchedUnits.length === 0) return null;

                              return (
                                <div key={fld} className="space-y-1">
                                  {/* OILFIELD NODE */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedFields((prev) => ({
                                        ...prev,
                                        [fieldKey]: !isFldExpanded,
                                      }))
                                    }
                                    className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                      isLight
                                        ? 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
                                        : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {isFldExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                                      <span>حقل {fld}</span>
                                    </div>
                                    <span className="text-[10px] opacity-70">
                                      ({matchedUnits.length} منشأة)
                                    </span>
                                  </button>

                                  {/* UNITS UNDER OILFIELD */}
                                  {isFldExpanded && (
                                    <div className="pr-4 space-y-1 border-r border-slate-300 dark:border-slate-700 mr-2 my-1">
                                      {matchedUnits.map((u) => {
                                        const isSelected = unitCode === u.code;
                                        return (
                                          <div
                                            key={u.code}
                                            onClick={() => setUnitCode(u.code)}
                                            className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer border transition ${
                                              isSelected
                                                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-extrabold'
                                                : isLight
                                                ? 'bg-white border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/50'
                                                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-amber-500'}`} />
                                              <div>
                                                <span className="font-mono ml-1.5">{u.code}</span>
                                                <span>- {u.name}</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {isSelected && <Check className="w-4 h-4 font-black" />}
                                            </div>
                                          </div>
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
                  })
                )}
              </div>
            )}

            {/* VIEW 2: HORIZONTAL TREE VIEW */}
            {unitPickerMode === 'tree_horizontal' && (
              <div className={`p-3 rounded-2xl border space-y-3 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>مسار الاختيار الأفقي الهيكلي</span>
                  <span className="text-amber-600 dark:text-amber-400">تصفح أفقياً</span>
                </div>

                {/* STEP 1: HORIZONTAL GOVERNORATES */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">
                    1. اختر المحافظة:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {Object.keys(groupedUnits).map((gov) => {
                      const isActive = (activeGovHoriz || currentUnitGov) === gov;
                      const govUnitsCount = (Object.values(groupedUnits[gov]) as UnitAsset[][]).reduce((a, b) => a + b.length, 0);

                      return (
                        <button
                          key={gov}
                          type="button"
                          onClick={() => {
                            setActiveGovHoriz(gov);
                            const firstFld = Object.keys(groupedUnits[gov])[0];
                            setActiveFieldHoriz(firstFld);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md font-extrabold'
                              : isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{gov}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/10 text-amber-500'}`}>
                            {govUnitsCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 2: HORIZONTAL OILFIELDS UNDER ACTIVE GOVERNORATE */}
                {effectiveGov && groupedUnits[effectiveGov] && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                      <span>2. اختر الحقل النفطي:</span>
                      <ChevronLeft className="w-3 h-3 text-amber-500" />
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {Object.keys(groupedUnits[effectiveGov]).map((fld) => {
                        const isActive = effectiveField === fld;
                        const count = groupedUnits[effectiveGov][fld].length;

                        return (
                          <button
                            key={fld}
                            type="button"
                            onClick={() => setActiveFieldHoriz(fld)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition cursor-pointer ${
                              isActive
                                ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                                : isLight
                                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            <span>{fld}</span>
                            <span className="text-[10px] opacity-70">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: UNITS GRID UNDER ACTIVE FIELD */}
                {effectiveGov && effectiveField && groupedUnits[effectiveGov]?.[effectiveField] && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                      3. انقر لاختيار الوحدة:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {groupedUnits[effectiveGov][effectiveField]
                        .filter((u) =>
                          !unitSearch.trim()
                            ? true
                            : u.code.toLowerCase().includes(unitSearch.toLowerCase()) ||
                              u.name.toLowerCase().includes(unitSearch.toLowerCase())
                        )
                        .map((u) => {
                          const isSelected = unitCode === u.code;
                          return (
                            <div
                              key={u.code}
                              onClick={() => setUnitCode(u.code)}
                              className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-500 text-slate-950 font-extrabold shadow-md'
                                  : isLight
                                  ? 'bg-slate-50 border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/50'
                                  : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800'
                              }`}
                            >
                              <div>
                                <div className="font-mono text-xs font-bold">{u.code}</div>
                                <div className="text-[11px] mt-0.5 truncate max-w-[140px]">{u.name}</div>
                              </div>
                              {isSelected ? (
                                <span className="px-1.5 py-0.5 rounded-lg bg-slate-950 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> تم
                                </span>
                              ) : (
                                <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                                  isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400'
                                }`}>
                                  تحديد
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: SIMPLE DROPDOWN */}
            {unitPickerMode === 'dropdown' && (
              <select
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value)}
                className={`w-full rounded-xl p-3 font-bold outline-none cursor-pointer border ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
                }`}
              >
                {units.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.code} - {u.name} (محافظة {u.governorate} - حقل {u.field})
                  </option>
                ))}
              </select>
            )}
              </>
            )}
          </div>

          {/* SECTION 2: MAINTENANCE SCOPE & ROOM SELECTION */}
          {isRoomLockedEffective ? (
            <div className={`p-4 rounded-2xl border space-y-3.5 transition ${
              isLight ? 'bg-amber-50/70 border-amber-300 shadow-xs' : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                <label className={`block font-extrabold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  <DoorClosed className="w-4 h-4 text-amber-500" />
                  <span>2. الغرفة / الفضاء المحدد لطلب الصيانة:</span>
                </label>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-black text-[11px] flex items-center gap-1.5 shadow-sm">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>تم التحديد والقفل عبر رمز الوصول السريع للغرفة (QR)</span>
                </span>
              </div>

              {/* Locked Room Details Card */}
              <div className={`p-3.5 rounded-2xl border transition ${
                isLight ? 'bg-white border-amber-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-amber-500/30 text-slate-200'
              }`}>
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                      <DoorClosed className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          {selectedRoomName || 'غرفة مخصصة'}
                        </span>
                        {selectedRoomCode && (
                          <>
                            <span className="opacity-60">•</span>
                            <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20">
                              {selectedRoomCode}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-xs opacity-90 flex items-center gap-3 mt-1.5 flex-wrap font-medium">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{selectedRoomFloor || 'الطابق 1'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>الجهة الشاغلة: {occupyingEntity || selectedUnitAsset?.department || 'غير محدد'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>غرفة مقفلة بموجب QR</span>
                  </div>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                isLight ? 'bg-slate-100/90 border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}>
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>تم قفل المنشأة والغرفة تلقائياً بموجب رمز الوصول السريع للغرفة، ولا تظهر خيارات تغيير المنشأة أو الغرفة لضمان دقة توجيه البلاغ.</span>
              </div>
            </div>
          ) : isUnitLockedByQr ? (
            <div className={`p-4 rounded-2xl border space-y-3.5 transition ${
              isLight ? 'bg-sky-50/70 border-sky-300 shadow-xs' : 'bg-sky-500/10 border-sky-500/30'
            }`}>
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                <label className={`block font-extrabold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  <Building2 className="w-4 h-4 text-sky-500" />
                  <span>2. نطاق الصيانة (طلب عام للمنشأة):</span>
                </label>
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 font-black text-[11px] flex items-center gap-1.5 shadow-sm">
                  <Lock className="w-3.5 h-3.5 text-sky-500" />
                  <span>مقفل لكامل المنشأة بموجب رمز الوصول السريع (QR)</span>
                </span>
              </div>

              {/* Locked Unit Maintenance Info Card */}
              <div className={`p-3.5 rounded-2xl border transition ${
                isLight ? 'bg-white border-sky-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-sky-500/30 text-slate-200'
              }`}>
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-sky-500 text-white font-black flex items-center justify-center shrink-0 shadow-md">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          {selectedUnitAsset?.name || unitCode}
                        </span>
                        <span className="font-mono text-xs font-black text-sky-700 dark:text-sky-400 bg-sky-500/10 dark:bg-sky-500/20 px-2 py-0.5 rounded-lg border border-sky-500/20">
                          {unitCode}
                        </span>
                      </div>
                      <div className="text-xs opacity-90 flex items-center gap-3 mt-1.5 flex-wrap font-medium">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{selectedUnitAsset?.field} ({selectedUnitAsset?.governorate})</span>
                        </span>
                        <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>الجهة الشاغلة: {selectedUnitAsset?.department || 'غير محدد'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-bold shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>طلب عام لكامل المنشأة</span>
                  </div>
                </div>
              </div>

              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                isLight ? 'bg-slate-100/90 border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}>
                <Lock className="w-4 h-4 text-sky-500 shrink-0" />
                <span>تم قفل طلب الصيانة ليكون طلباً عاماً لكامل المنشأة حصراً بموجب مسح رمز الوصول السريع للمنشأة (QR Code)، ولا يمكن تحديد غرف فردية.</span>
              </div>
            </div>
          ) : (
          <div className={`p-4 rounded-2xl border space-y-4 transition ${
            maintenanceScope === 'room'
              ? isLight ? 'bg-amber-50/70 border-amber-300 shadow-xs' : 'bg-amber-500/10 border-amber-500/30'
              : isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            {/* Header & Scope Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b pb-3 border-slate-200 dark:border-slate-800">
              <label className={`block font-extrabold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <DoorClosed className="w-4 h-4 text-amber-500" />
                <span>2. نطاق الصيانة (لكامل المنشأة أو لغرفة محددة):</span>
              </label>

              {/* Scope Segmented Control */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-700 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleScopeChange('unit')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                    maintenanceScope === 'unit'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>لكامل المنشأة</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeChange('room')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
                    maintenanceScope === 'room'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <DoorClosed className="w-3.5 h-3.5" />
                  <span>لغرفة / فضاء مخصص</span>
                  {selectedUnitAsset?.rooms && selectedUnitAsset.rooms.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/20 dark:bg-white/20 font-mono">
                      {selectedUnitAsset.rooms.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Scope = Whole Unit Banner */}
            {maintenanceScope === 'unit' && (
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-sky-50/70 border-sky-200 text-sky-900' : 'bg-sky-500/10 border-sky-500/20 text-sky-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-500 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">طلب صيانة عام لكامل المنشأة</div>
                    <div className="text-[11px] opacity-80">
                      سيتم فتح البلاغ لمجمل الوحدة ({selectedUnitAsset?.name || unitCode}) دون تقييده بفضاء أو غرفة معينة.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleScopeChange('room')}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 hover:bg-sky-50 transition shrink-0"
                >
                  تحديد غرفة معينة
                </button>
              </div>
            )}

            {/* Scope = Specific Room Interface */}
            {maintenanceScope === 'room' && (
              <div className="space-y-3.5">
                {selectedUnitAsset?.rooms && selectedUnitAsset.rooms.length > 0 ? (
                  <>
                    {/* View Controls & Filter Tabs */}
                    <div className="space-y-2.5">
                      {/* Room Search & View Switcher */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={roomSearchQuery}
                            onChange={(e) => setRoomSearchQuery(e.target.value)}
                            placeholder="ابحث في غرف المنشأة بالاسم أو الرمز أو الجهة الشاغلة..."
                            className={`w-full pr-8 pl-3 py-1.5 rounded-xl text-xs outline-none border transition ${
                              isLight
                                ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                                : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                            }`}
                          />
                          {roomSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setRoomSearchQuery('')}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => setRoomViewMode('cards')}
                            className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition ${
                              roomViewMode === 'cards'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="عرض بطاقات الغرف التفاعلية"
                          >
                            <LayoutGrid className="w-3 h-3" />
                            <span>بطاقات الغرف</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRoomViewMode('dropdown')}
                            className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition ${
                              roomViewMode === 'dropdown'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="قائمة منسدلة سريعة"
                          >
                            <List className="w-3 h-3" />
                            <span>قائمة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRoomViewMode('manual')}
                            className={`px-2 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition ${
                              roomViewMode === 'manual'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="إدخال يدوي لغرفة مخصصة"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>إدخال يدوي</span>
                          </button>
                        </div>
                      </div>

                      {/* Filter Chips by Room Types */}
                      {availableRoomTypes.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                            <Filter className="w-3 h-3" />
                            <span>النوع:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setRoomTypeFilter('all')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition ${
                              roomTypeFilter === 'all'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : isLight
                                ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            }`}
                          >
                            كافة الأنواع ({selectedUnitAsset.rooms.length})
                          </button>
                          {availableRoomTypes.map(({ type, count }) => {
                            const config = getRoomTypeConfig(type);
                            const IconComponent = config.icon;
                            const isTypeActive = roomTypeFilter === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setRoomTypeFilter(type)}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition flex items-center gap-1 ${
                                  isTypeActive
                                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                                    : isLight
                                    ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                }`}
                              >
                                <IconComponent className="w-3 h-3 shrink-0" />
                                <span>{type}</span>
                                <span className="font-mono text-[10px] opacity-75">({count})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Filter Chips by Floor */}
                      {availableFloors.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            <span>الطابق:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setRoomFloorFilter('all')}
                            className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] whitespace-nowrap transition ${
                              roomFloorFilter === 'all'
                                ? 'bg-sky-500 text-slate-950 shadow-xs'
                                : isLight
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            كافة الطوابق
                          </button>
                          {availableFloors.map(({ floor, count }) => {
                            const isFloorActive = roomFloorFilter === floor;
                            return (
                              <button
                                key={floor}
                                type="button"
                                onClick={() => setRoomFloorFilter(floor)}
                                className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] whitespace-nowrap transition flex items-center gap-1 ${
                                  isFloorActive
                                    ? 'bg-sky-500 text-slate-950 shadow-xs'
                                    : isLight
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                <span>{floor}</span>
                                <span className="font-mono text-[9px] opacity-75">({count})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Mode 1: Interactive Cards Grid */}
                    {roomViewMode === 'cards' && (
                      <div className="space-y-2">
                        {filteredRooms.length === 0 ? (
                          <div className={`p-6 rounded-xl border text-center space-y-1.5 ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                          }`}>
                            <DoorClosed className="w-6 h-6 text-slate-400 mx-auto" />
                            <div className="font-bold text-xs text-slate-500">لا توجد غرف تطابق معايير البحث والفلترة</div>
                            <button
                              type="button"
                              onClick={() => {
                                setRoomTypeFilter('all');
                                setRoomFloorFilter('all');
                                setRoomSearchQuery('');
                              }}
                              className="text-[11px] font-bold text-amber-500 hover:underline"
                            >
                              إعادة ضبط الفلاتر
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1 pr-2 scrollbar-thin">
                            {filteredRooms.map((rm) => {
                              const isSelected = selectedRoomCode === (rm.code || rm.name) || selectedRoomName === rm.name;
                              const config = getRoomTypeConfig(rm.type);
                              const IconComponent = config.icon;

                              return (
                                <button
                                  key={rm.id || rm.code || rm.name}
                                  type="button"
                                  onClick={() => handleSelectRoom(rm.code || rm.name)}
                                  className={`text-right p-3 rounded-xl border flex flex-col justify-between gap-2 transition group relative ${
                                    isSelected
                                      ? isLight
                                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30 shadow-sm'
                                        : 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30'
                                      : isLight
                                      ? 'bg-white hover:bg-slate-50 border-slate-200 hover:border-amber-300'
                                      : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  {/* Top Row: Type badge & Selection indicator */}
                                  <div className="flex items-center justify-between gap-1.5 w-full">
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 border ${config.color}`}>
                                      <IconComponent className="w-3 h-3 shrink-0" />
                                      <span>{rm.type || 'غرفة عامة'}</span>
                                    </span>

                                    {isSelected ? (
                                      <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded-md">
                                        <Check className="w-3 h-3" />
                                        <span>محددة</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {rm.floor || 'الطابق 1'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Middle Row: Room Name & Code */}
                                  <div className="w-full">
                                    <div className={`font-black text-xs group-hover:text-amber-500 transition line-clamp-1 ${
                                      isSelected ? 'text-amber-900 dark:text-amber-200' : isLight ? 'text-slate-900' : 'text-slate-100'
                                    }`}>
                                      {rm.name}
                                    </div>
                                    {rm.code && (
                                      <div className="font-mono text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                        {rm.code}
                                      </div>
                                    )}
                                  </div>

                                  {/* Bottom Row: Occupying entity & Area */}
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 w-full">
                                    <span className="line-clamp-1 flex items-center gap-1">
                                      <UserCheck className="w-3 h-3 text-sky-500 shrink-0" />
                                      <span>{rm.occupiedBy || selectedUnitAsset?.department || 'غير محدد'}</span>
                                    </span>
                                    {rm.areaSqM ? (
                                      <span className="font-mono font-bold shrink-0">{rm.areaSqM} م²</span>
                                    ) : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode 2: Quick Dropdown */}
                    {roomViewMode === 'dropdown' && (
                      <div>
                        <select
                          value={selectedRoomCode}
                          onChange={(e) => handleSelectRoom(e.target.value)}
                          className={`w-full rounded-xl p-2.5 font-bold text-xs outline-none cursor-pointer border transition ${
                            isLight
                              ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                          }`}
                        >
                          <option value="">-- اختر الغرفة المطلوبة من السجل ({selectedUnitAsset.rooms.length} غرف) --</option>
                          {selectedUnitAsset.rooms.map((rm) => (
                            <option key={rm.id || rm.code || rm.name} value={rm.code || rm.name}>
                              [{rm.type || 'عام'}] {rm.code ? `${rm.code} - ` : ''}{rm.name} {rm.floor ? `(${rm.floor})` : ''} {rm.occupiedBy ? `[${rm.occupiedBy}]` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                    isLight ? 'bg-amber-50/50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                  }`}>
                    <div className="font-bold flex items-center gap-1.5">
                      <DoorClosed className="w-4 h-4 text-amber-500" />
                      <span>لا توجد غرف مسبقة مدخلة في سجل هذه المنشأة</span>
                    </div>
                    <p className="text-[11px] opacity-85">
                      يمكنك كتابة تفاصيل ورمز واسم الغرفة يدوياً في الحقول أدناه لتوثيقها في أمر الصيانة.
                    </p>
                  </div>
                )}

                {/* Selected Room Details Preview & Manual Editing Fields */}
                <div className={`p-3 rounded-xl border space-y-3 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>بيانات الغرفة المحددة لأمر الصيانة:</span>
                    </span>
                    {selectedRoomCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoomCode('');
                          setSelectedRoomName('');
                          setSelectedRoomFloor('');
                        }}
                        className="text-[10px] font-bold text-red-500 hover:underline"
                      >
                        إلغاء تحديد الغرفة
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={`block font-bold mb-1 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        رمز الغرفة (Room Code):
                      </label>
                      <input
                        type="text"
                        value={selectedRoomCode}
                        onChange={(e) => setSelectedRoomCode(e.target.value)}
                        placeholder="مثال: A398-F1-OFF-101"
                        className={`w-full rounded-xl p-2 font-mono font-bold text-xs outline-none border transition ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                            : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        اسم / وصف الغرفة:
                      </label>
                      <input
                        type="text"
                        value={selectedRoomName}
                        onChange={(e) => setSelectedRoomName(e.target.value)}
                        placeholder="مثال: مكتب مدير القسم"
                        className={`w-full rounded-xl p-2 font-bold text-xs outline-none border transition ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                            : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        الطابق:
                      </label>
                      <input
                        type="text"
                        value={selectedRoomFloor}
                        onChange={(e) => setSelectedRoomFloor(e.target.value)}
                        placeholder="مثال: الطابق 1"
                        className={`w-full rounded-xl p-2 font-bold text-xs outline-none border transition ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                            : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 text-[11px] flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      <UserCheck className="w-3.5 h-3.5 text-sky-500" />
                      <span>الجهة الشاغلة (Occupying Entity):</span>
                      <span className="text-[10px] text-amber-500 font-normal mr-auto">(تحدد تلقائياً من بيانات الأصل)</span>
                    </label>
                    <input
                      type="text"
                      value={occupyingEntity}
                      readOnly
                      placeholder="الجهة الشاغلة من بيانات الغرفة / المنشأة"
                      className={`w-full rounded-xl p-2 font-bold text-xs outline-none border transition cursor-not-allowed ${
                        isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      الجهة الشاغلة مستوردة تلقائياً من بيانات الغرفة المعتمدة بالسجل ولا يمكن تعديلها يدوياً.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scope = Whole unit occupying entity input */}
            {maintenanceScope === 'unit' && (
              <div>
                <label className={`block font-bold mb-1 text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  <UserCheck className="w-3.5 h-3.5 text-sky-500" />
                  <span>الجهة الشاغلة / المسؤولة عن المنشأة:</span>
                  <span className="text-[10px] text-amber-500 font-normal mr-auto">(تحدد تلقائياً من بيانات الأصل)</span>
                </label>
                <input
                  type="text"
                  value={occupyingEntity}
                  readOnly
                  placeholder="الجهة الشاغلة من بيانات المنشأة"
                  className={`w-full rounded-xl p-2.5 font-bold text-xs outline-none border transition cursor-not-allowed ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  الجهة الشاغلة مستوردة تلقائياً من سجل المنشأة ولا يمكن تعديلها يدوياً لضمان سلامة التوثيق.
                </span>
              </div>
            )}
          </div>
          )}

          {/* SECTION 3: MAINTENANCE REQUEST DETAILS */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
            <label className={`block font-extrabold text-xs border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-slate-100 border-slate-800'}`}>
              3. تفاصيل ومعلومات طلب الصيانة:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className={`block font-bold mb-1 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  وصف العطل / المشكلة:
                </label>
                <textarea
                  rows={3}
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="مثال: تسرب مياه، أعطال منظومة التكييف والتبريد، تلف القواطع الكهربائية..."
                  className={`w-full rounded-xl p-3 font-medium outline-none border transition ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  تاريخ طلب الصيانة:
                </label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold font-mono outline-none border transition ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  أولوية الطلب:
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer border transition ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                  }`}
                >
                  <option value="critical">حرج جداً (طارئ وفوري)</option>
                  <option value="normal">عادي (اعتيادي)</option>
                  <option value="low">منخفض (وقائي / ثانوي)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={`block font-bold mb-1 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  جهة الصيانة المختصة (توجيه الطلب):
                </label>
                <select
                  value={maintenanceDepartment}
                  onChange={(e) => setMaintenanceDepartment(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer border transition ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                  }`}
                  required
                >
                  {maintenanceDepartments
                    .filter((d) => d.status === 'active')
                    .map((dept) => (
                      <option key={dept.id} value={dept.nameAr}>
                        {dept.nameAr} {dept.nameEn ? `(${dept.nameEn})` : ''}
                      </option>
                    ))}
                  {maintenanceDepartments.filter((d) => d.status === 'active').length === 0 && (
                    <>
                      <option value="الصيانة الكهربائية">الصيانة الكهربائية</option>
                      <option value="الصيانة الميكانيكية">الصيانة الميكانيكية</option>
                      <option value="الصيانة الإنشائية">الصيانة الإنشائية</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: ATTACHMENT / CAMERA UPLOAD (OPTIONAL) */}
          <div className={`p-4 rounded-2xl border space-y-3 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <label className={`block font-extrabold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <Camera className="w-4 h-4 text-amber-500" />
                <span>3. رفع ملفات أو التقاط صور للعطل (يتم ضغطها وتشفيرها تلقائياً):</span>
              </label>
              <span className="text-[10px] text-slate-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full text-amber-600 dark:text-amber-400">
                {attachments.length > 0 ? `${attachments.length} مرفق مضاف` : 'اختياري'}
              </span>
            </div>

            {/* Hidden File Inputs */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={cameraInputRef}
              onChange={handleFilesSelected}
              className="hidden"
            />
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              ref={fileInputRef}
              onChange={handleFilesSelected}
              className="hidden"
            />

            {/* Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isProcessingFiles}
                onClick={() => cameraInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isProcessingFiles ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>{isProcessingFiles ? 'جاري ضغط ومعالجة الصورة...' : 'التقاط صورة عبر الكاميرا'}</span>
              </button>

              <button
                type="button"
                disabled={isProcessingFiles}
                onClick={() => fileInputRef.current?.click()}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                {isProcessingFiles ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <Upload className="w-4 h-4 text-emerald-400" />
                )}
                <span>{isProcessingFiles ? 'جاري تجهيز المرفقات...' : 'اختيار ملفات / صور من الجهاز'}</span>
              </button>
            </div>

            {/* Attached files list */}
            {attachments.length > 0 ? (
              <div className="space-y-2 pt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs animate-fadeIn"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.type?.startsWith('image/') || att.url.startsWith('data:image/') ? (
                        <img
                          src={att.url}
                          alt="Attachment Preview"
                          className="w-10 h-10 object-cover rounded-lg border border-emerald-500/40 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <FileCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-emerald-400 truncate max-w-[200px]" title={att.name}>
                          {att.name}
                        </div>
                        {att.size && (
                          <div className="text-[10px] text-emerald-500/80">
                            {(att.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewItem({
                            title: 'معاينة مرفق طلب الصيانة',
                            url: att.url,
                            fileName: att.name,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 transition cursor-pointer"
                        title="إزالة المرفق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-0.5">
                يمكنك التقاط صورة من الكاميرا مباشرة لتوثيق العطل أو إرسال الطلب بدون مرفق.
              </p>
            )}
          </div>

          {/* VALIDATION ERROR MESSAGE */}
          {validationError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-bold text-xs flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-red-500" />
              <span>{validationError}</span>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold transition cursor-pointer text-center ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              <span>إرسال وحفظ طلب الصيانة</span>
            </button>
          </div>
        </form>
      </div>

      {/* FULL PREVIEW MODAL FOR ATTACHMENT */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 w-full max-w-2xl space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm sm:text-base text-white">{previewItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-black/50 border border-slate-800/80 flex items-center justify-center p-2 min-h-[220px]">
              {previewItem.url.startsWith('data:image/') ||
              previewItem.fileName.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i) ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.fileName}
                  className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-16 h-16 text-amber-500 mx-auto" />
                  <p className="text-sm font-bold text-white">{previewItem.fileName}</p>
                  <p className="text-xs text-slate-400">مستند مرفق</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <a
                href={previewItem.url}
                download={previewItem.fileName}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل المرفق</span>
              </a>

              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
