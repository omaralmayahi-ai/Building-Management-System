import React, { useState } from 'react';
import {
  Camera,
  Video,
  X,
  RotateCw,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Film,
  Grid,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toArabicDigits } from '../utils/arabicUtils';

export type DroneFlightMode = 'orbit_360' | 'spiral_ascend' | 'flyby' | 'topdown_dive' | 'manual_fpv';

interface DroneHudOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
  onExit?: () => void;
  flightMode: DroneFlightMode;
  onFlightModeChange: (mode: DroneFlightMode) => void;
  droneSpeed?: number;
  speed?: number;
  onSpeedChange: (speed: number) => void;
  altitude?: number;
  speedKmH?: number;
  gimbalPitch?: number;
  onManualMove?: (action: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'yawLeft' | 'yawRight') => void;
  onCapturePhoto: () => void;
  onRecordVideoToggle?: () => void;
  onToggleRecording?: () => void;
  isRecording?: boolean;
  recordSeconds?: number;
  showGrid?: boolean;
  onToggleGrid: () => void;
  showCinematicBars?: boolean;
  onToggleCinematicBars: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  unitCode?: string;
  isNightMode?: boolean;
}

export const DroneHudOverlay: React.FC<DroneHudOverlayProps> = ({
  isOpen = true,
  onClose,
  onExit,
  flightMode,
  onFlightModeChange,
  droneSpeed: propDroneSpeed,
  speed,
  onSpeedChange,
  onManualMove,
  onCapturePhoto,
  onRecordVideoToggle,
  onToggleRecording,
  isRecording = false,
  recordSeconds = 0,
  showGrid = false,
  onToggleGrid,
  showCinematicBars = false,
  onToggleCinematicBars,
  isFullscreen = false,
  onToggleFullscreen,
  unitCode = 'DRONE-4K',
  isNightMode = false,
}) => {
  const [shutterFlash, setShutterFlash] = useState(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

  if (isOpen === false) return null;

  const handleExit = onExit || onClose || (() => {});
  const handleToggleRecord = onToggleRecording || onRecordVideoToggle || (() => {});
  const effectiveSpeed = typeof propDroneSpeed === 'number' ? propDroneSpeed : typeof speed === 'number' ? speed : 1.0;
  const safeSeconds = typeof recordSeconds === 'number' && !isNaN(recordSeconds) ? recordSeconds : 0;

  const handlePhotoClick = () => {
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 250);
    onCapturePhoto();
  };

  const formatTimecode = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const ms = Math.floor((totalSec * 100) % 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {/* Camera Shutter Flash Effect */}
      {shutterFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />
      )}

      {/* Cinematic 2.39:1 Letterbox Bars - strictly at extreme top and bottom edges */}
      {showCinematicBars && (
        <>
          <div className="absolute top-0 inset-x-0 h-8 sm:h-12 bg-black/95 pointer-events-none transition-all duration-300 z-10" />
          <div className="absolute bottom-0 inset-x-0 h-8 sm:h-12 bg-black/95 pointer-events-none transition-all duration-300 z-10" />
        </>
      )}

      {/* Photographic Rule-of-Thirds Grid - Subtle neutral lines with no yellow/amber coloring */}
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 z-10">
          <div className="border-r border-b border-white/20 dark:border-white/20" />
          <div className="border-r border-b border-white/20 dark:border-white/20" />
          <div className="border-b border-white/20 dark:border-white/20" />
          <div className="border-r border-b border-white/20 dark:border-white/20" />
          <div className="border-r border-b border-white/20 dark:border-white/20" />
          <div className="border-b border-white/20 dark:border-white/20" />
          <div className="border-r border-b border-white/20 dark:border-white/20" />
          <div className="border-r border-b border-white/20 dark:border-white/20" />
          <div />
        </div>
      )}

      {/* MINI FLOATING PILL (When Controls are Collapsed) */}
      {isControlsCollapsed && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => setIsControlsCollapsed(false)}
            className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold shadow-lg flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
              isNightMode
                ? 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 border-slate-700'
                : 'bg-white/95 hover:bg-slate-50 text-slate-800 border-slate-300 shadow-slate-200'
            }`}
            title="إظهار أدوات وعناصر التحكم بالدرون"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>خيارات العرض</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={handlePhotoClick}
            className="p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg transition cursor-pointer active:scale-95"
            title="التقاط 4K"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={handleExit}
            className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition cursor-pointer active:scale-95"
            title="إنهاء وضع الدرون"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP STATUS BAR: Compact, Daylight Compatible & Collapsible */}
      {!isControlsCollapsed && (
        <div className="absolute top-2 inset-x-2 sm:inset-x-4 z-20 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-3 py-1.5 sm:py-2 rounded-2xl backdrop-blur-md border shadow-lg flex items-center justify-between gap-2 text-xs transition-colors ${
              isNightMode
                ? 'bg-slate-900/90 border-slate-800 text-white'
                : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-200/60'
            }`}
          >
            {/* Left Telemetry Badges */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-black text-[11px] border ${
                  isNightMode
                    ? 'bg-red-950/60 border-red-800/80 text-red-400'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <Radio className="w-3 h-3 animate-pulse text-red-500" />
                <span>DRONE 4K</span>
              </div>

              <div
                className={`hidden md:flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-lg border ${
                  isNightMode
                    ? 'bg-slate-950/50 border-slate-800 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <Zap className="w-3 h-3 fill-emerald-500" /> 98%
                </span>
                <span>•</span>
                <span className="font-semibold">{unitCode}</span>
              </div>
            </div>

            {/* Live Recording Indicator */}
            {isRecording && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold animate-pulse shadow">
                <div className="w-2 h-2 rounded-full bg-white" />
                <span>REC [{formatTimecode(safeSeconds)}]</span>
              </div>
            )}

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={onToggleGrid}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  showGrid
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                    : isNightMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="إظهار / إخفاء شبكة التثليث الفوتوغرافية"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onToggleCinematicBars}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  showCinematicBars
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                    : isNightMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="تفعيل / إلغاء الأشرطة السينمائية (Cinema Bars)"
              >
                <Film className="w-3.5 h-3.5" />
              </button>

              {/* Collapse Controls Button */}
              <button
                onClick={() => setIsControlsCollapsed(true)}
                className={`px-2 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                  isNightMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="طي خيارات التحكم لعرض سينمائي نقي بدون تشويش"
              >
                <ChevronUp className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">طي الأدوات</span>
              </button>

              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className={`px-2.5 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                    isFullscreen
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : isNightMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                  title={isFullscreen ? 'الخروج من وضع ملء الشاشة للمجسم' : 'ملء الشاشة للمجسم ثلاثي الأبعاد'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-500" />}
                  <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
                </button>
              )}

              <button
                onClick={handleExit}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition cursor-pointer flex items-center gap-1 text-[11px] shadow"
                title="إنهاء وضع الدرون السينمائي"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إنهاء الدرون</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual FPV D-Pad (only in manual_fpv mode) */}
      {flightMode === 'manual_fpv' && onManualMove && !isControlsCollapsed && (
        <div className="absolute right-3 sm:right-6 bottom-20 z-20 pointer-events-auto">
          <div
            className={`p-2 rounded-2xl backdrop-blur-md border shadow-2xl flex flex-col items-center gap-1 text-xs ${
              isNightMode
                ? 'bg-slate-900/90 border-slate-800 text-white'
                : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            <div className="text-[10px] text-amber-600 font-bold mb-0.5">تحكم يدوي</div>
            <button
              onClick={() => onManualMove('forward')}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                isNightMode ? 'bg-slate-800 hover:bg-amber-500 hover:text-black border-slate-700 text-white' : 'bg-slate-100 hover:bg-amber-500 hover:text-black border-slate-200 text-slate-800'
              }`}
              title="للأمام (W)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onManualMove('left')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                  isNightMode ? 'bg-slate-800 hover:bg-amber-500 hover:text-black border-slate-700 text-white' : 'bg-slate-100 hover:bg-amber-500 hover:text-black border-slate-200 text-slate-800'
                }`}
                title="انزلاق لليسار (A)"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onManualMove('backward')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                  isNightMode ? 'bg-slate-800 hover:bg-amber-500 hover:text-black border-slate-700 text-white' : 'bg-slate-100 hover:bg-amber-500 hover:text-black border-slate-200 text-slate-800'
                }`}
                title="للخلف (S)"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onManualMove('right')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer border ${
                  isNightMode ? 'bg-slate-800 hover:bg-amber-500 hover:text-black border-slate-700 text-white' : 'bg-slate-100 hover:bg-amber-500 hover:text-black border-slate-200 text-slate-800'
                }`}
                title="انزلاق لليمين (D)"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t w-full justify-center border-slate-200 dark:border-slate-800">
              <button
                onClick={() => onManualMove('up')}
                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-600 text-[10px] font-bold border border-emerald-500/40 cursor-pointer"
                title="صعود للأعلى"
              >
                صعود ↑
              </button>
              <button
                onClick={() => onManualMove('down')}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-600 text-[10px] font-bold border border-rose-500/40 cursor-pointer"
                title="هبوط للأسفل"
              >
                هبوط ↓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL DOCK: Compact, Daylight Compatible & Collapsible */}
      {!isControlsCollapsed && (
        <div className="absolute bottom-2 inset-x-2 sm:inset-x-4 z-20 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`p-2 sm:p-2.5 rounded-2xl backdrop-blur-md border shadow-xl flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
              isNightMode
                ? 'bg-slate-900/90 border-slate-800 text-white'
                : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-200/60'
            }`}
          >
            {/* Flight Mode Tabs */}
            <div
              className={`flex flex-wrap items-center gap-1 p-1 rounded-xl border ${
                isNightMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100/90 border-slate-200'
              }`}
            >
              <button
                onClick={() => onFlightModeChange('orbit_360')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                  flightMode === 'orbit_360'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isNightMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                }`}
              >
                <RotateCw className="w-3 h-3" />
                <span>مدار سينمائي 360°</span>
              </button>

              <button
                onClick={() => onFlightModeChange('spiral_ascend')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                  flightMode === 'spiral_ascend'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isNightMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>صعود حلزوني</span>
              </button>

              <button
                onClick={() => onFlightModeChange('flyby')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                  flightMode === 'flyby'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isNightMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>مسح جانبي</span>
              </button>

              <button
                onClick={() => onFlightModeChange('topdown_dive')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                  flightMode === 'topdown_dive'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isNightMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                }`}
              >
                <ArrowDown className="w-3 h-3" />
                <span>غوص درامي</span>
              </button>

              <button
                onClick={() => onFlightModeChange('manual_fpv')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                  flightMode === 'manual_fpv'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isNightMode
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>تحكم يدوي</span>
              </button>
            </div>

            {/* Speed Presets & Shutter Buttons */}
            <div className="flex items-center gap-2">
              {/* Speed Presets */}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[11px] ${
                  isNightMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100/90 border-slate-200'
                }`}
              >
                <span className="font-bold ml-1 opacity-75">السرعة:</span>
                <button
                  onClick={() => onSpeedChange(0.5)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    effectiveSpeed === 0.5
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : isNightMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  بطيء
                </button>
                <button
                  onClick={() => onSpeedChange(1.0)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    effectiveSpeed === 1.0
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : isNightMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  طبيعي
                </button>
                <button
                  onClick={() => onSpeedChange(2.0)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    effectiveSpeed === 2.0
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : isNightMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  سريع
                </button>
              </div>

              {/* Photo Capture 4K */}
              <button
                onClick={handlePhotoClick}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow cursor-pointer active:scale-95"
                title="التقاط صورة 4K بدقة عالية"
              >
                <Camera className="w-3.5 h-3.5 text-slate-950" />
                <span>التقاط 4K</span>
              </button>

              {/* Video Record Toggle */}
              <button
                onClick={handleToggleRecord}
                className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition shadow cursor-pointer active:scale-95 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
                title={isRecording ? 'إيقاف التسجيل وحفظ مقطع الفيديو' : 'بدء تسجيل فيديو سينمائي'}
              >
                <Video className="w-3.5 h-3.5" />
                <span>{isRecording ? 'إيقاف وحفظ' : 'تسجيل فيديو'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

