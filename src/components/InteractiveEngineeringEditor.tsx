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
} from 'lucide-react';
import { CustomSiteElement, CustomSiteElementType } from '../types';
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
  onSaveToDatabase: () => Promise<void> | void;
  isSavingDatabase?: boolean;
  lastSavedTime?: string;
  roofHeight: number;
  buildingWidth: number;
  buildingDepth: number;
  isNightMode?: boolean;
  theme?: string;
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
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'roof' | 'openings' | 'site' | 'structure'>('all');
  const [activeTab, setActiveTab] = useState<'palette' | 'inspector' | 'list'>('palette');
  const [isSyncSuccess, setIsSyncSuccess] = useState(false);

  const selectedElement = elements.find((e) => e.id === selectedElementId) || null;

  const categories = [
    { id: 'all', label: 'الكل' },
    { id: 'roof', label: 'السطح والمبنى' },
    { id: 'openings', label: 'أبواب ونوافذ' },
    { id: 'site', label: 'المحيط والساحات' },
    { id: 'structure', label: 'الإنارة والهياكل' },
  ];

  const filteredDefs = SITE_ELEMENT_DEFINITIONS.filter((def) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'roof') return def.type === 'solar_panel' || def.type === 'helipad';
    if (activeCategory === 'openings') return def.category === 'openings';
    if (activeCategory === 'site') return def.type === 'fountain' || def.type === 'street' || def.type === 'parking_open' || def.type === 'parking_covered' || def.type === 'garden';
    if (activeCategory === 'structure') return def.type === 'light_pole' || def.type === 'concrete_column' || def.type === 'fire_escape';
    return true;
  });

  const handleManualSave = async () => {
    await onSaveToDatabase();
    setIsSyncSuccess(true);
    setTimeout(() => setIsSyncSuccess(false), 2500);
  };

  // Drag start handler for HTML5 drag-and-drop onto 3D canvas
  const handleDragStart = (e: React.DragEvent, type: CustomSiteElementType) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('application/site-element-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className={`absolute top-4 right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-2xl font-bold text-xs shadow-xl backdrop-blur-md border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
          isNightMode
            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20 hover:bg-amber-400'
            : 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30 hover:bg-amber-400'
        }`}
        title="فتح المحرر الهندسي التفاعلي لسحب وإفلات العناصر"
      >
        <Sliders className="w-4 h-4" />
        <span>المحرر الهندسي التفاعلي</span>
        {elements.length > 0 && (
          <span className="px-1.5 py-0.2 bg-slate-950 text-amber-400 rounded-full text-[10px] font-mono">
            {toArabicDigits(elements.length)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`absolute top-3 right-3 bottom-3 z-30 w-84 sm:w-96 flex flex-col rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden ${
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

      {/* TOP SUB-NAV TABS (Palette, Inspector, Elements List) */}
      <div className={`px-3 pt-2 pb-1.5 border-b flex items-center gap-1 shrink-0 ${
        isNightMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-slate-50/40'
      }`}>
        <button
          onClick={() => setActiveTab('palette')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'palette'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : isNightMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة عناصر</span>
        </button>

        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'inspector'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : isNightMode
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          <span>الإحداثيات والأبعاد</span>
          {selectedElement && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
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
          <div className="space-y-3">
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

                return (
                  <div
                    key={def.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, def.type)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing hover:scale-[1.01] flex items-center justify-between gap-2.5 ${
                      isNightMode
                        ? 'bg-slate-800/50 border-slate-700/70 hover:border-amber-500/50 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200/80 hover:border-amber-500/50 hover:bg-white shadow-sm'
                    } ${isSolar ? 'border-amber-500/40 bg-amber-500/5' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSolar
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
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
        {/* TAB 3: PLACED ELEMENTS LIST (قائمة كافة العناصر المضافة على المبنى) */}
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

      {/* FOOTER: Database Realtime Sync Indicator & Manual Save Button */}
      <div className={`p-3 border-t flex flex-col gap-2 shrink-0 ${
        isNightMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
      }`}>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Cloud className="w-3 h-3 text-sky-400" />
            <span>حفظ الإحداثيات السحابي:</span>
          </span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            {isSyncSuccess ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>تم الحفظ في Firestore بنجاح!</span>
              </>
            ) : (
              <span>مزامنة فورية نشطة</span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={handleManualSave}
          disabled={isSavingDatabase}
          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md ${
            isSyncSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black'
          }`}
        >
          {isSavingDatabase ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>جارٍ الحفظ في قاعدة البيانات المركزية...</span>
            </>
          ) : isSyncSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>تم تحديث قاعدة البيانات المركزية!</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4" />
              <span>تحديث وحفظ الإحداثيات في قاعدة البيانات</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
