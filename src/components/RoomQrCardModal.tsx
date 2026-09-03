import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Download,
  Printer,
  Building,
  DoorClosed,
  Users,
  Maximize2,
  Wrench,
  AlertTriangle,
  Layers,
  MapPin,
  Compass,
  CheckCircle2,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { UnitAsset, Room, SystemBranding } from '../types';
import { toArabicDigits, getServerDateDDMMYYYY } from '../utils/arabicUtils';
import {
  generateRoomCode,
  getStandardRoomCode,
  formatRoomOccupancyDisplay,
  isOccupantsBasedRoom,
  isCapacityBasedRoom,
  isNonOccupancyRoom,
  getRoomTypeLabel,
} from '../utils/unitAndRoomCodeUtils';
import { INITIAL_BRANDING, OFFICIAL_MOC_LOGO_SVG } from '../data/mockData';

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

  // Dynamic branding from props or localStorage fallback
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
  const activeRoom = (allRooms.length > 0 ? allRooms.find((r) => r.id === selectedRoomId || r.code === selectedRoomId) : null) || room;

  // Unified Room Code using standard derivation
  const finalRoomCode = getStandardRoomCode(unit.code, activeRoom, allRooms);

  // App Base URL for QR scan payload
  const appBaseUrl =
    (import.meta as any).env?.VITE_APP_URL ||
    (import.meta as any).env?.APP_URL ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')}`
      : '');

  // Room QR payload contains type=room, unit code, room code, room name, floor
  const roomQrPayload = `${appBaseUrl}/?type=room&unit=${encodeURIComponent(unit.code)}&room=${encodeURIComponent(finalRoomCode)}&roomName=${encodeURIComponent(activeRoom.name)}&floor=${encodeURIComponent(activeRoom.floor)}&fixedAssetCode=${encodeURIComponent(unit.fixedAssetCode || '')}&src=room_qr`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(roomQrPayload, {
      width: 380,
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

  const handlePrintSingleCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>بطاقة رمز الوصول السريع للغرفة - ${finalRoomCode}</title>
        <style>
          @page { size: A5 portrait; margin: 8mm; }
          * { box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 15px; text-align: center; color: #0f172a; margin: 0; }
          .card { border: 2.5px solid #0f172a; border-radius: 16px; padding: 22px 20px; max-width: 440px; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; text-align: center; }
          .header-line1 { font-size: 13px; font-weight: 900; color: #b45309; margin-bottom: 2px; }
          .header-line2 { font-size: 12.5px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
          .header-line3 { font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px; }
          .header-tag { display: inline-block; margin-top: 4px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 11px; font-weight: 900; padding: 3px 12px; border-radius: 20px; }
          
          /* 1. رمز الـ QR */
          .qr-wrapper { margin: 12px auto 16px; padding: 8px; border: 2px solid #cbd5e1; border-radius: 14px; background: #ffffff; display: inline-block; }
          .qr-img { width: 195px; height: 195px; display: block; }
          
          /* Sequential 5 Rows Ordered Strictly as Requested */
          .details-list { text-align: right; margin-top: 6px; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; }
          .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12.5px; }
          .detail-row:last-child { border-bottom: none; }
          .detail-row.alt { background: #f8fafc; }
          .detail-label { color: #64748b; font-weight: 700; font-size: 11.5px; }
          .detail-value { font-weight: 900; color: #0f172a; text-align: left; }
          .detail-value.mono { font-family: monospace; letter-spacing: 0.5px; }
          .detail-value.highlight-unit { color: #0284c7; font-size: 13px; }
          .detail-value.highlight-asset { color: #4f46e5; }
          .detail-value.highlight-floor { color: #059669; font-size: 13px; }
          .detail-value.highlight-room { color: #d97706; font-size: 14px; }
          .detail-value.highlight-occ { color: #0f172a; font-size: 12px; max-width: 230px; text-align: left; }

          .footer-date { font-size: 9px; color: #94a3b8; margin-top: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="header-line1">${countryMinistryHeader}</div>
            <div class="header-line2">${companyName}</div>
            <div class="header-line3">${systemName}</div>
            <div class="header-tag">بطاقة رمز الوصول السريع (QR) للغرفة</div>
          </div>

          <!-- 1. رمز الـ QR -->
          <div class="qr-wrapper">
            <img class="qr-img" src="${qrDataUrl}" alt="Room QR Code" />
          </div>

          <!-- Structured Hierarchy Ordered Strictly as Requested:
               1. اسم المنشأة
               2. رمز المنشأة
               3. رمز الاصل
               4. رقم الطابق الذي فيه الغرفة
               5. رمز الغرفة
               6. الجهة الشاغلة -->
          <div class="details-list">
            <div class="detail-row alt">
              <span class="detail-label">اسم المنشأة:</span>
              <span class="detail-value highlight-unit">${unit.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">رمز المنشأة:</span>
              <span class="detail-value mono highlight-unit">${unit.code}</span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">رمز الأصل:</span>
              <span class="detail-value mono highlight-asset">${unit.fixedAssetCode || 'غير مسجل'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">رقم الطابق:</span>
              <span class="detail-value highlight-floor">${activeRoom.floor}</span>
            </div>
            <div class="detail-row alt">
              <span class="detail-label">رمز الغرفة:</span>
              <span class="detail-value mono highlight-room">${finalRoomCode}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">الجهة الشاغلة:</span>
              <span class="detail-value highlight-occ">${activeRoom.occupiedBy || unit.department || 'شاغر / غير محدد'}</span>
            </div>
          </div>

          <div class="footer-date">تاريخ الإصدار: ${getServerDateDDMMYYYY()}</div>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllRoomsBatch = async () => {
    if (!allRooms || allRooms.length === 0) {
      handlePrintSingleCard();
      return;
    }

    setIsGeneratingAll(true);

    try {
      const roomCardHtmls: string[] = [];

      for (let i = 0; i < allRooms.length; i++) {
        const r = allRooms[i];
        const rCode = getStandardRoomCode(unit.code, r, allRooms);

        const rPayload = `${appBaseUrl}/?type=room&unit=${encodeURIComponent(unit.code)}&room=${encodeURIComponent(rCode)}&roomName=${encodeURIComponent(r.name)}&floor=${encodeURIComponent(r.floor)}&fixedAssetCode=${encodeURIComponent(unit.fixedAssetCode || '')}&src=room_qr`;

        const rQrDataUrl = await QRCode.toDataURL(rPayload, {
          width: 320,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });

        roomCardHtmls.push(`
          <div class="page-break-container">
            <div class="card">
              <div class="header">
                <div class="header-line1">${countryMinistryHeader}</div>
                <div class="header-line2">${companyName}</div>
                <div class="header-line3">${systemName}</div>
                <div class="header-tag">بطاقة رمز الوصول السريع (QR) للغرفة</div>
              </div>

              <!-- 1. رمز الـ QR -->
              <div class="qr-wrapper">
                <img class="qr-img" src="${rQrDataUrl}" alt="Room QR Code" />
              </div>

              <!-- Structured Hierarchy Ordered Strictly as Requested:
                   1. اسم المنشأة
                   2. رمز المنشأة
                   3. رمز الاصل
                   4. رقم الطابق الذي فيه الغرفة
                   5. رمز الغرفة
                   6. الجهة الشاغلة -->
              <div class="details-list">
                <div class="detail-row alt">
                  <span class="detail-label">اسم المنشأة:</span>
                  <span class="detail-value highlight-unit">${unit.name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">رمز المنشأة:</span>
                  <span class="detail-value mono highlight-unit">${unit.code}</span>
                </div>
                <div class="detail-row alt">
                  <span class="detail-label">رمز الأصل:</span>
                  <span class="detail-value mono highlight-asset">${unit.fixedAssetCode || 'غير مسجل'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">رقم الطابق:</span>
                  <span class="detail-value highlight-floor">${r.floor}</span>
                </div>
                <div class="detail-row alt">
                  <span class="detail-label">رمز الغرفة:</span>
                  <span class="detail-value mono highlight-room">${rCode}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">الجهة الشاغلة:</span>
                  <span class="detail-value highlight-occ">${r.occupiedBy || unit.department || 'شاغر / غير محدد'}</span>
                </div>
              </div>

              <div class="footer-date">تاريخ الإصدار: ${getServerDateDDMMYYYY()}</div>
            </div>
          </div>
        `);
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setIsGeneratingAll(false);
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <title>طباعة بطاقات غرف المنشأة - ${unit.code}</title>
          <style>
            @page { size: A5 portrait; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: #fff; padding: 0; color: #0f172a; margin: 0; }
            .page-break-container { page-break-after: always; padding: 12px 0; display: flex; justify-content: center; }
            .page-break-container:last-child { page-break-after: auto; }
            .card { border: 2.5px solid #0f172a; border-radius: 16px; padding: 20px 18px; max-width: 440px; width: 100%; margin: 0 auto; background: #ffffff; text-align: center; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; text-align: center; }
            .header-line1 { font-size: 13px; font-weight: 900; color: #b45309; margin-bottom: 2px; }
            .header-line2 { font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
            .header-line3 { font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px; }
            .header-tag { display: inline-block; margin-top: 4px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 11px; font-weight: 900; padding: 3px 12px; border-radius: 20px; }
            
            .qr-wrapper { margin: 10px auto 14px; padding: 8px; border: 2px solid #cbd5e1; border-radius: 14px; background: #ffffff; display: inline-block; }
            .qr-img { width: 185px; height: 185px; display: block; }
            
            .details-list { text-align: right; margin-top: 6px; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; }
            .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            .detail-row:last-child { border-bottom: none; }
            .detail-row.alt { background: #f8fafc; }
            .detail-label { color: #64748b; font-weight: 700; font-size: 11px; }
            .detail-value { font-weight: 900; color: #0f172a; text-align: left; }
            .detail-value.mono { font-family: monospace; letter-spacing: 0.5px; }
            .detail-value.highlight-unit { color: #0284c7; font-size: 12.5px; }
            .detail-value.highlight-asset { color: #4f46e5; }
            .detail-value.highlight-floor { color: #059669; font-size: 12.5px; }
            .detail-value.highlight-room { color: #d97706; font-size: 13px; }
            .detail-value.highlight-occ { color: #0f172a; font-size: 11.5px; max-width: 220px; text-align: left; }

            .footer-date { font-size: 8.5px; color: #94a3b8; margin-top: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${roomCardHtmls.join('')}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error generating batch cards:', err);
      alert('حدث خطأ أثناء إعداد بطاقات الغرف للطباعة المجمعة');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const isOccupants = isOccupantsBasedRoom(activeRoom.type);

  return (
    <div
      id="modal-room-qr-card"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      <div
        className={`border rounded-3xl max-w-2xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden transition-all ${
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
                بطاقة التثبيت على باب الغرفة المعتمدة • تشمل رمز الوصول السريع لطلب الصيانة وتحديد الموقع
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

        {/* Modal Body: Scrollable Room Selection & Printable Card Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* If unit has multiple rooms, allow quick room selector tab */}
          {allRooms.length > 1 && (
            <div className="space-y-1.5">
              <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-1.5`}>
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>اختر الغرفة لعرض وطباعة بطاقتها:</span>
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

          {/* The Physical Card Preview */}
          <div
            className={`border-2 rounded-2xl p-5 shadow-xl mx-auto max-w-md transition-all ${
              isLight
                ? 'bg-gradient-to-b from-white to-slate-50 border-slate-800/80 text-slate-900'
                : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-slate-700 text-slate-100'
            }`}
          >
            {/* Ministry / Company / System Header ordered strictly as requested */}
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
                بطاقة تعريف وترقيم الغرفة (QR)
              </div>
            </div>

            {/* Center: QR Code Image (1. رمز الـ QR) */}
            <div className="my-4 flex flex-col items-center">
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-300 shadow-md inline-block">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Room QR" className="w-48 h-48 object-contain rounded-lg" />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                    جاري توليد الرمز...
                  </div>
                )}
              </div>
            </div>

            {/* Structured Hierarchy:
                1. اسم المنشأة
                2. رمز المنشأة
                3. رمز الاصل
                4. رقم الطابق الذي فيه الغرفة
                5. رمز الغرفة
                6. الجهة الشاغلة */}
            <div
              className={`rounded-2xl border overflow-hidden text-xs divide-y ${
                isLight
                  ? 'bg-white border-slate-200 divide-slate-100 text-slate-900 shadow-xs'
                  : 'bg-slate-950 border-slate-800 divide-slate-900 text-slate-100'
              }`}
            >
              <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
                <span className="text-slate-400 font-bold text-[11px]">اسم المنشأة:</span>
                <span className={`font-black text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{unit.name}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-slate-400 font-bold text-[11px]">رمز المنشأة:</span>
                <span className="font-mono font-black text-sky-500 tracking-wide text-xs">{unit.code}</span>
              </div>
              <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
                <span className="text-slate-400 font-bold text-[11px]">رمز الأصل:</span>
                <span className="font-mono font-bold text-indigo-400 text-xs">
                  {unit.fixedAssetCode || 'غير مسجل'}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-slate-400 font-bold text-[11px]">رقم الطابق:</span>
                <span className="font-black text-emerald-500 text-xs">{activeRoom.floor}</span>
              </div>
              <div className={`flex justify-between items-center px-4 py-2.5 ${isLight ? 'bg-slate-50/70' : 'bg-slate-900/40'}`}>
                <span className="text-slate-400 font-bold text-[11px]">رمز الغرفة:</span>
                <span className="font-mono font-black text-amber-500 text-sm tracking-wide">{finalRoomCode}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-slate-400 font-bold text-[11px]">الجهة الشاغلة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[200px]">
                  {activeRoom.occupiedBy || unit.department || 'شاغر / غير محدد'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div
          className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
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
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3.5 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>فتح طلب صيانة لهذه الغرفة</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadQr}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Download className="w-4 h-4 text-emerald-500" />
              <span>تحميل QR كصورة</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {allRooms.length > 1 && (
              <button
                type="button"
                onClick={handlePrintAllRoomsBatch}
                disabled={isGeneratingAll}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  isLight
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border-indigo-800'
                }`}
                title="طباعة كافة بطاقات غرف المنشأة دفعة واحدة"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                <span>{isGeneratingAll ? 'جاري تجهيز كافة البطاقات...' : `طباعة كافة الغرف (${toArabicDigits(allRooms.length)})`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintSingleCard}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة بطاقة الباب (A5)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
