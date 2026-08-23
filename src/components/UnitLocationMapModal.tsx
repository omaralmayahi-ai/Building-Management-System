import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
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
  Info,
} from 'lucide-react';
import { UnitAsset, ConditionGrade } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import { GIS_TILE_LAYERS } from '../config/mapsConfig';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const UNIT_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    gradient: string;
    borderColor: string;
    iconSvg: string;
  }
> = {
  building: {
    label: 'بناية / مقر إداري',
    gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    borderColor: '#93c5fd',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
  },
  caravan: {
    label: 'كرفان / منشأة متنقلة',
    gradient: 'linear-gradient(135deg, #0d9488, #0f766e)',
    borderColor: '#5eead4',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 10h2"/><path d="M13 10h2"/></svg>`,
  },
  warehouse: {
    label: 'مستودع / مخزن',
    gradient: 'linear-gradient(135deg, #d97706, #b45309)',
    borderColor: '#fde68a',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12v4H6z"/><path d="M6 14h12"/></svg>`,
  },
  equipment: {
    label: 'معدة / محطة خدمة',
    gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    borderColor: '#c4b5fd',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  },
  safety_system: {
    label: 'منظومة سلامة وإطفاء',
    gradient: 'linear-gradient(135deg, #dc2626, #991b1b)',
    borderColor: '#fca5a5',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
  storage_tank: {
    label: 'خزان نفطي / وقود',
    gradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    borderColor: '#7dd3fc',
    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`,
  },
};

const GRADE_BADGE_COLORS: Record<ConditionGrade, string> = {
  A: '#10b981',
  B: '#f59e0b',
  C: '#f97316',
  D: '#ef4444',
};

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
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [copiedCoords, setCopiedCoords] = useState(false);

  const lat = unit.coordinates?.lat || 32.6189;
  const lng = unit.coordinates?.lng || 45.7531;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const gradeColor = GRADE_BADGE_COLORS[unit.conditionGrade] || '#f59e0b';
  const typeConfig = UNIT_TYPE_CONFIG[unit.type] || UNIT_TYPE_CONFIG.building;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    mapInstanceRef.current = map;

    // Tile Layer
    const activeTile = GIS_TILE_LAYERS[mapType];
    const tileLayer = L.tileLayer(activeTile.url, {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Custom Marker for Unit with distinctive type icon and grade pill
    const customIcon = L.divIcon({
      className: 'custom-unit-modal-marker',
      html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          filter: drop-shadow(0 6px 16px rgba(0,0,0,0.6));
        ">
          <!-- Pin Teardrop Body -->
          <div style="
            background: ${typeConfig.gradient};
            width: 42px;
            height: 42px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 2px 5px rgba(255,255,255,0.3);
            position: relative;
          ">
            <!-- Inner Vector Icon (unrotated) -->
            <div style="
              transform: rotate(45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
            ">
              ${typeConfig.iconSvg}
            </div>
          </div>

          <!-- Condition Grade Mini Badge -->
          <div style="
            position: absolute;
            top: -4px;
            right: -4px;
            background: ${gradeColor};
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 900;
            font-family: monospace;
            padding: 1px 5px;
            line-height: 14px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          ">
            ${unit.conditionGrade}
          </div>
        </div>
      `,
      iconSize: [42, 48],
      iconAnchor: [21, 48],
      popupAnchor: [0, -48],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, gradeColor, typeConfig]);

  // Handle layer switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);
    const activeTile = GIS_TILE_LAYERS[mapType];
    const newTileLayer = L.tileLayer(activeTile.url, {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [mapType]);

  return (
    <div
      id="modal-unit-location-map"
      className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn ${
        isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'
      }`}
    >
      <div
        className={`border rounded-3xl max-w-3xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
            : 'bg-slate-900 border-slate-800 text-white'
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
                <span className="font-mono text-amber-500 font-bold text-xs">
                  {toArabicDigits(unit.code)}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: gradeColor }}
                >
                  Grade {unit.conditionGrade}
                </span>
              </div>
              <h2 className="font-bold text-base sm:text-lg leading-tight">{unit.name}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isLight
                ? 'hover:bg-slate-200 text-slate-500'
                : 'hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Type Bar & Details */}
        <div
          className={`px-4 sm:px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
            isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950/40 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400">الموقع الجغرافي:</span>
            <span className="font-bold">
              {unit.field} ({unit.governorate})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Map Layer Switch */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mapType === 'satellite'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                أقمار صناعية
              </button>
              <button
                type="button"
                onClick={() => setMapType('streets')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mapType === 'streets'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                شوارع
              </button>
            </div>
          </div>
        </div>

        {/* Leaflet Map Body */}
        <div className="relative flex-1 min-h-[350px] sm:min-h-[420px] bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full min-h-[350px] sm:min-h-[420px] z-0" />

          {/* Quick Coordinate Overlay */}
          <div className="absolute bottom-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-sm border border-slate-800 px-3 py-2 rounded-xl text-xs font-mono text-slate-200 flex items-center gap-2 shadow-2xl">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>
              {lat.toFixed(6)}° N, {lng.toFixed(6)}° E
            </span>
            <button
              onClick={handleCopyCoords}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition cursor-pointer mr-1"
              title="نسخ الإحداثيات"
            >
              {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>ملاحة بالـ GPS</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>

            {onOpen3D && (
              <button
                onClick={() => {
                  onClose();
                  onOpen3D(unit.code);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>عرض ثلاثي الأبعاد 3D</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenInspection && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInspection(unit.code);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>طلب كشف</span>
              </button>
            )}

            {onOpenMaintenance && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMaintenance(unit.code);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>طلب صيانة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
