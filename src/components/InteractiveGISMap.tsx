import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { UnitAsset, SiteHierarchyItem, ConditionGrade } from '../types';
import { MapPin, AlertTriangle } from 'lucide-react';

// Fix Leaflet default icon path issues in Vite using locally bundled assets
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
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
  },
  caravan: {
    label: 'كرفان / منشأة متنقلة',
    gradient: 'linear-gradient(135deg, #0d9488, #0f766e)',
    borderColor: '#5eead4',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 10h2"/><path d="M13 10h2"/></svg>`,
  },
  warehouse: {
    label: 'مستودع / مخزن',
    gradient: 'linear-gradient(135deg, #d97706, #b45309)',
    borderColor: '#fde68a',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12v4H6z"/><path d="M6 14h12"/></svg>`,
  },
  equipment: {
    label: 'معدة / محطة خدمة',
    gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    borderColor: '#c4b5fd',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  },
  safety_system: {
    label: 'منظومة سلامة وإطفاء',
    gradient: 'linear-gradient(135deg, #dc2626, #991b1b)',
    borderColor: '#fca5a5',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
  storage_tank: {
    label: 'خزان نفطي / وقود',
    gradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    borderColor: '#7dd3fc',
    iconSvg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`,
  },
};

const GRADE_BADGE_COLORS: Record<ConditionGrade, string> = {
  A: '#10b981',
  B: '#f59e0b',
  C: '#f97316',
  D: '#ef4444',
};

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
  const [, setSelectedUnitOnMap] = useState<UnitAsset | null>(null);
  const [tileError, setTileError] = useState<boolean>(false);

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
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    mapInstanceRef.current = map;

    // Add Tile Layer with error monitoring
    const activeTileConfig = tileLayers[mapType];
    const tileLayer = L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      maxZoom: 19,
    });
    tileLayer.on('tileerror', () => {
      setTileError(true);
    });
    tileLayer.on('tileload', () => {
      setTileError(false);
    });
    tileLayer.addTo(map);

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
    const tileLayer = L.tileLayer(activeTileConfig.url, {
      attribution: activeTileConfig.attribution,
      maxZoom: 19,
    });
    tileLayer.on('tileerror', () => {
      setTileError(true);
    });
    tileLayer.on('tileload', () => {
      setTileError(false);
    });
    tileLayer.addTo(map);
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
    }).addTo(layerGroup);

    // Create Marker Cluster Group for high-density unit clustering
    const clusterGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 18,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `
            <div style="
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: #0f172a;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 12px;
              font-family: system-ui, sans-serif;
              cursor: pointer;
            ">
              ${count}
            </div>
          `,
          className: 'custom-gis-cluster',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      },
    });

    // Map units onto map with custom color-coded HTML SVG Markers
    units.forEach((unit, index) => {
      // Offset coordinates slightly around center if exact matches
      const latOffset = (index % 4 - 1.5) * 0.0008 + (Math.sin(index) * 0.0003);
      const lngOffset = (Math.floor(index / 4) - 1) * 0.001 + (Math.cos(index) * 0.0003);
      const unitLat = unit.coordinates?.lat || centerLat + latOffset;
      const unitLng = unit.coordinates?.lng || centerLng + lngOffset;

      const typeConfig = UNIT_TYPE_CONFIG[unit.type] || UNIT_TYPE_CONFIG.building;
      const gradeColor = GRADE_BADGE_COLORS[unit.conditionGrade] || '#f59e0b';

      const customIcon = L.divIcon({
        className: 'custom-gis-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            filter: drop-shadow(0 6px 14px rgba(0,0,0,0.6));
          ">
            <div style="
              background: ${typeConfig.gradient};
              width: 34px;
              height: 34px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2.5px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: inset 0 2px 4px rgba(255,255,255,0.3);
              position: relative;
            ">
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

            <div style="
              position: absolute;
              top: -3px;
              right: -3px;
              background: ${gradeColor};
              color: #ffffff;
              border: 1.5px solid #ffffff;
              border-radius: 9999px;
              font-size: 8.5px;
              font-weight: 900;
              font-family: monospace;
              padding: 0px 4px;
              line-height: 13px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.4);
            ">
              ${unit.conditionGrade}
            </div>
          </div>
        `,
        iconSize: [34, 40],
        iconAnchor: [17, 40],
      });

      const marker = L.marker([unitLat, unitLng], { icon: customIcon });

      marker.on('click', () => {
        setSelectedUnitOnMap(unit);
        onSelectUnit(unit.code);
      });

      clusterGroup.addLayer(marker);
    });

    layerGroup.addLayer(clusterGroup);
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

        {/* Tile Error / Offline Server Notice */}
        {tileError && (
          <div className="absolute top-3 left-3 z-[400] max-w-xs bg-slate-950/95 border border-amber-500/50 backdrop-blur-md text-amber-300 p-2.5 rounded-xl text-[11px] shadow-2xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-slate-100">تنبيه اتصال طبقات الخريطة</div>
              <div className="text-[10px] text-slate-300 leading-tight">
                تعذّر تحميل بلاطات الخريطة — تحقق من الاتصال بالشبكة الداخلية أو أضف خادم بلاطات محلي (TileServer GL / Offline Map Server).
              </div>
            </div>
          </div>
        )}

        {/* Map Legend */}
        <div className="absolute top-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-sm border border-slate-800 p-2.5 rounded-xl text-[10px] space-y-1 shadow-xl">
          <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1">دليل أنواع وأصناف الوحدات</div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>بنايات ومقرات إدارية</span>
          </div>
          <div className="flex items-center gap-1.5 text-teal-400">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <span>كرفانات ومنشآت متنقلة</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>مستودعات ومخازن</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>معدات ومحطات خدمة</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>منظومات سلامة وإطفاء</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span>خزانات نفط ووقود</span>
          </div>
        </div>
      </div>
    </div>
  );
};
