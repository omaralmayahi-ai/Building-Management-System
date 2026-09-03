import React, { useState, useMemo } from 'react';
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
  Filter,
  Eye,
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

const LEVEL_LABELS: Record<string, { label: string; color: string; bgLight: string; bgDark: string }> = {
  director_general: { label: 'الإدارة العليا', color: 'text-amber-500', bgLight: 'bg-amber-100 border-amber-300', bgDark: 'bg-amber-500/20 border-amber-500/40' },
  deputy_director: { label: 'معاون المدير العام', color: 'text-amber-400', bgLight: 'bg-amber-50 border-amber-200', bgDark: 'bg-amber-500/10 border-amber-500/30' },
  commission: { label: 'هيئة', color: 'text-emerald-500', bgLight: 'bg-emerald-100 border-emerald-300', bgDark: 'bg-emerald-500/20 border-emerald-500/40' },
  central_dept: { label: 'قسم مركزي', color: 'text-cyan-500', bgLight: 'bg-cyan-100 border-cyan-300', bgDark: 'bg-cyan-500/20 border-cyan-500/40' },
  department: { label: 'قسم', color: 'text-blue-500', bgLight: 'bg-blue-100 border-blue-300', bgDark: 'bg-blue-500/20 border-blue-500/40' },
  section: { label: 'شعبة', color: 'text-purple-500', bgLight: 'bg-purple-100 border-purple-300', bgDark: 'bg-purple-500/20 border-purple-500/40' },
  unit: { label: 'وحدة إدارية', color: 'text-slate-400', bgLight: 'bg-slate-100 border-slate-300', bgDark: 'bg-slate-800 border-slate-700' },
};

