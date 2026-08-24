import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Network,
  Building2,
  Users,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Search,
  CheckCircle2,
  XCircle,
  GitFork,
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileText,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { OrgEntity, OrgLevel, UnitAsset } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import {
  generateOrgStructureCsvTemplate,
  exportOrgEntitiesToCsv,
  downloadFile,
  parseCsvText,
  parseOrgImportRows,
  OrgImportRow,
  ORG_LEVEL_LABELS,
} from '../utils/orgExcelUtils';

interface OrgStructureBuilderProps {
  isLight?: boolean;
  orgEntities: OrgEntity[];
  units?: UnitAsset[];
  onAddOrgEntity: (newEntity: OrgEntity) => void;
  onUpdateOrgEntity: (updatedEntity: OrgEntity) => void;
  onDeleteOrgEntity: (id: string, deleteChildren?: boolean) => void;
  onToggleOrgEntityStatus: (id: string) => void;
  onResetOrgEntitiesToDefault?: () => void;
  onBulkSaveOrgEntities?: (entities: OrgEntity[]) => void;
}

export const OrgStructureBuilder: React.FC<OrgStructureBuilderProps> = ({
  isLight = false,
  orgEntities,
  units = [],
  onAddOrgEntity,
  onUpdateOrgEntity,
  onDeleteOrgEntity,
  onToggleOrgEntityStatus,
  onResetOrgEntitiesToDefault,
  onBulkSaveOrgEntities,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgEntity | null>(null);

  // Delete State
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<OrgEntity | null>(null);
  const [deleteCascadeOption, setDeleteCascadeOption] = useState<'reparent' | 'cascade'>('reparent');

  // Excel Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<OrgImportRow[]>([]);
  const [importEntities, setImportEntities] = useState<OrgEntity[]>([]);
  const [importErrorCount, setImportErrorCount] = useState<number>(0);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [importSuccessToast, setImportSuccessToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formLevel, setFormLevel] = useState<OrgLevel>('department');
  const [formEmployeeCount, setFormEmployeeCount] = useState<number>(10);
  const [formError, setFormError] = useState('');

  const levelLabels: Record<OrgLevel, { label: string; color: string; badge: string }> = {
    company: {
      label: 'الشركة / المؤسسة',
      color: isLight
        ? 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold'
        : 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      badge: 'شركة / مؤسسة',
    },
    director_general: {
      label: 'المدير العام',
      color: isLight
        ? 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold'
        : 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      badge: 'المدير العام',
    },
    deputy_director: {
      label: 'معاون المدير العام',
      color: isLight
        ? 'bg-cyan-100 text-cyan-900 border-cyan-300 font-extrabold'
        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      badge: 'معاون مدير عام',
    },
    central_dept: {
      label: 'هيئة / قسم مركزي',
      color: isLight
        ? 'bg-sky-100 text-sky-900 border-sky-300 font-extrabold'
        : 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      badge: 'هيئة / قسم مركزي',
    },
    department: {
      label: 'قسم',
      color: isLight
        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold'
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      badge: 'قسم',
    },
    section: {
      label: 'شعبة',
      color: isLight
        ? 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      badge: 'شعبة',
    },
    unit: {
      label: 'وحدة',
      color: isLight
        ? 'bg-teal-100 text-teal-900 border-teal-300 font-extrabold'
        : 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      badge: 'وحدة',
    },
  };

  const getLevelInfo = (level?: string) => {
    if (!level) return levelLabels.department;
    if (levelLabels[level as OrgLevel]) return levelLabels[level as OrgLevel];
    if (level === 'directorate') return levelLabels.central_dept;
    if (level === 'division') return levelLabels.department;
    if (level === 'unit_team') return levelLabels.unit;
    return levelLabels.department;
  };

  // Toggle expand node
  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand All / Collapse All
  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    orgEntities.forEach((e) => {
      allExpanded[e.id] = true;
    });
    setExpandedNodes(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  // Calculate cumulative staff count (direct staff + all children branch staff)
  const calculateCumulativeEmployees = (nodeId: string): number => {
    const node = orgEntities.find((e) => e.id === nodeId);
    if (!node) return 0;
    const children = orgEntities.filter((e) => e.parentId === nodeId);
    let total = node.employeeCount || 0;
    children.forEach((child) => {
      total += calculateCumulativeEmployees(child.id);
    });
    return total;
  };

  // Calculate direct children count
  const getDirectChildrenCount = (nodeId: string): number => {
    return orgEntities.filter((e) => e.parentId === nodeId).length;
  };

  // Calculate units occupied by entity
  const getOccupiedUnitsCount = (entityName: string): number => {
    if (!entityName || !units) return 0;
    const lowerName = entityName.toLowerCase().trim();
    return units.filter((u) => u.department && u.department.toLowerCase().includes(lowerName)).length;
  };

  // Root entities (where parentId is null or parent not found in current entities)
  const rootEntities = useMemo(() => {
    return orgEntities.filter((e) => !e.parentId || !orgEntities.some((parent) => parent.id === e.parentId));
  }, [orgEntities]);

  // Overall Stats
  const totalFormationsCount = orgEntities.length;
  const totalEmployeesCount = useMemo(() => {
    return orgEntities.reduce((acc, curr) => acc + (curr.employeeCount || 0), 0);
  }, [orgEntities]);
  const directoratesCount = orgEntities.filter(
    (e) => e.level === 'central_dept' || e.level === 'director_general' || e.level === 'deputy_director'
  ).length;
  const departmentsCount = orgEntities.filter((e) => e.level === 'department').length;
  const sectionsCount = orgEntities.filter((e) => e.level === 'section' || e.level === 'unit').length;

  const getDefaultChildLevel = (parentLevel?: OrgLevel): OrgLevel => {
    switch (parentLevel) {
      case 'company':
        return 'director_general';
      case 'director_general':
        return 'deputy_director';
      case 'deputy_director':
        return 'central_dept';
      case 'central_dept':
        return 'department';
      case 'department':
        return 'section';
      case 'section':
      case 'unit':
        return 'unit';
      default:
        return 'department';
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const csvData = generateOrgStructureCsvTemplate();
    downloadFile(csvData, 'نموذج_الهيكل_التنظيمي_المعتمد.csv', 'text/csv;charset=utf-8;');
  };

  // Export existing structure
  const handleExportCurrentStructure = () => {
    if (orgEntities.length === 0) {
      alert('لا توجد بيانات بالهيكل التنظيمي للتصدير حالياً');
      return;
    }
    const csvData = exportOrgEntitiesToCsv(orgEntities);
    downloadFile(
      csvData,
      `الهيكل_التنظيمي_للمؤسسة_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  // Handle File selection for Excel/CSV import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setImportedFile(file);
    processUploadedFile(file);
  };

  const processUploadedFile = (file: File) => {
    setIsReadingFile(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          alert('الملف فارغ أو تعذر قراءة المحتوى');
          setIsReadingFile(false);
          return;
        }

        const rawRows = parseCsvText(text);
        if (rawRows.length === 0) {
          alert('تعذر استخراج أسطر بيانات من الملف. تأكد من أن الملف بصيغة CSV أو نصية صحيحة.');
          setIsReadingFile(false);
          return;
        }

        const parsed = parseOrgImportRows(rawRows);
        setImportRows(parsed.rows);
        setImportEntities(parsed.entities);
        setImportErrorCount(parsed.errorCount);
      } catch (err: any) {
        console.error('Error parsing org file:', err);
        alert('حدث خطأ أثناء قراءة الملف: ' + (err?.message || String(err)));
      } finally {
        setIsReadingFile(false);
      }
    };

    reader.onerror = () => {
      alert('فشلت قراءة الملف من القرص');
      setIsReadingFile(false);
    };

    reader.readAsText(file, 'utf-8');
  };

  // Commit imported structure
  const handleCommitImport = () => {
    if (importEntities.length === 0) {
      alert('لا توجد تشكيلات صالحة للاستيراد');
      return;
    }

    let finalEntities: OrgEntity[] = [];
    if (importMode === 'replace') {
      finalEntities = importEntities;
    } else {
      // Merge: update matching by code or add new
      const currentMap = new Map<string, OrgEntity>();
      orgEntities.forEach((e) => currentMap.set(e.code.toUpperCase(), e));

      importEntities.forEach((newEnt) => {
        const existing = currentMap.get(newEnt.code.toUpperCase());
        if (existing) {
          currentMap.set(newEnt.code.toUpperCase(), {
            ...existing,
            nameAr: newEnt.nameAr,
            nameEn: newEnt.nameEn || existing.nameEn,
            level: newEnt.level,
            employeeCount: newEnt.employeeCount,
            status: newEnt.status,
          });
        } else {
          currentMap.set(newEnt.code.toUpperCase(), newEnt);
        }
      });

      finalEntities = Array.from(currentMap.values());
    }

    if (onBulkSaveOrgEntities) {
      onBulkSaveOrgEntities(finalEntities);
    } else {
      // Fallback
      finalEntities.forEach((e) => onAddOrgEntity(e));
    }

    setShowImportModal(false);
    setImportedFile(null);
    setImportRows([]);
    setImportEntities([]);
    setImportSuccessToast(`تم بنجاح استيراد وتحديث ${importEntities.length} تشكيل في الهيكل التنظيمي`);
    setTimeout(() => setImportSuccessToast(null), 5000);
  };

  // Open Create Modal
  const handleOpenCreateModal = (parentId: string | null = null) => {
    const parent = orgEntities.find((e) => e.id === parentId);
    setEditingNode(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormCode(`ORG-${Date.now().toString().slice(-4)}`);
    setFormParentId(parentId || (rootEntities[0]?.id || null));
    setFormLevel(getDefaultChildLevel(parent?.level));
    setFormEmployeeCount(15);
    setFormError('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (node: OrgEntity) => {
    setEditingNode(node);
    setFormNameAr(node.nameAr);
    setFormNameEn(node.nameEn || '');
    setFormCode(node.code);
    setFormParentId(node.parentId);
    setFormLevel(node.level);
    setFormEmployeeCount(node.employeeCount || 0);
    setFormError('');
    setShowModal(true);
  };

  // Save Modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim()) {
      setFormError('يرجى إدخال اسم التشكيل التنظيمي');
      return;
    }

    if (editingNode) {
      // Prevent selecting self as parent
      if (formParentId === editingNode.id) {
        setFormError('لا يمكن اختيار التشكيل نفسه كجهة أم');
        return;
      }
      const updated: OrgEntity = {
        ...editingNode,
        code: formCode.trim() || editingNode.code,
        nameAr: formNameAr.trim(),
        nameEn: formNameEn.trim() || undefined,
        parentId: formParentId,
        level: formLevel,
        employeeCount: Number(formEmployeeCount) || 0,
      };
      onUpdateOrgEntity(updated);
    } else {
      const newEntity: OrgEntity = {
        id: `ORG-${Date.now()}`,
        code: formCode.trim() || `ORG-${Date.now().toString().slice(-4)}`,
        nameAr: formNameAr.trim(),
        nameEn: formNameEn.trim() || undefined,
        parentId: formParentId,
        level: formLevel,
        employeeCount: Number(formEmployeeCount) || 0,
        status: 'active',
      };
      onAddOrgEntity(newEntity);
    }

    setShowModal(false);
  };

  // Filter Matching
  const isNodeMatchingFilter = (node: OrgEntity): boolean => {
    if (selectedLevelFilter !== 'all' && node.level !== selectedLevelFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const lvlInfo = getLevelInfo(node.level);
    return (
      node.nameAr.toLowerCase().includes(q) ||
      (node.nameEn ? node.nameEn.toLowerCase().includes(q) : false) ||
      node.code.toLowerCase().includes(q) ||
      lvlInfo.label.toLowerCase().includes(q) ||
      lvlInfo.badge.toLowerCase().includes(q)
    );
  };

  // Auto-expand tree when searching or filtering
  useEffect(() => {
    if (searchQuery.trim() || selectedLevelFilter !== 'all') {
      const allIds: Record<string, boolean> = {};
      orgEntities.forEach((e) => {
        allIds[e.id] = true;
      });
      setExpandedNodes(allIds);
    }
  }, [searchQuery, selectedLevelFilter, orgEntities]);

  // Recursive Tree Node Component
  const renderTreeNode = (node: OrgEntity, depth: number = 0) => {
    const children = orgEntities.filter((e) => e.parentId === node.id);
    const isExpanded = !!expandedNodes[node.id];
    const isMatching = isNodeMatchingFilter(node);
    const cumulativeEmployees = calculateCumulativeEmployees(node.id);
    const occupiedUnits = getOccupiedUnitsCount(node.nameAr);
    const lvlInfo = getLevelInfo(node.level);

    return (
      <div key={node.id} className="relative transition-all">
        {/* Node Card */}
        <div
          className={`p-3.5 rounded-2xl border transition-all my-1.5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isLight
              ? isMatching
                ? 'bg-white border-slate-200 hover:border-amber-400 shadow-sm'
                : 'bg-slate-50/60 border-slate-200/60 opacity-60'
              : isMatching
              ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 shadow-md'
              : 'bg-slate-900/40 border-slate-800/40 opacity-50'
          }`}
          style={{ marginRight: `${depth * 20}px` }}
        >
          {/* Left / Main Info */}
          <div className="flex items-start gap-3">
            {/* Expand / Collapse Button */}
            {children.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className={`p-1.5 rounded-lg border transition cursor-pointer mt-0.5 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title={isExpanded ? 'طي الفروع التابعة' : 'توسيع الفروع التابعة'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-7 h-7 flex items-center justify-center text-slate-500 text-xs font-mono">•</div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold border ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}
                >
                  {node.code}
                </span>

                <h4 className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {node.nameAr}
                </h4>

                {node.nameEn && (
                  <span className={`text-xs font-medium font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    ({node.nameEn})
                  </span>
                )}

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${lvlInfo.color}`}>
                  {lvlInfo.badge}
                </span>

                {node.status === 'disabled' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    معطل
                  </span>
                )}
              </div>

              {/* Badges / Metrics Row */}
              <div className="flex items-center gap-3 mt-1.5 text-[11px] flex-wrap">
                <span
                  className={`flex items-center gap-1 font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
                  title="الكادر البشري المباشر"
                >
                  <Users className="w-3.5 h-3.5 text-sky-500" />
                  <span>المباشر: {toArabicDigits(node.employeeCount || 0)} موظف</span>
                </span>

                {children.length > 0 && (
                  <span
                    className={`flex items-center gap-1 font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}
                    title="مجموع الكوادر شاملة التشكيلات والفروع التابعة"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>إجمالي الشجرة: {toArabicDigits(cumulativeEmployees)} موظف</span>
                  </span>
                )}

                {children.length > 0 && (
                  <span
                    className={`flex items-center gap-1 font-bold ${isLight ? 'text-purple-800' : 'text-purple-400'}`}
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    <span>الفروع التابعة: {toArabicDigits(children.length)} تشكيل</span>
                  </span>
                )}

                {occupiedUnits > 0 && (
                  <span
                    className={`flex items-center gap-1 font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>تشغل: {toArabicDigits(occupiedUnits)} وحدة أصل</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right / Actions Row */}
          <div className="flex items-center gap-1.5 self-end md:self-center">
            <button
              type="button"
              onClick={() => handleOpenCreateModal(node.id)}
              className={`px-2.5 py-1 border rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                isLight
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
              title="إضافة تشكيل/جهة فرعية تابعة"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>فرعي</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenEditModal(node)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="تعديل بيانات التشكيل"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onToggleOrgEntityStatus(node.id)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                node.status === 'active'
                  ? isLight
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  : isLight
                  ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
              }`}
              title={node.status === 'active' ? 'تعطيل التشكيل' : 'تفعيل التشكيل'}
            >
              {node.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteConfirmNode(node);
                setDeleteCascadeOption('reparent');
              }}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isLight
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
              }`}
              title="حذف التشكيل نهائياً"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Children Render */}
        {children.length > 0 && isExpanded && (
          <div
            className={`pr-3 border-r-2 mr-4 space-y-1 my-1 ${
              isLight ? 'border-amber-400' : 'border-amber-500/20'
            }`}
          >
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {importSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-3 animate-fade-in shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{importSuccessToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Network className="w-7 h-7" />
            </div>
            <div>
              <h2 className={`font-black text-lg ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                بناء الهيكل التنظيمي للمؤسسة
              </h2>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                إدارة التسلسل الهرمي للتشكيلات، التعديل والحذف الدائم، الاستيراد والتصدير عبر ملفات Excel و CSV المعتمدة
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Template Button */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="تحميل نموذج Excel تيمبلت مجهز بالأعمدة والأمثلة الإرشادية لملء الهيكل"
            >
              <Download className="w-4 h-4 text-sky-400" />
              <span>تحميل نموذج Excel</span>
            </button>

            {/* Import Excel / CSV Button */}
            <button
              type="button"
              onClick={() => {
                setShowImportModal(true);
                setImportedFile(null);
                setImportRows([]);
                setImportEntities([]);
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                isLight
                  ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              }`}
              title="استيراد وتفريغ هيكل تنظيمي من ملف Excel أو CSV"
            >
              <UploadCloud className="w-4 h-4" />
              <span>استيراد من Excel / CSV</span>
            </button>

            {/* Export Current Structure Button */}
            <button
              type="button"
              onClick={handleExportCurrentStructure}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                isLight
                  ? 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-900'
                  : 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400'
              }`}
              title="تصدير الهيكل التنظيمي الحالي بالكامل إلى ملف Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير الهيكل الحالي</span>
            </button>

            {/* Add Primary Entity Button */}
            <button
              type="button"
              onClick={() => handleOpenCreateModal(null)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تشكيل رئيسي جديد</span>
            </button>
          </div>
        </div>

        {/* Analytics Summary Bar */}
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t ${
            isLight ? 'border-slate-200' : 'border-slate-800/30'
          }`}
        >
          <div
            className={`p-3 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <span className={`text-[11px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              إجمالي التشكيلات
            </span>
            <div className={`text-xl font-black mt-1 ${isLight ? 'text-amber-700' : 'text-amber-500'}`}>
              {toArabicDigits(totalFormationsCount)}
            </div>
            <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              شركة، هيئات، وأقسام وشعب
            </p>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <span className={`text-[11px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              إجمالي القوة البشرية
            </span>
            <div className={`text-xl font-black mt-1 ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
              {toArabicDigits(totalEmployeesCount)} موظف
            </div>
            <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              موزعين على التشكيلات
            </p>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <span className={`text-[11px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              الهيئات والأقسام
            </span>
            <div className={`text-xl font-black mt-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              {toArabicDigits(directoratesCount + departmentsCount)} تشكيل
            </div>
            <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              تشكيلات إشرافية وتجهيزية
            </p>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <span className={`text-[11px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              الشعب والوجبات
            </span>
            <div className={`text-xl font-black mt-1 ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
              {toArabicDigits(sectionsCount)} شعبة
            </div>
            <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
              تشكيلات ميدانية تنفيذية
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Level Filter, Expand/Collapse */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم التشكيل، رمز التشكيل، أو بالمستوى التنظيمي..."
              className={`w-full pr-9 pl-3 py-2 text-xs font-bold rounded-xl border outline-none transition ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500'
                  : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
              }`}
            />
          </div>

          <select
            value={selectedLevelFilter}
            onChange={(e) => setSelectedLevelFilter(e.target.value)}
            className={`py-2 px-3 text-xs font-bold rounded-xl border outline-none transition cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-slate-950 border-slate-800 text-slate-100'
            }`}
          >
            <option value="all">كافة المستويات التنظيمية</option>
            <option value="company">الشركة / المؤسسة</option>
            <option value="director_general">المدير العام</option>
            <option value="deputy_director">معاون المدير العام</option>
            <option value="central_dept">هيئة / قسم مركزي</option>
            <option value="department">قسم</option>
            <option value="section">شعبة</option>
            <option value="unit">وحدة</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleExpandAll}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            توسيع كافة الفروع
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            طي الكل
          </button>
        </div>
      </div>

      {/* Main Tree Canvas Container */}
      <div
        className={`p-5 rounded-2xl border min-h-[400px] transition-all ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div
          className={`flex items-center justify-between mb-4 pb-2 border-b ${
            isLight ? 'border-slate-200' : 'border-slate-800/30'
          }`}
        >
          <div className={`flex items-center gap-2 text-xs font-bold ${isLight ? 'text-amber-700' : 'text-amber-500'}`}>
            <GitFork className="w-4 h-4" />
            <span>شجرة الهيكل التنظيمي (الارتباط التراتبي للجهات والتشكيلات)</span>
          </div>
          <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            اضغط على علامة (+) بجانب أي تشكيل لإضافة فرع مباشر تابع له
          </span>
        </div>

        {rootEntities.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Network className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
            <div>
              <p className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                لا توجد تشكيلات إدارية موثقة حالياً في الهيكل التنظيمي.
              </p>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                يمكنك إنشاء الهيكل يدوياً أو رفع ملف إكسل مجهز بالكامل.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOpenCreateModal(null)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة المقر الرئيسي الأول</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(true);
                  setImportedFile(null);
                  setImportRows([]);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>استيراد ملف Excel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {rootEntities.map((rootNode) => renderTreeNode(rootNode, 0))}
          </div>
        )}
      </div>

      {/* ==================== MODAL: Add or Edit Org Entity ==================== */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div
            className={`max-w-lg w-full p-6 rounded-2xl border shadow-2xl transition-all ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b mb-4 ${
                isLight ? 'border-slate-200' : 'border-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base">
                  {editingNode ? 'تعديل تشكيل تنظيمـي' : 'إضافة تشكيل جديد للهيكل التنظيمي'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">
                  اسم الجهة / التشكيل بالعربية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  placeholder="مثال: قسم إدارة حقول الغاز"
                  className={`w-full border rounded-xl p-3 font-bold focus:border-amber-500 outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold mb-1">الاسم بالإنجليزي (اختياري):</label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder="Gas Fields Management Department"
                  className={`w-full border rounded-xl p-2.5 font-bold focus:border-amber-500 outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">الجهة الأم (الارتباط في شجرة الهيكل):</label>
                <select
                  value={formParentId || ''}
                  onChange={(e) => setFormParentId(e.target.value || null)}
                  className={`w-full border rounded-xl p-3 font-bold focus:border-amber-500 outline-none cursor-pointer ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                >
                  <option value="">بدون جهة أم (تشكيل أعلى/مقر رئيسي)</option>
                  {orgEntities
                    .filter((e) => !editingNode || e.id !== editingNode.id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nameAr} ({e.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">المستوى التنظيمي:</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as OrgLevel)}
                    className={`w-full border rounded-xl p-2.5 font-bold focus:border-amber-500 outline-none cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="company">الشركة / المؤسسة</option>
                    <option value="director_general">المدير العام</option>
                    <option value="deputy_director">معاون المدير العام</option>
                    <option value="central_dept">هيئة / قسم مركزي</option>
                    <option value="department">قسم</option>
                    <option value="section">شعبة</option>
                    <option value="unit">وحدة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">عدد الموظفين (الكادر المباشر):</label>
                  <input
                    type="number"
                    min="0"
                    value={formEmployeeCount}
                    onChange={(e) => setFormEmployeeCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full border rounded-xl p-2.5 font-bold focus:border-amber-500 outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">رمز التشكيل (كود فريد):</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="مثال: DEP-GAS-01"
                  className={`w-full border rounded-xl p-2.5 font-mono font-bold focus:border-amber-500 outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div
                className={`flex items-center justify-end gap-2 pt-3 border-t ${
                  isLight ? 'border-slate-200' : 'border-slate-800/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {editingNode ? 'حفظ التعديلات' : 'إضافة التشكيل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Excel / CSV Import ==================== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div
            className={`max-w-3xl w-full p-6 rounded-2xl border shadow-2xl my-8 transition-all ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b mb-4 ${
                isLight ? 'border-slate-200' : 'border-slate-800/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                <div>
                  <h3 className="font-extrabold text-base">استيراد ورفع الهيكل التنظيمي من ملف Excel / CSV</h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    قم برفع ملف الإكسل بعد تعبئته وفق النموذج المعتمد للمؤسسة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drop Zone / Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                isLight
                  ? 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30'
                  : 'border-slate-700 hover:border-emerald-500 bg-slate-950/50 hover:bg-emerald-950/20'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv, .xlsx, .xls, .txt, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
              />
              <UploadCloud className="w-10 h-10 text-emerald-500 animate-bounce" />
              <div>
                <p className="font-bold text-sm">اضغط هنا لاختيار ملف Excel / CSV أو اسحب الملف وأفلته هنا</p>
                <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  يدعم ملفات (.xlsx, .xls, .csv, .txt) بصيغة UTF-8 للغة العربية
                </p>
              </div>
              {importedFile && (
                <div className="mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>الملف المحدد: {importedFile.name}</span>
                </div>
              )}
            </div>

            {/* Template Download Prompt */}
            <div
              className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs ${
                isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>هل تحتاج للنموذج المعتمد لتعبئته؟</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل التيمبلت</span>
              </button>
            </div>

            {/* Preview Table */}
            {importRows.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs flex items-center gap-2">
                    <span>معاينة البيانات المستخرجة من الملف:</span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono font-bold">
                      {toArabicDigits(importEntities.length)} تشكيل صالح
                    </span>
                    {importErrorCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-mono font-bold">
                        {toArabicDigits(importErrorCount)} تحذير/خطأ
                      </span>
                    )}
                  </h4>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-400">طريقة الحفظ:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                      />
                      <span>دمج وتحديث الحالي</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                      />
                      <span className="text-rose-400 font-bold">استبدال الهيكل بالكامل</span>
                    </label>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className={`${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-400'}`}>
                        <th className="p-2 font-bold">الكود</th>
                        <th className="p-2 font-bold">اسم التشكيل بالعربية</th>
                        <th className="p-2 font-bold">كود التشكيل الأب</th>
                        <th className="p-2 font-bold">المستوى</th>
                        <th className="p-2 font-bold">الموظفين</th>
                        <th className="p-2 font-bold text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {importRows.map((r, i) => (
                        <tr
                          key={i}
                          className={`${
                            r.isValid
                              ? isLight
                                ? 'hover:bg-slate-50'
                                : 'hover:bg-slate-800/40'
                              : isLight
                              ? 'bg-rose-50 text-rose-800'
                              : 'bg-rose-950/30 text-rose-300'
                          }`}
                        >
                          <td className="p-2 font-mono font-bold text-amber-500">{r.code}</td>
                          <td className="p-2 font-bold">
                            {r.nameAr}
                            {r.validationError && (
                              <div className="text-[10px] text-rose-400 font-normal">{r.validationError}</div>
                            )}
                          </td>
                          <td className="p-2 font-mono text-slate-400">{r.parentCode || '— (رئيسي)'}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 font-bold">
                              {ORG_LEVEL_LABELS[r.level] || r.level}
                            </span>
                          </td>
                          <td className="p-2 font-mono">{r.employeeCount}</td>
                          <td className="p-2 text-center">
                            {r.isValid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                                جاهز للاستيراد
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 font-bold">
                                به أخطاء
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div
              className={`flex items-center justify-end gap-2 pt-4 mt-4 border-t ${
                isLight ? 'border-slate-200' : 'border-slate-800/30'
              }`}
            >
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={importEntities.length === 0}
                onClick={handleCommitImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد وحفظ الهيكل التنظيمي ({importEntities.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Permanent Delete Confirmation ==================== */}
      {deleteConfirmNode && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div
            className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-500">تأكيد حذف التشكيل التنظيمي نهائياً</h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {deleteConfirmNode.nameAr} ({deleteConfirmNode.code})
                </p>
              </div>
            </div>

            <p className={`text-xs mb-4 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              سيتم حذف هذا التشكيل نهائياً من قاعدة البيانات والتسلسل الهرمي. لن يعود هذا التشكيل للظهور بعد الحذف حتى يتم إضافته يدوياً مرة أخرى.
            </p>

            {/* Branch handling options if node has children */}
            {getDirectChildrenCount(deleteConfirmNode.id) > 0 && (
              <div
                className={`p-3 rounded-xl border mb-4 space-y-2 text-xs ${
                  isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                  <span>تنبيه: يحتوي هذا التشكيل على ({getDirectChildrenCount(deleteConfirmNode.id)}) فروع وشعب تابعة!</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-start gap-2 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="cascadeOption"
                      checked={deleteCascadeOption === 'reparent'}
                      onChange={() => setDeleteCascadeOption('reparent')}
                      className="mt-0.5"
                    />
                    <span>رفع تبعية الفروع التابعة إلى الجهة الأعلى (الحفاظ على الأبناء)</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer font-bold text-rose-400">
                    <input
                      type="radio"
                      name="cascadeOption"
                      checked={deleteCascadeOption === 'cascade'}
                      onChange={() => setDeleteCascadeOption('cascade')}
                      className="mt-0.5"
                    />
                    <span>حذف التشكيل مع كافة الفروع والشعب التابعة له بالكامل</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmNode(null)}
                className={`px-4 py-2 rounded-xl font-bold text-xs ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteOrgEntity(deleteConfirmNode.id, deleteCascadeOption === 'cascade');
                  setDeleteConfirmNode(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تأكيد الحذف النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
