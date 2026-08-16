import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  UserCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit3,
  CheckSquare,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Info,
  X,
  Send,
  CalendarDays,
  Upload,
  FileText,
  Wrench,
  Archive,
  Printer,
  MapPin,
  Check,
  ExternalLink,
  Layers,
  GitBranch,
  SlidersHorizontal,
  List,
  Flame,
  Lock,
  Eye,
  FileCheck,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { INITIAL_GOVERNORATES, INITIAL_OILFIELDS } from '../data/mockData';
import {
  PeriodicInspectionSchedule,
  InspectionFrequency,
  InspectionStatus,
  InspectionType,
  UnitAsset,
  ConditionGrade,
  GovernorateRef,
  OilfieldRef,
  MaintenanceRequest,
  MaintenanceStatus,
  UnitAttachment,
} from '../types';
import {
  toArabicDigits,
  formatDateOnly,
  getCompletionOrCancellationDate,
  calculateMaintenanceDurationDays,
} from '../utils/arabicUtils';

interface PeriodicInspectionViewProps {
  schedules: PeriodicInspectionSchedule[];
  units: UnitAsset[];
  governorates?: GovernorateRef[];
  oilfields?: OilfieldRef[];
  maintenanceRequests?: MaintenanceRequest[];
  onAddSchedule: (schedule: PeriodicInspectionSchedule) => void;
  onUpdateSchedule: (schedule: PeriodicInspectionSchedule) => void;
  onDeleteSchedule: (id: string) => void;
  onCompleteInspection: (
    id: string,
    outcome: {
      completionDate: string;
      grade: ConditionGrade;
      findings: string;
      recommendations: string;
      autoScheduleNext: boolean;
      reportFileName?: string;
      reportFileUrl?: string;
      createMaintenance?: boolean;
      maintenanceIssue?: string;
      maintenancePriority?: 'critical' | 'normal' | 'low';
      maintenanceAssignedTo?: string;
      maintenanceDate?: string;
    }
  ) => void;
  onUpdateMaintenanceRequest?: (updated: MaintenanceRequest) => void;
  onNavigateTab?: (tab: any) => void;
  theme?: 'dark' | 'light';
}

