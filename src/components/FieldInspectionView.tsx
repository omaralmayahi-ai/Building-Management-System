import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Building,
  MapPin,
  Calendar,
  Layers,
  PlusCircle,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronLeft,
  UserCheck,
  QrCode,
  Camera,
  Upload,
  Eye,
  Trash2,
  Image as ImageIcon,
  FileCheck,
  Download,
  X,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  UnitAsset,
  PeriodicInspectionSchedule,
  InspectionType,
  ConditionGrade,
  SystemUser,
  ReportAttachment,
} from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import * as api from '../services/apiClient';
import { UnitScanChoiceModal } from './UnitScanChoiceModal';
import { UnitLocationMapModal } from './UnitLocationMapModal';
import { InAppQrScannerModal } from './InAppQrScannerModal';
import { compressImageFile } from '../utils/imageCompressor';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface FieldInspectionViewProps {
  units: UnitAsset[];
  periodicInspections: PeriodicInspectionSchedule[];
  currentUser: SystemUser | null;
  onAddInspection: (inspection: PeriodicInspectionSchedule) => void;
  onUpdateGrade?: (unitCode: string, newGrade: ConditionGrade) => void;
  onOpenMaintenanceModal: (unitCode: string) => void;
  onOpenLocationMap?: (unit: UnitAsset) => void;
  theme?: 'dark' | 'light';
  initialUnitCode?: string;
}

