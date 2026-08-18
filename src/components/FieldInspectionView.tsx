import React, { useState, useMemo } from 'react';
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
  const [selectedUnitCode, setSelectedUnitCode] = useState<string>(
    initialUnitCode || (units.length > 0 ? units[0].code : '')
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mode: 'overview' | 'new_inspection'
  const [viewMode, setViewMode] = useState<'overview' | 'new_inspection'>('overview');

  // New Inspection Form State
  const [inspectionType, setInspectionType] = useState<InspectionType>('structural');
  const [inspectionTitle, setInspectionTitle] = useState<string>('كشف ميداني دوري شامل');
  const [conditionGrade, setConditionGrade] = useState<ConditionGrade>('B');
  const [findings, setFindings] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Selected Unit Asset
  const currentUnit = useMemo(() => {
    return units.find((u) => u.code === selectedUnitCode) || null;
  }, [units, selectedUnitCode]);

  // Last inspection recorded for this unit
  const lastInspection = useMemo(() => {
    if (!selectedUnitCode) return null;
    const unitInsps = periodicInspections.filter(
      (ins) => ins.unitCode === selectedUnitCode && ins.status === 'completed'
    );
    if (unitInsps.length === 0) return null;
    // Sort by completionDate or createdAt descending
    return [...unitInsps].sort((a, b) => {
      const dateA = a.completionDate || a.lastInspectionDate || a.createdAt;
      const dateB = b.completionDate || b.lastInspectionDate || b.createdAt;
      return dateB.localeCompare(dateA);
    })[0];
  }, [periodicInspections, selectedUnitCode]);

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
      status: 'completed',
      completionDate: nowIso,
      conditionGradeGiven: conditionGrade,
      findings: findings.trim() || 'تمت معاينة الهيكل الإنشائي وكافة الملحقات الميدانية.',
      recommendations: recommendations.trim() || 'استمرار التشغيل والمراقبة الدورية.',
      notes: notes.trim() || 'كشف مسجل عبر الواجهة الميدانية السريعة QR.',
      createdAt: nowIso,
    };

    try {
      // Direct single record API addition as required
      const saved = await api.addPeriodicInspection(newInspection);
      onAddInspection(saved);
      if (onUpdateGrade && currentUnit.code) {
        onUpdateGrade(currentUnit.code, conditionGrade);
      }

      setSubmitSuccessMsg(`تم تسجيل تقرير الكشف بنجاح بالرقم: ${newInspection.id}`);
      setIsSubmitting(false);
      setViewMode('overview');

      // Reset Form fields
      setFindings('');
      setRecommendations('');
      setNotes('');

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
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg shrink-0">
            <ClipboardCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight">منظومة الكشف والصيانة الميدانية</h1>
            </div>
            <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <UserCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>المفتش: {currentUser?.name || 'مفتش ميداني'}</span>
            </p>
          </div>
        </div>

        <div className="text-left shrink-0">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1 ${
              isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>كشف ميداني</span>
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {submitSuccessMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 animate-fadeIn ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
          }`}
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          <div className="text-xs sm:text-sm font-bold">{submitSuccessMsg}</div>
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
            {filteredUnits.map((u) => (
              <option key={u.code} value={u.code} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                {u.code} - {u.name} ({u.field || u.governorate})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Container - Overview Mode or New Inspection Mode */}
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

            {/* Last Inspection Info Card */}
            <div
              className={`p-3.5 rounded-xl border space-y-1.5 ${
                isLight ? 'bg-amber-50/40 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>آخر كشف فني مسجل</span>
                </span>
                {lastInspection ? (
                  <span className="font-mono">{toArabicDigits(lastInspection.completionDate || lastInspection.lastInspectionDate)}</span>
                ) : (
                  <span className="text-slate-500 text-[11px]">لا يوجد كشف سابق مسجل</span>
                )}
              </div>

              {lastInspection ? (
                <div className="text-xs space-y-1 pt-1 text-slate-700 dark:text-slate-300">
                  <p><strong>المفتش:</strong> {lastInspection.inspectorName}</p>
                  {lastInspection.findings && (
                    <p className="line-clamp-2 text-slate-600 dark:text-slate-400">
                      <strong>النتائج:</strong> {lastInspection.findings}
                    </p>
                  )}
                  {lastInspection.conditionGradeGiven && (
                    <p>
                      <strong>الدرجة الممنوحة:</strong>{' '}
                      <span className="font-bold text-amber-500">Grade {lastInspection.conditionGradeGiven}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">هذه المنشأة لم تخضع لكشف فني مؤخراً. يوصى ببدء كشف ميداني فوري.</p>
              )}
            </div>

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

            {/* 3. Findings / نتائج الفحص */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                النتائج والمشاهدات الميدانية (Findings) <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                placeholder="صف حالة الجدران، الأسقف، الأبواب، التشققات، منظومات التكييف أو الكهرباء..."
                className={`w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none transition border ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500 focus:bg-white'
                    : 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                }`}
              />
            </div>

            {/* 4. Recommendations / التوصيات الهندسية */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                التوصيات والإجراءات المطلوبة (Recommendations)
              </label>
              <textarea
                rows={2}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="مثال: إجراء صيانة وقائية للمكيفات، معالجة عوازل السطح، طلاء الواجهة..."
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
                ملاحظات إضافية
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
    </div>
  );
};
