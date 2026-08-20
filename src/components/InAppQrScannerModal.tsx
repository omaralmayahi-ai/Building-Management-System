import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X,
  QrCode,
  Camera,
  Upload,
  Search,
  AlertTriangle,
  RefreshCw,
  Building,
  ChevronLeft,
} from 'lucide-react';
import { UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';

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
  const [manualSearchCode, setManualSearchCode] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to extract unit code from URL or text
  const parseScannedCode = (decodedText: string): string => {
    const trimmed = decodedText.trim();
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        const unitParam =
          url.searchParams.get('unit') ||
          url.searchParams.get('code') ||
          url.searchParams.get('id') ||
          url.searchParams.get('unitCode');
        if (unitParam) return unitParam.trim();
      }
    } catch {
      // Not a valid URL, fallback
    }

    const patternMatch = trimmed.match(/[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+/);
    if (patternMatch) return patternMatch[0];

    return trimmed;
  };

  const handleProcessDecodedText = (decodedText: string) => {
    const targetCode = parseScannedCode(decodedText);
    const matched = units.find(
      (u) =>
        u.code.toLowerCase() === targetCode.toLowerCase() ||
        u.id.toLowerCase() === targetCode.toLowerCase() ||
        u.name.toLowerCase().includes(targetCode.toLowerCase())
    );

    if (matched) {
      setScanError(null);
      stopScanner();
      onUnitDetected(matched);
    } else {
      setScanError(`تم قراءة الرمز (${targetCode})، ولكن لم يتم العثور على منشأة مطابقة في النظام.`);
    }
  };

  const startScanner = async () => {
    setScanError(null);
    setTimeout(async () => {
      try {
        const scannerElement = document.getElementById('inapp-qr-scanner-region');
        if (!scannerElement) return;

        if (qrScannerRef.current) {
          try {
            await qrScannerRef.current.stop();
            qrScannerRef.current.clear();
          } catch {
            // ignore cleanup error
          }
        }

        const scanner = new Html5Qrcode('inapp-qr-scanner-region');
        qrScannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
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
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraActive(false);
        setScanError('تعذر فتح الكاميرا مباشرة. يمكنك استخدام خيار رفع صورة الرمز أو البحث برمز الوحدة.');
      }
    }, 150);
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        qrScannerRef.current.clear();
      } catch (e) {
        console.error('Stop scanner error:', e);
      }
      qrScannerRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [activeTab]);

  const handleQrFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let scanner = qrScannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('inapp-qr-scanner-region');
        qrScannerRef.current = scanner;
      }
      const result = await scanner.scanFile(file, true);
      if (result) {
        handleProcessDecodedText(result);
      }
    } catch (err: any) {
      console.error('Failed to read QR image:', err);
      setScanError('تعذر قراءة رمز QR من الصورة المحددة. يرجى اختيار صورة واضحة ومباشرة للرمز.');
    }
    e.target.value = '';
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSearchCode.trim()) return;
    handleProcessDecodedText(manualSearchCode);
  };

  return (
    <div
      id="modal-inapp-qr-scanner"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      <div
        className={`border rounded-3xl max-w-lg w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden transition-all ${
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
                ماسح رمز الوصول السريع (In-App QR Scanner)
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                امسح رمز الوحدة للوصول المباشر لخيارات الموقع والكشف والصيانة
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
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

        {/* Tabs Bar */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>كاميرا المسح المباشر</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>رفع صورة الرمز</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>إدخال يدوي</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {scanError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">خطأ في المسح</span>
                <span>{scanError}</span>
              </div>
            </div>
          )}

          {/* Camera View */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative w-full h-[280px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-inner flex items-center justify-center">
                <div id="inapp-qr-scanner-region" className="w-full h-full" />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-4 text-center space-y-2">
                    <Camera className="w-8 h-8 text-amber-500 animate-pulse" />
                    <p className="text-xs text-slate-300">جاري تشغيل الكاميرا...</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                وجّه الكاميرا نحو رمز الاستجابة السريعة (QR Code) المثبت على المنشأة أو الكرفان
              </p>
            </div>
          )}

          {/* Upload View */}
          {activeTab === 'upload' && (
            <div className="space-y-4 text-center py-4">
              <input
                type="file"
                ref={qrFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleQrFileScan}
              />
              <div
                onClick={() => qrFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl p-8 bg-slate-950/50 hover:bg-slate-950/80 transition cursor-pointer space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">اختر أو اسحب صورة رمز QR</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    يدعم ملفات الصور PNG, JPG, JPEG الملتقطة من الموقع الميداني
                  </p>
                </div>
                <button
                  type="button"
                  className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow hover:bg-amber-400 transition"
                >
                  استعراض الملفات
                </button>
              </div>
            </div>
          )}

          {/* Manual Entry View */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSearch} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  أدخل رمز الوحدة الموحد أو اسمها:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualSearchCode}
                    onChange={(e) => setManualSearchCode(e.target.value)}
                    placeholder="مثال: WS-AHD-CRV-001 أو اسم المنشأة"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute left-1.5 top-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                  >
                    بحث وتطبيق
                  </button>
                </div>
              </div>

              {/* Quick Suggestions from Loaded Units */}
              {units.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    الوحدات المتاحة للاختيار السريع:
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {units.slice(0, 8).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleProcessDecodedText(u.code)}
                        className="w-full text-right p-2 rounded-xl bg-slate-950/60 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-xs flex items-center justify-between transition cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-200 block">{u.name}</span>
                          <span className="font-mono text-[10px] text-amber-500">{u.code}</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex items-center justify-end gap-2.5 shrink-0 transition-colors ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
          }`}
        >
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
