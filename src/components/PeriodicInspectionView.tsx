import { getServerIsoDateOnly } from '../services/serverTime';
import { calculateNextDueDate } from '../utils/inspectionSchedule';
import React, { useState, useMemo, useEffect } from 'react';
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
import { compressImageFile } from '../utils/imageCompressor';
import { INITIAL_GOVERNORATES, INITIAL_OILFIELDS, INITIAL_USERS } from '../data/mockData';
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
  MaintenanceDepartmentRef,
  MaintenanceStatus,
  UnitAttachment,
  SystemUser,
} from '../types';
import {
  toArabicDigits,
  formatDateOnly,
  getCompletionOrCancellationDate,
  calculateMaintenanceDurationDays,
} from '../utils/arabicUtils';

// Helper to determine role label and accredited user display
export const getPerformerDisplay = (
  performedBy?: string,
  inspector?: string,
  users?: SystemUser[],
  isCompleted: boolean = true
): {
  roleBadgeText: string;
  roleBadgeClass: string;
  roleBadgeBorder: string;
  userName: string;
  fullText: string;
  isOperator: boolean;
  isInspector: boolean;
  isAdmin: boolean;
} => {
  const raw = (performedBy || inspector || '').trim();
  if (!raw) {
    return {
      roleBadgeText: 'موظف الكشف',
      roleBadgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      roleBadgeBorder: 'border-emerald-500/30',
      userName: isCompleted ? 'موظف الكشف' : 'لم يُنجز بعد',
      fullText: isCompleted ? 'موظف الكشف' : 'لم يُنجز بعد',
      isOperator: false,
      isInspector: true,
      isAdmin: false,
    };
  }

  // Check matching user in system users list
  const userList = users && users.length > 0 ? users : INITIAL_USERS;
  const matchedUser = userList.find((u) => {
    if (u.name === raw || u.username === raw || u.id === raw) return true;
    const cleanUName = u.name.replace(/\s*\([^)]*\)/g, '').trim();
    const cleanRaw = raw.replace(/\s*\([^)]*\)/g, '').trim();
    return (
      cleanUName === cleanRaw ||
      (cleanRaw.length > 2 && cleanUName.includes(cleanRaw)) ||
      (cleanRaw.length > 2 && cleanRaw.includes(cleanUName))
    );
  });

  if (matchedUser) {
    const cleanName = matchedUser.name.replace(/\s*\([^)]*\)/g, '').trim();
    if (
      matchedUser.role === 'مشغل النظام' ||
      matchedUser.role.includes('مشغل') ||
      matchedUser.username === 'operator'
    ) {
      return {
        roleBadgeText: 'مشغل النظام',
        roleBadgeClass: 'bg-brand-100 text-brand-700 border-brand-200',
        roleBadgeBorder: 'border-brand-200',
        userName: cleanName || 'مشغل النظام',
        fullText: isCompleted ? (cleanName ? `مشغل النظام: ${cleanName}` : 'مشغل النظام') : (performedBy ? `مشغل النظام: ${cleanName}` : 'لم يُنجز بعد'),
        isOperator: true,
        isInspector: false,
        isAdmin: false,
      };
    }
    if (
      matchedUser.role === 'موظف الكشف والصيانة' ||
      matchedUser.role.includes('كشف') ||
      matchedUser.role.includes('مفتش') ||
      matchedUser.username === 'inspector'
    ) {
      return {
        roleBadgeText: 'موظف الكشف',
        roleBadgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
        roleBadgeBorder: 'border-emerald-500/30',
        userName: cleanName || 'موظف الكشف',
        fullText: isCompleted ? (cleanName ? `موظف الكشف: ${cleanName}` : 'موظف الكشف') : (performedBy ? `موظف الكشف: ${cleanName}` : 'لم يُنجز بعد'),
        isOperator: false,
        isInspector: true,
        isAdmin: false,
      };
    }
    if (
      matchedUser.role === 'مدير النظام' ||
      matchedUser.role.includes('مدير') ||
      matchedUser.username === 'admin'
    ) {
      return {
        roleBadgeText: 'مدير النظام',
        roleBadgeClass: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
        roleBadgeBorder: 'border-purple-500/30',
        userName: cleanName || 'مدير النظام',
        fullText: isCompleted ? (cleanName ? `مدير النظام: ${cleanName}` : 'مدير النظام') : (performedBy ? `مدير النظام: ${cleanName}` : 'لم يُنجز بعد'),
        isOperator: false,
        isInspector: false,
        isAdmin: true,
      };
    }
    return {
      roleBadgeText: matchedUser.role || 'مستخدم',
      roleBadgeClass: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
      roleBadgeBorder: 'border-sky-500/30',
      userName: cleanName || matchedUser.role || 'مستخدم',
      fullText: isCompleted ? `${matchedUser.role || 'مستخدم'}: ${cleanName}` : (performedBy ? `${matchedUser.role || 'مستخدم'}: ${cleanName}` : 'لم يُنجز بعد'),
      isOperator: false,
      isInspector: false,
      isAdmin: false,
    };
  }

  // String matching heuristics fallback
  if (
    raw.includes('مشغل') ||
    raw.includes('operator') ||
    raw.includes('سيف الدين') ||
    raw.includes('علي حسن')
  ) {
    let cleanName = raw.replace(/\s*\([^)]*مشغل[^)]*\)/g, '').trim();
    cleanName = cleanName.replace(/^(?:مشغل النظام|مشغل)\s*[:\-\/]?\s*/g, '').trim();
    return {
      roleBadgeText: 'مشغل النظام',
      roleBadgeClass: 'bg-brand-100 text-brand-700 border-brand-200',
      roleBadgeBorder: 'border-brand-200',
      userName: cleanName || 'مشغل النظام',
      fullText: (cleanName && cleanName !== 'مشغل النظام' && cleanName !== 'مشغل') ? `مشغل النظام: ${cleanName}` : 'مشغل النظام',
      isOperator: true,
      isInspector: false,
      isAdmin: false,
    };
  }

  if (
    raw.includes('مدير') ||
    raw.includes('admin') ||
    raw.includes('أحمد كريم')
  ) {
    let cleanName = raw.replace(/\s*\([^)]*مدير[^)]*\)/g, '').trim();
    cleanName = cleanName.replace(/^(?:مدير النظام|مدير)\s*[:\-\/]?\s*/g, '').trim();
    return {
      roleBadgeText: 'مدير النظام',
      roleBadgeClass: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
      roleBadgeBorder: 'border-purple-500/30',
      userName: cleanName || 'مدير النظام',
      fullText: (cleanName && cleanName !== 'مدير النظام' && cleanName !== 'مدير') ? `مدير النظام: ${cleanName}` : 'مدير النظام',
      isOperator: false,
      isInspector: false,
      isAdmin: true,
    };
  }

  if (
    raw.includes('كشف') ||
    raw.includes('مفتش') ||
    raw.includes('حيدر') ||
    raw.includes('صباح') ||
    raw.includes('فحص') ||
    raw.includes('مهندس الموقع')
  ) {
    let cleanName = raw.replace(/\s*\([^)]*(?:شعبة|قسم|فريق|هندسي|تفتيش|كشف|صيانة|مفتش|فحص|مهندس الموقع)[^)]*\)/g, '').trim();
    cleanName = cleanName.replace(/^(?:موظف الكشف|موظف كشف|مهندس الموقع|مفتش)\s*[:\-\/]?\s*/g, '').trim();
    return {
      roleBadgeText: 'موظف الكشف',
      roleBadgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      roleBadgeBorder: 'border-emerald-500/30',
      userName: cleanName || 'موظف الكشف',
      fullText: (cleanName && cleanName !== 'موظف الكشف') ? `موظف الكشف: ${cleanName}` : 'موظف الكشف',
      isOperator: false,
      isInspector: true,
      isAdmin: false,
    };
  }

  const cleanName = raw.replace(/\s*\([^)]*\)/g, '').trim() || raw;
  return {
    roleBadgeText: 'موظف الكشف',
    roleBadgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    roleBadgeBorder: 'border-emerald-500/30',
    userName: cleanName,
    fullText: `موظف الكشف: ${cleanName}`,
    isOperator: false,
    isInspector: true,
    isAdmin: false,
  };
};

interface PeriodicInspectionViewProps {
  schedules: PeriodicInspectionSchedule[];
  units: UnitAsset[];
  governorates?: GovernorateRef[];
  oilfields?: OilfieldRef[];
  maintenanceRequests?: MaintenanceRequest[];
  maintenanceDepartments?: MaintenanceDepartmentRef[];
  users?: SystemUser[];
  currentUser?: SystemUser | null;
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
      performedByName?: string;
      reportFileName?: string;
      reportFileUrl?: string;
      createMaintenance?: boolean;
      maintenanceIssue?: string;
      maintenancePriority?: 'critical' | 'normal' | 'low';
      maintenanceDepartment?: string;
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
  maintenanceDepartments = [],
  users = [],
  currentUser = null,
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

