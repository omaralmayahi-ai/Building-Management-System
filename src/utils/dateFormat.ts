/**
 * الصيغة الموحدة للتواريخ في السجلات (3-د): YYYY-MM-DD، أو طابع زمني ISO كامل يبدأ بها.
 * يستخدمه الخادم عند الحفظ لتوحيد الصيغ القديمة ورفض ما لا يُفهم.
 */

const WESTERN = (text: string) => text.replace(/[٠-٩۰-۹]/g, (ch) => String(ch.charCodeAt(0) & 0xf));

function isRealDate(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2200) return false;
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** تاريخ اليوم المحلي بصيغة YYYY-MM-DD */
export function localDateString(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type DateNormalization = { ok: true; value: string | undefined | null } | { ok: false };

/**
 * يوحّد قيمة تاريخ:
 *  - الفارغ يبقى كما هو.
 *  - YYYY-MM-DD أو ISO كامل: يُقبل بعد التحقق من أنه تاريخ حقيقي.
 *  - YYYY/MM/DD و DD-MM-YYYY و DD/MM/YYYY والأرقام العربية: تُحوَّل.
 *  - «الآن» وما يبدأ بها: تاريخ اليوم.
 *  - غير ذلك: مرفوض.
 */
export function normalizeDateValue(value: unknown, today: string = localDateString()): DateNormalization {
  if (value === undefined || value === null) return { ok: true, value: value as undefined | null };
  if (typeof value !== 'string') return { ok: false };
  const text = WESTERN(value).trim();
  if (text === '') return { ok: true, value: '' };
  if (text.startsWith('الآن')) return { ok: true, value: today };

  let m = /^(\d{4})-(\d{2})-(\d{2})(T[0-9:.+\-Z]*)?$/.exec(text);
  if (m) return isRealDate(+m[1], +m[2], +m[3]) ? { ok: true, value: text } : { ok: false };

  m = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(text);
  if (m) return isRealDate(+m[1], +m[2], +m[3]) ? { ok: true, value: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` } : { ok: false };

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (m) return isRealDate(+m[3], +m[2], +m[1]) ? { ok: true, value: `${m[3]}-${pad(+m[2])}-${pad(+m[1])}` } : { ok: false };

  return { ok: false };
}

/** حقول التاريخ في كل مجموعة، مع تسميتها في رسالة الخطأ */
export const DATE_FIELDS: Record<string, Record<string, string>> = {
  units: { lastUpdated: 'تاريخ آخر تحديث', decommissionedAt: 'تاريخ الشطب' },
  maintenance: { createdAt: 'تاريخ الطلب', completedAt: 'تاريخ الإنجاز' },
  occupancy: { startDate: 'تاريخ بدء الإشغال' },
  inspections: {
    lastInspectionDate: 'تاريخ آخر كشف',
    nextDueDate: 'موعد الكشف القادم',
    completionDate: 'تاريخ إنجاز الكشف',
    createdAt: 'تاريخ إنشاء الكشف',
  },
};

// حقول تاريخ داخل قوائم الوحدة: تُوحَّد إن فُهمت، ولا يُرفض السجل بسببها
const NESTED_UNIT_DATES: Array<[string, string]> = [
  ['attachments', 'uploadDate'],
  ['equipment', 'lastServiceDate'],
];

/**
 * يعيد نسخة موحدة التواريخ من السجل، أو رسالة خطأ تذكر الحقل المرفوض.
 * lenient: للسجلات المخزنة سابقاً — القيمة غير المفهومة تُترك كما هي بدل الرفض.
 */
export function normalizeRecordDates(
  collection: string,
  record: any,
  opts: { today?: string; lenient?: boolean } = {}
): { record: any; error: string | null } {
  const fields = DATE_FIELDS[collection];
  if (!fields || !record || typeof record !== 'object') return { record, error: null };
  const today = opts.today || localDateString();
  let out = record;
  const set = (key: string, value: any) => {
    if (out === record) out = { ...record };
    out[key] = value;
  };

  for (const [key, label] of Object.entries(fields)) {
    if (!(key in record)) continue;
    const res = normalizeDateValue(record[key], today);
    if (res.ok === false) {
      if (opts.lenient) continue;
      return { record, error: `${label} غير صالح: «${String(record[key]).slice(0, 40)}». الصيغة المطلوبة سنة-شهر-يوم (مثال: 2026-11-14).` };
    }
    if (res.value !== record[key]) set(key, res.value);
  }

  if (collection === 'units') {
    for (const [listKey, field] of NESTED_UNIT_DATES) {
      const list = record[listKey];
      if (!Array.isArray(list)) continue;
      let changed = false;
      const next = list.map((item: any) => {
        if (!item || typeof item !== 'object' || !(field in item)) return item;
        const res = normalizeDateValue(item[field], today);
        if (res.ok === false || res.value === item[field]) return item;
        changed = true;
        return { ...item, [field]: res.value };
      });
      if (changed) set(listKey, next);
    }
  }
  return { record: out, error: null };
}
