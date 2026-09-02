import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Clock,
  AlertTriangle,
  Plus,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpRight,
  UserCheck,
  Edit3,
  FileText,
  X,
  XCircle,
  Upload,
  Trash2,
  Eye,
  Camera,
  Image as ImageIcon,
  Layers,
  Paperclip,
  ShieldAlert,
  Building2,
  Ban,
  Calendar,
  ArrowUpDown,
  RotateCcw,
  DoorClosed,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority, UnitAsset, ReportAttachment, SystemUser, MaintenanceDepartmentRef } from '../types';
import {
  toArabicDigits,
  formatDateOnly,
  getCompletionOrCancellationDate,
  calculateMaintenanceDurationDays,
} from '../utils/arabicUtils';
import { AttachmentViewerModal, AttachmentViewerItem } from './AttachmentViewerModal';

interface MaintenanceViewProps {
  requests: MaintenanceRequest[];
  units?: UnitAsset[];
  currentUser?: SystemUser | null;
  maintenanceDepartments?: MaintenanceDepartmentRef[];
  onOpenNewMaintenanceModal: () => void;
  onUpdateMaintenanceRequest?: (updated: MaintenanceRequest) => void;
  onDeleteMaintenanceRequest?: (id: string) => void;
  theme?: 'dark' | 'light';
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  requests,
  units = [],
  currentUser,
  maintenanceDepartments = [],
  onOpenNewMaintenanceModal,
  onUpdateMaintenanceRequest,
  onDeleteMaintenanceRequest,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const isMaintenanceEmployee = currentUser?.role === 'موظف الصيانة' || currentUser?.role === 'maintenance_employee';
  const employeeDept = currentUser?.maintenanceDepartment;

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest_first' | 'oldest_first'>('newest_first');
  const [searchCode, setSearchCode] = useState<string>('');

  // View Notes Popup Modal state
  const [viewNotesReq, setViewNotesReq] = useState<MaintenanceRequest | null>(null);
  const [copiedNotes, setCopiedNotes] = useState<boolean>(false);

  // Available maintenance departments list (dynamically sourced from Settings / maintenanceDepartments registry)
  const availableDepartments = useMemo(() => {
    // If settings has maintenanceDepartments, use active ones primarily
    if (maintenanceDepartments && maintenanceDepartments.length > 0) {
      const depts = maintenanceDepartments
        .filter((d) => d.status === 'active')
        .map((d) => d.nameAr.trim());
      
      // Also include any department name referenced in existing requests to avoid missing data
      requests.forEach((r) => {
        if (r.maintenanceDepartment && r.maintenanceDepartment.trim()) {
          const trimmed = r.maintenanceDepartment.trim();
          if (!depts.includes(trimmed)) {
            depts.push(trimmed);
          }
        }
      });
      return depts;
    }

    // Fallback if empty
    const depts = new Set<string>([
      'الصيانة الكهربائية',
      'الصيانة الميكانيكية',
      'صيانة التبريد والتكييف',
      'صيانة المباني والمدني',
      'صيانة الآلات الدقيقة والتحكم',
      'الصيانة العامة والخدمات',
    ]);
    requests.forEach((r) => {
      if (r.maintenanceDepartment && r.maintenanceDepartment.trim()) {
        depts.add(r.maintenanceDepartment.trim());
      }
    });
    return Array.from(depts);
  }, [maintenanceDepartments, requests]);

