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
} from 'lucide-react';
import { UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import { parseScannedQrText, decodeVideoFrame, decodeQrFromImageFile } from '../utils/qrReader';

interface InAppQrScannerModalProps {
  units: UnitAsset[];
  theme?: 'dark' | 'light';
  onClose: () => void;
  onUnitDetected: (unit: UnitAsset) => void;
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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [successDetected, setSuccessDetected] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const html5ScannerRef = useRef<Html5Qrcode | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleProcessDecodedText = useCallback(
    (decodedText: string) => {
      const targetCode = parseScannedQrText(decodedText);
      const matched = units.find(
        (u) =>
          u.code.toLowerCase() === targetCode.toLowerCase() ||
          u.id.toLowerCase() === targetCode.toLowerCase() ||
          u.name.toLowerCase().includes(targetCode.toLowerCase())
      );

      if (matched) {
        setSuccessDetected(true);
        setScanError(null);
        stopCamera();
        setTimeout(() => {
          onUnitDetected(matched);
        }, 300);
      } else {
        setScanError(
          `تعذر العثور على المنشأة: الرمز الممسوح (${targetCode}) غير مسجل في قاعدة البيانات. يرجى التأكد من مسح رمز منشأة صالحة تابعة لشركة نفط الوسط.`
        );
      }
    },
    [units, onUnitDetected]
  );

  const scanLiveFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      animFrameIdRef.current = requestAnimationFrame(scanLiveFrame);
      return;
    }

    try {
      const code = decodeVideoFrame(videoRef.current, canvasRef.current);
      if (code) {
        handleProcessDecodedText(code);
        return;
      }
    } catch (err) {
      console.warn('Frame scan error:', err);
    }

    animFrameIdRef.current = requestAnimationFrame(scanLiveFrame);
  }, [handleProcessDecodedText]);

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
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
      } catch (e) {
        // ignore
      }
      html5ScannerRef.current = null;
    }

    setCameraActive(false);
    setTorchOn(false);
  };

  const startCamera = async () => {
    setScanError(null);
    setCameraActive(false);
    setSuccessDetected(false);

    // Stop any existing stream
    stopCamera();

    try {
      // 1. Primary engine: WebRTC MediaStream square constraints + jsQR / BarcodeDetector
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1080 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 1.0 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities && (videoTrack.getCapabilities() as any)) || {};
        if (capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        animFrameIdRef.current = requestAnimationFrame(scanLiveFrame);
      }
    } catch (err: any) {
      console.warn('Direct camera stream failed, attempting Html5Qrcode fallback:', err);
      // Fallback to Html5Qrcode engine in square mode
      try {
        const container = document.getElementById('inapp-qr-scanner-region');
        if (container) {
          const scanner = new Html5Qrcode('inapp-qr-scanner-region');
          html5ScannerRef.current = scanner;
          await scanner.start(
            { facingMode: facingMode },
            {
              fps: 15,
              qrbox: { width: 240, height: 240 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              handleProcessDecodedText(decodedText);
            },
            () => {}
          );
          setCameraActive(true);
        }
      } catch (fallbackErr: any) {
        console.error('All camera initialization methods failed:', fallbackErr);
        setCameraActive(false);
        setScanError(
          'تعذر تشغيل كاميرا الجهاز مباشرة (تأكد من منح صلاحيات الكاميرا للمتصفح). يمكنك استخدام خيار "رفع صورة الرمز" لمسح صورة الرمز من جهازك.'
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
          'تعذر قراءة رمز QR من الصورة المحددة. يرجى التأكد من وضوح الصورة وتوسط الرمز وزاوية الالتقاط.'
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
      {/* Hidden offscreen canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      <div
        className={`border rounded-3xl max-w-md w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden transition-all ${
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
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-amber-500">
                ماسح رمز الوصول السريع (QR Scanner)
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                مسح مربع عالي الدقة للوصول إلى المنشأة أو الكرفان
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

        {/* Two Dedicated Tabs Bar (Camera & File Upload Only - Manual entry removed) */}
        <div
          className={`p-2.5 border-b flex items-center gap-2 transition-colors ${
            isLight ? 'bg-slate-100/90 border-slate-200' : 'border-slate-800/60 bg-slate-950/40'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : isLight
                ? 'text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>كاميرا المسح المباشر</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
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

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex flex-col items-center justify-center">
          {scanError && (
            <div className="w-full bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 text-rose-500 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">تنبيه المسح</span>
                <span>{scanError}</span>
              </div>
            </div>
          )}

          {/* Camera View - Perfectly Square Viewport with Modern Scanning Frame */}
          {activeTab === 'camera' && (
            <div className="w-full flex flex-col items-center space-y-3">
              {/* Square Scanning Viewport */}
              <div className="relative w-full max-w-[320px] sm:max-w-[340px] aspect-square mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/50 bg-slate-950 shadow-2xl flex items-center justify-center">
                {/* Direct Square Video Feed */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Fallback container for Html5Qrcode if needed */}
                <div id="inapp-qr-scanner-region" className="absolute inset-0 pointer-events-none" />

                {/* Success Indicator Overlay */}
                {successDetected && (
                  <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-pulse">
                    <Sparkles className="w-12 h-12 text-emerald-300 animate-bounce" />
                    <span className="text-sm font-black mt-2">تم التعرف على الوحدة بنجاح</span>
                  </div>
                )}

                {/* Laser scan animation & Square Reticle */}
                {cameraActive && !successDetected && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 p-5">
                    <div className="w-full h-full border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center justify-center">
                      {/* 4 Precision Corner Markers */}
                      <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-xl shadow-[0_0_8px_#f59e0b]" />
                      <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-xl shadow-[0_0_8px_#f59e0b]" />
                      <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-xl shadow-[0_0_8px_#f59e0b]" />
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-xl shadow-[0_0_8px_#f59e0b]" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse shadow-[0_0_12px_#f59e0b] top-1/2 -translate-y-1/2" />

                      <span className="text-[10px] font-bold text-amber-300 bg-slate-950/75 px-3 py-1 rounded-full border border-amber-500/40 backdrop-blur-md">
                        ضع رمز QR داخل المربع
                      </span>
                    </div>
                  </div>
                )}

                {/* Controls overlay (Torch and Camera Switch) */}
                {cameraActive && (
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
                    {/* Torch Toggle */}
                    {hasTorch ? (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-xl border backdrop-blur-md transition cursor-pointer shadow-lg ${
                          torchOn
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
                            : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
                        }`}
                        title="تشغيل / إيقاف الكشاف"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    ) : (
                      <div />
                    )}

                    {/* Camera Flip */}
                    <button
                      type="button"
                      onClick={flipCamera}
                      className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md transition cursor-pointer shadow-lg flex items-center gap-1 text-[11px] font-bold"
                      title="تبديل الكاميرا (أمامية / خلفية)"
                    >
                      <SwitchCamera className="w-4 h-4 text-amber-400" />
                      <span className="hidden sm:inline">تبديل</span>
                    </button>
                  </div>
                )}

                {/* Loading / Inactive Camera Overlay */}
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-5 text-center space-y-3 z-30">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    <p className="text-xs text-slate-200 font-bold">جاري تشغيل الكاميرا والمستشعر...</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-1 px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl text-xs hover:bg-amber-400 transition cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      إعادة تشغيل الكاميرا
                    </button>
                  </div>
                )}
              </div>

              <p className={`text-[11px] text-center font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                وجّه الكاميرا نحو رمز الاستجابة السريعة (QR Code) المثبت على المنشأة أو الكرفان
              </p>
            </div>
          )}

          {/* Upload View - Square / Card Area */}
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
                className={`w-full max-w-[320px] sm:max-w-[340px] aspect-square mx-auto border-2 border-dashed rounded-3xl p-6 transition cursor-pointer flex flex-col items-center justify-center space-y-3 ${
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
                    {isScanningFile ? 'جاري فك تشفير وفحص رمز QR...' : 'اختر صورة رمز QR من الجهاز'}
                  </h4>
                  <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    يدعم جميع صور الكاميرا الميدانية بصيغ PNG, JPG, JPEG
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isScanningFile}
                  className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow hover:bg-amber-400 transition disabled:opacity-50 cursor-pointer"
                >
                  {isScanningFile ? 'جاري المعالجة...' : 'استعراض الصورة'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-end gap-2.5 shrink-0 transition-colors ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
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
