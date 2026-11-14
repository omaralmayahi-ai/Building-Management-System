/**
 * منطق مواعيد الكشف الدوري: موعد الاستحقاق القادم، التأخير، والحالة الفعلية.
 * الحساب على التاريخ فقط (YYYY-MM-DD) دون توقيت، فلا يتأثر بالمنطقة الزمنية ولا بساعة الإدخال.
 */
import type { InspectionFrequency, InspectionStatus, PeriodicInspectionSchedule } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** تاريخ اليوم بالتوقيت المحلي للمستخدم بصيغة YYYY-MM-DD */
export function todayDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** يحوّل نص تاريخ (YYYY-MM-DD أو ISO كامل) إلى عدد أيام مطلق، أو null إن لم يكن تاريخاً صالحاً */
function toDayNumber(dateStr: string | undefined | null): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || '').trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  // يرفض تواريخ مثل 2026-02-31
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return Math.round(ms / DAY_MS);
}

function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** عدد أيام الدورة لكل تكرار. المخصص بلا قيمة صالحة = 30 يوماً */
export function frequencyDays(frequency: InspectionFrequency, customIntervalDays?: number): number {
  switch (frequency) {
    case 'monthly':
      return 30;
    case 'quarterly':
      return 90;
    case 'semi_annual':
      return 180;
    case 'annual':
      return 365;
    case 'custom': {
      const n = Math.floor(Number(customIntervalDays));
      return Number.isFinite(n) && n > 0 ? n : 30;
    }
    default:
      return 90;
  }
}

/** يضيف أياماً إلى تاريخ. تاريخ غير صالح يُعدّ تاريخ اليوم */
export function addDaysToDate(dateStr: string, days: number, today: string = todayDateString()): string {
  const base = toDayNumber(dateStr) ?? toDayNumber(today)!;
  return fromDayNumber(base + Math.floor(days));
}

/** موعد الكشف القادم انطلاقاً من تاريخ البدء أو آخر كشف */
export function calculateNextDueDate(
  fromDate: string,
  frequency: InspectionFrequency,
  customIntervalDays?: number,
  today: string = todayDateString()
): string {
  return addDaysToDate(fromDate, frequencyDays(frequency, customIntervalDays), today);
}

/** عدد أيام التأخير عن موعد الاستحقاق (صفر إن لم يحن الموعد أو كان التاريخ غير صالح) */
export function daysOverdue(nextDueDate: string, today: string = todayDateString()): number {
  const due = toDayNumber(nextDueDate);
  const now = toDayNumber(today);
  if (due === null || now === null) return 0;
  return Math.max(0, now - due);
}

/**
 * الحالة الفعلية للكشف بحسب تاريخ اليوم:
 *  - المكتمل والملغى لا يتغيران.
 *  - المجدول أو الجاري الذي تجاوز موعده يصير متأخراً.
 *  - المتأخر الذي أُجّل موعده إلى اليوم أو بعده يعود مجدولاً.
 * يوم الاستحقاق نفسه ليس تأخيراً.
 */
export function effectiveInspectionStatus(
  schedule: Pick<PeriodicInspectionSchedule, 'status' | 'nextDueDate'>,
  today: string = todayDateString()
): InspectionStatus {
  if (schedule.status === 'completed' || schedule.status === 'cancelled') return schedule.status;
  const late = daysOverdue(schedule.nextDueDate, today) > 0;
  if (late) return 'overdue';
  return schedule.status === 'overdue' ? 'scheduled' : schedule.status;
}

/** يعيد القائمة بحالاتها الفعلية؛ السجل الذي لم تتغير حالته يبقى هو نفسه */
export function withEffectiveStatuses<T extends Pick<PeriodicInspectionSchedule, 'status' | 'nextDueDate'>>(
  schedules: T[],
  today: string = todayDateString()
): T[] {
  return schedules.map((s) => {
    const status = effectiveInspectionStatus(s, today);
    return status === s.status ? s : { ...s, status };
  });
}
