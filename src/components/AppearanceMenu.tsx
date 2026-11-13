import React, { useEffect, useRef, useState } from 'react';
import { Check, Palette, RotateCcw } from 'lucide-react';
import { FONTS, THEMES } from '../lib/theme';

// قائمة «مظهري»: يختار المستخدم لونه وخطه ونمط قائمته، وتُحفظ في حسابه فوق مظهر النظام الافتراضي.
export interface AppearanceValue {
  theme: string;
  font: string;
  sidebar: 'primary' | 'light';
}

interface AppearanceMenuProps {
  value: AppearanceValue;
  /** هل للمستخدم اختيار خاص يختلف عن مظهر النظام؟ */
  customized: boolean;
  onChange: (change: Partial<AppearanceValue>) => void;
  onReset: () => void;
}

export const AppearanceMenu: React.FC<AppearanceMenuProps> = ({ value, customized, onChange, onReset }) => {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="ds relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="مظهر الواجهة"
        title="مظهر الواجهة"
        className="flex items-center justify-center rounded-xl border border-slate-200 bg-card p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
      >
        <Palette className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="مظهر الواجهة"
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-card p-4 text-slate-900 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">مظهر الواجهة</span>
            {customized && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                title="العودة إلى المظهر الذي حدده مدير النظام"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                مظهر النظام
              </button>
            )}
          </div>

          <div className="mb-1.5 text-xs font-semibold text-slate-500">اللون</div>
          <div className="mb-4 grid grid-cols-9 gap-1.5">
            {THEMES.map((t) => {
              const selected = value.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onChange({ theme: t.id })}
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={selected}
                  className={`flex h-6 w-6 items-center justify-center rounded-full cursor-pointer ring-offset-2 ring-offset-card ${
                    selected ? 'ring-2 ring-slate-900' : 'hover:ring-2 hover:ring-slate-300'
                  }`}
                  style={{ backgroundColor: t.color }}
                >
                  {selected && <Check className="h-3.5 w-3.5 text-white" aria-hidden />}
                </button>
              );
            })}
          </div>

          <label className="mb-1.5 block text-xs font-semibold text-slate-500" htmlFor="appearance-font">
            الخط
          </label>
          <select
            id="appearance-font"
            value={value.font}
            onChange={(e) => onChange({ font: e.target.value })}
            className="mb-4 w-full rounded-lg border border-slate-300 bg-card px-3 py-2 text-sm text-slate-900"
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>

          <div className="mb-1.5 text-xs font-semibold text-slate-500">القائمة الجانبية</div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'primary', label: 'بلون الثيم' },
                { id: 'light', label: 'فاتحة' },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange({ sidebar: o.id })}
                aria-pressed={value.sidebar === o.id}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold cursor-pointer ${
                  value.sidebar === o.id
                    ? 'border-brand-700 bg-brand-50 text-brand-800'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