  // Active Maintenance Departments list (dynamically sourced from Settings / maintenance registry)
  const activeMaintenanceDepts = useMemo(() => {
    if (maintenanceDepartments && maintenanceDepartments.length > 0) {
      const active = maintenanceDepartments.filter((d) => d.status === 'active');
      return active.length > 0 ? active : maintenanceDepartments;
    }
    return [];
  }, [maintenanceDepartments]);

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
  const [newStartDate, setNewStartDate] = useState(getServerIsoDateOnly());
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
  const [completeDate, setCompleteDate] = useState(getServerIsoDateOnly());
  const [completeGrade, setCompleteGrade] = useState<ConditionGrade>('A');
  const [completeFindings, setCompleteFindings] = useState('');
  const [completeRecommendations, setCompleteRecommendations] = useState('');
  const [completePerformedByName, setCompletePerformedByName] = useState('');
  const [autoScheduleNext, setAutoScheduleNext] = useState(true);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportFileName, setReportFileName] = useState<string>('');
  const [reportFileDataUrl, setReportFileDataUrl] = useState<string>('');
  const [reportCompressStatus, setReportCompressStatus] = useState<string>('');
  const [previewAttachment, setPreviewAttachment] = useState<UnitAttachment | null>(null);
  const reportFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Trigger Maintenance Request from Complete Modal
  const [createMaintenance, setCreateMaintenance] = useState(false);
  const [maintIssue, setMaintIssue] = useState('');
  const [maintPriority, setMaintPriority] = useState<'critical' | 'normal' | 'low'>('normal');
  const [maintDept, setMaintDept] = useState('');
  const [maintDate, setMaintDate] = useState('');

  // Keep maintDept synced with available active maintenance departments if empty
  useEffect(() => {
    if (!maintDept && activeMaintenanceDepts.length > 0) {
      setMaintDept(activeMaintenanceDepts[0].nameAr);
    }
  }, [activeMaintenanceDepts, maintDept]);

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
  const [editPerformedByName, setEditPerformedByName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete Schedule Confirm state
  const [deleteConfirmSchedule, setDeleteConfirmSchedule] = useState<PeriodicInspectionSchedule | null>(null);

  const ALLOWED_REPORT_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];

  const handleReportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_REPORT_EXTENSIONS.includes(ext)) {
        alert('عذراً، نوع الملف المحدد غير مسموح به!\nيسمح فقط بتحميل الملفات من الأنواع التالية:\n• الصور (PNG, JPG, JPEG, WEBP, GIF)\n• مستندات PDF (.pdf)\n• ملفات وورد Word (.doc, .docx)\n• ملفات إكسل Excel (.xls, .xlsx)');
        if (reportFileInputRef.current) reportFileInputRef.current.value = '';
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        alert('حجم الملف كبير جداً (الحد الأقصى 15 ميجابايت)، الرجاء اختيار ملف أصغر.');
        if (reportFileInputRef.current) reportFileInputRef.current.value = '';
        return;
      }

      setReportFile(file);
      setReportFileName(file.name);

      // If image, automatically compress and generate permanent dataUrl
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await compressImageFile(file, 1024, 1024, 0.72);
          setReportFileDataUrl(compressed.dataUrl);
          if (compressed.savedPercent && compressed.savedPercent > 0) {
            setReportCompressStatus(`تم ضغط الصورة بنسبة ${compressed.savedPercent}% (${compressed.formattedCompressedSize})`);
          } else {
            setReportCompressStatus('تمت معالجة الصورة بنجاح');
          }
        } catch (err) {
          console.warn('Image compression note:', err);
          const reader = new FileReader();
          reader.onload = () => setReportFileDataUrl(reader.result as string);
          reader.readAsDataURL(file);
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => setReportFileDataUrl(reader.result as string);
        reader.readAsDataURL(file);
        setReportCompressStatus('');
      }
    }
  };

  const handleRemoveReportFile = () => {
    setReportFile(null);
    setReportFileName('');
    setReportFileDataUrl('');
    setReportCompressStatus('');
    if (reportFileInputRef.current) {
      reportFileInputRef.current.value = '';
    }
  };

  const handlePreviewReportFile = () => {
    if (!reportFileName) return;
    const ext = reportFileName.split('.').pop()?.toLowerCase() || 'pdf';
    const url = reportFileDataUrl || (reportFile ? URL.createObjectURL(reportFile) : (showCompleteModal?.reportFileUrl || '#'));
    setPreviewAttachment({
      id: 'report-preview-' + Date.now(),
      name: reportFileName,
      type: ext,
      url: url,
      uploadedAt: getServerIsoDateOnly(),
      size: reportFile ? `${(reportFile.size / 1024).toFixed(1)} KB` : '1.2 MB',
    });
  };

  // Helper calculation for Next Due Date when start date or frequency changes
  const updateCalculatedNextDate = (startDateStr: string, freq: InspectionFrequency, customDays: number) => {
    setNewNextDate(calculateNextDueDate(startDateStr, freq, customDays));
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
    const defaultPerformer = currentUser?.name || currentUser?.role || 'مشغل النظام';
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
      inspectorName: newInspectorName.trim() || defaultPerformer,
      status: 'scheduled',
      notes: newNotes,
      createdAt: getServerIsoDateOnly(),
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

    const fallbackPerformer = currentUser?.name || currentUser?.role || showCompleteModal.inspectorName || 'مشغل النظام';
    const finalPerformedBy = completePerformedByName.trim() || fallbackPerformer;

    onCompleteInspection(showCompleteModal.id, {
      completionDate: completeDate,
      grade: completeGrade,
      findings: completeFindings,
      recommendations: completeRecommendations,
      autoScheduleNext,
      performedByName: finalPerformedBy,
      reportFileName: reportFileName || (reportFile ? reportFile.name : undefined),
      reportFileUrl: reportFileDataUrl || (reportFile ? URL.createObjectURL(reportFile) : undefined),
      createMaintenance,
      maintenanceIssue: maintIssue,
      maintenancePriority: maintPriority,
      maintenanceDepartment: maintDept,
      maintenanceDate: maintDate || completeDate || getServerIsoDateOnly(),
    });

    setShowCompleteModal(null);
    setCompleteFindings('');
    setCompleteRecommendations('');
    setCompletePerformedByName('');
    setReportFile(null);
    setReportFileName('');
    setReportFileDataUrl('');
    setReportCompressStatus('');
    setCreateMaintenance(false);
    setMaintIssue('');
  };

  // Helper calculation for Next Due Date in Edit mode
  const updateEditCalculatedNextDate = (lastDateStr: string, freq: InspectionFrequency, customDays: number) => {
    setEditNextDate(calculateNextDueDate(lastDateStr, freq, customDays));
  };

  // Submit Edit Schedule
  const handleOpenEdit = (sch: PeriodicInspectionSchedule) => {
    setShowEditModal(sch);
    setEditTitle(sch.title || 'كشف دوري');
    setEditInspectionType(sch.inspectionType || 'comprehensive');
    setEditStatus(sch.status || 'scheduled');
    setEditFrequency(sch.frequency || 'quarterly');
    setEditCustomDays(sch.customIntervalDays || 90);
    setEditLastDate(sch.lastInspectionDate || getServerIsoDateOnly());
    setEditNextDate(sch.nextDueDate || '');
    setEditAssignedTeam(sch.assignedTeam || '');
    setEditInspectorName(sch.inspectorName || '');
    setEditPerformedByName(sch.performedByName || '');
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
      performedByName: editPerformedByName.trim() || undefined,
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
      completedAt: maintCompletedDate || getServerIsoDateOnly(),
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
    if (!grade) return <span className="text-slate-500 font-mono text-xs">غير محدد</span>;
    switch (grade) {
      case 'A':
        return <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 font-bold font-mono text-xs">درجة A (ممتاز)</span>;
      case 'B':
        return <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-600 border border-blue-500/30 font-bold font-mono text-xs">درجة B (جيد)</span>;
      case 'C':
        return <span className="px-2.5 py-0.5 rounded-lg bg-brand-100 text-brand-700 border border-brand-200 font-bold font-mono text-xs">درجة C (متوسط)</span>;
      case 'D':
        return <span className="px-2.5 py-0.5 rounded-lg bg-red-500/20 text-red-600 border border-red-500/30 font-bold font-mono text-xs">درجة D (حرج)</span>;
    }
  };

  const getStatusBadge = (status: InspectionStatus) => {
    switch (status) {
      case 'overdue':
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 bg-red-100 text-red-800 border border-red-200`}>
            <AlertTriangle className="w-3.5 h-3.5" /> غير مكتمل (مستحق فوراً)
          </span>
        );
      case 'scheduled':
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 bg-brand-100 text-brand-800 border border-brand-200`}>
            <Clock className="w-3.5 h-3.5" /> غير مكتمل (مجدول)
          </span>
        );
      case 'in_progress':
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200`}>
            <RotateCcw className="w-3.5 h-3.5 animate-spin" /> قيد الكشف والمعاينة
          </span>
        );
      case 'completed':
        return (
          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> مكتمل وموثق
          </span>
        );
      default:
        return <span className={`px-2.5 py-1 rounded-lg font-bold text-xs bg-slate-100 text-slate-700`}>{status}</span>;
    }
  };

  // Group units by Governorate -> Field for Hierarchy view
  const governorateNames = Array.from(new Set(units.map((u) => u.governorate)));

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md relative overflow-hidden transition-colors bg-card border border-slate-200`}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-50 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-inner bg-brand-100 border border-brand-200 text-brand-700`}>
              <CalendarCheck className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-lg sm:text-xl font-black text-slate-900`}>
                  سجل الكشوفات الدورية
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border bg-brand-100 text-brand-800 border-brand-200`}>
                  شركة نفط الوسط
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs mt-1 leading-relaxed text-slate-600`}>
                متابعة وحدات الحقول والمحافظات، تحديد تواريخ وتكرار الكشف الدوري، إنجاز المعاينات وترفيع التقارير، وتوثيق طلبات الصيانة في أرشيف الأصل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-on-brand font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>جدولة كشف جديد</span>
            </button>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-2 mt-4 sm:mt-5 border-t border-slate-200 pt-3 sm:pt-4 overflow-x-auto scrollbar-none flex-nowrap sm:flex-wrap">
          <button
            onClick={() => setActiveSubTab('schedules')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 min-h-[38px] ${
              activeSubTab === 'schedules'
                ? 'bg-brand-700 text-on-brand shadow-md font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>جدول مواعيد الكشوفات الدورية ({toArabicDigits(filteredSchedules.length)})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('hierarchy')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 min-h-[38px] ${
              activeSubTab === 'hierarchy'
                ? 'bg-brand-700 text-on-brand shadow-md font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>عرض الوحدات حسب المحافظات والحقول ({toArabicDigits(units.length)} منشأة)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-sm transition-colors bg-card border border-slate-200`}>
          <div className="min-w-0">
            <p className={`text-[11px] sm:text-xs font-bold truncate text-slate-600`}>إجمالي الكشوفات المجدولة</p>
            <h3 className={`text-xl sm:text-2xl font-black mt-0.5 sm:mt-1 text-slate-900`}>{toArabicDigits(totalCount)}</h3>
            <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate text-slate-500`}>جدول متابعة معتمد للنظام</p>
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border mr-2 bg-slate-100 border-slate-200 text-slate-700`}>
            <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-sm transition-colors bg-red-50/70 border border-red-200`}>
          <div className="min-w-0">
            <p className={`text-[11px] sm:text-xs font-bold truncate text-red-800`}>غير مكتملة (مستحقة فوراً)</p>
            <h3 className={`text-xl sm:text-2xl font-black mt-0.5 sm:mt-1 text-red-700`}>{toArabicDigits(overdueCount)}</h3>
            <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate text-red-600/80`}>تتطلب معالجة وإنجاز كشف عاجل</p>
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border mr-2 bg-red-100 border-red-200 text-red-600`}>
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-sm transition-colors bg-brand-50 border border-brand-200`}>
          <div className="min-w-0">
            <p className={`text-[11px] sm:text-xs font-bold truncate text-brand-800`}>غير مكتملة (مجدولة قادمة)</p>
            <h3 className={`text-xl sm:text-2xl font-black mt-0.5 sm:mt-1 text-brand-700`}>{toArabicDigits(scheduledCount)}</h3>
            <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate text-brand-700`}>بانتظار تاريخ الاستحقاق</p>
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border mr-2 bg-brand-100 border-brand-200 text-brand-700`}>
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between shadow-sm transition-colors bg-emerald-50/70 border border-emerald-200`}>
          <div className="min-w-0">
            <p className={`text-[11px] sm:text-xs font-bold truncate text-emerald-800`}>كشوفات مكتملة وموثقة</p>
            <h3 className={`text-xl sm:text-2xl font-black mt-0.5 sm:mt-1 text-emerald-700`}>{toArabicDigits(completedCount)}</h3>
            <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate text-emerald-700/80`}>تم ترفيع تقاريرها وتحديث الدرجة</p>
          </div>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border mr-2 bg-emerald-100 border-emerald-200 text-emerald-700`}>
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`rounded-2xl p-3.5 sm:p-4 space-y-3 transition-colors bg-card border border-slate-200 shadow-sm`}>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3 text-xs">
          {/* Search Input */}
          <div className="relative col-span-2 sm:col-span-2 lg:col-span-2">
            <Search className={`w-4 h-4 absolute right-3 top-3 text-slate-400`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المبنى، الرمز، الفريق، المفتش..."
              className={`w-full rounded-xl pr-9 pl-3 py-2.5 outline-none font-medium transition min-h-[42px] bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-brand-600`}
            />
          </div>

          {/* Governorate Filter */}
          <div>
            <select
              value={selectedGovernorate}
              onChange={(e) => handleGovernorateChange(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer transition min-h-[42px] bg-slate-50 border border-slate-200 text-slate-800 focus:border-brand-600`}
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
              className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer transition min-h-[42px] bg-slate-50 border border-slate-200 text-slate-800 focus:border-brand-600`}
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
              className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer transition min-h-[42px] bg-slate-50 border border-slate-200 text-slate-800 focus:border-brand-600`}
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
              className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer transition min-h-[42px] bg-slate-50 border border-slate-200 text-slate-800 focus:border-brand-600`}
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

        {/* Active Filters Clear Indicator */}
        {(searchTerm || selectedGovernorate !== 'all' || selectedOilfield !== 'all' || selectedStatus !== 'all' || selectedFrequency !== 'all') && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
            <span className="text-[11px] text-brand-700 font-bold">
              يتم تطبيق معايير التصفية والبحث
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedGovernorate('all');
                setSelectedOilfield('all');
                setSelectedStatus('all');
                setSelectedFrequency('all');
              }}
              className={`text-[11px] font-bold underline transition cursor-pointer text-slate-600 hover:text-slate-900`}
            >
              إلغاء وإعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Main Content Areas */}
      {activeSubTab === 'schedules' ? (
        /* 1. SCHEDULES TABLE */
        <div className={`rounded-2xl overflow-hidden shadow-md border transition-colors bg-card border-slate-200`}>
          <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border-slate-200`}>
            <div className="flex items-center gap-2">
              <CalendarCheck className={`w-5 h-5 text-brand-700`} />
              <h3 className={`font-bold text-sm text-slate-900`}>
                جدول الكشوفات والمعاينات الدوريّة ({toArabicDigits(filteredSchedules.length)} سجل)
              </h3>
            </div>
            <span className={`text-xs text-slate-500`}>
              سجل مواعيد الكشوفات الدورية للوحدات الميدانية
            </span>
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-4">
              <Info className={`w-12 h-12 mx-auto text-slate-400`} />
              {schedules.length === 0 ? (
                <>
                  <p className={`text-sm font-bold text-slate-800`}>
                    لا توجد مواعيد كشوفات مسجلة حالياً. يمكنك إدراج وجدولة كشف جديد للوحدات المتاحة.
                  </p>
                  <div className="flex items-center justify-center pt-2">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-5 py-2.5 bg-brand-700 text-on-brand font-black rounded-xl text-xs flex items-center gap-2 hover:bg-brand-800 transition cursor-pointer shadow-md"
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-100 text-brand-700 hover:bg-slate-200`}
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              {/* Mobile Stacked Schedules Cards (md:hidden) */}
              <div className="md:hidden p-3 space-y-3">
                {filteredSchedules.map((sch) => {
                  const matchedUnit = units.find((u) => u.code === sch.unitCode);
                  const occupyingEntity = matchedUnit
                    ? (matchedUnit.departments && matchedUnit.departments.length > 0
                        ? Array.from(new Set(matchedUnit.departments.filter(Boolean))).join(' ، ')
                        : matchedUnit.department ||
                          (matchedUnit.rooms && matchedUnit.rooms.length > 0
                            ? Array.from(new Set(matchedUnit.rooms.map((r) => r.occupiedBy).filter(Boolean))).join(' ، ')
                            : '')) || 'عام / غير محدد'
                    : 'عام / غير محدد';

                  const p = (sch.performedByName || (sch.status === 'completed' && sch.inspectorName))
                    ? getPerformerDisplay(sch.performedByName, sch.inspectorName, users, sch.status === 'completed')
                    : null;

                  return (
                    <div
                      key={sch.id}
                      className={`p-3.5 rounded-2xl border space-y-2.5 transition bg-slate-50 border-slate-200 shadow-xs`}
                    >
                      {/* Top: Code, Grade & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-lg border bg-brand-100 text-brand-800 border-brand-200`}>
                            {toArabicDigits(sch.unitCode)}
                          </span>
                          {matchedUnit && getConditionGradeBadge(sch.conditionGradeGiven || matchedUnit.conditionGrade)}
                        </div>
                        <div>{getStatusBadge(sch.status)}</div>
                      </div>

                      {/* Title & Facility */}
                      <div>
                        <h4 className={`font-extrabold text-sm text-slate-900`}>
                          {sch.title}
                        </h4>
                        <p className={`text-xs mt-0.5 font-bold text-slate-700`}>
                          {occupyingEntity}
                        </p>
                        {sch.unitName && sch.unitName !== sch.unitCode && (
                          <p className={`text-[11px] text-slate-500`}>
                            {sch.unitName}
                          </p>
                        )}
                      </div>

                      {/* Location & Frequency */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60 ">
                        <div>
                          <span className="text-slate-500 font-medium">الموقع: </span>
                          <span className="font-bold">{sch.governorate} - {sch.field}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">التكرار: </span>
                          <span className="font-bold text-brand-700">{getFrequencyLabel(sch.frequency, sch.customIntervalDays)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">تاريخ البدء: </span>
                          <span className="font-mono font-bold">{toArabicDigits(sch.lastInspectionDate)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">الموعد القادم: </span>
                          <span className={`font-mono font-bold ${sch.status === 'overdue' ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                            {toArabicDigits(sch.nextDueDate)}
                          </span>
                        </div>
                      </div>

                      {/* Performer & Report */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                        <div>
                          {p ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.roleBadgeClass}`}>
                              <UserCheck className="w-3 h-3" />
                              <span>{p.userName || p.roleBadgeText}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">
                              {sch.inspectorName ? `المكلف: ${sch.inspectorName.replace(/\s*\([^)]*\)/g, '').trim()}` : 'لم يُنجز بعد'}
                            </span>
                          )}
                        </div>

                        <div>
                          {sch.reportFileName || sch.reportFileUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                const ext = sch.reportFileName?.split('.').pop() || 'pdf';
                                setPreviewAttachment({
                                  id: 'insp-main-' + sch.id,
                                  name: sch.reportFileName || 'تقرير_الكشف.pdf',
                                  type: ext,
                                  url: sch.reportFileUrl || '#',
                                  uploadedAt: sch.lastInspectionDate || getServerIsoDateOnly(),
                                  size: '1.5 MB',
                                });
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold border cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-200`}
                            >
                              <Eye className="w-3 h-3" />
                              <span>تقرير</span>
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60 ">
                        {sch.status !== 'completed' && (
                          <button
                            onClick={() => {
                              const todayStr = getServerIsoDateOnly();
                              setShowCompleteModal(sch);
                              setCompleteDate(todayStr);
                              setMaintDate(todayStr);
                              setCompletePerformedByName(sch.performedByName || '');
                              if (matchedUnit) {
                                setCompleteGrade(matchedUnit.conditionGrade);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow cursor-pointer min-h-[38px]"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>إنجاز الكشف</span>
                          </button>
                        )}
                        {matchedUnit && (
                          <button
                            onClick={() => {
                              setShowUnitArchiveModal(matchedUnit);
                              setArchiveModalTab('inspections');
                            }}
                            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer min-h-[38px] bg-brand-50 text-brand-800 border-brand-200 hover:bg-brand-100`}
                            title="الأرشيف"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>الأرشيف</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(sch)}
                          className={`p-2 rounded-xl border transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200`}
                          title="تعديل الموعد والتكرار"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmSchedule(sch)}
                          className={`p-2 rounded-xl border transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 border-red-200`}
                          title="حذف جدول الكشف الدوري"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                <thead className={`font-bold border-b bg-slate-100 text-slate-700 border-slate-200`}>
                  <tr>
                    <th className="p-3.5">رمز المنشأة والجهة الشاغلة</th>
                    <th className="p-3.5">المحافظة والحقل</th>
                    <th className="p-3.5">عنوان ومسمى الكشف</th>
                    <th className="p-3.5">تاريخ البدء والتكرار</th>
                    <th className="p-3.5">الموعد القادم المستحق</th>
                    <th className="p-3.5">حالة الكشف</th>
                    <th className="p-3.5">مُنفِّذ الكشف</th>
                    <th className="p-3.5 text-center">التقرير</th>
                    <th className="p-3.5 text-center">الإجراءات والتوثيق</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-200/80 bg-card`}>
                  {filteredSchedules.map((sch) => {
                    const matchedUnit = units.find((u) => u.code === sch.unitCode);
                    const occupyingEntity = matchedUnit
                      ? (matchedUnit.departments && matchedUnit.departments.length > 0
                          ? Array.from(new Set(matchedUnit.departments.filter(Boolean))).join(' ، ')
                          : matchedUnit.department ||
                            (matchedUnit.rooms && matchedUnit.rooms.length > 0
                              ? Array.from(new Set(matchedUnit.rooms.map((r) => r.occupiedBy).filter(Boolean))).join(' ، ')
                              : '')) || 'عام / غير محدد'
                      : 'عام / غير محدد';
                    return (
                      <tr key={sch.id} className={`transition hover:bg-brand-50`}>
                        {/* Facility Code and Occupying Entity (Stacked) */}
                        <td className="p-3.5 font-medium">
                          <div className={`font-mono font-bold text-xs text-brand-700`}>
                            {toArabicDigits(sch.unitCode)}
                          </div>
                          <div className={`text-xs mt-0.5 font-bold text-slate-800`}>
                            {occupyingEntity}
                          </div>
                          {sch.unitName && sch.unitName !== sch.unitCode && (
                            <div className={`text-[11px] text-slate-500`}>
                              {sch.unitName}
                            </div>
                          )}
                          {matchedUnit && (
                            <div className="mt-1">
                              {getConditionGradeBadge(sch.conditionGradeGiven || matchedUnit.conditionGrade)}
                            </div>
                          )}
                        </td>

                        {/* Gov & Field */}
                        <td className="p-3.5">
                          <div className={`font-bold text-xs text-slate-800`}>
                            {sch.governorate}
                          </div>
                          <div className={`text-[11px] mt-0.5 text-slate-500`}>
                            حقل {sch.field}
                          </div>
                        </td>

                        {/* Title */}
                        <td className="p-3.5">
                          <div className={`font-bold text-slate-900`}>
                            {sch.title}
                          </div>
                        </td>

                        {/* Start Date & Frequency */}
                        <td className="p-3.5">
                          <div className={`font-mono text-slate-700`}>
                            بدء: {toArabicDigits(sch.lastInspectionDate)}
                          </div>
                          <div className="mt-1">
                            <span className={`px-2.5 py-0.5 rounded-lg font-bold border text-[10px] bg-slate-100 text-brand-800 border-slate-200`}>
                              {getFrequencyLabel(sch.frequency, sch.customIntervalDays)}
                            </span>
                          </div>
                        </td>

                        {/* Next Due Date */}
                        <td className="p-3.5">
                          <div className={`font-mono font-bold text-xs ${sch.status === 'overdue' ? ('text-red-600 font-black') : 'text-slate-900 font-bold'}`}>
                            {toArabicDigits(sch.nextDueDate)}
                          </div>
                          {sch.status === 'overdue' && (
                            <div className="text-[10px] text-red-600 font-bold mt-0.5">
                              غير مكتمل - مستحق المعاينة!
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5">{getStatusBadge(sch.status)}</td>

                        {/* Performed By */}
                        <td className="p-3.5 whitespace-nowrap">
                          {sch.performedByName || (sch.status === 'completed' && sch.inspectorName) ? (
                            (() => {
                              const p = getPerformerDisplay(sch.performedByName, sch.inspectorName, users, sch.status === 'completed');
                              const isGenericRole = !p.userName || p.userName === p.roleBadgeText || p.userName === 'مشغل النظام' || p.userName === 'موظف الكشف' || p.userName === 'مدير النظام' || p.userName === 'مستخدم';
                              
                              if (isGenericRole) {
                                return (
                                  <div className="flex items-center">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border shadow-sm ${p.roleBadgeClass}`}
                                    >
                                      <UserCheck
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          p.isOperator
                                            ? 'text-brand-700'
                                            : p.isAdmin
                                            ? 'text-purple-600'
                                            : 'text-emerald-600'
                                        }`}
                                      />
                                      <span>{p.roleBadgeText}</span>
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-xs">
                                    <UserCheck
                                      className={`w-3.5 h-3.5 shrink-0 ${
                                        p.isOperator
                                          ? 'text-brand-700'
                                          : p.isAdmin
                                          ? 'text-purple-600'
                                          : 'text-emerald-600'
                                      }`}
                                    />
                                    <span className={'text-slate-900'}>
                                      {p.userName}
                                    </span>
                                  </div>
                                  <div>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${p.roleBadgeClass}`}
                                    >
                                      {p.roleBadgeText}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="space-y-0.5">
                              <span className={`text-[11px] font-semibold text-slate-400`}>
                                {sch.status === 'completed' ? '—' : 'لم يُنجز بعد'}
                              </span>
                              {sch.inspectorName && sch.status !== 'completed' && (
                                <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={sch.inspectorName}>
                                  المكلف: {sch.inspectorName.replace(/\s*\([^)]*\)/g, '').trim()}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Uploaded Report */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {sch.reportFileName || sch.reportFileUrl ? (
                            <button
                              type="button"
                              onClick={() => {
                                const ext = sch.reportFileName?.split('.').pop() || 'pdf';
                                setPreviewAttachment({
                                  id: 'insp-main-' + sch.id,
                                  name: sch.reportFileName || 'تقرير_الكشف.pdf',
                                  type: ext,
                                  url: sch.reportFileUrl || '#',
                                  uploadedAt: sch.lastInspectionDate || getServerIsoDateOnly(),
                                  size: '1.5 MB',
                                });
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer border shadow-sm bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-200`}
                              title="فتح ومعاينة التقرير أو الصورة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[110px]" title={sch.reportFileName || 'تقرير الكشف'}>
                                {sch.reportFileName || 'معاينة التقرير'}
                              </span>
                            </button>
                          ) : (
                            <span className={`text-[10px] text-slate-400`}>لا يوجد تقرير</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Complete Inspection Button - Hidden if inspection is already completed & documented */}
                            {sch.status !== 'completed' && (
                              <button
                                onClick={() => {
                                  const todayStr = getServerIsoDateOnly();
                                  setShowCompleteModal(sch);
                                  setCompleteDate(todayStr);
                                  setMaintDate(todayStr);
                                  setCompletePerformedByName(sch.performedByName || '');
                                  if (matchedUnit) {
                                    setCompleteGrade(matchedUnit.conditionGrade);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`}
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
                                className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer bg-brand-50 text-brand-800 border-brand-200 hover:bg-brand-100`}
                                title="عرض أرشيف الكشوفات والصيانة للوحدة"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>الأرشيف</span>
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(sch)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200`}
                              title="تعديل معلومات وتفاصيل الجدولة"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => setDeleteConfirmSchedule(sch)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 border-red-200`}
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
          </div>
        )}
        </div>
      ) : (
        /* 2. HIERARCHY TREE VIEW BY GOVERNORATE & OILFIELD */
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between bg-brand-50 border-brand-200 text-brand-800`}>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-700" />
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
                  className={`rounded-2xl border p-4 space-y-4 shadow-sm bg-card border-slate-200`}
                >
                  <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-700" />
                      <h3 className={`font-black text-sm text-slate-900`}>
                        محافظة {govName}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-brand-100 text-brand-800`}>
                      {toArabicDigits(govUnits.length)} منشآت
                    </span>
                  </div>

                  <div className="space-y-3 pr-2">
                    {fieldNames.map((fieldName) => {
                      const fieldUnits = govUnits.filter((u) => u.field === fieldName);

                      return (
                        <div key={fieldName} className={`p-3 rounded-xl border space-y-2 bg-slate-50 border-slate-200`}>
                          <div className="flex items-center justify-between text-xs font-bold text-brand-700">
                            <span>حقل / قطاع: {fieldName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ({toArabicDigits(fieldUnits.length)} وحدات)
                            </span>
                          </div>

                          <div className="divide-y divide-slate-200 text-xs">
                            {fieldUnits.map((unit) => {
                              const unitSchedules = schedules.filter((s) => s.unitCode === unit.code);
                              const latestSchedule = unitSchedules[0];

                              return (
                                <div key={unit.code} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-brand-700">{toArabicDigits(unit.code)}</span>
                                      <span className={`font-bold text-slate-800`}>{unit.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {getConditionGradeBadge(unit.conditionGrade)}
                                      {latestSchedule && (
                                        <span className="text-[10px] text-slate-500">
                                          الكشف القادم: <strong className="text-brand-700 font-mono">{toArabicDigits(latestSchedule.nextDueDate)}</strong>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                    <button
                                      onClick={() => {
                                        setNewUnitCode(unit.code);
                                        setShowAddModal(true);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer min-h-[36px] flex items-center gap-1 bg-brand-100 text-brand-800 border-brand-200 hover:bg-brand-100`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>جدولة كشف</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        setShowUnitArchiveModal(unit);
                                        setArchiveModalTab('inspections');
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer min-h-[36px] flex items-center gap-1 bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300`}
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                      <span>الأرشيف</span>
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
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto bg-slate-900/40`}>
          <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 w-full max-w-5xl space-y-4 sm:space-y-5 shadow-2xl relative my-2 sm:my-6 border max-h-[94vh] flex flex-col bg-card border-slate-200 text-slate-900`}>
            <div className={`flex items-center justify-between border-b pb-3 shrink-0 border-slate-200`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold shrink-0 bg-brand-100 border border-brand-200 text-brand-700`}>
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm sm:text-base text-slate-900`}>
                    جدولة وتثبيت موعد كشف دوري جديد
                  </h3>
                  <p className={`text-[11px] sm:text-xs text-slate-500`}>
                    تحديد تاريخ البدء بالتكرار وحساب تاريخ الاستحقاق القادم تلقائياً
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className={`p-1.5 rounded-lg cursor-pointer text-slate-400 hover:text-slate-700 hover:bg-slate-100`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScheduleSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                
                {/* RIGHT COLUMN: UNIT PICKER */}
                <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border space-y-3.5 bg-slate-50/80 border-slate-200`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-slate-200 ">
                    <label className={`block font-extrabold text-xs text-slate-900`}>
                      1. اختيار الوحدة الهندسية:
                    </label>

                    {/* View Mode Switcher */}
                    <div className={`flex items-center gap-1 p-1 rounded-xl border bg-slate-100 border-slate-200`}>
                      <button
                        type="button"
                        onClick={() => setUnitPickerMode('tree_vertical')}
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] flex items-center gap-1 transition cursor-pointer ${
                          unitPickerMode === 'tree_vertical'
                            ? 'bg-brand-700 text-on-brand shadow-sm font-black'
                            : 'text-slate-600 hover:text-slate-900'
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
                            ? 'bg-brand-700 text-on-brand shadow-sm font-black'
                            : 'text-slate-600 hover:text-slate-900'
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
                            ? 'bg-brand-700 text-on-brand shadow-sm font-black'
                            : 'text-slate-600 hover:text-slate-900'
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
                    <div className={`p-3 rounded-2xl border flex items-center justify-between flex-wrap gap-2 transition bg-brand-50 border-brand-200 text-brand-800`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-brand-700 text-on-brand font-black flex items-center justify-center shrink-0">
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
                              <MapPin className="w-3 h-3 text-brand-700 " />
                              محافظة {selectedUnitAsset.governorate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3 text-brand-700 " />
                              حقل {selectedUnitAsset.field}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-brand-100 text-brand-800 font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-brand-700 " />
                        محددة
                      </span>
                    </div>
                  ) : null}

                  {/* SEARCH INPUT BAR */}
                  {unitPickerMode !== 'dropdown' && (
                    <div className="relative">
                      <Search className={`w-3.5 h-3.5 absolute right-3 top-3 text-slate-400`} />
                      <input
                        type="text"
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        placeholder="تصفية / بحث عن وحدة بالاسم أو الكود..."
                        className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs font-bold outline-none border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
                      />
                    </div>
                  )}

                  {/* VIEW 1: VERTICAL TREE VIEW */}
                  {unitPickerMode === 'tree_vertical' && (
                    <div className={`p-3 rounded-2xl border space-y-2 max-h-64 overflow-y-auto bg-card border-slate-200`}>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-[11px]">
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
                            className="text-brand-700 hover:underline font-bold text-[10px] cursor-pointer"
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
                            className="text-slate-500 hover:underline font-bold text-[10px] cursor-pointer"
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
                                className={`w-full flex items-center justify-between p-2 rounded-xl font-bold text-xs transition cursor-pointer border bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100`}
                              >
                                <div className="flex items-center gap-2">
                                  {isGovExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-brand-700" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  )}
                                  <MapPin className="w-4 h-4 text-brand-700" />
                                  <span>محافظة {gov}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold">
                                  {govUnitsCount} وحدة
                                </span>
                              </button>

                              {/* OILFIELDS UNDER GOVERNORATE */}
                              {isGovExpanded && (
                                <div className="pr-4 pl-1 space-y-1.5 border-r-2 border-brand-200 mr-3 my-1">
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
                                          className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-100/80 text-slate-700 hover:bg-slate-200/80`}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            {isFldExpanded ? (
                                              <ChevronDown className="w-3.5 h-3.5 text-brand-700" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                            <Flame className="w-3.5 h-3.5 text-brand-700" />
                                            <span>حقل {fld}</span>
                                          </div>
                                          <span className="text-[10px] opacity-70">
                                            ({matchedUnits.length} منشأة)
                                          </span>
                                        </button>

                                        {/* UNITS UNDER OILFIELD */}
                                        {isFldExpanded && (
                                          <div className="pr-4 space-y-1 border-r border-slate-300 mr-2 my-1">
                                            {matchedUnits.map((u) => {
                                              const isSelected = newUnitCode === u.code;
                                              return (
                                                <div
                                                  key={u.code}
                                                  onClick={() => setNewUnitCode(u.code)}
                                                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer border transition ${
                                                    isSelected
                                                      ? 'bg-brand-700 text-on-brand border-brand-600 shadow-md font-extrabold'
                                                      : 'bg-card border-slate-200 text-slate-800 hover:border-brand-200 hover:bg-brand-50'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-card' : 'bg-brand-700'}`} />
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
                    <div className={`p-3 rounded-2xl border space-y-3 bg-card border-slate-200`}>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>مسار العرض الأفقي</span>
                        <span className="text-brand-700 ">تصفح أفقياً</span>
                      </div>

                      {/* STEP 1: HORIZONTAL GOVERNORATES */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">
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
                                    ? 'bg-brand-700 border-brand-600 text-on-brand shadow-md font-extrabold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{gov}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-card/20 text-slate-950' : 'bg-brand-50 text-brand-700'}`}>
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
                          <span className="text-[10px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                            <span>2. اختر الحقل النفطي:</span>
                            <ChevronLeft className="w-3 h-3 text-brand-700" />
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
                                      ? 'bg-brand-100 border-brand-600 text-brand-700 font-extrabold'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <Flame className="w-3.5 h-3.5 text-brand-700" />
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
                          <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
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
                                        ? 'bg-brand-700 border-brand-600 text-on-brand font-extrabold shadow-md'
                                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-brand-200 hover:bg-brand-50'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-mono text-xs font-bold">{u.code}</div>
                                      <div className="text-[11px] mt-0.5 truncate max-w-[140px]">{u.name}</div>
                                    </div>
                                    {isSelected ? (
                                      <span className="px-1.5 py-0.5 rounded-lg bg-card text-brand-700 text-[10px] font-bold flex items-center gap-1">
                                        <Check className="w-3 h-3" /> تم
                                      </span>
                                    ) : (
                                      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold border bg-slate-100 border-slate-200 text-slate-600`}>
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
                      className={`w-full rounded-xl p-3 font-bold outline-none cursor-pointer border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
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
                <div className={`p-4 rounded-2xl border space-y-3.5 bg-slate-50/80 border-slate-200`}>
                  <label className={`block font-extrabold text-xs border-b pb-2 text-slate-900 border-slate-200`}>
                    2. مواعيد وإعدادات الكشف الدوري:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold mb-1 text-brand-800`}>
                        تاريخ البدء بالكشف:
                      </label>
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
                        required
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 text-brand-800`}>
                        التكرار الدوري المحدد:
                      </label>
                      <select
                        value={newFrequency}
                        onChange={(e) => handleFrequencyChange(e.target.value as InspectionFrequency)}
                        className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
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
                        <label className={`block font-bold mb-1 text-slate-700`}>
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
                          className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-card border-slate-200 text-slate-900`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Next Due Date */}
                  <div>
                    <label className={`block font-bold mb-1 text-brand-800`}>
                      الموعد القادم المستحق (محسوب تلقائياً):
                    </label>
                    <input
                      type="date"
                      value={newNextDate}
                      readOnly
                      className={`w-full rounded-xl p-2.5 font-bold outline-none border cursor-not-allowed bg-slate-100 border-slate-200 text-slate-700`}
                    />
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 text-slate-700`}>
                      ملاحظات عامة:
                    </label>
                    <textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      rows={2}
                      placeholder="سجل أية ملاحظات عامة..."
                      className={`w-full rounded-xl p-2.5 outline-none border bg-card border-slate-200 text-slate-900`}
                    />
                  </div>
                </div>

              </div>

              <div className={`flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t shrink-0 border-slate-200`}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold transition cursor-pointer min-h-[42px] flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-brand-700 text-on-brand rounded-xl font-black hover:bg-brand-800 shadow-md transition cursor-pointer min-h-[42px] flex items-center justify-center gap-2"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>حفظ وتثبيت جدول الكشف الدوري</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COMPLETE INSPECTION & UPLOAD REPORT & GRADE A-B-C-D & MAINTENANCE TRIGGER */}
      {showCompleteModal && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto bg-slate-900/40`}>
          <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 w-full max-w-6xl space-y-3.5 shadow-2xl relative border max-h-[96vh] flex flex-col justify-between my-auto bg-card border-slate-200 text-slate-900`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-2.5 shrink-0 border-slate-200`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 bg-emerald-100 border border-emerald-200 text-emerald-700`}>
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm sm:text-base leading-tight text-slate-900`}>
                    توثيق وإنجاز الكشف المعاين
                  </h3>
                  <p className={`text-[11px] sm:text-xs text-slate-500`}>
                    {showCompleteModal.unitCode} - {showCompleteModal.title}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(null)} className={`p-1.5 cursor-pointer rounded-lg transition text-slate-400 hover:text-slate-700 hover:bg-slate-100`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-3.5 text-xs overflow-y-auto max-h-[calc(90vh-110px)] pr-1 pl-1 flex-1">
              {/* ROW 1: HORIZONTAL TOP PARAMETERS GRID (4 COLUMNS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-stretch">
                {/* Column 1: Date */}
                <div className="sm:col-span-1 md:col-span-3">
                  <label className={`block font-bold mb-1 text-slate-700`}>
                    تاريخ المعاينة الفعلي:
                  </label>
                  <input
                    type="date"
                    value={completeDate}
                    onChange={(e) => setCompleteDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 font-bold outline-none border min-h-[42px] bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500`}
                    required
                  />
                </div>

                {/* Column 2: Condition Grade Selection (A-B-C-D) */}
                <div className="sm:col-span-1 md:col-span-3">
                  <label className={`block font-bold mb-1 text-slate-700`}>
                    التقييم الهندسي (Grade):
                  </label>
                  <select
                    value={completeGrade}
                    onChange={(e) => setCompleteGrade(e.target.value as ConditionGrade)}
                    className={`w-full rounded-xl px-3 py-2 font-bold outline-none cursor-pointer border min-h-[42px] bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500`}
                  >
                    <option value="A">درجة A (حالة ممتازة)</option>
                    <option value="B">درجة B (حالة جيدة)</option>
                    <option value="C">درجة C (حالة متوسطة)</option>
                    <option value="D">درجة D (حالة حرجة)</option>
                  </select>
                </div>

                {/* Column 3: Performed By (System user selector or custom) */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className={`block font-bold mb-1 text-slate-700`}>
                    مُنفِّذ الكشف (المعتمد في النظام):
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={completePerformedByName}
                      onChange={(e) => setCompletePerformedByName(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 font-bold outline-none border cursor-pointer text-xs min-h-[42px] bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500`}
                    >
                      <optgroup label="المستخدمون المعتمدون في النظام">
                        {(users && users.length > 0 ? users : INITIAL_USERS).map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name} — ({u.role})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="تصنيفات عامة">
                        <option value="مشغل النظام">مشغل النظام</option>
                        <option value="موظف الكشف">موظف الكشف</option>
                        <option value="مدير النظام">مدير النظام</option>
                      </optgroup>
                    </select>

                    <input
                      type="text"
                      value={completePerformedByName}
                      onChange={(e) => setCompletePerformedByName(e.target.value)}
                      placeholder="أو اكتب اسم مخصص لمُنفّذ الكشف..."
                      className={`w-full rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none border min-h-[38px] bg-card border-slate-200 text-slate-900 focus:border-emerald-500`}
                    />
                  </div>
                </div>

                {/* Column 4: Upload Report File Section */}
                <div className={`sm:col-span-2 md:col-span-3 p-2.5 rounded-xl border flex flex-col justify-center bg-emerald-50/50 border-emerald-200`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`font-bold flex items-center gap-1.5 text-xs text-emerald-900`}>
                      <Upload className="w-3.5 h-3.5 shrink-0" />
                      <span>ملف التقرير:</span>
                    </label>
                    <span className={`text-[10px] font-semibold text-slate-500`}>
                      (PDF/صور/Word)
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
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 min-h-[38px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`}
                      title="رفع ملف التقرير من جهاز الحاسوب"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع ملف</span>
                    </button>

                    {/* File Info and Action Buttons */}
                    {reportFileName ? (
                      <div className="flex items-center justify-between gap-1.5 flex-1 min-w-0 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-[11px] font-bold text-emerald-600 truncate max-w-[80px]" title={reportFileName}>
                            {reportFileName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={handlePreviewReportFile}
                            className={`px-1.5 py-0.5 rounded-md transition cursor-pointer text-[10px] font-bold flex items-center gap-0.5 bg-card hover:bg-slate-100 text-slate-700 border border-slate-200`}
                            title="معاينة الملف المرفق"
                          >
                            <Eye className="w-3 h-3 text-sky-600" />
                            <span>معاينة</span>
                          </button>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={handleRemoveReportFile}
                            className={`px-1.5 py-0.5 rounded-md transition cursor-pointer text-[10px] font-bold flex items-center gap-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200`}
                            title="إزالة الملف المرفق"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className={`text-[10px] italic text-slate-500`}>
                        لم يتم اختيار ملف
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ROW 2: SIDE-BY-SIDE FINDINGS & RECOMMENDATIONS (2 EQUAL COLUMNS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Findings */}
                <div>
                  <label className={`block font-bold mb-1 text-slate-700`}>
                    الملاحظات والنتائج الميدانية (Findings):
                  </label>
                  <textarea
                    value={completeFindings}
                    onChange={(e) => setCompleteFindings(e.target.value)}
                    placeholder="سجل أية عيوب، ملاحظات إنشائية، أو أضرار ميكانيكية تم مشاهدتها..."
                    rows={2}
                    className={`w-full rounded-xl p-2.5 outline-none border resize-none bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500`}
                    required
                  />
                </div>

                {/* Recommendations */}
                <div>
                  <label className={`block font-bold mb-1 text-slate-700`}>
                    التوصيات والإجراءات المطلوب اتخاذها (Recommendations):
                  </label>
                  <textarea
                    value={completeRecommendations}
                    onChange={(e) => setCompleteRecommendations(e.target.value)}
                    placeholder="سجل توصيات السلامة والتوجيهات الفنية المطلوبة..."
                    rows={2}
                    className={`w-full rounded-xl p-2.5 outline-none border resize-none bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500`}
                  />
                </div>
              </div>

              {/* ROW 3: HORIZONTAL MAINTENANCE & AUTO-SCHEDULE OPTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                {/* MAINTENANCE REQUEST BLOCK (SPAN 8) */}
                <div className={`md:col-span-8 p-3 rounded-2xl border space-y-2 bg-brand-50 border-brand-200`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-bold flex items-center gap-1.5 text-brand-800`}>
                        <Wrench className="w-4 h-4" /> تحرير طلب صيانة جديد لهذا الكشف
                      </span>
                      <p className={`text-[10px] text-slate-600`}>
                        يبقى الطلب في النظام لحين اتمام المعالجة وتغيير حالته من قبل موظف الإدخال
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={createMaintenance}
                      onChange={(e) => setCreateMaintenance(e.target.checked)}
                      className="w-4 h-4 accent-brand-700 rounded cursor-pointer shrink-0"
                    />
                  </div>

                  {createMaintenance && (
                    <div className="pt-2 border-t border-brand-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <label className={`block font-bold mb-0.5 text-[11px] text-slate-700`}>
                          وصف العطل / المشكلة:
                        </label>
                        <input
                          type="text"
                          value={maintIssue}
                          onChange={(e) => setMaintIssue(e.target.value)}
                          placeholder="مثال: تصليح تسرب أسطح أو استبدال مضخات"
                          className={`w-full rounded-lg px-2.5 py-1.5 font-bold outline-none border bg-card border-slate-200 text-slate-900`}
                          required={createMaintenance}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className={`block font-bold mb-0.5 text-[11px] text-slate-700`}>
                          تاريخ طلب الصيانة:
                        </label>
                        <input
                          type="date"
                          value={maintDate}
                          onChange={(e) => setMaintDate(e.target.value)}
                          className={`w-full rounded-lg px-2.5 py-1.5 font-bold font-mono outline-none border bg-card border-slate-200 text-slate-900`}
                          required={createMaintenance}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={`block font-bold mb-0.5 text-[11px] text-slate-700`}>
                          أولية الطلب:
                        </label>
                        <select
                          value={maintPriority}
                          onChange={(e) => setMaintPriority(e.target.value as any)}
                          className={`w-full rounded-lg px-2 py-1.5 font-bold outline-none border bg-card border-slate-200 text-slate-900`}
                        >
                          <option value="critical">حرج (طارئ)</option>
                          <option value="normal">عادي</option>
                          <option value="low">منخفض (وقائي)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className={`block font-bold mb-0.5 text-[11px] text-slate-700`}>
                          جهة الصيانة المختصة (المسجلة بالمنظومة):
                        </label>
                        <select
                          value={maintDept || (activeMaintenanceDepts[0]?.nameAr || '')}
                          onChange={(e) => setMaintDept(e.target.value)}
                          className={`w-full rounded-lg px-2.5 py-1.5 font-bold outline-none border cursor-pointer bg-card border-slate-200 text-slate-900`}
                          required={createMaintenance}
                        >
                          {activeMaintenanceDepts.map((d) => (
                            <option key={d.id} value={d.nameAr}>
                              {d.nameAr} {d.nameEn ? `(${d.nameEn})` : ''}
                            </option>
                          ))}
                          {activeMaintenanceDepts.length === 0 && (
                            <option value="">لا توجد جهات صيانة مسجلة - يرجى إضافتها من الإعدادات</option>
                          )}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* AUTO SCHEDULE CHECKBOX BLOCK (SPAN 4) */}
                <div className={`md:col-span-4 p-3 border rounded-2xl flex items-center justify-between h-full bg-slate-50 border-slate-200`}>
                  <div>
                    <p className={`font-bold text-xs text-slate-800`}>
                      جدولة الكشف القادم تلقائياً
                    </p>
                    <p className={`text-[10px] text-slate-500`}>
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
              <div className={`flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t shrink-0 border-slate-200`}>
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(null)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold transition cursor-pointer min-h-[42px] flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2 min-h-[42px]"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>حفظ وإنجاز الكشف وتثبيت النتائج</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT SCHEDULE */}
      {showEditModal && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto bg-slate-900/40`}>
          <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 w-full max-w-5xl space-y-4 sm:space-y-5 shadow-2xl relative my-2 sm:my-6 border max-h-[94vh] flex flex-col bg-card border-slate-200 text-slate-900`}>
            <div className={`flex items-center justify-between border-b pb-3 shrink-0 border-slate-200`}>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold shrink-0 bg-brand-100 border border-brand-200 text-brand-700`}>
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm sm:text-base text-slate-900`}>
                    تعديل معلومات وتفاصيل جدولة الكشف الدوري
                  </h3>
                  <p className={`text-[11px] sm:text-xs text-slate-500`}>
                    رمز السجل: {showEditModal.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(null)} className={`p-1.5 rounded-lg cursor-pointer text-slate-400 hover:text-slate-700 hover:bg-slate-100`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">

                {/* RIGHT COLUMN: LOCKED UNIT INFORMATION */}
                <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border space-y-3.5 bg-slate-50/80 border-slate-200`}>
                  <label className={`block font-extrabold text-xs border-b pb-2 text-slate-900 border-slate-200`}>
                    1. بيانات الوحدة الهندسية (مغلقة):
                  </label>

                  {/* READ-ONLY LOCKED UNIT CARD */}
                  <div className={`p-4 rounded-2xl border flex flex-col gap-3 bg-card border-slate-300 text-slate-900`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-brand-700 text-on-brand font-black flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-brand-700 font-bold flex items-center gap-1 mb-0.5">
                            <Lock className="w-3 h-3" />
                            <span>الوحدة الهندسية المثبتة</span>
                          </div>
                          <div className="font-extrabold text-sm">
                            {showEditModal.unitCode} - {showEditModal.unitName}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] flex items-center gap-1 shrink-0 bg-slate-100 border-slate-300 text-slate-700`}>
                        <Lock className="w-3 h-3 text-brand-700" />
                        ثابتة
                      </span>
                    </div>

                    <div className="border-t pt-2.5 border-slate-200 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">المحافظة:</span>
                        <span className="font-bold">{showEditModal.governorate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">الحقل النفطي:</span>
                        <span className="font-bold">{showEditModal.field}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 bg-brand-50 border-brand-200 text-brand-800`}>
                    <Lock className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                    <span>
                      تم تثبيت هذه الوحدة أثناء إنشاء الجدول الدوري، ولا يمكن تغيير الوحدة عند تعديل المواعيد لضمان دقة وتكامل أرشيف المعاينات الهندسية.
                    </span>
                  </div>
                </div>

                {/* LEFT COLUMN: EDITABLE SCHEDULE PARAMETERS */}
                <div className={`p-4 rounded-2xl border space-y-3.5 bg-slate-50/80 border-slate-200`}>
                  <label className={`block font-extrabold text-xs border-b pb-2 text-slate-900 border-slate-200`}>
                    2. تعديل مواعيد وإعدادات الجدول الدوري:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold mb-1 text-brand-800`}>
                        تاريخ بدء الكشف / آخر كشف:
                      </label>
                      <input
                        type="date"
                        value={editLastDate}
                        onChange={(e) => {
                          setEditLastDate(e.target.value);
                          updateEditCalculatedNextDate(e.target.value, editFrequency, editCustomDays);
                        }}
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 text-brand-800`}>
                        التكرار الدوري المحدد:
                      </label>
                      <select
                        value={editFrequency}
                        onChange={(e) => {
                          const freq = e.target.value as InspectionFrequency;
                          setEditFrequency(freq);
                          updateEditCalculatedNextDate(editLastDate, freq, editCustomDays);
                        }}
                        className={`w-full rounded-xl p-2.5 font-bold outline-none cursor-pointer border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
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
                        <label className={`block font-bold mb-1 text-slate-700`}>
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
                          className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Next Due Date */}
                  <div>
                    <label className={`block font-bold mb-1 text-brand-800`}>
                      الموعد القادم المستحق:
                    </label>
                    <input
                      type="date"
                      value={editNextDate}
                      onChange={(e) => setEditNextDate(e.target.value)}
                      className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-brand-50 border-brand-200 text-brand-800 focus:border-brand-600`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold mb-1 text-slate-700`}>
                        فريق الكشف المكلف:
                      </label>
                      <input
                        type="text"
                        value={editAssignedTeam}
                        onChange={(e) => setEditAssignedTeam(e.target.value)}
                        placeholder="اسم الفريق المكلف..."
                        className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
                      />
                    </div>

                    <div>
                      <label className={`block font-bold mb-1 text-slate-700`}>
                        القائم بالكشف / المهندس المسؤول:
                      </label>
                      <div className="space-y-1.5">
                        <select
                          value={editInspectorName}
                          onChange={(e) => setEditInspectorName(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 font-bold outline-none border cursor-pointer text-xs bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
                        >
                          <option value="">-- اختر المستخدم أو حدد صفته --</option>
                          <optgroup label="المستخدمون في النظام">
                            {(users && users.length > 0 ? users : INITIAL_USERS).map((u) => (
                              <option key={u.id} value={u.name}>
                                {u.name} — ({u.role})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="الصفات المعتمدة">
                            <option value="مشغل النظام">مشغل النظام</option>
                            <option value="موظف الكشف">موظف الكشف</option>
                            <option value="مدير النظام">مدير النظام</option>
                          </optgroup>
                        </select>
                        <input
                          type="text"
                          value={editInspectorName}
                          onChange={(e) => setEditInspectorName(e.target.value)}
                          placeholder="أو اكتب اسماً مخصصاً..."
                          className={`w-full rounded-lg px-2.5 py-1 text-[11px] font-bold outline-none border bg-card border-slate-200 text-slate-900 focus:border-brand-600`}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block font-bold mb-1 text-slate-700`}>
                      ملاحظات عامة:
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      placeholder="أدخل أية ملاحظات تفصيلية هنا..."
                      className={`w-full rounded-xl p-2.5 outline-none border bg-card border-slate-200 text-slate-900`}
                    />
                  </div>
                </div>

              </div>

              <div className={`flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t shrink-0 border-slate-200`}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold transition cursor-pointer min-h-[42px] flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-brand-700 text-on-brand rounded-xl font-black hover:bg-brand-800 shadow-md transition cursor-pointer min-h-[42px] flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>حفظ وتحديث معلومات الجدول</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL UNIT ARCHIVE MODAL (ARCHIVE OF ALL INSPECTIONS & MAINTENANCE FOR A UNIT) */}
      {showUnitArchiveModal && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto bg-slate-900/40`}>
          <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 w-full max-w-[98vw] xl:max-w-7xl space-y-3.5 sm:space-y-5 shadow-2xl relative my-2 sm:my-6 border max-h-[96vh] flex flex-col bg-card border-slate-200 text-slate-900`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-3 sm:pb-4 shrink-0 gap-2 border-slate-200`}>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold shrink-0 bg-brand-100 border border-brand-200 text-brand-800`}>
                  <Archive className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-brand-700 text-xs sm:text-sm">{toArabicDigits(showUnitArchiveModal.code)}</span>
                    <h3 className={`font-black text-sm sm:text-lg truncate text-slate-900`}>{showUnitArchiveModal.name}</h3>
                  </div>
                  <p className={`text-[10.5px] sm:text-xs mt-0.5 truncate text-slate-600`}>
                    محافظة {showUnitArchiveModal.governorate} | حقل {showUnitArchiveModal.field} | {showUnitArchiveModal.sectorAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {getConditionGradeBadge(showUnitArchiveModal.conditionGrade)}
                <button onClick={() => setShowUnitArchiveModal(null)} className={`p-1.5 rounded-lg cursor-pointer text-slate-400 hover:text-slate-700 hover:bg-slate-100`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs & Layout Toggle */}
            <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none flex-nowrap shrink-0">
              <button
                onClick={() => setArchiveModalTab('both')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[38px] ${
                  archiveModalTab === 'both'
                    ? 'bg-brand-700 text-on-brand font-black shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>الأرشيفين معاً</span>
              </button>

              <button
                onClick={() => setArchiveModalTab('inspections')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[38px] ${
                  archiveModalTab === 'inspections'
                    ? 'bg-brand-700 text-on-brand font-black shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>أرشيف المعاينات والكشوفات ({toArabicDigits(schedules.filter((s) => s.unitCode === showUnitArchiveModal.code).length)})</span>
              </button>

              <button
                onClick={() => setArchiveModalTab('maintenance')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[38px] ${
                  archiveModalTab === 'maintenance'
                    ? 'bg-brand-700 text-on-brand font-black shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>أرشيف أعمال الصيانة ({toArabicDigits(maintenanceRequests.filter((r) => r.unitCode === showUnitArchiveModal.code).length)})</span>
              </button>
            </div>

            {/* HORIZONTAL / GRID ARCHIVE CONTENT */}
            <div className={`grid grid-cols-1 ${archiveModalTab === 'both' ? 'xl:grid-cols-2' : 'grid-cols-1'} gap-4 sm:gap-6 overflow-y-auto max-h-[calc(90vh-140px)] pr-1 pl-1 flex-1`}>
              {/* ARCHIVE 1: INSPECTIONS & PERIODIC CHECKS */}
              {(archiveModalTab === 'both' || archiveModalTab === 'inspections') && (
                <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 bg-slate-50/80 border-slate-200`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-bold text-xs sm:text-sm text-brand-700 flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4" />
                      <span>أرشيف المعاينات والكشوفات الدورية</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      ({toArabicDigits(schedules.filter((s) => s.unitCode === showUnitArchiveModal.code).length)} كشف)
                    </span>
                  </div>

                  {schedules.filter((s) => s.unitCode === showUnitArchiveModal.code).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">لا توجد سجلات كشف دوري مسجلة لهذه الوحدة حتى الآن.</div>
                  ) : (
                    <div>
                      {/* Mobile Cards View for Inspection Archive (md:hidden) */}
                      <div className="md:hidden space-y-3">
                        {schedules
                          .filter((s) => s.unitCode === showUnitArchiveModal.code)
                          .map((sch) => {
                            const p = (sch.performedByName || (sch.status === 'completed' && sch.inspectorName))
                              ? getPerformerDisplay(sch.performedByName, sch.inspectorName, users, sch.status === 'completed')
                              : null;

                            return (
                              <div
                                key={sch.id}
                                className={`p-3 rounded-xl border space-y-2.5 transition bg-card border-slate-200 shadow-xs`}
                              >
                                {/* Top Title & Badges */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h5 className={`font-extrabold text-xs sm:text-sm leading-snug text-slate-900`}>
                                      {sch.title}
                                    </h5>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-brand-50 text-brand-800 border-brand-200`}>
                                        {getFrequencyLabel(sch.frequency, sch.customIntervalDays)}
                                      </span>
                                      {sch.conditionGradeGiven && getConditionGradeBadge(sch.conditionGradeGiven)}
                                    </div>
                                  </div>
                                  <div className="shrink-0">
                                    {getStatusBadge(sch.status)}
                                  </div>
                                </div>

                                {/* Dates Grid */}
                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 ">
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">آخر كشف:</span>
                                    <span className="font-mono font-bold text-[11px]">{toArabicDigits(sch.lastInspectionDate)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[10px] block">الموعد المستحق:</span>
                                    <span className={`font-mono font-bold text-[11px] ${sch.status === 'overdue' ? 'text-rose-600 font-black' : 'text-brand-800'}`}>
                                      {toArabicDigits(sch.nextDueDate)}
                                    </span>
                                  </div>
                                </div>

                                {/* Performer */}
                                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 ">
                                  <span className="text-slate-500 text-[10px]">المُنفِّذ:</span>
                                  {p ? (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.roleBadgeClass}`}>
                                      <UserCheck className="w-3 h-3" />
                                      <span>{p.userName || p.roleBadgeText}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">{sch.status === 'completed' ? '—' : 'لم يُنجز بعد'}</span>
                                  )}
                                </div>

                                {/* Findings & Notes if available */}
                                {(sch.findings || sch.notes) && (
                                  <div className={`p-2.5 rounded-xl text-xs space-y-1 bg-slate-50 border border-slate-200`}>
                                    <span className="font-bold text-[10px] text-slate-500 block">الملاحظات والنتائج:</span>
                                    <p className={`text-[11px] leading-relaxed text-slate-800`}>
                                      {sch.findings || sch.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Recommendations if available */}
                                {sch.recommendations && (
                                  <div className={`p-2.5 rounded-xl text-xs space-y-1 bg-brand-50 border border-brand-200 text-brand-800`}>
                                    <span className="font-bold text-[10px] opacity-80 block">التوصيات والإجراءات:</span>
                                    <p className="text-[11px] leading-relaxed font-semibold">
                                      {sch.recommendations}
                                    </p>
                                  </div>
                                )}

                                {/* Report Attachment & Actions */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 ">
                                  <div>
                                    {sch.reportFileName || sch.reportFileUrl ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const ext = sch.reportFileName?.split('.').pop() || 'pdf';
                                          setPreviewAttachment({
                                            id: 'insp-arch-mob-' + sch.id,
                                            name: sch.reportFileName || 'تقرير_الكشف.pdf',
                                            type: ext,
                                            url: sch.reportFileUrl || '#',
                                            uploadedAt: sch.lastInspectionDate || getServerIsoDateOnly(),
                                            size: '1.5 MB',
                                          });
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border min-h-[34px] bg-emerald-50 text-emerald-800 border-emerald-200`}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>معاينة التقرير</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">لا يوجد مرفق</span>
                                    )}
                                  </div>

                                  <div>
                                    {sch.status !== 'completed' ? (
                                      <button
                                        onClick={() => {
                                          const matchedUnit = units.find((u) => u.code === sch.unitCode);
                                          setShowCompleteModal(sch);
                                          setCompleteDate(sch.lastInspectionDate || getServerIsoDateOnly());
                                          setMaintDate(sch.lastInspectionDate || getServerIsoDateOnly());
                                          setCompletePerformedByName(sch.performedByName || '');
                                          if (matchedUnit) {
                                            setCompleteGrade(sch.conditionGradeGiven || matchedUnit.conditionGrade);
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 min-h-[34px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm`}
                                      >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>تحديث وإنجاز</span>
                                      </button>
                                    ) : (
                                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 bg-emerald-100 text-emerald-800`}>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>مكتمل وموثق</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Desktop Table View (hidden md:block) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className={`font-bold border-b bg-slate-100 text-slate-700`}>
                            <tr>
                              <th className="p-2">عنوان الكشف</th>
                              <th className="p-2">التكرار</th>
                              <th className="p-2">آخر كشف</th>
                              <th className="p-2">الموعد المستحق</th>
                              <th className="p-2">الحالة والدرجة</th>
                              <th className="p-2">مُنفِّذ الكشف</th>
                              <th className="p-2">الملاحظات والنتائج</th>
                              <th className="p-2">التوصيات والإجراءات</th>
                              <th className="p-2 text-center">المرفقات / الصور</th>
                              <th className="p-2 text-center">تحديث الكشف</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y divide-slate-200`}>
                            {schedules
                              .filter((s) => s.unitCode === showUnitArchiveModal.code)
                              .map((sch) => (
                                <tr key={sch.id} className={'hover:bg-slate-100/80'}>
                                  <td className="p-2 font-bold">
                                    <div className={'text-slate-900'}>{sch.title}</div>
                                  </td>
                                  <td className={`p-2 text-[11px] text-slate-700`}>{getFrequencyLabel(sch.frequency, sch.customIntervalDays)}</td>
                                  <td className={`p-2 font-mono text-[11px] text-slate-700`}>{toArabicDigits(sch.lastInspectionDate)}</td>
                                  <td className={`p-2 font-mono font-bold text-[11px] text-brand-700`}>{toArabicDigits(sch.nextDueDate)}</td>
                                  <td className="p-2">
                                    <div className="space-y-1">
                                      <div>{getStatusBadge(sch.status)}</div>
                                      {sch.conditionGradeGiven && <div>{getConditionGradeBadge(sch.conditionGradeGiven)}</div>}
                                    </div>
                                  </td>
                                  <td className="p-2 text-[11px] whitespace-nowrap">
                                    {sch.performedByName || (sch.status === 'completed' && sch.inspectorName) ? (
                                      (() => {
                                        const p = getPerformerDisplay(sch.performedByName, sch.inspectorName, users, sch.status === 'completed');
                                        const isGenericRole = !p.userName || p.userName === p.roleBadgeText || p.userName === 'مشغل النظام' || p.userName === 'موظف الكشف' || p.userName === 'مدير النظام' || p.userName === 'مستخدم';
                                        
                                        if (isGenericRole) {
                                          return (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${p.roleBadgeClass}`}>
                                              <UserCheck className={`w-3 h-3 ${p.isOperator ? 'text-brand-700' : p.isAdmin ? 'text-purple-600' : 'text-emerald-600'}`} />
                                              {p.roleBadgeText}
                                            </span>
                                          );
                                        }

                                        return (
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-1 font-bold">
                                              <UserCheck className={`w-3 h-3 ${p.isOperator ? 'text-brand-700' : p.isAdmin ? 'text-purple-600' : 'text-emerald-600'}`} />
                                              <span className={'text-slate-800'}>{p.userName}</span>
                                            </div>
                                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold border ${p.roleBadgeClass}`}>
                                              {p.roleBadgeText}
                                            </span>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <span className="text-slate-500">{sch.status === 'completed' ? '—' : 'لم يُنجز بعد'}</span>
                                    )}
                                  </td>
                                  <td className="p-2 max-w-[160px]">
                                    {sch.findings || sch.notes ? (
                                      <span className={`text-[11px] line-clamp-2 text-slate-700`} title={sch.findings || sch.notes}>
                                        {sch.findings || sch.notes}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">لا توجد ملاحظات</span>
                                    )}
                                  </td>
                                  <td className="p-2 max-w-[160px]">
                                    {sch.recommendations ? (
                                      <span className={`text-[11px] line-clamp-2 font-semibold text-brand-800`} title={sch.recommendations}>
                                        {sch.recommendations}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">لا توجد توصيات</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center whitespace-nowrap">
                                    {sch.reportFileName || sch.reportFileUrl ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const ext = sch.reportFileName?.split('.').pop() || 'pdf';
                                          setPreviewAttachment({
                                            id: 'insp-arch-' + sch.id,
                                            name: sch.reportFileName || 'تقرير_الكشف.pdf',
                                            type: ext,
                                            url: sch.reportFileUrl || '#',
                                            uploadedAt: sch.lastInspectionDate || getServerIsoDateOnly(),
                                            size: '1.5 MB',
                                          });
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border shadow-sm bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100`}
                                        title="معاينة المرفق أو الصورة الملتقطة"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span className="truncate max-w-[90px]">{sch.reportFileName || 'معاينة المرفق'}</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">لا يوجد مرفق</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    {sch.status !== 'completed' ? (
                                      <button
                                        onClick={() => {
                                          const matchedUnit = units.find((u) => u.code === sch.unitCode);
                                          setShowCompleteModal(sch);
                                          setCompleteDate(sch.lastInspectionDate || getServerIsoDateOnly());
                                          setMaintDate(sch.lastInspectionDate || getServerIsoDateOnly());
                                          setCompletePerformedByName(sch.performedByName || '');
                                          if (matchedUnit) {
                                            setCompleteGrade(sch.conditionGradeGiven || matchedUnit.conditionGrade);
                                          }
                                        }}
                                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1.5 mx-auto whitespace-nowrap bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200`}
                                        title="تحديث وإنجاز نتائج الكشف الدوري"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>تحديث الكشف</span>
                                      </button>
                                    ) : (
                                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-block whitespace-nowrap bg-emerald-100 text-emerald-800 border border-emerald-200`}>
                                        مكتمل وموثق
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

              {/* ARCHIVE 2: MAINTENANCE WORK & REQUESTS */}
              {(archiveModalTab === 'both' || archiveModalTab === 'maintenance') && (
                <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-3 bg-slate-50/80 border-slate-200`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="font-bold text-xs sm:text-sm text-brand-700 flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      <span>أرشيف أعمال وطلبات الصيانة</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500">
                      ({toArabicDigits(maintenanceRequests.filter((r) => r.unitCode === showUnitArchiveModal.code).length)} بلاغ)
                    </span>
                  </div>

                  {maintenanceRequests.filter((r) => r.unitCode === showUnitArchiveModal.code).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">لا توجد بلاغات صيانة سابقة لهذه الوحدة.</div>
                  ) : (
                    <div>
                      {/* Mobile Cards View for Maintenance Archive (md:hidden) */}
                      <div className="md:hidden space-y-3">
                        {maintenanceRequests
                          .filter((r) => r.unitCode === showUnitArchiveModal.code)
                          .map((req) => (
                            <div
                              key={req.id}
                              className={`p-3 rounded-xl border space-y-2.5 transition bg-card border-slate-200 shadow-xs`}
                            >
                              {/* Top: ID, Priority, Status */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono font-bold text-xs text-brand-700`}>
                                    #{toArabicDigits(req.id)}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    req.priority === 'critical'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {req.priority === 'critical' ? 'حرج' : 'عادي'}
                                  </span>
                                </div>

                                <div>
                                  {req.status === 'completed' ? (
                                    <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200`}>
                                      منجز
                                    </span>
                                  ) : req.status === 'rejected' ? (
                                    <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] bg-rose-100 text-rose-800 border-rose-200`}>
                                      مرفوض
                                    </span>
                                  ) : req.status === 'cancelled' ? (
                                    <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] bg-slate-200 text-slate-700 border-slate-300`}>
                                      ملغى
                                    </span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-md font-bold border text-[10px] bg-brand-100 text-brand-800 border-brand-200`}>
                                      قيد المعالجة
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Issue Description */}
                              <div>
                                <h5 className={`font-bold text-xs leading-relaxed text-slate-900`}>
                                  {req.issue}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-brand-50 text-brand-800 border-brand-200`}>
                                    {req.maintenanceDepartment || 'الصيانة العامة'}
                                  </span>
                                </div>
                              </div>

                              {/* Dates Grid */}
                              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 ">
                                <div>
                                  <span className="text-slate-500 text-[10px] block">تاريخ البلاغ:</span>
                                  <span className="font-mono text-[11px] font-medium">{formatDateOnly(req.createdAt)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block">الإنجاز / الإلغاء:</span>
                                  <span className="font-mono text-[11px] font-medium">{getCompletionOrCancellationDate(req.completedAt, req.status)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block">مدة الإنجاز:</span>
                                  <span className={`font-bold text-[11px] text-brand-800`}>
                                    {calculateMaintenanceDurationDays(req.createdAt, req.completedAt, req.status)}
                                  </span>
                                </div>
                              </div>

                              {/* Resolution Notes if available */}
                              {req.resolutionNotes && (
                                <div className={`p-2.5 rounded-xl text-xs space-y-1 bg-slate-50 border border-slate-200`}>
                                  <span className="font-bold text-[10px] text-slate-500 block">ملاحظات ونتائج المعالجة:</span>
                                  <p className={`text-[11px] leading-relaxed text-slate-800`}>
                                    {req.resolutionNotes}
                                  </p>
                                </div>
                              )}

                              {/* Attachment & Action button */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 ">
                                <div>
                                  {req.attachmentUrl || req.attachmentName ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const ext = req.attachmentName?.split('.').pop() || 'jpg';
                                        setPreviewAttachment({
                                          id: 'maint-arch-mob-' + req.id,
                                          name: req.attachmentName || 'صورة_البلاغ.jpg',
                                          type: ext,
                                          url: req.attachmentUrl || '#',
                                          uploadedAt: formatDateOnly(req.createdAt),
                                          size: '1.2 MB',
                                        });
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border min-h-[34px] bg-brand-50 text-brand-800 border-brand-200`}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>معاينة المرفق</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">لا يوجد مرفق</span>
                                  )}
                                </div>

                                <button
                                  onClick={() => {
                                    setEditMaintenanceReq(req);
                                    setMaintNewStatus(req.status === 'cancelled' ? 'cancelled' : 'completed');
                                    setMaintResolutionNotes(req.resolutionNotes || '');
                                    setMaintCompletedDate(req.completedAt?.split(' ')[0] || getServerIsoDateOnly());
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap border flex items-center gap-1 min-h-[34px] bg-brand-100 hover:bg-brand-100 text-brand-800 border-brand-200`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>تحديث الحالة</span>
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Desktop Table View (hidden md:block) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className={`font-bold border-b bg-slate-100 text-slate-700`}>
                            <tr>
                              <th className="p-2 whitespace-nowrap">رقم الطلب</th>
                              <th className="p-2 min-w-[130px] max-w-[180px]">العطل</th>
                              <th className="p-2 whitespace-nowrap">جهة الصيانة</th>
                              <th className="p-2 whitespace-nowrap">حالة الطلب</th>
                              <th className="p-2 whitespace-nowrap">تاريخ الإنجاز / الإلغاء</th>
                              <th className="p-2 whitespace-nowrap text-center">المدة (بالأيام)</th>
                              <th className="p-2 text-center whitespace-nowrap">المرفقات</th>
                              <th className="p-2 min-w-[110px] max-w-[150px]">النتائج</th>
                              <th className="p-2 text-center whitespace-nowrap">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y divide-slate-200`}>
                            {maintenanceRequests
                              .filter((r) => r.unitCode === showUnitArchiveModal.code)
                              .map((req) => (
                                <tr key={req.id} className={'hover:bg-slate-100/80'}>
                                  <td className="p-2 whitespace-nowrap">
                                    <div className="space-y-0.5">
                                      <div className={`font-mono font-bold text-[11px] text-brand-700`}>
                                        {toArabicDigits(req.id)}
                                      </div>
                                      <div className={`text-[10px] font-mono text-slate-500`}>
                                        {formatDateOnly(req.createdAt)}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-2 max-w-[180px]">
                                    <div className={`font-bold text-xs line-clamp-2 text-slate-900`} title={req.issue}>{req.issue}</div>
                                    <div className="mt-0.5">
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                                        req.priority === 'critical'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {req.priority === 'critical' ? 'حرج' : 'عادي'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-100 text-brand-800 border border-brand-200`}>
                                      {req.maintenanceDepartment || 'الصيانة العامة'}
                                    </span>
                                  </td>
                                  <td className="p-2 whitespace-nowrap">
                                    {req.status === 'completed' ? (
                                      <span className={`px-2 py-0.5 rounded font-bold border text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200`}>
                                        منجز
                                      </span>
                                    ) : req.status === 'rejected' ? (
                                      <span className={`px-2 py-0.5 rounded font-bold border text-[10px] bg-rose-100 text-rose-800 border-rose-200`}>
                                        مرفوض
                                      </span>
                                    ) : req.status === 'cancelled' ? (
                                      <span className={`px-2 py-0.5 rounded font-bold border text-[10px] bg-slate-200 text-slate-700 border-slate-300`}>
                                        ملغى
                                      </span>
                                    ) : (
                                      <span className={`px-2 py-0.5 rounded font-bold border text-[10px] bg-brand-100 text-brand-800 border-brand-200`}>
                                        قيد المعالجة
                                      </span>
                                    )}
                                  </td>
                                  <td className={`p-2 font-mono text-[11px] font-semibold whitespace-nowrap text-slate-700`}>{getCompletionOrCancellationDate(req.completedAt, req.status)}</td>
                                  <td className={`p-2 font-bold text-[11px] text-center whitespace-nowrap text-brand-700`}>{calculateMaintenanceDurationDays(req.createdAt, req.completedAt, req.status)}</td>
                                  <td className="p-2 text-center whitespace-nowrap">
                                    {req.attachmentUrl || req.attachmentName ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const ext = req.attachmentName?.split('.').pop() || 'jpg';
                                          setPreviewAttachment({
                                            id: 'maint-arch-' + req.id,
                                            name: req.attachmentName || 'صورة_البلاغ.jpg',
                                            type: ext,
                                            url: req.attachmentUrl || '#',
                                            uploadedAt: formatDateOnly(req.createdAt),
                                            size: '1.2 MB',
                                          });
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border shadow-sm bg-brand-50 text-brand-800 border-brand-200 hover:bg-brand-100`}
                                        title="معاينة صورة أو مرفق طلب الصيانة"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span className="truncate max-w-[80px]">{req.attachmentName || 'معاينة'}</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">لا يوجد مرفق</span>
                                    )}
                                  </td>
                                  <td className="p-2 max-w-[150px]">
                                    {req.resolutionNotes ? (
                                      <span className={`text-[10px] line-clamp-2 block text-slate-700`} title={req.resolutionNotes}>{req.resolutionNotes}</span>
                                    ) : (
                                      <span className="text-slate-500 text-[10px]">لا توجد ملاحظات</span>
                                    )}
                                  </td>
                                  <td className="p-2 text-center whitespace-nowrap">
                                    <button
                                      onClick={() => {
                                        setEditMaintenanceReq(req);
                                        setMaintNewStatus(req.status === 'cancelled' ? 'cancelled' : 'completed');
                                        setMaintResolutionNotes(req.resolutionNotes || '');
                                        setMaintCompletedDate(req.completedAt?.split(' ')[0] || getServerIsoDateOnly());
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition whitespace-nowrap border bg-brand-100 hover:bg-brand-100 text-brand-800 border-brand-200`}
                                    >
                                      تحديث الحالة
                                    </button>
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
            </div>

            {/* Footer with Actions */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t shrink-0 border-slate-200`}>
              <button
                onClick={() => window.print()}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300`}
              >
                <Printer className="w-4 h-4" />
                <span>طباعة أرشيف الوحدة الشامل</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {onNavigateTab && (
                  <button
                    onClick={() => {
                      setShowUnitArchiveModal(null);
                      onNavigateTab('reports');
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-brand-700 text-on-brand rounded-xl text-xs font-black hover:bg-brand-800 flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[40px]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>الاطلاع عبر التقارير</span>
                  </button>
                )}

                <button
                  onClick={() => setShowUnitArchiveModal(null)}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] flex items-center justify-center bg-slate-200 text-slate-800 hover:bg-slate-300`}
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
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto bg-slate-900/40`}>
          <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-lg space-y-3.5 sm:space-y-4 shadow-2xl relative my-2 sm:my-8 border bg-card border-slate-200 text-slate-900`}>
            <div className={`flex items-center justify-between border-b pb-3 border-slate-200`}>
              <h3 className={`font-bold text-sm sm:text-base text-slate-900`}>
                معالجة وتغيير حالة طلب الصيانة ({toArabicDigits(editMaintenanceReq.id)})
              </h3>
              <button onClick={() => setEditMaintenanceReq(null)} className={`p-1.5 rounded-lg cursor-pointer text-slate-400 hover:text-slate-700 hover:bg-slate-100`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenanceResolution} className="space-y-3 text-xs">
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-700 font-bold leading-relaxed">
                الوحدة: {toArabicDigits(editMaintenanceReq.unitCode)} | المشكلة: {editMaintenanceReq.issue}
              </div>

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  تعديل حالة طلب الصيانة:
                </label>
                <select
                  value={maintNewStatus}
                  onChange={(e) => setMaintNewStatus(e.target.value as MaintenanceStatus)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border text-xs sm:text-sm bg-slate-50 border-slate-200 text-slate-900`}
                >
                  <option value="completed">تمت المعالجة و الانجاز</option>
                  <option value="rejected">تم رفض طلب الصيانة</option>
                  <option value="cancelled">تم الغاء طلب الصيانة</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  تاريخ الإنجاز أو الإلغاء:
                </label>
                <input
                  type="date"
                  value={maintCompletedDate}
                  onChange={(e) => setMaintCompletedDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold outline-none border text-xs sm:text-sm bg-slate-50 border-slate-200 text-slate-900`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  ملاحظات وتفاصيل المعالجة والإصلاح:
                </label>
                <textarea
                  value={maintResolutionNotes}
                  onChange={(e) => setMaintResolutionNotes(e.target.value)}
                  placeholder="سجل التفاصيل الفنية لأعمال الإصلاح والصيانة المنفذة..."
                  rows={3}
                  className={`w-full rounded-xl p-2.5 outline-none border text-xs sm:text-sm leading-relaxed bg-slate-50 border-slate-200 text-slate-900`}
                />
              </div>

              <div className={`flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-200`}>
                <button
                  type="button"
                  onClick={() => setEditMaintenanceReq(null)}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold transition cursor-pointer min-h-[40px] flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-brand-700 text-on-brand font-black rounded-xl hover:bg-brand-800 transition cursor-pointer min-h-[40px] flex items-center justify-center shadow-md "
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
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto bg-slate-900/40`}>
          <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 w-full max-w-md space-y-4 sm:space-y-5 shadow-2xl relative my-2 sm:my-8 border bg-card border-red-200 text-slate-900`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 flex items-center justify-center shrink-0 font-bold">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className={`font-black text-sm sm:text-base text-red-900`}>
                  تأكيد حذف جدول الكشف الدوري
                </h3>
                <p className={`text-[11px] sm:text-xs text-slate-500`}>
                  تنبيه: إجراء الحذف نهائي
                </p>
              </div>
            </div>

            <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border space-y-2 text-xs bg-slate-50 border-slate-200`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-bold shrink-0">الوحدة الهندسية:</span>
                <span className="font-extrabold truncate text-left">{deleteConfirmSchedule.unitCode} - {deleteConfirmSchedule.unitName}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1.5">
                <span className="text-slate-500 font-bold shrink-0">عنوان الكشف:</span>
                <span className="font-bold truncate text-left">{deleteConfirmSchedule.title}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1.5">
                <span className="text-slate-500 font-bold shrink-0">الموقع:</span>
                <span className="font-bold truncate text-left">محافظة {deleteConfirmSchedule.governorate} | حقل {deleteConfirmSchedule.field}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1.5">
                <span className="text-slate-500 font-bold shrink-0">الموعد القادم:</span>
                <span className="font-mono font-bold text-brand-700">{toArabicDigits(deleteConfirmSchedule.nextDueDate)}</span>
              </div>
            </div>

            <p className={`text-xs leading-relaxed text-slate-600`}>
              هل أنت متأكد من رغبتك في حذف هذا الجدول من قائمة المعاينات الدوريّة؟ لن تتمكن من التراجع عن هذا الإجراء.
            </p>

            <div className={`flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-200`}>
              <button
                type="button"
                onClick={() => setDeleteConfirmSchedule(null)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer min-h-[40px] flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200`}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 shadow-md shadow-red-600/20 transition cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px]"
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
