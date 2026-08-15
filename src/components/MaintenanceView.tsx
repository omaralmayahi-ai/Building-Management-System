import React, { useState } from 'react';
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
} from 'lucide-react';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority, UnitAsset } from '../types';
import {
  toArabicDigits,
  formatDateOnly,
  getCompletionOrCancellationDate,
  calculateMaintenanceDurationDays,
} from '../utils/arabicUtils';

interface MaintenanceViewProps {
  requests: MaintenanceRequest[];
  units?: UnitAsset[];
  onOpenNewMaintenanceModal: () => void;
  onUpdateMaintenanceRequest?: (updated: MaintenanceRequest) => void;
  onDeleteMaintenanceRequest?: (id: string) => void;
  theme?: 'dark' | 'light';
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  requests,
  units = [],
  onOpenNewMaintenanceModal,
  onUpdateMaintenanceRequest,
  onDeleteMaintenanceRequest,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchCode, setSearchCode] = useState<string>('');

  // Status Change / Resolution modal state
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);
  const [status, setStatus] = useState<MaintenanceStatus>('completed');
  const [completedAtDate, setCompletedAtDate] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Full Edit Request modal state
  const [fullEditReq, setFullEditReq] = useState<MaintenanceRequest | null>(null);
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<MaintenanceRequest | null>(null);
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editIssue, setEditIssue] = useState('');
  const [editPriority, setEditPriority] = useState<MaintenancePriority>('normal');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editStatus, setEditStatus] = useState<MaintenanceStatus>('open');

  const filteredRequests = requests.filter((r) => {
    const matchStatus =
      filterStatus === 'all' ||
      r.status === filterStatus ||
      (filterStatus === 'in_progress' && (r.status === 'open' || r.status === 'assigned' || r.status === 'in_progress' || r.status === 'overdue'));
    
    const matchedUnit = units.find((u) => u.code === r.unitCode || u.id === r.unitCode);
    const unitName = r.unitName || matchedUnit?.name || '';
    const department = matchedUnit?.department || '';

    const matchSearch =
      !searchCode ||
      r.id.toLowerCase().includes(searchCode.toLowerCase()) ||
      r.unitCode.toLowerCase().includes(searchCode.toLowerCase()) ||
      unitName.toLowerCase().includes(searchCode.toLowerCase()) ||
      department.toLowerCase().includes(searchCode.toLowerCase()) ||
      r.issue.toLowerCase().includes(searchCode.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Dynamic Metrics Calculations
  const openCount = requests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length;
  const cancelledCount = requests.filter((r) => r.status === 'cancelled').length;
  const assignedContractorCount = requests.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;

  const handleOpenEditModal = (req: MaintenanceRequest) => {
    setSelectedReq(req);
    setStatus(req.status === 'cancelled' ? 'cancelled' : 'completed');
    setCompletedAtDate(req.completedAt?.split(' ')[0] || new Date().toISOString().split('T')[0]);
    setResolutionNotes(req.resolutionNotes || '');
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !onUpdateMaintenanceRequest) return;

    const updated: MaintenanceRequest = {
      ...selectedReq,
      status: status,
      resolutionNotes: resolutionNotes,
      completedBy: 'موظف مدخل البيانات',
      completedAt: completedAtDate || new Date().toISOString().split('T')[0],
      daysOverdue: status === 'completed' || status === 'cancelled' ? 0 : selectedReq.daysOverdue,
    };

    onUpdateMaintenanceRequest(updated);
    setSelectedReq(null);
  };

  const handleOpenFullEdit = (req: MaintenanceRequest) => {
    setFullEditReq(req);
    setEditCreatedAt(req.createdAt ? req.createdAt.split(' ')[0] : new Date().toISOString().split('T')[0]);
    setEditUnitCode(req.unitCode || '');
    setEditIssue(req.issue || '');
    setEditPriority(req.priority || 'normal');
    setEditAssignedTo(req.assignedTo || '');
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
      assignedTo: editAssignedTo,
      status: editStatus,
    };

    onUpdateMaintenanceRequest(updated);
    setFullEditReq(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Wrench className="w-5 h-5 text-amber-400" />
            <span>إدارة طلبات الصيانة</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            متابعة بلاغات الأعطال، معالجة وتعديل حالة الطلب من قبل موظف الإدخال، ورفع تقرير بحالة الصيانة
          </p>
        </div>

        <button
          onClick={onOpenNewMaintenanceModal}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/10 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ طلب صيانة جديد</span>
        </button>
      </div>

      {/* SLA Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl p-4 flex items-center justify-between border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div>
            <span className={`text-xs block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>إجمالي البلاغات والطلبات:</span>
            <span className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{toArabicDigits(requests.length)} ({toArabicDigits(openCount)} نشط)</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className={`rounded-xl p-4 flex items-center justify-between border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div>
            <span className={`text-xs block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>طلب صيانة ملغى:</span>
            <span className="text-2xl font-black text-rose-400">{toArabicDigits(cancelledCount)} طلبات</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        <div className={`rounded-xl p-4 flex items-center justify-between border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div>
            <span className={`text-xs block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>قيد المعالجة والإحالة:</span>
            <span className="text-2xl font-black text-sky-400">{toArabicDigits(assignedContractorCount)} طلب</span>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className={`rounded-xl p-4 flex items-center justify-between border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div>
            <span className={`text-xs block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>تمت المعالجة والإنجاز:</span>
            <span className="text-2xl font-black text-emerald-400">{toArabicDigits(completedCount)} طلب</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table Data */}
      <div className={`rounded-2xl p-5 shadow-lg space-y-4 border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/40">
          <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>سجل بلاغات الصيانة والطلبات الميدانية</h3>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`rounded-lg px-2.5 py-1 focus:outline-none border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'}`}
            >
              <option value="all">كافة الحالات</option>
              <option value="completed">تمت المعالجة و الانجاز</option>
              <option value="cancelled">تم إلغاء طلب الصيانة</option>
              <option value="in_progress">قيد المعالجة</option>
            </select>

            <div className="relative">
              <Search className="absolute right-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="ابحث بالرمز أو المشكلة..."
                className={`rounded-lg pr-8 pl-2 py-1 text-xs focus:outline-none border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'}`}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className={`border-b ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
                <th className="p-3 font-semibold">رقم الطلب</th>
                <th className="p-3 font-semibold min-w-[200px]">رمز الأصل واسم الوحدة</th>
                <th className="p-3 font-semibold">العطل / المشكلة</th>
                <th className="p-3 font-semibold">الأولية</th>
                <th className="p-3 font-semibold">الفريق المكلف</th>
                <th className="p-3 font-semibold">حالة الطلب</th>
                <th className="p-3 font-semibold">تاريخ الطلب</th>
                <th className="p-3 font-semibold">تاريخ الإنجاز / الإلغاء</th>
                <th className="p-3 font-semibold">المدة (بالأيام)</th>
                <th className="p-3 font-semibold">تفاصيل وملاحظات الحل</th>
                <th className="p-3 font-semibold text-center">المعالجة والتحديث</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-slate-800 text-slate-300'}`}>
              {filteredRequests.map((req) => {
                const matchedUnit = units.find((u) => u.code === req.unitCode || u.id === req.unitCode);
                const unitName = req.unitName || matchedUnit?.name || 'غير محدد';
                const occupyingEntity = matchedUnit?.department || 'هيئة التشغيل الميدانية';

                return (
                  <tr key={req.id} className="hover:bg-amber-50/20 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-amber-400">{toArabicDigits(req.id)}</td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-amber-400 text-xs">
                          {toArabicDigits(req.unitCode)}
                        </div>
                        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          {unitName}
                        </div>
                        <div className={`text-[10.5px] leading-tight ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          <span className="opacity-80">الجهة الشاغلة: </span>
                          <span className="font-medium">{occupyingEntity}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-bold">{req.issue}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.priority === 'critical'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {req.priority === 'critical' ? 'حرج جداً' : 'عادي'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{req.assignedTo}</td>
                  <td className="p-3">
                    {req.status === 'completed' ? (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        منجز
                      </span>
                    ) : req.status === 'cancelled' ? (
                      <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        ملغى
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        قيد المعالجة
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-[11px] font-semibold">{formatDateOnly(req.createdAt)}</td>
                  <td className="p-3 font-mono text-[11px] font-semibold">{getCompletionOrCancellationDate(req.completedAt, req.status)}</td>
                  <td className="p-3 font-bold text-amber-400 text-[11px]">{calculateMaintenanceDurationDays(req.createdAt, req.completedAt, req.status)}</td>
                  <td className="p-3">
                    {req.resolutionNotes ? (
                      <span className="text-slate-300 text-[11px]">{req.resolutionNotes}</span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">لا توجد ملاحظات</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setDeleteConfirmReq(req)}
                        className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
                        title="حذف طلب الصيانة"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف الطلب</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(req)}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                        title="معالجة وتغيير حالة الصيانة وتوثيق تاريخ الإنجاز"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>تحديث الحالة</span>
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

      {/* UPDATE MAINTENANCE REQUEST MODAL */}
      {selectedReq && (
        <div className={`fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto ${isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'}`}>
          <div className={`rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative border ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                معالجة وتغيير حالة طلب الصيانة ({toArabicDigits(selectedReq.id)})
              </h3>
              <button onClick={() => setSelectedReq(null)} className={`p-1 cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="space-y-3 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 font-bold">
                الوحدة: {toArabicDigits(selectedReq.unitCode)} | المشكلة: {selectedReq.issue}
              </div>

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
                  <option value="completed">منجز</option>
                  <option value="cancelled">ملغى</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  تاريخ الإنجاز أو الإلغاء:
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

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  ملاحظات وتفاصيل المعالجة والإصلاح:
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
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
                  onClick={() => setSelectedReq(null)}
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
                  <option value="critical">حرج جداً</option>
                  <option value="normal">عادي</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  الفريق أو المقاول المكلف:
                </label>
                <input
                  type="text"
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  className={`w-full rounded-xl p-2.5 outline-none border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
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
    </div>
  );
};

