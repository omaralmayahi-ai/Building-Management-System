import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { Button, ConfirmDialog, Input, Modal, PageHeader, Select, fieldLook, useConfirm } from './ui';
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
  Eye,
  GripVertical,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Move,
} from 'lucide-react';
import { OrgEntity, OrgLevel, UnitAsset, SystemBranding } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';
import {

  generateOrgStructureCsvTemplate,
  downloadFile,
  parseCsvText,
  parseOrgImportRows,
  OrgImportRow,
  ORG_LEVEL_LABELS,
} from '../utils/orgExcelUtils';

// تُحمَّل عند الطلب (4-ل)
const OrgChartModalLazy = lazy(() => import('./OrgChartModal').then((m) => ({ default: m.OrgChartModal })));
const OrgChartModal = (props: React.ComponentProps<typeof OrgChartModalLazy>) => (
  <Suspense fallback={null}>
    <OrgChartModalLazy {...props} />
  </Suspense>
);


interface OrgStructureBuilderProps {
  isLight?: boolean;
  orgEntities: OrgEntity[];
  units?: UnitAsset[];
  branding?: SystemBranding;
  onAddOrgEntity: (newEntity: OrgEntity) => void;
  onUpdateOrgEntity: (updatedEntity: OrgEntity) => void;
  onDeleteOrgEntity: (id: string, deleteChildren?: boolean) => void;
  onToggleOrgEntityStatus: (id: string) => void;
  onResetOrgEntitiesToDefault?: () => void;
  onBulkSaveOrgEntities?: (
    entities: OrgEntity[],
    customToastMessage?: string,
    customAction?: string
  ) => void;
}

