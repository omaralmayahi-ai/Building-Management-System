import React, { useState } from 'react';
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
  DoorClosed,
  Lock,
  Info,
  Navigation,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { UnitAsset, Room } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import { isRoomVacant } from '../utils/unitAndRoomCodeUtils';

interface UnitScanChoiceModalProps {
  unit: UnitAsset;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onSelectLocation: (unit: UnitAsset) => void;
  onSelectInspection: (unit: UnitAsset) => void;
  onSelectMaintenance: (
    unit: UnitAsset,
    room?: Room | { code?: string; name: string; floor?: string; occupiedBy?: string }
  ) => void;
  onSelect3D?: (unit: UnitAsset) => void;
  isRoomScan?: boolean;
  scannedRoom?: Room | { code?: string; name: string; floor?: string; occupiedBy?: string } | null;
  roomPayload?: { roomCode?: string; roomName?: string; floor?: string; occupiedBy?: string };
}

export const UnitScanChoiceModal: React.FC<UnitScanChoiceModalProps> = ({
  unit,
  theme = 'dark',
  onClose,
  onSelectLocation,
  onSelectInspection,
  onSelectMaintenance,
  onSelect3D,
  isRoomScan = false,
  scannedRoom = null,
  roomPayload,
}) => {
  const isLight = theme === 'light';
  const [copiedCoords, setCopiedCoords] = useState(false);

  const lat = unit.coordinates?.lat ?? 32.6189;
  const lng = unit.coordinates?.lng ?? 45.7531;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const effectiveRoom = React.useMemo(() => {
    if (scannedRoom) {
      const matched = unit.rooms?.find(
        (r) =>
          (scannedRoom.code && (r.code?.toUpperCase() === scannedRoom.code.toUpperCase() || r.id === scannedRoom.code)) ||
          (scannedRoom.name && r.name === scannedRoom.name)
      );
      const rawOccupant = scannedRoom.occupiedBy || matched?.occupiedBy;
      return {
        ...scannedRoom,
        code: scannedRoom.code || matched?.code || '',
        name: scannedRoom.name || matched?.name || 'غرفة مخصصة',
        floor: scannedRoom.floor || matched?.floor || 'الطابق 1',
        occupiedBy: isRoomVacant(rawOccupant) ? 'شاغرة' : (rawOccupant || 'شاغرة'),
      };
    }
    if (roomPayload?.roomCode || roomPayload?.roomName) {
      const found = unit.rooms?.find(
        (r) =>
          (roomPayload.roomCode && (r.code?.toUpperCase() === roomPayload.roomCode.toUpperCase() || r.id === roomPayload.roomCode)) ||
          (roomPayload.roomName && r.name === roomPayload.roomName)
      );
      const rawOccupant = roomPayload.occupiedBy || found?.occupiedBy;
      return {
        id: found?.id || roomPayload.roomCode || `room-${Date.now()}`,
        code: roomPayload.roomCode || found?.code || '',
        name: roomPayload.roomName || found?.name || 'غرفة مخصصة',
        floor: roomPayload.floor || found?.floor || 'الطابق 1',
        occupiedBy: isRoomVacant(rawOccupant) ? 'شاغرة' : (rawOccupant || 'شاغرة'),
      };
    }
    return null;
  }, [scannedRoom, roomPayload, unit]);

  const handleCopyGps = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

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

  const displayRoomName = effectiveRoom?.name || roomPayload?.roomName || 'غرفة مخصصة';
  const displayRoomCode = effectiveRoom?.code || roomPayload?.roomCode || '';

  return (
    <div
      id="modal-unit-scan-choice"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      <div
        className={`border rounded-2xl sm:rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-3.5 sm:p-5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
              {isRoomScan ? <DoorClosed className="w-5 h-5 sm:w-6 sm:h-6" /> : <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-lg text-amber-500 truncate">
                  {isRoomScan ? 'خيارات رمز الغرفة' : 'خيارات رمز المنشأة'}
                </h3>
                <span className="font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                  {isRoomScan && displayRoomCode ? displayRoomCode : toArabicDigits(unit.code)}
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isRoomScan
                  ? `تم التعرف على (${displayRoomName}) داخل ${unit.name}`
                  : 'تم التعرف على المنشأة بنجاح • يرجى اختيار الإجراء'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl transition cursor-pointer shrink-0 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800'
            }`}
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unit & Room Info Summary Banner */}
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-[80vh] sm:max-h-[75vh] overflow-y-auto">
          {/* Unit / Building Card */}
          <div
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
              isLight
                ? 'bg-gradient-to-br from-amber-50/50 via-white to-slate-50 border-amber-200 shadow-xs text-slate-800'
                : 'bg-gradient-to-br from-slate-950/90 to-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-slate-800/60">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-amber-500 block">
                  {isRoomScan ? 'المنشأة التابعة للغرفة:' : 'المنشأة الهندسية:'}
                </span>
                <h4 className={`font-black text-sm sm:text-lg truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{unit.name}</h4>
                <p className={`text-[11px] sm:text-xs mt-0.5 truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {unit.governorate} • حقل {unit.field} ({unit.type === 'caravan' ? 'كرفان موقعي' : 'مبنى ثابت'})
                </p>
              </div>
              <span className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-black border shrink-0 ${getGradeBadge(unit.conditionGrade)}`}>
                Grade {unit.conditionGrade}
              </span>
            </div>

            {/* If room scan, show room specific details: Floor, Room Number/Code, Occupying Entity ONLY */}
            {isRoomScan ? (
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 pt-2.5 sm:pt-3 text-[10px] sm:text-[11px]">
                <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <span className={`block text-[9px] sm:text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الطابق:</span>
                  <span className="font-bold text-emerald-500 text-[11px] sm:text-xs truncate block">
                    {effectiveRoom?.floor || 'الطابق 1'}
                  </span>
                </div>
                <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <span className={`block text-[9px] sm:text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>رمز الغرفة:</span>
                  <span className="font-mono font-bold text-amber-500 text-[11px] sm:text-xs truncate block">
                    {displayRoomCode || displayRoomName}
                  </span>
                </div>
                <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <span className={`block text-[9px] sm:text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الشاغل:</span>
                  <span
                    className={`font-bold text-[11px] sm:text-xs truncate block ${
                      isRoomVacant(effectiveRoom?.occupiedBy)
                        ? 'text-amber-500 font-black'
                        : 'text-sky-500'
                    }`}
                    title={effectiveRoom?.occupiedBy || 'شاغرة'}
                  >
                    {isRoomVacant(effectiveRoom?.occupiedBy) ? 'شاغرة' : (effectiveRoom?.occupiedBy || 'شاغرة')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-2.5 sm:pt-3 text-[10px] sm:text-[11px]">
                <div>
                  <span className={`block text-[9px] sm:text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>المساحة والطوابق:</span>
                  <span className={`font-bold truncate block ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{toArabicDigits(unit.totalAreaSqM)} م² ({toArabicDigits(unit.floorsCount)} طابق)</span>
                </div>
                <div>
                  <span className={`block text-[9px] sm:text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الجهة الشاغلة:</span>
                  <span className={`font-bold truncate block ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{unit.department || 'غير محدد'}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className={`block text-[9px] sm:text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الموقع الميداني:</span>
                  <span className={`font-bold text-emerald-500 truncate block`}>{unit.field} ({unit.governorate})</span>
                </div>
              </div>
            )}

            {/* GPS Toolbar with Copy and Direct Navigation */}
            <div className={`mt-2.5 sm:mt-3 p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5 ${
              isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs min-w-0">
                  <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
                  <span className="text-slate-400 shrink-0">GPS: </span>
                  <span className="font-mono font-bold text-amber-500 truncate">
                    {toArabicDigits(lat.toFixed(4))}°, {toArabicDigits(lng.toFixed(4))}°
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyGps}
                  className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition cursor-pointer shrink-0"
                  title="نسخ الإحداثيات"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCoords ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer shrink-0"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>فتح في Google Maps</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>
          </div>

          {/* Core Action Options: Exactly 2 for room scan (Location & Maintenance), 3 for unit scan */}
          <div className="space-y-2.5 sm:space-y-3">
            <h4 className="text-xs font-black text-slate-400 px-1">
              {isRoomScan ? 'اختر الإجراء المطلوب للغرفة:' : 'اختر الإجراء للبدء فوراً:'}
            </h4>

            {/* Option 1: خيار الموقع (Location / GIS Map & GPS) */}
            <div
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isLight
                  ? 'bg-slate-50 border-slate-200 shadow-xs'
                  : 'bg-slate-950/70 border-slate-800 shadow-lg'
              }`}
            >
              <button
                onClick={() => {
                  onSelectLocation(unit);
                }}
                className="w-full text-right p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:bg-emerald-500/5 transition group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-md group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-black text-xs sm:text-sm text-emerald-400 group-hover:text-emerald-300">
                        {isRoomScan ? '1. خيار الوصول (الخارطة والمعلومات)' : '1. خيار الوصول (خارطة الموقع وGPS)'}
                      </span>
                      <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                        خارطة ومعلومات
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {isRoomScan
                        ? 'عرض الخارطة الجغرافية مع بيانات الغرفة المحددة: اسم المنشأة، الطابق، رمز الغرفة، والجهة الشاغلة، وملاحة GPS دون إجراءات تعديل.'
                        : 'عرض الخارطة الجغرافية والمعلومات التوثيقية وملاحة Google Maps للمنشأة دون فتح إجراءات كشف أو صيانة من داخل الخارطة.'}
                    </p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:-translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Direct Fast Navigation Strip */}
              <div className={`px-3 sm:px-4 py-2 border-t flex items-center justify-between gap-2 text-xs ${
                isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-900/60 border-slate-800/80'
              }`}>
                <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                  <span>تطبيق الملاحة الميداني:</span>
                </span>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Navigation className="w-3 h-3" />
                  <span>فتح الاتجاهات</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>
            </div>

            {/* Option 2: Inspection ONLY shown when isRoomScan is false */}
            {!isRoomScan && (
              <button
                onClick={() => {
                  onSelectInspection(unit);
                }}
                className={`w-full group text-right p-3 sm:p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 hover:bg-amber-50/80 border-slate-200 hover:border-amber-500 shadow-xs hover:shadow-md'
                    : 'bg-slate-950/70 hover:bg-amber-950/30 border-slate-800 hover:border-amber-500/60 shadow-lg'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold shadow-md group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shrink-0">
                    <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-black text-xs sm:text-sm text-amber-400 group-hover:text-amber-300">
                        2. خيار الكشف (Field Inspection)
                      </span>
                      <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                        فحص ميداني
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
                      فتح استمارة الكشف والتفتيش الفني الميداني، تسجيل الملاحظات الهندسية، رفع صور العيوب، وتحديث درجة السلامة.
                    </p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:-translate-x-1 transition-transform shrink-0" />
              </button>
            )}

            {/* Option 2 (or 3): خيار الصيانة (Maintenance) */}
            <button
              onClick={() => {
                const targetRoom = isRoomScan ? (effectiveRoom || undefined) : undefined;
                onSelectMaintenance(unit, targetRoom);
              }}
              className={`w-full group text-right p-3 sm:p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 hover:bg-sky-50/80 border-slate-200 hover:border-sky-500 shadow-xs hover:shadow-md'
                  : 'bg-slate-950/70 hover:bg-sky-950/30 border-slate-800 hover:border-sky-500/60 shadow-lg'
              }`}
            >
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold shadow-md group-hover:scale-105 group-hover:bg-sky-500 group-hover:text-white transition-all shrink-0">
                  <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-black text-xs sm:text-sm text-sky-400 group-hover:text-sky-300">
                      {isRoomScan ? '2. تسجيل طلب صيانة للغرفة' : '3. خيار الصيانة (طلب عام للمنشأة)'}
                    </span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold shrink-0">
                      {isRoomScan ? `صيانة لـ ${displayRoomName}` : 'طلب لكامل المنشأة'}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {isRoomScan
                      ? `تسجيل طلب صيانة هندسي مباشر للغرفة، وتثبيت رمز الوحدة ورمز الغرفة والجهة الشاغلة تلقائياً.`
                      : 'تسجيل طلب صيانة هندسي عام لكامل المنشأة، مع تثبيت رمز المنشأة والجهة الشاغلة دون تحديد غرف بموجب رمز الوصول السريع للمنشأة (QR).'}
                  </p>
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 group-hover:-translate-x-1 transition-transform shrink-0" />
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
