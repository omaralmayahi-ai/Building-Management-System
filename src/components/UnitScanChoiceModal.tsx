import React from 'react';
import {
  X,
  MapPin,
  ClipboardCheck,
  Wrench,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Compass,
  Box,
  Eye,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';
import { UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';

interface UnitScanChoiceModalProps {
  unit: UnitAsset;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onSelectLocation: (unit: UnitAsset) => void;
  onSelectInspection: (unit: UnitAsset) => void;
  onSelectMaintenance: (unit: UnitAsset) => void;
  onSelect3D?: (unit: UnitAsset) => void;
}

export const UnitScanChoiceModal: React.FC<UnitScanChoiceModalProps> = ({
  unit,
  theme = 'dark',
  onClose,
  onSelectLocation,
  onSelectInspection,
  onSelectMaintenance,
  onSelect3D,
}) => {
  const isLight = theme === 'light';

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'B':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'C':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
  };

  return (
    <div
      id="modal-unit-scan-choice"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      <div
        className={`border rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-amber-500">
                  خيارات المنشأة الهندسية
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
                  {toArabicDigits(unit.code)}
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                تم التعرف على الوحدة بنجاح • يرجى اختيار الإجراء المطلوب
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
            }`}
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unit Info Summary Banner */}
        <div className="p-4 sm:p-6 space-y-4">
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isLight
                ? 'bg-gradient-to-br from-amber-50/50 via-white to-slate-50 border-amber-200 shadow-xs text-slate-800'
                : 'bg-gradient-to-br from-slate-950/90 to-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/60">
              <div>
                <span className="text-[10px] font-bold text-amber-500 block">المنشأة المحددة:</span>
                <h4 className="font-black text-base sm:text-lg text-slate-100">{unit.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {unit.governorate} • حقل {unit.field} ({unit.type === 'caravan' ? 'كرفان موقعي' : 'مبنى ثابت'})
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-black border shrink-0 ${getGradeBadge(unit.conditionGrade)}`}>
                Grade {unit.conditionGrade}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">المساحة والطوابق:</span>
                <span className="font-bold text-slate-200">{toArabicDigits(unit.totalAreaSqM)} م² ({toArabicDigits(unit.floorsCount)} طابق)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">الجهة الشاغلة:</span>
                <span className="font-bold text-slate-200 truncate block">{unit.department || 'غير محدد'}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[10px]">الإحداثيات GPS:</span>
                <span className="font-mono font-bold text-amber-400">{toArabicDigits(unit.coordinates.lat.toFixed(4))}°, {toArabicDigits(unit.coordinates.lng.toFixed(4))}°</span>
              </div>
            </div>
          </div>

          {/* The 3 Core Action Cards: 1. الموقع | 2. الكشف | 3. الصيانة */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-400 px-1">
              اختر الإجراء للبدء فوراً:
            </h4>

            {/* Option 1: خيار الموقع (Location / GIS Map & GPS) */}
            <button
              onClick={() => {
                onClose();
                onSelectLocation(unit);
              }}
              className={`w-full group text-right p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-emerald-50/80 border-slate-200 hover:border-emerald-500 shadow-xs hover:shadow-md'
                  : 'bg-slate-950/70 hover:bg-emerald-950/30 border-slate-800 hover:border-emerald-500/60 shadow-lg'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-md group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-emerald-400 group-hover:text-emerald-300">
                      1. خيار الموقع (GIS Map & GPS)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      خريطة وملاحة
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    عرض الموقع الجغرافي للمنشأة على الخريطة التفاعلية، الإسقاط الخرائطي، وفتح الاتجاهات المباشرة في Google Maps.
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-emerald-400 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>

            {/* Option 2: خيار الكشف (Field Inspection) */}
            <button
              onClick={() => {
                onClose();
                onSelectInspection(unit);
              }}
              className={`w-full group text-right p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-amber-50/80 border-slate-200 hover:border-amber-500 shadow-xs hover:shadow-md'
                  : 'bg-slate-950/70 hover:bg-amber-950/30 border-slate-800 hover:border-amber-500/60 shadow-lg'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shadow-md group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shrink-0">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-amber-400 group-hover:text-amber-300">
                      2. خيار الكشف (Field Inspection)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      فحص ميداني
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    فتح استمارة الكشف والتفتيش الفني الميداني، تسجيل الملاحظات الهندسية، رفع صور العيوب، وتحديث درجة السلامة.
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-amber-400 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>

            {/* Option 3: خيار الصيانة (Maintenance Request & History) */}
            <button
              onClick={() => {
                onClose();
                onSelectMaintenance(unit);
              }}
              className={`w-full group text-right p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-sky-50/80 border-slate-200 hover:border-sky-500 shadow-xs hover:shadow-md'
                  : 'bg-slate-950/70 hover:bg-sky-950/30 border-slate-800 hover:border-sky-500/60 shadow-lg'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold shadow-md group-hover:scale-105 group-hover:bg-sky-500 group-hover:text-white transition-all shrink-0">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-sky-400 group-hover:text-sky-300">
                      3. خيار الصيانة (Maintenance)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                      أوامر وورش الصيانة
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    استعراض سجل وطلبات الصيانة السابقة للمنشأة، أو إنشاء وتكليف طلب صيانة جديد للورش الفنية.
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-sky-400 group-hover:-translate-x-1 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between gap-2.5 shrink-0 transition-colors ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
          }`}
        >
          {onSelect3D && (
            <button
              onClick={() => {
                onClose();
                onSelect3D(unit);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              <Box className="w-4 h-4 text-amber-400" />
              <span>عرض تفاصيل الـ 3D</span>
            </button>
          )}

          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ml-auto ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
