import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  ChevronUp,
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
  Building2,
  Compass,
  Sparkles,
  Layers,
  Globe,
  Copy,
  Check,
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

const GRADE_BADGE_CONFIG: Record<
  ConditionGrade,
  { label: string; bg: string; color: string }
> = {
  A: { label: 'ممتاز (A)', bg: '#10b981', color: '#ffffff' },
  B: { label: 'جيد (B)', bg: '#f59e0b', color: '#ffffff' },
  C: { label: 'متوسط (C)', bg: '#f97316', color: '#ffffff' },
  D: { label: 'حرج (D)', bg: '#ef4444', color: '#ffffff' },
};

/**
 * Builds HTML for the comprehensive Unit Identity Card (البطاقة التعريفية للوحدة)
 * displayed inside the Leaflet pin popup/tooltip.
 */
function buildUnitIdentityCardHtml(unit: UnitAsset, lat: number, lng: number): string {
  const typeConfig = UNIT_TYPE_CONFIG[unit.type] || UNIT_TYPE_CONFIG.building;
  const gradeConfig = GRADE_BADGE_CONFIG[unit.conditionGrade] || GRADE_BADGE_CONFIG.B;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const assetCode = unit.fixedAssetCode ? unit.fixedAssetCode : 'غير مسجل';
  const yearStr = unit.constructionYear ? toArabicDigits(unit.constructionYear) : 'غير مسجل';
  const areaStr = unit.totalAreaSqM ? `${toArabicDigits(unit.totalAreaSqM)} م²` : 'غير محدد';
  const floorsStr = `${toArabicDigits(unit.floorsCount || 1)} طابق`;
  const roomsCount = unit.rooms?.length || 0;
  const occupant = (unit as any).occupyingEntity || unit.department || 'غير محدد';
  const address = unit.sectorAddress || 'الموقع الرئيسي للحقل';

  return `
    <div class="gis-unit-id-card" style="font-family: 'Cairo', system-ui, -apple-system, sans-serif; direction: rtl; text-align: right; width: min(290px, 86vw); max-width: 290px; padding: 9px; background: #0f172a; color: #f8fafc; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
      <!-- Header: Type Badge & Condition Grade -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 5px;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; background: #1e293b;">
            ${typeConfig.iconSvg}
          </span>
          <span style="font-size: 10.5px; font-weight: 700; color: #cbd5e1;">${typeConfig.label}</span>
        </div>
        <span style="background: ${gradeConfig.bg}; color: ${gradeConfig.color}; font-size: 9.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 9999px;">
          ${gradeConfig.label}
        </span>
      </div>

      <!-- Main Unit Name -->
      <h3 style="font-size: 12px; font-weight: 900; color: #ffffff; margin: 0 0 6px 0; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${unit.name}
      </h3>

      <!-- Identifier Codes Grid: Unit Code & Fixed Asset Code -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 6px;">
        <div style="background: #1e293b; padding: 4px 6px; border-radius: 6px; border: 1px solid #334155;">
          <div style="font-size: 8.5px; color: #94a3b8; font-weight: 600;">رمز المنشأة</div>
          <div style="font-size: 10px; font-weight: 800; color: #f59e0b; font-family: monospace; direction: ltr; text-align: right;">${unit.code}</div>
        </div>
        <div style="background: #1e293b; padding: 4px 6px; border-radius: 6px; border: 1px solid #334155;">
          <div style="font-size: 8.5px; color: #94a3b8; font-weight: 600;">رمز الأصل</div>
          <div style="font-size: 10px; font-weight: 800; color: #38bdf8; font-family: monospace; direction: ltr; text-align: right;">${assetCode}</div>
        </div>
      </div>

      <!-- Location & Administrative Specs Grid -->
      <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(51, 65, 85, 0.8); border-radius: 7px; padding: 6px; font-size: 10px; margin-bottom: 7px; display: flex; flex-direction: column; gap: 3.5px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94a3b8;">الموقع:</span>
          <span style="font-weight: 700; color: #e2e8f0; max-width: 170px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${unit.governorate} • ${unit.field}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94a3b8;">الجهة الشاغلة:</span>
          <span style="font-weight: 700; color: #e2e8f0; max-width: 170px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${occupant}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94a3b8;">المساحة والطوابق:</span>
          <span style="font-weight: 700; color: #e2e8f0;">${areaStr} • ${floorsStr}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%; padding: 5px 8px; background: #059669; color: #ffffff; border-radius: 7px; font-size: 10.5px; font-weight: 800; text-decoration: none;">
          <span>🧭 فتح الاتجاهات في Google Maps</span>
        </a>
      </div>
    </div>
  `;
}