  // Status Change / Resolution modal state
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);
  const [actionModalType, setActionModalType] = useState<'complete' | 'reject' | 'edit_status' | null>(null);
  const [status, setStatus] = useState<MaintenanceStatus>('completed');
  const [completedAtDate, setCompletedAtDate] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Full Edit Request modal state (Admin only)
  const [fullEditReq, setFullEditReq] = useState<MaintenanceRequest | null>(null);
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<MaintenanceRequest | null>(null);
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editPriority, setEditPriority] = useState<MaintenancePriority>('normal');
  const [editMaintenanceDepartment, setEditMaintenanceDepartment] = useState('الصيانة الكهربائية');
  const [editStatus, setEditStatus] = useState<MaintenanceStatus>('open');

  // Preview Attachment Modal State
  const [previewAttachment, setPreviewAttachment] = useState<{
    attachments: AttachmentViewerItem[];
    initialIndex: number;
    unitCode?: string;
  } | null>(null);

  // Filter requests based on status, search, and maintenance employee department
  const visibleRequests = useMemo(() => {
    return requests.filter((r) => {
      if (isMaintenanceEmployee && employeeDept) {
        return r.maintenanceDepartment === employeeDept;
      }
      return true;
    });
  }, [requests, isMaintenanceEmployee, employeeDept]);

  const filteredRequests = useMemo(() => {
    const list = visibleRequests.filter((r) => {
      // 1. Status Filter
      const matchStatus =
        filterStatus === 'all' ||
        r.status === filterStatus ||
        (filterStatus === 'in_progress' && (r.status === 'open' || r.status === 'assigned' || r.status === 'in_progress' || r.status === 'overdue'));

      // 2. Department Filter
      const matchDepartment =
        filterDepartment === 'all' ||
        r.maintenanceDepartment === filterDepartment;

      // 3. Priority Filter
      const matchPriority =
        filterPriority === 'all' ||
        r.priority === filterPriority;

      // 4. Search Filter
      const matchedUnit = units.find((u) => u.code === r.unitCode || u.id === r.unitCode);
      const unitName = r.unitName || matchedUnit?.name || '';
      const department = matchedUnit?.department || '';
      const reqMaintDept = r.maintenanceDepartment || '';

      const matchSearch =
        !searchCode ||
        r.id.toLowerCase().includes(searchCode.toLowerCase()) ||
        r.unitCode.toLowerCase().includes(searchCode.toLowerCase()) ||
        unitName.toLowerCase().includes(searchCode.toLowerCase()) ||
        department.toLowerCase().includes(searchCode.toLowerCase()) ||
        reqMaintDept.toLowerCase().includes(searchCode.toLowerCase()) ||
        r.issue.toLowerCase().includes(searchCode.toLowerCase());

      return matchStatus && matchDepartment && matchPriority && matchSearch;
    });

    // 5. Date Sort Order (newest first vs oldest first)
    return [...list].sort((a, b) => {
      const dateA = new Date(a.createdAt || '').getTime() || 0;
      const dateB = new Date(b.createdAt || '').getTime() || 0;
      if (sortOrder === 'oldest_first') {
        return dateA - dateB;
      }
      return dateB - dateA;
    });
  }, [visibleRequests, filterStatus, filterDepartment, filterPriority, sortOrder, searchCode, units]);

  // Dynamic Metrics Calculations (Based on visible requests)
  const openCount = visibleRequests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'rejected').length;
  const rejectedCount = visibleRequests.filter((r) => r.status === 'rejected').length;
  const cancelledCount = visibleRequests.filter((r) => r.status === 'cancelled').length;
  const inProgressCount = visibleRequests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'rejected').length;
  const completedCount = visibleRequests.filter((r) => r.status === 'completed').length;

  // Open Complete modal
  const handleOpenCompleteModal = (req: MaintenanceRequest) => {
    setSelectedReq(req);
    setActionModalType('complete');
    setStatus('completed');
    setCompletedAtDate(req.completedAt?.split(' ')[0] || new Date().toISOString().split('T')[0]);
    setResolutionNotes(req.resolutionNotes || '');
    setRejectionReason('');
    setFormError(null);
  };

  // Open Reject modal (with mandatory rejection reason)
  const handleOpenRejectModal = (req: MaintenanceRequest) => {
    setSelectedReq(req);
    setActionModalType('reject');
    setStatus('rejected');
    setCompletedAtDate(req.completedAt?.split(' ')[0] || new Date().toISOString().split('T')[0]);
    setRejectionReason(req.rejectionReason || '');
    setResolutionNotes('');
    setFormError(null);
  };

  // Open generic status edit modal (for Admin/Management)
  const handleOpenEditModal = (req: MaintenanceRequest) => {
    setSelectedReq(req);
    setActionModalType('edit_status');
    setStatus(req.status || 'in_progress');
    setCompletedAtDate(req.completedAt?.split(' ')[0] || new Date().toISOString().split('T')[0]);
    setResolutionNotes(req.resolutionNotes || '');
    setRejectionReason(req.rejectionReason || '');
    setFormError(null);
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !onUpdateMaintenanceRequest) return;

    if (actionModalType === 'reject' || status === 'rejected') {
      if (!rejectionReason.trim()) {
        setFormError('يرجى تسجيل سبب رفض طلب الصيانة بدقة (هذا الحقل إلزامي).');
        return;
      }
    }

    const isDoneOrClosed = status === 'completed' || status === 'cancelled' || status === 'rejected';

    const updated: MaintenanceRequest = {
      ...selectedReq,
      status: status,
      resolutionNotes:
        status === 'rejected'
          ? `تم رفض الطلب: ${rejectionReason.trim()}`
          : resolutionNotes.trim(),
      rejectionReason: status === 'rejected' ? rejectionReason.trim() : undefined,
      completedBy: currentUser?.name || 'موظف الصيانة',
      completedAt: completedAtDate || new Date().toISOString().split('T')[0],
      daysOverdue: isDoneOrClosed ? 0 : selectedReq.daysOverdue,
    };

    onUpdateMaintenanceRequest(updated);
    setSelectedReq(null);
    setActionModalType(null);
    setFormError(null);
  };

  const handleOpenFullEdit = (req: MaintenanceRequest) => {
    if (isMaintenanceEmployee) return; // Prevented for maintenance employee
    setFullEditReq(req);
    setEditCreatedAt(req.createdAt ? req.createdAt.split(' ')[0] : new Date().toISOString().split('T')[0]);
    setEditUnitCode(req.unitCode || '');
    setEditIssue(req.issue || '');
    setEditPriority(req.priority || 'normal');
    setEditMaintenanceDepartment(req.maintenanceDepartment || 'الصيانة الكهربائية');
    setEditStatus(req.status || 'open');
  };

  const handleSaveFullEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullEditReq || !onUpdateMaintenanceRequest) return;

    const updated: MaintenanceRequest = {
      ...fullEditReq,
      createdAt: editCreatedAt,
      unitCode: editUnitCode,
      issue: editIssue,
      priority: editPriority,
      maintenanceDepartment: editMaintenanceDepartment,
      status: editStatus,
    };

    onUpdateMaintenanceRequest(updated);
    setFullEditReq(null);
  };

  return (
    <div className="space-y-6">
      {/* Maintenance Employee Department Notification Banner */}
      {isMaintenanceEmployee && (
        <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-amber-500 text-sm">
                حساب موظف صيانة معتمد ({currentUser?.name})
              </div>
              <div className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                جهة الصيانة المخصصة للحساب: <strong className="text-amber-400 font-black underline">{employeeDept || 'غير محدد'}</strong>. يتم عرض الطلبات الموجهة لقسمك فقط مع صلاحية <strong className="text-emerald-400">إنجاز الطلب</strong> أو <strong className="text-rose-400">رفض الطلب مع ذكر السبب</strong>.
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold">
            صلاحية الإنجاز والرفض
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className={`rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Wrench className="w-5 h-5 text-amber-400" />
            <span>إدارة طلبات الصيانة</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {isMaintenanceEmployee
              ? `متابعة وإنجاز أو رفض طلبات ${employeeDept || 'الصيانة'} الموجهة لحسابك وتوثيق الملاحظات`
              : 'متابعة بلاغات الأعطال، معالجة وتعديل حالة الطلب، وتوجيهها لجهات الصيانة المختصة'}
          </p>
        </div>

        {!isMaintenanceEmployee && (
          <button
            onClick={onOpenNewMaintenanceModal}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ طلب صيانة جديد</span>
          </button>
        )}
      </div>

      {/* SLA Metrics Cards */}
      <div className="space-y-2">
        {isMaintenanceEmployee && employeeDept && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-bold w-fit">
            <Wrench className="w-3.5 h-3.5" />
            <span>إحصائيات وبلاغات خاصة باختصاص: {employeeDept}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <div className={`rounded-xl p-4 flex items-center justify-between border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'}`}>
            <div>
              <span className={`text-xs block font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isMaintenanceEmployee ? `إجمالي بلاغات (${employeeDept || 'قسمكم'}):` : 'إجمالي البلاغات والطلبات:'}
              </span>
              <span className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {toArabicDigits(visibleRequests.length)}{' '}
                <span className="text-sm font-bold text-amber-500">({toArabicDigits(openCount)} نشط)</span>
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <Wrench className="w-6 h-6" />
            </div>
          </div>

          <div className={`rounded-xl p-4 flex items-center justify-between border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'}`}>
            <div>
              <span className={`text-xs block font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isMaintenanceEmployee ? 'قيد المعالجة (قسمكم):' : 'قيد المعالجة والتنفيذ:'}
              </span>
              <span className="text-2xl font-black text-sky-400">{toArabicDigits(inProgressCount)} طلب</span>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className={`rounded-xl p-4 flex items-center justify-between border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'}`}>
            <div>
              <span className={`text-xs block font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isMaintenanceEmployee ? 'تمت المعالجة (قسمكم):' : 'تمت المعالجة والإنجاز:'}
              </span>
              <span className="text-2xl font-black text-emerald-400">{toArabicDigits(completedCount)} طلب</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className={`rounded-xl p-4 flex items-center justify-between border ${isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'}`}>
            <div>
              <span className={`text-xs block font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isMaintenanceEmployee ? 'مرفوضة / ملغاة (قسمكم):' : 'طلبات مرفوضة / ملغاة:'}
              </span>
              <span className="text-2xl font-black text-rose-400">{toArabicDigits(rejectedCount + cancelledCount)} طلب</span>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Data */}
      <div className={`rounded-2xl p-5 shadow-lg space-y-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-800/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>سجل بلاغات الصيانة والطلبات الميدانية</h3>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono font-bold text-xs">
                {toArabicDigits(filteredRequests.length)} طلب
              </span>
            </div>

            {/* Clear Filters Button if any filter active */}
            {(filterStatus !== 'all' || filterDepartment !== 'all' || filterPriority !== 'all' || searchCode || sortOrder !== 'newest_first') && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterDepartment('all');
                  setFilterPriority('all');
                  setSearchCode('');
                  setSortOrder('newest_first');
                }}
                className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer font-bold w-fit ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <RotateCcw className="w-3 h-3 text-amber-500" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>

          {/* Filters Bar: Sort Order, Status, Department, Priority, Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
            {/* 1. Sort Order Filter */}
            <div className="flex flex-col gap-1">
              <label className={`text-[11px] font-bold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <ArrowUpDown className="w-3 h-3 text-amber-500" />
                <span>الترتيب الزمني:</span>
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest_first' | 'oldest_first')}
                className={`w-full rounded-lg px-2.5 py-2 focus:outline-none border font-semibold ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                }`}
              >
                <option value="newest_first">من الأحدث إلى الأقدم (الأحدث أولاً)</option>
                <option value="oldest_first">من الأقدم إلى الأحدث (الأقدم أولاً)</option>
              </select>
            </div>

            {/* 2. Status Filter */}
            <div className="flex flex-col gap-1">
              <label className={`text-[11px] font-bold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Clock className="w-3 h-3 text-amber-500" />
                <span>حالة الطلب:</span>
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full rounded-lg px-2.5 py-2 focus:outline-none border font-semibold ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                }`}
              >
                <option value="all">كافة الحالات</option>
                <option value="in_progress">قيد المعالجة والتنفيذ</option>
                <option value="completed">تمت المعالجة والإنجاز</option>
                <option value="rejected">تم رفض طلب الصيانة</option>
                <option value="cancelled">تم إلغاء طلب الصيانة</option>
              </select>
            </div>

            {/* 3. Maintenance Department Filter */}
            <div className="flex flex-col gap-1">
              <label className={`text-[11px] font-bold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Wrench className="w-3 h-3 text-amber-500" />
                <span>جهة الصيانة:</span>
              </label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                disabled={Boolean(isMaintenanceEmployee && employeeDept)}
                className={`w-full rounded-lg px-2.5 py-2 focus:outline-none border font-semibold ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                } ${isMaintenanceEmployee && employeeDept ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <option value="all">كافة جهات الصيانة</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Priority Filter */}
            <div className="flex flex-col gap-1">
              <label className={`text-[11px] font-bold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>درجة الأولوية:</span>
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className={`w-full rounded-lg px-2.5 py-2 focus:outline-none border font-semibold ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                }`}
              >
                <option value="all">كافة درجات الأولوية</option>
                <option value="critical">حرج جداً (طارئ وفوري)</option>
                <option value="normal">عادي (اعتيادي)</option>
                <option value="low">منخفض (وقائي / ثانوي)</option>
              </select>
            </div>

            {/* 5. Search Filter */}
            <div className="flex flex-col gap-1">
              <label className={`text-[11px] font-bold flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Search className="w-3 h-3 text-amber-500" />
                <span>بحث بالرمز أو العطل:</span>
              </label>
              <div className="relative">
                <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="ابحث بالرمز، الوحدة، العطل..."
                  className={`w-full rounded-lg pr-8 pl-2 py-2 text-xs focus:outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] table-fixed">
            <thead className={`border-b ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/50 border-slate-800 text-slate-400'}`}>
              <tr>
                <th className="py-2.5 px-2.5 font-semibold w-[12%]">رقم وتاريخ الطلب</th>
                <th className="py-2.5 px-3 font-bold w-[30%]">رمز واسم وبيانات المنشأة</th>
                <th className="py-2.5 px-2 font-semibold w-[9%]">جهة الصيانة</th>
                <th className="py-2.5 px-2 font-semibold w-[15%]">العطل</th>
                <th className="py-2.5 px-1 font-semibold text-center w-[5%]">الأولوية</th>
                <th className="py-2.5 px-2 font-semibold w-[9%]">مقدّم الطلب</th>
                <th className="py-2.5 px-1 font-semibold text-center w-[5%]">حالة الطلب</th>
                <th className="py-2.5 px-1.5 font-semibold text-center w-[8%]">تاريخ الإنجاز والمدة</th>
                <th className="py-2.5 px-1 font-semibold text-center w-[4%]">المرفقات</th>
                <th className="py-2.5 px-1 font-semibold text-center w-[4%]">النتائج</th>
                <th className="py-2.5 px-1.5 font-semibold text-center w-[7%]">الإجراءات</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-300'}`}>
              {filteredRequests.map((req) => {
                const matchedUnit = units.find((u) => u.code === req.unitCode || u.id === req.unitCode);
                const unitName = req.unitName || matchedUnit?.name || 'غير محدد';
                const unitOccupant = matchedUnit
                  ? (matchedUnit.departments && matchedUnit.departments.length > 0
                      ? Array.from(new Set(matchedUnit.departments.filter(Boolean))).join(' ، ')
                      : matchedUnit.department ||
                        (matchedUnit.rooms && matchedUnit.rooms.length > 0
                          ? Array.from(new Set(matchedUnit.rooms.map((r) => r.occupiedBy).filter(Boolean))).join(' ، ')
                          : '')) || 'عام / غير محدد'
                  : 'عام / غير محدد';

                const matchedRoom = req.roomCode && matchedUnit?.rooms
                  ? matchedUnit.rooms.find((r) => r.code === req.roomCode || r.id === req.roomCode)
                  : undefined;
                const roomOccupant = req.roomCode
                  ? (req.occupyingEntity || matchedRoom?.occupiedBy || 'غير محدد')
                  : undefined;

                const hasNotes = Boolean(
                  req.resolutionNotes?.trim() ||
                  req.rejectionReason?.trim() ||
                  req.status === 'completed' ||
                  req.status === 'rejected'
                );

                return (
                  <tr key={req.id} className="hover:bg-amber-50/20 dark:hover:bg-slate-800/40 transition">
                    {/* رقم الطلب مدمج مع تاريخ الطلب */}
                    <td className="py-3 px-2 align-middle">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-amber-500 text-[11px]">
                          {toArabicDigits(req.id)}
                        </div>
                        <div className={`text-[10px] font-mono flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Calendar className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span>{formatDateOnly(req.createdAt)}</span>
                        </div>
                      </div>
                    </td>

                    {/* رمز واسم المنشأة والجهة الشاغلة وبيانات الغرفة */}
                    <td className="py-3 px-2.5 align-middle">
                      <div className="space-y-1">
                        {/* السطر 1: رمز المنشأة واسمها */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-mono font-black text-amber-500 dark:text-amber-400 text-xs flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            <span>{toArabicDigits(req.unitCode)}</span>
                          </div>
                          <span className="opacity-40">•</span>
                          <div className={`font-black text-xs leading-snug break-words ${isLight ? 'text-slate-900' : 'text-slate-100'}`} title={unitName}>
                            {unitName}
                          </div>
                        </div>

                        {/* السطر 2: الجهة الشاغلة للمنشأة */}
                        <div className={`text-[10.5px] leading-tight flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`} title={unitOccupant}>
                          <UserCheck className="w-3 h-3 text-sky-500 shrink-0" />
                          <span className="opacity-75">الجهة الشاغلة:</span>
                          <span className="font-bold truncate">{unitOccupant}</span>
                        </div>

                        {/* السطر 3: في حال كان الطلب لصيانة غرفة - رمز الغرفة والجهة الشاغلة لها */}
                        {req.roomCode && (
                          <div className="pt-1 mt-1 border-t border-slate-200/70 dark:border-slate-800/70 space-y-0.5">
                            <div className="font-bold text-[10.5px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-md w-fit" title={`الغرفة: ${req.roomCode}${req.roomName ? ` - ${req.roomName}` : ''}`}>
                              <DoorClosed className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span className="font-mono font-bold">غرفة: {toArabicDigits(req.roomCode)}</span>
                              {req.roomName && <span>• {req.roomName}</span>}
                              {req.roomFloor && <span className="text-[9.5px] opacity-80 font-sans">({req.roomFloor})</span>}
                            </div>
                            <div className="text-[10px] leading-tight flex items-center gap-1 text-emerald-700 dark:text-emerald-400 pr-0.5" title={roomOccupant}>
                              <span className="opacity-75">شاغل الغرفة:</span>
                              <span className="font-bold truncate">{roomOccupant}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* جهة الصيانة */}
                    <td className="py-3 px-2 align-middle">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 block truncate text-center" title={req.maintenanceDepartment || 'الصيانة العامة'}>
                        {req.maintenanceDepartment || 'الصيانة العامة'}
                      </span>
                    </td>

                    {/* العطل */}
                    <td className="py-3 px-2 align-middle">
                      <div className={`font-bold text-[11px] line-clamp-3 leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`} title={req.issue}>
                        {req.issue}
                      </div>
                    </td>

                    {/* الأولوية */}
                    <td className="py-3 px-1.5 text-center align-middle">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-block ${
                          req.priority === 'critical'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : req.priority === 'low'
                            ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {req.priority === 'critical' ? 'حرج جداً' : req.priority === 'low' ? 'منخفض' : 'عادي'}
                      </span>
                    </td>

                    {/* مقدّم الطلب */}
                    <td className="py-3 px-2 align-middle">
                      <div className="flex items-center gap-1 font-bold text-[11px]">
                        <UserCheck className={`w-3 h-3 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                        <span className={`truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`} title={req.reportedBy}>
                          {req.reportedBy || 'غير معروف'}
                        </span>
                      </div>
                    </td>

                    {/* حالة الطلب */}
                    <td className="py-3 px-1 text-center align-middle">
                      {req.status === 'completed' ? (
                        <span
                          className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-1.5 rounded-lg inline-flex items-center justify-center transition"
                          title="حالة الطلب: منجز"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      ) : req.status === 'rejected' ? (
                        <span
                          className="bg-rose-500/20 text-rose-400 border border-rose-500/30 p-1.5 rounded-lg inline-flex items-center justify-center transition"
                          title="حالة الطلب: مرفوض"
                        >
                          <Ban className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      ) : req.status === 'cancelled' ? (
                        <span
                          className="bg-slate-500/20 text-slate-400 border border-slate-500/30 p-1.5 rounded-lg inline-flex items-center justify-center transition"
                          title="حالة الطلب: ملغى"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      ) : (
                        <span
                          className="bg-amber-500/20 text-amber-400 border border-amber-500/30 p-1.5 rounded-lg inline-flex items-center justify-center transition"
                          title="حالة الطلب: قيد المعالجة"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      )}
                    </td>

                    {/* تاريخ الإنجاز / الرفض + المدة مدمجة */}
                    <td className="py-3 px-1.5 text-center align-middle font-mono text-[10px]">
                      <div className="space-y-0.5">
                        <div className="font-semibold truncate">
                          {getCompletionOrCancellationDate(req.completedAt, req.status)}
                        </div>
                        <div className="text-amber-400 font-bold text-[9.5px]">
                          المدة: {calculateMaintenanceDurationDays(req.createdAt, req.completedAt, req.status)}
                        </div>
                      </div>
                    </td>

                    {/* المرفقات - أيقونة فقط عند الضغط عليها تفتح الملف المرفق */}
                    <td className="py-3 px-1 text-center align-middle">
                      {(() => {
                        const reqAttachments: ReportAttachment[] =
                          req.attachments && req.attachments.length > 0
                            ? req.attachments
                            : req.attachmentUrl || req.attachmentName
                            ? [
                                {
                                  id: `maint-att-${req.id}`,
                                  name: req.attachmentName || 'صورة_البلاغ.jpg',
                                  url: req.attachmentUrl,
                                  type: 'image/jpeg',
                                },
                              ]
                            : [];

                        if (reqAttachments.length === 0) {
                          return <span className="text-slate-500 text-xs font-mono">—</span>;
                        }

                        const itemsToPreview: AttachmentViewerItem[] = reqAttachments.map((a, i) => ({
                          id: a.id || `maint-att-${req.id}-${i}`,
                          name: a.name || `مرفق_طلب_صيانة_${toArabicDigits(i + 1)}.jpg`,
                          type: a.type || 'image/jpeg',
                          url: a.url || req.attachmentUrl || '#',
                          uploadDate: formatDateOnly(req.createdAt),
                          category: `مرفق طلب صيانة (${toArabicDigits(i + 1)} من ${toArabicDigits(reqAttachments.length)})`,
                        }));

                        return (
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewAttachment({
                                  attachments: itemsToPreview,
                                  initialIndex: 0,
                                  unitCode: req.unitCode,
                                });
                              }}
                              className={`relative inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-sm group hover:scale-110 active:scale-95 ${
                                isLight
                                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400'
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25 hover:border-amber-400'
                              }`}
                              title={
                                reqAttachments.length > 1
                                  ? `معاينة وفتح جميع المرفقات (${toArabicDigits(reqAttachments.length)} مرفقات)`
                                  : 'معاينة وفتح الملف المرفق'
                              }
                            >
                              <Paperclip className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-400 transition-colors" />
                              {reqAttachments.length > 1 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-500 text-slate-950 text-[8.5px] font-black flex items-center justify-center shadow-md border border-slate-900">
                                  {toArabicDigits(reqAttachments.length)}
                                </span>
                              )}
                            </button>
                          </div>
                        );
                      })()}
                    </td>

                    {/* النتائج والملاحظات - أيقونة مصغرة مع تلميح */}
                    <td className="py-3 px-1 text-center align-middle">
                      {hasNotes ? (
                        <button
                          type="button"
                          onClick={() => setViewNotesReq(req)}
                          className={`p-1.5 rounded-lg text-[10px] font-extrabold inline-flex items-center justify-center transition cursor-pointer border shadow-xs group hover:scale-110 active:scale-95 ${
                            req.status === 'rejected'
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              : req.status === 'completed'
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          }`}
                          title={
                            req.status === 'rejected'
                              ? 'عرض سبب الرفض والملاحظات الفنية بالتفصيل'
                              : req.status === 'completed'
                              ? 'عرض تقرير الإنجاز ونتائج الصيانة بالتفصيل'
                              : 'عرض ملاحظات المعالجة والتوجيهات'
                          }
                        >
                          {req.status === 'rejected' ? (
                            <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          ) : req.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono select-none">—</span>
                      )}
                    </td>

                    {/* الإجراءات - أزرار أيقونات مصغرة */}
                    <td className="py-3 px-1 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {isMaintenanceEmployee ? (
                          <>
                            {req.status !== 'completed' && req.status !== 'rejected' && req.status !== 'cancelled' ? (
                              <>
                                {/* Complete Request Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenCompleteModal(req)}
                                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer flex items-center justify-center shadow-sm shadow-emerald-500/20 hover:scale-105 active:scale-95"
                                  title="إنجاز وتوثيق أعمال الصيانة"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Reject Request Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(req)}
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                                  title="رفض الطلب مع تسجيل سبب الرفض"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : req.status === 'completed' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCompleteModal(req)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                                title="تعديل تقرير الإنجاز"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            ) : req.status === 'rejected' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(req)}
                                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                                title="تعديل سبب الرفض"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[10px]">مغلق</span>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Admin / General operator actions */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmReq(req)}
                              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-lg transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                              title="حذف طلب الصيانة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(req)}
                              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 ${
                                req.status === 'completed'
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                              }`}
                              title={
                                req.status === 'completed'
                                  ? 'معاينة / تعديل حالة الإنجاز'
                                  : req.status === 'rejected'
                                  ? 'معاينة / تعديل سبب الرفض'
                                  : 'معالجة وتحديث حالة الصيانة'
                              }
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPDATE / COMPLETE / REJECT MAINTENANCE REQUEST MODAL */}
      {selectedReq && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2">
                {actionModalType === 'reject' ? (
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Ban className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {actionModalType === 'reject'
                      ? 'توثيق رفض طلب الصيانة'
                      : isMaintenanceEmployee
                      ? 'توثيق إنجاز طلب الصيانة'
                      : `معالجة وتحديث حالة طلب الصيانة (${toArabicDigits(selectedReq.id)})`}
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    رقم الطلب: <span className="font-mono text-amber-500 font-bold">{selectedReq.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedReq(null);
                  setActionModalType(null);
                  setFormError(null);
                }}
                className={`p-1.5 rounded-xl cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700 bg-slate-100' : 'text-slate-400 hover:text-slate-200 bg-slate-800'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 font-bold text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUpdate} className="space-y-3 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 font-bold space-y-1">
                <div>الوحدة: {toArabicDigits(selectedReq.unitCode)} | المشكلة: {selectedReq.issue}</div>
                <div className="text-[11px] text-amber-300/80">جهة الصيانة: {selectedReq.maintenanceDepartment || 'عامة'}</div>
              </div>

              {/* Specific info banner based on action */}
              {actionModalType === 'reject' ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-[11px] leading-relaxed">
                  سيتم تعيين حالة الطلب إلى <strong>(مرفوض)</strong> مع توثيق اسمك ({currentUser?.name}) كمسؤول اتخاذ الإجراء وحفظ سبب الرفض في سجل التدقيق.
                </div>
              ) : isMaintenanceEmployee ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                  سيتم تعيين حالة الطلب إلى <strong>(منجز)</strong> وتسجيل اسمك ({currentUser?.name}) كمسؤول الإنجاز وتوثيق التقرير الفني.
                </div>
              ) : (
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    تعديل حالة طلب الصيانة:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                    className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    <option value="in_progress">قيد المعالجة</option>
                    <option value="completed">منجز</option>
                    <option value="rejected">مرفوض</option>
                    <option value="cancelled">ملغى</option>
                  </select>
                </div>
              )}

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  {actionModalType === 'reject' || status === 'rejected' ? 'تاريخ الرفض:' : 'تاريخ الإنجاز:'}
                </label>
                <input
                  type="date"
                  value={completedAtDate}
                  onChange={(e) => setCompletedAtDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              {/* Mandatory Rejection Reason field when rejecting */}
              {(actionModalType === 'reject' || status === 'rejected') ? (
                <div>
                  <label className="block font-bold mb-1 text-rose-400">
                    سبب رفض طلب الصيانة (إلزامي)*:
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="سجل سبب رفض الطلب بالتفصيل (مثال: عدم توفر قطع الغيار، خارج نطاق اختصاص القسم، بلاغ مكرر، أو يتطلب موافقة خاصة)..."
                    rows={4}
                    required
                    className={`w-full rounded-xl p-2.5 outline-none border ${
                      formError
                        ? 'border-rose-500 bg-rose-500/5'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              ) : (
                <div>
                  <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    ملاحظات وتفاصيل المعالجة والإصلاح الفني:
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="سجل التفاصيل الفنية لأعمال الإصلاح والصيانة المنفذة وقطع الغيار المستخدمة..."
                    rows={3}
                    className={`w-full rounded-xl p-2.5 outline-none border ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              )}

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReq(null);
                    setActionModalType(null);
                    setFormError(null);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                    isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 font-black rounded-xl transition cursor-pointer shadow-lg ${
                    actionModalType === 'reject' || status === 'rejected'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  }`}
                >
                  {actionModalType === 'reject'
                    ? 'تأكيد رفض الطلب وحفظ السبب'
                    : isMaintenanceEmployee
                    ? 'تأكيد وحفظ إنجاز الصيانة'
                    : 'حفظ وتحديث حالة الصيانة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL EDIT MAINTENANCE REQUEST MODAL */}
      {fullEditReq && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                تحرير طلب صيانة ({toArabicDigits(fullEditReq.id)})
              </h3>
              <button onClick={() => setFullEditReq(null)} className={`p-1 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFullEdit} className="space-y-3 text-xs">
              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  تاريخ تقديم الطلب:
                </label>
                <input
                  type="date"
                  value={editCreatedAt}
                  onChange={(e) => setEditCreatedAt(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  رمز المنشأة / الأصل:
                </label>
                <input
                  type="text"
                  value={editUnitCode}
                  onChange={(e) => setEditUnitCode(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-amber-400 outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  وصف العطل / المشكلة:
                </label>
                <textarea
                  value={editIssue}
                  onChange={(e) => setEditIssue(e.target.value)}
                  rows={3}
                  className={`w-full rounded-xl p-2.5 outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  درجة الأولوية:
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as MaintenancePriority)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                >
                  <option value="critical">حرج جداً (طارئ وفوري)</option>
                  <option value="normal">عادي (اعتيادي)</option>
                  <option value="low">منخفض (وقائي / ثانوي)</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  جهة الصيانة المختصة:
                </label>
                <select
                  value={editMaintenanceDepartment}
                  onChange={(e) => setEditMaintenanceDepartment(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                >
                  {availableDepartments.map((deptName) => (
                    <option key={deptName} value={deptName}>
                      {deptName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  حالة الطلب الحالية:
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MaintenanceStatus)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                >
                  <option value="open">مفتوح / بلاغ جديد</option>
                  <option value="assigned">مُحال للمقاول</option>
                  <option value="in_progress">قيد المعالجة</option>
                  <option value="overdue">متأخر</option>
                  <option value="completed">منجز</option>
                  <option value="rejected">مرفوض</option>
                  <option value="cancelled">ملغى</option>
                </select>
              </div>

              <div className={`flex items-center justify-between gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                {onDeleteMaintenanceRequest ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmReq(fullEditReq)}
                    className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl font-bold transition cursor-pointer"
                  >
                    حذف الطلب
                  </button>
                ) : <div />}
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFullEditReq(null)}
                    className={`px-3 py-2 rounded-xl font-bold transition cursor-pointer ${
                      isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-500 text-white font-black rounded-xl hover:bg-sky-400 transition cursor-pointer"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmReq && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className="flex items-center gap-3 text-rose-500 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg">تأكيد حذف طلب الصيانة</h3>
            </div>
            <p className={`text-sm mb-5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              هل أنت تأكد من رغبتك بحذف طلب الصيانة رقم <strong className="font-mono text-amber-400">({deleteConfirmReq.id})</strong> الخاص بالمنشأة <strong className="font-mono text-sky-400">({deleteConfirmReq.unitCode})</strong> بشكل نهائي؟
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/20">
              <button
                type="button"
                onClick={() => setDeleteConfirmReq(null)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteMaintenanceRequest) {
                    onDeleteMaintenanceRequest(deleteConfirmReq.id);
                  }
                  if (fullEditReq?.id === deleteConfirmReq.id) {
                    setFullEditReq(null);
                  }
                  setDeleteConfirmReq(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد الحذف النهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS / NOTES POPUP MODAL CARD */}
      {viewNotesReq && (
        <div className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto ${
          isLight ? 'bg-slate-900/50' : 'bg-slate-950/85'
        }`}>
          <div className={`rounded-3xl p-6 w-full max-w-xl space-y-4 shadow-2xl relative border animate-in fade-in zoom-in-95 duration-150 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            {/* Header */}
            <div className={`flex items-start justify-between border-b pb-3.5 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${
                  viewNotesReq.status === 'rejected'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : viewNotesReq.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {viewNotesReq.status === 'rejected' ? (
                    <Ban className="w-6 h-6" />
                  ) : viewNotesReq.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-black text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {viewNotesReq.status === 'rejected'
                        ? 'بطاقة سبب الرفض والملاحظات الفنية'
                        : viewNotesReq.status === 'completed'
                        ? 'بطاقة نتائج الإنجاز والتقرير الفني'
                        : 'بطاقة نتائج وملاحظات طلب الصيانة'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10.5px] border ${
                      viewNotesReq.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : viewNotesReq.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {viewNotesReq.status === 'rejected'
                        ? 'مرفوض'
                        : viewNotesReq.status === 'completed'
                        ? 'تم الإنجاز'
                        : viewNotesReq.status === 'cancelled'
                        ? 'ملغى'
                        : 'قيد المعالجة'}
                    </span>
                  </div>
                  <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    طلب صيانة رقم: <span className="text-amber-500 font-bold">{toArabicDigits(viewNotesReq.id)}</span> • تاريخ الطلب: {formatDateOnly(viewNotesReq.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewNotesReq(null);
                  setCopiedNotes(false);
                }}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  isLight ? 'text-slate-400 hover:text-slate-700 bg-slate-100' : 'text-slate-400 hover:text-slate-200 bg-slate-800'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview Details Strip */}
            {(() => {
              const matchedUnit = units.find((u) => u.code === viewNotesReq.unitCode || u.id === viewNotesReq.unitCode);
              const unitName = viewNotesReq.unitName || matchedUnit?.name || 'غير محدد';
              const occupyingEntity = viewNotesReq.occupyingEntity || matchedUnit?.department || 'هيئة التشغيل الميدانية';

              return (
                <div className={`p-3.5 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                }`}>
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>المنشأة والوحدة:</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{unitName}</div>
                    <div className="font-mono text-amber-500 font-bold text-[11px]">رمز الوحدة: {toArabicDigits(viewNotesReq.unitCode)}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-sky-500" />
                      <span>الجهة الشاغلة / الغرفة:</span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{occupyingEntity}</div>
                    {viewNotesReq.roomCode ? (
                      <div className="font-bold text-emerald-500 text-[11px] flex items-center gap-1">
                        <DoorClosed className="w-3.5 h-3.5" />
                        <span>غرفة: {toArabicDigits(viewNotesReq.roomCode)} {viewNotesReq.roomName ? `(${viewNotesReq.roomName})` : ''}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">صيانة عامة لكامل المنشأة</div>
                    )}
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                    <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-amber-500" />
                      <span>العطل المطلوب معالجته:</span>
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      {viewNotesReq.issue}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Main Notes Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-black flex items-center gap-1.5 ${
                  viewNotesReq.status === 'rejected' ? 'text-rose-500' : 'text-emerald-500'
                }`}>
                  <FileText className="w-4 h-4" />
                  <span>
                    {viewNotesReq.status === 'rejected'
                      ? 'سبب الرفض والملاحظات المسجلة:'
                      : 'النتائج الفنية وملاحظات الإنجاز:'}
                  </span>
                </label>

                {(viewNotesReq.resolutionNotes || viewNotesReq.rejectionReason) && (
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy = viewNotesReq.rejectionReason || viewNotesReq.resolutionNotes || '';
                      navigator.clipboard.writeText(textToCopy);
                      setCopiedNotes(true);
                      setTimeout(() => setCopiedNotes(false), 2000);
                    }}
                    className={`text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                      copiedNotes
                        ? 'bg-emerald-500 text-slate-950'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {copiedNotes ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>نسخ الملاحظات</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className={`p-4 rounded-2xl border leading-relaxed text-xs shadow-inner min-h-[90px] whitespace-pre-wrap font-medium ${
                viewNotesReq.status === 'rejected'
                  ? isLight
                    ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : isLight
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}>
                {viewNotesReq.rejectionReason || viewNotesReq.resolutionNotes || (
                  viewNotesReq.status === 'completed'
                    ? 'تمت المعالجة والإنجاز بنجاح وفق المواصفات المعتمدة.'
                    : 'لا توجد ملاحظات إضافية مسجلة.'
                )}
              </div>
            </div>

            {/* Date, Duration & Department Indicators */}
            <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-[11px] ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/40 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>تاريخ التوثيق:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {getCompletionOrCancellationDate(viewNotesReq.completedAt, viewNotesReq.status)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>مدة الاستجابة:</span>
                <span className="font-mono text-amber-500">
                  {calculateMaintenanceDurationDays(viewNotesReq.createdAt, viewNotesReq.completedAt, viewNotesReq.status)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-bold">
                <Wrench className="w-3.5 h-3.5 text-amber-500" />
                <span>الجهة:</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {viewNotesReq.maintenanceDepartment || 'الصيانة العامة'}
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className={`flex items-center justify-between pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="text-[11px] text-slate-400">
                مسؤول الإجراء: <strong className="text-slate-300">{viewNotesReq.reportedBy || currentUser?.name || 'فريق الصيانة'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const reqToEdit = viewNotesReq;
                    setViewNotesReq(null);
                    if (isMaintenanceEmployee) {
                      if (reqToEdit.status === 'rejected') {
                        handleOpenRejectModal(reqToEdit);
                      } else {
                        handleOpenCompleteModal(reqToEdit);
                      }
                    } else {
                      handleOpenEditModal(reqToEdit);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                  <span>تعديل التقرير / الحالة</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewNotesReq(null);
                    setCopiedNotes(false);
                  }}
                  className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md shadow-amber-500/20"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ATTACHMENT VIEWER MODAL */}
      {previewAttachment && (
        <AttachmentViewerModal
          attachments={previewAttachment.attachments}
          initialIndex={previewAttachment.initialIndex}
          unitCode={previewAttachment.unitCode}
          theme={theme}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
};