export const OrgStructureBuilder: React.FC<OrgStructureBuilderProps> = ({
  isLight = false,
  orgEntities,
  units = [],
  branding,
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

  // Drag & Drop State for manual positioning
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dragDropPosition, setDragDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  const [isDraggingOverRootZone, setIsDraggingOverRootZone] = useState(false);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState<OrgEntity | null>(null);

  // Org Chart Visual Modal State
  const [showOrgChartModal, setShowOrgChartModal] = useState<boolean>(false);

  // Delete State
  const [deleteConfirmNode, setDeleteConfirmNode] = useState<OrgEntity | null>(null);
  const confirm = useConfirm();
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
      color: 'bg-purple-100 text-purple-900 border-purple-200 font-extrabold',
      badge: 'شركة / مؤسسة',
    },
    director_general: {
      label: 'المدير العام',
      color: 'bg-blue-100 text-blue-900 border-blue-200 font-extrabold',
      badge: 'المدير العام',
    },
    deputy_director: {
      label: 'معاون المدير العام',
      color: 'bg-cyan-100 text-cyan-900 border-cyan-200 font-extrabold',
      badge: 'معاون مدير عام',
    },
    commission: {
      label: 'هيئة',
      color: 'bg-blue-100 text-blue-900 border-blue-200 font-extrabold',
      badge: 'هيئة',
    },
    central_dept: {
      label: 'قسم مركزي',
      color: 'bg-sky-100 text-sky-900 border-sky-200 font-extrabold',
      badge: 'قسم مركزي',
    },
    department: {
      label: 'قسم',
      color: 'bg-emerald-100 text-emerald-900 border-emerald-200 font-extrabold',
      badge: 'قسم',
    },
    section: {
      label: 'شعبة',
      color: 'bg-brand-100 text-brand-800 border-brand-200 font-extrabold',
      badge: 'شعبة',
    },
    unit: {
      label: 'وحدة',
      color: 'bg-teal-100 text-teal-900 border-teal-200 font-extrabold',
      badge: 'وحدة',
    },
  };

  const getLevelInfo = (level?: string) => {
    if (!level) return levelLabels.department;
    if (levelLabels[level as OrgLevel]) return levelLabels[level as OrgLevel];
    if (level === 'commission' || level === 'directorate') return levelLabels.commission;
    if (level === 'central_dept') return levelLabels.central_dept;
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
    return orgEntities
      .filter((e) => !e.parentId || !orgEntities.some((parent) => parent.id === e.parentId))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [orgEntities]);

  // Overall Stats
  const totalFormationsCount = orgEntities.length;
  const totalEmployeesCount = useMemo(() => {
    return orgEntities.reduce((acc, curr) => acc + (curr.employeeCount || 0), 0);
  }, [orgEntities]);

  // Statistics by formation type for merged card (recalculated automatically on any change)
  const formationStats = useMemo(() => {
    let leadershipCount = 0;
    let commissionsCount = 0;
    let departmentsCount = 0;
    let sectionsCount = 0;
    let unitsCount = 0;

    orgEntities.forEach((e) => {
      const lvl = (e.level || '').toLowerCase();
      const name = (e.nameAr || '').trim();
      const id = e.id || '';

      // 1. Leadership (الإدارة العليا: 4)
      if (
        lvl === 'company' ||
        lvl === 'director_general' ||
        lvl === 'deputy_director' ||
        id === 'ORG-DG' ||
        id === 'ORG-DG-OFFICE' ||
        name.includes('المدير العام') ||
        name.includes('معاون')
      ) {
        leadershipCount++;
      }
      // 2. Commissions (الهيئات: 21 - رئيسية وإشرافية)
      else if (
        lvl === 'commission' ||
        lvl === 'central_dept' ||
        name.startsWith('هيئة') ||
        name.startsWith('الهيئة')
      ) {
        commissionsCount++;
      }
      // 3. Sections (الشعب: 28 - ميدانية وتنفيذية)
      else if (lvl === 'section' || name.startsWith('شعبة') || name.startsWith('الشعبة')) {
        sectionsCount++;
      }
      // 4. Units (الوحدات: 0 - فرق وتشكيلات)
      else if (lvl === 'unit' || name.startsWith('وحدة') || name.startsWith('الوحدة')) {
        unitsCount++;
      }
      // 5. Departments (الأقسام: 30 - إدارية وفنية)
      else {
        departmentsCount++;
      }
    });

    return {
      leadershipCount,
      commissionsCount,
      departmentsCount,
      sectionsCount,
      unitsCount,
    };
  }, [orgEntities]);

  const getDefaultChildLevel = (parentLevel?: OrgLevel): OrgLevel => {
    switch (parentLevel) {
      case 'company':
        return 'director_general';
      case 'director_general':
        return 'deputy_director';
      case 'deputy_director':
        return 'commission';
      case 'commission':
        return 'department';
      case 'central_dept':
        return 'section';
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
  const handleSaveModal = async (e: React.FormEvent) => {
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
      if (!(await confirm({ title: 'تأكيد تعديل التشكيل', message: <>هل تريد حفظ التعديلات على «{editingNode.nameAr}»؟ تغيير الاسم ينتقل إلى الوحدات وسجلات الإشغال التي تحمله.</> }))) return;
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

  // Helper to check if potentialChildId is a descendant of ancestorId
  const isDescendant = (ancestorId: string, potentialChildId: string, list: OrgEntity[]): boolean => {
    let current = list.find((e) => e.id === potentialChildId);
    while (current && current.parentId) {
      if (current.parentId === ancestorId) return true;
      current = list.find((e) => e.id === current?.parentId);
    }
    return false;
  };

  // Helper to get all IDs in a node's subtree (including self)
  const getSubtreeIds = (rootId: string, list: OrgEntity[]): string[] => {
    const result: string[] = [rootId];
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = list.filter((e) => e.parentId === current);
      for (const ch of children) {
        result.push(ch.id);
        queue.push(ch.id);
      }
    }
    return result;
  };

  // Move entity to new position or new parent
  const handleMoveEntity = (
    sourceId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => {
    if (sourceId === targetId) return;
    const sourceEntity = orgEntities.find((e) => e.id === sourceId);
    const targetEntity = orgEntities.find((e) => e.id === targetId);
    if (!sourceEntity || !targetEntity) return;

    if (isDescendant(sourceId, targetId, orgEntities)) {
      setImportSuccessToast(`⚠️ تعذر النقل: لا يمكن نقل التشكيل ليصبح تابعاً لأحد الفروع المتفرعة منه.`);
      return;
    }

    const subtreeIds = getSubtreeIds(sourceId, orgEntities);
    const subtreeEntities = orgEntities.filter((e) => subtreeIds.includes(e.id));
    const remainingEntities = orgEntities.filter((e) => !subtreeIds.includes(e.id));

    let updatedList: OrgEntity[] = [];
    let customMsg = '';

    if (position === 'inside') {
      subtreeEntities[0] = { ...subtreeEntities[0], parentId: targetEntity.id };

      const targetIdx = remainingEntities.findIndex((e) => e.id === targetId);
      if (targetIdx === -1) return;

      const targetSubtreeIds = new Set(getSubtreeIds(targetId, remainingEntities));
      let insertIdx = targetIdx + 1;
      for (let i = targetIdx + 1; i < remainingEntities.length; i++) {
        if (targetSubtreeIds.has(remainingEntities[i].id)) {
          insertIdx = i + 1;
        }
      }

      updatedList = [...remainingEntities];
      updatedList.splice(insertIdx, 0, ...subtreeEntities);

      setExpandedNodes((prev) => ({ ...prev, [targetEntity.id]: true }));
      customMsg = `تم نقل التشكيل "${sourceEntity.nameAr}" ليكون تابعاً لـ "${targetEntity.nameAr}" بنجاح`;
    } else if (position === 'before') {
      subtreeEntities[0] = { ...subtreeEntities[0], parentId: targetEntity.parentId };

      const targetIdx = remainingEntities.findIndex((e) => e.id === targetId);
      if (targetIdx === -1) return;

      updatedList = [...remainingEntities];
      updatedList.splice(targetIdx, 0, ...subtreeEntities);

      customMsg = `تم تغيير ترتيب التشكيل "${sourceEntity.nameAr}" ليصبح قبل "${targetEntity.nameAr}" بنجاح`;
    } else if (position === 'after') {
      subtreeEntities[0] = { ...subtreeEntities[0], parentId: targetEntity.parentId };

      const targetIdx = remainingEntities.findIndex((e) => e.id === targetId);
      if (targetIdx === -1) return;

      const targetSubtreeIds = new Set(getSubtreeIds(targetId, remainingEntities));
      let insertIdx = targetIdx + 1;
      for (let i = targetIdx + 1; i < remainingEntities.length; i++) {
        if (targetSubtreeIds.has(remainingEntities[i].id)) {
          insertIdx = i + 1;
        }
      }

      updatedList = [...remainingEntities];
      updatedList.splice(insertIdx, 0, ...subtreeEntities);

      customMsg = `تم تغيير ترتيب التشكيل "${sourceEntity.nameAr}" ليصبح بعد "${targetEntity.nameAr}" بنجاح`;
    }

    const orderedList = updatedList.map((e, idx) => ({
      ...e,
      sortOrder: idx,
    }));

    if (onBulkSaveOrgEntities) {
      onBulkSaveOrgEntities(orderedList, customMsg, 'إعادة ترتيب الهيكل التنظيمي');
    }
    setImportSuccessToast(customMsg);
  };

  // Move entity to root level
  const handleMoveToRoot = (sourceId: string) => {
    const sourceEntity = orgEntities.find((e) => e.id === sourceId);
    if (!sourceEntity) return;
    if (!sourceEntity.parentId) {
      setImportSuccessToast(`التشكيل "${sourceEntity.nameAr}" هو بالفعل في المستوى الرئيسي للهيكل.`);
      return;
    }

    const subtreeIds = getSubtreeIds(sourceId, orgEntities);
    const subtreeEntities = orgEntities.filter((e) => subtreeIds.includes(e.id));
    const remainingEntities = orgEntities.filter((e) => !subtreeIds.includes(e.id));

    subtreeEntities[0] = { ...subtreeEntities[0], parentId: null };
    const updatedList = [...subtreeEntities, ...remainingEntities];
    const orderedList = updatedList.map((e, idx) => ({
      ...e,
      sortOrder: idx,
    }));

    const msg = `تم نقل التشكيل "${sourceEntity.nameAr}" إلى المستوى الرئيسي للهيكل بنجاح`;
    if (onBulkSaveOrgEntities) {
      onBulkSaveOrgEntities(orderedList, msg, 'نقل تشكيل للمستوى الرئيسي');
    }
    setImportSuccessToast(msg);
  };

  // Move step up or down among siblings
  const handleMoveStep = (node: OrgEntity, direction: 'up' | 'down') => {
    const siblings = orgEntities
      .filter((e) => e.parentId === node.parentId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const siblingIdx = siblings.findIndex((e) => e.id === node.id);
    if (siblingIdx === -1) return;

    if (direction === 'up' && siblingIdx > 0) {
      const prevSibling = siblings[siblingIdx - 1];
      handleMoveEntity(node.id, prevSibling.id, 'before');
    } else if (direction === 'down' && siblingIdx < siblings.length - 1) {
      const nextSibling = siblings[siblingIdx + 1];
      handleMoveEntity(node.id, nextSibling.id, 'after');
    }
  };

  // Sibling index helper
  const getSiblingIndexInfo = (node: OrgEntity) => {
    const siblings = orgEntities
      .filter((e) => e.parentId === node.parentId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const index = siblings.findIndex((e) => e.id === node.id);
    return {
      isFirst: index <= 0,
      isLast: index === -1 || index >= siblings.length - 1,
      total: siblings.length,
      index,
    };
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, node: OrgEntity) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNodeId(node.id);
  };

  const handleDragOver = (e: React.DragEvent, targetNode: OrgEntity) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedNodeId || draggedNodeId === targetNode.id) return;
    if (isDescendant(draggedNodeId, targetNode.id, orgEntities)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    let pos: 'before' | 'after' | 'inside' = 'inside';
    if (offsetY < height * 0.28) {
      pos = 'before';
    } else if (offsetY > height * 0.72) {
      pos = 'after';
    } else {
      pos = 'inside';
    }

    if (dragOverNodeId !== targetNode.id || dragDropPosition !== pos) {
      setDragOverNodeId(targetNode.id);
      setDragDropPosition(pos);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetNode: OrgEntity) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (dragOverNodeId === targetNode.id) {
        setDragOverNodeId(null);
        setDragDropPosition(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetNode: OrgEntity) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedNodeId || e.dataTransfer.getData('text/plain');
    const pos = dragDropPosition;

    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDragDropPosition(null);
    setIsDraggingOverRootZone(false);

    if (!sourceId || sourceId === targetNode.id || !pos) return;
    handleMoveEntity(sourceId, targetNode.id, pos);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDragDropPosition(null);
    setIsDraggingOverRootZone(false);
  };

  // Recursive Tree Node Component
  const renderTreeNode = (node: OrgEntity, depth: number = 0) => {
    const children = orgEntities
      .filter((e) => e.parentId === node.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const isExpanded = !!expandedNodes[node.id];
    const isMatching = isNodeMatchingFilter(node);
    const cumulativeEmployees = calculateCumulativeEmployees(node.id);
    const occupiedUnits = getOccupiedUnitsCount(node.nameAr);
    const lvlInfo = getLevelInfo(node.level);
    const isDragged = draggedNodeId === node.id;
    const isDragOver = dragOverNodeId === node.id && !isDragged;
    const siblingInfo = getSiblingIndexInfo(node);
    const draggedEntity = draggedNodeId ? orgEntities.find((e) => e.id === draggedNodeId) : null;

    return (
      <div key={node.id} className="relative transition-all">
        {/* Drop indicator: Before */}
        {isDragOver && dragDropPosition === 'before' && (
          <div
            className="my-1.5 py-1.5 px-3 bg-brand-700 text-on-brand font-black text-xs rounded-xl shadow-lg flex items-center justify-between animate-pulse select-none border-2 border-brand-200"
            style={{ marginRight: `${depth * 20}px` }}
          >
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4 text-slate-950" />
              <span>إفلات هنا لنقل وترتيب «{draggedEntity?.nameAr || 'التشكيل المسحوب'}» قبل «{node.nameAr}»</span>
            </div>
            <span className="text-[10px] bg-card/20 px-2 py-0.5 rounded font-bold">بنفس المستوى التراتبي</span>
          </div>
        )}

        {/* Node Card */}
        <div
          onDragOver={(e) => handleDragOver(e, node)}
          onDragLeave={(e) => handleDragLeave(e, node)}
          onDrop={(e) => handleDrop(e, node)}
          className={`p-3.5 rounded-2xl border transition-all my-1.5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isDragged
              ? 'opacity-40 border-dashed border-brand-600 scale-[0.99] bg-brand-50'
              : isDragOver && dragDropPosition === 'inside'
              ? 'ring-2 ring-brand-600 border-brand-600 bg-brand-100 shadow-xl scale-[1.01]'
              : isMatching
              ? 'bg-card border-slate-200 hover:border-brand-200 shadow-xs'
              : 'bg-slate-50/60 border-slate-200/60 opacity-60'
          }`}
          style={{ marginRight: `${depth * 20}px` }}
        >
          {/* Left / Main Info */}
          <div className="flex items-start gap-2.5">
            {/* Drag Handle & Up/Down Steppers */}
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, node)}
                onDragEnd={handleDragEnd}
                className={`p-1.5 rounded-lg border flex items-center justify-center cursor-grab active:cursor-grabbing transition select-none bg-slate-100 hover:bg-brand-100 border-slate-300 text-slate-600 hover:text-brand-800`}
                title="اضغط مع السحب لتغيير موقع التشكيل أو إفلاته كفرع تابع لتشكيل آخر"
              >
                <GripVertical className="w-4 h-4" />
              </div>

              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  disabled={siblingInfo.isFirst}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveStep(node, 'up');
                  }}
                  className={`p-0.5 rounded border transition ${
                    siblingInfo.isFirst
                      ? 'opacity-20 cursor-not-allowed border-transparent text-slate-500'
                      : 'bg-card hover:bg-brand-100 border-slate-300 text-slate-700 hover:text-brand-800 cursor-pointer shadow-2xs'
                  }`}
                  title="تحريك لأعلى في نفس المستوى"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={siblingInfo.isLast}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveStep(node, 'down');
                  }}
                  className={`p-0.5 rounded border transition ${
                    siblingInfo.isLast
                      ? 'opacity-20 cursor-not-allowed border-transparent text-slate-500'
                      : 'bg-card hover:bg-brand-100 border-slate-300 text-slate-700 hover:text-brand-800 cursor-pointer shadow-2xs'
                  }`}
                  title="تحريك لأسفل في نفس المستوى"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Expand / Collapse Button */}
            {children.length > 0 ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className={`p-1.5 rounded-lg border transition cursor-pointer mt-0.5 bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700`}
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
                  className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold border bg-slate-100 text-slate-700 border-slate-300`}
                >
                  {node.code}
                </span>

                <h4 className={`font-black text-sm text-slate-900`}>
                  {node.nameAr}
                </h4>

                {node.nameEn && (
                  <span className={`text-xs font-medium font-sans text-slate-500`}>
                    ({node.nameEn})
                  </span>
                )}

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${lvlInfo.color}`}>
                  {lvlInfo.badge}
                </span>

                {node.status === 'disabled' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    معطل
                  </span>
                )}
              </div>

              {/* Badges / Metrics Row */}
              <div className="flex items-center gap-3 mt-1.5 text-[11px] flex-wrap">
                <span
                  className={`flex items-center gap-1 font-bold text-slate-600`}
                  title="الكادر البشري المباشر"
                >
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  <span>المباشر: {toArabicDigits(node.employeeCount || 0)} موظف</span>
                </span>

                {children.length > 0 && (
                  <span
                    className={`flex items-center gap-1 font-bold text-brand-800`}
                    title="مجموع الكوادر شاملة التشكيلات والفروع التابعة"
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>إجمالي الشجرة: {toArabicDigits(cumulativeEmployees)} موظف</span>
                  </span>
                )}

                {children.length > 0 && (
                  <span
                    className={`flex items-center gap-1 font-bold text-purple-800`}
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    <span>الفروع التابعة: {toArabicDigits(children.length)} تشكيل</span>
                  </span>
                )}

                {occupiedUnits > 0 && (
                  <span
                    className={`flex items-center gap-1 font-bold text-emerald-800`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>تشغل: {toArabicDigits(occupiedUnits)} وحدة أصل</span>
                  </span>
                )}
              </div>

              {/* Inside Drop Guidance */}
              {isDragOver && dragDropPosition === 'inside' && (
                <div className="mt-2 text-xs font-black text-brand-700 flex items-center gap-1.5 animate-pulse bg-brand-100 p-2 rounded-xl border border-brand-200">
                  <CornerDownLeft className="w-4 h-4 text-brand-700 shrink-0" />
                  <span>إفلات هنا لربط التشكيل «{draggedEntity?.nameAr || 'المحدد'}» كفرع تابع لـ «{node.nameAr}»</span>
                </div>
              )}
            </div>
          </div>

          {/* Right / Actions Row */}
          <div className="flex items-center gap-1.5 self-end md:self-center">
            <button
              type="button"
              onClick={() => handleOpenCreateModal(node.id)}
              className={`px-2.5 py-1 border rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 bg-brand-100 hover:bg-brand-100 text-brand-800 border-brand-200`}
              title="إضافة تشكيل/جهة فرعية تابعة"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>فرعي</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenEditModal(node)}
              className={`p-1.5 rounded-lg border transition cursor-pointer bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700`}
              title="تعديل بيانات التشكيل"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onToggleOrgEntityStatus(node.id)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                node.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200'
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
              className={`p-1.5 rounded-lg border transition cursor-pointer bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-200`}
              title="حذف التشكيل نهائياً"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drop indicator: After */}
        {isDragOver && dragDropPosition === 'after' && (
          <div
            className="my-1.5 py-1.5 px-3 bg-brand-700 text-on-brand font-black text-xs rounded-xl shadow-lg flex items-center justify-between animate-pulse select-none border-2 border-brand-200"
            style={{ marginRight: `${depth * 20}px` }}
          >
            <div className="flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-slate-950" />
              <span>إفلات هنا لنقل وترتيب «{draggedEntity?.nameAr || 'التشكيل المسحوب'}» بعد «{node.nameAr}»</span>
            </div>
            <span className="text-[10px] bg-card/20 px-2 py-0.5 rounded font-bold">بنفس المستوى التراتبي</span>
          </div>
        )}

        {/* Children Render */}
        {children.length > 0 && isExpanded && (
          <div
            className={`pr-3 border-r-2 mr-4 space-y-1 my-1 border-brand-200`}
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
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 font-bold text-xs flex items-center gap-3 animate-fade-in shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{importSuccessToast}</span>
        </div>
      )}

      {/* الترويسة */}
      <PageHeader
        icon={Network}
        title="الهيكل التنظيمي"
        description="التسلسل الهرمي للتشكيلات، الإضافة والتعديل والحذف، والاستيراد من Excel"
        actions={
          <>
            <Button variant="primary" icon={Plus} onClick={() => handleOpenCreateModal(null)}>
              تشكيل رئيسي جديد
            </Button>
            <Button icon={Eye} onClick={() => setShowOrgChartModal(true)} title="عرض الهيكل التنظيمي المعتمد في نافذة تفاعلية">
              عرض المخطط
            </Button>
            <Button icon={Download} onClick={handleDownloadTemplate} title="تحميل نموذج Excel مجهز بالأعمدة والأمثلة">
              نموذج Excel
            </Button>
            <Button
              icon={UploadCloud}
              onClick={() => {
                setShowImportModal(true);
                setImportedFile(null);
                setImportRows([]);
                setImportEntities([]);
              }}
              title="استيراد هيكل تنظيمي من ملف Excel أو CSV"
            >
              استيراد
            </Button>
          </>
        }
      />

      <div className={`p-5 rounded-2xl border transition-all bg-card border-slate-200 shadow-sm`}>
        {/* Analytics Summary Bar */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 mt-5 pt-4 border-t border-slate-200`}
        >
          {/* Card 1: إجمالي التشكيلات */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between bg-slate-50 border-slate-200`}
          >
            <div>
              <span className={`text-[11px] font-bold block text-slate-600`}>
                إجمالي التشكيلات
              </span>
              <div className={`text-2xl font-black mt-1 text-brand-700`}>
                {toArabicDigits(totalFormationsCount)}
              </div>
            </div>
            <p className={`text-[10px] mt-1.5 text-slate-500`}>
              شركة، هيئات، وأقسام وشعب
            </p>
          </div>

          {/* Card 2: اجمالي عدد الموظفين (معدل من إجمالي القوة البشرية) */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col justify-between bg-slate-50 border-slate-200`}
          >
            <div>
              <span className={`text-[11px] font-bold block text-slate-600`}>
                اجمالي عدد الموظفين
              </span>
              <div className={`text-2xl font-black mt-1 text-sky-700`}>
                {toArabicDigits(totalEmployeesCount)}{' '}
                <span className={`text-xs font-bold text-slate-600`}>
                  موظف
                </span>
              </div>
            </div>
            <p className={`text-[10px] mt-1.5 text-slate-500`}>
              موزعين على التشكيلات
            </p>
          </div>

          {/* Card 3: إحصائية أنواع التشكيلات (محدثة تلقائياً وتتوافق مع التشكيلات المعتمدة) */}
          <div
            className={`p-3.5 rounded-xl border md:col-span-2 xl:col-span-2 flex flex-col justify-between bg-slate-50 border-slate-200`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-[11px] font-bold block text-slate-600`}>
                إحصائية أنواع التشكيلات
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200`}
              >
                الإدارة العليا: {toArabicDigits(formationStats.leadershipCount)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* 1. الهيئات */}
              <div
                className={`p-2 rounded-lg border text-center transition-all bg-card border-blue-200 shadow-2xs`}
              >
                <div className={`text-lg font-black text-blue-700`}>
                  {toArabicDigits(formationStats.commissionsCount)}
                </div>
                <div className={`text-[11px] font-bold text-slate-700`}>
                  الهيئات
                </div>
                <div className={`text-[9px] text-slate-400`}>
                  رئيسية وإشرافية
                </div>
              </div>

              {/* 2. الأقسام */}
              <div
                className={`p-2 rounded-lg border text-center transition-all bg-card border-emerald-200 shadow-2xs`}
              >
                <div className={`text-lg font-black text-emerald-700`}>
                  {toArabicDigits(formationStats.departmentsCount)}
                </div>
                <div className={`text-[11px] font-bold text-slate-700`}>
                  الأقسام
                </div>
                <div className={`text-[9px] text-slate-400`}>
                  إدارية وفنية
                </div>
              </div>

              {/* 3. الشعب */}
              <div
                className={`p-2 rounded-lg border text-center transition-all bg-card border-brand-200 shadow-2xs`}
              >
                <div className={`text-lg font-black text-brand-700`}>
                  {toArabicDigits(formationStats.sectionsCount)}
                </div>
                <div className={`text-[11px] font-bold text-slate-700`}>
                  الشعب
                </div>
                <div className={`text-[9px] text-slate-400`}>
                  ميدانية وتنفيذية
                </div>
              </div>

              {/* 4. الوحدات */}
              <div
                className={`p-2 rounded-lg border text-center transition-all bg-card border-teal-200 shadow-2xs`}
              >
                <div className={`text-lg font-black text-teal-700`}>
                  {toArabicDigits(formationStats.unitsCount)}
                </div>
                <div className={`text-[11px] font-bold text-slate-700`}>
                  الوحدات
                </div>
                <div className={`text-[9px] text-slate-400`}>
                  فرق وتشكيلات
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Level Filter, Expand/Collapse */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 bg-card border-slate-200`}
      >
        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" aria-hidden />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="اسم التشكيل، رمزه، أو مستواه..."
              className="pr-9"
            />
          </div>
          <div className="w-52 shrink-0">
          <Select value={selectedLevelFilter} onChange={(e) => setSelectedLevelFilter(e.target.value)}>
            <option value="all">كافة المستويات التنظيمية</option>
            <option value="company">الشركة / المؤسسة</option>
            <option value="director_general">المدير العام</option>
            <option value="deputy_director">معاون المدير العام</option>
            <option value="commission">هيئة</option>
            <option value="central_dept">قسم مركزي</option>
            <option value="department">قسم</option>
            <option value="section">شعبة</option>
            <option value="unit">وحدة</option>
          </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <Button size="sm" onClick={handleExpandAll}>
            توسيع كافة الفروع
          </Button>
          <Button size="sm" onClick={handleCollapseAll}>
            طي الكل
          </Button>
        </div>
      </div>

      {/* Main Tree Canvas Container */}
      <div
        className={`p-5 rounded-2xl border min-h-[400px] transition-all bg-card border-slate-200`}
      >
        <div
          className={`flex items-center justify-between mb-4 pb-2 border-b border-slate-200`}
        >
          <div className={`flex items-center gap-2 text-xs font-bold text-brand-700`}>
            <GitFork className="w-4 h-4" />
            <span>شجرة الهيكل التنظيمي (الارتباط التراتبي للجهات والتشكيلات)</span>
          </div>
          <span className={`text-[11px] text-slate-500`}>
            اضغط على علامة (+) بجانب أي تشكيل لإضافة فرع مباشر تابع له
          </span>
        </div>

        {/* Drag & Drop Instructions Banner */}
        <div
          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 transition-all bg-brand-50 border-brand-200 text-brand-800`}
        >
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-brand-700 shrink-0" />
            <span className="font-bold text-[11px] leading-relaxed">
              <b>إمكانية تغيير المواقع وإعادة الترتيب يدوياً:</b> اسحب أي تشكيل من مقبض السحب (⋮⋮) أو استخدم أزرار (▲ / ▼) لنقله وتغيير ترتيبه، أو أفلته داخل تشكيل آخر لجعله تابعاً له.
            </span>
          </div>
          {draggedNodeId && (
            <div className="flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-lg bg-brand-700 text-on-brand shrink-0 shadow animate-pulse">
              <span>جاري سحب التشكيل...</span>
            </div>
          )}
        </div>

        {/* Root Level Drop Zone */}
        {draggedNodeId && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setIsDraggingOverRootZone(true);
            }}
            onDragLeave={() => setIsDraggingOverRootZone(false)}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedNodeId) {
                handleMoveToRoot(draggedNodeId);
              }
              handleDragEnd();
            }}
            className={`p-3.5 mb-3 rounded-2xl border-2 border-dashed text-center transition-all ${
              isDraggingOverRootZone
                ? 'bg-brand-100 border-brand-600 text-brand-700 scale-[1.01] shadow-lg ring-2 ring-brand-600'
                : 'bg-brand-50 border-brand-200 text-brand-800 hover:border-brand-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2 font-black text-xs">
              <Network className="w-4 h-4 text-brand-700" />
              <span>أفلت هنا لنقل التشكيل المسحوب إلى المستوى الرئيسي للهيكل التنظيمي (أعلى الشجرة بدون جهة أب)</span>
            </div>
          </div>
        )}

        {rootEntities.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Network className="w-12 h-12 text-slate-600 mx-auto animate-pulse" />
            <div>
              <p className={`font-bold text-sm text-slate-800`}>
                لا توجد تشكيلات إدارية موثقة حالياً في الهيكل التنظيمي.
              </p>
              <p className={`text-xs mt-1 text-slate-500`}>
                يمكنك إنشاء الهيكل يدوياً أو رفع ملف إكسل مجهز بالكامل.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOpenCreateModal(null)}
                className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-on-brand font-bold rounded-xl text-xs shadow cursor-pointer flex items-center gap-1.5"
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
      <Modal
        open={showModal}
        staticBackdrop
        icon={Network}
        title={editingNode ? 'تعديل تشكيل تنظيمي' : 'إضافة تشكيل جديد'}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <Button type="submit" form="org-entity-form" variant="primary" icon={Check}>
              {editingNode ? 'حفظ التعديلات' : 'إضافة التشكيل'}
            </Button>
            <Button onClick={() => setShowModal(false)}>إلغاء</Button>
          </>
        }
      >
        {showModal && (
        <form id="org-entity-form" onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">
                  اسم الجهة / التشكيل بالعربية <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  placeholder="مثال: قسم إدارة حقول الغاز"
                  className={`${fieldLook} w-full`}
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
                  className={`${fieldLook} w-full`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">الجهة الأم (الارتباط في شجرة الهيكل):</label>
                <select
                  value={formParentId || ''}
                  onChange={(e) => setFormParentId(e.target.value || null)}
                  className={`${fieldLook} w-full cursor-pointer`}
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
                    className={`${fieldLook} w-full cursor-pointer`}
                  >
                    <option value="company">الشركة / المؤسسة</option>
                    <option value="director_general">المدير العام</option>
                    <option value="deputy_director">معاون المدير العام</option>
                    <option value="commission">هيئة</option>
                    <option value="central_dept">قسم مركزي</option>
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
                    className={`${fieldLook} w-full`}
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
                  className={`${fieldLook} w-full font-mono`}
                />
              </div>

        </form>
        )}
      </Modal>


      {/* ==================== MODAL: Excel / CSV Import ==================== */}
      <Modal
        open={showImportModal}
        wide
        staticBackdrop
        icon={UploadCloud}
        title="استيراد الهيكل التنظيمي من Excel / CSV"
        onClose={() => setShowImportModal(false)}
        footer={
          <>
            <Button variant="primary" icon={Check} disabled={importEntities.length === 0} onClick={handleCommitImport}>
              اعتماد وحفظ الهيكل ({importEntities.length})
            </Button>
            <Button onClick={() => setShowImportModal(false)}>إلغاء</Button>
          </>
        }
      >
        {showImportModal && (
        <div className="space-y-4 text-xs">

            {/* Drop Zone / Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv, .xlsx, .xls, .txt, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
              />
              <UploadCloud className="w-10 h-10 text-emerald-600 animate-bounce" />
              <div>
                <p className="font-bold text-sm">اضغط هنا لاختيار ملف Excel / CSV أو اسحب الملف وأفلته هنا</p>
                <p className={`text-xs mt-1 text-slate-500`}>
                  يدعم ملفات (.xlsx, .xls, .csv, .txt) بصيغة UTF-8 للغة العربية
                </p>
              </div>
              {importedFile && (
                <div className="mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-500/20 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>الملف المحدد: {importedFile.name}</span>
                </div>
              )}
            </div>

            {/* Template Download Prompt */}
            <div
              className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs bg-brand-50 border-brand-200 text-brand-800`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>هل تحتاج للنموذج المعتمد لتعبئته؟</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1 bg-brand-700 hover:bg-brand-800 text-on-brand font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
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
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded font-mono font-bold">
                      {toArabicDigits(importEntities.length)} تشكيل صالح
                    </span>
                    {importErrorCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded font-mono font-bold">
                        {toArabicDigits(importErrorCount)} تحذير/خطأ
                      </span>
                    )}
                  </h4>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500">طريقة الحفظ:</span>
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
                      <span className="text-rose-600 font-bold">استبدال الهيكل بالكامل</span>
                    </label>
                  </div>
                </div>

                <div className="max-h-60 overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full min-w-[550px] sm:min-w-0 text-right text-xs">
                    <thead>
                      <tr className={`bg-slate-100 text-slate-700`}>
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
                              ? 'hover:bg-slate-50'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          <td className="p-2 font-mono font-bold text-brand-700">{r.code}</td>
                          <td className="p-2 font-bold">
                            {r.nameAr}
                            {r.validationError && (
                              <div className="text-[10px] text-rose-600 font-normal">{r.validationError}</div>
                            )}
                          </td>
                          <td className="p-2 font-mono text-slate-500">{r.parentCode || '— (رئيسي)'}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-bold">
                              {ORG_LEVEL_LABELS[r.level] || r.level}
                            </span>
                          </td>
                          <td className="p-2 font-mono">{r.employeeCount}</td>
                          <td className="p-2 text-center">
                            {r.isValid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-600 font-bold">
                                جاهز للاستيراد
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-600 font-bold">
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

        </div>
        )}
      </Modal>


      {/* نافذة تأكيد الحذف الموحدة */}
      <ConfirmDialog
        open={!!deleteConfirmNode}
        danger
        title="تأكيد حذف التشكيل التنظيمي"
        message={
          deleteConfirmNode && (
            <div className="space-y-3">
              <p>هل تريد حذف «<strong>{deleteConfirmNode.nameAr}</strong>» ({deleteConfirmNode.code}) نهائياً من الهيكل التنظيمي؟</p>
              {getDirectChildrenCount(deleteConfirmNode.id) > 0 && (
                <div className="space-y-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs">
                  <div className="font-bold text-brand-700">يتبع هذا التشكيل ({getDirectChildrenCount(deleteConfirmNode.id)}) فروع وشعب:</div>
                  <label className="flex cursor-pointer items-start gap-2 font-bold">
                    <input type="radio" name="cascadeOption" checked={deleteCascadeOption === 'reparent'} onChange={() => setDeleteCascadeOption('reparent')} className="mt-0.5" />
                    <span>نقل الفروع التابعة إلى الجهة الأعلى</span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 font-bold text-rose-600">
                    <input type="radio" name="cascadeOption" checked={deleteCascadeOption === 'cascade'} onChange={() => setDeleteCascadeOption('cascade')} className="mt-0.5" />
                    <span>حذف التشكيل مع كل الفروع والشعب التابعة له</span>
                  </label>
                </div>
              )}
            </div>
          )
        }
        onClose={() => setDeleteConfirmNode(null)}
        onConfirm={() => {
          if (!deleteConfirmNode) return;
          onDeleteOrgEntity(deleteConfirmNode.id, deleteCascadeOption === 'cascade');
          setDeleteConfirmNode(null);
        }}
      />
      {/* Interactive Printable Org Chart Modal */}
      {showOrgChartModal && (
        <OrgChartModal
          isOpen={showOrgChartModal}
          onClose={() => setShowOrgChartModal(false)}
          orgEntities={orgEntities}
          branding={branding}
          units={units}
          isParentLight={isLight}
        />
      )}
    </div>
  );
};
