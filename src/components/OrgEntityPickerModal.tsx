import React, { useState, useMemo, useEffect } from 'react';
import {
  Network,
  Search,
  X,
  Check,
  Building2,
  Layers,
  ChevronRight,
  ChevronDown,
  Users,
  FolderTree,
  Folder,
  Filter,
  Shield,
  Briefcase,
  Box,
} from 'lucide-react';
import { OrgEntity, OrgLevel } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';

interface OrgEntityPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgEntities: OrgEntity[];
  selectedEntity: string; // 'all' or entity nameAr
  onSelectEntity: (entityName: string) => void;
  title?: string;
  subtitle?: string;
  theme?: 'dark' | 'light';
}

interface LevelMeta {
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgLight: string;
  bgDark: string;
  badgeBgLight: string;
  badgeBgDark: string;
}

const LEVEL_CONFIG: Record<string, LevelMeta> = {
  director_general: {
    label: 'الإدارة العليا',
    shortLabel: 'إدارة',
    icon: Shield,
    color: 'text-amber-500',
    bgLight: 'bg-amber-100 border-amber-300',
    bgDark: 'bg-amber-500/20 border-amber-500/40',
    badgeBgLight: 'bg-amber-100 text-amber-900 border-amber-300',
    badgeBgDark: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  deputy_director: {
    label: 'معاون المدير العام',
    shortLabel: 'معاون',
    icon: Briefcase,
    color: 'text-amber-400',
    bgLight: 'bg-amber-50 border-amber-200',
    bgDark: 'bg-amber-500/10 border-amber-500/30',
    badgeBgLight: 'bg-amber-50 text-amber-900 border-amber-300',
    badgeBgDark: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  commission: {
    label: 'هيئة',
    shortLabel: 'هيئة',
    icon: Building2,
    color: 'text-emerald-500',
    bgLight: 'bg-emerald-100 border-emerald-300',
    bgDark: 'bg-emerald-500/20 border-emerald-500/40',
    badgeBgLight: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    badgeBgDark: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  central_dept: {
    label: 'قسم مركزي',
    shortLabel: 'مركزي',
    icon: Layers,
    color: 'text-cyan-500',
    bgLight: 'bg-cyan-100 border-cyan-300',
    bgDark: 'bg-cyan-500/20 border-cyan-500/40',
    badgeBgLight: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    badgeBgDark: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  department: {
    label: 'قسم',
    shortLabel: 'قسم',
    icon: FolderTree,
    color: 'text-blue-500',
    bgLight: 'bg-blue-100 border-blue-300',
    bgDark: 'bg-blue-500/20 border-blue-500/40',
    badgeBgLight: 'bg-blue-100 text-blue-900 border-blue-300',
    badgeBgDark: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  section: {
    label: 'شعبة',
    shortLabel: 'شعبة',
    icon: Folder,
    color: 'text-purple-500',
    bgLight: 'bg-purple-100 border-purple-300',
    bgDark: 'bg-purple-500/20 border-purple-500/40',
    badgeBgLight: 'bg-purple-100 text-purple-900 border-purple-300',
    badgeBgDark: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  unit: {
    label: 'وحدة إدارية',
    shortLabel: 'وحدة',
    icon: Box,
    color: 'text-slate-400',
    bgLight: 'bg-slate-100 border-slate-300',
    bgDark: 'bg-slate-800 border-slate-700',
    badgeBgLight: 'bg-slate-100 text-slate-700 border-slate-300',
    badgeBgDark: 'bg-slate-800 text-slate-300 border-slate-700',
  },
};

export const OrgEntityPickerModal: React.FC<OrgEntityPickerModalProps> = ({
  isOpen,
  onClose,
  orgEntities,
  selectedEntity,
  onSelectEntity,
  title = 'اختيار التشكيل / الجهة الشاغلة للمنشآت النفطية',
  subtitle = 'اختر تشكيلاً أو قسماً من الهيكل الإداري للشركة لتصفية وعرض المباني والوحدات التابعة له',
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsMobileScreen(window.innerWidth < 640);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    // By default, expand top 2 levels
    const init: Record<string, boolean> = {};
    orgEntities.forEach((e) => {
      if (!e.parentId || e.level === 'director_general' || e.level === 'commission' || e.level === 'deputy_director') {
        init[e.id] = true;
      }
    });
    return init;
  });

  // Filter active entities
  const activeEntities = useMemo(() => {
    return orgEntities.filter((e) => e.status !== 'disabled');
  }, [orgEntities]);

  // Fast lookup by ID
  const entityMap = useMemo(() => {
    const map = new Map<string, OrgEntity>();
    activeEntities.forEach((e) => map.set(e.id, e));
    return map;
  }, [activeEntities]);

  // Helper to categorize entity level consistently
  const getEntityLevelCategory = (e: OrgEntity): string => {
    if (e.level === 'deputy_director' || e.nameAr?.includes('معاون')) {
      return 'deputy_director';
    }
    if (e.level === 'commission' || e.nameAr?.includes('هيئة')) {
      return 'commission';
    }
    if (
      e.level === 'central_dept' ||
      (e.level === 'department' && (e.nameAr?.includes('مركزي') || e.parentId === 'dg-1'))
    ) {
      return 'central_dept';
    }
    if (e.level === 'department') {
      return 'department';
    }
    if (e.level === 'section') {
      return 'section';
    }
    if (e.level === 'unit') {
      return 'unit';
    }
    return e.level || 'unit';
  };

  // Compute exact counts for each level filter
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: activeEntities.length,
      deputy_director: 0,
      commission: 0,
      central_dept: 0,
      department: 0,
      section: 0,
      unit: 0,
    };
    activeEntities.forEach((e) => {
      const cat = getEntityLevelCategory(e);
      if (cat in counts) {
        counts[cat]++;
      }
    });
    return counts;
  }, [activeEntities]);

  // Filter entities based on search and level
  const filteredList = useMemo(() => {
    let list = activeEntities;
    if (selectedLevelFilter !== 'all') {
      list = list.filter((e) => getEntityLevelCategory(e) === selectedLevelFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.nameAr?.toLowerCase().includes(q) ||
          e.nameEn?.toLowerCase().includes(q) ||
          e.code?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeEntities, selectedLevelFilter, searchQuery]);

  // Root entities for tree view
  const rootEntities = useMemo(() => {
    return activeEntities
      .filter((e) => !e.parentId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [activeEntities]);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    activeEntities.forEach((e) => {
      all[e.id] = true;
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  const handleSelect = (name: string) => {
    onSelectEntity(name);
    onClose();
  };

  // Helper to get level configuration
  const getLevelMeta = (level: string): LevelMeta => {
    return LEVEL_CONFIG[level] || LEVEL_CONFIG.unit;
  };

  // Recursive Tree Node
  const renderTreeNode = (node: OrgEntity, depth: number = 0) => {
    const children = activeEntities
      .filter((e) => e.parentId === node.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedEntity === node.nameAr;
    const lvl = getLevelMeta(node.level);
    const LevelIcon = lvl.icon;

    // Check if node or any child matches search
    const matchesSearch =
      !searchQuery.trim() ||
      node.nameAr.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (node.code && node.code.toLowerCase().includes(searchQuery.toLowerCase().trim()));

    // If level filter active, check if node matches
    const matchesLevel = selectedLevelFilter === 'all' || node.level === selectedLevelFilter;

    // Mobile indent is small so content doesn't push off screen on phones
    const mobileIndent = Math.min(depth * 6, 20);
    const desktopIndent = Math.min(depth * 14, 56);

    return (
      <div key={node.id} className="relative select-none">
        <div
          onClick={() => handleSelect(node.nameAr)}
          className={`group flex items-center justify-between p-2 sm:p-2.5 my-1 rounded-xl border transition-all cursor-pointer min-w-0 ${
            isSelected
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md ring-2 ring-amber-400/40'
              : isLight
              ? 'bg-white hover:bg-amber-50/70 border-slate-200 text-slate-800 hover:border-amber-300'
              : 'bg-slate-900/90 hover:bg-slate-800/80 border-slate-800 text-slate-200 hover:border-amber-500/40'
          }`}
          style={{
            marginRight: isMobileScreen ? `${mobileIndent}px` : `${desktopIndent}px`,
          }}
        >
          {/* Right section in RTL: expand arrow, level icon, title & meta */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
            {children.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className={`p-1 sm:p-1.5 rounded-lg transition shrink-0 ${
                  isSelected
                    ? 'bg-slate-950/20 text-slate-950 hover:bg-slate-950/30'
                    : isLight
                    ? 'hover:bg-slate-200 text-slate-600'
                    : 'hover:bg-slate-700 text-slate-400'
                }`}
                title={isExpanded ? 'طي الفروع' : 'توسيع الفروع'}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            ) : (
              <span className="w-4 sm:w-5 shrink-0" />
            )}

            {/* Level Icon with Theme Color */}
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
                isSelected
                  ? 'bg-slate-950 text-amber-400 border-slate-800'
                  : isLight
                  ? `${lvl.bgLight} ${lvl.color}`
                  : `${lvl.bgDark} ${lvl.color}`
              }`}
              title={lvl.label}
            >
              <LevelIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>

            {/* Texts */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-xs sm:text-sm font-black truncate leading-tight ${isSelected ? 'text-slate-950' : isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {node.nameAr}
                </span>
                {isSelected && (
                  <span className="bg-slate-950 text-amber-400 text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-black flex items-center gap-0.5 shrink-0 shadow-xs">
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    محدد
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] sm:text-[10px] mt-0.5">
                {/* Level badge */}
                <span className={`px-1.5 py-0.2 rounded font-bold border text-[9px] sm:text-[9.5px] shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-amber-300 border-slate-700'
                    : isLight
                    ? lvl.badgeBgLight
                    : lvl.badgeBgDark
                }`}>
                  {lvl.label}
                </span>

                {node.code && (
                  <span className={`font-mono text-[9px] sm:text-[9.5px] px-1 py-0.2 rounded border font-semibold shrink-0 ${
                    isSelected
                      ? 'bg-slate-900/10 text-slate-950 border-slate-900/20'
                      : isLight
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700'
                  }`}>
                    {node.code}
                  </span>
                )}

                {node.employeeCount > 0 && (
                  <span className={`hidden xs:inline-flex items-center gap-0.5 shrink-0 ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                    • {toArabicDigits(node.employeeCount)} موظف
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Left section in RTL: Branches count & Select button */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 mr-1 sm:mr-2">
            {children.length > 0 && (
              <span
                className={`text-[9.5px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold shrink-0 ${
                  isSelected
                    ? 'bg-slate-950/20 text-slate-950 font-black'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {toArabicDigits(children.length)} فروع
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(node.nameAr);
              }}
              className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-xl font-bold border transition shrink-0 flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-slate-950 text-amber-400 border-slate-950 font-black shadow-xs'
                  : 'bg-amber-500/15 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 border-amber-500/30'
              }`}
            >
              <span>{isSelected ? 'المحدد' : 'اختيار'}</span>
              <Check className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'opacity-70'}`} />
            </button>
          </div>
        </div>

        {/* Render children if expanded */}
        {children.length > 0 && isExpanded && (
          <div className="pr-1.5 sm:pr-2 border-r-2 border-slate-300 dark:border-slate-800 space-y-0.5">
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl h-[96dvh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-3 py-2.5 sm:px-5 sm:py-4 border-b flex items-center justify-between gap-2.5 shrink-0 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Network className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs xs:text-sm sm:text-base font-black leading-tight">
                {title}
              </h3>
              <p className={`text-[10px] sm:text-xs mt-1 leading-snug break-words ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl border transition shrink-0 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="إغلاق النافذة"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Toolbar & Search Bar - Clean, Compact & Highly responsive for Mobile */}
        <div
          className={`p-2.5 sm:p-3 border-b space-y-2 shrink-0 ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {/* Search Input & "كافة التشكيلات" Quick Selection */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                className={`absolute right-3 top-2.5 w-4 h-4 ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم التشكيل، القسم، الهيئة، أو الرمز..."
                className={`w-full pr-9 pl-8 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl border font-medium outline-none focus:border-amber-500 transition ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Select All / Clear Filter Button - Compact for Mobile */}
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer ${
                selectedEntity === 'all'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="إلغاء التخصيص وعرض كافة منشآت ومباني الشركة"
            >
              <Check className={`w-3.5 h-3.5 ${selectedEntity === 'all' ? 'text-slate-950' : 'text-amber-500'}`} />
              <span className="hidden xs:inline">كافة التشكيلات</span>
              <span className="xs:hidden">الكل</span>
            </button>
          </div>

          {/* Level Filter Cards - 7 Distinct Cards organized cleanly for mobile & desktop */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
              <span className={`flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span>المستوى:</span>
              </span>
              {selectedLevelFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedLevelFilter('all')}
                  className="text-amber-500 hover:underline cursor-pointer"
                >
                  عرض كافة المستويات
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-1.5 w-full">
              {/* 1. الكل (83) - Takes 2 cols on mobile for balanced 2x4 grid */}
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('all')}
                className={`p-1 sm:p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer col-span-2 sm:col-span-1 min-h-[42px] ${
                  selectedLevelFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs ring-1 ring-amber-400'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black">الكل</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 opacity-90">
                  ({toArabicDigits(levelCounts.all)})
                </span>
              </button>

              {/* 2. المعاونين (2) */}
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('deputy_director')}
                className={`p-1 sm:p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer col-span-1 min-h-[42px] ${
                  selectedLevelFilter === 'deputy_director'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs ring-1 ring-amber-400'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black">المعاونين</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 opacity-90">
                  ({toArabicDigits(levelCounts.deputy_director)})
                </span>
              </button>

              {/* 3. الهيئات (9) */}
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('commission')}
                className={`p-1 sm:p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer col-span-1 min-h-[42px] ${
                  selectedLevelFilter === 'commission'
                    ? 'bg-emerald-600 text-white border-emerald-500 font-black shadow-xs ring-1 ring-emerald-400'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black">الهيئات</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 opacity-90">
                  ({toArabicDigits(levelCounts.commission)})
                </span>
              </button>

              {/* 4. الأقسام المركزية (12) */}
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('central_dept')}
                className={`p-1 sm:p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer col-span-1 min-h-[42px] ${
                  selectedLevelFilter === 'central_dept'
                    ? 'bg-cyan-600 text-white border-cyan-500 font-black shadow-xs ring-1 ring-cyan-400'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span className="text-[9.5px] sm:text-xs font-black leading-tight">المركزية</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 opacity-90">
                  ({toArabicDigits(levelCounts.central_dept)})
                </span>
              </button>

              {/* 5. الأقسام (30) */}
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('department')}
                className={`p-1 sm:p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer col-span-1 min-h-[42px] ${
                  selectedLevelFilter === 'department'
                    ? 'bg-blue-600 text-white border-blue-500 font-black shadow-xs ring-1 ring-blue-400'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black">الأقسام</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 opacity-90">
                  ({toArabicDigits(levelCounts.department)})
                </span>
              </button>

              {/* 6. الشعب (29) */}
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('section')}
                className={`p-1 sm:p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer col-span-1 min-h-[42px] ${
                  selectedLevelFilter === 'section'
                    ? 'bg-purple-600 text-white border-purple-500 font-black shadow-xs ring-1 ring-purple-400'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black">الشعب</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 opacity-90">
                  ({toArabicDigits(levelCounts.section)})
                </span>
              </button>

              {/* 7. الوحدات (0) */}
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('unit')}
                className={`p-1 sm:p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer col-span-1 min-h-[42px] ${
                  selectedLevelFilter === 'unit'
                    ? 'bg-slate-700 text-white border-slate-600 font-black shadow-xs ring-1 ring-slate-400'
                    : isLight
                    ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black">الوحدات</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black font-mono mt-0.5 opacity-90">
                  ({toArabicDigits(levelCounts.unit)})
                </span>
              </button>
            </div>
          </div>

          {/* View Mode & Expand Controls */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5 text-xs">
            <span className={`text-[10px] sm:text-[11px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              المطابق: <strong className="text-amber-500 font-black">{toArabicDigits(filteredList.length)}</strong> تشكيل
            </span>

            <div className="flex items-center gap-1 sm:gap-1.5">
              {viewMode === 'tree' && !searchQuery.trim() && selectedLevelFilter === 'all' && (
                <>
                  <button
                    type="button"
                    onClick={expandAll}
                    className={`px-2 py-0.5 sm:py-1 rounded-lg border text-[10px] sm:text-[11px] font-bold cursor-pointer ${
                      isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    توسيع
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className={`px-2 py-0.5 sm:py-1 rounded-lg border text-[10px] sm:text-[11px] font-bold cursor-pointer ${
                      isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    طي
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'tree' ? 'list' : 'tree')}
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border text-[10px] sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                  isLight
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                {viewMode === 'tree' ? <Filter className="w-3 h-3" /> : <FolderTree className="w-3 h-3" />}
                <span>{viewMode === 'tree' ? 'قائمة' : 'شجرة'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Entity Selection Area */}
        <div className="p-2 sm:p-3 overflow-y-auto flex-1 space-y-1 sm:space-y-1.5 overscroll-contain">
          {viewMode === 'tree' && !searchQuery.trim() && selectedLevelFilter === 'all' ? (
            /* Structured Tree View */
            <div className="space-y-1">
              {rootEntities.map((root) => renderTreeNode(root, 0))}
            </div>
          ) : (
            /* Flat Filtered / Search List View */
            <div className="space-y-1.5">
              {filteredList.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Network className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-slate-500 animate-pulse" />
                  <p className="text-xs sm:text-sm font-bold text-slate-400">لا توجد تشكيلات مطابقة لمعايير البحث</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedLevelFilter('all');
                    }}
                    className="text-xs text-amber-500 underline font-bold cursor-pointer"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              ) : (
                filteredList.map((entity) => {
                  const isSelected = selectedEntity === entity.nameAr;
                  const lvl = getLevelMeta(entity.level);
                  const LevelIcon = lvl.icon;
                  const parentEntity = entity.parentId ? entityMap.get(entity.parentId) : null;

                  return (
                    <div
                      key={entity.id}
                      onClick={() => handleSelect(entity.nameAr)}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer min-w-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md ring-2 ring-amber-400/40'
                          : isLight
                          ? 'bg-white hover:bg-amber-50/80 border-slate-200 text-slate-800 hover:border-amber-300'
                          : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-200 hover:border-amber-500/40'
                      }`}
                    >
                      {/* Right Section in RTL: Level icon, title, level badge, code, parent */}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
                            isSelected
                              ? 'bg-slate-950 text-amber-400 border-slate-800'
                              : isLight
                              ? `${lvl.bgLight} ${lvl.color}`
                              : `${lvl.bgDark} ${lvl.color}`
                          }`}
                          title={lvl.label}
                        >
                          <LevelIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className={`text-xs sm:text-sm font-black truncate leading-tight ${
                              isSelected ? 'text-slate-950 font-black' : isLight ? 'text-slate-900' : 'text-slate-100'
                            }`}>
                              {entity.nameAr}
                            </h4>
                            {isSelected && (
                              <span className="bg-slate-950 text-amber-400 text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-black flex items-center gap-0.5 shrink-0 shadow-xs">
                                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                محدد
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] sm:text-[10px] mt-1">
                            {/* Arabic Level Badge */}
                            <span className={`px-1.5 py-0.2 rounded font-bold border text-[9px] sm:text-[9.5px] shrink-0 ${
                              isSelected
                                ? 'bg-slate-900 text-amber-300 border-slate-700'
                                : isLight
                                ? lvl.badgeBgLight
                                : lvl.badgeBgDark
                            }`}>
                              {lvl.label}
                            </span>

                            {/* Parent Entity if any */}
                            {parentEntity && (
                              <span className={`truncate text-[9.5px] sm:text-[10px] flex items-center gap-0.5 ${
                                isSelected ? 'text-slate-900 font-semibold' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                <span>• تابع لـ:</span>
                                <strong className="truncate font-bold">{parentEntity.nameAr}</strong>
                              </span>
                            )}

                            {/* Entity Code */}
                            {entity.code && (
                              <span className={`font-mono text-[9px] sm:text-[9.5px] px-1.5 py-0.2 rounded border font-semibold shrink-0 ${
                                isSelected
                                  ? 'bg-slate-900/10 text-slate-950 border-slate-900/20'
                                  : isLight
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
                              }`}>
                                {entity.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Left Section in RTL: Selection Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(entity.nameAr);
                        }}
                        className={`text-[10px] sm:text-xs px-2.5 py-1 sm:py-1.5 rounded-xl font-bold border shrink-0 transition flex items-center gap-1 cursor-pointer mr-1 sm:mr-2 ${
                          isSelected
                            ? 'bg-slate-950 text-amber-400 border-slate-950 font-black shadow-xs'
                            : 'bg-amber-500/15 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 border-amber-500/30'
                        }`}
                      >
                        <span>{isSelected ? 'المحدد' : 'اختيار'}</span>
                        <Check className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'opacity-70'}`} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-3 py-2 sm:px-4 sm:py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shrink-0 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold opacity-75 text-[10px] sm:text-xs shrink-0">المحدد:</span>
            <span
              className={`px-2 py-0.5 rounded-lg border font-bold text-[10px] sm:text-xs truncate ${
                selectedEntity !== 'all'
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {selectedEntity !== 'all' ? selectedEntity : 'جميع التشكيلات (غير مخصص)'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            {selectedEntity !== 'all' && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className="px-2.5 sm:px-3 py-1 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition text-[10.5px] sm:text-xs cursor-pointer"
              >
                إلغاء التخصيص
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 sm:px-4 py-1 rounded-xl border font-bold transition text-[10.5px] sm:text-xs cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
              }`}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