export const OrgEntityPickerModal: React.FC<OrgEntityPickerModalProps> = ({
  isOpen,
  onClose,
  orgEntities,
  selectedEntity,
  onSelectEntity,
  title = 'اختيار التشكيل / الجهة الشاغلة',
  subtitle = 'اختر تشكيلاً أو قسماً من الهيكل الإداري للشركة لتصفية وعرض المباني والوحدات التابعة له',
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
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

  // Filter entities based on search and level
  const filteredList = useMemo(() => {
    let list = activeEntities;
    if (selectedLevelFilter !== 'all') {
      list = list.filter((e) => e.level === selectedLevelFilter);
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

  // Recursive Tree Node
  const renderTreeNode = (node: OrgEntity, depth: number = 0) => {
    const children = activeEntities
      .filter((e) => e.parentId === node.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedEntity === node.nameAr;
    const lvl = LEVEL_LABELS[node.level] || LEVEL_LABELS.unit;

    // Check if node or any child matches search
    const matchesSearch =
      !searchQuery.trim() ||
      node.nameAr.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (node.code && node.code.toLowerCase().includes(searchQuery.toLowerCase().trim()));

    // If level filter active, check if node matches
    const matchesLevel = selectedLevelFilter === 'all' || node.level === selectedLevelFilter;

    return (
      <div key={node.id} className="relative select-none">
        <div
          onClick={() => handleSelect(node.nameAr)}
          className={`group flex items-center justify-between p-2.5 my-1 rounded-xl border transition-all cursor-pointer ${
            isSelected
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md ring-2 ring-amber-400/40'
              : isLight
              ? 'bg-white hover:bg-amber-50/70 border-slate-200 text-slate-800 hover:border-amber-300'
              : 'bg-slate-900/90 hover:bg-slate-800/80 border-slate-800 text-slate-200 hover:border-amber-500/40'
          }`}
          style={{ marginRight: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {children.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className={`p-1 rounded-md transition ${
                  isSelected
                    ? 'bg-slate-950/20 text-slate-950 hover:bg-slate-950/30'
                    : isLight
                    ? 'hover:bg-slate-200 text-slate-600'
                    : 'hover:bg-slate-700 text-slate-400'
                }`}
                title={isExpanded ? 'طي الفروع' : 'توسيع الفروع'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6" />
            )}

            <div
              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 text-xs font-black ${
                isSelected
                  ? 'bg-slate-950 text-amber-400 border-slate-800'
                  : isLight
                  ? `${lvl.bgLight} ${lvl.color}`
                  : `${lvl.bgDark} ${lvl.color}`
              }`}
            >
              {node.code?.slice(0, 3) || 'ORG'}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs truncate font-bold ${isSelected ? 'text-slate-950 font-black' : ''}`}>
                  {node.nameAr}
                </span>
                {isSelected && (
                  <span className="bg-slate-950 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                    <Check className="w-3 h-3" />
                    المحدد حالياً
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] opacity-75 mt-0.5">
                <span>{lvl.label}</span>
                {node.code && <span>• الرمز: {node.code}</span>}
                {node.employeeCount > 0 && <span>• الكادر: {toArabicDigits(node.employeeCount)} موظف</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {children.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected
                    ? 'bg-slate-950/20 text-slate-950'
                    : isLight
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-slate-800 text-slate-400'
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
              className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition ${
                isSelected
                  ? 'bg-slate-950 text-amber-400 border-slate-950'
                  : 'bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border-amber-500/30'
              }`}
            >
              اختيار
            </button>
          </div>
        </div>

        {/* Render children if expanded */}
        {children.length > 0 && isExpanded && (
          <div className="pr-2 border-r-2 border-slate-300 dark:border-slate-800 space-y-0.5">
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>{title}</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search Bar */}
        <div
          className={`p-4 border-b space-y-3 ${
            isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          {/* Search Input & Reset / All Button */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search
                className={`absolute right-3 top-3 w-4 h-4 ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم التشكيل، القسم، الهيئة، الشعبة، أو الرمز..."
                className={`w-full pr-9 pl-4 py-2 text-xs sm:text-sm rounded-xl border font-medium outline-none focus:border-amber-500 transition ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Select All / Clear Filter Button */}
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition shrink-0 cursor-pointer ${
                selectedEntity === 'all'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                  : isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <Check className="w-4 h-4 text-amber-500" />
              <span>كافة التشكيلات والجهات (إلغاء التصفية)</span>
            </button>
          </div>

          {/* Level Filter Tabs & Tree Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[11px] font-bold ml-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                المستوى:
              </span>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('all')}
                className={`px-2.5 py-1 rounded-lg border font-bold transition ${
                  selectedLevelFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                الكل ({toArabicDigits(activeEntities.length)})
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('commission')}
                className={`px-2.5 py-1 rounded-lg border font-bold transition ${
                  selectedLevelFilter === 'commission'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                الهيئات
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('department')}
                className={`px-2.5 py-1 rounded-lg border font-bold transition ${
                  selectedLevelFilter === 'department'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                الأقسام
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('section')}
                className={`px-2.5 py-1 rounded-lg border font-bold transition ${
                  selectedLevelFilter === 'section'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                الشُعب
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter('unit')}
                className={`px-2.5 py-1 rounded-lg border font-bold transition ${
                  selectedLevelFilter === 'unit'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                الوحدات الإدارية
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {viewMode === 'tree' && (
                <>
                  <button
                    type="button"
                    onClick={expandAll}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                      isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    توسيع الكل
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                      isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    طي الكل
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'tree' ? 'list' : 'tree')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                  isLight
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                {viewMode === 'tree' ? <Filter className="w-3 h-3" /> : <FolderTree className="w-3 h-3" />}
                <span>{viewMode === 'tree' ? 'عرض القائمة' : 'عرض الهيكل الشجري'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Entity Selection Area */}
        <div className="p-4 overflow-y-auto flex-1 max-h-[60vh] space-y-2">
          {viewMode === 'tree' && !searchQuery.trim() && selectedLevelFilter === 'all' ? (
            /* Structured Tree View */
            <div className="space-y-1">
              {rootEntities.map((root) => renderTreeNode(root, 0))}
            </div>
          ) : (
            /* Flat Filtered / Search List View */
            <div className="space-y-1.5">
              {filteredList.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Network className="w-10 h-10 mx-auto text-slate-500 animate-pulse" />
                  <p className="text-sm font-bold text-slate-400">لا توجد تشكيلات مطابقة لمعايير البحث</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedLevelFilter('all');
                    }}
                    className="text-xs text-amber-500 underline font-bold"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              ) : (
                filteredList.map((entity) => {
                  const isSelected = selectedEntity === entity.nameAr;
                  const lvl = LEVEL_LABELS[entity.level] || LEVEL_LABELS.unit;
                  const parentEntity = entity.parentId ? entityMap.get(entity.parentId) : null;

                  return (
                    <div
                      key={entity.id}
                      onClick={() => handleSelect(entity.nameAr)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                          : isLight
                          ? 'bg-white hover:bg-amber-50 border-slate-200 text-slate-800'
                          : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 text-xs font-black ${
                            isSelected
                              ? 'bg-slate-950 text-amber-400 border-slate-800'
                              : isLight
                              ? `${lvl.bgLight} ${lvl.color}`
                              : `${lvl.bgDark} ${lvl.color}`
                          }`}
                        >
                          {entity.code?.slice(0, 3) || 'ORG'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-slate-950' : ''}`}>
                              {entity.nameAr}
                            </span>
                            {isSelected && (
                              <span className="bg-slate-950 text-amber-400 text-[10px] px-2 py-0.5 rounded font-black flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                نشط
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] opacity-75 mt-0.5">
                            <span className="font-bold">{lvl.label}</span>
                            {parentEntity && <span>• تابع لـ: {parentEntity.nameAr}</span>}
                            {entity.code && <span>• الرمز: {entity.code}</span>}
                            {entity.employeeCount > 0 && <span>• الكادر: {toArabicDigits(entity.employeeCount)} موظف</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(entity.nameAr);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold border shrink-0 transition ${
                          isSelected
                            ? 'bg-slate-950 text-amber-400 border-slate-950'
                            : 'bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border-amber-500/30'
                        }`}
                      >
                        اختيار
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
          className={`p-3 sm:p-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold opacity-75">التشكيل المحدد حالياً:</span>
            <span
              className={`px-2.5 py-1 rounded-lg border font-black ${
                selectedEntity !== 'all'
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {selectedEntity !== 'all' ? selectedEntity : 'جميع التشكيلات والجهات الشاغلة (غير مخصص)'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2">
            {selectedEntity !== 'all' && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition"
              >
                إلغاء التخصيص
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl border font-bold transition ${
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
