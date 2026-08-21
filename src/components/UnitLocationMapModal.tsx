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
import { UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import { GIS_TILE_LAYERS } from '../config/mapsConfig';

// Fix Leaflet default icon paths
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
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [copiedCoords, setCopiedCoords] = useState(false);

  const lat = unit.coordinates?.lat || 32.6189;
  const lng = unit.coordinates?.lng || 45.7531;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const gradeColor =
    unit.conditionGrade === 'A'
      ? '#10b981'
      : unit.conditionGrade === 'B'
      ? '#f59e0b'
      : unit.conditionGrade === 'C'
      ? '#f97316'
      : '#ef4444';

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
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Tile Layer
    const activeTile = GIS_TILE_LAYERS[mapType];
    const tileLayer = L.tileLayer(activeTile.url, {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Custom Marker for Unit
    const customIcon = L.divIcon({
      className: 'custom-unit-marker',
      html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translate(-50%, -100%);
        ">
          <div style="
            background: ${gradeColor};
            color: #ffffff;
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 16px rgba(0,0,0,0.6);
            border: 3px solid #ffffff;
          ">
            <div style="
              transform: rotate(45deg);
              font-weight: 900;
              font-size: 13px;
              font-family: system-ui, sans-serif;
            ">
              ${unit.conditionGrade}
            </div>
          </div>
          <div style="
            width: 10px;
            height: 10px;
            background: rgba(0,0,0,0.3);
            border-radius: 50%;
            margin-top: 2px;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [40, 48],
      iconAnchor: [20, 48],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    // Popup with Unit info
    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; direction: rtl; text-align: right; min-width: 180px; padding: 4px;">
        <div style="font-size: 10px; color: #f59e0b; font-weight: bold; font-family: monospace;">${unit.code}</div>
        <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 2px;">${unit.name}</div>
        <div style="font-size: 11px; color: #475569;">${unit.field} - ${unit.governorate}</div>
      </div>
    `).openPopup();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, gradeColor]);

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
