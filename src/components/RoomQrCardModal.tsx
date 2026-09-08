import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Printer,
  DoorClosed,
  Layers,
  Wrench,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { UnitAsset, Room, SystemBranding } from '../types';
import { toArabicDigits, getServerDateDDMMYYYY } from '../utils/arabicUtils';
import {
  generateRoomCode,
  getStandardRoomCode,
  isRoomVacant,
} from '../utils/unitAndRoomCodeUtils';
import { INITIAL_BRANDING } from '../data/mockData';
import {
  CardPrintSize,
  CardPlacement,
  CardPlacementA6,
  CardPlacementA5,
  generateCompactRoomCardHtml,
  generateMediumRoomCardHtml,
  generateFullRoomCardHtml,
  buildSingleCardPrintHtml,
  buildBatchRoomsPrintHtml,
  extractOccupyingList,
} from '../utils/qrCardPrintHtml';
import { A4PrintPlacementSelector } from './A4PrintPlacementSelector';

interface RoomQrCardModalProps {
  unit: UnitAsset;
  room: Room;
  allRooms?: Room[];
  branding?: SystemBranding;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onOpenMaintenance?: (unit: UnitAsset, room: Room) => void;
}

export const RoomQrCardModal: React.FC<RoomQrCardModalProps> = ({
  unit,
  room,
  allRooms = [],
  branding,
  theme = 'dark',
  onClose,
  onOpenMaintenance,
}) => {
  const isLight = theme === 'light';
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(room.id || room.code || '');
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);

  // Flexible size and placement states
  const [cardSize, setCardSize] = useState<CardPrintSize>('compact');
  const [placement, setPlacement] = useState<CardPlacement>('top-right');

  // Dynamic branding
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

  // Active room data
  const activeRoom =
    (allRooms.length > 0
      ? allRooms.find((r) => r.id === selectedRoomId || r.code === selectedRoomId)
      : null) || room;

  // Unified Room Code: prefer stored room.code if present, otherwise calculate standard code
  const finalRoomCode = (activeRoom.code && activeRoom.code.trim()) ? activeRoom.code.trim() : getStandardRoomCode(unit.code, activeRoom, allRooms);

  // App Base URL for QR scan payload
  const appBaseUrl =
    (import.meta as any).env?.VITE_APP_URL ||
    (import.meta as any).env?.APP_URL ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')}`
      : '');

  // Room QR payload - includes immutable roomId as primary identifier and room code
  const effectiveOccupiedBy = isRoomVacant(activeRoom.occupiedBy) ? 'شاغرة' : (activeRoom.occupiedBy || 'شاغرة');
  const roomQrPayload = `${appBaseUrl}/?type=room&unit=${encodeURIComponent(unit.code)}&room=${encodeURIComponent(finalRoomCode)}&roomId=${encodeURIComponent(activeRoom.id)}&roomName=${encodeURIComponent(activeRoom.name)}&floor=${encodeURIComponent(activeRoom.floor)}&occupiedBy=${encodeURIComponent(effectiveOccupiedBy)}&fixedAssetCode=${encodeURIComponent(unit.fixedAssetCode || '')}&src=room_qr`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(roomQrPayload, {
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
        console.error('Failed to generate Room QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [roomQrPayload]);

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `MOC_ROOM_QR_${finalRoomCode}.png`;
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

  // Generate HTML for current room card based on selected size
  const getCurrentRoomCardHtml = () => {
    if (cardSize === 'compact') {
      return generateCompactRoomCardHtml(unit, activeRoom, finalRoomCode, commonCardData);
    } else if (cardSize === 'medium') {
      return generateMediumRoomCardHtml(unit, activeRoom, finalRoomCode, commonCardData);
    } else {
      return generateFullRoomCardHtml(unit, activeRoom, finalRoomCode, commonCardData);
    }
  };

  // Print Single Card with user-selected size and position on A4
  const handlePrintSingleCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardHtml = getCurrentRoomCardHtml();
    const title = `بطاقة رمز الوصول السريع للغرفة - ${finalRoomCode}`;
    const fullHtml = buildSingleCardPrintHtml(cardHtml, cardSize, placement, title);

    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };

  // Print All Rooms (Batch) - strictly 4 rooms per A4 sheet!
  const handlePrintAllRoomsBatch = async () => {
    if (!allRooms || allRooms.length === 0) {
      handlePrintSingleCard();
      return;
    }

    setIsGeneratingAll(true);
    setBatchProgress(0);

    try {
      const roomCardHtmls: string[] = [];

      for (let i = 0; i < allRooms.length; i++) {
        const r = allRooms[i];
        const rCode = (r.code && r.code.trim()) ? r.code.trim() : getStandardRoomCode(unit.code, r, allRooms);
        const rOccupied = isRoomVacant(r.occupiedBy) ? 'شاغرة' : (r.occupiedBy || 'شاغرة');

        const rPayload = `${appBaseUrl}/?type=room&unit=${encodeURIComponent(unit.code)}&room=${encodeURIComponent(rCode)}&roomId=${encodeURIComponent(r.id)}&roomName=${encodeURIComponent(r.name)}&floor=${encodeURIComponent(r.floor)}&occupiedBy=${encodeURIComponent(rOccupied)}&fixedAssetCode=${encodeURIComponent(unit.fixedAssetCode || '')}&src=room_qr`;

        const rQrDataUrl = await QRCode.toDataURL(rPayload, {
          width: 650,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });

        const rCommonData = {
          countryMinistryHeader,
          companyName,
          systemName,
          qrDataUrl: rQrDataUrl,
          dateStr: getServerDateDDMMYYYY(),
        };

        // All batch cards are compact A6 so exactly 4 fit in each A4 sheet
        const rHtml = generateCompactRoomCardHtml(unit, r, rCode, rCommonData);
        roomCardHtmls.push(rHtml);

        setBatchProgress(Math.round(((i + 1) / allRooms.length) * 100));
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setIsGeneratingAll(false);
        return;
      }

      const fullHtml = buildBatchRoomsPrintHtml(
        unit,
        roomCardHtmls,
        `طباعة بطاقات غرف المنشأة (${allRooms.length} غرفة)`
      );

      printWindow.document.write(fullHtml);
      printWindow.document.close();
    } catch (err) {
      console.error('Error generating batch cards:', err);
      alert('حدث خطأ أثناء إعداد بطاقات الغرف للطباعة المجمعة');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const sheetsCount = Math.ceil((allRooms.length || 1) / 4);

  // Render Card Preview Element in UI
  const renderCardElement = (isMini = false) => {
    const isVacant = isRoomVacant(activeRoom.occupiedBy);
    const occupant = isVacant ? 'شاغرة' : (activeRoom.occupiedBy || 'شاغرة');
    const occupantList = isVacant ? ['شاغرة'] : extractOccupyingList(activeRoom.occupiedBy);

    if (cardSize === 'compact' || isMini) {
      return (
        <div
          className={`border-2 rounded-xl p-3 shadow-md mx-auto text-center flex flex-col justify-between transition-all ${
            isLight
              ? 'bg-white border-amber-500/50 text-slate-900'
              : 'bg-slate-950 border-amber-500/40 text-slate-100'
          } ${isMini ? 'w-full h-full scale-[0.85] origin-top' : 'max-w-xs'}`}
        >
          {/* Header */}
          <div className="border-b pb-1.5 border-slate-200 dark:border-slate-800 space-y-0.5">
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 leading-tight">
              {countryMinistryHeader}
            </p>
            <p className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
              {companyName}
            </p>
            <p className="text-[8.5px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
              {systemName}
            </p>
            <span className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[8px] font-bold px-2 py-0.2 rounded-full">
              بطاقة تعريف وترقيم الغرفة (QR)
            </span>
          </div>

          {/* QR Code */}
          <div className="my-2 flex justify-center">
            <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-sm inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Room QR"
                  className={isMini ? 'w-14 h-14 object-contain' : 'w-36 h-36 sm:w-44 sm:h-44 object-contain'}
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400">
                  جاري التوليد...
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-[9px] sm:text-[9.5px] divide-y divide-slate-100 dark:divide-slate-800/80 text-right w-full shrink-0">
            <div className="flex justify-between items-center px-2 py-1 bg-slate-50/70 dark:bg-slate-900/40">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">اسم المنشأة:</span>
              <span className="font-black text-left truncate flex-1 min-w-0 mr-1.5" title={unit.name}>{unit.name}</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">رمز المنشأة:</span>
              <span className="font-mono font-black text-sky-500 text-left truncate flex-1 min-w-0 mr-1.5">{unit.code}</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1 bg-slate-50/70 dark:bg-slate-900/40">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">رمز الأصل:</span>
              <span className="font-mono font-bold text-indigo-400 text-left truncate flex-1 min-w-0 mr-1.5">
                {unit.fixedAssetCode || 'غير مسجل'}
              </span>
            </div>
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-slate-400 font-bold shrink-0 min-w-[58px]">الطابق:</span>
              <span className="font-black text-emerald-500 text-left truncate flex-1 min-w-0 mr-1.5">{activeRoom.floor}</span>
            </div>
            <div className="flex justify-between items-center px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <span className="font-bold shrink-0 min-w-[58px]">رمز الغرفة:</span>
              <span className="font-mono font-black text-xs text-left truncate flex-1 min-w-0 mr-1.5">{finalRoomCode}</span>
            </div>
            <div className="flex flex-col gap-1 px-2 py-1.5 bg-amber-500/5 dark:bg-amber-500/10">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 dark:text-slate-300 font-bold text-[8.5px] sm:text-[9px]">الجهة الشاغلة:</span>
                {occupantList.length > 1 && (
                  <span className="text-[7px] sm:text-[7.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-full border border-amber-300 dark:border-amber-800">
                    {occupantList.length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {occupantList.map((entity, idx) => (
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

          <div className="text-[8px] text-slate-400 pt-1">
            تاريخ الإصدار: {getServerDateDDMMYYYY()}
          </div>
        </div>
      );
    }

    if (cardSize === 'medium') {
      return (
        <div
          className={`border-2 rounded-2xl p-4 shadow-lg mx-auto max-w-md transition-all ${
            isLight
              ? 'bg-white border-amber-500/50 text-slate-900'
              : 'bg-slate-950 border-amber-500/40 text-slate-100'
          }`}
        >
          {/* Header */}
          <div className="border-b pb-2 text-center space-y-0.5 border-slate-200 dark:border-slate-800">
            <p className="text-xs font-black text-amber-600 dark:text-amber-400">
              {countryMinistryHeader}
            </p>
            <p className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200">
              {companyName}
            </p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {systemName}
            </p>
            <span className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-0.5">
              بطاقة رمز الوصول السريع (QR) للغرفة - نصف ورقة A5
            </span>
          </div>

          <div className="my-3 flex items-center justify-between gap-3">
            <div className="text-center shrink-0">
              <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-sm inline-block">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Room QR" className="w-32 h-32 sm:w-36 sm:h-36 object-contain" />
                ) : (
                  <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                    جاري التوليد...
                  </div>
                )}
              </div>
              <div className="mt-1.5 font-mono text-[11px] font-black bg-slate-900 text-amber-400 px-2.5 py-1 rounded-md">
                {finalRoomCode}
              </div>
            </div>

            <div className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs divide-y divide-slate-100 dark:divide-slate-800 text-right">
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
                <span className="text-slate-400 font-bold text-[10.5px] shrink-0 min-w-[70px]">رقم الطابق:</span>
                <span className="font-black text-emerald-500 text-xs text-left truncate flex-1 min-w-0 mr-2">{activeRoom.floor}</span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <span className="font-bold text-[10.5px] shrink-0 min-w-[70px]">رمز الغرفة:</span>
                <span className="font-mono font-black text-xs text-left truncate flex-1 min-w-0 mr-2">{finalRoomCode}</span>
              </div>
              <div className="flex flex-col gap-1 px-2.5 py-1.5 bg-amber-500/5 dark:bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 dark:text-slate-300 font-bold text-[10px]">الجهة الشاغلة:</span>
                  {occupantList.length > 1 && (
                    <span className="text-[8.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                      {occupantList.length}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {occupantList.map((entity, idx) => (
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

          <div className="text-[9px] text-slate-400 text-center pt-1">
            تاريخ الإصدار: {getServerDateDDMMYYYY()}
          </div>
        </div>
      );
    }

    // Full Size (A4)
    return (
      <div
        className={`border-2 rounded-2xl p-5 shadow-xl mx-auto max-w-md transition-all ${
          isLight
            ? 'bg-gradient-to-b from-white to-slate-50 border-slate-800/80 text-slate-900'
            : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-slate-700 text-slate-100'
        }`}
      >
        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 text-center space-y-1">
          <p className="text-[12.5px] font-black text-amber-600 dark:text-amber-400">
            {countryMinistryHeader}
          </p>
          <p className={`text-[12px] font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            {companyName}
          </p>
          <p className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            {systemName}
          </p>
          <div className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10.5px] font-black px-3 py-0.5 rounded-full mt-1">
            بطاقة تعريف وترقيم الغرفة (QR) - ورقة كاملة A4
          </div>
        </div>

        <div className="my-4 flex flex-col items-center">
          <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md inline-block">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Room QR" className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-lg" />
            ) : (
              <div className="w-52 h-52 sm:w-60 sm:h-60 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                جاري توليد الرمز...
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs divide-y text-right">
          <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/40">
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">اسم المنشأة:</span>
            <span className="font-black text-xs text-left truncate flex-1 min-w-0 mr-2" title={unit.name}>{unit.name}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2.5">
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">رمز المنشأة:</span>
            <span className="font-mono font-black text-sky-500 tracking-wide text-xs text-left">{unit.code}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/40">
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">رمز الأصل:</span>
            <span className="font-mono font-bold text-indigo-400 text-xs text-left truncate flex-1 min-w-0 mr-2">
              {unit.fixedAssetCode || 'غير مسجل'}
            </span>
          </div>
          <div className="flex justify-between items-center px-4 py-2.5">
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">رقم الطابق:</span>
            <span className="font-black text-emerald-500 text-xs text-left truncate flex-1 min-w-0 mr-2">{activeRoom.floor}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/40">
            <span className="text-slate-400 font-bold text-[11px] shrink-0 min-w-[85px]">رمز الغرفة:</span>
            <span className="font-mono font-black text-amber-500 text-sm tracking-wide text-left">{finalRoomCode}</span>
          </div>
          <div className="flex flex-col gap-1.5 px-4 py-2.5 bg-amber-50/40 dark:bg-amber-500/10">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold text-[11px]">الجهة الشاغلة:</span>
              {occupantList.length > 1 && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                  {occupantList.length} جهات
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {occupantList.map((entity, idx) => (
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
      id="modal-room-qr-card"
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
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-900'
              : 'bg-slate-950/60 border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shadow-lg shrink-0">
              <DoorClosed className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-extrabold text-base sm:text-lg ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  بطاقة تعريف وترقيم الغرفة (Room QR Card)
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
                  {toArabicDigits(finalRoomCode)}
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                بطاقة التثبيت على باب الغرفة المعتمدة • طباعة ٤ بطاقات في كل ورقة A4 لتفادي هدر الورق
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Room quick selector tabs if multiple rooms exist */}
          {allRooms.length > 1 && (
            <div className="space-y-1.5">
              <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-1.5`}>
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>اختر الغرفة لعرض وتخصيص بطاقتها:</span>
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {allRooms.map((r) => {
                  const isSelected = r.id === activeRoom.id || r.code === activeRoom.code;
                  const fN = parseInt(String(r.floor || '').replace(/\D/g, ''), 10) || 1;
                  const rCode = r.code || generateRoomCode(unit.code, fN, r.type, r.sequenceNumber || 101, true);

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoomId(r.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <DoorClosed className="w-3.5 h-3.5" />
                      <span>{r.name}</span>
                      <span className="font-mono text-[10px] opacity-80">({rCode})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flexible Size & Placement Selector Widget */}
          <A4PrintPlacementSelector
            size={cardSize}
            setSize={setCardSize}
            placement={placement}
            setPlacement={setPlacement}
            hideSheetPreviewToggle={true}
            theme={theme}
            isRoomCard={true}
            totalRoomsCount={allRooms.length}
          />

          {/* Interactive Card Preview Section */}
          <div className="pt-1">
            {renderCardElement(false)}
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex flex-wrap items-center justify-between gap-2.5 shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {onOpenMaintenance && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMaintenance(unit, activeRoom);
                }}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">طلب صيانة</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadQr}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>تحميل PNG</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Batch Print All Rooms: 4 rooms per A4 page! */}
            {allRooms.length > 1 && (
              <button
                type="button"
                onClick={handlePrintAllRoomsBatch}
                disabled={isGeneratingAll}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer shadow-sm ${
                  isLight
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border-indigo-800'
                }`}
                title={`طباعة كافة بطاقات غرف المنشأة الـ (${allRooms.length}) بحيث تتسع كل ورقة A4 لأربع بطاقات، مما يحتاج إلى (${sheetsCount}) ورقة فقط!`}
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                <span>
                  {isGeneratingAll
                    ? `جاري التجهيز (${batchProgress}%)...`
                    : `طباعة كافة الغرف (${toArabicDigits(allRooms.length)} في ${toArabicDigits(sheetsCount)} ورقة A4)`}
                </span>
              </button>
            )}

            {/* Print Single Card with chosen size and location on A4 */}
            <button
              type="button"
              onClick={handlePrintSingleCard}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                طباعة البطاقة ({cardSize === 'compact' ? 'A6 ربع ورقة' : cardSize === 'medium' ? 'A5 نصف ورقة' : 'A4 كاملة'})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