export const PeriodicInspectionView: React.FC<PeriodicInspectionViewProps> = ({
  schedules,
  units,
  governorates = [],
  oilfields = [],
  maintenanceRequests = [],
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onCompleteInspection,
  onUpdateMaintenanceRequest,
  onNavigateTab,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [activeSubTab, setActiveSubTab] = useState<'schedules' | 'hierarchy'>('schedules');

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all');
  const [selectedOilfield, setSelectedOilfield] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('all');

  // Effective governorates & oilfields list
  const effectiveGovernorates = useMemo(() => {
    return governorates && governorates.length > 0 ? governorates : INITIAL_GOVERNORATES;
  }, [governorates]);

  const effectiveOilfields = useMemo(() => {
    return oilfields && oilfields.length > 0 ? oilfields : INITIAL_OILFIELDS;
  }, [oilfields]);

  // Selected Governorate object
  const selectedGovObj = useMemo(() => {
    if (selectedGovernorate === 'all') return null;
    return effectiveGovernorates.find(
      (g) =>
        g.id === selectedGovernorate ||
        g.nameAr === selectedGovernorate ||
        g.code === selectedGovernorate ||
        (g.nameAr && selectedGovernorate.includes(g.nameAr)) ||
        (g.nameAr && g.nameAr.includes(selectedGovernorate))
    );
  }, [selectedGovernorate, effectiveGovernorates]);

  // Available Oilfields dropdown list:
  // If governorate is selected -> show only fields linked to that governorate
  // If governorate is NOT selected ('all') -> show ALL fields in the system
  const availableOilfieldOptions = useMemo(() => {
    if (selectedGovernorate === 'all') {
      return effectiveOilfields.filter((f) => f.status !== 'disabled');
    }
    if (selectedGovObj) {
      return effectiveOilfields.filter(
        (f) => f.governorateId === selectedGovObj.id && f.status !== 'disabled'
      );
    }
    return effectiveOilfields.filter((f) => f.status !== 'disabled');
  }, [selectedGovernorate, selectedGovObj, effectiveOilfields]);

  // Handle governorate filter selection change
  const handleGovernorateChange = (govVal: string) => {
    setSelectedGovernorate(govVal);
    // If a governorate is selected, check if currently selected oilfield belongs to it, else reset to 'all'
    if (govVal !== 'all') {
      const newGovObj = effectiveGovernorates.find(
        (g) => g.id === govVal || g.nameAr === govVal || g.code === govVal
      );
      if (newGovObj && selectedOilfield !== 'all') {
        const belongs = effectiveOilfields.some(
          (f) =>
            f.governorateId === newGovObj.id &&
            (f.nameAr === selectedOilfield || f.id === selectedOilfield || f.code === selectedOilfield)
        );
        if (!belongs) {
          setSelectedOilfield('all');
        }
      }
    }
  };

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<PeriodicInspectionSchedule | null>(null);
  const [showEditModal, setShowEditModal] = useState<PeriodicInspectionSchedule | null>(null);
  const [showUnitArchiveModal, setShowUnitArchiveModal] = useState<UnitAsset | null>(null);
  const [archiveModalTab, setArchiveModalTab] = useState<'both' | 'inspections' | 'maintenance'>('both');

  // Maintenance Edit modal inside Archive
  const [editMaintenanceReq, setEditMaintenanceReq] = useState<MaintenanceRequest | null>(null);
  const [maintResolutionNotes, setMaintResolutionNotes] = useState('');
  const [maintNewStatus, setMaintNewStatus] = useState<MaintenanceStatus>('completed');
  const [maintCompletedDate, setMaintCompletedDate] = useState('');

  // New Schedule Form state
  const [newUnitCode, setNewUnitCode] = useState(units[0]?.code || '');
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newFrequency, setNewFrequency] = useState<InspectionFrequency>('quarterly');
  const [newCustomDays, setNewCustomDays] = useState(90);
  const [newNextDate, setNewNextDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split('T')[0];
  });
  const [newAssignedTeam, setNewAssignedTeam] = useState('');
  const [newInspectorName, setNewInspectorName] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Unit Tree Selector states for Modal
  const [unitPickerMode, setUnitPickerMode] = useState<'tree_vertical' | 'tree_horizontal' | 'dropdown'>('tree_vertical');
  const [unitSearch, setUnitSearch] = useState('');
  const [expandedGovs, setExpandedGovs] = useState<Record<string, boolean>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [activeGovHoriz, setActiveGovHoriz] = useState<string>('');
  const [activeFieldHoriz, setActiveFieldHoriz] = useState<string>('');

  const groupedUnits = useMemo(() => {
    const map: Record<string, Record<string, UnitAsset[]>> = {};
    units.forEach((u) => {
      const gov = u.governorate || 'عام';
      const fld = u.field || 'عام';
      if (!map[gov]) map[gov] = {};
      if (!map[gov][fld]) map[gov][fld] = [];
      map[gov][fld].push(u);
    });
    return map;
  }, [units]);

  const selectedUnitAsset = useMemo(() => {
    return units.find((u) => u.code === newUnitCode) || units[0];
  }, [units, newUnitCode]);

  const currentUnitGov = selectedUnitAsset?.governorate || Object.keys(groupedUnits)[0] || '';
  const currentUnitField = selectedUnitAsset?.field || '';
  const effectiveGov = activeGovHoriz || currentUnitGov;
  const effectiveField =
    activeFieldHoriz ||
    currentUnitField ||
    (effectiveGov && groupedUnits[effectiveGov] ? Object.keys(groupedUnits[effectiveGov])[0] : '');

  // Complete Inspection Form state
  const [completeDate, setCompleteDate] = useState(new Date().toISOString().split('T')[0]);
  const [completeGrade, setCompleteGrade] = useState<ConditionGrade>('A');
  const [completeFindings, setCompleteFindings] = useState('');
  const [completeRecommendations, setCompleteRecommendations] = useState('');
  const [autoScheduleNext, setAutoScheduleNext] = useState(true);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportFileName, setReportFileName] = useState<string>('');
  const [previewAttachment, setPreviewAttachment] = useState<UnitAttachment | null>(null);
  const reportFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const ALLOWED_REPORT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

  const handleReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_REPORT_EXTENSIONS.includes(ext)) {
        alert('عذراً، نوع الملف المحدد غير مسموح به!\nيسمح فقط بتحميل الملفات من الأنواع التالية:\n• الصور (PNG, JPG, JPEG, WEBP, GIF)\n• مستندات PDF (.pdf)\n• ملفات وورد Word (.doc, .docx)\n• ملفات إكسل Excel (.xls, .xlsx)');
        if (reportFileInputRef.current) reportFileInputRef.current.value = '';
        return;
      }
      setReportFile(file);
      setReportFileName(file.name);
    }
  };

  const handleRemoveReportFile = () => {
    setReportFile(null);
    setReportFileName('');
    if (reportFileInputRef.current) {
      reportFileInputRef.current.value = '';
    }
  };

  const handlePreviewReportFile = () => {
    if (!reportFileName) return;
    const ext = reportFileName.split('.').pop()?.toLowerCase() || 'pdf';
    const url = reportFile ? URL.createObjectURL(reportFile) : (showCompleteModal?.reportFileUrl || '#');
    setPreviewAttachment({
      id: 'report-preview-' + Date.now(),
      name: reportFileName,
      type: ext,
      url: url,
      uploadedAt: new Date().toISOString().split('T')[0],
      size: reportFile ? `${(reportFile.size / 1024).toFixed(1)} KB` : '1.2 MB',
    });
  };

  // Trigger Maintenance Request from Complete Modal
  const [createMaintenance, setCreateMaintenance] = useState(false);
  const [maintIssue, setMaintIssue] = useState('');
  const [maintPriority, setMaintPriority] = useState<'critical' | 'normal' | 'low'>('normal');
  const [maintAssignedTo, setMaintAssignedTo] = useState('فريق الصيانة الميدانية بالموقع');
  const [maintDate, setMaintDate] = useState('');

  // Edit Schedule Form state
  const [editTitle, setEditTitle] = useState('');
  const [editInspectionType, setEditInspectionType] = useState<InspectionType>('comprehensive');
  const [editStatus, setEditStatus] = useState<InspectionStatus>('scheduled');
  const [editFrequency, setEditFrequency] = useState<InspectionFrequency>('quarterly');
  const [editCustomDays, setEditCustomDays] = useState(90);
  const [editLastDate, setEditLastDate] = useState('');
  const [editNextDate, setEditNextDate] = useState('');
  const [editAssignedTeam, setEditAssignedTeam] = useState('');
  const [editInspectorName, setEditInspectorName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete Schedule Confirm state
  const [deleteConfirmSchedule, setDeleteConfirmSchedule] = useState<PeriodicInspectionSchedule | null>(null);

  // Helper calculation for Next Due Date when start date or frequency changes
  const updateCalculatedNextDate = (startDateStr: string, freq: InspectionFrequency, customDays: number) => {
    const d = new Date(startDateStr || new Date());
    let daysToAdd = 90;
    if (freq === 'monthly') daysToAdd = 30;
    else if (freq === 'quarterly') daysToAdd = 90;
    else if (freq === 'semi_annual') daysToAdd = 180;
    else if (freq === 'annual') daysToAdd = 365;
    else if (freq === 'custom') daysToAdd = customDays || 30;

    d.setDate(d.getDate() + daysToAdd);
    setNewNextDate(d.toISOString().split('T')[0]);
  };

  const handleStartDateChange = (dateStr: string) => {
    setNewStartDate(dateStr);
    updateCalculatedNextDate(dateStr, newFrequency, newCustomDays);
  };

  const handleFrequencyChange = (freq: InspectionFrequency) => {
    setNewFrequency(freq);
    updateCalculatedNextDate(newStartDate, freq, newCustomDays);
  };

  // Submit New Schedule
  const handleCreateScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const unitObj = units.find((u) => u.code === newUnitCode);
    const year = new Date().getFullYear();
    const uniqueSuffix = Date.now().toString(36).slice(-6).toUpperCase();
    const schedule: PeriodicInspectionSchedule = {
      id: `INS-${year}-${uniqueSuffix}`,
      unitCode: newUnitCode,
      unitName: unitObj?.name || newUnitCode,
      field: unitObj?.field || 'عام',
      governorate: unitObj?.governorate || 'واسط',
      inspectionType: 'comprehensive',
      title: 'كشف شامل على الوحدة',
      frequency: newFrequency,
      customIntervalDays: newFrequency === 'custom' ? newCustomDays : undefined,
      lastInspectionDate: newStartDate,
      nextDueDate: newNextDate,
      assignedTeam: newAssignedTeam,
      inspectorName: newInspectorName || 'مهندس الموقع',
      status: 'scheduled',
      notes: newNotes,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddSchedule(schedule);
    setShowAddModal(false);
    setNewTitle('');
    setNewAssignedTeam('');
    setNewInspectorName('');
    setNewNotes('');
  };

  // Submit Complete Inspection
  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCompleteModal) return;

    onCompleteInspection(showCompleteModal.id, {
      completionDate: completeDate,
      grade: completeGrade,
      findings: completeFindings,
      recommendations: completeRecommendations,
      autoScheduleNext,
      reportFileName: reportFileName || (reportFile ? reportFile.name : undefined),
      reportFileUrl: reportFile ? URL.createObjectURL(reportFile) : undefined,
      createMaintenance,
      maintenanceIssue: maintIssue,
      maintenancePriority: maintPriority,
      maintenanceAssignedTo: maintAssignedTo,
      maintenanceDate: maintDate || completeDate || new Date().toISOString().split('T')[0],
    });

    setShowCompleteModal(null);
    setCompleteFindings('');
    setCompleteRecommendations('');
    setReportFile(null);
    setReportFileName('');
    setCreateMaintenance(false);
    setMaintIssue('');
  };

  // Helper calculation for Next Due Date in Edit mode
  const updateEditCalculatedNextDate = (lastDateStr: string, freq: InspectionFrequency, customDays: number) => {
    const d = new Date(lastDateStr || new Date());
    let daysToAdd = 90;
    if (freq === 'monthly') daysToAdd = 30;
    else if (freq === 'quarterly') daysToAdd = 90;
    else if (freq === 'semi_annual') daysToAdd = 180;
    else if (freq === 'annual') daysToAdd = 365;
    else if (freq === 'custom') daysToAdd = customDays || 30;

    d.setDate(d.getDate() + daysToAdd);
    setEditNextDate(d.toISOString().split('T')[0]);
  };

  // Submit Edit Schedule
  const handleOpenEdit = (sch: PeriodicInspectionSchedule) => {
    setShowEditModal(sch);
    setEditTitle(sch.title || 'كشف دوري');
    setEditInspectionType(sch.inspectionType || 'comprehensive');
    setEditStatus(sch.status || 'scheduled');
    setEditFrequency(sch.frequency || 'quarterly');
    setEditCustomDays(sch.customIntervalDays || 90);
    setEditLastDate(sch.lastInspectionDate || new Date().toISOString().split('T')[0]);
    setEditNextDate(sch.nextDueDate || '');
    setEditAssignedTeam(sch.assignedTeam || '');
    setEditInspectorName(sch.inspectorName || '');
    setEditNotes(sch.notes || '');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    const updated: PeriodicInspectionSchedule = {
      ...showEditModal,
      title: editTitle,
      inspectionType: editInspectionType,
      status: editStatus,
      frequency: editFrequency,
      customIntervalDays: editFrequency === 'custom' ? editCustomDays : undefined,
      lastInspectionDate: editLastDate,
      nextDueDate: editNextDate,
      assignedTeam: editAssignedTeam,
      inspectorName: editInspectorName,
      notes: editNotes,
    };

    onUpdateSchedule(updated);
    setShowEditModal(null);
  };

  // Confirm Delete Handler
  const handleDeleteConfirm = () => {
    if (!deleteConfirmSchedule) return;
    onDeleteSchedule(deleteConfirmSchedule.id);
    setDeleteConfirmSchedule(null);
  };

  // Submit Maintenance Request Update from Data Entry User inside Archive
  const handleSaveMaintenanceResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMaintenanceReq || !onUpdateMaintenanceRequest) return;

    const updatedReq: MaintenanceRequest = {
      ...editMaintenanceReq,
      status: maintNewStatus,
      resolutionNotes: maintResolutionNotes,
      completedBy: 'موظف مدخل البيانات',
      completedAt: maintCompletedDate || new Date().toISOString().split('T')[0],
      daysOverdue: maintNewStatus === 'completed' || maintNewStatus === 'cancelled' ? 0 : editMaintenanceReq.daysOverdue,
    };

    onUpdateMaintenanceRequest(updatedReq);
    setEditMaintenanceReq(null);
    setMaintResolutionNotes('');
  };

  // Filtered Schedules
  const filteredSchedules = schedules.filter((sch) => {
    const term = (searchTerm || '').toLowerCase().trim();
    const matchesSearch =
      !term ||
      (sch.unitCode && sch.unitCode.toLowerCase().includes(term)) ||
      (sch.unitName && sch.unitName.toLowerCase().includes(term)) ||
      (sch.title && sch.title.toLowerCase().includes(term)) ||
      (sch.assignedTeam && sch.assignedTeam.toLowerCase().includes(term)) ||
      (sch.inspectorName && sch.inspectorName.toLowerCase().includes(term));

    // Matches governorate
    let matchesGov = selectedGovernorate === 'all';
    if (!matchesGov && sch.governorate) {
      const schGov = (sch.governorate || '').toLowerCase();
      const selGovStr = (selectedGovernorate || '').toLowerCase();
      if (schGov === selGovStr) {
        matchesGov = true;
      } else if (selectedGovObj) {
        matchesGov =
          (selectedGovObj.nameAr && schGov.includes(selectedGovObj.nameAr.toLowerCase())) ||
          (selectedGovObj.nameAr && selectedGovObj.nameAr.toLowerCase().includes(schGov)) ||
          (selectedGovObj.code && schGov.includes(selectedGovObj.code.toLowerCase())) ||
          (selectedGovObj.nameEn && schGov.includes(selectedGovObj.nameEn.toLowerCase())) ||
          (selectedGovObj.id && schGov.includes(selectedGovObj.id.toLowerCase()));
      }
    }

    // Matches field
    let matchesField = selectedOilfield === 'all';
    if (!matchesField && sch.field) {
      const schFld = (sch.field || '').toLowerCase();
      const selFldStr = (selectedOilfield || '').toLowerCase();
      if (schFld === selFldStr) {
        matchesField = true;
      } else {
        const selFieldObj = effectiveOilfields.find(
          (f) => f.id === selectedOilfield || f.nameAr === selectedOilfield || f.code === selectedOilfield
        );
        if (selFieldObj) {
          matchesField =
            (selFieldObj.nameAr && schFld.includes(selFieldObj.nameAr.toLowerCase())) ||
            (selFieldObj.nameAr && selFieldObj.nameAr.toLowerCase().includes(schFld)) ||
            (selFieldObj.code && schFld.includes(selFieldObj.code.toLowerCase())) ||
            (selFieldObj.nameEn && schFld.includes(selFieldObj.nameEn.toLowerCase())) ||
            (selFieldObj.id && schFld.includes(selFieldObj.id.toLowerCase()));
        } else {
          matchesField = schFld.includes(selFldStr) || selFldStr.includes(schFld);
        }
      }
    }

    const matchesStatus = selectedStatus === 'all' || sch.status === selectedStatus;
    const matchesFrequency = selectedFrequency === 'all' || sch.frequency === selectedFrequency;

    return matchesSearch && matchesGov && matchesField && matchesStatus && matchesFrequency;
  });

  // KPI Calculations
  const totalCount = schedules.length;
  const overdueCount = schedules.filter((s) => s.status === 'overdue').length;
  const scheduledCount = schedules.filter((s) => s.status === 'scheduled').length;
  const completedCount = schedules.filter((s) => s.status === 'completed').length;

  const getInspectionTypeLabel = (type: InspectionType) => {
    switch (type) {
      case 'structural':
        return 'إنشائي وهيكلي';
      case 'safety_hse':
        return 'سلامة وبيئة HSE';
      case 'mechanical_electrical':
        return 'كهروميكانيكي';
      case 'comprehensive':
        return 'كشف شامل';
      default:
        return type;
    }
  };

  const getFrequencyLabel = (freq: InspectionFrequency, customDays?: number) => {
    switch (freq) {
      case 'monthly':
        return `1 شهر (كل ${toArabicDigits(30)} يوم)`;
      case 'quarterly':
        return `3 أشهر (كل ${toArabicDigits(90)} يوم)`;
      case 'semi_annual':
        return `6 أشهر (كل ${toArabicDigits(180)} يوم)`;
      case 'annual':
        return `12 شهر (كل ${toArabicDigits(365)} يوم)`;
      case 'custom':
        return `تكرار مخصص (${toArabicDigits(customDays || 90)} يوم)`;
      default:
        return freq;
    }
  };

  const getConditionGradeBadge = (grade?: ConditionGrade) => {
    if (!grade) return <span className="text-slate-400 font-mono text-xs">غير محدد</span>;
    switch (grade) {
      case 'A':
        return <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold font-mono text-xs">درجة A (ممتاز)</span>;
      case 'B':
        return <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold font-mono text-xs">درجة B (جيد)</span>;
      case 'C':
        return <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold font-mono text-xs">درجة C (متوسط)</span>;
      case 'D':
        return <span className="px-2.5 py-0.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-bold font-mono text-xs">درجة D (حرج)</span>;
    }
  };

  const getStatusBadge = (status: InspectionStatus) => {
    switch (status) {
      case 'overdue':
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 ${isLight ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            <AlertTriangle className="w-3.5 h-3.5" /> غير مكتمل (مستحق فوراً)
          </span>
        );
      case 'scheduled':
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 ${isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            <Clock className="w-3.5 h-3.5" /> غير مكتمل (مجدول)
          </span>
        );
      case 'in_progress':
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 ${isLight ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
            <RotateCcw className="w-3.5 h-3.5 animate-spin" /> قيد الكشف والمعاينة
          </span>
        );
      case 'completed':
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 ${isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> مكتمل وموثق
          </span>
        );
      default:
        return <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>{status}</span>;
    }
  };

  // Group units by Governorate -> Field for Hierarchy view
  const governorateNames = Array.from(new Set(units.map((u) => u.governorate)));

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className={`rounded-3xl p-6 shadow-md relative overflow-hidden transition-colors ${isLight ? 'bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-white border border-amber-200/80' : 'bg-slate-900 border border-slate-800 shadow-xl'}`}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-inner ${isLight ? 'bg-amber-500/15 border border-amber-300 text-amber-700' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
              <CalendarCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  سجل الكشوفات الدورية
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                  شركة نفط الوسط
                </span>
              </div>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                متابعة وحدات الحقول والمحافظات، تحديد تواريخ وتكرار الكشف الدوري، إنجاز المعاينات وترفيع التقارير، وتوثيق طلبات الصيانة في أرشيف الأصل
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>جدولة كشف جديد</span>
            </button>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-5 border-t border-slate-800/40 pt-4">
          <button
            onClick={() => setActiveSubTab('schedules')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'schedules'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>جدول مواعيد الكشوفات الدورية ({toArabicDigits(filteredSchedules.length)})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('hierarchy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'hierarchy'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : isLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>عرض الوحدات حسب المحافظات والحقول ({toArabicDigits(units.length)} منشأة)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl p-4 flex items-center justify-between shadow-sm transition-colors ${isLight ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-slate-800'}`}>
          <div>
            <p className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>إجمالي الكشوفات المجدولة</p>
            <h3 className={`text-2xl font-black mt-1 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{toArabicDigits(totalCount)}</h3>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>جدول متابعة معتمد للنظام</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        <div className={`rounded-2xl p-4 flex items-center justify-between shadow-sm transition-colors ${isLight ? 'bg-red-50/70 border border-red-200' : 'bg-slate-900 border border-red-500/30'}`}>
          <div>
            <p className={`text-xs font-bold ${isLight ? 'text-red-800' : 'text-red-400'}`}>غير مكتملة (مستحقة فوراً)</p>
            <h3 className={`text-2xl font-black mt-1 ${isLight ? 'text-red-700' : 'text-red-400'}`}>{toArabicDigits(overdueCount)}</h3>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-red-600/80' : 'text-slate-500'}`}>تتطلب معالجة وإنجاز كشف عاجل</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isLight ? 'bg-red-100 border-red-200 text-red-600' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className={`rounded-2xl p-4 flex items-center justify-between shadow-sm transition-colors ${isLight ? 'bg-amber-50/70 border border-amber-200' : 'bg-slate-900 border border-amber-500/30'}`}>
          <div>
            <p className={`text-xs font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>غير مكتملة (مجدولة قادمة)</p>
            <h3 className={`text-2xl font-black mt-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{toArabicDigits(scheduledCount)}</h3>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-amber-700/80' : 'text-slate-500'}`}>بانتظار تاريخ الاستحقاق</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isLight ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className={`rounded-2xl p-4 flex items-center justify-between shadow-sm transition-colors ${isLight ? 'bg-emerald-50/70 border border-emerald-200' : 'bg-slate-900 border border-emerald-500/30'}`}>
          <div>
            <p className={`text-xs font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>كشوفات مكتملة وموثقة</p>
            <h3 className={`text-2xl font-black mt-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{toArabicDigits(completedCount)}</h3>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-emerald-700/80' : 'text-slate-500'}`}>تم ترفيع تقاريرها وتحديث الدرجة</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isLight ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`rounded-2xl p-4 space-y-4 transition-colors ${isLight ? 'bg-white border border-slate-200 shadow-sm' : 'bg-slate-900 border border-slate-800'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className={`w-4 h-4 absolute right-3 top-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المبنى، الرمز، الفريق، المفتش..."
              className={`w-full rounded-xl pr-9 pl-3 py-2.5 outline-none font-medium transition ${
                isLight ? 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-amber-500' : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Governorate Filter */}
          <div>
            <select
              value={selectedGovernorate}
              onChange={(e) => handleGovernorateChange(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer transition ${
                isLight ? 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-amber-500'
              }`}
            >
              <option value="all">جميع المحافظات</option>
              {effectiveGovernorates
                .filter((g) => g.status !== 'disabled')
                .map((g) => (
                  <option key={g.id} value={g.nameAr}>
                    {g.nameAr}
                  </option>
                ))}
            </select>
          </div>

          {/* Field Filter */}
          <div>
            <select
              value={selectedOilfield}
              onChange={(e) => setSelectedOilfield(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer transition ${
                isLight ? 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-amber-500'
              }`}
            >
              <option value="all">جميع الحقول والقطاعات</option>
              {availableOilfieldOptions.map((f) => (
                <option key={f.id} value={f.nameAr}>
                  {f.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer transition ${
                isLight ? 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-amber-500'
              }`}
            >
              <option value="all">جميع الحالات</option>
              <option value="scheduled">غير مكتمل (مجدول)</option>
              <option value="overdue">غير مكتمل (مستحق فوراً)</option>
              <option value="in_progress">قيد الكشف والمعاينة</option>
              <option value="completed">مكتمل وموثق</option>
            </select>
          </div>

          {/* Frequency Filter */}
          <div>
            <select
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer transition ${
                isLight ? 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-amber-500'
              }`}
            >
              <option value="all">جميع التكرارات</option>
              <option value="monthly">1 شهر (شهري)</option>
              <option value="quarterly">3 أشهر (ربع سنوي)</option>
              <option value="semi_annual">6 أشهر (نصف سنوي)</option>
              <option value="annual">12 شهر (سنوي)</option>
              <option value="custom">تكرار مخصص</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeSubTab === 'schedules' ? (
        /* 1. SCHEDULES TABLE */
        <div className={`rounded-2xl overflow-hidden shadow-md border transition-colors ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
            <div className="flex items-center gap-2">
              <CalendarCheck className={`w-5 h-5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                جدول الكشوفات والمعاينات الدوريّة ({toArabicDigits(filteredSchedules.length)} سجل)
              </h3>
            </div>
            <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              سجل مواعيد الكشوفات الدورية للوحدات الميدانية
            </span>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-4">
              <Info className={`w-12 h-12 mx-auto ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
              {schedules.length === 0 ? (
                <>
                  <p className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    لا توجد مواعيد كشوفات مسجلة حالياً. يمكنك إدراج وجدولة كشف جديد للوحدات المتاحة.
                  </p>
                  <div className="flex items-center justify-center pt-2">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-5 py-2.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 hover:bg-amber-400 transition cursor-pointer shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>جدولة كشف دوري جديد</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold">لا توجد سجلات كشف تطابق خيارات البحث والتصفية المحددة.</p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedGovernorate('all');
                      setSelectedOilfield('all');
                      setSelectedStatus('all');
                      setSelectedFrequency('all');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${isLight ? 'bg-slate-100 text-amber-700 hover:bg-slate-200' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'}`}
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className={`font-bold border-b ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                  <tr>
                    <th className="p-3.5">الوحدة الهندسية / المبنى</th>
                    <th className="p-3.5">المحافظة والحقل</th>
                    <th className="p-3.5">عنوان ومسمى الكشف</th>
                    <th className="p-3.5">تاريخ البدء والتكرار</th>
                    <th className="p-3.5">الموعد القادم المستحق</th>
                    <th className="p-3.5">حالة الكشف</th>
                    <th className="p-3.5">التقرير الهندسي</th>
                    <th className="p-3.5 text-center">الإجراءات والتوثيق</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200/80 bg-white' : 'divide-slate-800/60 bg-slate-900/40'}`}>
                  {filteredSchedules.map((sch) => {
                    const matchedUnit = units.find((u) => u.code === sch.unitCode);
                    return (
                      <tr key={sch.id} className={`transition ${isLight ? 'hover:bg-amber-50/50' : 'hover:bg-slate-800/40'}`}>
                        {/* Unit Info */}
                        <td className="p-3.5 font-medium">
                          <div className={`font-mono font-bold text-xs ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                            {toArabicDigits(sch.unitCode)}
                          </div>
                          <div className={`font-bold text-xs mt-0.5 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                            {sch.unitName}
                          </div>
                          {matchedUnit && (
                            <div className="mt-1">
                              {getConditionGradeBadge(sch.conditionGradeGiven || matchedUnit.conditionGrade)}
                            </div>
                          )}
                        </td>

                        {/* Gov & Field */}
                        <td className="p-3.5">
                          <div className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {sch.governorate}
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            حقل {sch.field}
                          </div>
                        </td>

                        {/* Title */}
                        <td className="p-3.5">
                          <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                            {sch.title}
                          </div>
                        </td>

                        {/* Start Date & Frequency */}
                        <td className="p-3.5">
                          <div className={`font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            بدء: {toArabicDigits(sch.lastInspectionDate)}
                          </div>
                          <div className="mt-1">
                            <span className={`px-2.5 py-0.5 rounded-lg font-bold border text-[10px] ${isLight ? 'bg-slate-100 text-amber-900 border-slate-200' : 'bg-slate-950 text-amber-400 border-slate-800'}`}>
                              {getFrequencyLabel(sch.frequency, sch.customIntervalDays)}
                            </span>
                          </div>
                        </td>

                        {/* Next Due Date */}
                        <td className="p-3.5">
                          <div className={`font-mono font-bold text-xs ${sch.status === 'overdue' ? (isLight ? 'text-red-600 font-black' : 'text-red-400 font-black') : isLight ? 'text-slate-900 font-bold' : 'text-slate-200 font-bold'}`}>
                            {toArabicDigits(sch.nextDueDate)}
                          </div>
                          {sch.status === 'overdue' && (
                            <div className="text-[10px] text-red-500 font-bold mt-0.5">
                              غير مكتمل - مستحق المعاينة!
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5">{getStatusBadge(sch.status)}</td>

                        {/* Uploaded Report */}
                        <td className="p-3.5">
                          {sch.reportFileName ? (
                            <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[11px]">
                              <FileText className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[120px]" title={sch.reportFileName}>
                                {sch.reportFileName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[10px]">لم يرفع تقرير بعد</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Complete Inspection Button - Hidden if inspection is already completed & documented */}
                            {sch.status !== 'completed' && (
                              <button
                                onClick={() => {
                                  const todayStr = new Date().toISOString().split('T')[0];
                                  setShowCompleteModal(sch);
                                  setCompleteDate(todayStr);
                                  setMaintDate(todayStr);
                                  if (matchedUnit) {
                                    setCompleteGrade(matchedUnit.conditionGrade);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                  isLight
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                                }`}
                                title="إنجاز الكشف وتوثيق التقرير وتقييم A-B-C-D"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>إنجاز الكشف</span>
                              </button>
                            )}

                            {/* Archive Button for Unit */}
                            {matchedUnit && (
                              <button
                                onClick={() => {
                                  setShowUnitArchiveModal(matchedUnit);
                                  setArchiveModalTab('inspections');
                                }}
                                className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                  isLight
                                    ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                                    : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
                                }`}
                                title="عرض أرشيف الكشوفات والصيانة للوحدة"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>الأرشيف</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(sch)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                              title="تعديل معلومات وتفاصيل الجدولة"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteConfirmSchedule(sch)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isLight
                                  ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                              }`}
                              title="حذف جدول الكشف الدوري"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* 2. HIERARCHY TREE VIEW BY GOVERNORATE & OILFIELD */
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="font-bold">استعراض الهيكلية الجغرافية والمستويات الإدارية لشركة نفط الوسط</span>
            </div>
            <span>انقر على أية منشأة لفتح الأرشيف الخاص بها أو لجدولة كشف جديد</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {governorateNames.map((govName) => {
              const govUnits = units.filter((u) => u.governorate === govName);
              const fieldNames = Array.from(new Set(govUnits.map((u) => u.field)));

              return (
                <div
                  key={govName}
                  className={`rounded-2xl border p-4 space-y-4 shadow-sm ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800/40">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      <h3 className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        محافظة {govName}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-400'}`}>
                      {toArabicDigits(govUnits.length)} منشآت
                    </span>
                  </div>

                  <div className="space-y-3 pr-2">
                    {fieldNames.map((fieldName) => {
                      const fieldUnits = govUnits.filter((u) => u.field === fieldName);

                      return (
                        <div key={fieldName} className={`p-3 rounded-xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                          <div className="flex items-center justify-between text-xs font-bold text-amber-500">
                            <span>حقل / قطاع: {fieldName}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({toArabicDigits(fieldUnits.length)} وحدات)
                            </span>
                          </div>

                          <div className="divide-y divide-slate-800/40 text-xs">
                            {fieldUnits.map((unit) => {
                              const unitSchedules = schedules.filter((s) => s.unitCode === unit.code);
                              const latestSchedule = unitSchedules[0];

                              return (
                                <div key={unit.code} className="py-2.5 flex items-center justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-amber-400">{toArabicDigits(unit.code)}</span>
                                      <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{unit.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      {getConditionGradeBadge(unit.conditionGrade)}
                                      {latestSchedule && (
                                        <span className="text-[10px] text-slate-400">
                                          الكشف القادم: <strong className="text-amber-400 font-mono">{toArabicDigits(latestSchedule.nextDueDate)}</strong>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setNewUnitCode(unit.code);
                                        setShowAddModal(true);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                        isLight ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                                      }`}
                                    >
                                      + جدولة كشف
                                    </button>

                                    <button
                                      onClick={() => {
                                        setShowUnitArchiveModal(unit);
                                        setArchiveModalTab('inspections');
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                        isLight ? 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                      }`}
                                    >
                                      الأرشيف
                                    </button>
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
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW PERIODIC INSPECTION */}
      {showAddModal && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-6 w-full max-w-5xl space-y-5 shadow-2xl relative my-6 border max-h-[92vh] flex flex-col ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            <div className={`flex items-center justify-between border-b pb-3 shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${isLight ? 'bg-amber-100 border border-amber-300 text-amber-700' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    جدولة وتثبيت موعد كشف دوري جديد
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    تحديد تاريخ البدء بالتكرار وحساب تاريخ الاستحقاق القادم تلقائياً
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className={`p-1 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScheduleSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* RIGHT COLUMN: UNIT PICKER */}
                <div className={`p-4 rounded-2xl border space-y-3.5 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                    <label className={`block font-extrabold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      1. اختيار الوحدة الهندسية:
                    </label>

                    {/* View Mode Switcher */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                      <button
                        type="button"
                        onClick={() => setUnitPickerMode('tree_vertical')}
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] flex items-center gap-1 transition cursor-pointer ${
                          unitPickerMode === 'tree_vertical'
                            ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                            : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="عرض الشجرة الهيكلية (التنفيذي/الرأسي)"
                      >
                        <GitBranch className="w-3 h-3" />
                        <span>شجرة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUnitPickerMode('tree_horizontal')}
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] flex items-center gap-1 transition cursor-pointer ${
                          unitPickerMode === 'tree_horizontal'
                            ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                            : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="العرض الأفقي الهيكلي"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>أفقي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setUnitPickerMode('dropdown')}
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] flex items-center gap-1 transition cursor-pointer ${
                          unitPickerMode === 'dropdown'
                            ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                            : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="قائمة اختيار بسيطة"
                      >
                        <List className="w-3 h-3" />
                        <span>قائمة</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Selected Unit Badge Summary */}
                  {selectedUnitAsset ? (
                    <div className={`p-3 rounded-2xl border flex items-center justify-between flex-wrap gap-2 transition ${
                      isLight ? 'bg-amber-50/90 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs flex items-center gap-2">
                            <span>{selectedUnitAsset.code}</span>
                            <span className="opacity-60">•</span>
                            <span>{selectedUnitAsset.name}</span>
                          </div>
                          <div className="text-[10px] opacity-80 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              محافظة {selectedUnitAsset.governorate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              حقل {selectedUnitAsset.field}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        محددة
                      </span>
                    </div>
                  ) : null}

                  {/* SEARCH INPUT BAR */}
                  {unitPickerMode !== 'dropdown' && (
                    <div className="relative">
                      <Search className={`w-3.5 h-3.5 absolute right-3 top-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                      <input
                        type="text"
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        placeholder="تصفية / بحث عن وحدة بالاسم أو الكود..."
                        className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs font-bold outline-none border ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                            : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  )}

                  {/* VIEW 1: VERTICAL TREE VIEW */}
                  {unitPickerMode === 'tree_vertical' && (
                    <div className={`p-3 rounded-2xl border space-y-2 max-h-64 overflow-y-auto ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                        <span className="font-bold text-slate-500 text-[10px]">
                          شجرة الوحدات
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const allG: Record<string, boolean> = {};
                              const allF: Record<string, boolean> = {};
                              Object.keys(groupedUnits).forEach((g) => {
                                allG[g] = true;
                                Object.keys(groupedUnits[g]).forEach((f) => {
                                  allF[`${g}_${f}`] = true;
                                });
                              });
                              setExpandedGovs(allG);
                              setExpandedFields(allF);
                            }}
                            className="text-amber-600 hover:underline font-bold text-[10px] cursor-pointer"
                          >
                            توسيع الكل
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const noG: Record<string, boolean> = {};
                              const noF: Record<string, boolean> = {};
                              Object.keys(groupedUnits).forEach((g) => {
                                noG[g] = false;
                                Object.keys(groupedUnits[g]).forEach((f) => {
                                  noF[`${g}_${f}`] = false;
                                });
                              });
                              setExpandedGovs(noG);
                              setExpandedFields(noF);
                            }}
                            className="text-slate-400 hover:underline font-bold text-[10px] cursor-pointer"
                          >
                            طي الكل
                          </button>
                        </div>
                      </div>

                      {Object.keys(groupedUnits).length === 0 ? (
                        <p className="text-center py-4 text-slate-500">لا توجد وحدات هندسية متوفرة.</p>
                      ) : (
                        Object.entries(groupedUnits).map(([gov, fieldsMap]) => {
                          const isGovExpanded = expandedGovs[gov] !== false;
                          const govUnitsCount = (Object.values(fieldsMap) as UnitAsset[][]).reduce((acc, arr) => acc + arr.length, 0);

                          return (
                            <div key={gov} className="space-y-1">
                              {/* GOVERNORATE NODE */}
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedGovs((prev) => ({ ...prev, [gov]: !isGovExpanded }))
                                }
                                className={`w-full flex items-center justify-between p-2 rounded-xl font-bold text-xs transition cursor-pointer border ${
                                  isLight
                                    ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800/80'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isGovExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-amber-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                  <MapPin className="w-4 h-4 text-amber-500" />
                                  <span>محافظة {gov}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                  {govUnitsCount} وحدة
                                </span>
                              </button>

                              {/* OILFIELDS UNDER GOVERNORATE */}
                              {isGovExpanded && (
                                <div className="pr-4 pl-1 space-y-1.5 border-r-2 border-amber-500/30 mr-3 my-1">
                                  {Object.entries(fieldsMap).map(([fld, unitArr]) => {
                                    const fieldKey = `${gov}_${fld}`;
                                    const isFldExpanded = expandedFields[fieldKey] !== false;

                                    // Filter units if searching
                                    const matchedUnits = unitArr.filter((u) => {
                                      const s = (unitSearch || '').toLowerCase().trim();
                                      if (!s) return true;
                                      return (
                                        (u.code && u.code.toLowerCase().includes(s)) ||
                                        (u.name && u.name.toLowerCase().includes(s))
                                      );
                                    });

                                    if (unitSearch.trim() && matchedUnits.length === 0) return null;

                                    return (
                                      <div key={fld} className="space-y-1">
                                        {/* OILFIELD NODE */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedFields((prev) => ({
                                              ...prev,
                                              [fieldKey]: !isFldExpanded,
                                            }))
                                          }
                                          className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                            isLight
                                              ? 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
                                              : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            {isFldExpanded ? (
                                              <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                            )}
                                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                                            <span>حقل {fld}</span>
                                          </div>
                                          <span className="text-[10px] opacity-70">
                                            ({matchedUnits.length} منشأة)
                                          </span>
                                        </button>

                                        {/* UNITS UNDER OILFIELD */}
                                        {isFldExpanded && (
                                          <div className="pr-4 space-y-1 border-r border-slate-300 dark:border-slate-700 mr-2 my-1">
                                            {matchedUnits.map((u) => {
                                              const isSelected = newUnitCode === u.code;
                                              return (
                                                <div
                                                  key={u.code}
                                                  onClick={() => setNewUnitCode(u.code)}
                                                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer border transition ${
                                                    isSelected
                                                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-extrabold'
                                                      : isLight
                                                      ? 'bg-white border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/50'
                                                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-amber-500'}`} />
                                                    <div>
                                                      <span className="font-mono ml-1.5">{u.code}</span>
                                                      <span>- {u.name}</span>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    {isSelected && <Check className="w-4 h-4 font-black" />}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* VIEW 2: HORIZONTAL TREE VIEW */}
                  {unitPickerMode === 'tree_horizontal' && (
                    <div className={`p-3 rounded-2xl border space-y-3 ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-950/80 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>مسار العرض الأفقي</span>
                        <span className="text-amber-600 dark:text-amber-400">تصفح أفقياً</span>
                      </div>

                      {/* STEP 1: HORIZONTAL GOVERNORATES */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">
                          1. اختر المحافظة:
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                          {Object.keys(groupedUnits).map((gov) => {
                            const isActive = (activeGovHoriz || currentUnitGov) === gov;
                            const govUnitsCount = (Object.values(groupedUnits[gov]) as UnitAsset[][]).reduce((a, b) => a + b.length, 0);

                            return (
                              <button
                                key={gov}
                                type="button"
                                onClick={() => {
                                  setActiveGovHoriz(gov);
                                  const firstFld = Object.keys(groupedUnits[gov])[0];
                                  setActiveFieldHoriz(firstFld);
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition cursor-pointer ${
                                  isActive
                                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md font-extrabold'
                                    : isLight
                                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{gov}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/10 text-amber-500'}`}>
                                  {govUnitsCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* STEP 2: HORIZONTAL OILFIELDS UNDER ACTIVE GOVERNORATE */}
                      {effectiveGov && groupedUnits[effectiveGov] && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
                            <span>2. اختر الحقل النفطي:</span>
                            <ChevronLeft className="w-3 h-3 text-amber-500" />
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {Object.keys(groupedUnits[effectiveGov]).map((fld) => {
                              const isActive = effectiveField === fld;
                              const count = groupedUnits[effectiveGov][fld].length;

                              return (
                                <button
                                  key={fld}
                                  type="button"
                                  onClick={() => setActiveFieldHoriz(fld)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border transition cursor-pointer ${
                                    isActive
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold'
                                      : isLight
                                      ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                                  <span>{fld}</span>
                                  <span className="text-[10px] opacity-70">({count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* STEP 3: UNITS GRID / CARDS UNDER ACTIVE FIELD */}
                      {effectiveGov && effectiveField && groupedUnits[effectiveGov]?.[effectiveField] && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                            3. انقر لاختيار الوحدة:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                            {groupedUnits[effectiveGov][effectiveField]
                              .filter((u) => {
                                const s = (unitSearch || '').toLowerCase().trim();
                                if (!s) return true;
                                return (
                                  (u.code && u.code.toLowerCase().includes(s)) ||
                                  (u.name && u.name.toLowerCase().includes(s))
                                );
                              })
                              .map((u) => {
                                const isSelected = newUnitCode === u.code;
                                return (
                                  <div
                                    key={u.code}
                                    onClick={() => setNewUnitCode(u.code)}
                                    className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-amber-500 border-amber-500 text-slate-950 font-extrabold shadow-md'
                                        : isLight
                                        ? 'bg-slate-50 border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50/50'
                                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-mono text-xs font-bold">{u.code}</div>
                                      <div className="text-[11px] mt-0.5 truncate max-w-[140px]">{u.name}</div>
                                    </div>
                                    {isSelected ? (
                                      <span className="px-1.5 py-0.5 rounded-lg bg-slate-950 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                                        <Check className="w-3 h-3" /> تم
                                      </span>
                                    ) : (
                                      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                                        isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400'
                                      }`}>
                                        تحديد
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIEW 3: SIMPLE DROPDOWN */}
                  {unitPickerMode === 'dropdown' && (
                    <select
                      value={newUnitCode}
                      onChange={(e) => setNewUnitCode(e.target.value)}
                      className={`w-full rounded-xl p-3 font-bold outline-none cursor-pointer border ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500'
                          : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
                      }`}
                    >
                      {units.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.code} - {u.name} (محافظة {u.governorate} - حقل {u.field})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* LEFT COLUMN: SCHEDULE PARAMETERS */}
                <div className={`p-4 rounded-2xl border space-y-3.5 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <label className={`block font-extrabold text-xs border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-slate-100 border-slate-800'}`}>
                    2. مواعيد وإعدادات الكشف الدوري:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold mb-1 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                        تاريخ البدء بالكشف:
                      </label>
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                        التكرار الدوري المحدد:
                      </label>
                      <select
                        value={newFrequency}
                        onChange={(e) => handleFrequencyChange(e.target.value as InspectionFrequency)}
                        className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      >
                        <option value="monthly">1 شهر (شهري - 30 يوم)</option>
                        <option value="quarterly">3 أشهر (ربع سنوي - 90 يوم)</option>
                        <option value="semi_annual">6 أشهر (نصف سنوي - 180 يوم)</option>
                        <option value="annual">12 شهر (سنوي - 365 يوم)</option>
                        <option value="custom">تكرار مخصص (بالأيام)</option>
                      </select>
                    </div>

                    {newFrequency === 'custom' && (
                      <div className="sm:col-span-2">
                        <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          عدد أيام التكرار المخصص:
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={newCustomDays}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setNewCustomDays(val);
                            updateCalculatedNextDate(newStartDate, 'custom', val);
                          }}
                          className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Next Due Date */}
                  <div>
                    <label className={`block font-bold mb-1 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                      الموعد القادم المستحق (محسوب تلقائياً):
                    </label>
                    <input
                      type="date"
                      value={newNextDate}
                      readOnly
                      className={`w-full rounded-xl p-2.5 font-bold outline-none border cursor-not-allowed ${
                        isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-amber-400'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        فريق الكشف المكلف:
                      </label>
                      <input
                        type="text"
                        value={newAssignedTeam}
                        onChange={(e) => setNewAssignedTeam(e.target.value)}
                        placeholder="فريق الكشف (اختياري)..."
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        اسم المهندس / المفتش المسؤول:
                      </label>
                      <input
                        type="text"
                        value={newInspectorName}
                        onChange={(e) => setNewInspectorName(e.target.value)}
                        placeholder="مثال: م. علي حسين"
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      ملاحظات عامة:
                    </label>
                    <textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      rows={2}
                      placeholder="سجل أية ملاحظات عامة..."
                      className={`w-full rounded-xl p-2.5 outline-none border ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>
                </div>

              </div>

              <div className={`flex items-center justify-end gap-3 pt-3 border-t shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold transition cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 text-slate-950 rounded-xl font-black hover:bg-amber-600 shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  حفظ وتثبيت جدول الكشف الدوري
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETE INSPECTION & UPLOAD REPORT & GRADE A-B-C-D & MAINTENANCE TRIGGER */}
      {showCompleteModal && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-5 w-full max-w-6xl space-y-3.5 shadow-2xl relative border max-h-[96vh] flex flex-col justify-between ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-2.5 shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${isLight ? 'bg-emerald-100 border border-emerald-300 text-emerald-700' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base leading-tight ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    توثيق وإنجاز الكشف المعاين
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {showCompleteModal.unitCode} - {showCompleteModal.title}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(null)} className={`p-1 cursor-pointer rounded-lg transition ${isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-3 text-xs overflow-hidden">
              {/* ROW 1: HORIZONTAL TOP PARAMETERS GRID (3 COLUMNS) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                {/* Column 1: Date */}
                <div className="md:col-span-3">
                  <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    تاريخ المعاينة الفعلي:
                  </label>
                  <input
                    type="date"
                    value={completeDate}
                    onChange={(e) => setCompleteDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 font-bold outline-none border ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                    }`}
                    required
                  />
                </div>

                {/* Column 2: Condition Grade Selection (A-B-C-D) */}
                <div className="md:col-span-4">
                  <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    التقييم الهندسي (Condition Grade A-D):
                  </label>
                  <select
                    value={completeGrade}
                    onChange={(e) => setCompleteGrade(e.target.value as ConditionGrade)}
                    className={`w-full rounded-xl px-3 py-2 font-bold outline-none cursor-pointer border ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                    }`}
                  >
                    <option value="A">درجة A (حالة ممتازة - لا توجد عيوب أو أضرار)</option>
                    <option value="B">درجة B (حالة جيدة - ملاحظات فنية بسيطة)</option>
                    <option value="C">درجة C (حالة متوسطة - تحتاج صيانة وقائية)</option>
                    <option value="D">درجة D (حالة حرجة - تتطلب صيانة طارئة وفورية)</option>
                  </select>
                </div>

                {/* Column 3: Upload Report File Section */}
                <div className={`md:col-span-5 p-2 rounded-xl border flex flex-col justify-center ${isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`font-bold flex items-center gap-1.5 text-xs ${isLight ? 'text-emerald-900' : 'text-emerald-400'}`}>
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      <span>ملف تقرير الكشف الهندسي:</span>
                    </label>
                    <span className={`text-[10px] font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      (صور / PDF / Word / Excel)
                    </span>
                  </div>

                  {/* Hidden Input for restricted extensions */}
                  <input
                    type="file"
                    ref={reportFileInputRef}
                    onChange={handleReportFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,image/*"
                    className="hidden"
                  />

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Button: Upload from Computer */}
                    <button
                      type="button"
                      onClick={() => reportFileInputRef.current?.click()}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                        isLight
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
                      }`}
                      title="رفع ملف التقرير من جهاز الحاسوب"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع من الحاسوب</span>
                    </button>

                    {/* File Info and Action Buttons */}
                    {reportFileName ? (
                      <div className="flex items-center justify-between gap-1.5 flex-1 min-w-0 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-[11px] font-bold text-emerald-400 truncate max-w-[100px]" title={reportFileName}>
                            {reportFileName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={handlePreviewReportFile}
                            className={`px-2 py-1 rounded-md transition cursor-pointer text-[11px] font-bold flex items-center gap-1 ${
                              isLight ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                            }`}
                            title="معاينة الملف المرفق"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>معاينة</span>
                          </button>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={handleRemoveReportFile}
                            className={`px-2 py-1 rounded-md transition cursor-pointer text-[11px] font-bold flex items-center gap-1 ${
                              isLight ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30'
                            }`}
                            title="إزالة الملف المرفق"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>إزالة</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className={`text-[11px] italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        لم يتم اختيار أي ملف
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ROW 2: SIDE-BY-SIDE FINDINGS & RECOMMENDATIONS (2 EQUAL COLUMNS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Findings */}
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    الملاحظات والنتائج الميدانية (Findings):
                  </label>
                  <textarea
                    value={completeFindings}
                    onChange={(e) => setCompleteFindings(e.target.value)}
                    placeholder="سجل أية عيوب، ملاحظات إنشائية، أو أضرار ميكانيكية تم مشاهدتها..."
                    rows={2}
                    className={`w-full rounded-xl p-2.5 outline-none border resize-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                    }`}
                    required
                  />
                </div>

                {/* Recommendations */}
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    التوصيات والإجراءات المطلوب اتخاذها (Recommendations):
                  </label>
                  <textarea
                    value={completeRecommendations}
                    onChange={(e) => setCompleteRecommendations(e.target.value)}
                    placeholder="سجل توصيات السلامة والتوجيهات الفنية المطلوبة..."
                    rows={2}
                    className={`w-full rounded-xl p-2.5 outline-none border resize-none ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* ROW 3: HORIZONTAL MAINTENANCE & AUTO-SCHEDULE OPTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                {/* MAINTENANCE REQUEST BLOCK (SPAN 8) */}
                <div className={`md:col-span-8 p-3 rounded-2xl border space-y-2 ${isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-950/80 border-slate-800'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                        <Wrench className="w-4 h-4" /> تحرير طلب صيانة جديد لهذا الكشف
                      </span>
                      <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        يبقى الطلب في النظام لحين اتمام المعالجة وتغيير حالته من قبل موظف الإدخال
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={createMaintenance}
                      onChange={(e) => setCreateMaintenance(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer shrink-0"
                    />
                  </div>

                  {createMaintenance && (
                    <div className="pt-2 border-t border-amber-200/60 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <label className={`block font-bold mb-0.5 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          وصف العطل / المشكلة:
                        </label>
                        <input
                          type="text"
                          value={maintIssue}
                          onChange={(e) => setMaintIssue(e.target.value)}
                          placeholder="مثال: تصليح تسرب أسطح أو استبدال مضخات"
                          className={`w-full rounded-lg px-2.5 py-1.5 font-bold outline-none border ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                          required={createMaintenance}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className={`block font-bold mb-0.5 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          تاريخ طلب الصيانة:
                        </label>
                        <input
                          type="date"
                          value={maintDate}
                          onChange={(e) => setMaintDate(e.target.value)}
                          className={`w-full rounded-lg px-2.5 py-1.5 font-bold font-mono outline-none border ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                          required={createMaintenance}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={`block font-bold mb-0.5 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          أولية الطلب:
                        </label>
                        <select
                          value={maintPriority}
                          onChange={(e) => setMaintPriority(e.target.value as any)}
                          className={`w-full rounded-lg px-2 py-1.5 font-bold outline-none border ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                        >
                          <option value="critical">حرج (طارئ)</option>
                          <option value="normal">عادي</option>
                          <option value="low">منخفض (وقائي)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className={`block font-bold mb-0.5 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          الجهة المكلفة:
                        </label>
                        <input
                          type="text"
                          value={maintAssignedTo}
                          onChange={(e) => setMaintAssignedTo(e.target.value)}
                          className={`w-full rounded-lg px-2.5 py-1.5 font-bold outline-none border ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* AUTO SCHEDULE CHECKBOX BLOCK (SPAN 4) */}
                <div className={`md:col-span-4 p-3 border rounded-2xl flex items-center justify-between h-full ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'}`}>
                  <div>
                    <p className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      جدولة الكشف القادم تلقائياً
                    </p>
                    <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      بحسب التكرار الزمني ({getFrequencyLabel(showCompleteModal.frequency, showCompleteModal.customIntervalDays)})
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoScheduleNext}
                    onChange={(e) => setAutoScheduleNext(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                </div>
              </div>

              {/* ROW 4: ACTION BUTTONS (FOOTER) */}
              <div className={`flex items-center justify-end gap-3 pt-2.5 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(null)}
                  className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>حفظ وإنجاز الكشف وثبت النتائج</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT SCHEDULE */}
      {showEditModal && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-6 w-full max-w-5xl space-y-5 shadow-2xl relative my-6 border max-h-[92vh] flex flex-col ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            <div className={`flex items-center justify-between border-b pb-3 shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${isLight ? 'bg-amber-100 border border-amber-300 text-amber-700' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    تعديل معلومات وتفاصيل جدولة الكشف الدوري
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    رمز السجل: {showEditModal.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(null)} className={`p-1 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

                {/* RIGHT COLUMN: LOCKED UNIT INFORMATION */}
                <div className={`p-4 rounded-2xl border space-y-4 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <label className={`block font-extrabold text-xs border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-slate-100 border-slate-800'}`}>
                    1. بيانات الوحدة الهندسية (مغلقة):
                  </label>

                  {/* READ-ONLY LOCKED UNIT CARD */}
                  <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mb-0.5">
                            <Lock className="w-3 h-3" />
                            <span>الوحدة الهندسية المثبتة</span>
                          </div>
                          <div className="font-extrabold text-sm">
                            {showEditModal.unitCode} - {showEditModal.unitName}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] flex items-center gap-1 shrink-0 ${
                        isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-950 border-slate-700 text-slate-400'
                      }`}>
                        <Lock className="w-3 h-3 text-amber-500" />
                        ثابتة
                      </span>
                    </div>

                    <div className="border-t pt-2.5 border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">المحافظة:</span>
                        <span className="font-bold">{showEditModal.governorate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">الحقل النفطي:</span>
                        <span className="font-bold">{showEditModal.field}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                    isLight ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  }`}>
                    <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      تم تثبيت هذه الوحدة أثناء إنشاء الجدول الدوري، ولا يمكن تغيير الوحدة عند تعديل المواعيد لضمان دقة وتكامل أرشيف المعاينات الهندسية.
                    </span>
                  </div>
                </div>

                {/* LEFT COLUMN: EDITABLE SCHEDULE PARAMETERS */}
                <div className={`p-4 rounded-2xl border space-y-3.5 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                  <label className={`block font-extrabold text-xs border-b pb-2 ${isLight ? 'text-slate-900 border-slate-200' : 'text-slate-100 border-slate-800'}`}>
                    2. تعديل مواعيد وإعدادات الجدول الدوري:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold mb-1 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                        تاريخ بدء الكشف / آخر كشف:
                      </label>
                      <input
                        type="date"
                        value={editLastDate}
                        onChange={(e) => {
                          setEditLastDate(e.target.value);
                          updateEditCalculatedNextDate(e.target.value, editFrequency, editCustomDays);
                        }}
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                        التكرار الدوري المحدد:
                      </label>
                      <select
                        value={editFrequency}
                        onChange={(e) => {
                          const freq = e.target.value as InspectionFrequency;
                          setEditFrequency(freq);
                          updateEditCalculatedNextDate(editLastDate, freq, editCustomDays);
                        }}
                        className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      >
                        <option value="monthly">1 شهر (شهري - 30 يوم)</option>
                        <option value="quarterly">3 أشهر (ربع سنوي - 90 يوم)</option>
                        <option value="semi_annual">6 أشهر (نصف سنوي - 180 يوم)</option>
                        <option value="annual">12 شهر (سنوي - 365 يوم)</option>
                        <option value="custom">تكرار مخصص (بالأيام)</option>
                      </select>
                    </div>

                    {editFrequency === 'custom' && (
                      <div className="sm:col-span-2">
                        <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          عدد أيام التكرار المخصص:
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={editCustomDays}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 30;
                            setEditCustomDays(val);
                            updateEditCalculatedNextDate(editLastDate, 'custom', val);
                          }}
                          className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                            isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Next Due Date */}
                  <div>
                    <label className={`block font-bold mb-1 ${isLight ? 'text-amber-900' : 'text-amber-400'}`}>
                      الموعد القادم المستحق:
                    </label>
                    <input
                      type="date"
                      value={editNextDate}
                      onChange={(e) => setEditNextDate(e.target.value)}
                      className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                        isLight ? 'bg-amber-50 border-amber-300 text-amber-900 focus:border-amber-500' : 'bg-slate-950 border-amber-500/50 text-amber-400 focus:border-amber-500'
                      }`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        فريق الكشف المكلف:
                      </label>
                      <input
                        type="text"
                        value={editAssignedTeam}
                        onChange={(e) => setEditAssignedTeam(e.target.value)}
                        placeholder="اسم الفريق المكلف..."
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        اسم المهندس المسؤول:
                      </label>
                      <input
                        type="text"
                        value={editInspectorName}
                        onChange={(e) => setEditInspectorName(e.target.value)}
                        placeholder="مثال: م. أحمد عبد الحسين"
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 focus:border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-100 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      ملاحظات عامة:
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      placeholder="أدخل أية ملاحظات تفصيلية هنا..."
                      className={`w-full rounded-xl p-2.5 outline-none border ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
                      }`}
                    />
                  </div>
                </div>

              </div>

              <div className={`flex items-center justify-end gap-3 pt-3 border-t shrink-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold transition cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 text-slate-950 rounded-xl font-black hover:bg-amber-600 shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  حفظ وتحديث معلومات الجدول
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL UNIT ARCHIVE MODAL (ARCHIVE OF ALL INSPECTIONS & MAINTENANCE FOR A UNIT) */}
      {showUnitArchiveModal && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-6 w-full max-w-[96vw] xl:max-w-7xl space-y-5 shadow-2xl relative my-8 border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${isLight ? 'bg-amber-100 border border-amber-300 text-amber-800' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-500 text-sm">{toArabicDigits(showUnitArchiveModal.code)}</span>
                    <h3 className={`font-black text-lg ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{showUnitArchiveModal.name}</h3>
                  </div>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    محافظة {showUnitArchiveModal.governorate} | حقل {showUnitArchiveModal.field} | {showUnitArchiveModal.sectorAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getConditionGradeBadge(showUnitArchiveModal.conditionGrade)}
                <button onClick={() => setShowUnitArchiveModal(null)} className={`p-1 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs & Layout Toggle */}
            <div className="flex items-center gap-2 border-b border-slate-800/40 pb-2">
              <button
                onClick={() => setArchiveModalTab('both')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  archiveModalTab === 'both'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>العرض الأفقي المتجاور (الأرشيفين معاً)</span>
              </button>

              <button
                onClick={() => setArchiveModalTab('inspections')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  archiveModalTab === 'inspections'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>أرشيف المعاينات والكشوفات الدورية ({toArabicDigits(schedules.filter((s) => s.unitCode === showUnitArchiveModal.code).length)})</span>
              </button>

              <button
                onClick={() => setArchiveModalTab('maintenance')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  archiveModalTab === 'maintenance'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>أرشيف أعمال وطلبات الصيانة ({toArabicDigits(maintenanceRequests.filter((r) => r.unitCode === showUnitArchiveModal.code).length)})</span>
              </button>
            </div>

            {/* HORIZONTAL / GRID ARCHIVE CONTENT */}
            <div className={`grid grid-cols-1 ${archiveModalTab === 'both' ? 'xl:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {/* ARCHIVE 1: INSPECTIONS & PERIODIC CHECKS */}
              {(archiveModalTab === 'both' || archiveModalTab === 'inspections') && (
                <div className={`p-4 rounded-2xl border space-y-3 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'}`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/30">
                    <h4 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4" />
                      <span>أرشيف المعاينات والكشوفات الدورية</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400">
                      ({toArabicDigits(schedules.filter((s) => s.unitCode === showUnitArchiveModal.code).length)} كشف)
                    </span>
                  </div>

                  {schedules.filter((s) => s.unitCode === showUnitArchiveModal.code).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">لا توجد سجلات كشف دوري مسجلة لهذه الوحدة حتى الآن.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className={`font-bold border-b ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-400'}`}>
                          <tr>
                            <th className="p-2">عنوان الكشف</th>
                            <th className="p-2">التكرار</th>
                            <th className="p-2">آخر كشف</th>
                            <th className="p-2">الموعد المستحق</th>
                            <th className="p-2">الحالة والدرجة</th>
                            <th className="p-2 text-center">تحديث الكشف</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/40'}`}>
                          {schedules
                            .filter((s) => s.unitCode === showUnitArchiveModal.code)
                            .map((sch) => (
                              <tr key={sch.id} className={isLight ? 'hover:bg-slate-100/80' : 'hover:bg-slate-800/30'}>
                                <td className="p-2 font-bold">
                                  <div className={isLight ? 'text-slate-900' : 'text-slate-100'}>{sch.title}</div>
                                  {sch.reportFileName && (
                                    <a
                                      href={sch.reportFileUrl || '#'}
                                      download={sch.reportFileName}
                                      className={`${isLight ? 'text-emerald-700' : 'text-emerald-400'} text-[10px] flex items-center gap-1 hover:underline mt-0.5`}
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span className="truncate max-w-[110px]">{sch.reportFileName}</span>
                                    </a>
                                  )}
                                </td>
                                <td className={`p-2 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{getFrequencyLabel(sch.frequency, sch.customIntervalDays)}</td>
                                <td className={`p-2 font-mono text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{toArabicDigits(sch.lastInspectionDate)}</td>
                                <td className={`p-2 font-mono font-bold text-[11px] ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{toArabicDigits(sch.nextDueDate)}</td>
                                <td className="p-2">
                                  <div className="space-y-1">
                                    <div>{getStatusBadge(sch.status)}</div>
                                    {sch.conditionGradeGiven && <div>{getConditionGradeBadge(sch.conditionGradeGiven)}</div>}
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  {sch.status !== 'completed' ? (
                                    <button
                                      onClick={() => {
                                        const matchedUnit = units.find((u) => u.code === sch.unitCode);
                                        setShowCompleteModal(sch);
                                        setCompleteDate(sch.lastInspectionDate || new Date().toISOString().split('T')[0]);
                                        setMaintDate(sch.lastInspectionDate || new Date().toISOString().split('T')[0]);
                                        if (matchedUnit) {
                                          setCompleteGrade(sch.conditionGradeGiven || matchedUnit.conditionGrade);
                                        }
                                      }}
                                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1.5 mx-auto whitespace-nowrap ${
                                        isLight
                                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                                      }`}
                                      title="تحديث وإنجاز نتائج الكشف الدوري"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                      <span>تحديث الكشف</span>
                                    </button>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-block whitespace-nowrap ${
                                      isLight
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                      مكتمل وموثق
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ARCHIVE 2: MAINTENANCE WORK & REQUESTS */}
              {(archiveModalTab === 'both' || archiveModalTab === 'maintenance') && (
                <div className={`p-4 rounded-2xl border space-y-3 ${isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'}`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/30">
                    <h4 className="font-bold text-sm text-amber-500 flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      <span>أرشيف أعمال وطلبات الصيانة</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400">
                      ({toArabicDigits(maintenanceRequests.filter((r) => r.unitCode === showUnitArchiveModal.code).length)} بلاغ)
                    </span>
                  </div>

                  {maintenanceRequests.filter((r) => r.unitCode === showUnitArchiveModal.code).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">لا توجد بلاغات صيانة سابقة لهذه الوحدة.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className={`font-bold border-b ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-400'}`}>
                          <tr>
                            <th className="p-2">رقم البلاغ</th>
                            <th className="p-2">المشكلة / العطل</th>
                            <th className="p-2">الفريق</th>
                            <th className="p-2">حالة الطلب</th>
                            <th className="p-2">تاريخ الطلب</th>
                            <th className="p-2">تاريخ الإنجاز / الإلغاء</th>
                            <th className="p-2">المدة (بالأيام)</th>
                            <th className="p-2">ملاحظات الحل</th>
                            <th className="p-2 text-center">إجراء الموظف</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/40'}`}>
                          {maintenanceRequests
                            .filter((r) => r.unitCode === showUnitArchiveModal.code)
                            .map((req) => (
                              <tr key={req.id} className={isLight ? 'hover:bg-slate-100/80' : 'hover:bg-slate-800/30'}>
                                <td className={`p-2 font-mono font-bold text-[11px] ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{toArabicDigits(req.id)}</td>
                                <td className="p-2 font-bold">
                                  <div className={isLight ? 'text-slate-900' : 'text-slate-100'}>{req.issue}</div>
                                  <div className="mt-0.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                                      req.priority === 'critical'
                                        ? isLight ? 'bg-red-100 text-red-800' : 'bg-red-500/20 text-red-400'
                                        : isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                      {req.priority === 'critical' ? 'حرج' : 'عادي'}
                                    </span>
                                  </div>
                                </td>
                                <td className={`p-2 text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{req.assignedTo}</td>
                                <td className="p-2">
                                  {req.status === 'completed' ? (
                                    <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${
                                      isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    }`}>
                                      منجز
                                    </span>
                                  ) : req.status === 'cancelled' ? (
                                    <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${
                                      isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                    }`}>
                                      ملغى
                                    </span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${
                                      isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    }`}>
                                      قيد المعالجة
                                    </span>
                                  )}
                                </td>
                                 <td className={`p-2 font-mono text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{formatDateOnly(req.createdAt)}</td>
                                <td className={`p-2 font-mono text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{getCompletionOrCancellationDate(req.completedAt, req.status)}</td>
                                <td className={`p-2 font-bold text-[11px] ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{calculateMaintenanceDurationDays(req.createdAt, req.completedAt, req.status)}</td>
                                <td className="p-2">
                                  {req.resolutionNotes ? (
                                    <span className={`text-[10px] truncate max-w-[120px] block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{req.resolutionNotes}</span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">لا توجد ملاحظات</span>
                                  )}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => {
                                      setEditMaintenanceReq(req);
                                      setMaintNewStatus(req.status === 'cancelled' ? 'cancelled' : 'completed');
                                      setMaintResolutionNotes(req.resolutionNotes || '');
                                      setMaintCompletedDate(req.completedAt?.split(' ')[0] || new Date().toISOString().split('T')[0]);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition whitespace-nowrap border ${
                                      isLight
                                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30'
                                    }`}
                                  >
                                    تحديث الحالة
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                onClick={() => window.print()}
                className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>طباعة أرشيف الوحدة الشامل</span>
              </button>

              <div className="flex items-center gap-2">
                {onNavigateTab && (
                  <button
                    onClick={() => {
                      setShowUnitArchiveModal(null);
                      onNavigateTab('reports');
                    }}
                    className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-black hover:bg-amber-400 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>الاطلاع عبر التقارير</span>
                  </button>
                )}

                <button
                  onClick={() => setShowUnitArchiveModal(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isLight ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DATA ENTRY MAINTENANCE EDIT MODAL */}
      {editMaintenanceReq && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                معالجة وتغيير حالة طلب الصيانة ({toArabicDigits(editMaintenanceReq.id)})
              </h3>
              <button onClick={() => setEditMaintenanceReq(null)} className={`p-1 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenanceResolution} className="space-y-3 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 font-bold">
                الوحدة: {toArabicDigits(editMaintenanceReq.unitCode)} | المشكلة: {editMaintenanceReq.issue}
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  تعديل حالة طلب الصيانة:
                </label>
                <select
                  value={maintNewStatus}
                  onChange={(e) => setMaintNewStatus(e.target.value as MaintenanceStatus)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                >
                  <option value="completed">تمت المعالجة و الانجاز</option>
                  <option value="cancelled">تم الغاء طلب الصيانة</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  تاريخ الإنجاز أو الإلغاء:
                </label>
                <input
                  type="date"
                  value={maintCompletedDate}
                  onChange={(e) => setMaintCompletedDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  ملاحظات وتفاصيل المعالجة والإصلاح:
                </label>
                <textarea
                  value={maintResolutionNotes}
                  onChange={(e) => setMaintResolutionNotes(e.target.value)}
                  placeholder="سجل التفاصيل الفنية لأعمال الإصلاح والصيانة المنفذة..."
                  rows={3}
                  className={`w-full rounded-xl p-2.5 outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setEditMaintenanceReq(null)}
                  className={`px-3 py-2 rounded-xl font-bold transition cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-black rounded-xl hover:bg-amber-400 transition cursor-pointer"
                >
                  حفظ وتحديث حالة الصيانة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE CONFIRMATION MODAL */}
      {deleteConfirmSchedule && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl relative my-8 border ${
            isLight ? 'bg-white border-red-200 text-slate-900' : 'bg-slate-900 border-red-500/30 text-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center shrink-0 font-bold">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-black text-base ${isLight ? 'text-red-900' : 'text-red-400'}`}>
                  تأكيد حذف جدول الكشف الدوري
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  تنبيه: إجراء الحذف نهائي
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">الوحدة الهندسية:</span>
                <span className="font-extrabold">{deleteConfirmSchedule.unitCode} - {deleteConfirmSchedule.unitName}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/30 pt-1.5">
                <span className="text-slate-400 font-bold">عنوان الكشف:</span>
                <span className="font-bold">{deleteConfirmSchedule.title}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/30 pt-1.5">
                <span className="text-slate-400 font-bold">الموقع:</span>
                <span className="font-bold">محافظة {deleteConfirmSchedule.governorate} | حقل {deleteConfirmSchedule.field}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800/30 pt-1.5">
                <span className="text-slate-400 font-bold">الموعد القادم:</span>
                <span className="font-mono font-bold text-amber-500">{toArabicDigits(deleteConfirmSchedule.nextDueDate)}</span>
              </div>
            </div>

            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              هل أنت متأكد من رغبتك في حذف هذا الجدول من قائمة المعاينات الدوريّة؟ لن تتمكن من التراجع عن هذا الإجراء.
            </p>

            <div className={`flex items-center justify-end gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => setDeleteConfirmSchedule(null)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 shadow-md shadow-red-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Viewer Modal */}
      {previewAttachment && (
        <AttachmentViewerModal
          attachment={previewAttachment}
          theme={theme}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
};
