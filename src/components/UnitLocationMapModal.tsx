import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X,
  MapPin,
  Compass,
  ExternalLink,
  Navigation,
  Copy,
  Check,
  Building,
  Layers,
  Wrench,
  ClipboardCheck,
  Box,
  Eye,
} from 'lucide-react';
import { UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';

// Fix Leaflet marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface UnitLocationMapModalProps {
  unit: UnitAsset;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onOpenInspection?: (unitCode: string) => void;
  onOpenMaintenance?: (unitCode: string) => void;
  onOpen3D?: (unitCode: string) => void;
}

export const UnitLocationMapModal: React.FC<UnitLocationMapModalProps> = ({
  unit,
  theme = 'dark',
  onClose,
  onOpenInspection,
  onOpenMaintenance,
  onOpen3D,
}) => {
  const isLight = theme === 'light';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [copiedCoords, setCopiedCoords] = useState(false);

  const lat = unit.coordinates?.lat || 32.6189;
  const lng = unit.coordinates?.lng || 45.7531;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const tileLayers = {
    satellite: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      maxZoom: 19,
    },
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
    },
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    const activeTileConfig = tileLayers[mapType];
    L.tileLayer(activeTileConfig.url, {
      maxZoom: activeTileConfig.maxZoom,
    }).addTo(map);

    // Custom Marker for this unit
    const gradeColor =
      unit.conditionGrade === 'A'
        ? '#10b981'
        : unit.conditionGrade === 'B'
        ? '#f59e0b'
        : unit.conditionGrade === 'C'
        ? '#f97316'
        : '#ef4444';

    const customIcon = L.divIcon({
      className: 'custom-unit-marker',
      html: `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: ${gradeColor};
            opacity: 0.35;
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            background-color: #0f172a;
            border: 3px solid ${gradeColor};
            color: #ffffff;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            box-shadow: 0 6px 16px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 13px;
            font-family: monospace;
            z-index: 10;
          ">
            ${unit.conditionGrade}
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    // Popup with Unit Details
    const popupHtml = `
      <div style="direction: rtl; text-align: right; font-family: system-ui, sans-serif; min-width: 220px; padding: 4px;">
        <div style="font-size: 10px; color: #f59e0b; font-weight: bold; font-family: monospace;">${unit.code}</div>
        <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${unit.name}</div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
          ${unit.governorate} • ${unit.field}
        </div>
        <div style="background: #f1f5f9; padding: 6px; border-radius: 6px; font-size: 11px; color: #334155; margin-bottom: 6px;">
          الإحداثيات: <strong>${lat.toFixed(5)}°, ${lng.toFixed(5)}°</strong>
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml).openPopup();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, mapType, unit.code]);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  return (
    <div
      id="modal-unit-location-map"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      <div
        className={`border rounded-3xl max-w-3xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden transition-all ${
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
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-amber-500">
                  موقع المنشأة على الخريطة ونظام GPS
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
                  {toArabicDigits(unit.code)}
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {unit.name} • {unit.governorate} ({unit.field})
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

        {/* Map Body & Controls */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-800">
            {/* GPS Coords Badge */}
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-xs">
                <span className="text-slate-400 font-medium">الإحداثيات الجغرافية: </span>
                <span className="font-mono font-black text-amber-400">
                  {toArabicDigits(lat.toFixed(5))}°, {toArabicDigits(lng.toFixed(5))}°
                </span>
              </div>
              <button
                onClick={handleCopyCoords}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition cursor-pointer"
                title="نسخ الإحداثيات"
              >
                {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{copiedCoords ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>

            {/* Map Type Switcher & Google Maps Navigation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                    mapType === 'satellite' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  أقمار صناعية
                </button>
                <button
                  onClick={() => setMapType('streets')}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                    mapType === 'streets' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  طرق وشوارع
                </button>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>الاتجاهات في Google Maps</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div className="relative w-full h-[360px] sm:h-[400px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner z-0">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
          </div>

          {/* Unit Summary Metadata Row */}
          <div
            className={`p-3.5 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs transition-colors ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'
            }`}
          >
            <div>
              <span className="block text-[10px] text-slate-500 font-bold">نوع المنشأة:</span>
              <span className="font-extrabold text-slate-200">
                {unit.type === 'caravan' ? 'كرفان موقعي' : 'مبنى ثابت'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold">تقييم السلامة:</span>
              <span className="font-extrabold text-amber-500">Grade {unit.conditionGrade}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold">المساحة الإجمالية:</span>
              <span className="font-extrabold text-slate-200">{toArabicDigits(unit.totalAreaSqM)} م²</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-bold">الجهة الشاغلة:</span>
              <span className="font-extrabold text-slate-200 truncate block">{unit.department || 'غير محدد'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`p-4 border-t flex flex-wrap items-center justify-between gap-2.5 shrink-0 transition-colors ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {onOpenInspection && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInspection(unit.code);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>إجراء الكشف الفني</span>
              </button>
            )}

            {onOpenMaintenance && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMaintenance(unit.code);
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <Wrench className="w-4 h-4" />
                <span>طلب صيانة</span>
              </button>
            )}

            {onOpen3D && (
              <button
                onClick={() => {
                  onClose();
                  onOpen3D(unit.code);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <Box className="w-4 h-4 text-amber-400" />
                <span>عرض ثلاثي الأبعاد 3D</span>
              </button>
            )}
          </div>

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
        </div>
      </div>
    </div>
  );
};
