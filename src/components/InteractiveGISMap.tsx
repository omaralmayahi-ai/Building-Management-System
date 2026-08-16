import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UnitAsset, SiteHierarchyItem } from '../types';
import { Layers, Maximize2, MapPin, Eye, Compass, ShieldCheck } from 'lucide-react';

// Fix Leaflet default icon path issues in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveGISMapProps {
  site: SiteHierarchyItem;
  units: UnitAsset[];
  onSelectUnit: (code: string) => void;
  theme?: 'dark' | 'light';
}

export const InteractiveGISMap: React.FC<InteractiveGISMapProps> = ({
  site,
  units,
  onSelectUnit,
  theme = 'dark',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedUnitOnMap, setSelectedUnitOnMap] = useState<UnitAsset | null>(null);

  // Coordinate defaults for oilfield sites
  const centerLat = site?.coordinates?.lat || 32.6189;
  const centerLng = site?.coordinates?.lng || 45.7531;

  // Tile Layer URLs (Satellite includes region, governorate & road names overlay)
  const tileLayers = {
    satellite: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '',
    },
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '',
    },
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [33.2232, 43.6793],
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Add Tile Layer
    const activeTileConfig = tileLayers[mapType];
    const tileLayer = L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      maxZoom: 19,
    });
    tileLayer.addTo(map);

    // Track mouse coordinates
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    });

    // Create LayerGroup for markers
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [site.id]); // re-init when site changes

  // Update Tile Layer when mapType changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const activeTileConfig = tileLayers[mapType];
    L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [mapType]);

  // Update Markers and Polygons on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // Default zoom out view on Iraq map
    map.setView([33.2232, 43.6793], 6, { animate: true });

    // Draw Site Boundary Polygon (Simulated GeoJSON footprint around site center)
    const polyCoords: [number, number][] = [
      [centerLat + 0.0025, centerLng - 0.003],
      [centerLat + 0.003, centerLng + 0.0035],
      [centerLat - 0.0025, centerLng + 0.004],
      [centerLat - 0.003, centerLng - 0.0025],
    ];

    L.polygon(polyCoords, {
      color: '#f59e0b',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#f59e0b',
      fillOpacity: 0.1,
    })
      .bindTooltip(`حدود موقع ${site.nameAr} - شركة نفط الوسط`, { permanent: false, direction: 'top' })
      .addTo(layerGroup);

    // Map units onto map with custom color-coded HTML SVG Markers
    units.forEach((unit, index) => {
      // Offset coordinates slightly around center if exact matches
      const latOffset = (index % 4 - 1.5) * 0.0008 + (Math.sin(index) * 0.0003);
      const lngOffset = (Math.floor(index / 4) - 1) * 0.001 + (Math.cos(index) * 0.0003);
      const unitLat = unit.coordinates?.lat || centerLat + latOffset;
      const unitLng = unit.coordinates?.lng || centerLng + lngOffset;

      // Color based on Condition Grade
      const gradeColors: Record<string, string> = {
        A: '#10b981', // Emerald
        B: '#f59e0b', // Amber
        C: '#f97316', // Orange
        D: '#ef4444', // Red
      };
      const markerColor = gradeColors[unit.conditionGrade] || '#f59e0b';

      const customIcon = L.divIcon({
        className: 'custom-gis-marker',
        html: `
          <div style="
            background-color: ${markerColor};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0f172a;
            font-weight: 900;
            font-size: 11px;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            ${unit.conditionGrade}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([unitLat, unitLng], { icon: customIcon }).addTo(layerGroup);

      // Popup Content
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; direction: rtl; text-align: right; min-width: 200px; padding: 4px;">
          <div style="font-size: 10px; color: #f59e0b; font-weight: bold; font-family: monospace;">${unit.code}</div>
          <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">${unit.name}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
            الحقل: <strong>${unit.field}</strong> | المساحة: <strong>${unit.totalAreaSqM} م²</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="font-size: 11px; color: #64748b;">درجة السلامة:</span>
            <span style="font-size: 12px; font-weight: bold; color: ${markerColor};">Grade ${unit.conditionGrade}</span>
          </div>
          <button
            id="popup-btn-${unit.code}"
            style="
              margin-top: 8px;
              width: 100%;
              background-color: #f59e0b;
              color: #0f172a;
              font-weight: bold;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 11px;
            "
          >
            عرض ثلاثي الأبعاد 3D ➔
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        setSelectedUnitOnMap(unit);
        setTimeout(() => {
          const btn = document.getElementById(`popup-btn-${unit.code}`);
          if (btn) {
            btn.onclick = () => onSelectUnit(unit.code);
          }
        }, 50);
      });
    });
  }, [site.id, units]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-bold text-slate-100 text-sm">
              الخريطة التفاعلية ونظام الإسقاط الجغرافي GIS
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              موقع {site.nameAr} - الإحداثيات: {centerLat}° N, {centerLng}° E
            </span>
          </div>
        </div>

        {/* Map Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([33.2232, 43.6793], 6, { animate: true });
              }
            }}
            className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>خارطة العراق (Zoom Out)</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              أقمار صناعية
            </button>
            <button
              onClick={() => setMapType('streets')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                mapType === 'streets'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              طرق وشوارع
            </button>
          </div>
        </div>
      </div>

      {/* Leaflet Map Canvas Container */}
      <div className="relative w-full h-[380px] rounded-xl overflow-hidden border border-slate-800 shadow-inner z-0">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Live GPS Cursor Bar Overlay */}
        <div className="absolute bottom-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300 flex items-center gap-2 shadow-lg">
          <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>
            {cursorCoords
              ? `GPS: ${cursorCoords.lat}° N, ${cursorCoords.lng}° E`
              : `المركز: ${centerLat}° N, ${centerLng}° E`}
          </span>
        </div>

        {/* Map Legend */}
        <div className="absolute top-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-sm border border-slate-800 p-2.5 rounded-xl text-[10px] space-y-1 shadow-xl">
          <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1">دليل السلامة الميداني</div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Grade A: ممتازة</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Grade B: جيدة (صيانة روتينية)</span>
          </div>
          <div className="flex items-center gap-1.5 text-orange-400">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Grade C: حرجة (تدخل خلال 7 أيام)</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Grade D: إخلاء فوري</span>
          </div>
        </div>
      </div>
    </div>
  );
};
