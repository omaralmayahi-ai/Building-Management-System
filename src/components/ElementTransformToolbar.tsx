import React, { useState } from 'react';
import {
  Move,
  RotateCw,
  Maximize2,
  Trash2,
  Copy,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsUp,
  ChevronsDown,
  Sliders,
  Check,
} from 'lucide-react';
import { CustomSiteElement } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';

interface ElementTransformToolbarProps {
  element: CustomSiteElement;
  onUpdate?: (updated: CustomSiteElement) => void;
  onUpdateElement?: (updated: CustomSiteElement) => void;
  onDelete?: (id: string) => void;
  onDeleteElement?: (id: string) => void;
  onDuplicate?: (element: CustomSiteElement) => void;
  onDuplicateElement?: (element: CustomSiteElement) => void;
  onClose?: () => void;
  onDeselect?: () => void;
  roofHeight?: number;
  isNightMode?: boolean;
}

export const ElementTransformToolbar: React.FC<ElementTransformToolbarProps> = ({
  element,
  onUpdate,
  onUpdateElement: propOnUpdateElement,
  onDelete,
  onDeleteElement: propOnDeleteElement,
  onDuplicate,
  onDuplicateElement: propOnDuplicateElement,
  onClose,
  onDeselect: propOnDeselect,
  roofHeight = 6,
  isNightMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'position' | 'scale' | 'rotation'>('position');

  const handleUpdate = propOnUpdateElement || onUpdate || (() => {});
  const handleDelete = propOnDeleteElement || onDelete || (() => {});
  const handleDuplicate = propOnDuplicateElement || onDuplicate || (() => {});
  const handleClose = propOnDeselect || onClose || (() => {});

  const posX = typeof element.position?.x === 'number' ? element.position.x : 0;
  const posY = typeof element.position?.y === 'number' ? element.position.y : 0;
  const posZ = typeof element.position?.z === 'number' ? element.position.z : 0;
  const scaleX = typeof element.scale?.x === 'number' ? element.scale.x : 1;
  const scaleY = typeof element.scale?.y === 'number' ? element.scale.y : 1;
  const scaleZ = typeof element.scale?.z === 'number' ? element.scale.z : 1;
  const rotY = typeof element.rotationY === 'number' ? element.rotationY : 0;
  const safeRoofHeight = typeof roofHeight === 'number' && !isNaN(roofHeight) ? roofHeight : 6;

  const updatePos = (axis: 'x' | 'y' | 'z', value: number) => {
    handleUpdate({
      ...element,
      position: {
        x: posX,
        y: posY,
        z: posZ,
        [axis]: value,
      },
    });
  };

  const updateScale = (axis: 'x' | 'y' | 'z', value: number) => {
    handleUpdate({
      ...element,
      scale: {
        x: scaleX,
        y: scaleY,
        z: scaleZ,
        [axis]: Math.max(0.2, value),
      },
    });
  };

  const updateUniformScale = (factor: number) => {
    handleUpdate({
      ...element,
      scale: {
        x: Math.max(0.2, factor),
        y: Math.max(0.2, factor),
        z: Math.max(0.2, factor),
      },
    });
  };

  const updateRotation = (deg: number) => {
    handleUpdate({
      ...element,
      rotationY: deg % 360,
    });
  };

  // Nudge step for D-pad
  const nudge = (dx: number, dz: number) => {
    handleUpdate({
      ...element,
      position: {
        x: posX + dx,
        y: posY,
        z: posZ + dz,
      },
    });
  };

  return (
    <div
      className={`absolute bottom-3 right-3 left-3 sm:left-auto sm:w-88 z-30 backdrop-blur-md rounded-2xl border p-4 shadow-2xl space-y-3 text-xs animate-in fade-in slide-in-from-bottom-2 transition-colors select-none ${
        isNightMode
          ? 'bg-card/95 border-brand-200 text-slate-800'
          : 'bg-card/95 border-brand-200 text-slate-800'
      }`}
    >
      {/* Header with Title and Quick Actions */}
      <div className="flex items-center justify-between border-b pb-2.5 border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-100 text-brand-700 font-bold">
            <Move className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-sm text-brand-700">{element.name || 'عنصر بالموقع'}</h4>
            <span className="text-[10px] text-slate-500 font-mono">
              X: {toArabicDigits(posX.toFixed(1))} | Y: {toArabicDigits(posY.toFixed(1))} | Z:{' '}
              {toArabicDigits(posZ.toFixed(1))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleDuplicate(element)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
            title="تكرار هذا العنصر"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(element.id)}
            className="p-1.5 rounded-lg hover:bg-rose-600/20 text-rose-600 hover:text-rose-600 cursor-pointer"
            title="حذف هذا العنصر"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
            title="إلغاء التحديد"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Tabs: Position, Scale, Rotation */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-card/60 border border-slate-200 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('position')}
          className={`py-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'position' ? 'bg-brand-700 text-on-brand shadow' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Move className="w-3 h-3" />
          <span>الموقع</span>
        </button>
        <button
          onClick={() => setActiveTab('scale')}
          className={`py-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'scale' ? 'bg-brand-700 text-on-brand shadow' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Maximize2 className="w-3 h-3" />
          <span>الحجم</span>
        </button>
        <button
          onClick={() => setActiveTab('rotation')}
          className={`py-1 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'rotation' ? 'bg-brand-700 text-on-brand shadow' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <RotateCw className="w-3 h-3" />
          <span>الدوران</span>
        </button>
      </div>

      {/* TAB 1: POSITION CONTROLLER */}
      {activeTab === 'position' && (
        <div className="space-y-2.5">
          {/* Snap Height Presets (Ground vs Roof) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => updatePos('y', 0)}
              className={`flex-1 py-1 px-2 rounded-lg font-bold text-[10px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                posY === 0
                  ? 'bg-brand-700 text-on-brand border-brand-200 font-black'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ChevronsDown className="w-3 h-3" />
              <span>تثبيت على الأرض</span>
            </button>
            <button
              onClick={() => updatePos('y', safeRoofHeight)}
              className={`flex-1 py-1 px-2 rounded-lg font-bold text-[10px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                Math.abs(posY - safeRoofHeight) < 0.1
                  ? 'bg-brand-700 text-on-brand border-brand-200 font-black'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ChevronsUp className="w-3 h-3" />
              <span>فوق السطح ({toArabicDigits(safeRoofHeight.toFixed(1))} م)</span>
            </button>
          </div>

          {/* X Axis Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-slate-500">الإزاحة الأفقية (X):</span>
              <span className="font-mono text-brand-700">{toArabicDigits(posX.toFixed(1))} م</span>
            </div>
            <input
              type="range"
              min="-35"
              max="35"
              step="0.5"
              value={posX}
              onChange={(e) => updatePos('x', parseFloat(e.target.value) || 0)}
              className="w-full accent-brand-700 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
            />
          </div>

          {/* Y Axis Slider (Elevation) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-slate-500">الارتفاع الرأسي (Y):</span>
              <span className="font-mono text-emerald-600">{toArabicDigits(posY.toFixed(1))} م</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="0.2"
              value={posY}
              onChange={(e) => updatePos('y', parseFloat(e.target.value) || 0)}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
            />
          </div>

          {/* Z Axis Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-slate-500">الإزاحة الطولية (Z):</span>
              <span className="font-mono text-sky-600">{toArabicDigits(posZ.toFixed(1))} م</span>
            </div>
            <input
              type="range"
              min="-35"
              max="35"
              step="0.5"
              value={posZ}
              onChange={(e) => updatePos('z', parseFloat(e.target.value) || 0)}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
            />
          </div>

          {/* Quick D-Pad Nudge Buttons */}
          <div className="flex items-center justify-center gap-1 pt-1">
            <button
              onClick={() => nudge(-1, 0)}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200 cursor-pointer"
            >
              يسار -1م
            </button>
            <button
              onClick={() => nudge(0, -1)}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200 cursor-pointer"
            >
              للأمام -1م
            </button>
            <button
              onClick={() => nudge(0, 1)}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200 cursor-pointer"
            >
              للخلف +1م
            </button>
            <button
              onClick={() => nudge(1, 0)}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200 cursor-pointer"
            >
              يمين +1م
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SCALE / DIMENSIONS CONTROLLER */}
      {activeTab === 'scale' && (
        <div className="space-y-2.5">
          {/* Uniform Scale Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-brand-700 font-bold">المقياس العام الموحد:</span>
              <span className="font-mono text-brand-700">{toArabicDigits(((scaleX || 1) * 100).toFixed(0))}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="3.0"
              step="0.1"
              value={scaleX || 1}
              onChange={(e) => updateUniformScale(parseFloat(e.target.value) || 1)}
              className="w-full accent-brand-700 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
            />
          </div>

          {/* Width (Scale X) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-slate-500">العرض (مقياس X):</span>
              <span className="font-mono text-slate-800">{toArabicDigits((scaleX || 1).toFixed(2))}×</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="4.0"
              step="0.1"
              value={scaleX || 1}
              onChange={(e) => updateScale('x', parseFloat(e.target.value) || 1)}
              className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
            />
          </div>

          {/* Height (Scale Y) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-slate-500">الارتفاع (مقياس Y):</span>
              <span className="font-mono text-slate-800">{toArabicDigits((scaleY || 1).toFixed(2))}×</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="4.0"
              step="0.1"
              value={scaleY || 1}
              onChange={(e) => updateScale('y', parseFloat(e.target.value) || 1)}
              className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
            />
          </div>

          {/* Depth / Length (Scale Z) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-slate-500">العمق/الطول (مقياس Z):</span>
              <span className="font-mono text-slate-800">{toArabicDigits((scaleZ || 1).toFixed(2))}×</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="4.0"
              step="0.1"
              value={scaleZ || 1}
              onChange={(e) => updateScale('z', parseFloat(e.target.value) || 1)}
              className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* TAB 3: ROTATION CONTROLLER */}
      {activeTab === 'rotation' && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span className="text-slate-500">زاوية الدوران الأفقية:</span>
              <span className="font-mono text-brand-700">{toArabicDigits((rotY || 0).toFixed(0))}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={rotY || 0}
              onChange={(e) => updateRotation(parseFloat(e.target.value) || 0)}
              className="w-full accent-brand-700 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
            />
          </div>

          {/* Quick 90-degree Snap Buttons */}
          <div className="grid grid-cols-4 gap-1">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                onClick={() => updateRotation(deg)}
                className={`py-1 px-1.5 rounded-lg font-bold text-[10px] text-center transition cursor-pointer border ${
                  Math.round(rotY || 0) % 360 === deg
                    ? 'bg-brand-700 text-on-brand border-brand-200 font-black'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {toArabicDigits(deg)}°
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
