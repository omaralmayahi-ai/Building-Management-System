import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  Search,
  ChevronDown,
  RotateCcw,
  ListTree,
  Folder,
  FolderOpen,
  Maximize2,
  Minimize2,
  ChevronsDown,
  ChevronsUp,
  Map as MapIcon,
  X,
} from 'lucide-react';
import { UnitAsset, ConditionGrade } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import { GIS_TILE_LAYERS, normalizeArabicSearchText } from '../config/mapsConfig';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Distinct configuration and SVG symbols for each unit type
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
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
  },
  caravan: {
    label: 'كرفان / منشأة متنقلة',
    gradient: 'linear-gradient(135deg, #0d9488, #0f766e)',
    borderColor: '#5eead4',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 10h2"/><path d="M13 10h2"/></svg>`,
  },
  warehouse: {
    label: 'مستودع / مخزن',
    gradient: 'linear-gradient(135deg, #d97706, #b45309)',
    borderColor: '#fde68a',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12v4H6z"/><path d="M6 14h12"/></svg>`,
  },
  equipment: {
    label: 'معدة / محطة خدمة',
    gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    borderColor: '#c4b5fd',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  },
  safety_system: {
    label: 'منظومة سلامة وإطفاء',
    gradient: 'linear-gradient(135deg, #dc2626, #991b1b)',
    borderColor: '#fca5a5',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
  storage_tank: {
    label: 'خزان نفطي / وقود',
    gradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    borderColor: '#7dd3fc',
    iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>`,
  },
};

const GRADE_BADGE_COLORS: Record<ConditionGrade, string> = {
  A: '#10b981',
  B: '#f59e0b',
  C: '#f97316',
  D: '#ef4444',
};

interface GISMapViewProps {
  units: UnitAsset[];
  theme?: 'dark' | 'light';
  onSelectUnit?: (unit: UnitAsset) => void;
  onOpenInspection?: (unitCode: string) => void;
  onOpenMaintenance?: (unitCode: string) => void;
  onOpen3D?: (unitCode: string) => void;
}

export const GISMapView: React.FC<GISMapViewProps> = ({
  units,
  theme = 'dark',
  onSelectUnit,
  onOpenInspection,
  onOpenMaintenance,
  onOpen3D,
}) => {
  const isLight = theme === 'light';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<any>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Search & Map State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [activeUnit, setActiveUnit] = useState<UnitAsset | null>(null);
  const [isTopUnitsExpanded, setIsTopUnitsExpanded] = useState<boolean>(true);
  const [isMapFullscreen, setIsMapFullscreen] = useState<boolean>(false);

  // Resize leaflet map smoothly when entering/exiting GIS fullscreen
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isMapFullscreen, isTopUnitsExpanded]);

  // Handle ESC key to exit GIS fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMapFullscreen) {
        setIsMapFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapFullscreen]);

  // Tree collapse tracking
  const [collapsedGovs, setCollapsedGovs] = useState<Set<string>>(new Set());
  const [collapsedFields, setCollapsedFields] = useState<Set<string>>(new Set());

  // Filtered units solely by Search Query (Name, Code, Governorate, Field, Occupant)
  const filteredUnits = useMemo(() => {
    if (!searchQuery.trim()) return units;
    const q = normalizeArabicSearchText(searchQuery);
    return units.filter((unit) => {
      const code = normalizeArabicSearchText(unit.code || '');
      const name = normalizeArabicSearchText(unit.name || '');
      const occupying = normalizeArabicSearchText(unit.occupyingEntity || '');
      const fld = normalizeArabicSearchText(unit.field || '');
      const gov = normalizeArabicSearchText(unit.governorate || '');
      return (
        code.includes(q) ||
        name.includes(q) ||
        occupying.includes(q) ||
        fld.includes(q) ||
        gov.includes(q)
      );
    });
  }, [units, searchQuery]);

  // Group units by Governorate -> Field for Tree Hierarchy
  const hierarchyTree = useMemo(() => {
    const map = new Map<string, Map<string, UnitAsset[]>>();

    filteredUnits.forEach((unit) => {
      const gov = unit.governorate || 'غير محدد';
      const fld = unit.field || 'غير محدد';

      if (!map.has(gov)) {
        map.set(gov, new Map());
      }
      const govMap = map.get(gov)!;
      if (!govMap.has(fld)) {
        govMap.set(fld, []);
      }
      govMap.get(fld)!.push(unit);
    });

    return map;
  }, [filteredUnits]);

  // All Gov names & Field keys for Expand / Collapse All
  const { allGovNames, allFieldKeys } = useMemo(() => {
    const govs: string[] = [];
    const fields: string[] = [];
    hierarchyTree.forEach((fieldMap, gov) => {
      govs.push(gov);
      fieldMap.forEach((_, fld) => {
        fields.push(`${gov}_${fld}`);
      });
    });
    return { allGovNames: govs, allFieldKeys: fields };
  }, [hierarchyTree]);

  // Expand All Action
  const handleExpandAll = () => {
    setCollapsedGovs(new Set());
    setCollapsedFields(new Set());
    setIsTopUnitsExpanded(true);
  };

  // Collapse All Action
  const handleCollapseAll = () => {
    setCollapsedGovs(new Set(allGovNames));
    setCollapsedFields(new Set(allFieldKeys));
  };

  // Toggle Gov Collapse
  const toggleGovCollapse = (gov: string) => {
    setCollapsedGovs((prev) => {
      const next = new Set(prev);
      if (next.has(gov)) next.delete(gov);
      else next.add(gov);
      return next;
    });
  };

  // Toggle Field Collapse
  const toggleFieldCollapse = (fieldKey: string) => {
    setCollapsedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey);
      else next.add(fieldKey);
      return next;
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [33.1025, 45.281],
      zoom: 8,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    mapInstanceRef.current = map;

    // Tile layer
    const activeTile = GIS_TILE_LAYERS[mapType];
    const tileLayer = L.tileLayer(activeTile.url, {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer on type change
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

  // Update Markers & Clusters when filteredUnits changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    const clusterGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 17,
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

    filteredUnits.forEach((unit, idx) => {
      const lat = unit.coordinates?.lat || 33.1025 + (idx % 10) * 0.005;
      const lng = unit.coordinates?.lng || 45.281 + (Math.floor(idx / 10)) * 0.005;
      const typeConfig = UNIT_TYPE_CONFIG[unit.type] || UNIT_TYPE_CONFIG.building;
      const gradeColor = GRADE_BADGE_COLORS[unit.conditionGrade] || '#f59e0b';
      const isSelected = activeUnit?.code === unit.code;

      const customMarkerIcon = L.divIcon({
        className: 'custom-gis-unit-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            filter: drop-shadow(0 6px 14px rgba(0,0,0,0.6));
            transition: transform 0.2s ease;
            ${isSelected ? 'transform: scale(1.18);' : ''}
          ">
            <!-- Pin Pointer Teardrop Body -->
            <div style="
              background: ${typeConfig.gradient};
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 2.5px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: inset 0 2px 4px rgba(255,255,255,0.3);
              position: relative;
            ">
              <!-- Inner Vector Icon (un-rotated to sit upright) -->
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

            <!-- Condition Grade Pill Badge on Top Corner -->
            <div style="
              position: absolute;
              top: -4px;
              right: -4px;
              background: ${gradeColor};
              color: #ffffff;
              border: 1.5px solid #ffffff;
              border-radius: 9999px;
              font-size: 9px;
              font-weight: 900;
              font-family: monospace;
              padding: 0px 4px;
              line-height: 14px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.4);
            ">
              ${unit.conditionGrade}
            </div>
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
      });

      const marker = L.marker([lat, lng], { icon: customMarkerIcon });

      marker.on('click', () => {
        setActiveUnit(unit);
        map.setView([lat, lng], 16, { animate: true });
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;
  }, [filteredUnits]);

  // Center map on a specific unit
  const handleFocusUnit = (unit: UnitAsset) => {
    setActiveUnit(unit);
    const lat = unit.coordinates?.lat || 33.1025;
    const lng = unit.coordinates?.lng || 45.281;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
    }
  };

  // Reset to Iraq Overview
  const handleResetView = () => {
    setSearchQuery('');
    setActiveUnit(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([33.1025, 45.281], 8, { animate: true });
    }
  };

  const gradeColors: Record<ConditionGrade, string> = {
    A: '#10b981',
    B: '#f59e0b',
    C: '#f97316',
    D: '#ef4444',
  };

  return (
    <div
      id="gis-map-view-root"
      className={`flex flex-col w-full overflow-hidden transition-all duration-300 ${
        isMapFullscreen
          ? 'fixed inset-0 z-[9999] h-screen w-screen rounded-none border-none'
          : `h-[calc(100vh-5rem)] min-h-[650px] rounded-2xl border ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-white shadow-xl'
            }`
      }`}
    >
      {/* Top Header & Command Bar */}
      <div
        className={`px-3 sm:px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-10 ${
          isLight ? 'bg-slate-50/95 border-slate-200' : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        {/* Title & Stats */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base leading-tight">
              خريطة الأصول ونظام الإسقاط الجغرافي GIS
            </h1>
            <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              شركة نفط الوسط • {toArabicDigits(filteredUnits.length)} وحدة مسقطة جغرافياً
            </p>
          </div>
        </div>

        {/* Search Field + Expand/Collapse Buttons + Map Type */}
        <div className="flex flex-wrap items-center gap-2 text-xs flex-1 justify-end">
          {/* Search Input for Unit Name or Code */}
          <div className="relative min-w-[220px] sm:min-w-[280px] max-w-md flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن الوحدات بواسطة الاسم أو الرمز..."
              className={`w-full text-xs rounded-xl py-1.5 pl-8 pr-8 border outline-none font-medium transition ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 shadow-sm'
                  : 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500'
              }`}
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2 text-slate-400 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Expand All Button */}
          <button
            type="button"
            onClick={handleExpandAll}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="توسيع كل المحافظات والحقول والوحدات"
          >
            <ChevronsDown className="w-3.5 h-3.5 text-amber-500" />
            <span>توسيع الكل</span>
          </button>

          {/* Collapse All Button */}
          <button
            type="button"
            onClick={handleCollapseAll}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="طي كل المحافظات والحقول"
          >
            <ChevronsUp className="w-3.5 h-3.5 text-amber-500" />
            <span>طي الكل</span>
          </button>

          {/* Toggle Top Units Section Visibility */}
          <button
            type="button"
            onClick={() => setIsTopUnitsExpanded((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
              isTopUnitsExpanded
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow'
                : isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title={isTopUnitsExpanded ? 'إخفاء لوحة شجرة الوحدات' : 'إظهار لوحة شجرة الوحدات'}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>شجرة الوحدات</span>
          </button>

          {/* Map Layer Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              أقمار صناعية
            </button>
            <button
              onClick={() => setMapType('streets')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                mapType === 'streets'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              طرق وتضاريس
            </button>
          </div>

          {/* Reset Overview */}
          <button
            onClick={handleResetView}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="إعادة تعيين الرؤية لكامل العراق"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Full-Screen Map Mode Toggle Button */}
          <button
            type="button"
            id="gis-fullscreen-toggle-btn"
            onClick={() => setIsMapFullscreen((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
              isMapFullscreen
                ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-400/30'
                : isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title={isMapFullscreen ? 'الخروج من وضع ملء الشاشة' : 'عرض الخارطة بملء الشاشة'}
          >
            {isMapFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>إنهاء ملء الشاشة</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
                <span>ملء الشاشة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Units Display Section (Moved to top instead of filters) */}
      {isTopUnitsExpanded && (
        <div
          className={`border-b transition-all duration-300 overflow-hidden shrink-0 z-10 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="max-h-44 sm:max-h-52 overflow-y-auto p-2.5 scrollbar-thin">
            {hierarchyTree.size === 0 ? (
              <div className={`text-center py-4 text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                لا توجد وحدات مطابقة للبحث
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {Array.from(hierarchyTree.entries()).map(([gov, fieldMap]: [string, Map<string, UnitAsset[]>]) => {
                  const isGovCollapsed = collapsedGovs.has(gov);
                  const fieldEntries = Array.from(fieldMap.entries()) as [string, UnitAsset[]][];
                  const totalGovUnits = fieldEntries.reduce(
                    (acc: number, [, list]) => acc + list.length,
                    0
                  );

                  return (
                    <div
                      key={gov}
                      className={`rounded-xl border transition overflow-hidden ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      {/* Governorate Header Header Button */}
                      <button
                        type="button"
                        onClick={() => toggleGovCollapse(gov)}
                        className={`w-full p-2 flex items-center justify-between text-right font-bold transition cursor-pointer text-xs ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-800'
                            : 'bg-slate-950 hover:bg-slate-800/80 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-amber-500" />
                          <span>محافظة {gov}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-amber-400'
                            }`}
                          >
                            {toArabicDigits(totalGovUnits)} وحدة
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                              isGovCollapsed ? '-rotate-90' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Fields & Units under this Governorate */}
                      {!isGovCollapsed && (
                        <div className="p-1.5 space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                          {fieldEntries.map(([fld, uList]) => {
                            const fieldKey = `${gov}_${fld}`;
                            const isFieldCollapsed = collapsedFields.has(fieldKey);

                            return (
                              <div
                                key={fieldKey}
                                className={`rounded-lg border p-1 ${
                                  isLight
                                    ? 'bg-white border-slate-200/80'
                                    : 'bg-slate-900/90 border-slate-800/60'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleFieldCollapse(fieldKey)}
                                  className={`w-full p-1 rounded flex items-center justify-between text-right font-semibold transition cursor-pointer text-[11px] ${
                                    isLight
                                      ? 'hover:bg-slate-100 text-slate-700'
                                      : 'hover:bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <FolderOpen className="w-3 h-3 text-amber-400" />
                                    <span className="font-bold">{fld}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9.5px] font-mono text-slate-400">
                                      ({toArabicDigits(uList.length)})
                                    </span>
                                    <ChevronDown
                                      className={`w-3 h-3 text-slate-400 transition-transform ${
                                        isFieldCollapsed ? '-rotate-90' : ''
                                      }`}
                                    />
                                  </div>
                                </button>

                                {/* Unit list inside field */}
                                {!isFieldCollapsed && (
                                  <div className="space-y-0.5 mt-1 pt-1 border-t border-slate-800/30">
                                    {uList.map((unit) => {
                                      const isSelected = activeUnit?.code === unit.code;
                                      const badgeColor = GRADE_BADGE_COLORS[unit.conditionGrade] || '#f59e0b';

                                      return (
                                        <button
                                          key={unit.code}
                                          type="button"
                                          onClick={() => handleFocusUnit(unit)}
                                          className={`w-full p-1 rounded-md text-right flex items-center justify-between transition cursor-pointer text-[10.5px] ${
                                            isSelected
                                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold'
                                              : isLight
                                              ? 'hover:bg-amber-50 text-slate-700'
                                              : 'hover:bg-slate-800/60 text-slate-300'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span
                                              className="w-2 h-2 rounded-full shrink-0"
                                              style={{ backgroundColor: badgeColor }}
                                            ></span>
                                            <span className="truncate">{unit.name}</span>
                                          </div>
                                          <span className="font-mono text-[9px] text-slate-400 shrink-0 mr-1">
                                            {toArabicDigits(unit.code)}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Map Workspace Area (Takes the whole remaining screen space) */}
      <div className="flex-1 relative w-full h-full bg-slate-950 overflow-hidden z-0">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* If in Fullscreen Mode, show dedicated Exit Fullscreen Button (Top-Right) */}
        {isMapFullscreen && (
          <div className="absolute top-4 right-4 z-[400]">
            <button
              type="button"
              onClick={() => setIsMapFullscreen(false)}
              className="px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-700 backdrop-blur-md shadow-2xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="الخروج من وضع ملء الشاشة (Esc)"
            >
              <Minimize2 className="w-4 h-4 text-amber-400" />
              <span>إنهاء ملء الشاشة</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
