import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  Search,
  MapPin,
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
import { GIS_TILE_LAYERS } from '../config/mapsConfig';

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

  // If initial lat/lng was specifically provided by user
  const hasInitialSpecificCoords = Boolean(lat && lng && (lat !== 32.6189 || lng !== 45.7531));
  const currentLat = lat || IRAQ_DEFAULT_CENTER.lat;
  const currentLng = lng || IRAQ_DEFAULT_CENTER.lng;

  // Jump to specific coordinates and update marker + map
  const applyLocation = (newLat: number, newLng: number, zoomLevel: number = 15, feedbackText?: string) => {
    const validLat = Number(newLat.toFixed(6));
    const validLng = Number(newLng.toFixed(6));

    onChangeLocation(validLat, validLng);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([validLat, validLng], zoomLevel, {
        animate: true,
        duration: 1.2,
      });
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([validLat, validLng]);
    }

    if (feedbackText) {
      setSearchFeedback(feedbackText);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialCenter: [number, number] = hasInitialSpecificCoords
      ? [lat, lng]
      : [IRAQ_DEFAULT_CENTER.lat, IRAQ_DEFAULT_CENTER.lng];
    const initialZoom = hasInitialSpecificCoords ? 15 : IRAQ_DEFAULT_CENTER.zoom;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
    });

    mapInstanceRef.current = map;

    // Add Base Tile Layer
    const activeTile = GIS_TILE_LAYERS[mapType];
    const tileLayer = L.tileLayer(activeTile.url, {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Custom Draggable Pin
    const customPinIcon = L.divIcon({
      className: 'custom-gis-picker-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab;">
          <div style="background: #f59e0b; color: #020617; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.6); border: 2.5px solid #ffffff; animation: bounce 1s infinite alternate;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div style="width: 4px; height: 10px; background: #f59e0b; border-radius: 2px; margin-top: -2px;"></div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
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
      setSearchFeedback(`تم تثبيت الموقع عبر سحب الدبوس: ${toArabicDigits(newLat)} , ${toArabicDigits(newLng)}`);
    });

    // Map click event to relocate marker and zoom in if zoomed out
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      onChangeLocation(newLat, newLng);

      // If current zoom is low (zoomed out), smoothly zoom in to clicked position
      if (map.getZoom() < 12) {
        map.setView([newLat, newLng], 15, { animate: true });
      }

      setSearchFeedback(`تم تثبيت الموقع عبر النقر المباشر: ${toArabicDigits(newLat)} , ${toArabicDigits(newLng)}`);
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

  // Search by query (coordinates or administrative city name) and zoom in
  const handleSearch = async (targetQuery?: string) => {
    const rawQuery = (targetQuery || searchQuery).trim();
    if (!rawQuery) return;

    setIsSearching(true);
    setSearchFeedback(null);

    // 1. Check if query contains explicit coordinates (Lat, Lng) e.g., "32.6189, 45.7531" or "32.6189 45.7531"
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
        applyLocation(
          parsedLat,
          parsedLng,
          16,
          `تم الانتقال وتكبير الموقع (Zoom In) وفق الإحداثيات: ${parsedLat.toFixed(5)}° N, ${parsedLng.toFixed(5)}° E`
        );
        setIsSearching(false);
        return;
      }
    }

    // 2. Safe Geocoding strictly restricted to Iraq Bounding Box for cities/administrative districts
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=iq&viewbox=38.79,37.38,48.63,29.06&bounded=1&limit=3&q=${encodeURIComponent(
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

          // Verify inside Iraq bounding coordinates
          if (
            !isNaN(foundLat) &&
            !isNaN(foundLng) &&
            foundLat >= 28.5 &&
            foundLat <= 38.0 &&
            foundLng >= 38.0 &&
            foundLng <= 49.0
          ) {
            applyLocation(
              foundLat,
              foundLng,
              14,
              `تم الانتقال إلى (${result.display_name.split(',')[0]}) على الخريطة`
            );
            setIsSearching(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Geocoding search error:', err);
    }

    setSearchFeedback('لم يتم العثور على موقع بهذا الاسم. يمكنك كتابة الإحداثيات مباشرة أو النقر على الخريطة لتثبيت الموقع بدقة.');
    setIsSearching(false);
  };

  return (
    <div className="space-y-3">
      {/* Search, Layer Bar & Reset Zoom */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
        {/* Search input */}
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
            placeholder="ابحث باسم المدينة أو المنطقة في العراق، أو اكتب الإحداثيات مباشرة (مثال: 32.6189, 45.7531)..."
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
          onClick={() => handleSearch()}
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