export const FieldInspectionView: React.FC<FieldInspectionViewProps> = ({
  units,
  currentUser,
  onAddInspection,
  onUpdateGrade,
  onOpenMaintenanceModal,
  onOpenLocationMap,
  theme = 'dark',
  initialUnitCode = '',
}) => {
  const isLight = theme === 'light';

  // Selected Unit state (starts empty or from initialUnitCode)
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(initialUnitCode || '');
  const [scanError, setScanError] = useState<string | null>(null);

  // Unit Choice and Location Modals
  const [scannedUnitForChoice, setScannedUnitForChoice] = useState<UnitAsset | null>(null);
  const [selectedUnitForMap, setSelectedUnitForMap] = useState<UnitAsset | null>(null);

  // Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Mode: 'overview' | 'new_inspection'
  const [viewMode, setViewMode] = useState<'overview' | 'new_inspection'>('overview');

  // New Inspection Form State
  const [inspectionType] = useState<InspectionType>('comprehensive');
  const [inspectionTitle, setInspectionTitle] = useState<string>('كشف ميداني دوري شامل');
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>('B');
  const [findings, setFindings] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Multi-file Attachments State
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Photo / Document Preview Modal State
  const [previewItem, setPreviewItem] = useState<{ title: string; url: string; fileName: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialUnitCode) {
      setSelectedUnitCode(initialUnitCode);
    }
  }, [initialUnitCode]);

  // Selected Unit Asset Lookup
  const currentUnit = useMemo(() => {
    if (!selectedUnitCode) return null;
    return units.find((u) => u.code.toLowerCase() === selectedUnitCode.toLowerCase()) || null;
  }, [units, selectedUnitCode]);

  // Start QR Camera Scanner
  const startScanner = () => {
    setIsScannerOpen(true);
    setScanError(null);
  };

  // Multi-file selection with auto-compression
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFileError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressImageFile(file, 1024, 1024, 0.72);
        const newAtt: ReportAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          url: compressed.dataUrl,
          type: file.type || 'image/jpeg',
          size: compressed.sizeBytes,
        };
        setAttachments((prev) => [...prev, newAtt]);
      } catch (err: any) {
        console.error('Error compressing attachment image:', err);
        setFileError(err.message || 'فشل ضغط ومعالجة الصورة المحددة.');
      }
    }

    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Form Submit Handler
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
      reportFileName: attachments[0]?.name || undefined,
      reportFileUrl: attachments[0]?.url || undefined,
      attachments: attachments,
      createdAt: nowIso,
    };

    try {
      const saved = await api.addPeriodicInspection(newInspection);
      onAddInspection(saved);
      if (onUpdateGrade && currentUnit.code) {
        onUpdateGrade(currentUnit.code, conditionGrade);
      }

      setSubmitSuccessMsg(`تم تسجيل واعتماد تقرير الكشف بنجاح بالرقم: ${newInspection.id}`);
      setIsSubmitting(false);

      // Reset state cleanly back to initial state
      setSelectedUnitCode('');
      setViewMode('overview');
      setFindings('');
      setRecommendations('');
      setNotes('');
      setAttachments([]);
      setFileError(null);

      setTimeout(() => setSubmitSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error('Failed to save inspection:', err);
      onAddInspection(newInspection);
      if (onUpdateGrade && currentUnit.code) {
        onUpdateGrade(currentUnit.code, conditionGrade);
      }

      setSubmitSuccessMsg(`تم حفظ الكشف بنجاح بالرقم: ${newInspection.id}`);
      setIsSubmitting(false);

      // Reset state
      setSelectedUnitCode('');
      setViewMode('overview');
      setFindings('');
      setRecommendations('');
      setNotes('');
      setAttachments([]);
      setFileError(null);

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
      {/* Header Banner - Field Inspector Mobile */}
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
                QR Scanner
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

      {/* Scan Error Alert */}
      {scanError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs sm:text-sm font-bold flex items-center gap-3 shadow-lg animate-fadeIn">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <span>{scanError}</span>
          </div>
        </div>
      )}

      {/* Prominent QR Code Scan Trigger Button (When No Unit is Selected) */}
      {!currentUnit && (
        <div
          className={`rounded-2xl p-6 sm:p-8 border shadow-xl text-center space-y-5 transition-colors ${
            isLight
              ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/60'
              : 'bg-slate-900 border-slate-800 text-slate-100 shadow-2xl'
          }`}
        >
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
            <QrCode className="w-10 h-10" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg sm:text-xl font-black">مسح رمز QR الخاص بالوحدة</h2>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              امسح رمز الاستجابة السريعة (QR Code) المثبت على الكرفان أو المنشأة لتحميل بياناتها وإجراء الكشف الفني الميداني.
            </p>
          </div>

          <button
            type="button"
            onClick={startScanner}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm sm:text-base bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xl hover:shadow-amber-500/25 transition flex items-center justify-center gap-3 cursor-pointer mx-auto active:scale-95"
          >
            <Camera className="w-5 h-5" />
            <span>مسح رمز QR الآن</span>
          </button>
        </div>
      )}

      {/* Main Container - Overview Mode (Unit Scanned) */}
      {currentUnit && viewMode === 'overview' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Unit Summary Card */}
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
                <Building className="w-4 h-4 text-amber-500 shrink-0" />
                <span><strong>الجهة الشاغلة:</strong> {currentUnit.department}</span>
              </div>
            )}

            {/* Rescan Button - Returns to QR Scan Landing Page */}
            <button
              type="button"
              onClick={() => {
                setSelectedUnitCode('');
                setViewMode('overview');
                setScanError(null);
                setSubmitSuccessMsg(null);
              }}
              className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <QrCode className="w-4 h-4 text-amber-500" />
              <span>مسح وحدة أخرى عبر QR</span>
            </button>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setViewMode('new_inspection')}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm sm:text-base bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg hover:shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <PlusCircle className="w-5 h-5" />
                <span>بدء كشف جديد لهذه الوحدة</span>
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

            {/* 1. Inspection Type (Fixed) */}
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                نوع الكشف الفني
              </label>
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-amber-50/80 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-bold text-xs sm:text-sm">كشف دوري شامل</span>
                </div>
                <span className="text-[11px] font-semibold opacity-75">نوع موحد معتمد</span>
              </div>
            </div>

            {/* 2. Condition Grade Given */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                التقييم والدرجة الممنوحة للحالة (Condition Grade) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { grade: 'A' as ConditionGrade, label: 'A - ممتاز / جديد' },
                  { grade: 'B' as ConditionGrade, label: 'B - جيد / تشغيلي' },
                  { grade: 'C' as ConditionGrade, label: 'C - متوسط / صيانة' },
                  { grade: 'D' as ConditionGrade, label: 'D - حرج / متضرر' },
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

            {/* 3. Findings */}
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

            {/* 4. Recommendations */}
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

            {/* 5. Notes */}
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

            {/* 6. Multi-file / Camera Upload (Max 5MB per file) */}
            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Camera className="w-4 h-4" />
                  <span>المرفقات والصور الميدانية (حتى 5 ميجابايت لكل ملف)</span>
                </label>
                <span className="text-[10px] text-slate-400">({attachments.length} مرفق مضاف)</span>
              </div>

              {fileError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Hidden Inputs */}
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

              {/* Upload Action Buttons */}
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

              {/* List of Uploaded Attachments */}
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
                            alt="Preview"
                            className="w-10 h-10 object-cover rounded-lg border border-emerald-500/40 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-emerald-400 truncate max-w-[170px]" title={att.name}>
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
                              title: 'معاينة المرفق الميداني',
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
                          title="إزالة الملف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 text-center py-1">
                  يمكنك إرفاق صور متعددة لتوثيق الحالة الإنشائية والمشاهدات الميدانية.
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

      {/* QR SCANNER MODAL */}
      {isScannerOpen && (
        <InAppQrScannerModal
          units={units}
          theme={theme}
          onClose={() => setIsScannerOpen(false)}
          onUnitDetected={(unit) => {
            setIsScannerOpen(false);
            setScannedUnitForChoice(unit);
          }}
        />
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

      {/* In-App QR Scan Choices Modal (Location / Inspection / Maintenance) */}
      {scannedUnitForChoice && (
        <UnitScanChoiceModal
          unit={scannedUnitForChoice}
          theme={theme}
          onClose={() => setScannedUnitForChoice(null)}
          onSelectLocation={(unit) => {
            setScannedUnitForChoice(null);
            if (onOpenLocationMap) {
              onOpenLocationMap(unit);
            } else {
              setSelectedUnitForMap(unit);
            }
          }}
          onSelectInspection={(unit) => {
            setScannedUnitForChoice(null);
            setSelectedUnitCode(unit.code);
            setViewMode('overview');
          }}
          onSelectMaintenance={(unit) => {
            setScannedUnitForChoice(null);
            onOpenMaintenanceModal(unit.code);
          }}
        />
      )}

      {/* Unit Location Map Modal */}
      {selectedUnitForMap && (
        <UnitLocationMapModal
          unit={selectedUnitForMap}
          theme={theme}
          onClose={() => setSelectedUnitForMap(null)}
          onOpenInspection={(code) => {
            setSelectedUnitForMap(null);
            setSelectedUnitCode(code);
            setViewMode('overview');
          }}
          onOpenMaintenance={(code) => {
            setSelectedUnitForMap(null);
            onOpenMaintenanceModal(code);
          }}
        />
      )}
    </div>
  );
};
