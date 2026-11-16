import { getServerIsoDateOnly } from '../services/serverTime';
import { Button, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Select, StatCard, Table, Td, Textarea, useConfirm } from './ui';
import React, { useState, useMemo, lazy, Suspense } from 'react';
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
import type { AttachmentViewerItem } from './AttachmentViewerModal';

// تُحمَّل عند الطلب (4-ل)
const AttachmentViewerModalLazy = lazy(() => import('./AttachmentViewerModal').then((m) => ({ default: m.AttachmentViewerModal })));
const AttachmentViewerModal = (props: React.ComponentProps<typeof AttachmentViewerModalLazy>) => (
  <Suspense fallback={null}>
    <AttachmentViewerModalLazy {...props} />
  </Suspense>
);

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
  const confirm = useConfirm();
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
    setCompletedAtDate(req.completedAt?.split(' ')[0] || getServerIsoDateOnly());
    setResolutionNotes(req.resolutionNotes || '');
    setRejectionReason('');
    setFormError(null);
  };

  // Open Reject modal (with mandatory rejection reason)
  const handleOpenRejectModal = (req: MaintenanceRequest) => {
    setSelectedReq(req);
    setActionModalType('reject');
    setStatus('rejected');
    setCompletedAtDate(req.completedAt?.split(' ')[0] || getServerIsoDateOnly());
    setRejectionReason(req.rejectionReason || '');
    setResolutionNotes('');
    setFormError(null);
  };

  // Open generic status edit modal (for Admin/Management)
  const handleOpenEditModal = (req: MaintenanceRequest) => {
    setSelectedReq(req);
    setActionModalType('edit_status');
    setStatus(req.status || 'in_progress');
    setCompletedAtDate(req.completedAt?.split(' ')[0] || getServerIsoDateOnly());
    setResolutionNotes(req.resolutionNotes || '');
    setRejectionReason(req.rejectionReason || '');
    setFormError(null);
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
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
      completedAt: completedAtDate || getServerIsoDateOnly(),
      daysOverdue: isDoneOrClosed ? 0 : selectedReq.daysOverdue,
    };

    const rejecting = status === 'rejected';
    const approved = await confirm({
      title: rejecting ? 'تأكيد رفض طلب الصيانة' : 'تأكيد تحديث طلب الصيانة',
      message: <>هل تريد حفظ {rejecting ? 'رفض' : 'تحديث'} طلب الصيانة رقم <strong className="font-mono">{selectedReq.id}</strong> للوحدة <strong className="font-mono">{selectedReq.unitCode}</strong>؟</>,
      danger: rejecting,
    });
    if (!approved) return;

    onUpdateMaintenanceRequest(updated);
    setSelectedReq(null);
    setActionModalType(null);
    setFormError(null);
  };

  const closeNotesModal = () => {
    setViewNotesReq(null);
    setCopiedNotes(false);
  };

  const closeUpdateModal = () => {
    setSelectedReq(null);
    setActionModalType(null);
    setFormError(null);
  };

  const handleOpenFullEdit = (req: MaintenanceRequest) => {
    if (isMaintenanceEmployee) return; // Prevented for maintenance employee
    setFullEditReq(req);
    setEditCreatedAt(req.createdAt ? req.createdAt.split(' ')[0] : getServerIsoDateOnly());
    setEditUnitCode(req.unitCode || '');
    setEditIssue(req.issue || '');
    setEditPriority(req.priority || 'normal');
    setEditMaintenanceDepartment(req.maintenanceDepartment || 'الصيانة الكهربائية');
    setEditStatus(req.status || 'open');
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
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

    const approved = await confirm({
      title: 'تأكيد تعديل طلب الصيانة',
      message: <>هل تريد حفظ التعديلات على طلب الصيانة رقم <strong className="font-mono">{fullEditReq.id}</strong>؟</>,
    });
    if (!approved) return;

    onUpdateMaintenanceRequest(updated);
    setFullEditReq(null);
  };

  return (
    <div className="space-y-6">
      {/* Maintenance Employee Department Notification Banner */}
      {isMaintenanceEmployee && (
        <div className="rounded-2xl p-4 bg-brand-50 border border-brand-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-700 text-on-brand font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-brand-700 text-sm">
                حساب موظف صيانة معتمد ({currentUser?.name})
              </div>
              <div className={'text-slate-700'}>
                جهة الصيانة المخصصة للحساب: <strong className="text-brand-700 font-black underline">{employeeDept || 'غير محدد'}</strong>. يتم عرض الطلبات الموجهة لقسمك فقط مع صلاحية <strong className="text-emerald-600">إنجاز الطلب</strong> أو <strong className="text-rose-600">رفض الطلب مع ذكر السبب</strong>.
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-brand-100 text-brand-700 border border-brand-200 rounded-xl font-bold">
            صلاحية الإنجاز والرفض
          </span>
        </div>
      )}

      {/* الترويسة */}
      <PageHeader
        icon={Wrench}
        title="إدارة طلبات الصيانة"
        description={
          isMaintenanceEmployee
            ? `متابعة وإنجاز أو رفض طلبات ${employeeDept || 'الصيانة'} الموجهة لحسابك وتوثيق الملاحظات`
            : 'متابعة بلاغات الأعطال، معالجة حالة الطلب، وتوجيهها لجهات الصيانة المختصة'
        }
        actions={
          !isMaintenanceEmployee && (
            <Button variant="primary" icon={Plus} onClick={onOpenNewMaintenanceModal}>
              طلب صيانة جديد
            </Button>
          )
        }
      />

      {/* SLA Metrics Cards */}
      <div className="space-y-2">
        {isMaintenanceEmployee && employeeDept && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold w-fit">
            <Wrench className="w-3.5 h-3.5" />
            <span>إحصائيات وبلاغات خاصة باختصاص: {employeeDept}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <StatCard
            icon={Wrench}
            tone="brand"
            label={isMaintenanceEmployee ? `إجمالي بلاغات (${employeeDept || 'قسمكم'})` : 'إجمالي البلاغات'}
            value={`${toArabicDigits(visibleRequests.length)} طلب`}
            hint={`${toArabicDigits(openCount)} نشط`}
          />
          <StatCard
            icon={UserCheck}
            tone="blue"
            label={isMaintenanceEmployee ? 'قيد المعالجة (قسمكم)' : 'قيد المعالجة والتنفيذ'}
            value={`${toArabicDigits(inProgressCount)} طلب`}
          />
          <StatCard
            icon={CheckCircle2}
            tone="green"
            label={isMaintenanceEmployee ? 'تمت المعالجة (قسمكم)' : 'تمت المعالجة والإنجاز'}
            value={`${toArabicDigits(completedCount)} طلب`}
          />
          <StatCard
            icon={XCircle}
            tone="red"
            label={isMaintenanceEmployee ? 'مرفوضة / ملغاة (قسمكم)' : 'طلبات مرفوضة / ملغاة'}
            value={`${toArabicDigits(rejectedCount + cancelledCount)} طلب`}
          />
        </div>
      </div>

      {/* Main Table Data */}
      <div className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg space-y-4 border bg-card border-slate-200`}>
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-brand-700" />
              <h3 className={`font-bold text-sm text-slate-900`}>سجل بلاغات الصيانة والطلبات الميدانية</h3>
              <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-mono font-bold text-xs">
                {toArabicDigits(filteredRequests.length)} طلب
              </span>
            </div>

            {/* Clear Filters Button if any filter active */}
            {(filterStatus !== 'all' || filterDepartment !== 'all' || filterPriority !== 'all' || searchCode || sortOrder !== 'newest_first') && (
              <Button
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setFilterStatus('all');
                  setFilterDepartment('all');
                  setFilterPriority('all');
                  setSearchCode('');
                  setSortOrder('newest_first');
                }}
              >
                إعادة ضبط الفلاتر
              </Button>
            )}
          </div>

          {/* شريط الفلاتر */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Field label="الترتيب الزمني">
              <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest_first' | 'oldest_first')}>
                <option value="newest_first">الأحدث أولاً</option>
                <option value="oldest_first">الأقدم أولاً</option>
              </Select>
            </Field>
            <Field label="حالة الطلب">
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">كافة الحالات</option>
                <option value="in_progress">قيد المعالجة والتنفيذ</option>
                <option value="completed">تمت المعالجة والإنجاز</option>
                <option value="rejected">مرفوض</option>
                <option value="cancelled">ملغى</option>
              </Select>
            </Field>
            <Field label="جهة الصيانة">
              <Select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} disabled={Boolean(isMaintenanceEmployee && employeeDept)}>
                <option value="all">كافة جهات الصيانة</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="درجة الأولوية">
              <Select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="all">كافة درجات الأولوية</option>
                <option value="critical">حرج جداً (طارئ وفوري)</option>
                <option value="normal">عادي (اعتيادي)</option>
                <option value="low">منخفض (وقائي / ثانوي)</option>
              </Select>
            </Field>
            <Field label="بحث">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" aria-hidden />
                <Input type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="الرمز، الوحدة، العطل..." className="pr-9" />
              </div>
            </Field>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <EmptyState text="لا توجد طلبات صيانة تطابق الفلاتر المحددة." />
        ) : (
          <div>
            <Table
              head={[
                'رقم وتاريخ الطلب',
                'رمز واسم وبيانات المنشأة',
                'جهة الصيانة',
                'العطل',
                'الأولوية',
                'مقدّم الطلب',
                'حالة الطلب',
                'تاريخ الإنجاز والمدة',
                'المرفقات',
                'النتائج',
                'الإجراءات',
              ]}
            >

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
                  <tr key={req.id} className="hover:bg-brand-50 transition">
                    {/* رقم الطلب مدمج مع تاريخ الطلب */}
                    <Td className="align-middle">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-brand-700 text-[11px]">
                          {toArabicDigits(req.id)}
                        </div>
                        <div className={`text-[10px] font-mono flex items-center gap-1 text-slate-500`}>
                          <Calendar className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          <span>{formatDateOnly(req.createdAt)}</span>
                        </div>
                      </div>
                    </Td>

                    {/* رمز واسم المنشأة والجهة الشاغلة وبيانات الغرفة */}
                    <Td className="align-middle">
                      <div className="space-y-1">
                        {/* السطر 1: رمز المنشأة واسمها */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-mono font-black text-brand-700 text-xs flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            <span>{toArabicDigits(req.unitCode)}</span>
                          </div>
                          <span className="opacity-40">•</span>
                          <div className={`font-black text-xs leading-snug break-words text-slate-900`} title={unitName}>
                            {unitName}
                          </div>
                        </div>

                        {/* السطر 2: الجهة الشاغلة للمنشأة */}
                        <div className={`text-[10.5px] leading-tight flex items-center gap-1 text-slate-600`} title={unitOccupant}>
                          <UserCheck className="w-3 h-3 text-sky-600 shrink-0" />
                          <span className="opacity-75">الجهة الشاغلة:</span>
                          <span className="font-bold truncate">{unitOccupant}</span>
                        </div>

                        {/* السطر 3: في حال كان الطلب لصيانة غرفة - رمز الغرفة والجهة الشاغلة لها */}
                        {req.roomCode && (
                          <div className="pt-1 mt-1 border-t border-slate-200/70 space-y-0.5">
                            <div className="font-bold text-[10.5px] text-emerald-600 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md w-fit" title={`الغرفة: ${req.roomCode}${req.roomName ? ` - ${req.roomName}` : ''}`}>
                              <DoorClosed className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="font-mono font-bold">غرفة: {toArabicDigits(req.roomCode)}</span>
                              {req.roomName && <span>• {req.roomName}</span>}
                              {req.roomFloor && <span className="text-[9.5px] opacity-80 font-sans">({req.roomFloor})</span>}
                            </div>
                            <div className="text-[10px] leading-tight flex items-center gap-1 text-emerald-700 pr-0.5" title={roomOccupant}>
                              <span className="opacity-75">شاغل الغرفة:</span>
                              <span className="font-bold truncate">{roomOccupant}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </Td>

                    {/* جهة الصيانة */}
                    <Td className="align-middle">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200 block truncate text-center" title={req.maintenanceDepartment || 'الصيانة العامة'}>
                        {req.maintenanceDepartment || 'الصيانة العامة'}
                      </span>
                    </Td>

                    {/* العطل */}
                    <Td className="align-middle">
                      <div className={`font-bold text-[11px] line-clamp-3 leading-relaxed text-slate-800`} title={req.issue}>
                        {req.issue}
                      </div>
                    </Td>

                    {/* الأولوية */}
                    <Td className="text-center align-middle">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold inline-block ${
                          req.priority === 'critical'
                            ? 'bg-red-500/20 text-red-600 border border-red-500/30'
                            : req.priority === 'low'
                            ? 'bg-slate-500/20 text-slate-500 border border-slate-500/30'
                            : 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                        }`}
                      >
                        {req.priority === 'critical' ? 'حرج جداً' : req.priority === 'low' ? 'منخفض' : 'عادي'}
                      </span>
                    </Td>

                    {/* مقدّم الطلب */}
                    <Td className="align-middle">
                      <div className="flex items-center gap-1 font-bold text-[11px]">
                        <UserCheck className={`w-3 h-3 shrink-0 text-brand-700`} />
                        <span className={`truncate text-slate-900`} title={req.reportedBy}>
                          {req.reportedBy || 'غير معروف'}
                        </span>
                      </div>
                    </Td>

                    {/* حالة الطلب */}
                    <Td className="text-center align-middle">
                      {req.status === 'completed' ? (
                        <span
                          className="bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 p-1.5 rounded-lg inline-flex items-center justify-center transition"
                          title="حالة الطلب: منجز"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      ) : req.status === 'rejected' ? (
                        <span
                          className="bg-rose-500/20 text-rose-600 border border-rose-500/30 p-1.5 rounded-lg inline-flex items-center justify-center transition"
                          title="حالة الطلب: مرفوض"
                        >
                          <Ban className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      ) : req.status === 'cancelled' ? (
                        <span
                          className="bg-slate-500/20 text-slate-500 border border-slate-500/30 p-1.5 rounded-lg inline-flex items-center justify-center transition"
                          title="حالة الطلب: ملغى"
                        >
                          <XCircle className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      ) : (
                        <span
                          className="bg-brand-100 text-brand-700 border border-brand-200 p-1.5 rounded-lg inline-flex items-center justify-center transition"
                          title="حالة الطلب: قيد المعالجة"
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      )}
                    </Td>

                    {/* تاريخ الإنجاز / الرفض + المدة مدمجة */}
                    <Td className="text-center align-middle font-mono text-[10px]">
                      <div className="space-y-0.5">
                        <div className="font-semibold truncate">
                          {getCompletionOrCancellationDate(req.completedAt, req.status)}
                        </div>
                        <div className="text-brand-700 font-bold text-[9.5px]">
                          المدة: {calculateMaintenanceDurationDays(req.createdAt, req.completedAt, req.status)}
                        </div>
                      </div>
                    </Td>

                    {/* المرفقات - أيقونة فقط عند الضغط عليها تفتح الملف المرفق */}
                    <Td className="text-center align-middle">
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
                              className={`relative inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-sm group hover:scale-110 active:scale-95 bg-brand-50 text-brand-800 border-brand-200 hover:bg-brand-100 hover:border-brand-200`}
                              title={
                                reqAttachments.length > 1
                                  ? `معاينة وفتح جميع المرفقات (${toArabicDigits(reqAttachments.length)} مرفقات)`
                                  : 'معاينة وفتح الملف المرفق'
                              }
                            >
                              <Paperclip className="w-3.5 h-3.5 text-brand-700 group-hover:text-brand-700 transition-colors" />
                              {reqAttachments.length > 1 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-brand-700 text-on-brand text-[8.5px] font-black flex items-center justify-center shadow-md border border-slate-900">
                                  {toArabicDigits(reqAttachments.length)}
                                </span>
                              )}
                            </button>
                          </div>
                        );
                      })()}
                    </Td>

                    {/* النتائج والملاحظات - أيقونة مصغرة مع تلميح */}
                    <Td className="text-center align-middle">
                      {hasNotes ? (
                        <button
                          type="button"
                          onClick={() => setViewNotesReq(req)}
                          className={`p-1.5 rounded-lg text-[10px] font-extrabold inline-flex items-center justify-center transition cursor-pointer border shadow-xs group hover:scale-110 active:scale-95 ${
                            req.status === 'rejected'
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 border-rose-500/30'
                              : req.status === 'completed'
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 border-emerald-500/30'
                              : 'bg-brand-100 hover:bg-brand-100 text-brand-700 border-brand-200'
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
                            <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          ) : req.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          )}
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-mono select-none">—</span>
                      )}
                    </Td>

                    {/* الإجراءات - أزرار أيقونات مصغرة */}
                    <Td className="text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {isMaintenanceEmployee ? (
                          <>
                            {req.status !== 'completed' && req.status !== 'rejected' && req.status !== 'cancelled' ? (
                              <>
                                {/* Complete Request Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenCompleteModal(req)}
                                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-on-brand transition cursor-pointer flex items-center justify-center shadow-sm shadow-emerald-500/20 hover:scale-105 active:scale-95"
                                  title="إنجاز وتوثيق أعمال الصيانة"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Reject Request Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(req)}
                                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 border border-rose-500/30 transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                                  title="رفض الطلب مع تسجيل سبب الرفض"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : req.status === 'completed' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCompleteModal(req)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 border border-emerald-500/30 transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                                title="تعديل تقرير الإنجاز"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            ) : req.status === 'rejected' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(req)}
                                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 border border-rose-500/30 transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
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
                              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 border border-rose-500/30 rounded-lg transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
                              title="حذف طلب الصيانة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(req)}
                              className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 ${
                                req.status === 'completed'
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 border border-emerald-500/30'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 border border-rose-500/30'
                                  : 'bg-brand-700 text-on-brand hover:bg-brand-800 '
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
                    </Td>
                  </tr>
                );
              })}
            </Table>
      </div>
    )}
  </div>

      {/* UPDATE / COMPLETE / REJECT MAINTENANCE REQUEST MODAL */}
      <Modal
        open={!!selectedReq}
        staticBackdrop
        icon={actionModalType === 'reject' ? Ban : CheckCircle2}
        title={
          actionModalType === 'reject'
            ? 'توثيق رفض طلب الصيانة'
            : isMaintenanceEmployee
            ? 'توثيق إنجاز طلب الصيانة'
            : 'معالجة وتحديث حالة طلب الصيانة'
        }
        onClose={closeUpdateModal}
        footer={
          <>
            <Button type="submit" form="maintenance-update-form" variant={actionModalType === 'reject' || status === 'rejected' ? 'danger' : 'primary'} icon={CheckCircle2}>
              {actionModalType === 'reject' ? 'حفظ الرفض وسببه' : isMaintenanceEmployee ? 'حفظ إنجاز الصيانة' : 'حفظ حالة الطلب'}
            </Button>
            <Button onClick={closeUpdateModal}>إلغاء</Button>
          </>
        }
      >
        {selectedReq && (
          <div className="space-y-3.5">
            <p className="text-xs text-slate-500">
              رقم الطلب: <span className="font-mono font-bold text-brand-700">{selectedReq.id}</span>
            </p>
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 font-bold text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form id="maintenance-update-form" onSubmit={handleSaveUpdate} className="space-y-3 text-xs">
              <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-700 font-bold space-y-1">
                <div>الوحدة: {toArabicDigits(selectedReq.unitCode)} | المشكلة: {selectedReq.issue}</div>
                <div className="text-[11px] text-brand-700">جهة الصيانة: {selectedReq.maintenanceDepartment || 'عامة'}</div>
              </div>

              {/* Specific info banner based on action */}
              {actionModalType === 'reject' ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-semibold text-[11px] leading-relaxed">
                  سيتم تعيين حالة الطلب إلى <strong>(مرفوض)</strong> مع توثيق اسمك ({currentUser?.name}) كمسؤول اتخاذ الإجراء وحفظ سبب الرفض في سجل التدقيق.
                </div>
              ) : isMaintenanceEmployee ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-semibold text-[11px]">
                  سيتم تعيين حالة الطلب إلى <strong>(منجز)</strong> وتسجيل اسمك ({currentUser?.name}) كمسؤول الإنجاز وتوثيق التقرير الفني.
                </div>
              ) : (
                <div>
                  <label className={`block font-bold mb-1 text-slate-700`}>
                    تعديل حالة طلب الصيانة:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                    className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-slate-50 border-slate-200 text-slate-900`}
                  >
                    <option value="in_progress">قيد المعالجة</option>
                    <option value="completed">منجز</option>
                    <option value="rejected">مرفوض</option>
                    <option value="cancelled">ملغى</option>
                  </select>
                </div>
              )}

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  {actionModalType === 'reject' || status === 'rejected' ? 'تاريخ الرفض:' : 'تاريخ الإنجاز:'}
                </label>
                <input
                  type="date"
                  value={completedAtDate}
                  onChange={(e) => setCompletedAtDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold outline-none border bg-slate-50 border-slate-200 text-slate-900`}
                />
              </div>

              {/* Mandatory Rejection Reason field when rejecting */}
              {(actionModalType === 'reject' || status === 'rejected') ? (
                <div>
                  <label className="block font-bold mb-1 text-rose-600">
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
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              ) : (
                <div>
                  <label className={`block font-bold mb-1 text-slate-700`}>
                    ملاحظات وتفاصيل المعالجة والإصلاح الفني:
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="سجل التفاصيل الفنية لأعمال الإصلاح والصيانة المنفذة وقطع الغيار المستخدمة..."
                    rows={3}
                    className={`w-full rounded-xl p-2.5 outline-none border bg-slate-50 border-slate-200 text-slate-900`}
                  />
                </div>
              )}

            </form>
          </div>
        )}
      </Modal>

      {/* FULL EDIT MAINTENANCE REQUEST MODAL */}
      <Modal
        open={!!fullEditReq}
        staticBackdrop
        icon={Edit3}
        title={`تعديل طلب الصيانة (${fullEditReq?.id ?? ''})`}
        onClose={() => setFullEditReq(null)}
        footer={
          <>
            <Button type="submit" form="maintenance-edit-form" variant="primary" icon={CheckCircle2}>
              حفظ التعديلات
            </Button>
            <Button onClick={() => setFullEditReq(null)}>إلغاء</Button>
            {onDeleteMaintenanceRequest && (
              <Button variant="danger-ghost" icon={Trash2} className="ms-auto" onClick={() => fullEditReq && setDeleteConfirmReq(fullEditReq)}>
                حذف الطلب
              </Button>
            )}
          </>
        }
      >
        {fullEditReq && (
          <div>
            <form id="maintenance-edit-form" onSubmit={handleSaveFullEdit} className="space-y-3 text-xs">
              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  تاريخ تقديم الطلب:
                </label>
                <input
                  type="date"
                  value={editCreatedAt}
                  onChange={(e) => setEditCreatedAt(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold outline-none border bg-slate-50 border-slate-200 text-slate-900`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  رمز المنشأة / الأصل:
                </label>
                <input
                  type="text"
                  value={editUnitCode}
                  onChange={(e) => setEditUnitCode(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-brand-700 outline-none border bg-slate-50 border-slate-200`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  وصف العطل / المشكلة:
                </label>
                <textarea
                  value={editIssue}
                  onChange={(e) => setEditIssue(e.target.value)}
                  rows={3}
                  className={`w-full rounded-xl p-2.5 outline-none border bg-slate-50 border-slate-200 text-slate-900`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  درجة الأولوية:
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as MaintenancePriority)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-slate-50 border-slate-200 text-slate-900`}
                >
                  <option value="critical">حرج جداً (طارئ وفوري)</option>
                  <option value="normal">عادي (اعتيادي)</option>
                  <option value="low">منخفض (وقائي / ثانوي)</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  جهة الصيانة المختصة:
                </label>
                <select
                  value={editMaintenanceDepartment}
                  onChange={(e) => setEditMaintenanceDepartment(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-slate-50 border-slate-200 text-slate-900`}
                >
                  {availableDepartments.map((deptName) => (
                    <option key={deptName} value={deptName}>
                      {deptName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 text-slate-700`}>
                  حالة الطلب الحالية:
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as MaintenanceStatus)}
                  className={`w-full rounded-xl p-2.5 font-bold outline-none border bg-slate-50 border-slate-200 text-slate-900`}
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

            </form>
          </div>
        )}
      </Modal>

      {/* نافذة تأكيد الحذف الموحدة */}
      <ConfirmDialog
        open={!!deleteConfirmReq}
        danger
        title="تأكيد حذف طلب الصيانة"
        message={
          deleteConfirmReq && (
            <>هل تريد حذف طلب الصيانة رقم <strong className="font-mono">{deleteConfirmReq.id}</strong> الخاص بالوحدة <strong className="font-mono">{deleteConfirmReq.unitCode}</strong> نهائياً؟ لا يمكن التراجع عن الحذف.</>
          )
        }
        onClose={() => setDeleteConfirmReq(null)}
        onConfirm={() => {
          if (!deleteConfirmReq) return;
          if (onDeleteMaintenanceRequest) onDeleteMaintenanceRequest(deleteConfirmReq.id);
          if (fullEditReq?.id === deleteConfirmReq.id) setFullEditReq(null);
          setDeleteConfirmReq(null);
        }}
      />

      {/* RESULTS / NOTES POPUP MODAL CARD */}
      <Modal
        open={!!viewNotesReq}
        icon={viewNotesReq?.status === 'rejected' ? Ban : viewNotesReq?.status === 'completed' ? CheckCircle2 : FileText}
        title={
          viewNotesReq?.status === 'rejected'
            ? 'سبب الرفض والملاحظات الفنية'
            : viewNotesReq?.status === 'completed'
            ? 'نتائج الإنجاز والتقرير الفني'
            : 'نتائج وملاحظات طلب الصيانة'
        }
        onClose={closeNotesModal}
        footer={
          <>
            <Button variant="primary" onClick={closeNotesModal}>
              إغلاق
            </Button>
            <Button
              icon={Edit3}
              onClick={() => {
                const reqToEdit = viewNotesReq;
                closeNotesModal();
                if (!reqToEdit) return;
                if (isMaintenanceEmployee) {
                  if (reqToEdit.status === 'rejected') handleOpenRejectModal(reqToEdit);
                  else handleOpenCompleteModal(reqToEdit);
                } else {
                  handleOpenEditModal(reqToEdit);
                }
              }}
            >
              تعديل التقرير / الحالة
            </Button>
          </>
        }
      >
        {viewNotesReq && (
          <div className="space-y-3.5">
            <p className="text-xs text-slate-500">
              طلب رقم <span className="font-mono font-bold text-brand-700">{toArabicDigits(viewNotesReq.id)}</span> • تاريخ الطلب: {formatDateOnly(viewNotesReq.createdAt)} • مسؤول الإجراء: {viewNotesReq.reportedBy || currentUser?.name || 'فريق الصيانة'}
            </p>

            {/* Overview Details Strip */}
            {(() => {
              const matchedUnit = units.find((u) => u.code === viewNotesReq.unitCode || u.id === viewNotesReq.unitCode);
              const unitName = viewNotesReq.unitName || matchedUnit?.name || 'غير محدد';
              const occupyingEntity = viewNotesReq.occupyingEntity || matchedUnit?.department || 'هيئة التشغيل الميدانية';

              return (
                <div className={`p-3 sm:p-3.5 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs bg-slate-50 border-slate-200`}>
                  <div className="space-y-1">
                    <div className="text-[10.5px] sm:text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-brand-700" />
                      <span>المنشأة والوحدة:</span>
                    </div>
                    <div className="font-bold text-slate-900 ">{unitName}</div>
                    <div className="font-mono text-brand-700 font-bold text-[11px]">رمز الوحدة: {toArabicDigits(viewNotesReq.unitCode)}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10.5px] sm:text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                      <span>الجهة الشاغلة / الغرفة:</span>
                    </div>
                    <div className="font-semibold text-slate-800 ">{occupyingEntity}</div>
                    {viewNotesReq.roomCode ? (
                      <div className="font-bold text-emerald-600 text-[11px] flex items-center gap-1">
                        <DoorClosed className="w-3.5 h-3.5" />
                        <span>غرفة: {toArabicDigits(viewNotesReq.roomCode)} {viewNotesReq.roomName ? `(${viewNotesReq.roomName})` : ''}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">صيانة عامة لكامل المنشأة</div>
                    )}
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-slate-200 space-y-1">
                    <div className="text-[10.5px] sm:text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-brand-700" />
                      <span>العطل المطلوب معالجته:</span>
                    </div>
                    <div className="font-bold text-slate-800 leading-relaxed bg-card p-2 sm:p-2.5 rounded-xl border border-slate-200 text-xs">
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
                  viewNotesReq.status === 'rejected' ? 'text-rose-600' : 'text-emerald-600'
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
                        ? 'bg-emerald-500 text-on-brand'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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

              <div className={`p-3.5 sm:p-4 rounded-2xl border leading-relaxed text-xs shadow-inner min-h-[90px] whitespace-pre-wrap font-medium ${
                viewNotesReq.status === 'rejected'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}>
                {viewNotesReq.rejectionReason || viewNotesReq.resolutionNotes || (
                  viewNotesReq.status === 'completed'
                    ? 'تمت المعالجة والإنجاز بنجاح وفق المواصفات المعتمدة.'
                    : 'لا توجد ملاحظات إضافية مسجلة.'
                )}
              </div>
            </div>

            {/* Date, Duration & Department Indicators */}
            <div className={`p-2.5 sm:p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-[10.5px] sm:text-[11px] bg-slate-50 border-slate-200 text-slate-600`}>
              <div className="flex items-center gap-1.5 font-bold">
                <Calendar className="w-3.5 h-3.5 text-brand-700" />
                <span>تاريخ التوثيق:</span>
                <span className="font-mono text-slate-800 ">
                  {getCompletionOrCancellationDate(viewNotesReq.completedAt, viewNotesReq.status)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-3.5 h-3.5 text-brand-700" />
                <span>مدة الاستجابة:</span>
                <span className="font-mono text-brand-700">
                  {calculateMaintenanceDurationDays(viewNotesReq.createdAt, viewNotesReq.completedAt, viewNotesReq.status)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-bold">
                <Wrench className="w-3.5 h-3.5 text-brand-700" />
                <span>الجهة:</span>
                <span className="text-slate-800 ">
                  {viewNotesReq.maintenanceDepartment || 'الصيانة العامة'}
                </span>
              </div>
            </div>

          </div>
        )}
      </Modal>

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