interface GISMapViewProps {
  units: UnitAsset[];
  theme?: 'dark' | 'light';
  onSelectUnit?: (unit: UnitAsset) => void;
  onOpenInspection?: (unitCode: string) => void;
  onOpenMaintenance?: (unitCode: string) => void;
  onOpen3D?: (unitCode: string) => void;
}

const IRAQ_BOUNDS: L.LatLngBoundsExpression = [
  [29.0, 38.6],
  [37.4, 48.7],
];

export const GISMapView: React.FC<GISMapViewProps> = ({
  units,
  theme = 'dark',
  onSelectUnit,
  onOpenInspection,
  onOpenMaintenance,
  onOpen3D,
}) => {
  const isLight = theme === 'light';

  const rootContainerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<any>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Search & Map State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [activeUnit, setActiveUnit] = useState<UnitAsset | null>(null);
  const activeUnitRef = useRef<UnitAsset | null>(null);
  const [showCardDetails, setShowCardDetails] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState<boolean>(false);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    activeUnitRef.current = activeUnit;
  }, [activeUnit]);

  const handleCopyCoords = useCallback((lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  }, []);

  // Dedicated Selection Modal State
  const [isPickerModalOpen, setIsPickerModalOpen] = useState<boolean>(false);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [collapsedGovs, setCollapsedGovs] = useState<Set<string>>(new Set());
  const [collapsedFields, setCollapsedFields] = useState<Set<string>>(new Set());

  // Search Container Ref to handle clicks outside dropdown
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Toggle Fullscreen strictly within the app viewport so it NEVER exits or disrupts system-level fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsMapFullscreen((prev) => !prev);
  }, []);

  // Lock background scrolling when map is in fullscreen
  useEffect(() => {
    if (isMapFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMapFullscreen]);

  // Setup Global actions for Leaflet popup HTML buttons
  useEffect(() => {
    (window as any).__gisOpenUnit = (code: string) => {
      const u = units.find((x) => x.code === code);
      if (u && onSelectUnit) {
        onSelectUnit(u);
      }
    };
    (window as any).__gisOpen3D = (code: string) => {
      if (onOpen3D) {
        onOpen3D(code);
      }
    };
    return () => {
      delete (window as any).__gisOpenUnit;
      delete (window as any).__gisOpen3D;
    };
  }, [units, onSelectUnit, onOpen3D]);

  // Handle click outside search dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resize leaflet map smoothly when entering/exiting GIS fullscreen or toggling toolbar
  useEffect(() => {
    const resizeMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ pan: false });
      }
    };

    resizeMap();
    const t1 = setTimeout(resizeMap, 50);
    const t2 = setTimeout(resizeMap, 150);
    const t3 = setTimeout(resizeMap, 300);
    const t4 = setTimeout(resizeMap, 600);

    window.addEventListener('resize', resizeMap);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', resizeMap);
    };
  }, [isMapFullscreen, isToolbarCollapsed]);

  // Handle ESC key to exit GIS fullscreen mode or close picker modal without exiting system fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPickerModalOpen) {
          setIsPickerModalOpen(false);
          e.stopPropagation();
        } else if (isMapFullscreen) {
          setIsMapFullscreen(false);
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isMapFullscreen, isPickerModalOpen]);

  // Fast matching for search box: matches Name, Code, or Fixed Asset Code
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = normalizeArabicSearchText(searchQuery);
    return units.filter((unit) => {
      const code = normalizeArabicSearchText(unit.code || '');
      const name = normalizeArabicSearchText(unit.name || '');
      const assetCode = normalizeArabicSearchText(unit.fixedAssetCode || '');
      const fld = normalizeArabicSearchText(unit.field || '');
      const gov = normalizeArabicSearchText(unit.governorate || '');
      return (
        name.includes(q) ||
        code.includes(q) ||
        assetCode.includes(q) ||
        fld.includes(q) ||
        gov.includes(q)
      );
    });
  }, [units, searchQuery]);

  // Hierarchy Tree for the Selection Modal
  const modalFilteredUnits = useMemo(() => {
    if (!modalSearchQuery.trim()) return units;
    const q = normalizeArabicSearchText(modalSearchQuery);
    return units.filter((unit) => {
      const code = normalizeArabicSearchText(unit.code || '');
      const name = normalizeArabicSearchText(unit.name || '');
      const assetCode = normalizeArabicSearchText(unit.fixedAssetCode || '');
      const occupant = normalizeArabicSearchText((unit as any).occupyingEntity || unit.department || '');
      const fld = normalizeArabicSearchText(unit.field || '');
      const gov = normalizeArabicSearchText(unit.governorate || '');
      return (
        name.includes(q) ||
        code.includes(q) ||
        assetCode.includes(q) ||
        occupant.includes(q) ||
        fld.includes(q) ||
        gov.includes(q)
      );
    });
  }, [units, modalSearchQuery]);

  const hierarchyTree = useMemo(() => {
    const map = new Map<string, Map<string, UnitAsset[]>>();

    modalFilteredUnits.forEach((unit) => {
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
  }, [modalFilteredUnits]);

  // All Gov names & Field keys for Expand / Collapse All inside Modal
  const { allGovNames, allFieldKeys, totalFieldsCount } = useMemo(() => {
    const govs: string[] = [];
    const fields: string[] = [];
    hierarchyTree.forEach((fieldMap, gov) => {
      govs.push(gov);
      fieldMap.forEach((_, fld) => {
        fields.push(`${gov}_${fld}`);
      });
    });
    return { allGovNames: govs, allFieldKeys: fields, totalFieldsCount: fields.length };
  }, [hierarchyTree]);

  // Expand All inside Modal
  const handleModalExpandAll = () => {
    setCollapsedGovs(new Set());
    setCollapsedFields(new Set());
  };

  // Collapse All inside Modal
  const handleModalCollapseAll = () => {
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
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    mapInstanceRef.current = map;
    map.fitBounds(IRAQ_BOUNDS, { padding: [16, 16], maxZoom: 6 });

    // Tile layer
    const activeTile = GIS_TILE_LAYERS[mapType];
    const tileLayer = L.tileLayer(activeTile.url, {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Refresh bounds after container renders in DOM
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.fitBounds(IRAQ_BOUNDS, { padding: [16, 16], maxZoom: 6 });
      }
    }, 150);

    return () => {
      clearTimeout(timer);
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

  // Update Markers & Clusters for all units
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    const newMarkersMap = new Map<string, L.Marker>();

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

    units.forEach((unit, idx) => {
      const lat = unit.coordinates?.lat || 33.1025 + (idx % 10) * 0.005;
      const lng = unit.coordinates?.lng || 45.281 + Math.floor(idx / 10) * 0.005;
      const typeConfig = UNIT_TYPE_CONFIG[unit.type] || UNIT_TYPE_CONFIG.building;
      const gradeColor = GRADE_BADGE_CONFIG[unit.conditionGrade]?.bg || '#f59e0b';

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
        popupAnchor: [0, -42],
      });

      const marker = L.marker([lat, lng], { icon: customMarkerIcon });

      // Desktop only tooltip to avoid mobile touch tremor
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      if (!isTouch) {
        marker.bindTooltip(unit.name, {
          direction: 'top',
          offset: [0, -36],
          className: 'custom-gis-tooltip',
        });
      }

      // When clicking the pin: descend/zoom down smoothly and activate the stable card
      marker.on('click', () => {
        setActiveUnit((prev) => (prev?.code === unit.code ? prev : unit));
        const currentZoom = map.getZoom();
        const center = map.getCenter();
        const dist = Math.hypot(center.lat - lat, center.lng - lng);

        // Fly to marker if not already zoomed in on it, avoiding unnecessary shaking on repeated clicks
        if (currentZoom < 16 || dist > 0.003) {
          map.flyTo([lat, lng], 17, { duration: 0.85 });
        }
      });

      clusterGroup.addLayer(marker);
      newMarkersMap.set(unit.code, marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;
    markersMapRef.current = newMarkersMap;
  }, [units]);

  /**
   * Action: Select Unit (from Search or Modal)
   * - Sets unit as active
   * - Performs smooth zoom-in on it
   * - Displays the stable in-map card
   * - Closes search dropdown & modal
   */
  const handleSelectUnit = useCallback((unit: UnitAsset) => {
    setActiveUnit((prev) => (prev?.code === unit.code ? prev : unit));
    setSearchQuery(unit.name);
    setIsSearchDropdownOpen(false);
    setIsPickerModalOpen(false);

    const lat = unit.coordinates?.lat || 33.1025;
    const lng = unit.coordinates?.lng || 45.281;

    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      map.flyTo([lat, lng], 17, { duration: 1.0 });
    }
  }, []);

  /**
   * Action: Reset / Clear (زر التفريغ أو الإعادة)
   * - Clears search query and active selection
   * - Zooms out completely to display the entire map of Iraq
   */
  const handleResetView = useCallback(() => {
    setSearchQuery('');
    setIsSearchDropdownOpen(false);
    setActiveUnit(null);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.closePopup();
      // Zoom out to cover the whole territory of Iraq cleanly
      mapInstanceRef.current.fitBounds(IRAQ_BOUNDS, {
        padding: [16, 16],
        maxZoom: 6,
        animate: true,
        duration: 0.8,
      } as any);
    }
  }, []);

  return (
    <div
      id="gis-map-view-root"
      ref={rootContainerRef}
      className={`flex flex-col w-full overflow-hidden transition-all duration-200 ${
        isMapFullscreen
          ? '!fixed !inset-0 !top-0 !left-0 !right-0 !bottom-0 !z-[99999] !w-screen !h-screen !m-0 !p-0 !rounded-none !border-none bg-slate-950 shadow-none'
          : `relative h-[calc(100dvh-5.5rem)] sm:h-[calc(100vh-5rem)] min-h-[460px] sm:min-h-[650px] rounded-2xl border ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-white shadow-xl'
            }`
      }`}
    >
      {/* Global CSS overrides for Leaflet Tooltips */}
      <style>{`
        .custom-gis-tooltip {
          background: ${isLight ? '#ffffff' : '#0f172a'} !important;
          color: ${isLight ? '#0f172a' : '#f8fafc'} !important;
          border: 1px solid ${isLight ? '#cbd5e1' : '#334155'} !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px ${isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.5)'} !important;
          padding: 4px 8px !important;
          font-family: 'Cairo', system-ui, sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          direction: rtl !important;
        }
        .custom-gis-tooltip:before {
          border-top-color: ${isLight ? '#ffffff' : '#0f172a'} !important;
        }
      `}</style>

      {/* Top Header & Main Toolbar (Responsive, Prevents Any Input/Button Overlap) */}
      {!isToolbarCollapsed ? (
        <div
          className={`p-2 sm:px-4 sm:py-2 border-b shrink-0 z-20 transition-all duration-300 ${
            isLight ? 'bg-slate-50/95 border-slate-200' : 'bg-slate-900/95 border-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            {/* Top / Search row */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div
                className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0 cursor-default"
                title={`خريطة الأصول GIS • شركة نفط الوسط (${toArabicDigits(units.length)} منشأة)`}
              >
                <MapIcon className="w-4 h-4" />
              </div>

              {/* Quick Search Box with Instant Autocomplete Dropdown */}
              <div ref={searchContainerRef} className="relative flex-1 min-w-0 max-w-full sm:max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => {
                      if (searchQuery.trim()) setIsSearchDropdownOpen(true);
                    }}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchMatches.length > 0) {
                        handleSelectUnit(searchMatches[0]);
                      }
                    }}
                    placeholder="ابحث بالاسم، الرمز، أو الأصل..."
                    className={`w-full text-xs rounded-xl py-2 pl-7 pr-8 border outline-none font-medium transition ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 shadow-xs'
                        : 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500'
                    }`}
                  />
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleResetView}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-rose-400 cursor-pointer transition"
                      title="مسح البحث وإعادة ضبط الخارطة"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Instant Search Dropdown Results */}
                {isSearchDropdownOpen && searchQuery.trim() && (
                  <div
                    className={`absolute right-0 left-0 top-full mt-1.5 rounded-xl border shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto scrollbar-thin ${
                      isLight
                        ? 'bg-white border-slate-200 divide-y divide-slate-100'
                        : 'bg-slate-900 border-slate-700 divide-y divide-slate-800'
                    }`}
                  >
                    {searchMatches.length === 0 ? (
                      <div className={`p-3 text-center text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        لا توجد منشأة مطابقة للبحث
                      </div>
                    ) : (
                      <div>
                        <div className={`px-3 py-1.5 text-[10px] font-bold ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'}`}>
                          نتائج البحث ({toArabicDigits(searchMatches.length)}) • انقر للانتقال المباشر
                        </div>
                        {searchMatches.slice(0, 15).map((unit) => {
                          const gradeColor = GRADE_BADGE_CONFIG[unit.conditionGrade]?.bg || '#f59e0b';
                          const isSelected = activeUnit?.code === unit.code;

                          return (
                            <button
                              key={unit.code}
                              type="button"
                              onClick={() => handleSelectUnit(unit)}
                              className={`w-full p-2.5 text-right flex items-center justify-between gap-2 transition cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/20 text-amber-400 font-bold'
                                  : isLight
                                  ? 'hover:bg-amber-50/80 text-slate-800'
                                  : 'hover:bg-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: gradeColor }}
                                  title={`الحالة: ${unit.conditionGrade}`}
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-xs truncate">{unit.name}</div>
                                  <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {unit.field} ({unit.governorate})
                                    {unit.fixedAssetCode ? ` • أصل: ${unit.fixedAssetCode}` : ''}
                                  </div>
                                </div>
                              </div>
                              <div className="text-left shrink-0">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                  {unit.code}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Collapse toolbar button on mobile header */}
              <button
                type="button"
                onClick={() => setIsToolbarCollapsed(true)}
                className={`sm:hidden w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-500'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="طي شريط الأدوات"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons Row: Distributed cleanly without squishing or overlapping */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 overflow-x-auto scrollbar-none py-0.5">
              {/* 1. Browse & Select Facility Modal Button */}
              <button
                type="button"
                onClick={() => setIsPickerModalOpen(true)}
                className="flex-1 sm:flex-initial h-8 px-2.5 sm:px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 font-bold shadow-md shadow-amber-500/20 transition cursor-pointer text-xs shrink-0"
                title="تصفح واختيار منشأة (دليل المحافظات والحقول)"
              >
                <ListTree className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-[11px] font-black">دليل المنشآت</span>
              </button>

              {/* 2. Map Layer Switcher: Satellite / Streets & Terrain */}
              <div
                className="flex items-center p-0.5 rounded-xl border shrink-0 bg-slate-950 border-slate-800"
                title="طريقة العرض: أقمار صناعية / طرق وتضاريس"
              >
                <button
                  type="button"
                  onClick={() => setMapType('satellite')}
                  className={`px-2 h-7 rounded-lg flex items-center gap-1 text-[11px] font-bold transition cursor-pointer ${
                    mapType === 'satellite'
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="عرض الأقمار الصناعية (Satellite)"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:hidden md:inline">أقمار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapType('streets')}
                  className={`px-2 h-7 rounded-lg flex items-center gap-1 text-[11px] font-bold transition cursor-pointer ${
                    mapType === 'streets'
                      ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="عرض الطرق والتضاريس (Streets & Terrain)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:hidden md:inline">طرق</span>
                </button>
              </div>

              {/* 3. Reset View (Full Iraq Panorama) */}
              <button
                type="button"
                onClick={handleResetView}
                className={`h-8 px-2 sm:w-8 rounded-xl border flex items-center justify-center gap-1 transition cursor-pointer shrink-0 shadow-xs ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
                title="إعادة ضبط وضع الخارطة (زوم أوت لكامل العراق)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] font-bold xs:inline sm:hidden">العراق</span>
              </button>

              {/* 4. Fullscreen / Exit Fullscreen Button */}
              <button
                type="button"
                id="gis-fullscreen-toggle-btn"
                onClick={toggleFullscreen}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs ${
                  isMapFullscreen
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-600 shadow-md shadow-amber-500/20'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
                title={isMapFullscreen ? 'الخروج من وضع ملء الشاشة (Esc)' : 'ملء الشاشة بالخارطة'}
              >
                {isMapFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-amber-500" />
                )}
              </button>

              {/* 5. Collapse Toolbar Button (Desktop) */}
              <button
                type="button"
                onClick={() => setIsToolbarCollapsed(true)}
                className={`hidden sm:flex w-8 h-8 rounded-xl border items-center justify-center transition cursor-pointer shrink-0 shadow-xs ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-400 hover:text-slate-800'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="طي شريط الأدوات لإفساح كامل الشاشة للخارطة"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Floating Uncollapse Pill (when toolbar is folded) */
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsToolbarCollapsed(false)}
            className="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-slate-700 shadow-2xl backdrop-blur-md flex items-center gap-1.5 text-xs font-bold transition cursor-pointer hover:scale-105"
            title="إظهار شريط الأدوات والخيارات"
          >
            <ChevronDown className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold">أدوات الخارطة</span>
          </button>
          {isMapFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full bg-slate-900/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 shadow-2xl backdrop-blur-md transition cursor-pointer"
              title="الخروج من وضع ملء الشاشة (Esc)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Main Map Canvas: Pure clean map occupying 100% of the screen space below the header */}
      <div className="flex-1 relative w-full h-full bg-slate-950 overflow-hidden z-0">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Zoom & Panorama Quick Controls */}
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-base backdrop-blur-sm cursor-pointer transition shadow-md ${
              isLight
                ? 'bg-white/95 hover:bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700'
            }`}
            title="تقريب (Zoom In)"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-base backdrop-blur-sm cursor-pointer transition shadow-md ${
              isLight
                ? 'bg-white/95 hover:bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700'
            }`}
            title="إبعاد (Zoom Out)"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center backdrop-blur-sm cursor-pointer transition shadow-md ${
              isLight
                ? 'bg-white/95 hover:bg-slate-100 text-amber-600 border-slate-300'
                : 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 border-slate-700'
            }`}
            title="إعادة ضبط (خارطة العراق)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stable, In-Viewport Unit Identity Card (Adapts to Daylight & Dark themes, fits Phone Screen) */}
        {activeUnit && (
          <div
            key={activeUnit.code}
            className={`absolute bottom-2 sm:bottom-3 right-2 left-2 sm:left-auto sm:right-3 z-[500] max-w-[360px] mx-auto sm:mx-0 sm:w-[340px] rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200 pointer-events-auto ${
              isLight
                ? 'bg-white/95 text-slate-900 border-slate-200 shadow-slate-900/15'
                : 'bg-slate-950/95 text-white border-slate-800 shadow-black/80'
            }`}
          >
            {/* Header: Compact single row */}
            <div
              className={`px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
                isLight ? 'bg-slate-50/95 border-slate-200' : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-xs"
                  style={{ background: UNIT_TYPE_CONFIG[activeUnit.type]?.gradient || '#2563eb' }}
                  dangerouslySetInnerHTML={{ __html: UNIT_TYPE_CONFIG[activeUnit.type]?.iconSvg || '' }}
                />
                <h3
                  className={`text-xs font-black truncate leading-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                  title={activeUnit.name}
                >
                  {activeUnit.name}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[9.5px] font-black px-1.5 py-0.5 rounded-full text-white shadow-xs"
                  style={{ backgroundColor: GRADE_BADGE_CONFIG[activeUnit.conditionGrade]?.bg || '#f59e0b' }}
                >
                  {GRADE_BADGE_CONFIG[activeUnit.conditionGrade]?.label || activeUnit.conditionGrade}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setActiveUnit(null);
                    setShowCardDetails(false);
                  }}
                  className={`p-1 rounded-lg transition cursor-pointer ${
                    isLight
                      ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="إغلاق البطاقة"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card Content: Streamlined, minimal height footprint */}
            <div className="p-2.5 space-y-2 text-right text-xs" dir="rtl">
              {/* Badges Bar: Code + Fixed Asset + Field */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] ${isLight ? 'text-slate-500 font-bold' : 'text-slate-400'}`}>
                    الرمز:
                  </span>
                  <span
                    className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                      isLight
                        ? 'text-amber-800 bg-amber-50/90 border-amber-200'
                        : 'text-amber-400 bg-slate-900 border-slate-800'
                    }`}
                    dir="ltr"
                  >
                    {activeUnit.code}
                  </span>
                </div>
                {activeUnit.fixedAssetCode && (
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] ${isLight ? 'text-slate-500 font-bold' : 'text-slate-400'}`}>
                      الأصل:
                    </span>
                    <span
                      className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                        isLight
                          ? 'text-sky-800 bg-sky-50/90 border-sky-200'
                          : 'text-sky-400 bg-slate-900 border-slate-800'
                      }`}
                      dir="ltr"
                    >
                      {activeUnit.fixedAssetCode}
                    </span>
                  </div>
                )}
                <div className={`text-[10.5px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {activeUnit.field} • {activeUnit.governorate}
                </div>
              </div>

              {/* Core Information Bar */}
              <div
                className={`p-2 rounded-xl border space-y-1 text-[11px] ${
                  isLight
                    ? 'bg-slate-100/80 border-slate-200'
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    الجهة الشاغلة:
                  </span>
                  <span className={`font-bold truncate max-w-[190px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {(activeUnit as any).occupyingEntity || activeUnit.department || 'غير محدد'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    المساحة والطوابق:
                  </span>
                  <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {activeUnit.totalAreaSqM ? `${toArabicDigits(activeUnit.totalAreaSqM)} م²` : '—'} • {toArabicDigits(activeUnit.floorsCount || 1)} طابق ({toArabicDigits(activeUnit.rooms?.length || 0)} غرفة)
                  </span>
                </div>

                {/* Extended Details (collapsible to save screen space) */}
                {showCardDetails && (
                  <div
                    className={`pt-1.5 mt-1 border-t space-y-1 animate-in fade-in duration-150 ${
                      isLight ? 'border-slate-200' : 'border-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        الموقع / القطاع:
                      </span>
                      <span className={`font-bold truncate max-w-[180px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {activeUnit.sectorAddress || 'الموقع الرئيسي للحقل'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        سنة الإنشاء:
                      </span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {activeUnit.constructionYear ? toArabicDigits(activeUnit.constructionYear) : 'غير مسجل'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action & GPS Row: Ultra compact, single or clean two-line strip */}
              <div className="flex items-center gap-1.5">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeUnit.coordinates?.lat || 33.1},${activeUnit.coordinates?.lng || 45.2}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  <span className="truncate">Google Maps</span>
                </a>

                {/* GPS Coordinates with copy */}
                <button
                  type="button"
                  onClick={() => handleCopyCoords(activeUnit.coordinates?.lat || 33.1, activeUnit.coordinates?.lng || 45.2)}
                  className={`py-1.5 px-2 rounded-xl border font-mono text-[10px] flex items-center gap-1 transition cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-sky-700 hover:text-sky-800'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-sky-400'
                  }`}
                  title="نسخ إحداثيات GPS"
                >
                  {copiedCoords ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-bold">تم</span>
                    </>
                  ) : (
                    <>
                      <Copy className={`w-3 h-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                      <span>GPS</span>
                    </>
                  )}
                </button>

                {/* Toggle details button */}
                <button
                  type="button"
                  onClick={() => setShowCardDetails((prev) => !prev)}
                  className={`py-1.5 px-2 rounded-xl border text-[10px] font-bold transition cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 hover:text-slate-900'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={showCardDetails ? 'إخفاء التفاصيل الإضافية' : 'عرض التفاصيل الإضافية'}
                >
                  {showCardDetails ? 'أقل' : 'تفاصيل'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Dedicated Popup Modal for Selecting Unit (Governorates, Fields, Units)    */}
      {/* ========================================================================= */}
      {isPickerModalOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-5 backdrop-blur-md bg-black/60 animate-fadeIn">
          <div
            className={`w-full max-w-5xl max-h-[88vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
              isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ListTree className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    دليل واختيار المنشآت - الهيكل الجغرافي
                  </h2>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    انقر على أي منشأة لتوجيه الخارطة وتكبير موقعها بدرجة عالية تلقائياً
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPickerModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition cursor-pointer border border-slate-700"
                title="إغلاق (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar: Search inside modal + Expand All + Collapse All + Stats */}
            <div
              className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs ${
                isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              {/* Internal Search Input */}
              <div className="relative min-w-[220px] sm:min-w-[280px]">
                <input
                  type="text"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="تصفية حسب الاسم، الرمز، رمز الأصل، الحقل..."
                  className={`w-full text-xs rounded-xl py-1.5 pl-7 pr-8 border outline-none font-medium transition ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500'
                      : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500'
                  }`}
                />
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2 text-slate-400 pointer-events-none" />
                {modalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setModalSearchQuery('')}
                    className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons: Expand All & Collapse All */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleModalExpandAll}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
                  }`}
                  title="توسيع كافة المحافظات والحقول"
                >
                  <ChevronsDown className="w-3.5 h-3.5 text-amber-500" />
                  <span>توسيع الكل</span>
                </button>

                <button
                  type="button"
                  onClick={handleModalCollapseAll}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200'
                  }`}
                  title="طي كافة المحافظات والحقول"
                >
                  <ChevronsUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>طي الكل</span>
                </button>

                {/* Counter Badges */}
                <div className="hidden sm:flex items-center gap-2 mr-2">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[11px]">
                    {toArabicDigits(allGovNames.length)} محافظة
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold text-[11px]">
                    {toArabicDigits(totalFieldsCount)} حقل
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">
                    {toArabicDigits(modalFilteredUnits.length)} منشأة
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body: Scrollable Hierarchy Tree */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {hierarchyTree.size === 0 ? (
                <div className={`p-8 text-center text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  لا توجد منشآت مطابقة لمعايير البحث داخل الدليل
                </div>
              ) : (
                Array.from(hierarchyTree.entries()).map(([gov, fieldMap]: [string, Map<string, UnitAsset[]>]) => {
                  const isGovCollapsed = collapsedGovs.has(gov);
                  const fieldEntries = Array.from(fieldMap.entries()) as [string, UnitAsset[]][];
                  const totalGovUnits = fieldEntries.reduce(
                    (acc: number, [, list]) => acc + list.length,
                    0
                  );

                  return (
                    <div
                      key={gov}
                      className={`rounded-2xl border transition overflow-hidden shadow-xs ${
                        isLight ? 'bg-slate-50 border-slate-300/80' : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      {/* Governorate Header Button */}
                      <button
                        type="button"
                        onClick={() => toggleGovCollapse(gov)}
                        className={`w-full px-4 py-3 flex items-center justify-between text-right font-black transition cursor-pointer text-sm ${
                          isLight
                            ? 'bg-slate-100 hover:bg-slate-200/90 text-slate-900 border-b border-slate-200'
                            : 'bg-slate-950 hover:bg-slate-800 text-slate-100 border-b border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-amber-500" />
                          <span>محافظة {gov}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${
                              isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-amber-400'
                            }`}
                          >
                            ({toArabicDigits(totalGovUnits)} منشأة)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>{isGovCollapsed ? 'توسيع' : 'طي'}</span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isGovCollapsed ? '-rotate-90' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Fields & Units under this Governorate */}
                      {!isGovCollapsed && (
                        <div className="p-3 space-y-3">
                          {fieldEntries.map(([fld, uList]) => {
                            const fieldKey = `${gov}_${fld}`;
                            const isFieldCollapsed = collapsedFields.has(fieldKey);

                            return (
                              <div
                                key={fieldKey}
                                className={`rounded-xl border p-2.5 ${
                                  isLight
                                    ? 'bg-white border-slate-200'
                                    : 'bg-slate-900/90 border-slate-800'
                                }`}
                              >
                                {/* Field Header */}
                                <button
                                  type="button"
                                  onClick={() => toggleFieldCollapse(fieldKey)}
                                  className={`w-full p-2 rounded-lg flex items-center justify-between text-right font-bold transition cursor-pointer text-xs ${
                                    isLight
                                      ? 'hover:bg-slate-100 text-slate-800'
                                      : 'hover:bg-slate-800 text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                                    <span className="font-bold text-sm">{fld}</span>
                                    <span className="text-xs font-mono text-slate-400">
                                      ({toArabicDigits(uList.length)} منشأة)
                                    </span>
                                  </div>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                      isFieldCollapsed ? '-rotate-90' : ''
                                    }`}
                                  />
                                </button>

                                {/* Units Grid under this Field */}
                                {!isFieldCollapsed && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/40">
                                    {uList.map((unit) => {
                                      const typeConfig = UNIT_TYPE_CONFIG[unit.type] || UNIT_TYPE_CONFIG.building;
                                      const gradeConfig = GRADE_BADGE_CONFIG[unit.conditionGrade] || GRADE_BADGE_CONFIG.B;
                                      const isSelected = activeUnit?.code === unit.code;

                                      return (
                                        <button
                                          key={unit.code}
                                          type="button"
                                          onClick={() => handleSelectUnit(unit)}
                                          className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-2 shadow-xs group ${
                                            isSelected
                                              ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                                              : isLight
                                              ? 'bg-slate-50 hover:bg-amber-50/70 border-slate-200 hover:border-amber-400/80 text-slate-800'
                                              : 'bg-slate-950 hover:bg-slate-800/90 border-slate-800 hover:border-amber-500/50 text-slate-200'
                                          }`}
                                        >
                                          {/* Card Top: Type & Grade */}
                                          <div className="flex items-center justify-between gap-1 w-full">
                                            <span className="text-[10.5px] font-bold text-slate-400 truncate flex items-center gap-1">
                                              <Building2 className="w-3 h-3 text-amber-500" />
                                              <span>{typeConfig.label}</span>
                                            </span>
                                            <span
                                              className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
                                              style={{
                                                backgroundColor: gradeConfig.bg,
                                                color: gradeConfig.color,
                                              }}
                                            >
                                              {gradeConfig.label}
                                            </span>
                                          </div>

                                          {/* Card Center: Unit Name */}
                                          <div className="font-bold text-xs leading-snug group-hover:text-amber-400 transition">
                                            {unit.name}
                                          </div>

                                          {/* Card Bottom: Unit Code & Asset Code */}
                                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-800/30 font-mono">
                                            <span className="text-amber-400 font-bold">{unit.code}</span>
                                            {unit.fixedAssetCode ? (
                                              <span className="text-sky-400 truncate max-w-[120px]">
                                                أصل: {unit.fixedAssetCode}
                                              </span>
                                            ) : (
                                              <span className="text-slate-500">بدون رمز أصل</span>
                                            )}
                                          </div>
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
                })
              )}
            </div>

            {/* Modal Footer */}
            <div
              className={`px-5 py-2.5 border-t flex items-center justify-between text-xs shrink-0 ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>انقر على أي بطاقة منشأة لتكبير موقعها الجغرافي على الفور</span>
              <button
                type="button"
                onClick={() => setIsPickerModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
