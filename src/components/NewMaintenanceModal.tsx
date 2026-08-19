import React, { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { MaintenanceRequest, MaintenancePriority, UnitAsset, SystemUser, ReportAttachment } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface NewMaintenanceModalProps {
  units?: UnitAsset[];
  initialUnitCode?: string;
  onAddRequest: (req: MaintenanceRequest) => void;
  onClose: () => void;
  isLight?: boolean;
  currentUser?: SystemUser | null;
}

export const NewMaintenanceModal: React.FC<NewMaintenanceModalProps> = ({
  units = [],
  initialUnitCode = 'WS-AHD-BLD-014',
  onAddRequest,
  onClose,
  isLight = false,
  currentUser,
}) => {
  const [unitCode, setUnitCode] = useState(initialUnitCode || (units[0]?.code ?? 'WS-AHD-BLD-014'));
  const [unitPickerMode, setUnitPickerMode] = useState<'tree_vertical' | 'tree_horizontal' | 'dropdown'>('tree_vertical');
  const [unitSearch, setUnitSearch] = useState('');
  const [expandedGovs, setExpandedGovs] = useState<Record<string, boolean>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [activeGovHoriz, setActiveGovHoriz] = useState<string>('');
  const [activeFieldHoriz, setActiveFieldHoriz] = useState<string>('');

  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('normal');
  const [assignedTo, setAssignedTo] = useState('فريق الصيانة الميدانية بالموقع');
  const [validationError, setValidationError] = useState('');

  // Multi-file Attachments State
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [previewItem, setPreviewItem] = useState<{ title: string; url: string; fileName: string } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setValidationError('');

    Array.from(files).forEach((file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        setValidationError('حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)، الرجاء ضغط الصورة أو اختيار ملف أصغر.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const newAtt: ReportAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          url: result,
          type: file.type,
          size: file.size,
        };
        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
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

  // Selected unit asset details
  const selectedUnitAsset = useMemo(() => {
    return units.find((u) => u.code === unitCode);
  }, [units, unitCode]);

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

    if (!issue.trim()) {
      setValidationError('يرجى كتابة وصف المشكلة أو الأعمال المطلوبة.');
      return;
    }

    const year = new Date().getFullYear();
    const uniqueSuffix = Date.now().toString(36).slice(-6).toUpperCase();

    const newReq: MaintenanceRequest = {
      id: `MR-${year}-${uniqueSuffix}`,
      unitCode: selectedAsset.code,
      field: selectedAsset.field,
      issue,
      priority,
      slaDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      assignedTo,
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
          </div>

          {/* SECTION 2: MAINTENANCE REQUEST DETAILS */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
            <label className={`block font-extrabold text-xs border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-slate-100 border-slate-800'}`}>
              2. تفاصيل ومعلومات طلب الصيانة:
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
                  الجهة / الفريق المكلف بالصيانة:
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="اسم الفريق الفني أو المقاول المكلف..."
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border transition ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: ATTACHMENT / CAMERA UPLOAD (OPTIONAL) */}
          <div className={`p-4 rounded-2xl border space-y-3 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <label className={`block font-extrabold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <Camera className="w-4 h-4 text-amber-500" />
                <span>3. رفع ملفات أو التقاط صور للعطل (حتى 5 ميجابايت لكل ملف):</span>
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
                onClick={() => cameraInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>التقاط صورة عبر الكاميرا</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>اختيار ملفات / صور من الجهاز</span>
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
