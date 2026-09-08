import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Building,
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
  MapPin,
  Move,
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
  Volume2,
} from 'lucide-react';
import { CustomSiteElement, CustomSiteElementType } from '../types';
import { SITE_ELEMENT_DEFINITIONS, SiteElementDefinition } from '../utils/customSiteElements3D';
import { toArabicDigits } from '../utils/arabicUtils';

interface SiteElementsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddElement: (type: CustomSiteElementType, options?: { mountTarget?: 'ground' | 'roof' | 'wall' }) => void;
  existingElements?: CustomSiteElement[];
  currentElements?: CustomSiteElement[];
  onSelectElement: (id: string) => void;
  onDeleteElement?: (id: string) => void;
  selectedElementId?: string | null;
  isNightMode?: boolean;
  buildingHeight?: number;
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
  Move,
  Layers,
  Volume2,
};

export const SiteElementsManagerModal: React.FC<SiteElementsManagerModalProps> = ({
  isOpen,
  onClose,
  onAddElement,
  existingElements: propExistingElements,
  currentElements,
  onSelectElement,
  onDeleteElement = (_id: string) => {},
  selectedElementId,
  isNightMode = false,
  buildingHeight = 6,
}) => {
  const existingElements = propExistingElements || currentElements || [];
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [helipadPlacement, setHelipadPlacement] = useState<'roof' | 'ground'>('roof');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: `كافة العناصر (${toArabicDigits(SITE_ELEMENT_DEFINITIONS.length)})` },
    { id: 'safety', label: '🛡️ السلامة والدفاع المدني' },
    { id: 'sidewalks', label: 'الأرصفة والممرات' },
    { id: 'signage_flags', label: 'اللافتات والأعلام' },
    { id: 'equipment', label: 'المعدات والمنظومات' },
    { id: 'openings', label: 'الأبواب والنوافذ' },
    { id: 'structure', label: 'الهياكل والأعمدة' },
    { id: 'site', label: 'الساحات والمحيط' },
  ];

  const filteredDefs = SITE_ELEMENT_DEFINITIONS.filter(
    (def) => activeCategory === 'all' || def.category === activeCategory
  );

  const handleAdd = (def: SiteElementDefinition) => {
    let mount: 'ground' | 'roof' | 'wall' = def.defaultMount;
    if (def.type === 'helipad') {
      mount = helipadPlacement;
    }
    onAddElement(def.type, { mountTarget: mount });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in select-none">
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
          isNightMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between ${
            isNightMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">إضافة معالم ومرافق للموقع الخارجي والمعماري</h3>
              <p className="text-xs text-slate-400">
                اختر أي عنصر لإضافته إلى المشهد مع إمكانية تحريكه وتحديد أبعاده يدوياً بالسحب
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isNightMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div
          className={`p-3 border-b flex flex-wrap items-center gap-2 text-xs font-bold overflow-x-auto ${
            isNightMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-white'
          }`}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : isNightMode
                  ? 'bg-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Modal Body: Grid of Element Cards */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Helipad Placement Option Preview */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
              isNightMode ? 'bg-slate-950/80 border-slate-800' : 'bg-amber-50/70 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-amber-500" />
              <span className="font-bold">تحديد موضع المهبط عند الإضافة:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHelipadPlacement('roof')}
                className={`px-3 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  helipadPlacement === 'roof'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                    : isNightMode
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                فوق السطح ({toArabicDigits(buildingHeight.toFixed(1))} م)
              </button>
              <button
                onClick={() => setHelipadPlacement('ground')}
                className={`px-3 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  helipadPlacement === 'ground'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                    : isNightMode
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                أرضي بجانب البناء
              </button>
            </div>
          </div>

          {/* Elements Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredDefs.map((def) => {
              const IconComp = ICON_MAP[def.iconName] || Building;
              return (
                <div
                  key={def.type}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all hover:border-amber-400 hover:shadow-md ${
                    isNightMode
                      ? 'bg-slate-950/50 border-slate-800 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/25">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                        {def.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm">{def.nameAr}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        {def.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAdd(def)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة إلى المشهد</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Currently Placed Elements List */}
          {existingElements.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <h4 className="font-bold text-xs text-amber-500 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>العناصر المضافة حالياً في المشهد ({toArabicDigits(existingElements.length)}):</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {existingElements.map((el) => {
                  const def = SITE_ELEMENT_DEFINITIONS.find((d) => d.type === el.type);
                  const IconComp = def ? ICON_MAP[def.iconName] || Building : Building;
                  const isSelected = selectedElementId === el.id;

                  return (
                    <div
                      key={el.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15'
                          : isNightMode
                          ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        onClick={() => {
                          onSelectElement(el.id);
                          onClose();
                        }}
                        className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <p className="font-bold truncate">{el.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            X:{el.position.x.toFixed(1)} Y:{el.position.y.toFixed(1)} Z:{el.position.z.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onSelectElement(el.id);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-500 cursor-pointer"
                          title="تحديد وتحريك"
                        >
                          <Move className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteElement(el.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                          title="حذف العنصر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
