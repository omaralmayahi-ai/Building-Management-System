// سجل تدقيق الخادم (4-ج): ما يكتبه الخادم نفسه مع كل عملية كتابة، ناجحة أو مرفوضة. للقراءة فقط وللمدير فقط.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../services/http';
import { Badge, Button, EmptyState, Input, Pagination, Select, Spinner, Table, Td } from './ui';

interface AuditEntry {
  at: string;
  userId: string;
  userName: string;
  role: string;
  method: string;
  path: string;
  status: number;
  ip: string;
}

const SUBJECTS: Array<[string, string]> = [
  ['/auth/login', 'تسجيل الدخول'],
  ['/auth/logout', 'تسجيل الخروج'],
  ['/auth/change-password', 'كلمة المرور الشخصية'],
  ['/auth/preferences', 'تفضيلات الواجهة'],
  ['/system/factory-reset', 'ضبط المصنع'],
  ['/system/reset-module', 'إعادة ضبط قسم'],
  ['/units', 'الوحدات'],
  ['/maintenance', 'طلبات الصيانة'],
  ['/inspections', 'الكشوفات الدورية'],
  ['/occupancy', 'سجلات الإشغال'],
  ['/org-entities', 'الهيكل التنظيمي'],
  ['/users', 'المستخدمون'],
  ['/branding', 'هوية النظام'],
  ['/reference-data', 'البيانات المرجعية'],
];

/** يحوّل الطلب إلى وصف مقروء: الموضوع، العملية، ومعرّف السجل إن وُجد */
export function describeAuditEntry(method: string, path: string): { subject: string; action: string; target: string } {
  const found = SUBJECTS.find(([prefix]) => path === prefix || path.startsWith(prefix + '/'));
  const subject = found ? found[1] : path;
  const rest = found ? path.slice(found[0].length).replace(/^\//, '') : '';
  if (path.startsWith('/auth/') || path.startsWith('/system/')) return { subject, action: 'تنفيذ', target: '' };
  if (rest === 'batch') return { subject, action: 'حفظ مجموعة سجلات', target: '' };
  if (rest === 'bulk') return { subject, action: 'استيراد جماعي', target: '' };
  let target = rest;
  try {
    target = decodeURIComponent(rest);
  } catch {}
  const action =
    method === 'DELETE' ? 'حذف' : method === 'PUT' || method === 'PATCH' ? 'تعديل' : method === 'POST' ? 'إضافة أو حفظ' : method;
  return { subject, action, target };
}

export function describeAuditStatus(status: number): { label: string; tone: 'green' | 'red' | 'amber' } {
  if (status < 400) return { label: 'ناجحة', tone: 'green' };
  if (status === 401) return { label: 'مرفوضة: بلا دخول', tone: 'red' };
  if (status === 403) return { label: 'مرفوضة: بلا صلاحية', tone: 'red' };
  if (status === 409) return { label: 'مرفوضة: تعارض', tone: 'amber' };
  if (status === 400 || status === 404 || status === 413) return { label: 'مرفوضة: طلب غير صالح', tone: 'amber' };
  if (status === 429) return { label: 'مرفوضة: محاولات كثيرة', tone: 'red' };
  if (status === 503) return { label: 'فشلت: القاعدة متوقفة', tone: 'red' };
  return { label: `فشلت (${status})`, tone: 'red' };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const PAGE_SIZE = 50;

export default function AuditTrailPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<'all' | 'ok' | 'rejected'>('all');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiRequest<{ entries: AuditEntry[] }>('GET', '/audit-trail?limit=2000');
    if (res.ok && res.data && Array.isArray(res.data.entries)) {
      setEntries(res.data.entries);
      setError(null);
    } else {
      setError(res.status === 403 ? 'سجل تدقيق الخادم متاح لمدير النظام فقط.' : res.error || 'تعذّر تحميل السجل.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .map((e) => ({ e, d: describeAuditEntry(e.method, e.path), s: describeAuditStatus(e.status) }))
      .filter(({ e, d }) => {
        if (result === 'ok' && e.status >= 400) return false;
        if (result === 'rejected' && e.status < 400) return false;
        if (!q) return true;
        return [e.userName, e.role, e.ip, d.subject, d.action, d.target].some((v) => String(v || '').toLowerCase().includes(q));
      });
  }, [entries, query, result]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-brand-700" />
            <span>سجل تدقيق الخادم</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            يكتبه الخادم نفسه مع كل عملية حفظ أو حذف أو دخول، ناجحة أو مرفوضة. لا يُعدَّل ولا يُحذف من النظام.
          </p>
        </div>
        <Button icon={RefreshCw} onClick={() => void load()} loading={loading}>
          تحديث
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Input
            placeholder="بحث بالمستخدم أو الموضوع أو رمز السجل أو عنوان الحاسبة"
            value={query}
            onChange={(ev) => {
              setQuery(ev.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="sm:w-56">
          <Select
            value={result}
            onChange={(ev) => {
              setResult(ev.target.value as 'all' | 'ok' | 'rejected');
              setPage(1);
            }}
            aria-label="نتيجة العملية"
          >
            <option value="all">كل العمليات</option>
            <option value="ok">الناجحة فقط</option>
            <option value="rejected">المرفوضة والفاشلة فقط</option>
          </Select>
        </div>
      </div>

      {error ? (
        <EmptyState text={error} />
      ) : loading && entries.length === 0 ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text={entries.length === 0 ? 'لا توجد عمليات مسجلة بعد.' : 'لا توجد عمليات تطابق البحث.'} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-card">
          <Table head={['الوقت', 'المستخدم', 'الموضوع', 'العملية', 'السجل', 'النتيجة', 'عنوان الحاسبة']}>
            {visible.map(({ e, d, s }, idx) => (
              <tr key={`${e.at}-${idx}`} className="border-b border-slate-100 last:border-0">
                <Td className="whitespace-nowrap font-mono text-xs text-slate-700">{formatTime(e.at)}</Td>
                <Td>
                  <div className="font-semibold text-slate-900">{e.userName || '—'}</div>
                  {e.role && <div className="text-xs text-slate-500">{e.role}</div>}
                </Td>
                <Td className="text-slate-800">{d.subject}</Td>
                <Td className="text-slate-800">{d.action}</Td>
                <Td className="font-mono text-xs text-slate-700">{d.target || '—'}</Td>
                <Td>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </Td>
                <Td className="font-mono text-xs text-slate-600">{e.ip || '—'}</Td>
              </tr>
            ))}
          </Table>
          <Pagination page={current} pages={pages} onPage={setPage} total={rows.length} unit="عملية" />
        </div>
      )}
    </div>
  );
}
