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
import { UnitAsset, SystemBranding } from '../types';
import { toArabicDigits, getServerDateDDMMYYYY } from '../utils/arabicUtils';
import { INITIAL_BRANDING } from '../data/mockData';

interface UnitQrCodeModalProps {
  unit: UnitAsset;
  branding?: SystemBranding;
  theme?: 'dark' | 'light';
  onClose: () => void;
}

export const UnitQrCodeModal: React.FC<UnitQrCodeModalProps> = ({
  unit,
  branding,
  theme = 'dark',
  onClose,
}) => {
  const isLight = theme === 'light';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const currentBranding: SystemBranding =
    branding ||
    (() => {
      try {
        const saved = localStorage.getItem('app_branding');
        return saved ? JSON.parse(saved) : INITIAL_BRANDING;
      } catch {
        return INITIAL_BRANDING;
      }
    })();

  const countryName = currentBranding.countryName || 'جمهورية العراق';
  const ministryName = currentBranding.ministryName || 'وزارة النفط';
  const companyName = currentBranding.companyName || 'شركة نفط الوسط';
  const systemName = currentBranding.systemName || 'إدارة الأصول والمنشآت';
  const countryMinistryHeader = `${countryName} - ${ministryName}`;

  // Gather unique occupying entities without any duplicate repetition
  const rawOccupyingSources: string[] = [
    unit.department || '',
    ...(unit.rooms?.map((r) => r.occupiedBy || '') || []),
  ];

  const seenOccupying = new Set<string>();
  const occupyingList: string[] = [];

  for (const raw of rawOccupyingSources) {
    if (!raw) continue;
    // Split by Arabic comma '،', English comma ',', newlines, semicolons, or bullets
    const parts = raw.split(/[،,\n;\t•]+/);
    for (const part of parts) {
      const trimmed = part.trim().replace(/\s+/g, ' ');
      if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'غير محدد') continue;
      
      const normalizedKey = trimmed.toLowerCase();
      if (!seenOccupying.has(normalizedKey)) {
        seenOccupying.add(normalizedKey);
        occupyingList.push(trimmed);
      }
    }
  }

  const occupyingDisplay =
    occupyingList.length > 0
      ? occupyingList.join(' ، ')
      : (unit.department?.trim() || 'غير محدد');

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
        <title>لوحة التعريف الميدانية - رمز الوصول السريع - ${unit.code}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 20px; text-align: center; color: #0f172a; margin: 0; }
          .plate { border: 2.5px solid #0f172a; border-radius: 16px; padding: 22px 20px; max-width: 480px; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; text-align: center; }
          .header-line1 { font-size: 14px; font-weight: 900; color: #b45309; margin-bottom: 2px; }
          .header-line2 { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
          .header-line3 { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; }
          .header-tag { display: inline-block; margin-top: 4px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 11px; font-weight: 900; padding: 3px 14px; border-radius: 20px; }
          
          .code-section { margin-bottom: 12px; }
          .code-label { display: block; font-size: 10.5px; font-weight: bold; color: #64748b; margin-bottom: 4px; }
          .code-box { background: #0f172a; color: #f59e0b; font-family: monospace; font-size: 22px; font-weight: 900; padding: 8px 16px; border-radius: 10px; display: inline-block; letter-spacing: 1.5px; border: 2px solid #f59e0b; }
          
          .qr-wrapper { margin: 10px auto 14px; padding: 8px; border: 2px solid #cbd5e1; border-radius: 14px; background: #ffffff; display: inline-block; }
          .qr-img { width: 195px; height: 195px; display: block; }
          
          .details-list { text-align: right; margin-top: 6px; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; }
          .detail-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 9px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; gap: 10px; }
          .detail-row:last-child { border-bottom: none; }
          .detail-row.alt { background: #f8fafc; }
          .detail-label { color: #64748b; font-weight: 700; font-size: 11.5px; shrink: 0; min-width: 110px; text-align: right; }
          .detail-value { font-weight: 900; color: #0f172a; text-align: left; word-break: break-word; }
          .detail-value.mono { font-family: monospace; letter-spacing: 0.5px; }
          .detail-value.highlight-name { color: #0f172a; font-size: 13px; font-weight: 900; }
          .detail-value.highlight-code { color: #0284c7; font-size: 12.5px; }
          .detail-value.highlight-asset { color: #4f46e5; }
          .detail-value.highlight-loc { color: #b45309; }
          .detail-value.highlight-area { color: #047857; }
          .detail-value.highlight-coords { color: #0369a1; font-size: 11.5px; }
          .detail-value.highlight-occ { color: #0f172a; font-size: 11.5px; text-align: left; }
          
          .footer-date { font-size: 9px; color: #94a3b8; margin-top: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="plate">
          <div class="header">
            <div class="header-line1">${countryMinistryHeader}</div>
            <div class="header-line2">${companyName}</div>
            <div class="header-line3">${systemName}</div>
            <div class="header-tag">لوحة التعريف الميدانية ورمز الوصول السريع (QR)</div>
          </div>
          
          <div class="code-section">
            <span class="code-label">رمز المنشأة</span>
            <div class="code-box">${unit.code}</div>
          </div>
          
          <div class="qr-wrapper">
            <img class="qr-img" src="${qrDataUrl}" alt="Unit QR Code" />
          </div>

          <div class="details-list">
            <div class="detail-row alt">
              <span class="detail-label">اسم المنشأة:</span>
              <span class="detail-value highlight-name">${unit.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">رمز المنشأة:</span>
              <span class="detail-value mono highlight-code">${unit.code}</span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">رمز الأصل:</span>
              <span class="detail-value mono highlight-asset">${unit.fixedAssetCode || 'غير مسجل'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">الموقع الميداني:</span>
              <span class="detail-value highlight-loc">${unit.governorate} • ${unit.field}</span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">المساحة الإجمالية:</span>
              <span class="detail-value highlight-area">${unit.totalAreaSqM ? `${unit.totalAreaSqM} م²` : 'غير محدد'} • عدد الطوابق: ${unit.floorsCount || 1}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">الإحداثيات الجغرافية:</span>
              <span class="detail-value mono highlight-coords">${unit.coordinates.lat}°, ${unit.coordinates.lng}°</span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">الجهة الشاغلة:</span>
              <span class="detail-value highlight-occ">${occupyingDisplay}</span>
            </div>
          </div>

          <div class="footer-date">تاريخ الطباعة: <span style="font-family: monospace; font-weight: bold;">${getServerDateDDMMYYYY()}</span></div>
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
            {/* Badge Header with Dynamic Branding */}
            <div
              className={`border-b pb-3 text-center space-y-1 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <div className="text-[12.5px] font-black text-amber-600 dark:text-amber-400">
                {countryMinistryHeader}
              </div>
              <div className={`text-[12px] font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {companyName}
              </div>
              <div className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {systemName}
              </div>
              <div className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10.5px] font-black px-3 py-0.5 rounded-full mt-0.5">
                لوحة التعريف الميدانية ورمز الوصول السريع (QR)
              </div>
            </div>

            {/* Code Box above QR Code */}
            <div className="space-y-1">
              <span className={`text-[10.5px] font-bold block ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                رمز المنشأة
              </span>
              <div className="bg-slate-950 border-2 border-amber-500 rounded-xl py-2 px-5 font-mono text-xl font-black text-amber-400 tracking-widest shadow-inner inline-block min-w-[180px]">
                {unit.code}
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

            {/* Sequential Details List below QR Code */}
            <div
              className={`rounded-2xl border overflow-hidden text-xs divide-y text-right transition-colors ${
                isLight
                  ? 'bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-xs'
                  : 'bg-slate-950 border-slate-800 divide-slate-900 text-slate-100'
              }`}
            >
              <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
                <span className="text-slate-400 font-bold text-[11px]">اسم المنشأة:</span>
                <span className={`font-black text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {unit.name}
                </span>
              </div>

              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-slate-400 font-bold text-[11px]">رمز المنشأة:</span>
                <span className="font-mono font-black text-sky-500 tracking-wide text-xs">
                  {unit.code}
                </span>
              </div>

              <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
                <span className="text-slate-400 font-bold text-[11px]">رمز الأصل:</span>
                <span className="font-mono font-bold text-indigo-400 text-xs">
                  {unit.fixedAssetCode || 'غير مسجل'}
                </span>
              </div>

              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-slate-400 font-bold text-[11px]">الموقع الميداني:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                  {unit.governorate} • {unit.field}
                </span>
              </div>

              <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
                <span className="text-slate-400 font-bold text-[11px]">المساحة الإجمالية:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  {unit.totalAreaSqM ? `${toArabicDigits(unit.totalAreaSqM)} م²` : 'غير محدد'} • عدد الطوابق: {toArabicDigits(unit.floorsCount || 1)}
                </span>
              </div>

              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-slate-400 font-bold text-[11px]">الإحداثيات الجغرافية:</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs">
                  {toArabicDigits(unit.coordinates.lat)}°, {toArabicDigits(unit.coordinates.lng)}°
                </span>
              </div>

              <div className={`flex justify-between items-start px-4 py-2.5 gap-2 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
                <span className="text-slate-400 font-bold text-[11px] shrink-0">الجهة الشاغلة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs text-left">
                  {occupyingDisplay}
                </span>
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
                <span>رمز وصول سريع موثق إلكترونياً ومربوط بالدليل الجغرافي للمنظومة</span>
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

