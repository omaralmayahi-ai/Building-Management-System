import React, { useState, useEffect } from 'react';
import {
  Camera,
  Video,
  X,
  Play,
  Pause,
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
  altitude = 12,
  speedKmH = 18,
  gimbalPitch = -20,
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
}) => {
  const [shutterFlash, setShutterFlash] = useState(false);

  if (isOpen === false) return null;

  const handleExit = onExit || onClose || (() => {});
  const handleToggleRecord = onToggleRecording || onRecordVideoToggle || (() => {});
  const effectiveSpeed = typeof propDroneSpeed === 'number' ? propDroneSpeed : typeof speed === 'number' ? speed : 1.0;
  const safeAlt = typeof altitude === 'number' && !isNaN(altitude) ? altitude : 12;
  const safeSpeed = typeof speedKmH === 'number' && !isNaN(speedKmH) ? speedKmH : 18;
  const safePitch = typeof gimbalPitch === 'number' && !isNaN(gimbalPitch) ? gimbalPitch : -20;
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
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between overflow-hidden select-none font-mono">
      {/* Camera Shutter Flash Effect */}
      {shutterFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />
      )}

      {/* Cinematic 2.39:1 Letterbox Bars */}
      {showCinematicBars && (
        <>
          <div className="w-full h-12 bg-black/90 pointer-events-none transition-all duration-300 z-10" />
          <div className="w-full h-12 bg-black/90 pointer-events-none transition-all duration-300 z-10" />
        </>
      )}

      {/* Photographic Rule-of-Thirds Grid */}
      {showGrid && (
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-35 z-10">
          <div className="border-r border-b border-amber-400/40" />
          <div className="border-r border-b border-amber-400/40" />
          <div className="border-b border-amber-400/40" />
          <div className="border-r border-b border-amber-400/40" />
          <div className="border-r border-b border-amber-400/40" />
          <div className="border-b border-amber-400/40" />
          <div className="border-r border-amber-400/40" />
          <div className="border-r border-amber-400/40" />
          <div />
        </div>
      )}

      {/* Center Reticle / Crosshair */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="relative w-14 h-14 border border-amber-400/50 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
          <div className="absolute top-0 w-px h-2.5 bg-amber-400/80" />
          <div className="absolute bottom-0 w-px h-2.5 bg-amber-400/80" />
          <div className="absolute left-0 h-px w-2.5 bg-amber-400/80" />
          <div className="absolute right-0 h-px w-2.5 bg-amber-400/80" />
        </div>
      </div>

      {/* TOP STATUS BAR: Telemetry, Battery, Satellite, Recording status */}
      <div className="p-3 sm:p-4 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 to-transparent text-white text-xs z-20">
        {/* Left Telemetry Cluster */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/30 border border-red-500/50 text-red-400 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
            <span>DRONE 4K PRO</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-300 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <Zap className="w-3 h-3 fill-emerald-400" /> 98%
            </span>
            <span>•</span>
            <span className="text-sky-400">GPS: 18 SATS</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">{unitCode}</span>
          </div>
        </div>

        {/* Live Recording Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/80 text-white font-bold animate-pulse">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
            <span>REC [{formatTimecode(safeSeconds)}]</span>
          </div>
        )}

        {/* Right Action Bar (Grid, Letterbox, Close) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleGrid}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              showGrid
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/60'
                : 'bg-black/40 text-slate-400 border-white/20 hover:text-white'
            }`}
            title="إظهار / إخفاء شبكة التثليث الفوتوغرافية"
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleCinematicBars}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              showCinematicBars
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/60'
                : 'bg-black/40 text-slate-400 border-white/20 hover:text-white'
            }`}
            title="تفعيل / إلغاء الأشرطة السينمائية (2.39:1 Cinema Bars)"
          >
            <Film className="w-4 h-4" />
          </button>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg'
                  : 'bg-black/50 text-white border-white/20 hover:bg-white/20'
              }`}
              title={isFullscreen ? 'الخروج من وضع ملء الشاشة' : 'ملء الشاشة بالكامل لعرض المجسم ثلاثي الأبعاد بالدرون'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-slate-950" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
              <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
            </button>
          )}

          <button
            onClick={handleExit}
            className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/60 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
            title="إنهاء وضع الدرون السينمائي والعودة للعرض الافتراضي"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">إنهاء الدرون</span>
          </button>
        </div>
      </div>

      {/* FLIGHT CONTROLS & TELEMETRY GAUGES */}
      <div className="px-3 sm:px-4 py-2 flex items-center justify-between pointer-events-none z-20">
        {/* Left Telemetry Readouts (Altitude, Speed, Pitch) */}
        <div className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white space-y-1 text-[11px] pointer-events-auto">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">الارتفاع:</span>
            <span className="font-bold text-amber-400">{toArabicDigits(safeAlt.toFixed(1))} م</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">السرعة:</span>
            <span className="font-bold text-emerald-400">{toArabicDigits(safeSpeed.toFixed(1))} كم/س</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">زاوية الكاميرا:</span>
            <span className="font-bold text-sky-400">{toArabicDigits(safePitch.toFixed(0))}°</span>
          </div>
        </div>

        {/* Manual FPV D-Pad (only in manual_fpv mode) */}
        {flightMode === 'manual_fpv' && onManualMove && (
          <div className="p-2 rounded-2xl bg-black/70 backdrop-blur-md border border-amber-500/40 pointer-events-auto flex flex-col items-center gap-1 shadow-2xl">
            <div className="text-[10px] text-amber-400 font-bold mb-0.5">تحكم يدوي بالطيران</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onManualMove('forward')}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-black text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
                title="للأمام (W)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onManualMove('left')}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-black text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
                title="انزلاق لليسار (A)"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onManualMove('backward')}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-black text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
                title="للخلف (S)"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => onManualMove('right')}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-black text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
                title="انزلاق لليمين (D)"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800 w-full justify-center">
              <button
                onClick={() => onManualMove('up')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-black text-emerald-400 text-[10px] font-bold border border-slate-700 cursor-pointer"
                title="صعود للأعلى (E)"
              >
                صعود ↑
              </button>
              <button
                onClick={() => onManualMove('down')}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-500 hover:text-black text-rose-400 text-[10px] font-bold border border-slate-700 cursor-pointer"
                title="هبوط للأسفل (Q)"
              >
                هبوط ↓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROL DOCK: Flight Modes, Speed slider, Capture 4K Photo, Record Video */}
      <div className="p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent pointer-events-auto text-white z-20 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Flight Mode Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-xs">
            <button
              onClick={() => onFlightModeChange('orbit_360')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                flightMode === 'orbit_360'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>مدار سينمائي 360°</span>
            </button>

            <button
              onClick={() => onFlightModeChange('spiral_ascend')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                flightMode === 'spiral_ascend'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>صعود حلزوني</span>
            </button>

            <button
              onClick={() => onFlightModeChange('flyby')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                flightMode === 'flyby'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>مسح جانبي</span>
            </button>

            <button
              onClick={() => onFlightModeChange('topdown_dive')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                flightMode === 'topdown_dive'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>غوص درامي</span>
            </button>

            <button
              onClick={() => onFlightModeChange('manual_fpv')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                flightMode === 'manual_fpv'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>تحكم يدوي</span>
            </button>
          </div>

          {/* Speed Presets & Shutter Buttons */}
          <div className="flex items-center gap-2">
            {/* Speed Presets */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-black/60 border border-white/15 text-[11px]">
              <span className="text-slate-400 font-bold ml-1">السرعة:</span>
              <button
                onClick={() => onSpeedChange(0.5)}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  effectiveSpeed === 0.5 ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
                }`}
              >
                بطيء
              </button>
              <button
                onClick={() => onSpeedChange(1.0)}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  effectiveSpeed === 1.0 ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
                }`}
              >
                طبيعي
              </button>
              <button
                onClick={() => onSpeedChange(2.0)}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  effectiveSpeed === 2.0 ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
                }`}
              >
                سريع
              </button>
            </div>

            {/* Photo Capture 4K */}
            <button
              onClick={handlePhotoClick}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-lg cursor-pointer active:scale-95"
              title="التقاط لقطة درون سينمائية عالية الدقة 4K وتنزيلها كصورة"
            >
              <Camera className="w-4 h-4 text-amber-600" />
              <span>التقاط 4K</span>
            </button>

            {/* Video Record Toggle */}
            <button
              onClick={handleToggleRecord}
              className={`px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition shadow-lg cursor-pointer active:scale-95 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-red-600/80 hover:bg-red-600 text-white'
              }`}
              title={isRecording ? 'إيقاف التسجيل وحفظ مقطع الفيديو' : 'بدء تسجيل فيديو درون سينمائي بدقة عالية'}
            >
              <Video className="w-4 h-4" />
              <span>{isRecording ? 'إيقاف وحفظ' : 'تسجيل فيديو'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
