import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Printer,
  Building,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { UnitAsset } from '../types';
import { toArabicDigits, getServerDateDDMMYYYY } from '../utils/arabicUtils';

interface UnitQrCodeModalProps {
  unit: UnitAsset;
  theme?: 'dark' | 'light';
  onClose: () => void;
}

export const UnitQrCodeModal: React.FC<UnitQrCodeModalProps> = ({
  unit,
  theme = 'dark',
  onClose,
}) => {
  const isLight = theme === 'light';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Payload encoded inside the Quick Access QR Code:
  // When scanned from OUTSIDE the app (camera/browser) -> Directly leads to the unit's location on the map & GPS directions
  // When scanned from INSIDE the app -> In-app scanner detects the code and offers the 3 choices (Location, Inspection, Maintenance)
  const appBaseUrl =
    (import.meta as any).env?.VITE_APP_URL ||
    (import.meta as any).env?.APP_URL ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : '');
  const qrPayload = `${appBaseUrl}/?view=map&unit=${encodeURIComponent(unit.code)}&lat=${unit.coordinates?.lat || ''}&lng=${unit.coordinates?.lng || ''}&name=${encodeURIComponent(unit.name || '')}&gov=${encodeURIComponent(unit.governorate || '')}&field=${encodeURIComponent(unit.field || '')}&src=external_qr`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [qrPayload]);

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `MOC_QR_${unit.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPlate = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>لوحة التثبيت الميدانية - رمز الوصول السريع - ${unit.code}</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #fff; padding: 20px; text-align: center; }
          .plate { border: 4px solid #1e293b; border-radius: 16px; padding: 24px; max-w: 480px; margin: 0 auto; background: #f8fafc; }
          .header { font-size: 14px; font-weight: bold; color: #b45309; margin-bottom: 4px; }
          .sub { font-size: 11px; color: #475569; margin-bottom: 16px; }
          .code-box { background: #0f172a; color: #f59e0b; font-family: monospace; font-size: 24px; font-weight: 900; padding: 10px; border-radius: 8px; margin-bottom: 16px; letter-spacing: 2px; }
          .qr-img { width: 220px; height: 220px; margin: 0 auto 16px; border: 2px solid #cbd5e1; padding: 8px; background: #fff; border-radius: 12px; }
          .info { text-align: right; font-size: 12px; color: #334155; line-height: 1.8; border-top: 1px solid #e2e8f0; pt: 12px; }
          .footer { font-size: 10px; color: #94a3b8; margin-top: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="plate">
          <div class="header">جمهورية العراق - وزارة النفط - شركة نفط الوسط</div>
          <div class="sub">لوحة التعريف الميداني المعتمدة ورمز الوصول السريع QR</div>
          <div class="code-box">${unit.code}</div>
          ${unit.fixedAssetCode ? `<div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #4338ca; margin-bottom: 12px;">رمز الأصل: ${unit.fixedAssetCode}</div>` : ''}
          <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
          <div class="info">
            <p><strong>اسم المنشأة:</strong> ${unit.name}</p>
            <p><strong>رمز المنشأة الفريد:</strong> ${unit.code}</p>
            ${unit.fixedAssetCode ? `<p><strong>رمز الأصل:</strong> ${unit.fixedAssetCode}</p>` : ''}
            <p><strong>الموقع الميداني:</strong> ${unit.governorate} • ${unit.field}</p>
            <p><strong>المساحة الإجمالية:</strong> ${unit.totalAreaSqM ? `${unit.totalAreaSqM} م²` : 'غير محدد'} • عدد الطوابق: ${unit.floorsCount || 1}</p>
            <p><strong>الإحداثيات الجغرافية:</strong> ${unit.coordinates.lat}°, ${unit.coordinates.lng}°</p>
            <p><strong>الجهة الشاغلة:</strong> ${unit.department}</p>
          </div>
          <div class="footer">تاريخ الطباعة: <span style="font-family: monospace; font-weight: bold;">${getServerDateDDMMYYYY()}</span></div>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      id="modal-qr-code"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      <div
        className={`border rounded-3xl max-w-xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-900'
              : 'bg-slate-950/50 border-slate-800/80 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-extrabold text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  رمز الوصول السريع (Quick Access QR)
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isLight
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {toArabicDigits(unit.code)}
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                بطاقة التثبيت الميداني والإحداثيات الجغرافية الموثقة
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

        {/* Content Body */}
        <div
          className={`p-4 sm:p-6 overflow-y-auto space-y-5 transition-colors ${
            isLight ? 'bg-slate-100/70' : 'bg-slate-950/60'
          }`}
        >
          {/* Metallic / Digital Badge Mockup */}
          <div
            className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xl text-center space-y-4 relative overflow-hidden transition-all ${
              isLight
                ? 'bg-gradient-to-br from-amber-50/40 via-white to-slate-50 border-amber-500/60 shadow-slate-300/40'
                : 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-amber-500/50 shadow-2xl'
            }`}
          >
            {/* Badge Header */}
            <div
              className={`flex items-center justify-between text-[10px] font-bold border-b pb-2 ${
                isLight
                  ? 'text-amber-800 border-slate-200'
                  : 'text-amber-400 border-slate-800'
              }`}
            >
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5" />
                <span>وزارة النفط - شركة نفط الوسط</span>
              </span>
              <span className="font-mono text-slate-500">MIDLAND OIL COMPANY</span>
            </div>

            {/* Code Box */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="space-y-1">
                  <span className={`text-[10px] font-bold block uppercase tracking-wider ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    رمز المنشأة الفريد (Code)
                  </span>
                  <div className="bg-slate-950 border-2 border-amber-500 rounded-xl py-2 px-4 font-mono text-xl font-black text-amber-400 tracking-widest shadow-inner inline-block min-w-[160px]">
                    {toArabicDigits(unit.code)}
                  </div>
                </div>

                {unit.fixedAssetCode && (
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold block uppercase tracking-wider ${
                      isLight ? 'text-indigo-700' : 'text-indigo-300'
                    }`}>
                      رمز الأصل
                    </span>
                    <div className="bg-slate-950 border-2 border-indigo-500/80 rounded-xl py-2 px-4 font-mono text-xl font-black text-indigo-300 tracking-widest shadow-inner inline-block min-w-[160px]">
                      {unit.fixedAssetCode}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* QR Image Display */}
            <div className="flex justify-center my-2">
              <div className="bg-white p-3 rounded-2xl border-4 border-amber-500/60 shadow-lg relative group">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${unit.code}`}
                    className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-500 font-bold text-xs">
                    جاري توليد الرمز...
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition rounded-2xl flex items-center justify-center gap-2 backdrop-blur-xs">
                  <button
                    onClick={handleDownloadQr}
                    className="p-2 bg-amber-500 text-slate-950 rounded-lg font-bold text-xs shadow hover:bg-amber-400 cursor-pointer"
                    title="تحميل صورة QR"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Unit Details Box inside Plate */}
            <div
              className={`rounded-xl p-3.5 text-right text-xs space-y-2.5 border transition-colors ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-800 shadow-xs'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
            >
              <div
                className={`flex items-center justify-between border-b pb-2 ${
                  isLight ? 'border-slate-200' : 'border-slate-800/80'
                }`}
              >
                <span className={`font-extrabold text-sm truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {unit.name}
                </span>
                {unit.fixedAssetCode && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 border ${
                    isLight
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    أصل: {unit.fixedAssetCode}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <div>
                  <span className={`block text-[10px] ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>
                    الموقع الميداني:
                  </span>
                  <span className={`font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                    {unit.governorate} • {unit.field}
                  </span>
                </div>

                <div>
                  <span className={`block text-[10px] ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>
                    المساحة والطوابق:
                  </span>
                  <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    {toArabicDigits(unit.totalAreaSqM)} م² ({toArabicDigits(unit.floorsCount)} طابق)
                  </span>
                </div>

                <div
                  className={`col-span-2 pt-2 border-t flex items-center justify-between ${
                    isLight ? 'border-slate-200' : 'border-slate-800/60'
                  }`}
                >
                  <span className={`text-[10px] flex items-center gap-1 ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>
                    <Compass className={`w-3 h-3 ${isLight ? 'text-amber-600' : 'text-amber-500'}`} />
                    <span>الإحداثيات الجغرافية (GPS):</span>
                  </span>
                  <span className={`font-mono font-bold text-[11px] ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                    {toArabicDigits(unit.coordinates.lat)}°, {toArabicDigits(unit.coordinates.lng)}°
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Certification Badge & Behavior Notice */}
            <div className="space-y-2 pt-1 border-t border-slate-800/40">
              <div
                className={`flex items-center justify-center gap-1.5 text-[10px] font-bold ${
                  isLight ? 'text-emerald-700' : 'text-emerald-400'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>رمز وصول سريع موثق إلكترونياً ومربوط بالدليل الجغرافي MOC</span>
              </div>
              <div
                className={`p-2.5 rounded-xl text-[10px] leading-relaxed text-right border ${
                  isLight
                    ? 'bg-amber-50/80 text-amber-900 border-amber-200'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                }`}
              >
                <div className="font-bold flex items-center gap-1 mb-0.5 text-amber-500">
                  <Compass className="w-3 h-3" />
                  <span>آلية المسح الذكي المزدوج:</span>
                </div>
                <p>• <strong>من خارج البرنامج (كاميرا الهاتف):</strong> يقود مباشرة إلى موقع المنشأة على الخريطة التفاعلية والاتجاهات في Google Maps.</p>
                <p>• <strong>من داخل البرنامج:</strong> يتيح خيارات الوصول السريع (خيار الموقع / خيار الكشف / خيار الصيانة).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div
          className={`p-3 sm:p-4 border-t flex flex-wrap items-center justify-end gap-2.5 shrink-0 transition-colors ${
            isLight
              ? 'border-slate-200 bg-slate-50'
              : 'border-slate-800 bg-slate-950'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            إغلاق
          </button>

          <button
            onClick={handleDownloadQr}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل PNG</span>
          </button>

          <button
            onClick={handlePrintPlate}
            className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة اللوحة</span>
          </button>
        </div>
      </div>
    </div>
  );
};

