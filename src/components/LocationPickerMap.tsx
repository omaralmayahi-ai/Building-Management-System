import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Search, Globe, Loader2, AlertTriangle } from 'lucide-react';

// Fix Leaflet default icon path issues in Vite using locally bundled assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChangeLocation: (lat: number, lng: number) => void;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  lat,
  lng,
  onChangeLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [mapType, setMapType] = useState<'satellite' | 'streets'>('satellite');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [tileError, setTileError] = useState<boolean>(false);

  // Map Tile Layers Configuration
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

  // Custom Icon for Asset Location Marker
  const customMarkerIcon = L.divIcon({
    className: 'custom-location-picker-marker',
    html: `
      <div style="
        width: 38px;
        height: 38px;
        background: #f59e0b;
        border: 3px solid #0f172a;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 20px rgba(0,0,0,0.5);
      ">
        <div style="
          width: 14px;
          height: 14px;
          background: #0f172a;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initLat = lat || 32.6189;
    const initLng = lng || 45.7531;

    const map = L.map(mapContainerRef.current, {
      center: [initLat, initLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Add Tile Layer with error monitoring
    const tileConfig = tileLayers[mapType];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    });
    tileLayer.on('tileerror', () => {
      setTileError(true);
    });
    tileLayer.on('tileload', () => {
      setTileError(false);
    });
    tileLayer.addTo(map);

    // Add Draggable Marker
    const marker = L.marker([initLat, initLng], {
      draggable: true,
      icon: customMarkerIcon,
    }).addTo(map);

    markerRef.current = marker;

    // Handle marker dragend
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      const newLat = Number(position.lat.toFixed(6));
      const newLng = Number(position.lng.toFixed(6));
      onChangeLocation(newLat, newLng);
    });

    // Handle map click to move marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(6));
      const newLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([newLat, newLng]);
      onChangeLocation(newLat, newLng);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Map and Marker position when lat/lng props change from manual inputs
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    const currentPos = markerRef.current.getLatLng();

    if (Math.abs(currentPos.lat - lat) > 0.00001 || Math.abs(currentPos.lng - lng) > 0.00001) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.panTo([lat, lng], { animate: true });
    }
  }, [lat, lng]);

  // Update Tile Layer when mapType changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    const tileConfig = tileLayers[mapType];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
    });
    tileLayer.on('tileerror', () => {
      setTileError(true);
    });
    tileLayer.on('tileload', () => {
      setTileError(false);
    });
    tileLayer.addTo(mapInstanceRef.current);
  }, [mapType]);

  // Search Location Handler
  const handleSearchLocation = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSearch = customQuery !== undefined ? customQuery : searchQuery;
    if (!queryToSearch.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryToSearch + ' Iraq العراق')}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const foundLat = Number(parseFloat(data[0].lat).toFixed(6));
        const foundLng = Number(parseFloat(data[0].lon).toFixed(6));
        onChangeLocation(foundLat, foundLng);
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([foundLat, foundLng]);
          mapInstanceRef.current.setView([foundLat, foundLng], 14, { animate: true });
        }
      } else {
        alert(`لم يتم العثور على نتائج للبحث عن: "${queryToSearch}"`);
      }
    } catch (err) {
      console.warn('Geocoding search failed (possibly offline):', err);
      alert('تعذّر الاتصال بخدمة البحث الجغرافي. يتطلب البحث اتصالاً بالإنترنت أو توفير خادم بحث جغرافي محلي.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Input Box Outside Map Frame */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchLocation();
                }
              }}
              placeholder="ابحث عن المدينة، المحافظة، الحقل النفطي، أو المنطقة..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pr-10 pl-4 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 outline-none transition"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSearchLocation()}
            disabled={isSearching}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>بحث</span>
          </button>
        </div>
      </div>

      {/* Map Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>نوع الخريطة:</span>
          </span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                mapType === 'satellite' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              أقمار صناعية
            </button>
            <button
              type="button"
              onClick={() => setMapType('streets')}
              className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                mapType === 'streets' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              شوارع
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([33.2232, 43.6793], 6, { animate: true });
            }
          }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold cursor-pointer transition"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>خارطة العراق (Zoom Out)</span>
        </button>
      </div>

      {/* Map Canvas Frame */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
        <div ref={mapContainerRef} className="w-full h-[480px] z-0" />

        {/* Tile Error / Offline Server Notice */}
        {tileError && (
          <div className="absolute top-4 left-4 z-10 max-w-xs bg-slate-950/95 border border-amber-500/50 backdrop-blur-md text-amber-300 p-3 rounded-xl text-xs shadow-2xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-slate-100 text-xs">تنبيه اتصال طبقات الخريطة</div>
              <div className="text-[11px] text-slate-300 leading-tight">
                تعذّر تحميل بلاطات الخريطة — تحقق من الاتصال بالشبكة الداخلية أو أضف خادم بلاطات محلي (TileServer GL / Offline Map Server).
              </div>
            </div>
          </div>
        )}

        {/* Live Active Pin Floating Coordinates Badge */}
        <div className="absolute bottom-4 right-4 z-10 bg-slate-950/90 backdrop-blur border border-amber-500/40 text-slate-100 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-mono">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></div>
          <div>
            <div className="text-[10px] font-sans font-bold text-slate-400">موقع الدبوس المباشر (GPS Pin):</div>
            <div className="font-bold text-amber-400">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


