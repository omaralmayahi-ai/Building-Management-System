import React, { useState } from 'react';
import {
  SunMedium,
  Plane,
  Waves,
  Compass,
  Car,
  Shield,
  Flower2,
  DoorOpen,
  DoorClosed,
  Lock,
  Square,
  Lightbulb,
  Columns,
  Flame,
  Layers,
  Move,
  RotateCw,
  Check,
  Trash2,
  Copy,
  Save,
  Database,
  Sliders,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Compass as CompassIcon,
  Maximize2,
  Minimize2,
  Eye,
  Building2,
  CheckCircle2,
  Cloud,
  Flag,
  Radio,
  Camera,
  Wind,
  Droplet,
  Zap,
  ShieldAlert,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { CustomSiteElement, CustomSiteElementType, UnitDesignFinishing } from '../types';
import { SITE_ELEMENT_DEFINITIONS, SiteElementDefinition } from '../utils/customSiteElements3D';
import { toArabicDigits } from '../utils/arabicUtils';

interface InteractiveEngineeringEditorProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  elements: CustomSiteElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onAddElement: (type: CustomSiteElementType, options?: { mountTarget?: 'ground' | 'roof' | 'wall'; position?: { x: number; y: number; z: number } }) => void;
  onUpdateElement: (updated: CustomSiteElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onSaveToDatabase?: () => Promise<void> | void;
  isSavingDatabase?: boolean;
  lastSavedTime?: string;
  roofHeight: number;
  buildingWidth: number;
  buildingDepth: number;
  isNightMode?: boolean;
  theme?: string;
  // Merged architectural customization options
  archStyle?: 'modern' | 'classic' | 'industrial' | 'minimalist';
  roofType?: 'flat' | 'flat_parapet' | 'gabled' | 'pitched_tile' | 'garden';
  showFurniture?: boolean;
  showWindows?: boolean;
  showTrees?: boolean;
  interiorLightIntensity?: number;
  exteriorLightIntensity?: number;
  onUpdateFinishingSettings?: (updated: Partial<UnitDesignFinishing>) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Plane,
  Waves,
  Compass,
  Car,
  Shield,
  Flower2,
  DoorOpen,
  DoorClosed,
  Lock,
  Square,
  Lightbulb,
  Columns,
  Flame,
  SunMedium,
  Flag,
  Radio,
  Camera,
  Wind,
  Droplet,
  Zap,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Database,
  Sliders,
  Layers,
  Move,
  Volume2,
};

export const InteractiveEngineeringEditor: React.FC<InteractiveEngineeringEditorProps> = ({
  isOpen,
  onToggleOpen,
  elements = [],
  selectedElementId,
  onSelectElement,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onSaveToDatabase,
  isSavingDatabase = false,
  lastSavedTime,
  roofHeight = 6.4,
  buildingWidth = 14,
  buildingDepth = 10,
  isNightMode = false,
  theme = 'dark',
  archStyle = 'modern',
  roofType = 'flat',
  showFurniture = true,
  showWindows = true,
  showTrees = false,
  interiorLightIntensity = 3.5,
  exteriorLightIntensity = 3.5,
  onUpdateFinishingSettings,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'palette' | 'inspector' | 'finishing' | 'list'>('palette');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedElement = elements.find((e) => e.id === selectedElementId) || null;

  const categories = [
    { id: 'all', label: `الكل (${toArabicDigits(SITE_ELEMENT_DEFINITIONS.length)})` },
    { id: 'safety', label: '🛡️ معدات السلامة والدفاع المدني' },
    { id: 'equipment', label: 'المعدات والمولدات' },
    { id: 'sidewalks', label: 'الأرصفة والممرات' },
    { id: 'signage_flags', label: 'اللافتات والأعلام' },
    { id: 'openings', label: 'أبواب ونوافذ' },
    { id: 'roof', label: 'السطح والخزانات' },
    { id: 'structure', label: 'الهياكل والإنارة' },
    { id: 'site', label: 'الساحات والبيئة' },
  ];

  const filteredDefs = SITE_ELEMENT_DEFINITIONS.filter((def) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = def.nameAr.toLowerCase().includes(q);
      const matchDesc = def.description.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }

    if (activeCategory === 'all') return true;
    if (activeCategory === 'sidewalks') return def.category === 'sidewalks';
    if (activeCategory === 'signage_flags') return def.category === 'signage_flags';
    if (activeCategory === 'equipment') return def.category === 'equipment';
    if (activeCategory === 'safety') return def.category === 'safety';
    if (activeCategory === 'openings') return def.category === 'openings';
    if (activeCategory === 'roof') return def.defaultMount === 'roof' || def.type === 'solar_panel' || def.type === 'helipad' || def.type === 'water_tank_roof' || def.type === 'hvac_chiller' || def.type === 'satellite_dish';
    if (activeCategory === 'structure') return def.category === 'structure';
    if (activeCategory === 'site') return def.category === 'site';
    return true;
  });



  // Drag start handler for HTML5 drag-and-drop onto 3D canvas
  const handleDragStart = (e: React.DragEvent, type: CustomSiteElementType) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('application/site-element-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`absolute top-2 sm:top-3 right-2 sm:right-3 bottom-2 sm:bottom-3 left-2 sm:left-auto sm:w-96 max-w-[calc(100%-1rem)] sm:max-w-none z-30 flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden ${
        isNightMode
          ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-black/80'
          : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/40'
      }`}
      dir="rtl"
    >
      {/* HEADER: Title, DB Live Status, Close */}
      <div className={`p-3.5 border-b flex items-center justify-between gap-2 shrink-0 ${
        isNightMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm flex items-center gap-1.5 leading-tight">
              <span>المحرر الهندسي التفاعلي</span>
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>قاعدة البيانات المركزية (Firestore) متصلة</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleOpen}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isNightMode
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-200'
            }`}
            title="إخفاء لوحة المحرر"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TOP SUB-NAV TABS (Palette, Inspector, Finishing, Elements List) */}
      <div className={`px-2 pt-2 pb-1.5 border-b flex items-center gap-1 shrink-0 ${
        isNightMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-slate-50/40'
      }`}>
        <button
          type="button"
          onClick={() => setActiveTab('palette')}
          className={`flex-1 py-1 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'palette'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : isNightMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="كتالوج إضافة العناصر والمعدات"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>العناصر</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-1 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer relative ${
            activeTab === 'inspector'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : isNightMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="تعديل الأبعاد والإحداثيات"
        >
          <Move className="w-3.5 h-3.5" />
          <span>الإحداثيات</span>
          {selectedElement && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('finishing')}
          className={`flex-1 py-1 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'finishing'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : isNightMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="تخصيص الهيكل، السطح، والإنارة"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>الهيكل</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`py-1 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'list'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : isNightMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="قائمة العناصر المضافة للمبنى"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">{toArabicDigits(elements.length)}</span>
        </button>
      </div>

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
        {/* ================================================================= */}
        {/* TAB 1: PALETTE (قائمة العناصر الملحقة القابلة للسحب والإفلات) */}
        {/* ================================================================= */}
        {activeTab === 'palette' && (
          <div className="space-y-2.5">
            {/* Search Input Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في العناصر الهندسية والمعدات..."
                className={`w-full py-1.5 pr-8 pl-8 rounded-xl text-xs border outline-none transition ${
                  isNightMode
                    ? 'bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-amber-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-amber-500'
                }`}
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer border ${
                    activeCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : isNightMode
                      ? 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Hint for Drag and Drop */}
            <div className={`p-2.5 rounded-2xl border flex items-center gap-2 text-[11px] ${
              isNightMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <Move className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
              <span>
                <strong>طريقتان للإضافة:</strong> اسحب العنصر وأفلته مباشرة فوق مجسم المبنى، أو اضغط زر الإضافة الفورية.
              </span>
            </div>

            {/* Elements Grid Cards */}
            <div className="grid grid-cols-1 gap-2">
              {filteredDefs.map((def) => {
                const IconComp = ICON_MAP[def.iconName] || Square;
                const isSolar = def.type === 'solar_panel';
                const isHelipad = def.type === 'helipad';
                const isCivilDefense = def.type === 'fire_foam_monitor' || def.type === 'muster_first_aid_station' || def.type === 'emergency_siren_pole';

                return (
                  <div
                    key={def.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, def.type)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:scale-[1.01] flex items-center justify-between gap-2.5 ${
                      isNightMode
                        ? 'bg-slate-800/50 border-slate-700/70 hover:border-amber-500/50 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200/80 hover:border-amber-500/50 hover:bg-white shadow-sm'
                    } ${isSolar ? 'border-amber-500/40 bg-amber-500/5' : ''} ${isCivilDefense ? 'border-rose-500/40 bg-rose-500/5' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSolar
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : isCivilDefense
                          ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                          : isHelipad
                          ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                          : isNightMode
                          ? 'bg-slate-700/60 text-amber-400 border-slate-600'
                          : 'bg-white text-amber-600 border-slate-200 shadow-sm'
                      }`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5">
                          <span>{def.nameAr}</span>
                          {isSolar && (
                            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded text-[9px] font-black">
                              جديد
                            </span>
                          )}
                          {isCivilDefense && (
                            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded text-[9px] font-black">
                              دفاع مدني
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] truncate ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {def.defaultMount === 'roof' ? 'تثبيت بالسطح' : def.defaultMount === 'wall' ? 'تثبيت بالواجهة' : 'تثبيت بالأرض'}
                          {' • '}
                          {toArabicDigits(def.defaultSize.x)}×{toArabicDigits(def.defaultSize.z)}م
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onAddElement(def.type, { mountTarget: def.defaultMount });
                          setActiveTab('inspector');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                        title="إضافة العنصر للمبنى فوراً"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: INSPECTOR (تحديد الإحداثيات والأبعاد الدقيقة) */}
        {/* ================================================================= */}
        {activeTab === 'inspector' && (
          <div className="space-y-3.5">
            {selectedElement ? (
              <>
                {/* Selected Element Header */}
                <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isNightMode ? 'bg-slate-800/80 border-amber-500/40' : 'bg-amber-50/80 border-amber-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                      <Move className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{selectedElement.name}</div>
                      <div className="text-[10px] text-amber-500 font-mono">
                        معرّف: {selectedElement.id.slice(0, 10)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDuplicateElement(selectedElement.id)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isNightMode ? 'hover:bg-slate-700 text-slate-300 border-slate-700' : 'hover:bg-white text-slate-700 border-slate-200'
                      }`}
                      title="نسخ وتكرار العنصر"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteElement(selectedElement.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/40 transition cursor-pointer"
                      title="حذف العنصر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Snap Placement Presets */}
                <div className="space-y-1.5">
                  <div className={`font-bold text-[11px] ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    التثبيت الذكي التلقائي:
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateElement({
                          ...selectedElement,
                          position: { ...selectedElement.position, y: roofHeight },
                          mountTarget: 'roof',
                        });
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition text-center cursor-pointer ${
                        Math.abs(selectedElement.position.y - roofHeight) < 0.2
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : isNightMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      سطح المبنى 🏢
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateElement({
                          ...selectedElement,
                          position: { ...selectedElement.position, y: 0 },
                          mountTarget: 'ground',
                        });
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition text-center cursor-pointer ${
                        Math.abs(selectedElement.position.y) < 0.1
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : isNightMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      مستوى الأرض 🌍
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateElement({
                          ...selectedElement,
                          position: { ...selectedElement.position, z: buildingDepth / 2 },
                          mountTarget: 'wall',
                        });
                      }}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition text-center cursor-pointer ${
                        Math.abs(selectedElement.position.z - buildingDepth / 2) < 0.3
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : isNightMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      الواجهة الأمامية 🚪
                    </button>
                  </div>
                </div>

                {/* XYZ Coordinates Precision Sliders */}
                <div className={`p-3 rounded-2xl border space-y-2.5 ${
                  isNightMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <Move className="w-3.5 h-3.5 text-amber-500" />
                      <span>إحداثيات الموقع (X, Y, Z بالمتر):</span>
                    </span>
                  </div>

                  {/* X Position (East / West) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">موقع X (شرق / غرب):</span>
                      <span className="font-mono font-bold text-amber-500">
                        {toArabicDigits(selectedElement.position.x.toFixed(2))} م
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={-Math.max(20, buildingWidth * 1.5)}
                        max={Math.max(20, buildingWidth * 1.5)}
                        step="0.2"
                        value={selectedElement.position.x}
                        onChange={(e) => {
                          onUpdateElement({
                            ...selectedElement,
                            position: { ...selectedElement.position, x: parseFloat(e.target.value) },
                          });
                        }}
                        className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                      <input
                        type="number"
                        step="0.2"
                        value={selectedElement.position.x}
                        onChange={(e) => {
                          onUpdateElement({
                            ...selectedElement,
                            position: { ...selectedElement.position, x: parseFloat(e.target.value) || 0 },
                          });
                        }}
                        className={`w-14 p-1 text-center font-mono rounded-lg border text-[11px] ${
                          isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Y Position (Vertical Altitude) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">الارتفاع الرأسي Y:</span>
                      <span className="font-mono font-bold text-emerald-500">
                        {toArabicDigits(selectedElement.position.y.toFixed(2))} م
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={roofHeight + 6}
                        step="0.2"
                        value={selectedElement.position.y}
                        onChange={(e) => {
                          onUpdateElement({
                            ...selectedElement,
                            position: { ...selectedElement.position, y: parseFloat(e.target.value) },
                          });
                        }}
                        className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                      <input
                        type="number"
                        step="0.2"
                        value={selectedElement.position.y}
                        onChange={(e) => {
                          onUpdateElement({
                            ...selectedElement,
                            position: { ...selectedElement.position, y: parseFloat(e.target.value) || 0 },
                          });
                        }}
                        className={`w-14 p-1 text-center font-mono rounded-lg border text-[11px] ${
                          isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Z Position (North / South) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">موقع Z (شمال / جنوب):</span>
                      <span className="font-mono font-bold text-sky-500">
                        {toArabicDigits(selectedElement.position.z.toFixed(2))} م
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={-Math.max(20, buildingDepth * 1.5)}
                        max={Math.max(20, buildingDepth * 1.5)}
                        step="0.2"
                        value={selectedElement.position.z}
                        onChange={(e) => {
                          onUpdateElement({
                            ...selectedElement,
                            position: { ...selectedElement.position, z: parseFloat(e.target.value) },
                          });
                        }}
                        className="flex-1 accent-sky-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                      <input
                        type="number"
                        step="0.2"
                        value={selectedElement.position.z}
                        onChange={(e) => {
                          onUpdateElement({
                            ...selectedElement,
                            position: { ...selectedElement.position, z: parseFloat(e.target.value) || 0 },
                          });
                        }}
                        className={`w-14 p-1 text-center font-mono rounded-lg border text-[11px] ${
                          isNightMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Rotation & Angle */}
                <div className={`p-3 rounded-2xl border space-y-2 ${
                  isNightMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5 text-amber-500" />
                      <span>زاوية الدوران الأفقي:</span>
                    </span>
                    <span className="font-mono font-bold text-amber-500">
                      {toArabicDigits(Math.round(selectedElement.rotationY || 0))}°
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={selectedElement.rotationY || 0}
                    onChange={(e) => {
                      onUpdateElement({
                        ...selectedElement,
                        rotationY: parseInt(e.target.value, 10),
                      });
                    }}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />

                  {/* Quick Angle Snap Buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => {
                          onUpdateElement({
                            ...selectedElement,
                            rotationY: deg,
                          });
                        }}
                        className={`py-1 rounded-lg text-[10px] font-mono font-bold border transition cursor-pointer ${
                          Math.round(selectedElement.rotationY || 0) === deg
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : isNightMode
                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale / Dimensions */}
                <div className={`p-3 rounded-2xl border space-y-2 ${
                  isNightMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>مقياس الحجم (المضاعف الهندسي):</span>
                    </span>
                    <span className="font-mono font-bold text-amber-500">
                      {toArabicDigits((selectedElement.scale?.x || 1).toFixed(2))}x
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.3"
                      max="3.0"
                      step="0.1"
                      value={selectedElement.scale?.x || 1}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onUpdateElement({
                          ...selectedElement,
                          scale: { x: val, y: val, z: val },
                        });
                      }}
                      className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateElement({
                          ...selectedElement,
                          scale: { x: 1, y: 1, z: 1 },
                        });
                      }}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                        isNightMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="إعادة تعيين المقياس إلى 100%"
                    >
                      إعادة
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={`p-6 text-center rounded-2xl border space-y-2 ${
                isNightMode ? 'bg-slate-800/30 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <Move className="w-8 h-8 mx-auto text-amber-500 opacity-60 animate-bounce" />
                <div className="font-bold text-xs text-slate-200">لم يتم تحديد أي عنصر للتحكم</div>
                <p className="text-[11px] max-w-xs mx-auto">
                  انقر مباشرة على أي عنصر في مجسم المبنى ثلاثي الأبعاد أو اختر عنصراً من تبويب قائمة العناصر لتعديل إحداثياته وموقعه.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('palette')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow"
                >
                  إضافة عنصر جديد +
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: FINISHING & STRUCTURE (تخصيص الهيكل، السطح، والإنارة) */}
        {/* ================================================================= */}
        {activeTab === 'finishing' && (
          <div className="space-y-3.5">
            <div className={`p-3 rounded-2xl border ${
              isNightMode ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-500 mb-2.5">
                <Building2 className="w-4 h-4" />
                <span>الهيكل المعماري والسطح</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`block font-bold mb-1 text-[11px] ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>النمط المعماري:</label>
                  <select
                    value={archStyle}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      onUpdateFinishingSettings?.({ archStyle: val });
                    }}
                    className={`w-full border rounded-xl p-2 font-bold outline-none cursor-pointer transition-colors text-xs ${
                      isNightMode
                        ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                        : 'bg-white border-slate-300 text-slate-800 focus:border-amber-600'
                    }`}
                  >
                    <option value="modern">حديث مع واجهات زجاجية (Modern Glass)</option>
                    <option value="classic">كلاسيكي حجري (Classic Stone)</option>
                    <option value="industrial">صناعي متطور (Industrial Frame)</option>
                    <option value="minimalist">بسيط وأنيق (Minimalist White)</option>
                  </select>
                </div>

                <div>
                  <label className={`block font-bold mb-1 text-[11px] ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>نوع السطح والتصميم:</label>
                  <select
                    value={roofType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      onUpdateFinishingSettings?.({ roofType: val });
                    }}
                    className={`w-full border rounded-xl p-2 font-bold outline-none cursor-pointer transition-colors text-xs ${
                      isNightMode
                        ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                        : 'bg-white border-slate-300 text-slate-800 focus:border-amber-600'
                    }`}
                  >
                    <option value="flat">سطح مسطح (سطح مستوي)</option>
                    <option value="flat_parapet">سطح مسطح مع سياج السطح</option>
                    <option value="gabled">سطح مثلث مائل الشكل (مخصص للجملونات)</option>
                    <option value="pitched_tile">سطح من القرميد مائل الشكل</option>
                    <option value="garden">سطح حديقة خضراء (Roof Garden)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Display and Environment Toggles */}
            <div className={`p-3 rounded-2xl border space-y-2.5 ${
              isNightMode ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="font-bold text-[11px] text-amber-500 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>خيارات العرض والبيئة</span>
              </div>

              <label className={`flex items-center gap-2 cursor-pointer text-xs ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={showFurniture}
                  onChange={(e) => {
                    onUpdateFinishingSettings?.({ showFurniture: e.target.checked });
                  }}
                  className="rounded border-slate-400 accent-amber-500"
                />
                <span>إظهار الأثاث والمعدات الداخلية</span>
              </label>

              <label className={`flex items-center gap-2 cursor-pointer text-xs ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={showWindows}
                  onChange={(e) => {
                    onUpdateFinishingSettings?.({ showWindows: e.target.checked });
                  }}
                  className="rounded border-slate-400 accent-amber-500"
                />
                <span>نوافذ وواجهات زجاجية شفافة</span>
              </label>

              <label className={`flex items-center gap-2 cursor-pointer text-xs ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={showTrees}
                  onChange={(e) => {
                    onUpdateFinishingSettings?.({ showTrees: e.target.checked });
                  }}
                  className="rounded border-slate-400 accent-amber-500"
                />
                <span>إظهار المحيط والبيئة الميدانية (أشجار)</span>
              </label>
            </div>

            {/* Lighting Intensity Controls */}
            <div className={`p-3 rounded-2xl border space-y-3 ${
              isNightMode ? 'bg-slate-800/40 border-slate-700/60 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between font-bold text-[11px] text-amber-500">
                <span className="flex items-center gap-1.5">
                  <SunMedium className="w-3.5 h-3.5" />
                  التحكم بشدة وسطوع الإنارة
                </span>
              </div>

              {/* Interior Lighting */}
              <div>
                <div className="flex items-center justify-between mb-1 font-bold text-[11px]">
                  <span className={`flex items-center gap-1.5 ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    الإنارة الداخلية:
                  </span>
                  <span className="font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.2 rounded text-[10px]">
                    {toArabicDigits((interiorLightIntensity || 3.5).toFixed(1))}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={interiorLightIntensity || 3.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateFinishingSettings?.({ interiorLightIntensity: val });
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
              </div>

              {/* Exterior Lighting */}
              <div>
                <div className="flex items-center justify-between mb-1 font-bold text-[11px]">
                  <span className={`flex items-center gap-1.5 ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <SunMedium className="w-3.5 h-3.5 text-sky-400" />
                    الإنارة الخارجية:
                  </span>
                  <span className="font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.2 rounded text-[10px]">
                    {toArabicDigits((exteriorLightIntensity || 3.5).toFixed(1))}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={exteriorLightIntensity || 3.5}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateFinishingSettings?.({ exteriorLightIntensity: val });
                  }}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: PLACED ELEMENTS LIST (قائمة كافة العناصر المضافة على المبنى) */}
        {/* ================================================================= */}
        {activeTab === 'list' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bold text-[11px] pb-1">
              <span>العناصر الملحقة الحالية ({toArabicDigits(elements.length)}):</span>
              <button
                type="button"
                onClick={() => onSelectElement(null)}
                className={`text-[10px] cursor-pointer hover:underline ${
                  isNightMode ? 'text-amber-400' : 'text-amber-600'
                }`}
              >
                إلغاء التحديد
              </button>
            </div>

            {elements.length === 0 ? (
              <div className={`p-6 text-center rounded-2xl border space-y-2 ${
                isNightMode ? 'bg-slate-800/30 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <Layers className="w-8 h-8 mx-auto text-amber-500 opacity-60" />
                <div className="font-bold text-xs">لا توجد عناصر مضافة حتى الآن</div>
                <p className="text-[10px]">
                  استخدم تبويب "إضافة عناصر" لإسقاط الأبواب، النوافذ، الألواح الشمسية، أو المهابط.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {elements.map((el) => {
                  const isSel = el.id === selectedElementId;
                  const def = SITE_ELEMENT_DEFINITIONS.find((d) => d.type === el.type);
                  const IconComp = def ? ICON_MAP[def.iconName] || Square : Square;

                  return (
                    <div
                      key={el.id}
                      onClick={() => {
                        onSelectElement(el.id);
                        setActiveTab('inspector');
                      }}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSel
                          ? isNightMode
                            ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg'
                            : 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm'
                          : isNightMode
                          ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSel
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : isNightMode
                            ? 'bg-slate-700 text-amber-400 border-slate-600'
                            : 'bg-white text-amber-600 border-slate-200'
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{el.name}</div>
                          <div className="text-[10px] opacity-70 font-mono">
                            X: {toArabicDigits(el.position.x.toFixed(1))}م | Y: {toArabicDigits(el.position.y.toFixed(1))}م | Z: {toArabicDigits(el.position.z.toFixed(1))}م
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateElement(el.id);
                          }}
                          className={`p-1 rounded-lg border transition cursor-pointer ${
                            isNightMode ? 'hover:bg-slate-700 text-slate-300 border-slate-700' : 'hover:bg-white text-slate-700 border-slate-200'
                          }`}
                          title="تكرار"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteElement(el.id);
                          }}
                          className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/40 transition cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER: Database Realtime Automatic Sync Indicator (No Manual Button) */}
      <div className={`p-2.5 border-t flex items-center justify-between gap-2 shrink-0 ${
        isNightMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
      }`}>
        <div className="flex items-center gap-1.5 text-[11px]">
          <Cloud className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className={`font-semibold ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
            قاعدة البيانات (Firestore):
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          {isSavingDatabase ? (
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <div className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>جارٍ الحفظ التلقائي...</span>
            </span>
          ) : (
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>محفوظ ومحدث تلقائياً</span>
              {lastSavedTime && (
                <span className="text-[10px] font-mono text-slate-400">({lastSavedTime})</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
