import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X,
  QrCode,
  Camera,
  Upload,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Zap,
  SwitchCamera,
  Sparkles,
  ZoomIn,
  ZoomOut,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import {
  parseScannedQrText,
  decodeVideoFrameAsync,
  decodeQrFromImageFile,
  checkBarcodeDetectorSupport,
} from '../utils/qrReader';

interface InAppQrScannerModalProps {
  units: UnitAsset[];
  theme?: 'dark' | 'light';
  onClose: () => void;
  onUnitDetected: (unit: UnitAsset) => void;
}

// Crisp Audio Chime for successful QR detection
function playSuccessBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(784, ctx.currentTime); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // C6

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignore audio context errors
  }
}

export const InAppQrScannerModal: React.FC<InAppQrScannerModalProps> = ({
  units,
  theme = 'dark',
  onClose,
  onUnitDetected,
}) => {
  const isLight = theme === 'light';
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isScanningFile, setIsScanningFile] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [successDetected, setSuccessDetected] = useState<boolean>(false);
  const [matchedUnitName, setMatchedUnitName] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const isProcessingDetectionRef = useRef<boolean>(false);
  const lastScanTimeRef = useRef<number>(0);
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const handleProcessDecodedText = useCallback(
    (decodedText: string) => {
      if (isProcessingDetectionRef.current) return;
      isProcessingDetectionRef.current = true;

      const targetCode = parseScannedQrText(decodedText);
      const cleanTarget = targetCode.toLowerCase().replace(/[\s_]/g, '-');

      const matched = units.find((u) => {
        const uCode = (u.code || '').toLowerCase().replace(/[\s_]/g, '-');
        const uId = (u.id || '').toLowerCase();
        const uName = (u.name || '').toLowerCase();
        return (
          uCode === cleanTarget ||
          uId === cleanTarget ||
          cleanTarget.includes(uCode) ||
          uCode.includes(cleanTarget) ||
          uName.includes(cleanTarget)
        );
      });

      if (matched) {
        setSuccessDetected(true);
        setMatchedUnitName(matched.name);
        setScanError(null);

        // Haptic feedback & Audio Beep
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([40, 50, 80]);
        }
        playSuccessBeep();

        stopCamera();
        setTimeout(() => {
          onUnitDetected(matched);
        }, 350);
      } else {
        isProcessingDetectionRef.current = false;
        setScanError(
          `الرمز الممسوح (${targetCode}) غير مسجل في منظومة شركة نفط الوسط. يرجى التأكد من مسح لوحة QR المعتمدة للمنشأة أو الكرفان.`
        );
      }
    },
    [units, onUnitDetected]
  );

  const scanLiveFrame = useCallback(async () => {
    if (!isScanningRef.current || isProcessingDetectionRef.current) return;

    const now = performance.now();
    // Throttle frame processing to every 45-55ms (~20 fps) to avoid CPU thermal throttling on phones
    if (now - lastScanTimeRef.current >= 45) {
      lastScanTimeRef.current = now;

      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        try {
          const code = await decodeVideoFrameAsync(videoRef.current, canvasRef.current);
          if (code) {
            handleProcessDecodedText(code);
            return;
          }
        } catch (err) {
          // Ignore individual frame decode exceptions
        }
      }
    }

    if (isScanningRef.current && !isProcessingDetectionRef.current) {
      animFrameIdRef.current = requestAnimationFrame(scanLiveFrame);
    }
  }, [handleProcessDecodedText]);

  const stopCamera = () => {
    isScanningRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (html5ScannerRef.current) {
      try {
        if (html5ScannerRef.current.isScanning) {
          html5ScannerRef.current.stop().catch(() => {});
        }
        html5ScannerRef.current.clear();
      } catch {}
      html5ScannerRef.current = null;
    }

    setCameraActive(false);
    setTorchOn(false);
  };

  const startCamera = async () => {
    setScanError(null);
    setCameraActive(false);
    setSuccessDetected(false);
    isProcessingDetectionRef.current = false;

    // Stop any existing streams first
    stopCamera();

    try {
      // 1. MediaStream configuration tailored for modern mobile cameras (landscape/portrait auto-orientation)
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode === 'user' ? 'user' : { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Detect camera capabilities (torch, zoom, continuous focus)
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }

        if (capabilities.zoom) {
          setMaxZoom(capabilities.zoom.max || 3);
          setZoomLevel(capabilities.zoom.min || 1);
        }

        // Apply continuous focus if supported
        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
          videoTrack.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any],
          }).catch(() => {});
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        await videoRef.current.play();

        setCameraActive(true);
        isScanningRef.current = true;
        animFrameIdRef.current = requestAnimationFrame(scanLiveFrame);
      }
    } catch (err: any) {
      console.warn('Direct media stream initialization failed, falling back to Html5Qrcode:', err);
      // Fallback engine: Html5Qrcode
      try {
        const container = document.getElementById('inapp-qr-scanner-region');
        if (container) {
          const scanner = new Html5Qrcode('inapp-qr-scanner-region');
          html5ScannerRef.current = scanner;
          await scanner.start(
            { facingMode: facingMode },
            {
              fps: 25,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdge * 0.82);
                return { width: qrboxSize, height: qrboxSize };
              },
              aspectRatio: undefined,
            },
            (decodedText) => {
              handleProcessDecodedText(decodedText);
            },
            () => {}
          );
          setCameraActive(true);
        }
      } catch (fallbackErr: any) {
        console.error('All camera initialization modes failed:', fallbackErr);
        setCameraActive(false);
        setScanError(
          'تعذر تشغيل كاميرا الهاتف مباشرة. يرجى التأكد من منح صلاحية الوصول للكاميرا في متصفحك أو استخدام زر "رفع صورة الرمز".'
        );
      }
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle error:', err);
      }
    }
  };

  const toggleZoom = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextZoom = zoomLevel >= 2 ? 1 : Math.min(2, maxZoom);
        await (track as any).applyConstraints({
          advanced: [{ zoom: nextZoom }],
        });
        setZoomLevel(nextZoom);
      } catch (err) {
        console.warn('Zoom toggle error:', err);
      }
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab, facingMode]);

  const handleQrFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    setScanError(null);

    try {
      const decoded = await decodeQrFromImageFile(file);
      if (decoded) {
        handleProcessDecodedText(decoded);
      } else {
        setScanError(
          'تعذر قراءة رمز QR من الصورة المحددة. يرجى التأكد من وضوح الصورة وتوسط رمز المنشأة.'
        );
      }
    } catch (err: any) {
      console.error('Failed to read QR image:', err);
      setScanError('حدث خطأ أثناء معالجة صورة الرمز. يرجى اختيار صورة واضحة ومباشرة للرمز.');
    } finally {
      setIsScanningFile(false);
      e.target.value = '';
    }
  };

  return (
    <div
      id="modal-inapp-qr-scanner"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      {/* Hidden offscreen canvas for accelerated frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      <div
        className={`border rounded-3xl max-w-md w-full flex flex-col max-h-[94vh] shadow-2xl overflow-hidden transition-all ${
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
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shrink-0 ring-2 ring-amber-400/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-amber-500">
                  ماسح رمز الوصول السريع
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  فوري وسريع
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                وجّه كاميرا الهاتف نحو لوحة الرمز في أي اتجاه
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
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

        {/* Tab Selection */}
        <div
          className={`p-2 border-b flex items-center gap-2 transition-colors ${
            isLight ? 'bg-slate-100/90 border-slate-200' : 'border-slate-800/60 bg-slate-950/40'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : isLight
                ? 'text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>كاميرا الهاتف المباشرة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : isLight
                ? 'text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>رفع صورة الرمز</span>
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex flex-col items-center justify-center">
          {scanError && (
            <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 text-rose-500 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">تنبيه المسح:</span>
                <span>{scanError}</span>
              </div>
            </div>
          )}

          {/* Camera Viewport */}
          {activeTab === 'camera' && (
            <div className="w-full flex flex-col items-center space-y-3">
              {/* Responsive Camera Box */}
              <div className="relative w-full max-w-[340px] aspect-4/3 sm:aspect-square mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/60 bg-slate-950 shadow-2xl flex items-center justify-center">
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Fallback container for Html5Qrcode */}
                <div id="inapp-qr-scanner-region" className="absolute inset-0 pointer-events-none" />

                {/* Instant Success Detection Banner */}
                {successDetected && (
                  <div className="absolute inset-0 bg-emerald-600/85 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30 animate-fadeIn p-4 text-center">
                    <Sparkles className="w-12 h-12 text-amber-300 animate-bounce" />
                    <span className="text-base font-black mt-2">تم مسح الرمز بنجاح!</span>
                    <p className="text-xs text-emerald-100 font-bold mt-1 line-clamp-1">{matchedUnitName}</p>
                    <span className="text-[11px] text-emerald-200 mt-2 bg-emerald-800/60 px-3 py-1 rounded-full">
                      جاري فتح خيارات المنشأة...
                    </span>
                  </div>
                )}

                {/* Active HUD Scanning Overlay */}
                {cameraActive && !successDetected && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-4 sm:p-6">
                    <div className="w-full h-full border-2 border-amber-400/70 rounded-2xl relative shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center justify-center">
                      {/* 4 Precision Corner Brackets */}
                      <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-xl shadow-[0_0_10px_#f59e0b]" />
                      <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-xl shadow-[0_0_10px_#f59e0b]" />
                      <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-xl shadow-[0_0_10px_#f59e0b]" />
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-xl shadow-[0_0_10px_#f59e0b]" />

                      {/* Animated High-Tech Laser Beam */}
                      <div className="absolute left-2 right-2 h-0.5 bg-linear-to-r from-transparent via-amber-400 to-transparent animate-pulse shadow-[0_0_15px_#f59e0b] top-1/2 -translate-y-1/2" />

                      <span className="text-[10px] font-bold text-amber-300 bg-slate-950/80 px-3 py-1 rounded-full border border-amber-500/40 backdrop-blur-md shadow-xs">
                        المسح المباشر فعال • ضع الرمز في الإطار
                      </span>
                    </div>
                  </div>
                )}

                {/* Fast Controls Overlay: Torch, Zoom, Flip Camera */}
                {cameraActive && !successDetected && (
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
                    {/* Torch Button */}
                    {hasTorch ? (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-xl border backdrop-blur-md transition cursor-pointer shadow-lg flex items-center gap-1 text-[11px] font-bold ${
                          torchOn
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/40'
                            : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
                        }`}
                        title="تشغيل / إيقاف الكشاف"
                      >
                        <Zap className={`w-4 h-4 ${torchOn ? 'fill-slate-950' : 'text-amber-400'}`} />
                        <span>{torchOn ? 'الكشاف مضاء' : 'كشاف'}</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <div className="flex items-center gap-1.5">
                      {/* Zoom Button (if supported) */}
                      {maxZoom > 1 && (
                        <button
                          type="button"
                          onClick={toggleZoom}
                          className={`p-2.5 rounded-xl border backdrop-blur-md transition cursor-pointer shadow-lg text-[11px] font-bold flex items-center gap-1 ${
                            zoomLevel > 1
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
                          }`}
                          title="تقريب الكاميرا"
                        >
                          <ZoomIn className="w-4 h-4" />
                          <span>{zoomLevel > 1 ? '2X' : '1X'}</span>
                        </button>
                      )}

                      {/* Camera Flip Button */}
                      <button
                        type="button"
                        onClick={flipCamera}
                        className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md transition cursor-pointer shadow-lg flex items-center gap-1 text-[11px] font-bold"
                        title="تبديل الكاميرا"
                      >
                        <SwitchCamera className="w-4 h-4 text-amber-400" />
                        <span>تبديل</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading State Overlay */}
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-5 text-center space-y-3 z-30">
                    <Loader2 className="w-9 h-9 text-amber-500 animate-spin" />
                    <p className="text-xs text-slate-200 font-bold">جاري تنشيط كاميرا الهاتف والمستشعر...</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-1 px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs hover:bg-amber-400 transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>إعادة تشغيل الكاميرا</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Instructions & Instant File Upload Trigger */}
              <div className="flex items-center justify-between w-full max-w-[340px] px-1 text-xs">
                <p className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  يدعم القراءة السريعة للوحات التعريف الميدانية
                </p>

                <button
                  type="button"
                  onClick={() => qrFileInputRef.current?.click()}
                  className="text-amber-500 hover:text-amber-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>من المعرض</span>
                </button>
              </div>
            </div>
          )}

          {/* Upload Tab View */}
          {activeTab === 'upload' && (
            <div className="w-full space-y-4 text-center py-2">
              <input
                type="file"
                ref={qrFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleQrFileScan}
              />
              <div
                onClick={() => !isScanningFile && qrFileInputRef.current?.click()}
                className={`w-full max-w-[340px] aspect-square mx-auto border-2 border-dashed rounded-3xl p-6 transition cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                  isLight
                    ? 'border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-slate-100/80'
                    : 'border-slate-700 hover:border-amber-500 bg-slate-950/50 hover:bg-slate-950/80'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
                  {isScanningFile ? (
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    {isScanningFile ? 'جاري فك تشفير وفحص رمز QR...' : 'اختر صورة لوحة الرمز من الهاتف'}
                  </h4>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    يدعم جميع الصور الميدانية بصيغ PNG, JPG, JPEG
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isScanningFile}
                  className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md hover:bg-amber-400 transition disabled:opacity-50 cursor-pointer"
                >
                  {isScanningFile ? 'جاري الفحص...' : 'استعراض من الهاتف'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3.5 sm:p-4 border-t flex items-center justify-between shrink-0 transition-colors ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>محرك فك تشفير سريع ومزدوج</span>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
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
