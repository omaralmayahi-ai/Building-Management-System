import React from 'react';
import {
  Maximize2,
  Minimize2,
  Grid,
  FileText,
  Copy,
  Sliders,
  CheckCircle2,
  Eye,
  LayoutTemplate,
} from 'lucide-react';
import { CardPrintSize, CardPlacement, CardPlacementA6, CardPlacementA5 } from '../utils/qrCardPrintHtml';
import { toArabicDigits } from '../utils/arabicUtils';

interface A4PrintPlacementSelectorProps {
  size: CardPrintSize;
  setSize: (size: CardPrintSize) => void;
  placement: CardPlacement;
  setPlacement: (placement: CardPlacement) => void;
  displayMode?: 'card' | 'sheet';
  setDisplayMode?: (mode: 'card' | 'sheet') => void;
  theme?: 'dark' | 'light';
  isRoomCard?: boolean;
  totalRoomsCount?: number;
  hideSheetPreviewToggle?: boolean;
}

export const A4PrintPlacementSelector: React.FC<A4PrintPlacementSelectorProps> = ({
  size,
  setSize,
  placement,
  setPlacement,
  displayMode = 'card',
  setDisplayMode,
  theme = 'dark',
  isRoomCard = false,
  totalRoomsCount,
  hideSheetPreviewToggle = false,
}) => {
  const isLight = theme === 'light';

  // Handle size changes with fallback to valid placement
  const handleSizeChange = (newSize: CardPrintSize) => {
    setSize(newSize);
    if (newSize === 'compact') {
      setPlacement('top-right');
    } else if (newSize === 'medium') {
      setPlacement('top');
    } else {
      setPlacement('center');
    }
  };

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-4 space-y-3 transition-colors ${
        isLight
          ? 'bg-amber-50/50 border-amber-200/80 text-slate-800'
          : 'bg-slate-900/90 border-amber-500/30 text-slate-200'
      }`}
    >
      {/* Top Header: Controls Summary & Display Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black flex items-center gap-1.5">
              <span>تخصيص الحجم وموضع الطباعة على ورقة A4</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                منع هدر الورق
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              حدد حجم البطاقة وموضعها داخل الورقة قبل الطباعة
            </p>
          </div>
        </div>

        {/* View mode toggle (Card vs Simulated Sheet) */}
        {!hideSheetPreviewToggle && setDisplayMode && (
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-950 p-1 rounded-xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setDisplayMode('card')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                displayMode === 'card'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>عرض البطاقة فقط</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('sheet')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                displayMode === 'sheet'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="معاينة شكل ورقة A4 الكاملة وموضع البطاقة داخلها"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>معاينة الورقة A4 والموضع</span>
            </button>
          </div>
        )}
      </div>

      {/* Row 1: Size Selector Pills */}
      <div className="space-y-1">
        <label className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 block">
          ١. اختر حجم البطاقة المطلوب:
        </label>
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {/* Compact A6 */}
          <button
            type="button"
            onClick={() => handleSizeChange('compact')}
            className={`p-1.5 sm:p-2 rounded-xl text-right border transition cursor-pointer flex flex-col justify-between ${
              size === 'compact'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : isLight
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[11px] sm:text-xs flex items-center gap-0.5 sm:gap-1">
                <Grid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>مدمج (A6)</span>
              </span>
              {size === 'compact' && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />}
            </div>
            <span
              className={`text-[8.5px] sm:text-[9.5px] mt-0.5 font-medium leading-tight ${
                size === 'compact' ? 'text-slate-900 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              ربع ورقة • ٤ بطاقات
            </span>
          </button>

          {/* Medium A5 */}
          <button
            type="button"
            onClick={() => handleSizeChange('medium')}
            className={`p-1.5 sm:p-2 rounded-xl text-right border transition cursor-pointer flex flex-col justify-between ${
              size === 'medium'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : isLight
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[11px] sm:text-xs flex items-center gap-0.5 sm:gap-1">
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>متوسط (A5)</span>
              </span>
              {size === 'medium' && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />}
            </div>
            <span
              className={`text-[8.5px] sm:text-[9.5px] mt-0.5 font-medium leading-tight ${
                size === 'medium' ? 'text-slate-900 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              نصف ورقة • بطاقتان
            </span>
          </button>

          {/* Full A4 */}
          <button
            type="button"
            onClick={() => handleSizeChange('full')}
            className={`p-1.5 sm:p-2 rounded-xl text-right border transition cursor-pointer flex flex-col justify-between ${
              size === 'full'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : isLight
                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[11px] sm:text-xs flex items-center gap-0.5 sm:gap-1">
                <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>كامل (A4)</span>
              </span>
              {size === 'full' && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />}
            </div>
            <span
              className={`text-[8.5px] sm:text-[9.5px] mt-0.5 font-medium leading-tight ${
                size === 'full' ? 'text-slate-900 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              لوحة جدارية كاملة
            </span>
          </button>
        </div>
      </div>

      {/* Row 2: Placement Selector on A4 Sheet */}
      {size !== 'full' ? (
        <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
          <label className="text-[10px] sm:text-[10.5px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>٢. موضع البطاقة داخل ورقة A4:</span>
            <span className="text-[9.5px] text-amber-600 dark:text-amber-400 font-normal hidden sm:inline">
              (انقر على أي زاوية داخل الورقة أو اختر من الأزرار)
            </span>
          </label>

          <div className="flex flex-row items-center gap-2 sm:gap-4 w-full">
            {/* Interactive Visual A4 Sheet Simulation Widget */}
            <div
              className={`w-16 h-24 sm:w-22 sm:h-32 border-2 rounded-md shadow-md p-1 shrink-0 flex flex-col justify-between relative select-none transition-all ${
                isLight ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
              }`}
              title="ورقة A4 التفاعلية: اضغط على الموضع المطلوب لوضع البطاقة فيه"
            >
              <span className="absolute -top-2 right-1.5 text-[7.5px] sm:text-[8px] font-bold px-1 bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">
                A4
              </span>

              {size === 'compact' ? (
                /* 4 Quadrants Grid */
                <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full w-full">
                  {/* Top-Right (أعلى اليمين) */}
                  <button
                    type="button"
                    onClick={() => setPlacement('top-right')}
                    className={`rounded border text-[7.5px] font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                      placement === 'top-right' || placement === 'four-copies'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs ring-1 ring-amber-400'
                        : 'border-dashed border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-400'
                    }`}
                    title="أعلى اليمين"
                  >
                    <span>أعلى</span>
                    <span>يمين</span>
                  </button>

                  {/* Top-Left (أعلى اليسار) */}
                  <button
                    type="button"
                    onClick={() => setPlacement('top-left')}
                    className={`rounded border text-[7.5px] font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                      placement === 'top-left' || placement === 'four-copies'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs ring-1 ring-amber-400'
                        : 'border-dashed border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-400'
                    }`}
                    title="أعلى اليسار"
                  >
                    <span>أعلى</span>
                    <span>يسار</span>
                  </button>

                  {/* Bottom-Right (أسفل اليمين) */}
                  <button
                    type="button"
                    onClick={() => setPlacement('bottom-right')}
                    className={`rounded border text-[7.5px] font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                      placement === 'bottom-right' || placement === 'four-copies'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs ring-1 ring-amber-400'
                        : 'border-dashed border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-400'
                    }`}
                    title="أسفل اليمين"
                  >
                    <span>أسفل</span>
                    <span>يمين</span>
                  </button>

                  {/* Bottom-Left (أسفل اليسار) */}
                  <button
                    type="button"
                    onClick={() => setPlacement('bottom-left')}
                    className={`rounded border text-[7.5px] font-bold flex flex-col items-center justify-center transition cursor-pointer ${
                      placement === 'bottom-left' || placement === 'four-copies'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs ring-1 ring-amber-400'
                        : 'border-dashed border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-400'
                    }`}
                    title="أسفل اليسار"
                  >
                    <span>أسفل</span>
                    <span>يسار</span>
                  </button>
                </div>
              ) : (
                /* 2 Halves for A5 */
                <div className="grid grid-rows-2 gap-1 h-full w-full">
                  <button
                    type="button"
                    onClick={() => setPlacement('top')}
                    className={`rounded border text-[8px] font-bold flex items-center justify-center transition cursor-pointer ${
                      placement === 'top' || placement === 'two-copies'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs ring-1 ring-amber-400'
                        : 'border-dashed border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-400'
                    }`}
                    title="النصف العلوي"
                  >
                    النصف العلوي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('bottom')}
                    className={`rounded border text-[8px] font-bold flex items-center justify-center transition cursor-pointer ${
                      placement === 'bottom' || placement === 'two-copies'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs ring-1 ring-amber-400'
                        : 'border-dashed border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-400'
                    }`}
                    title="النصف السفلي"
                  >
                    النصف السفلي
                  </button>
                </div>
              )}
            </div>

            {/* Quick Placement Action Buttons */}
            <div className="w-full flex-1 space-y-1">
              {size === 'compact' ? (
                <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPlacement('top-right')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold border transition text-center cursor-pointer ${
                      placement === 'top-right'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    أعلى اليمين
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('top-left')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold border transition text-center cursor-pointer ${
                      placement === 'top-left'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    أعلى اليسار
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('bottom-right')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold border transition text-center cursor-pointer ${
                      placement === 'bottom-right'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    أسفل اليمين
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('bottom-left')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold border transition text-center cursor-pointer ${
                      placement === 'bottom-left'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    أسفل اليسار
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlacement('center')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold border transition text-center cursor-pointer ${
                      placement === 'center'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    وسط الصفحة
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('four-copies')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1 ${
                      placement === 'four-copies'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-black'
                        : isLight
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                    }`}
                    title="تعبئة الأركان الأربعة بـ 4 نسخ من البطاقة لتوفير الورق"
                  >
                    <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>٤ نسخ (تعبئة)</span>
                  </button>
                </div>
              ) : (
                /* Medium A5 Placement Buttons */
                <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPlacement('top')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold border transition text-center cursor-pointer ${
                      placement === 'top'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    النصف العلوي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('bottom')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold border transition text-center cursor-pointer ${
                      placement === 'bottom'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    النصف السفلي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('center')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-bold border transition text-center cursor-pointer ${
                      placement === 'center'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    وسط الصفحة
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlacement('two-copies')}
                    className={`px-1.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1 ${
                      placement === 'two-copies'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-black'
                        : isLight
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                    }`}
                    title="تعبئة النصفين العلوي والسفلي بنسختين"
                  >
                    <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>نسختان (تعبئة)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 p-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          سيتم طباعة البطاقة بحجم لوحة كاملة تتوسط ورقة الـ A4 بالكامل.
        </div>
      )}
    </div>
  );
};
