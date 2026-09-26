import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Printer,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { UnitAsset, SystemBranding } from '../types';
import { toArabicDigits, getServerDateDDMMYYYY } from '../utils/arabicUtils';
import { INITIAL_BRANDING } from '../data/mockData';
import {
  CardPrintSize,
  CardPlacement,
  generateCompactUnitCardHtml,
  generateMediumUnitCardHtml,
  generateFullUnitCardHtml,
  buildSingleCardPrintHtml,
} from '../utils/qrCardPrintHtml';
import { A4PrintPlacementSelector } from './A4PrintPlacementSelector';

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

  // Flexible size and placement states
  const [cardSize, setCardSize] = useState<CardPrintSize>('compact');
  const [placement, setPlacement] = useState<CardPlacement>('top-right');

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

  // Robust, memoized computation of unique occupying entities list
  const occupyingEntities = useMemo(() => {
    const rawOccupyingSources: string[] = [
      unit.department || '',
      ...(unit.rooms?.map((r) => r.occupiedBy || '') || []),
    ];

    const seenOccupying = new Set<string>();
    const occupyingList: string[] = [];

    for (const raw of rawOccupyingSources) {
      if (!raw) continue;
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

    if (occupyingList.length > 0) {
      return occupyingList;
    }
    return unit.department && unit.department.trim() !== '' ? [unit.department.trim()] : ['غير محدد'];
  }, [unit.department, unit.rooms]);

  const occupyingDisplay = useMemo(() => {
    return occupyingEntities.join(' ، ');
  }, [occupyingEntities]);

  // Payload encoded inside the Quick Access QR Code
  const appBaseUrl =
    (import.meta as any).env?.VITE_APP_URL ||
    (import.meta as any).env?.APP_URL ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')}`
      : '');
  const qrPayload = `${appBaseUrl}/?view=map&unit=${encodeURIComponent(unit.code)}&lat=${unit.coordinates?.lat || ''}&lng=${unit.coordinates?.lng || ''}&name=${encodeURIComponent(unit.name || '')}&gov=${encodeURIComponent(unit.governorate || '')}&field=${encodeURIComponent(unit.field || '')}&src=external_qr`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(qrPayload, {
      width: 650,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
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

  const commonCardData = {
    countryMinistryHeader,
    companyName,
    systemName,
    qrDataUrl,
    dateStr: getServerDateDDMMYYYY(),
  };

  // Generate HTML for current unit card based on selected size
  const getCurrentUnitCardHtml = () => {
    if (cardSize === 'compact') {
      return generateCompactUnitCardHtml(unit, occupyingEntities, commonCardData);
    } else if (cardSize === 'medium') {
      return generateMediumUnitCardHtml(unit, occupyingEntities, commonCardData);
    } else {
      return generateFullUnitCardHtml(unit, occupyingEntities, commonCardData);
    }
  };

  // Print plate using chosen size and placement on A4 sheet
  const handlePrintPlate = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardHtml = getCurrentUnitCardHtml();
    const title = `لوحة التعريف الميدانية - رمز الوصول السريع - ${unit.code}`;
    const fullHtml = buildSingleCardPrintHtml(cardHtml, cardSize, placement, title);

    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };

  // Render card preview in UI
  const renderCardElement = (isMini = false) => {
    const coords = unit.coordinates
      ? `${toArabicDigits(unit.coordinates.lat)}°, ${toArabicDigits(unit.coordinates.lng)}°`
      : 'غير محدد';
    const area = unit.totalAreaSqM ? `${toArabicDigits(unit.totalAreaSqM)} م²` : 'غير محدد';

    if (cardSize === 'compact' || isMini) {
      return (
        <div
          className={`border-2 rounded-xl p-2.5 sm:p-3 shadow-md mx-auto text-center flex flex-col justify-between transition-all w-full ${
            isLight
              ? 'bg-white border-amber-500/50 text-slate-900'
              : 'bg-slate-950 border-amber-500/40 text-slate-100'
          } ${isMini ? 'h-full max-h-full overflow-hidden' : 'max-w-xs'}`}
        >
          {/* Header */}
          <div className="border-b pb-1.5 border-slate-200 dark:border-slate-800 space-y-0.5 shrink-0">
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 leading-tight truncate">
              {countryMinistryHeader}
            </p>
            <p className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 leading-tight truncate">
              {companyName}
            </p>
            <p className="text-[8.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate">
              {systemName}
            </p>
            <span className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[8px] font-bold px-2 py-0.2 rounded-full">
              لوحة التعريف الميدانية (QR)
            </span>
          </div>

          {/* Code Box */}
          <div className="my-1 shrink-0">
            <span className="text-[7.5px] font-bold text-slate-400 block">رمز المنشأة</span>
            <div className="bg-slate-950 border border-amber-500 rounded-lg px-2 py-0.5 font-mono text-xs font-black text-amber-400 tracking-wider inline-block">
              {unit.code}
            </div>
          </div>

          {/* QR Code */}
          <div className="my-1.5 flex justify-center shrink-0">
            <div className="p-1.5 bg-white rounded-xl border-2 border-slate-900 shadow-sm inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Unit QR"
                  className={isMini ? 'w-14 h-14 object-contain' : 'w-32 h-32 sm:w-36 sm:h-36 object-contain'}
                />
              ) : (
                <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">
                  جاري التوليد...
                </div>
              )}
            </div>
          </div>

          {/* Details Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-[9px] sm:text-[9.5px] divide-y divide-slate-100 dark:divide-slate-800/80 text-right w-full shrink-0">
            <div className="flex justify-between items-center px-2 py-1 bg-slate-50/70 dark:bg-slate-900/40">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">اسم المنشأة:</span>
              <span className="font-black text-left truncate flex-1 min-w-0 mr-1.5" title={unit.name}>{unit.name}</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">رمز الأصل:</span>
              <span className="font-mono font-bold text-indigo-400 text-left truncate flex-1 min-w-0 mr-1.5">
                {unit.fixedAssetCode || 'غير مسجل'}
              </span>
            </div>
            <div className="flex justify-between items-center px-2 py-1 bg-slate-50/70 dark:bg-slate-900/40">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">الموقع:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-left truncate flex-1 min-w-0 mr-1.5">
                {unit.governorate} • {unit.field}
              </span>
            </div>
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">المساحة:</span>
              <span className="font-bold text-emerald-500 text-left truncate flex-1 min-w-0 mr-1.5">{area} (ط {toArabicDigits(unit.floorsCount || 1)})</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1 bg-slate-50/70 dark:bg-slate-900/40">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">الإحداثيات:</span>
              <span className="font-mono font-bold text-sky-500 text-[8px] sm:text-[8.5px] text-left truncate flex-1 min-w-0 mr-1.5">{coords}</span>
            </div>
            <div className="flex flex-col gap-1 px-2 py-1.5 bg-amber-500/5 dark:bg-amber-500/10">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-slate-300 font-bold text-[8.5px] sm:text-[9px]">الجهات الشاغلة:</span>
                {occupyingEntities.length > 1 && (
                  <span className="text-[7px] sm:text-[7.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-full border border-amber-300 dark:border-amber-800">
                    {occupyingEntities.length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {occupyingEntities.map((entity, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7.5px] sm:text-[8px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs"
                  >
                    <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                    <span className="leading-tight">{entity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[7.5px] sm:text-[8px] text-slate-400 pt-1 shrink-0">
            تاريخ الطباعة: {getServerDateDDMMYYYY()}
          </div>
        </div>
      );
    }

    if (cardSize === 'medium') {
      return (
        <div
          className={`border-2 rounded-2xl p-3.5 sm:p-4 shadow-lg mx-auto max-w-md transition-all w-full ${
            isLight
              ? 'bg-white border-amber-500/50 text-slate-900'
              : 'bg-slate-950 border-amber-500/40 text-slate-100'
          } ${isMini ? 'h-full max-h-full overflow-hidden' : ''}`}
        >
          {/* Header */}
          <div className="border-b pb-2 text-center space-y-0.5 border-slate-200 dark:border-slate-800 shrink-0">
            <p className="text-xs font-black text-amber-600 dark:text-amber-400 truncate">
              {countryMinistryHeader}
            </p>
            <p className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200 truncate">
              {companyName}
            </p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
              {systemName}
            </p>
            <span className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-0.5">
              لوحة التعريف الميدانية ورمز الوصول السريع (QR) - نصف ورقة A5
            </span>
          </div>

          <div className="my-2.5 sm:my-3 flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-2.5 sm:gap-3">
            <div className="text-center shrink-0 w-full sm:w-auto flex flex-col items-center">
              <div className="mb-1 font-mono text-xs font-black bg-slate-900 text-amber-400 px-2.5 py-0.5 sm:py-1 rounded-lg border border-amber-500">
                {unit.code}
              </div>
              <div className="p-1.5 sm:p-2 bg-white rounded-xl border-2 border-slate-900 shadow-sm inline-block">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Unit QR" className="w-24 h-24 xs:w-28 xs:h-28 sm:w-36 sm:h-36 object-contain" />
                ) : (
                  <div className="w-24 h-24 sm:w-36 sm:h-36 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    جاري التوليد...
                  </div>
                )}
              </div>
            </div>

            <div className="w-full flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs divide-y divide-slate-100 dark:divide-slate-800 text-right">
              <div className="flex justify-between items-center px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-900/40">
                <span className="text-slate-400 font-bold text-[10.5px] shrink-0 min-w-[70px]">اسم المنشأة:</span>
                <span className="font-black text-xs truncate text-left flex-1 min-w-0 mr-2" title={unit.name}>{unit.name}</span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-1.5">
                <span className="text-slate-400 font-bold text-[10.5px] shrink-0 min-w-[70px]">رمز المنشأة:</span>
                <span className="font-mono font-black text-sky-500 text-xs text-left">{unit.code}</span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-900/40">
                <span className="text-slate-400 font-bold text-[10.5px] shrink-0 min-w-[70px]">رمز الأصل:</span>
                <span className="font-mono font-bold text-indigo-400 text-xs text-left truncate flex-1 min-w-0 mr-2">
                  {unit.fixedAssetCode || 'غير مسجل'}
                </span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-1.5">
                <span className="text-slate-400 font-bold text-[10.5px] shrink-0 min-w-[70px]">الموقع:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-xs text-left truncate flex-1 min-w-0 mr-2">
                  {unit.governorate} • {unit.field}
                </span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-1.5 bg-slate-50/70 dark:bg-slate-900/40">
                <span className="text-slate-400 font-bold text-[10.5px] shrink-0 min-w-[70px]">المساحة:</span>
                <span className="font-bold text-emerald-500 text-xs text-left truncate flex-1 min-w-0 mr-2">{area} • {toArabicDigits(unit.floorsCount || 1)} طوابق</span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-1.5">
                <span className="text-slate-400 font-bold text-[10.5px] shrink-0 min-w-[70px]">الإحداثيات:</span>
                <span className="font-mono font-bold text-sky-500 text-[10px] text-left truncate flex-1 min-w-0 mr-2">{coords}</span>
              </div>
              <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-amber-500/5 dark:bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 dark:text-slate-300 font-bold text-[10px]">الجهات الشاغلة:</span>
                  {occupyingEntities.length > 1 && (
                    <span className="text-[8.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                      {occupyingEntities.length} جهات
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {occupyingEntities.map((entity, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] sm:text-[9.5px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="leading-tight">{entity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[9px] text-slate-400 text-center pt-1 shrink-0">
            تاريخ الطباعة: {getServerDateDDMMYYYY()}
          </div>
        </div>
      );
    }

    // Full Size (A4)
    return (
      <div
        className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xl mx-auto max-w-md transition-all w-full ${
          isLight
            ? 'bg-gradient-to-br from-amber-50/40 via-white to-slate-50 border-amber-500/60 shadow-slate-300/40'
            : 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-amber-500/50 shadow-2xl'
        }`}
      >
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 text-center space-y-1">
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
            لوحة التعريف الميدانية ورمز الوصول السريع (QR) - ورقة كاملة A4
          </div>
        </div>

        <div className="my-3 text-center space-y-1">
          <span className={`text-[10.5px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            رمز المنشأة
          </span>
          <div className="bg-slate-950 border-2 border-amber-500 rounded-xl py-2 px-5 font-mono text-xl font-black text-amber-400 tracking-widest shadow-inner inline-block min-w-[180px]">
            {unit.code}
          </div>
        </div>

        <div className="flex justify-center my-3">
          <div className="bg-white p-3 rounded-2xl border-4 border-amber-500/60 shadow-lg relative">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${unit.code}`}
                className="w-52 h-52 sm:w-60 sm:h-60 rounded-lg object-contain"
              />
            ) : (
              <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center text-slate-500 font-bold text-xs">
                جاري توليد الرمز...
              </div>
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl border overflow-hidden text-xs divide-y text-right transition-colors ${
            isLight
              ? 'bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-xs'
              : 'bg-slate-950 border-slate-800 divide-slate-900 text-slate-100'
          }`}
        >
          <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">اسم المنشأة:</span>
            <span className={`font-black text-xs text-left truncate flex-1 min-w-0 mr-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`} title={unit.name}>
              {unit.name}
            </span>
          </div>

          <div className="flex justify-between items-center px-4 py-2.5">
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">رمز المنشأة:</span>
            <span className="font-mono font-black text-sky-500 tracking-wide text-xs text-left">
              {unit.code}
            </span>
          </div>

          <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">رمز الأصل:</span>
            <span className="font-mono font-bold text-indigo-400 text-xs text-left truncate flex-1 min-w-0 mr-2">
              {unit.fixedAssetCode || 'غير مسجل'}
            </span>
          </div>

          <div className="flex justify-between items-center px-4 py-2.5">
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">الموقع الميداني:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-xs text-left truncate flex-1 min-w-0 mr-2">
              {unit.governorate} • {unit.field}
            </span>
          </div>

          <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">المساحة الإجمالية:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs text-left truncate flex-1 min-w-0 mr-2">
              {unit.totalAreaSqM ? `${toArabicDigits(unit.totalAreaSqM)} م²` : 'غير محدد'} • عدد الطوابق: {toArabicDigits(unit.floorsCount || 1)}
            </span>
          </div>

          <div className="flex justify-between items-center px-4 py-2.5">
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">الإحداثيات الجغرافية:</span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs text-left truncate flex-1 min-w-0 mr-2">
              {toArabicDigits(unit.coordinates.lat)}°, {toArabicDigits(unit.coordinates.lng)}°
            </span>
          </div>

          <div className={`flex flex-col gap-1.5 px-4 py-2.5 ${isLight ? 'bg-amber-50/40' : 'bg-amber-500/10'}`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 dark:text-slate-300 font-bold text-[11px]">الجهات الشاغلة:</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                {occupyingEntities.length} {occupyingEntities.length > 2 ? 'جهات شاغلة' : 'جهة'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {occupyingEntities.map((entity, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{entity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="modal-qr-code"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      <div
        className={`border rounded-3xl max-w-2xl w-full flex flex-col max-h-[94vh] shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
            : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-3 sm:p-5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-900'
              : 'bg-slate-950/50 border-slate-800/80 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-md shrink-0">
              <QrCode className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={`font-extrabold text-xs sm:text-base truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  لوحة التعريف ورمز QR
                </h3>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                    isLight
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {toArabicDigits(unit.code)}
                </span>
              </div>
              <p className={`text-[10px] sm:text-xs truncate hidden xs:block ${isLight ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                بطاقة التثبيت الميداني • مرونة كاملة في الحجم وتحديد الزاوية
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
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div
          className={`p-4 sm:p-5 overflow-y-auto space-y-4 transition-colors ${
            isLight ? 'bg-slate-100/70' : 'bg-slate-950/60'
          }`}
        >
          {/* Flexible Size & Placement Selector Widget */}
          <A4PrintPlacementSelector
            size={cardSize}
            setSize={setCardSize}
            placement={placement}
            setPlacement={setPlacement}
            hideSheetPreviewToggle={true}
            theme={theme}
            isRoomCard={false}
          />

          {/* Interactive Card Preview */}
          <div className="pt-1">
            {renderCardElement(false)}
          </div>

          {/* Bottom Certification Badge & Behavior Notice */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
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

        {/* Action Buttons Toolbar */}
        <div
          className={`p-3 sm:p-4 border-t flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0 transition-colors ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
          }`}
        >
          <button
            onClick={onClose}
            className={`w-full xs:w-auto px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer order-3 sm:order-1 ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            إغلاق
          </button>

          <button
            onClick={handleDownloadQr}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer order-1 sm:order-2"
          >
            <Download className="w-4 h-4" />
            <span>PNG</span>
          </button>

          <button
            onClick={handlePrintPlate}
            className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer order-2 sm:order-3"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة اللوحة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
