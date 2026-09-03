import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  Building2,
  Network,
  CheckCircle2,
  Maximize2,
  Loader2,
  Check,
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { OrgEntity, SystemBranding, UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import { ORG_LEVEL_LABELS } from '../utils/orgExcelUtils';

interface OrgChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgEntities: OrgEntity[];
  branding?: SystemBranding;
  units?: UnitAsset[];
  isParentLight?: boolean;
  selectionMode?: boolean;
  initialSelectedEntities?: string[];
  onSaveSelection?: (selectedNames: string[]) => void;
}

export const OrgChartModal: React.FC<OrgChartModalProps> = ({
  isOpen,
  onClose,
  orgEntities,
  branding,
  units = [],
  selectionMode = false,
  initialSelectedEntities = [],
  onSaveSelection,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<OrgEntity | null>(null);
  const [selectedOccupantNames, setSelectedOccupantNames] = useState<string[]>(initialSelectedEntities || []);

  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selectedOccupantNames when modal opens in selectionMode
  useEffect(() => {
    if (isOpen && selectionMode) {
      setSelectedOccupantNames(initialSelectedEntities || []);
    }
  }, [isOpen, selectionMode, initialSelectedEntities]);

  // Helpers for Selection Mode
  const isEntitySelected = (entity: OrgEntity | null | undefined): boolean => {
    if (!entity) return false;
    return selectedOccupantNames.includes(entity.nameAr.trim());
  };

  const getEntitySelectionIndex = (entity: OrgEntity | null | undefined): number => {
    if (!entity) return -1;
    return selectedOccupantNames.indexOf(entity.nameAr.trim());
  };

  const handleEntityClick = (entity: OrgEntity) => {
    if (selectionMode) {
      const name = entity.nameAr.trim();
      setSelectedOccupantNames((prev) => {
        if (prev.includes(name)) {
          return prev.filter((n) => n !== name);
        } else {
          return [...prev, name];
        }
      });
    } else {
      setSelectedEntity(entity);
    }
  };

  const renderSelectionBadge = (entity: OrgEntity | null | undefined) => {
    if (!selectionMode || !entity) return null;
    const isSelected = isEntitySelected(entity);
    const selectIdx = getEntitySelectionIndex(entity);
    const isPrimary = selectIdx === 0;

    if (isSelected) {
      return (
        <div className="absolute -top-2.5 -right-2 z-20 pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-md border ring-2 ring-white ${
              isPrimary
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-emerald-600 text-white border-emerald-400'
            }`}
          >
            <Check className="w-3 h-3" />
            <span>{isPrimary ? '١. الجهة الرئيسية' : toArabicDigits(selectIdx + 1)}</span>
          </span>
        </div>
      );
    }

    return (
      <div className="absolute -top-1.5 -right-1.5 z-20 pointer-events-none opacity-60 group-hover:opacity-100 transition">
        <span className="w-4 h-4 rounded-full border border-slate-300 bg-white text-slate-500 flex items-center justify-center text-[9px] font-bold shadow-2xs">
          +
        </span>
      </div>
    );
  };

  // Helper for clear Arabic level labels in details popup
  const getArabicLevelLabel = (entity: OrgEntity): string => {
    if (entity.level === 'director_general') return 'إدارة عليا (المدير العام)';
    if (entity.level === 'deputy_director') return 'معاون المدير العام';
    if (entity.level === 'commission') return 'هيئة رئيسية';
    if (entity.level === 'central_dept') return 'قسم مركزي';
    if (entity.level === 'department') {
      if (entity.parentId === 'ORG-DG' || !entity.parentId) return 'قسم مركزي';
      return 'قسم';
    }
    if (entity.level === 'section') return 'شعبة';
    if (entity.level === 'unit') return 'وحدة إدارية';
    if (entity.level === 'company') return 'الشركة / المؤسسة';
    const name = (entity.nameAr || '').trim();
    if (name.startsWith('هيئة') || name.startsWith('الهيئة')) return 'هيئة رئيسية';
    if (name.startsWith('قسم') || name.startsWith('القسم')) return 'قسم';
    if (name.startsWith('شعبة')) return 'شعبة';
    if (name.startsWith('وحدة')) return 'وحدة إدارية';
    return ORG_LEVEL_LABELS[entity.level] || 'تشكيل إداري';
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Dynamic tree structure calculation based on current orgEntities
  const {
    dgEntity,
    dgAssistants,
    deputies,
    centralDepartments,
    commissions,
    commissionChildrenMap,
    totalEmployees,
    totalEntities,
  } = useMemo(() => {
    // 1. Director General (DG) node
    const dg =
      orgEntities.find((e) => e.level === 'director_general') ||
      orgEntities.find((e) => !e.parentId) ||
      orgEntities[0] ||
      null;

    const dgId = dg?.id;

    // 2. Direct offices / assistants to DG (e.g. مكتب المدير العام, التنسيق الإداري, الجودة)
    const directOffices = orgEntities.filter(
      (e) =>
        e.parentId === dgId &&
        (e.level === 'section' ||
          e.nameAr.includes('مكتب') ||
          e.nameAr.includes('تنسيق') ||
          e.nameAr.includes('جودة'))
    );

    // 3. Deputies (معاونو المدير العام)
    const depList = orgEntities.filter(
      (e) =>
        e.parentId === dgId &&
        (e.level === 'deputy_director' || e.nameAr.includes('معاون'))
    );

    const directOfficeIds = new Set(directOffices.map((d) => d.id));
    const deputyIds = new Set(depList.map((d) => d.id));

    // 4. Genuine Commissions ONLY (الهيئات)
    const commList = orgEntities.filter((e) => {
      if (e.id === dgId) return false;
      if (directOfficeIds.has(e.id)) return false;
      if (deputyIds.has(e.id)) return false;

      // Explicit commission level
      if (e.level === 'commission') return true;

      // Fallback name matching (excluding departments/sections/units)
      const name = (e.nameAr || '').trim();
      if (
        (name.startsWith('هيئة') || name.startsWith('الهيئة')) &&
        !name.startsWith('قسم') &&
        !name.startsWith('القسم') &&
        !name.startsWith('شعبة') &&
        !name.startsWith('وحدة')
      ) {
        return true;
      }
      if (e.code && e.code.startsWith('COMM-')) return true;
      return false;
    });

    const commissionIds = new Set(commList.map((c) => c.id));

    // 5. Central Departments under DG (الأقسام المركزية)
    const centralDepts = orgEntities.filter((e) => {
      if (e.id === dgId) return false;
      if (directOfficeIds.has(e.id)) return false;
      if (deputyIds.has(e.id)) return false;
      if (commissionIds.has(e.id)) return false;

      // Explicit central_dept level
      if (e.level === 'central_dept') return true;

      // Or departments reporting to DG directly
      if (
        (e.parentId === dgId || !e.parentId) &&
        (e.level === 'department' || e.nameAr.startsWith('قسم') || e.nameAr.startsWith('القسم'))
      ) {
        return true;
      }
      return false;
    });

    // 6. Children map for each commission
    const commMap = new Map<string, OrgEntity[]>();
    commList.forEach((comm) => {
      const getDescendants = (parentId: string): OrgEntity[] => {
        const direct = orgEntities.filter((item) => item.parentId === parentId);
        let all: OrgEntity[] = [...direct];
        direct.forEach((d) => {
          all = all.concat(getDescendants(d.id));
        });
        return all;
      };

      commMap.set(comm.id, getDescendants(comm.id));
    });

    const totEmp = orgEntities.reduce((sum, e) => sum + (e.employeeCount || 0), 0);

    return {
      dgEntity: dg,
      dgAssistants: directOffices,
      deputies: depList,
      centralDepartments: centralDepts,
      commissions: commList,
      commissionChildrenMap: commMap,
      totalEmployees: totEmp,
      totalEntities: orgEntities.length,
    };
  }, [orgEntities]);

  // Dynamic canvas width calculation:
  // Automatically scales based on the number of commissions to prevent horizontal overflow or clipping
  const chartContentWidth = useMemo(() => {
    const count = commissions.length;
    if (count <= 0) return 1400;
    const perCol = count > 9 ? 165 : 185;
    return Math.max(1400, count * perCol + 100);
  }, [commissions.length]);

  // Auto-fit zoom calculation so the entire chart comfortably fits inside the viewport without cut-offs
  const calculateAutoFitZoom = useCallback(() => {
    if (!containerRef.current) return 0.8;
    const containerWidth = containerRef.current.clientWidth - 48;
    if (containerWidth <= 0) return 0.8;
    const fit = containerWidth / chartContentWidth;
    return Math.min(1.0, Math.max(0.3, parseFloat(fit.toFixed(2))));
  }, [chartContentWidth]);

  // Auto-fit zoom when modal opens or entity count changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const fit = calculateAutoFitZoom();
        setZoomLevel(fit);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, chartContentWidth, calculateAutoFitZoom]);

  // Handle window resize for dynamic fitting
  useEffect(() => {
    const handleResize = () => {
      if (isOpen && containerRef.current) {
        const fit = calculateAutoFitZoom();
        setZoomLevel((prev) => (prev <= fit ? fit : prev));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculateAutoFitZoom]);

  // Filter matched IDs for search highlighting
  const matchingIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const query = searchQuery.trim().toLowerCase();
    const ids = new Set<string>();
    orgEntities.forEach((e) => {
      if (
        e.nameAr.toLowerCase().includes(query) ||
        (e.nameEn && e.nameEn.toLowerCase().includes(query)) ||
        e.code.toLowerCase().includes(query)
      ) {
        ids.add(e.id);
      }
    });
    return ids;
  }, [orgEntities, searchQuery]);

  // Unit count helper
  const getEntityUnitCount = (entityId: string) => {
    return units.filter((u) => u.orgEntityId === entityId).length;
  };

  // Zoom & Rotation handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(parseFloat((prev + 0.1).toFixed(2)), 1.8));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(parseFloat((prev - 0.1).toFixed(2)), 0.3));
  const handleResetZoom = () => setZoomLevel(1.0);
  const handleAutoFit = () => setZoomLevel(calculateAutoFitZoom());
  const handleRotate = () => setRotationAngle((prev) => (prev + 90) % 360);

  // Export to Image (PNG) using html2canvas-pro with unified Arabic font rendering
  const handleExportImage = async () => {
    if (!chartRef.current) return;
    try {
      setIsExporting(true);
      setExportToast('جاري إنشاء صورة فائقة الدقة للهيكل التنظيمي (PNG)...');

      // Save original styles
      const el = chartRef.current;
      const origTransform = el.style.transform;
      const origTransition = el.style.transition;

      // Reset transform temporarily for sharp 1:1 canvas capture
      el.style.transform = 'none';
      el.style.transition = 'none';

      await new Promise((resolve) => setTimeout(resolve, 60));

      const canvas = await html2canvas(el, {
        scale: 2, // High DPI
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('printable-org-chart');
          if (clonedEl) {
            clonedEl.style.transform = 'none';
            clonedEl.style.transition = 'none';
            clonedEl.style.boxShadow = 'none';
            if (clonedEl.parentElement) {
              clonedEl.parentElement.style.width = 'auto';
              clonedEl.parentElement.style.minWidth = '0';
              clonedEl.parentElement.style.overflow = 'visible';
            }
          }

          // Inject strict Arabic typography normalization so all cards have 100% connected, consistent Arabic font
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            #printable-org-chart, #printable-org-chart * {
              letter-spacing: 0px !important;
              word-spacing: normal !important;
              font-family: 'Cairo', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              -webkit-font-smoothing: antialiased !important;
              text-rendering: geometricPrecision !important;
              font-feature-settings: "liga" 1, "calt" 1 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });

      // Restore zoom & rotation immediately
      el.style.transform = origTransform;
      el.style.transition = origTransition;

      // Download using Blob with fallback
      const timestamp = new Date().toISOString().slice(0, 10);
      const companySlug = branding?.companyName?.replace(/\s+/g, '_') || 'شركة_نفط_الوسط';
      const fileName = `الهيكل_التنظيمي_${companySlug}_${timestamp}.png`;

      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, 300);
            setExportToast('تم تصدير صورة الهيكل التنظيمي بنجاح!');
            setTimeout(() => setExportToast(null), 3500);
          } else {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 300);
            setExportToast('تم تصدير صورة الهيكل التنظيمي بنجاح!');
            setTimeout(() => setExportToast(null), 3500);
          }
        }, 'image/png');
      } else {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 300);
        setExportToast('تم تصدير صورة الهيكل التنظيمي بنجاح!');
        setTimeout(() => setExportToast(null), 3500);
      }
    } catch (err) {
      console.error('Export image error:', err);
      if (chartRef.current) {
        chartRef.current.style.transform = `scale(${zoomLevel}) rotate(${rotationAngle}deg)`;
      }
      setExportToast('حدث خطأ أثناء تصدير الصورة، يرجى المحاولة لاحقاً');
      setTimeout(() => setExportToast(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Split central departments into two balanced columns (as shown in official chart)
  const leftCentralDepts = centralDepartments.slice(0, Math.ceil(centralDepartments.length / 2));
  const rightCentralDepts = centralDepartments.slice(Math.ceil(centralDepartments.length / 2));

  return (
    <div
      id="org-chart-modal"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md animate-fade-in print:p-0 print:m-0 print:bg-white print:fixed-none"
      dir="rtl"
    >
      {/* Printable CSS Injection */}
      <style>{`
        @media print {
          @page {
            size: A3 landscape;
            margin: 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide non-printable elements */
          nav, aside, header, .non-printable, button, input {
            display: none !important;
          }
          #org-chart-modal {
            position: static !important;
            display: block !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #org-chart-modal > div {
            overflow: visible !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-org-chart {
            position: static !important;
            width: 100% !important;
            min-width: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 auto !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Top Modal Controls Header (Hidden during Print) */}
      <div className="non-printable px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-100 flex items-center justify-between gap-4 shrink-0 shadow-lg">
        {/* Right Section: Title & Ordered Controls */}
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Title & Sync Status */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  {selectionMode ? 'الهيكل التنظيمي - اختيار الجهات الشاغلة' : 'الهيكل التنظيمي المعتمد'}
                </h2>
                {selectionMode ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <span>تم تحديد ({toArabicDigits(selectedOccupantNames.length)}) تشكيل</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>محدث تلقائياً ({toArabicDigits(totalEntities)} تشكيل)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 1. حقل البحث (Search Field) */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن هيئة، قسم، أو شعبة..."
              className="w-full pl-3 pr-9 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons: If selectionMode, hide export and show Save/Deselect */}
          {selectionMode ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onSaveSelection) {
                    onSaveSelection(selectedOccupantNames);
                  }
                  onClose();
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                title="حفظ التشكيلات المحددة وتعيينها كجهات شاغلة للمنشأة"
              >
                <Check className="w-4 h-4 text-emerald-100" />
                <span>حفظ التشكيلات المحددة ({toArabicDigits(selectedOccupantNames.length)})</span>
              </button>

              {selectedOccupantNames.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedOccupantNames([])}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 font-bold text-xs transition cursor-pointer"
                  title="إلغاء تحديد كافة التشكيلات"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>
          ) : (
            /* زر تصدير صورة (PNG) */
            <button
              type="button"
              onClick={handleExportImage}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs"
              title="تصدير الهيكل التنظيمي كاملاً كصورة عالية الدقة PNG"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-emerald-400" />
              )}
              <span>{isExporting ? 'جاري التصدير...' : 'تصدير صورة (PNG)'}</span>
            </button>
          )}

          {/* أزرار التحكم بالمقياس والتدوير (Zoom / احتواء الشاشة / التدوير 90 درجة / 100%) */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white transition cursor-pointer"
              title="تصغير (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300 min-w-[44px] text-center font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white transition cursor-pointer"
              title="تكبير (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleAutoFit}
              className="px-2.5 py-1 text-slate-300 hover:text-amber-400 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 border-r border-slate-700"
              title="احتواء الهيكل التنظيمي تلقائياً ليلائم عرض الشاشة دون تجاوز"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">احتواء الشاشة</span>
            </button>
            {/* زر التدوير الفعلي بمقدار 90 درجة في كل نقرة */}
            <button
              type="button"
              onClick={handleRotate}
              className={`px-2.5 py-1 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 border-r border-slate-700 ${
                rotationAngle > 0
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-slate-300 hover:text-amber-400'
              }`}
              title={`تدوير الهيكل التنظيمي 90 درجة مع عقارب الساعة (الزاوية الحالية: ${rotationAngle}°)`}
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>{rotationAngle > 0 ? `${rotationAngle}°` : 'تدوير'}</span>
            </button>
            {/* زر إعادة تعيين المقياس إلى 100% */}
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 text-slate-400 hover:text-white transition cursor-pointer border-r border-slate-700 text-[11px] font-bold"
              title="إعادة تعيين المقياس إلى 100%"
            >
              100%
            </button>
          </div>
        </div>

        {/* Left Section: Close / Exit Button at top-left corner */}
        <div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition cursor-pointer border border-slate-700 shadow-xs"
            title="إغلاق النافذة (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Selection Mode Ribbon Bar: Displays instructions and selected entities order */}
      {selectionMode && (
        <div className="non-printable bg-slate-900/95 border-b border-amber-500/30 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/30 flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>وضع اختيار الجهات الشاغلة</span>
            </span>
            <span className="text-slate-300 font-medium hidden lg:inline text-[11px]">
              انقر على أي تشكيل بالهيكل لتحديده أو إلغاء تحديده. أول تشكيل يتم اختياره يُعتبر تلقائياً هو <strong className="text-amber-400">الجهة الرئيسية</strong> للمنشأة.
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap max-w-2xl overflow-x-auto py-0.5">
            {selectedOccupantNames.length === 0 ? (
              <span className="text-slate-400 text-[11px] italic">
                لم يتم تحديد أي تشكيل بعد. انقر على أي تشكيل من الهيكل التنظيمي أدناه لاختياره.
              </span>
            ) : (
              selectedOccupantNames.map((name, index) => {
                const isPrimary = index === 0;
                return (
                  <span
                    key={name}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                      isPrimary
                        ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 shadow-xs'
                        : 'bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black ${
                        isPrimary ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {toArabicDigits(index + 1)}
                    </span>
                    <span className="truncate max-w-[140px]">{name}</span>
                    {isPrimary && (
                      <span className="text-[9px] px-1 rounded bg-amber-500/30 text-amber-200 font-black">
                        رئيسية
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedOccupantNames((prev) => prev.filter((n) => n !== name))}
                      className="hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                      title="إزالة التشكيل من التحديد"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {exportToast && (
        <div className="non-printable absolute top-18 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exportToast}</span>
        </div>
      )}

      {/* Scrollable Viewport (Daylight / Light Neutral Grid Canvas) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-6 print:p-0 print:m-0 print:overflow-visible"
        style={{
          backgroundColor: '#f1f5f9',
          backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Scaling & Centering Container: Prevents right/left cutoff and auto-centers the scaled board */}
        <div
          className="mx-auto flex justify-center items-start min-h-full py-4 print:p-0 print:m-0 print:w-full print:block"
          style={{
            width: `${Math.ceil(chartContentWidth * zoomLevel) + 32}px`,
            minWidth: '100%',
          }}
        >
          {/* The Printable / Renderable Chart Board (Clean Official Paper Mode) */}
          <div
            ref={chartRef}
            id="printable-org-chart"
            style={{
              width: `${chartContentWidth}px`,
              minWidth: `${chartContentWidth}px`,
              transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
              fontFamily: "'Cairo', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            }}
            className="p-8 sm:p-10 rounded-3xl border border-slate-300 shadow-xl shadow-slate-300/40 bg-white text-slate-900 shrink-0 font-['Cairo']"
          >
          {/* 1. Official Header Ribbon */}
          <div className="border-b-2 border-amber-500/40 pb-6 mb-8">
            <div className="flex items-center justify-between">
              {/* Right Side: Ministry & Country */}
              <div className="text-right">
                <h3 className="text-base font-black text-slate-900">
                  {branding?.countryName || 'جمهورية العراق'}
                </h3>
                <h4 className="text-sm font-extrabold text-amber-700">
                  {branding?.ministryName || 'وزارة النفط العراقية'}
                </h4>
                <p className="text-xs text-slate-500 font-bold">
                  {branding?.companyName || 'شركة نفط الوسط'}
                </p>
              </div>

              {/* Center: Main Title Ribbon with Dynamic Company Name */}
              <div className="text-center px-10 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border-2 border-amber-500/60 shadow-inner">
                <div className="text-xs font-black text-amber-800 mb-1">
                  {branding?.companyName || 'شركة نفط الوسط'}
                </div>
                <h1 className="text-2xl font-black text-slate-950">
                  الهيكل التنظيمي المعتمد
                </h1>
                <p className="text-xs font-bold text-slate-700 mt-1 font-sans">
                  Approved Organizational Structure
                </p>
              </div>

              {/* Left Side: Summary & Timestamp */}
              <div className="text-left font-mono text-xs text-slate-600">
                <div className="font-bold text-slate-800">
                  إجمالي التشكيلات: {toArabicDigits(totalEntities)}
                </div>
                <div>إجمالي الكادر: {toArabicDigits(totalEmployees)} موظف</div>
                <div className="text-[11px] text-slate-500">
                  تاريخ التحديث: {new Date().toLocaleDateString('ar-IQ')}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Top Tier: Director General & Direct Assistants */}
          <div className="flex flex-col items-center relative mb-12">
            {/* Top Root: Director General Card */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                onClick={() => dgEntity && handleEntityClick(dgEntity)}
                className={`px-8 py-3.5 rounded-full border-2 text-center cursor-pointer transition transform hover:scale-105 shadow-md relative ${
                  selectionMode && isEntitySelected(dgEntity)
                    ? getEntitySelectionIndex(dgEntity) === 0
                      ? 'ring-4 ring-amber-500 bg-amber-100 border-amber-600 shadow-amber-500/30'
                      : 'ring-4 ring-emerald-500 bg-emerald-50 border-emerald-600 shadow-emerald-500/30'
                    : dgEntity && matchingIds.has(dgEntity.id)
                    ? 'ring-4 ring-amber-400 bg-amber-100'
                    : 'bg-amber-50 border-amber-600 text-slate-950 hover:bg-amber-100 shadow-amber-900/10'
                }`}
                style={{ minWidth: '260px' }}
              >
                {renderSelectionBadge(dgEntity)}
                <div className="text-lg font-black">
                  {dgEntity?.nameAr || 'المدير العام'}
                </div>
                {dgEntity?.nameEn && (
                  <div className="text-[11px] font-sans text-amber-700 font-bold">
                    {dgEntity.nameEn}
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mt-1 text-[10px] font-bold text-slate-600">
                  <span>الرمز: {dgEntity?.code || 'DG'}</span>
                  <span>•</span>
                  <span>الكادر المباشر: {toArabicDigits(dgEntity?.employeeCount || 1)}</span>
                </div>
              </div>

              {/* Direct Offices / Staff attached horizontally to DG */}
              <div className="flex items-center justify-center gap-6 mt-4">
                {dgAssistants.map((office) => {
                  const isHighlighted = matchingIds.has(office.id);
                  const isSelected = selectionMode && isEntitySelected(office);
                  const selectIdx = selectionMode ? getEntitySelectionIndex(office) : -1;
                  return (
                    <div
                      key={office.id}
                      onClick={() => handleEntityClick(office)}
                      className={`px-4 py-2 rounded-2xl border text-center cursor-pointer transition hover:scale-105 text-xs font-bold shadow-xs relative ${
                        isSelected
                          ? selectIdx === 0
                            ? 'ring-4 ring-amber-500 bg-amber-100 border-amber-600 shadow-amber-500/30'
                            : 'ring-4 ring-emerald-500 bg-emerald-50 border-emerald-600 shadow-emerald-500/30'
                          : isHighlighted
                          ? 'ring-2 ring-amber-400 bg-amber-200'
                          : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                      }`}
                      style={{ minWidth: '170px' }}
                    >
                      {renderSelectionBadge(office)}
                      <div className="font-extrabold">{office.nameAr}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {toArabicDigits(office.employeeCount || 0)} موظف
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Deputies Row (معاونو المدير العام) */}
              {deputies.length > 0 && (
                <div className="flex items-center justify-between w-full max-w-4xl mt-6 px-12 relative">
                  {deputies.map((dep) => {
                    const isHighlighted = matchingIds.has(dep.id);
                    const isSelected = selectionMode && isEntitySelected(dep);
                    const selectIdx = selectionMode ? getEntitySelectionIndex(dep) : -1;
                    return (
                      <div
                        key={dep.id}
                        onClick={() => handleEntityClick(dep)}
                        className={`px-6 py-2.5 rounded-full border-2 text-center cursor-pointer transition hover:scale-105 text-xs font-black shadow-sm relative ${
                          isSelected
                            ? selectIdx === 0
                              ? 'ring-4 ring-amber-500 bg-amber-100 border-amber-600 shadow-amber-500/30'
                              : 'ring-4 ring-emerald-500 bg-emerald-50 border-emerald-600 shadow-emerald-500/30'
                            : isHighlighted
                            ? 'ring-2 ring-amber-400 bg-amber-200'
                            : 'bg-amber-50/80 border-amber-500 text-amber-950 hover:bg-amber-100'
                        }`}
                        style={{ minWidth: '260px' }}
                      >
                        {renderSelectionBadge(dep)}
                        <div>{dep.nameAr}</div>
                        {dep.nameEn && (
                          <div className="text-[10px] font-sans font-normal opacity-80 mt-0.5">
                            {dep.nameEn}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Vertical connector line from DG to Central Body */}
            <div className="w-0.5 h-10 bg-amber-600"></div>
          </div>

          {/* 3. Middle Tier: Central Departments (الأقسام المركزية - 12 قسماً) */}
          <div className="mb-14 relative">
            <div className="text-center mb-4">
              <span className="inline-block px-4 py-1 rounded-full text-xs font-black border bg-sky-50 border-sky-300 text-sky-900">
                الأقسام المركزية التابعة لإدارة الشركة ({toArabicDigits(centralDepartments.length)} قسم)
              </span>
            </div>

            {/* Two balanced symmetrical columns matching the official chart */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 max-w-4xl mx-auto relative px-6">
              {/* Vertical Divider Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-slate-300"></div>

              {/* Right Column */}
              <div className="space-y-2.5">
                {rightCentralDepts.map((dept) => {
                  const isHighlighted = matchingIds.has(dept.id);
                  const unitsCount = getEntityUnitCount(dept.id);
                  const isSelected = selectionMode && isEntitySelected(dept);
                  const selectIdx = selectionMode ? getEntitySelectionIndex(dept) : -1;
                  return (
                    <div
                      key={dept.id}
                      onClick={() => handleEntityClick(dept)}
                      className={`p-2.5 rounded-xl border text-right cursor-pointer transition hover:translate-x-1 flex items-center justify-between shadow-xs relative ${
                        isSelected
                          ? selectIdx === 0
                            ? 'ring-4 ring-amber-500 bg-amber-100 border-amber-600 shadow-amber-500/30'
                            : 'ring-4 ring-emerald-500 bg-emerald-50 border-emerald-600 shadow-emerald-500/30'
                          : isHighlighted
                          ? 'ring-2 ring-amber-400 bg-amber-100'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    >
                      {renderSelectionBadge(dept)}
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                        <div>
                          <div className="text-xs font-black">{dept.nameAr}</div>
                          {dept.nameEn && (
                            <div className="text-[10px] text-slate-500 font-sans">{dept.nameEn}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span>{toArabicDigits(dept.employeeCount || 0)} موظف</span>
                        {unitsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {toArabicDigits(unitsCount)} أصل
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Left Column */}
              <div className="space-y-2.5">
                {leftCentralDepts.map((dept) => {
                  const isHighlighted = matchingIds.has(dept.id);
                  const unitsCount = getEntityUnitCount(dept.id);
                  const isSelected = selectionMode && isEntitySelected(dept);
                  const selectIdx = selectionMode ? getEntitySelectionIndex(dept) : -1;
                  return (
                    <div
                      key={dept.id}
                      onClick={() => handleEntityClick(dept)}
                      className={`p-2.5 rounded-xl border text-right cursor-pointer transition hover:-translate-x-1 flex items-center justify-between shadow-xs relative ${
                        isSelected
                          ? selectIdx === 0
                            ? 'ring-4 ring-amber-500 bg-amber-100 border-amber-600 shadow-amber-500/30'
                            : 'ring-4 ring-emerald-500 bg-emerald-50 border-emerald-600 shadow-emerald-500/30'
                          : isHighlighted
                          ? 'ring-2 ring-amber-400 bg-amber-100'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-900'
                      }`}
                    >
                      {renderSelectionBadge(dept)}
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                        <div>
                          <div className="text-xs font-black">{dept.nameAr}</div>
                          {dept.nameEn && (
                            <div className="text-[10px] text-slate-500 font-sans">{dept.nameEn}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span>{toArabicDigits(dept.employeeCount || 0)} موظف</span>
                        {unitsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {toArabicDigits(unitsCount)} أصل
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Bottom Tier: The Commissions & Their Child Sections / Departments */}
          <div className="relative pt-6 border-t-2 border-dashed border-amber-500/40">
            {/* Horizontal Distribution Beam Line: starts at center of first column and ends at center of last column */}
            <div
              className="absolute top-0 h-1 rounded-full bg-amber-600"
              style={{
                left: `${commissions.length > 1 ? (50 / commissions.length).toFixed(2) : 50}%`,
                right: `${commissions.length > 1 ? (50 / commissions.length).toFixed(2) : 50}%`,
              }}
            ></div>

            {/* Commissions Grid: Columns dynamically distributed based on count */}
            <div
              className="grid gap-3 pt-6"
              style={{
                gridTemplateColumns: `repeat(${Math.max(commissions.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {commissions.map((commission, idx) => {
                const children = commissionChildrenMap.get(commission.id) || [];
                const isHighlighted = matchingIds.has(commission.id);
                const isSelected = selectionMode && isEntitySelected(commission);
                const selectIdx = selectionMode ? getEntitySelectionIndex(commission) : -1;
                const totalCommStaff =
                  (commission.employeeCount || 0) +
                  children.reduce((acc, c) => acc + (c.employeeCount || 0), 0);

                return (
                  <div key={commission.id} className="flex flex-col items-center relative">
                    {/* Dropping Connector Line from Trunk to Commission Header */}
                    <div className="w-0.5 h-6 -mt-6 mb-2 bg-amber-600"></div>

                    {/* Commission Top Card (Pill shape) */}
                    <div
                      onClick={() => handleEntityClick(commission)}
                      className={`w-full p-2.5 rounded-2xl border-2 text-center cursor-pointer transition hover:scale-102 shadow-xs relative ${
                        isSelected
                          ? selectIdx === 0
                            ? 'ring-4 ring-amber-500 bg-amber-100 border-amber-600 shadow-amber-500/30'
                            : 'ring-4 ring-emerald-500 bg-emerald-50 border-emerald-600 shadow-emerald-500/30'
                          : isHighlighted
                          ? 'ring-2 ring-amber-400 bg-amber-200'
                          : 'bg-amber-100/80 border-amber-600 text-slate-950 hover:bg-amber-200'
                      }`}
                    >
                      {renderSelectionBadge(commission)}
                      <span className="text-[10px] font-bold text-amber-800 block mb-0.5">
                        هيئة رقم {toArabicDigits(idx + 1)}
                      </span>
                      <h4 className="text-xs font-black leading-snug">{commission.nameAr}</h4>
                      {commission.nameEn && (
                        <div className="text-[9px] font-sans text-slate-500 truncate mt-0.5">
                          {commission.nameEn}
                        </div>
                      )}
                      <div className="mt-1.5 pt-1 border-t border-amber-500/30 flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-700">
                        <span>{toArabicDigits(children.length)} تشكيل تابع</span>
                        <span>•</span>
                        <span>{toArabicDigits(totalCommStaff)} موظف</span>
                      </div>
                    </div>

                    {/* Vertical Connecting Spine Line down to children */}
                    {children.length > 0 && (
                      <div className="w-0.5 h-4 my-1 bg-slate-400"></div>
                    )}

                    {/* Children Items Stack (Vertical Pill List) */}
                    <div className="w-full space-y-1.5">
                      {children.map((child) => {
                        const isChildHighlighted = matchingIds.has(child.id);
                        const isChildSelected = selectionMode && isEntitySelected(child);
                        const childSelectIdx = selectionMode ? getEntitySelectionIndex(child) : -1;
                        const isDept = child.level === 'department';
                        const isUnit = child.level === 'unit';
                        const unitsCount = getEntityUnitCount(child.id);

                        return (
                          <div
                            key={child.id}
                            onClick={() => handleEntityClick(child)}
                            className={`w-full p-2 rounded-xl border text-right cursor-pointer transition hover:scale-102 shadow-2xs relative ${
                              isChildSelected
                                ? childSelectIdx === 0
                                  ? 'ring-4 ring-amber-500 bg-amber-100 border-amber-600 shadow-amber-500/30'
                                  : 'ring-4 ring-emerald-500 bg-emerald-50 border-emerald-600 shadow-emerald-500/30'
                                : isChildHighlighted
                                ? 'ring-2 ring-amber-400 bg-amber-100'
                                : isDept
                                ? 'bg-sky-50/80 border-sky-300 hover:bg-sky-100 text-slate-900'
                                : isUnit
                                ? 'bg-purple-50/80 border-purple-300 hover:bg-purple-100 text-slate-900'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            {renderSelectionBadge(child)}
                            <div className="flex items-start justify-between gap-1">
                              <span
                                className={`text-[8px] font-bold px-1 rounded ${
                                  isDept
                                    ? 'bg-sky-500/20 text-sky-800'
                                    : isUnit
                                    ? 'bg-purple-500/20 text-purple-800'
                                    : 'bg-slate-500/10 text-slate-600'
                                }`}
                              >
                                {isDept ? 'قسم' : isUnit ? 'وحدة' : 'شعبة'}
                              </span>

                              {child.code && (
                                <span className="font-mono text-[8px] text-slate-400">
                                  {child.code}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] font-bold mt-0.5 leading-snug">
                              {child.nameAr}
                            </div>

                            <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
                              <span>{toArabicDigits(child.employeeCount || 0)} موظف</span>
                              {unitsCount > 0 && (
                                <span className="text-emerald-700 font-bold">
                                  {toArabicDigits(unitsCount)} أصل
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Document Footer & Sign-off (Taken from Visual Branding) */}
          <div className="mt-14 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-slate-700">
                وثيقة هيكلية إدارية رسمية معتمدة ومبرمجة ديناميكياً
              </span>
            </div>

            <div className="text-center font-bold text-slate-700">
              {branding?.copyrightText ||
                `جميع الحقوق محفوظة © ${toArabicDigits(new Date().getFullYear())} - ${branding?.companyName || 'شركة نفط الوسط'} • ${branding?.ministryName || 'وزارة النفط العراقية'}`}
            </div>

            <div className="font-mono text-[11px] text-slate-600">
              {branding?.systemName || 'النظام الموحد لإدارة الأصول'} • {branding?.companyName || 'Midland OS'}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Detail Slide-out / Modal for Clicked Entity (Daylight / Light Mode) */}
      {selectedEntity && (
        <div className="non-printable fixed bottom-6 left-6 z-50 w-96 p-5 rounded-2xl bg-white/95 border border-amber-500/40 text-slate-900 shadow-2xl shadow-slate-900/20 backdrop-blur-md animate-fade-in">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-500/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 leading-tight">
                  {selectedEntity.nameAr}
                </h4>
                {selectedEntity.nameEn && (
                  <p className="text-xs text-slate-500 font-sans mt-0.5">{selectedEntity.nameEn}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="إغلاق البطاقة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-bold">الرمز الإداري:</span>
              <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {selectedEntity.code}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-bold">المستوى الهيكلي:</span>
              <span className="font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                {getArabicLevelLabel(selectedEntity)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-bold">الكادر البشري المباشر:</span>
              <span className="font-bold text-sky-700">
                {toArabicDigits(selectedEntity.employeeCount || 0)} موظف
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-bold">الأصول الإنشائية المشغولة:</span>
              <span className="font-bold text-emerald-700">
                {toArabicDigits(getEntityUnitCount(selectedEntity.id))} وحدة أصل
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-bold">الحالة التشغيلية:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  selectedEntity.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {selectedEntity.status === 'active' ? 'نشط ومعتمد' : 'معطل مؤقتاً'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
