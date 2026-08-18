import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Building,
  MapPin,
  Calendar,
  Layers,
  Search,
  PlusCircle,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Award,
  ChevronLeft,
  Flame,
  ArrowRight,
  Info,
  Clock,
  UserCheck,
  QrCode,
  Camera,
  Upload,
  Eye,
  Trash2,
  Image as ImageIcon,
  FileCheck,
  Archive,
  Download,
  X,
} from 'lucide-react';
import {
  UnitAsset,
  PeriodicInspectionSchedule,
  InspectionType,
  ConditionGrade,
  InspectionStatus,
  SystemUser,
  MaintenanceRequest,
} from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import * as api from '../services/apiClient';

interface FieldInspectionViewProps {
  units: UnitAsset[];
  periodicInspections: PeriodicInspectionSchedule[];
  currentUser: SystemUser | null;
  onAddInspection: (inspection: PeriodicInspectionSchedule) => void;
  onUpdateGrade?: (unitCode: string, newGrade: ConditionGrade) => void;
  onOpenMaintenanceModal: (unitCode: string) => void;
  theme?: 'dark' | 'light';
  initialUnitCode?: string;
}

export const FieldInspectionView: React.FC<FieldInspectionViewProps> = ({
  units,
  periodicInspections,
  currentUser,
  onAddInspection,
  onUpdateGrade,
  onOpenMaintenanceModal,
  theme = 'dark',
  initialUnitCode = '',
}) => {
  const isLight = theme === 'light';

  // Selected Unit state
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(initialUnitCode || '');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (initialUnitCode) {
      setSelectedUnitCode(initialUnitCode);
    }
  }, [initialUnitCode]);

  // Mode: 'overview' | 'new_inspection' | 'unit_archive'
  const [viewMode, setViewMode] = useState<'overview' | 'new_inspection' | 'unit_archive'>('overview');

  // New Inspection Form State
  const [inspectionType, setInspectionType] = useState<InspectionType>('structural');
  const [inspectionTitle, setInspectionTitle] = useState<string>('كشف ميداني دوري شامل');
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>('B');
  const [findings, setFindings] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // File & Camera upload state
  const [reportFileName, setReportFileName] = useState<string>('');
  const [reportFileUrl, setReportFileUrl] = useState<string>('');
  const [reportFileType, setReportFileType] = useState<string>('');
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Photo / Document Viewer Modal State
  const [previewItem, setPreviewItem] = useState<{ title: string; url: string; fileName: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Selected Unit Asset
  const currentUnit = useMemo(() => {
    return units.find((u) => u.code === selectedUnitCode) || null;
  }, [units, selectedUnitCode]);

  // All completed inspections recorded for this unit
  const unitCompletedInspections = useMemo(() => {
    if (!selectedUnitCode) return [];
    return periodicInspections
      .filter((ins) => ins.unitCode === selectedUnitCode && ins.status === 'completed')
      .sort((a, b) => {
        const dateA = a.completionDate || a.lastInspectionDate || a.createdAt;
        const dateB = b.completionDate || b.lastInspectionDate || b.createdAt;
        return dateB.localeCompare(dateA);
      });
  }, [periodicInspections, selectedUnitCode]);

  // Last inspection recorded for this unit
  const lastInspection = useMemo(() => {
    return unitCompletedInspections[0] || null;
  }, [unitCompletedInspections]);

  // Handle Camera and File Pickers
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReportFileName(file.name);
    setReportFileType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setReportFileUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so selecting the same file triggers onChange again
    e.target.value = '';
  };

  const handleRemoveFile = () => {
    setReportFileName('');
    setReportFileUrl('');
    setReportFileType('');
  };

  // Filtered units list for manual selection
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;
    const query = searchQuery.toLowerCase().trim();
    return units.filter(
      (u) =>
        u.code.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query) ||
        (u.field && u.field.toLowerCase().includes(query)) ||
        (u.governorate && u.governorate.toLowerCase().includes(query))
    );
  }, [units, searchQuery]);

  // Handle Form Submit
  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUnit) {
      setSubmitError('يرجى تحديد وحدة صالحة لإجراء الكشف.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const nowIso = new Date().toISOString().split('T')[0];
    const newId = `INS-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const newInspection: PeriodicInspectionSchedule = {
      id: newId,
      unitCode: currentUnit.code,
      unitName: currentUnit.name,
      field: currentUnit.field || 'الأحدب',
      governorate: currentUnit.governorate || 'واسط',
      inspectionType,
      title: inspectionTitle.trim() || `كشف ميداني - ${currentUnit.name}`,
      frequency: 'custom',
      lastInspectionDate: nowIso,
      nextDueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignedTeam: 'شعبة الفحص الهندسي الميداني',
      inspectorName: currentUser?.name || 'مفتش ميداني معتمد',
      performedByName: currentUser?.name || 'مفتش ميداني معتمد',
      status: 'completed',
      completionDate: nowIso,
      conditionGradeGiven: conditionGrade,
      findings: findings.trim() || 'تمت معاينة الهيكل الإنشائي وكافة الملحقات الميدانية.',
      recommendations: recommendations.trim() || 'استمرار التشغيل والمراقبة الدورية.',
      notes: notes.trim() || '',
      reportFileName: reportFileName || undefined,
      reportFileUrl: reportFileUrl || undefined,
      createdAt: nowIso,
    };

    try {
      // Direct single record API addition as required
      const saved = await api.addPeriodicInspection(newInspection);
      onAddInspection(saved);
      if (onUpdateGrade && currentUnit.code) {
        onUpdateGrade(currentUnit.code, conditionGrade);
      }

      setSubmitSuccessMsg(`تم تسجيل واعتماد تقرير الكشف بنجاح بالرقم: ${newInspection.id}`);
      setIsSubmitting(false);
      setViewMode('overview');

      // Reset Form fields
      setFindings('');
      setRecommendations('');
      setNotes('');
      setReportFileName('');
      setReportFileUrl('');
      setReportFileType('');

      setTimeout(() => setSubmitSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error('Failed to save inspection:', err);
      // Fallback local addition
      onAddInspection(newInspection);
      if (onUpdateGrade && currentUnit.code) {
        onUpdateGrade(currentUnit.code, conditionGrade);
      }
      setSubmitSuccessMsg(`تم حفظ الكشف محلياً بنجاح بالرقم: ${newInspection.id}`);
      setIsSubmitting(false);
      setViewMode('overview');
      setFindings('');
      setRecommendations('');
      setNotes('');
      setReportFileName('');
      setReportFileUrl('');
      setReportFileType('');
      setTimeout(() => setSubmitSuccessMsg(null), 6000);
    }
  };

  const getGradeBadge = (grade?: ConditionGrade) => {
    switch (grade) {
      case 'A':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'B':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'C':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'D':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3 py-4 sm:py-6 space-y-4 font-sans antialiased text-right" dir="rtl">
      {/* Header Banner - Field Inspector Mobile Optimized */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border shadow-xl flex items-center justify-between gap-3 transition-colors ${
          isLight
            ? 'bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border-amber-200 text-slate-900 shadow-slate-200/60'
            : 'bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-amber-500/30 text-white shadow-2xl'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-black shadow-inner shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-lg tracking-tight">نظام الكشف الميداني السريع</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40">
                QR Mobile
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              معاينة الكرفانات والمنشآت وتوثيق الحالة الإنشائية بالصور والملاحظات
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs font-bold text-slate-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>{currentUser.name}</span>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {submitSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-bold flex items-center gap-3 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <div className="flex-1">
            <span>{submitSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* Manual Search & Selector (Fallback when not using QR or switching) */}
      <div
        className={`rounded-2xl p-3.5 sm:p-4 border shadow-sm space-y-2.5 transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-amber-500">
            <Building className="w-4 h-4" />
            <span>اختيار أو تغيير الوحدة المستهدفة للكشف</span>
          </span>
          <span className="text-[11px] text-slate-500">({filteredUnits.length} وحدة متاحة)</span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برمز الوحدة (مثال: WS-AHD-BLD-014) أو اسم المنشأة..."
            className={`w-full rounded-xl pr-9 pl-3 py-2.5 text-xs sm:text-sm font-medium focus:outline-none transition border ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white'
                : 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
            }`}
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Quick Horizontal Chips or Select Dropdown for units */}
        <div className="space-y-1.5">
          <select
            value={selectedUnitCode}
            onChange={(e) => {
              setSelectedUnitCode(e.target.value);
              setViewMode('overview');
            }}
            className={`w-full rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold font-mono focus:outline-none transition cursor-pointer border ${
              isLight
                ? 'bg-amber-50/60 border-amber-200 text-slate-900 focus:border-amber-500'
                : 'bg-slate-950 border-slate-800 text-amber-400 focus:border-amber-500'
            }`}
          >
            <option value="" disabled className={isLight ? 'bg-white text-slate-500' : 'bg-slate-900 text-slate-400'}>
              -- اضغط لاختيار الوحدة المستهدفة للكشف --
            </option>
            {filteredUnits.map((u) => (
              <option key={u.code} value={u.code} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                {u.code} - {u.name} ({u.field || u.governorate})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Guidance Message when no unit is selected */}
      {!currentUnit && (
        <div
          className={`rounded-2xl p-6 sm:p-8 border shadow-lg text-center space-y-3 transition-colors ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/60'
              : 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-2xl'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-black">لم يتم اختيار أي وحدة بعد</h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              يرجى مسح رمز QR الخاص بالوحدة أو اختيار وحدة يدوياً من قائمة البحث أعلاه لبدء كشف هندسي جديد أو تسجيل طلب صيانة.
            </p>
          </div>
        </div>
      )}

      {/* Main Container - Overview Mode */}
      {currentUnit && viewMode === 'overview' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Unit Summary Card - Big and Clear for Mobile */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border shadow-xl space-y-4 transition-colors ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/70'
                : 'bg-slate-900 border-slate-800 text-slate-100 shadow-2xl'
            }`}
          >
            {/* Title & Code */}
            <div className="flex items-start justify-between gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">
                  بيانات المنشأة المحددة
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                  {currentUnit.name}
                </h2>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-500">
                  <span>{toArabicDigits(currentUnit.code)}</span>
                  <span>•</span>
                  <span className="text-slate-500 font-sans">{currentUnit.type === 'building' ? 'مبنى خرساني' : 'كرفان حقلي'}</span>
                </div>
              </div>

              <div className="text-center shrink-0">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-black border inline-block ${getGradeBadge(
                    currentUnit.conditionGrade
                  )}`}
                >
                  Grade {currentUnit.conditionGrade}
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">الحالة الحالية</span>
              </div>
            </div>

            {/* Quick Spec Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div
                className={`p-3 rounded-xl border text-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <MapPin className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span className="text-[10px] text-slate-500 block">الحقل والمحافظة</span>
                <span className="font-bold truncate block">{currentUnit.field} • {currentUnit.governorate}</span>
              </div>

              <div
                className={`p-3 rounded-xl border text-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <Layers className="w-4 h-4 text-sky-500 mx-auto mb-1" />
                <span className="text-[10px] text-slate-500 block">عدد الطوابق</span>
                <span className="font-bold block">{toArabicDigits(currentUnit.floorsCount || 1)} طابق</span>
              </div>

              <div
                className={`p-3 rounded-xl border text-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <Building className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <span className="text-[10px] text-slate-500 block">المساحة الإجمالية</span>
                <span className="font-bold block">{toArabicDigits(currentUnit.totalAreaSqM)} م²</span>
              </div>

              <div
                className={`p-3 rounded-xl border text-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <Calendar className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                <span className="text-[10px] text-slate-500 block">سنة التشييد</span>
                <span className="font-bold block">{toArabicDigits(currentUnit.constructionYear || 2020)}</span>
              </div>
            </div>

            {/* Department / Occupier */}
            {currentUnit.department && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/50 border-slate-800 text-slate-300'
                }`}
              >
                <Info className="w-4 h-4 text-amber-500 shrink-0" />
                <span><strong>الجهة الشاغلة:</strong> {currentUnit.department}</span>
              </div>
            )}

            {/* Last Inspection Info Card with Findings, Recommendations & Attached Photo */}
            <div
              className={`p-3.5 rounded-xl border space-y-2 ${
                isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>آخر كشف فني مسجل لهذه المنشأة</span>
                </span>
                {lastInspection ? (
                  <span className="font-mono">{toArabicDigits(lastInspection.completionDate || lastInspection.lastInspectionDate)}</span>
                ) : (
                  <span className="text-slate-500 text-[11px]">لا يوجد كشف سابق مسجل</span>
                )}
              </div>

              {lastInspection ? (
                <div className="text-xs space-y-1.5 pt-1 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <p><strong>مُنفِّذ الكشف:</strong> {lastInspection.performedByName || lastInspection.inspectorName}</p>
                    {lastInspection.conditionGradeGiven && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Grade {lastInspection.conditionGradeGiven}
                      </span>
                    )}
                  </div>

                  {lastInspection.findings && (
                    <div className="p-2 rounded-lg bg-black/5 dark:bg-black/20 text-slate-700 dark:text-slate-300 text-xs">
                      <span className="font-bold text-amber-500 block mb-0.5">الملاحظات والنتائج الميدانية:</span>
                      <p className="leading-relaxed">{lastInspection.findings}</p>
                    </div>
                  )}

                  {lastInspection.recommendations && (
                    <div className="p-2 rounded-lg bg-black/5 dark:bg-black/20 text-slate-700 dark:text-slate-300 text-xs">
                      <span className="font-bold text-emerald-500 block mb-0.5">التوصيات والإجراءات المطلوب اتخاذها:</span>
                      <p className="leading-relaxed">{lastInspection.recommendations}</p>
                    </div>
                  )}

                  {/* Attached File / Photo Preview */}
                  {lastInspection.reportFileName && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-[11px] font-bold text-emerald-400 truncate" title={lastInspection.reportFileName}>
                          {lastInspection.reportFileName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {lastInspection.reportFileUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewItem({
                                title: `مرفق الكشف - ${lastInspection.title}`,
                                url: lastInspection.reportFileUrl!,
                                fileName: lastInspection.reportFileName!,
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-400 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>معاينة الصورة / الملف</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">هذه المنشأة لم تخضع لكشف فني مؤخراً. يوصى ببدء كشف ميداني فوري.</p>
              )}
            </div>

            {/* Previous Inspections Archive Link */}
            {unitCompletedInspections.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('unit_archive')}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-amber-500" />
                  <span>عرض سجل وكافة كشوفات هذه الوحدة السابقة ({toArabicDigits(unitCompletedInspections.length)})</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {/* Primary Action Buttons - Large Touch Targets */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setViewMode('new_inspection')}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm sm:text-base bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg hover:shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <PlusCircle className="w-5 h-5" />
                <span>بدء كشف هندسي جديد لهذي الوحدة</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenMaintenanceModal(currentUnit.code)}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm border transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                    : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <Wrench className="w-4 h-4 text-amber-500" />
                <span>تسجيل طلب صيانة لهذي الوحدة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Archive Mode - Full history of completed inspections */}
      {currentUnit && viewMode === 'unit_archive' && (
        <div className="space-y-4 animate-fadeIn">
          <div
            className={`rounded-2xl p-4 sm:p-5 border shadow-xl space-y-4 transition-colors ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-black text-amber-500 flex items-center gap-2">
                  <Archive className="w-5 h-5" />
                  <span>أرشيف كشوفات الوحدة ({currentUnit.code})</span>
                </h2>
                <p className="text-xs text-slate-500">{currentUnit.name}</p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                <span>رجوع</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {unitCompletedInspections.map((ins, idx) => (
                <div
                  key={ins.id}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/30">
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">{ins.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        التاريخ: {toArabicDigits(ins.completionDate || ins.lastInspectionDate)} • المعاين: {ins.performedByName || ins.inspectorName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {ins.conditionGradeGiven && (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${getGradeBadge(ins.conditionGradeGiven)}`}>
                          Grade {ins.conditionGradeGiven}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        مكتمل
                      </span>
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-amber-500 block text-[11px]">الملاحظات والنتائج الميدانية:</span>
                    <p className={`p-2 rounded-lg ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-slate-800'} text-slate-700 dark:text-slate-300 leading-relaxed`}>
                      {ins.findings || 'لا توجد ملاحظات مدونة'}
                    </p>
                  </div>

                  {/* Recommendations */}
                  {ins.recommendations && (
                    <div className="space-y-1 text-xs">
                      <span className="font-bold text-emerald-500 block text-[11px]">التوصيات والإجراءات المطلوب اتخاذها:</span>
                      <p className={`p-2 rounded-lg ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-slate-800'} text-slate-700 dark:text-slate-300 leading-relaxed`}>
                        {ins.recommendations}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {ins.notes && (
                    <div className="text-[11px] text-slate-400 italic">
                      ملاحظات إضافية: {ins.notes}
                    </div>
                  )}

                  {/* Attached File / Photo */}
                  {ins.reportFileName && (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-bold text-emerald-400 truncate max-w-[160px]">{ins.reportFileName}</span>
                      </div>

                      {ins.reportFileUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewItem({
                              title: `مرفق الكشف - ${ins.title}`,
                              url: ins.reportFileUrl!,
                              fileName: ins.reportFileName!,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-500 cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة الصورة</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Inspection Form Screen */}
      {currentUnit && viewMode === 'new_inspection' && (
        <form onSubmit={handleSaveInspection} className="space-y-4 animate-fadeIn">
          <div
            className={`rounded-2xl p-4 sm:p-5 border shadow-xl space-y-4 transition-colors ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            {/* Header / Back */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-black text-amber-500">
                  استمارة الكشف الفني الميداني
                </h2>
                <p className="text-xs text-slate-500">{currentUnit.code} • {currentUnit.name}</p>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                <span>رجوع</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* 1. Inspection Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                نوع الكشف الفني <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'structural' as InspectionType, label: 'سلامة إنشائية وهيكل' },
                  { id: 'safety_hse' as InspectionType, label: 'أمن وسلامة HSE' },
                  { id: 'mechanical_electrical' as InspectionType, label: 'كهرباء وميكانيك' },
                  { id: 'comprehensive' as InspectionType, label: 'كشف دوري شامل' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInspectionType(t.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      inspectionType === t.id
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Condition Grade Given */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                التقييم والدرجة الممنوحة للحالة (Condition Grade) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { grade: 'A' as ConditionGrade, label: 'A - ممتاز / جديد', color: 'border-emerald-500 text-emerald-400' },
                  { grade: 'B' as ConditionGrade, label: 'B - جيد / تشغيلي', color: 'border-blue-500 text-blue-400' },
                  { grade: 'C' as ConditionGrade, label: 'C - متوسط / صيانة', color: 'border-amber-500 text-amber-400' },
                  { grade: 'D' as ConditionGrade, label: 'D - حرج / متضرر', color: 'border-red-500 text-red-400' },
                ].map((g) => (
                  <button
                    key={g.grade}
                    type="button"
                    onClick={() => setConditionGrade(g.grade)}
                    className={`py-2 px-1 rounded-xl text-center border transition cursor-pointer ${
                      conditionGrade === g.grade
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-lg'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="block text-sm font-black">{g.grade}</span>
                    <span className="block text-[9px] opacity-80 mt-0.5">{g.label.split(' - ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Findings / الملاحظات والنتائج الميدانية */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                الملاحظات والنتائج الميدانية (Findings) <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="سجل أية عيوب، ملاحظات إنشائية، حالة الجدران والأسقف، أو أضرار ميكانيكية تم مشاهدتها..."
                className={`w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none transition border ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white'
                    : 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                }`}
              />
            </div>

            {/* 4. Recommendations / التوصيات والإجراءات المطلوب اتخاذها */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                التوصيات والإجراءات المطلوب اتخاذها (Recommendations)
              </label>
              <textarea
                rows={2}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="سجل التوصيات الهندسية، إجراءات السلامة، والتوجيهات الفنية المطلوبة..."
                className={`w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none transition border ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white'
                    : 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                }`}
              />
            </div>

            {/* 5. Notes / ملاحظات إضافية */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                ملاحظات إضافية (اختياري)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات تنظيمية أو تنسيقية مع مسؤولي الموقع..."
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition border ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                    : 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                }`}
              />
            </div>

            {/* 6. File / Camera Upload - رفع ملف و فتح كاميرا الهاتف */}
            <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  <span>رفع ملف أو التقاط صورة عبر الكاميرا</span>
                </label>
                <span className="text-[10px] text-slate-400">(اختياري)</span>
              </div>

              {/* Hidden File Inputs */}
              {/* Direct Camera Capture */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={cameraInputRef}
                onChange={handleFileSelected}
                className="hidden"
              />
              {/* Device File/Image Browser */}
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                ref={fileInputRef}
                onChange={handleFileSelected}
                className="hidden"
              />

              {/* Upload Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>فتح كاميرا الهاتف لالتقاط صورة</span>
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
                  <span>اختيار ملف / صورة من الجهاز</span>
                </button>
              </div>

              {/* Uploaded File Status / Preview Bar */}
              {reportFileName ? (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    {reportFileType.startsWith('image/') || reportFileUrl.startsWith('data:image/') ? (
                      <img
                        src={reportFileUrl}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-lg border border-emerald-500/40 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <FileCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-emerald-400 truncate max-w-[170px]" title={reportFileName}>
                        {reportFileName}
                      </div>
                      <div className="text-[10px] text-emerald-500/80">تم إرفاق الملف بنجاح</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {reportFileUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewItem({
                            title: 'معاينة المرفق الميداني',
                            url: reportFileUrl,
                            fileName: reportFileName,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 transition cursor-pointer"
                      title="إزالة الملف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 text-center py-1">
                  يمكنك التقاط صورة من الكاميرا مباشرة لتوثيق المشاهدات الميدانية.
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm sm:text-base bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg hover:shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isSubmitting ? 'جاري حفظ التقرير...' : 'حفظ واعتماد تقرير الكشف الميداني'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs border transition text-center cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                إلغاء
              </button>
            </div>
          </div>
        </form>
      )}

      {/* FULL PREVIEW MODAL FOR IMAGES / ATTACHMENTS */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 w-full max-w-3xl space-y-4 shadow-2xl flex flex-col max-h-[92vh]">
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

            <div className="flex-1 overflow-auto rounded-2xl bg-black/50 border border-slate-800/80 flex items-center justify-center p-2 min-h-[260px]">
              {previewItem.url.startsWith('data:image/') ||
              previewItem.fileName.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i) ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.fileName}
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-16 h-16 text-amber-500 mx-auto" />
                  <p className="text-sm font-bold text-white">{previewItem.fileName}</p>
                  <p className="text-xs text-slate-400">مستند مرفق (PDF / Word / Excel)</p>
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
                <span>تنزيل الملف</span>
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
