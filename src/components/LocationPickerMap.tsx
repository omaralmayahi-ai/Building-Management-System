import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  Search,
  MapPin,
  Compass,
  Layers,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { toArabicDigits } from '../utils/arabicUtils';
import { GIS_TILE_LAYERS, IRAQ_OILFIELDS_PRESETS } from '../config/mapsConfig';
import { INITIAL_GOVERNORATES, INITIAL_OILFIELDS, INITIAL_SITES } from '../data/mockData';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Iraq Center Overview (Zoomed out to cover the entire country)
const IRAQ_DEFAULT_CENTER = {
  lat: 33.2232,
  lng: 43.6793,
  zoom: 6,
};

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChangeLocation: (lat: number, lng: number) => void;
  theme?: 'dark' | 'light';
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  lat,
  lng,
  onChangeLocation,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [mapSize, setMapSize] = useState<'large' | 'huge' | 'compact'>('large');

  // Re-render Leaflet when container height changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [mapSize]);

  // If initial lat/lng was specifically provided by user (and not default zero/empty), track whether user has chosen a point
  const hasInitialSpecificCoords = Boolean(lat && lng && (lat !== 32.6189 || lng !== 45.7531));
  const currentLat = lat || IRAQ_DEFAULT_CENTER.lat;
  const currentLng = lng || IRAQ_DEFAULT_CENTER.lng;

  // Initialize Leaflet Map in zoomed-out Iraq overview mode by default
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default entrance: Zoom-out on Iraq map (zoom 6), or focused if existing specific coordinates were passed
    const initialCenter: [number, number] = hasInitialSpecificCoords
      ? [lat, lng]
      : [IRAQ_DEFAULT_CENTER.lat, IRAQ_DEFAULT_CENTER.lng];
    const initialZoom = hasInitialSpecificCoords ? 14 : IRAQ_DEFAULT_CENTER.zoom;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Tile layer
    const activeTile = GIS_TILE_LAYERS[mapType];
    const tileLayer = L.tileLayer(activeTile.url, {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Custom Draggable Amber Marker
    const customPinIcon = L.divIcon({
      className: 'custom-picker-pin',
      html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translate(-50%, -100%);
          cursor: grab;
        ">
          <div style="
            background: #f59e0b;
            color: #0f172a;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            border: 2.5px solid #ffffff;
          ">
            <div style="
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #0f172a;
              transform: rotate(45deg);
            "></div>
          </div>
          <div style="
            width: 8px;
            height: 8px;
            background: rgba(0,0,0,0.3);
            border-radius: 50%;
            margin-top: 2px;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42],
    });

    const marker = L.marker(
      hasInitialSpecificCoords ? [lat, lng] : [IRAQ_DEFAULT_CENTER.lat, IRAQ_DEFAULT_CENTER.lng],
      {
        draggable: true,
        icon: customPinIcon,
      }
    ).addTo(map);

    markerRef.current = marker;

    // Drag events
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const newLat = Number(pos.lat.toFixed(6));
      const newLng = Number(pos.lng.toFixed(6));
      onChangeLocation(newLat, newLng);
      setSearchFeedback(`تم تثبيت الموقع: ${toArabicDigits(newLat)} , ${toArabicDigits(newLng)}`);
    });

    // Map click event to relocate marker and zoom in if zoomed out
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      onChangeLocation(newLat, newLng);

      // If current zoom is low (zoomed out), smoothly zoom in to clicked position
      if (map.getZoom() < 12) {
        map.setView([newLat, newLng], 14, { animate: true });
      }

      setSearchFeedback(`تم تثبيت الموقع عبر النقر: ${toArabicDigits(newLat)} , ${toArabicDigits(newLng)}`);
    });

    // Invalidate map size after mount
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when mapType changes
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

  // Sync marker and center when props change externally
  useEffect(() => {
    if (markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  // Reset to full Iraq zoom-out view
  const handleResetToIraq = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [IRAQ_DEFAULT_CENTER.lat, IRAQ_DEFAULT_CENTER.lng],
        IRAQ_DEFAULT_CENTER.zoom,
        { animate: true }
      );
    }
    setSearchFeedback('تمت إعادة ضبط الخريطة إلى نظرة عامة شاملة لكامل العراق (زوم أوت).');
  };

  // Search by query (location name or coordinates) and zoom in
  const handleSearch = async () => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setIsSearching(true);
    setSearchFeedback(null);

    // Normalize Arabic text for smart matching
    const normalizeArabic = (text: string) =>
      text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F]/g, '')
        .toLowerCase()
        .trim();

    const cleanQuery = normalizeArabic(rawQuery);

    // 1. Check if query contains coordinates (Lat, Lng) e.g., "33.3152, 44.3661" or "33.3152 44.3661"
    const coordPattern = /^([+-]?\d+(\.\d+)?)[,\s]+([+-]?\d+(\.\d+)?)$/;
    const coordMatch = rawQuery.match(coordPattern);
    if (coordMatch) {
      const parsedLat = parseFloat(coordMatch[1]);
      const parsedLng = parseFloat(coordMatch[3]);
      if (
        !isNaN(parsedLat) &&
        !isNaN(parsedLng) &&
        parsedLat >= -90 &&
        parsedLat <= 90 &&
        parsedLng >= -180 &&
        parsedLng <= 180
      ) {
        onChangeLocation(parsedLat, parsedLng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([parsedLat, parsedLng], 15, { animate: true });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([parsedLat, parsedLng]);
        }
        setSearchFeedback(`تم الانتقال وتكبير الموقع (Zoom In) وفق الإحداثيات: ${parsedLat.toFixed(5)}° N, ${parsedLng.toFixed(5)}° E`);
        setIsSearching(false);
        return;
      }
    }

    // 2. Search in Presets & Well-known Iraqi Oilfields
    const matchedPreset = IRAQ_OILFIELDS_PRESETS.find((p) => {
      const name = normalizeArabic(p.nameAr);
      const gov = normalizeArabic(p.governorate);
      const desc = normalizeArabic(p.description);
      const id = p.id.toLowerCase();
      return name.includes(cleanQuery) || gov.includes(cleanQuery) || desc.includes(cleanQuery) || id.includes(cleanQuery);
    });

    if (matchedPreset) {
      onChangeLocation(matchedPreset.lat, matchedPreset.lng);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([matchedPreset.lat, matchedPreset.lng], matchedPreset.zoom || 14, {
          animate: true,
        });
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([matchedPreset.lat, matchedPreset.lng]);
      }
      setSearchFeedback(`تم العثور على (${matchedPreset.nameAr}) وعمل زوم إن مباشر للموقع`);
      setIsSearching(false);
      return;
    }

    // 3. Search in Sites data
    const matchedSite = INITIAL_SITES.find((s) => {
      const name = normalizeArabic(s.nameAr);
      const desc = normalizeArabic(s.description || '');
      const code = s.code.toLowerCase();
      return name.includes(cleanQuery) || desc.includes(cleanQuery) || code.includes(cleanQuery);
    });

    if (matchedSite && matchedSite.coordinates) {
      onChangeLocation(matchedSite.coordinates.lat, matchedSite.coordinates.lng);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([matchedSite.coordinates.lat, matchedSite.coordinates.lng], 15, {
          animate: true,
        });
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([matchedSite.coordinates.lat, matchedSite.coordinates.lng]);
      }
      setSearchFeedback(`تم العثور على موقع (${matchedSite.nameAr}) وتكبير الخريطة`);
      setIsSearching(false);
      return;
    }

    // 4. Search in Oilfields & Governorates standard coordinates
    const matchedField = INITIAL_OILFIELDS.find((f) => normalizeArabic(f.nameAr).includes(cleanQuery));
    if (matchedField) {
      // Find coordinates from sites or presets matching field
      const presetForField = IRAQ_OILFIELDS_PRESETS.find((p) =>
        normalizeArabic(p.nameAr).includes(normalizeArabic(matchedField.nameAr))
      );
      if (presetForField) {
        onChangeLocation(presetForField.lat, presetForField.lng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([presetForField.lat, presetForField.lng], 14, { animate: true });
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([presetForField.lat, presetForField.lng]);
        }
        setSearchFeedback(`تم العثور على (${matchedField.nameAr}) وتكبير الخريطة`);
        setIsSearching(false);
        return;
      }
    }

    // 5. Try OpenStreetMap Nominatim Geocoding API with focus on Iraq for any city/location in Iraq
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=iq&limit=1&q=${encodeURIComponent(
        rawQuery
      )}`;
      const response = await fetch(nominatimUrl, {
        headers: {
          'Accept-Language': 'ar,en',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          const foundLat = parseFloat(result.lat);
          const foundLng = parseFloat(result.lon);

          if (!isNaN(foundLat) && !isNaN(foundLng)) {
            onChangeLocation(foundLat, foundLng);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([foundLat, foundLng], 14, { animate: true });
            }
            if (markerRef.current) {
              markerRef.current.setLatLng([foundLat, foundLng]);
            }
            setSearchFeedback(`تم العثور على (${result.display_name.split(',')[0]}) وعمل زوم إن إلى الموقع.`);
            setIsSearching(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Geocoding search error:', err);
    }

    setSearchFeedback('لم يتم العثور على موقع بهذا الاسم. يمكنك كتابة الإحداثيات مباشرة أو النقر على الخريطة لتثبيت الموقع.');
    setIsSearching(false);
  };

  return (
    <div className="space-y-3">
      {/* Search, Layer Bar & Reset Zoom */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        {/* Search input for location name or coordinates */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="ابحث باسم الموقع أو الحقل أو اكتب الإحداثيات (مثال: حقل الأحدب، بغداد، 32.6189, 45.7531)..."
            className={`w-full text-xs rounded-xl py-2 pl-9 pr-9 border transition outline-none font-medium ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 shadow-sm'
                : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500'
            }`}
          />
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchFeedback(null);
              }}
              className="absolute left-3 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search / Zoom In Action Button */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-md shrink-0"
        >
          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>بحث وتكبير الموقع</span>
        </button>

        {/* Reset Zoom Out to Iraq Map */}
        <button
          type="button"
          onClick={handleResetToIraq}
          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
            isLight
              ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title="إعادة تعيين إلى وضع زوم أوت على كامل خارطة العراق"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
          <span>زوم أوت (العراق)</span>
        </button>

        {/* Height Expander Toggle */}
        <button
          type="button"
          onClick={() => setMapSize(mapSize === 'large' ? 'huge' : mapSize === 'huge' ? 'compact' : 'large')}
          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
            isLight
              ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title="تغيير ارتفاع ومساحة مربع الخريطة"
        >
          {mapSize === 'huge' ? (
            <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span>
            {mapSize === 'large' ? 'توسيع إضافي' : mapSize === 'huge' ? 'عرض مدمج' : 'عرض واسع'}
          </span>
        </button>

        {/* Map Type Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              mapType === 'streets'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            شوارع وتضاريس
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {searchFeedback && (
        <div
          className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn ${
            searchFeedback.includes('تم')
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
          }`}
        >
          {searchFeedback.includes('تم') ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          )}
          <span>{searchFeedback}</span>
        </div>
      )}

      {/* Leaflet Map Canvas Container with Increased Height */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-inner z-0 transition-all duration-300 ${
          mapSize === 'huge'
            ? 'h-[720px]'
            : mapSize === 'compact'
            ? 'h-[400px]'
            : 'h-[560px] sm:h-[620px]'
        }`}
      >
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Live Coordinate Badge Overlay */}
        <div className="absolute bottom-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-200 flex items-center gap-2 shadow-xl">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {toArabicDigits((lat || currentLat).toFixed(6))}° N, {toArabicDigits((lng || currentLng).toFixed(6))}° E
          </span>
          <span className="text-[9.5px] text-slate-400 border-r border-slate-700 pr-2 mr-1">
            (اسحب الدبوس أو انقر لتكبير وتثبيت الموقع)
          </span>
        </div>
      </div>
    </div>
  );
};
