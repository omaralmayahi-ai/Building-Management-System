/**
 * مهلة إنجاز طلب الصيانة (SLA) وحساب أيام التأخير والحالة الفعلية.
 * الحساب على التاريخ فقط (YYYY-MM-DD) دون توقيت، فلا يتأثر بالمنطقة الزمنية ولا بساعة الإدخال.
 * المكان الوحيد لهذا المنطق: لا تحسب التأخير في الشاشات.
 */
import type { MaintenancePriority, MaintenanceRequest, MaintenanceStatus } from '../types';
import { addDaysToDate, daysOverdue as daysPastDue, todayDateString } from './inspectionSchedule';

/** مهلة الإنجاز بالأيام حسب الأولوية (قابلة للتعديل عند تغيّر تعليمات الشعبة) */
export const SLA_DAYS_BY_PRIORITY: Record<MaintenancePriority, number> = {
  critical: 1,
  normal: 3,
  low: 7,
};

/** الحالات المغلقة: لا تأخير لها مهما مضى من الوقت */
const CLOSED_STATUSES: MaintenanceStatus[] = ['completed', 'cancelled', 'rejected'];

export function slaDaysFor(priority: MaintenancePriority | undefined): number {
  return SLA_DAYS_BY_PRIORITY[priority as MaintenancePriority] ?? SLA_DAYS_BY_PRIORITY.normal;
}

/** موعد الإنجاز المستحق لطلب جديد: تاريخ الطلب + مهلة الأولوية */
export function maintenanceSlaDeadline(
  createdAt: string,
  priority: MaintenancePriority | undefined,
  today: string = todayDateString()
): string {
  return addDaysToDate(createdAt, slaDaysFor(priority), today);
}

type RequestLike = Pick<MaintenanceRequest, 'status' | 'priority' | 'createdAt'> & {
  slaDeadline?: string;
  daysOverdue?: number;
};

/** موعد الطلب المعتمد: المخزّن إن وُجد، وإلا محسوب من تاريخ الطلب وأولويته */
function deadlineOf(req: RequestLike, today: string): string {
  const stored = String(req.slaDeadline || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(stored)) return stored.slice(0, 10);
  return maintenanceSlaDeadline(req.createdAt, req.priority, today);
}

/** عدد أيام التأخير عن موعد الإنجاز (صفر للطلبات المغلقة أو التي لم يحن موعدها). يوم الاستحقاق نفسه ليس تأخيراً */
export function maintenanceDaysOverdue(req: RequestLike, today: string = todayDateString()): number {
  if (CLOSED_STATUSES.includes(req.status)) return 0;
  return daysPastDue(deadlineOf(req, today), today);
}

/**
 * الحالة الفعلية للطلب بحسب تاريخ اليوم:
 *  - المكتمل والملغى والمرفوض لا تتغير.
 *  - المفتوح أو المحال الذي تجاوز موعد إنجازه يصير متأخراً.
 *  - «قيد التنفيذ» يبقى كما هو (العمل جارٍ)، ويظهر تأخيره بعدد أيامه لا بتغيير حالته.
 *  - المتأخر الذي عاد موعده إلى اليوم أو بعده يعود «مفتوحاً».
 */
export function effectiveMaintenanceStatus(req: RequestLike, today: string = todayDateString()): MaintenanceStatus {
  if (CLOSED_STATUSES.includes(req.status)) return req.status;
  const late = maintenanceDaysOverdue(req, today) > 0;
  if (req.status === 'in_progress') return req.status;
  if (late) return 'overdue';
  return req.status === 'overdue' ? 'open' : req.status;
}

/** يعيد القائمة بحالاتها الفعلية وأيام تأخيرها؛ السجل الذي لم يتغير يبقى هو نفسه */
export function withMaintenanceOverdue<T extends RequestLike>(requests: T[], today: string = todayDateString()): T[] {
  return requests.map((r) => {
    const status = effectiveMaintenanceStatus(r, today);
    const days = maintenanceDaysOverdue(r, today);
    if (status === r.status && days === (r.daysOverdue ?? 0)) return r;
    return { ...r, status, daysOverdue: days };
  });
}
