import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  MapPin,
  ExternalLink,
  Download,
  Printer,
  Copy,
  Check,
  Building,
  ShieldCheck,
  Compass,
  Box,
  Share2,
} from 'lucide-react';
import { UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';

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
  const [copied, setCopied] = useState<boolean>(false);

  // Payload encoded inside the Quick Access QR Code
  const mapsUrl = `https://maps.google.com/?q=${unit.coordinates.lat},${unit.coordinates.lng}`;
  const qrPayload = JSON.stringify({
    code: unit.code,
    name: unit.name,
    field: unit.field,
    governorate: unit.governorate,
    lat: unit.coordinates.lat,
    lng: unit.coordinates.lng,
    constructionYear: unit.constructionYear,
    grade: unit.conditionGrade,
    area: unit.totalAreaSqM,
    floors: unit.floorsCount,
    department: unit.department,
    maps: mapsUrl,
    org: 'شركة نفط الوسط - وزارة النفط العراقي',
  });

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

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(
      `رمز الوحدة: ${unit.code}\nاسم المنشأة: ${unit.name}\nالحقل والمحافظة: ${unit.field} - ${unit.governorate}\nالإحداثيات: ${unit.coordinates.lat}, ${unit.coordinates.lng}\nرابط الخريطة: ${mapsUrl}\nشركة نفط الوسط`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
          <div class="info">
            <p><strong>اسم المنشأة:</strong> ${unit.name}</p>
            <p><strong>الموقع الميداني:</strong> ${unit.governorate} • ${unit.field}</p>
            <p><strong>الإحداثيات الجغرافية:</strong> ${unit.coordinates.lat}°, ${unit.coordinates.lng}°</p>
            <p><strong>التقييم الهندسي:</strong> Grade ${unit.conditionGrade} • المساحة: ${unit.totalAreaSqM} م²</p>
            <p><strong>الجهة الشاغلة:</strong> ${unit.department}</p>
          </div>
          <div class="footer">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-IQ')} • الأرشيف الهندسي الموحد</div>
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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div
        className={`border rounded-3xl max-w-xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-100">رمز الوصول السريع (Quick Access QR)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {toArabicDigits(unit.code)}
                </span>
              </div>
              <p className="text-xs text-slate-400">بطاقة التثبيت الميداني والإحداثيات الجغرافية الموثقة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-950/60">
          {/* Metallic / Digital Badge Mockup */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl text-center space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5" />
                <span>وزارة النفط - شركة نفط الوسط</span>
              </span>
              <span className="font-mono">MIDLAND OIL COMPANY</span>
            </div>

            {/* Code Box */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                الرمز الموحد للمنشأة (Structural Unit Code)
              </span>
              <div className="bg-slate-950 border-2 border-amber-500/70 rounded-xl py-2 px-4 font-mono text-2xl font-black text-amber-400 tracking-widest shadow-inner inline-block min-w-[220px]">
                {toArabicDigits(unit.code)}
              </div>
            </div>

            {/* QR Image Display */}
            <div className="flex justify-center my-2">
              <div className="bg-white p-3 rounded-2xl border-4 border-amber-500/60 shadow-xl relative group">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR Code for ${unit.code}`} className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg" />
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
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-right text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="font-extrabold text-slate-100 text-sm truncate">{unit.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                  Grade {unit.conditionGrade}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">الموقع الميداني:</span>
                  <span className="font-bold text-amber-400">{unit.governorate} • {unit.field}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">المساحة والطوابق:</span>
                  <span className="font-bold">{toArabicDigits(unit.totalAreaSqM)} م² ({toArabicDigits(unit.floorsCount)} طابق)</span>
                </div>

                <div className="col-span-2 pt-1 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] flex items-center gap-1">
                    <Compass className="w-3 h-3 text-amber-500" />
                    <span>الإحداثيات الجغرافية (GPS):</span>
                  </span>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-amber-400 font-bold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>{toArabicDigits(unit.coordinates.lat)}°, {toArabicDigits(unit.coordinates.lng)}°</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-bold pt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>رمز وصول سريع موثق إلكترونياً ومربوط بالدليل الجغرافي MOC</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>فتح الخريطة (GPS)</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPayload}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="نسخ معلومات رمز الوصول السريع"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ' : 'نسخ البيانات'}</span>
            </button>

            <button
              onClick={handleDownloadQr}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل PNG</span>
            </button>

            <button
              onClick={handlePrintPlate}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة اللوحة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
