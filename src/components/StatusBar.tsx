import React, { useEffect, useRef, useState } from 'react';
import { Clock, DatabaseBackup, Monitor, Wifi, WifiOff } from 'lucide-react';
import { getSessionToken } from '../services/apiClient';

// شريط الحالة (التصميم المعتمد): يقيس الاتصال بالخادم كل 5 ثوانٍ ويعرض ساعة الخادم وآخر نسخة احتياطية.
interface StatusResponse {
  serverTime: string;
  serverUtcOffset: number;
  clientIp: string;
  // null عندما لا يملك الحساب صلاحية عرض حالة النسخ الاحتياطي
  backup: { last: { at: string; type: string; name: string } | null } | null;
}

type Quality = 'good' | 'weak' | 'offline' | 'checking';

const PING_MS = 5000;
const TIMEOUT_MS = 5000;
const WEAK_MS = 600;

const BACKUP_TYPE_LABEL: Record<string, string> = {
  manual: 'يدوية',
  scheduled: 'مجدولة',
  export: 'مصدَّرة',
  'pre-restore': 'قبل استعادة',
  'pre-update': 'قبل تحديث',
};

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const pad = (n: number) => String(n).padStart(2, '0');

function useServerStatus() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [quality, setQuality] = useState<Quality>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const skew = useRef(0); // وقت الخادم − وقت الحاسبة
  const fails = useRef(0);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const ping = async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const started = performance.now();
      try {
        const token = getSessionToken();
        const res = await fetch('/api/status', {
          signal: ctrl.signal,
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as StatusResponse;
        const rtt = performance.now() - started;
        skew.current = new Date(body.serverTime).getTime() + rtt / 2 - Date.now();
        fails.current = 0;
        if (!stop) {
          setData(body);
          setLatency(Math.round(rtt));
          setQuality(rtt > WEAK_MS ? 'weak' : 'good');
        }
      } catch {
        fails.current += 1;
        if (!stop) {
          setLatency(null);
          setQuality(fails.current >= 2 || !navigator.onLine ? 'offline' : 'weak');
        }
      } finally {
        clearTimeout(t);
        if (!stop) timer = setTimeout(ping, PING_MS);
      }
    };
    ping();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, []);

  return { data, quality, latency, skew };
}

// وقت الخادم بتوقيته هو (لا بتوقيت الحاسبة)
function serverClock(skewMs: number, utcOffsetMin: number) {
  const d = new Date(Date.now() + skewMs + utcOffsetMin * 60000);
  const h = d.getUTCHours();
  return {
    date: `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`,
    time: `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
    ampm: h < 12 ? 'ص' : 'م',
  };
}

function formatBackup(at: string, utcOffsetMin: number) {
  const d = new Date(new Date(at).getTime() + utcOffsetMin * 60000);
  if (isNaN(d.getTime())) return '—';
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export const StatusBar: React.FC = () => {
  const { data, quality, latency, skew } = useServerStatus();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const offset = data?.serverUtcOffset ?? -new Date().getTimezoneOffset();
  const c = serverClock(skew.current, offset);
  const last = data?.backup?.last ?? null;
  const backupStale = Boolean(data?.backup && (!last || Date.now() - new Date(last.at).getTime() > 48 * 3600 * 1000));

  const label =
    quality === 'good' ? 'متصل بالخادم' : quality === 'weak' ? 'اتصال ضعيف' : quality === 'offline' ? 'لا يوجد اتصال بالخادم' : 'جارٍ الفحص...';

  return (
    <div
      role="status"
      aria-live="polite"
      title={quality === 'offline' ? 'ما تُدخله الآن لن يُحفظ حتى يعود الاتصال' : undefined}
      className={cx(
        'sticky top-0 z-40 flex h-[30px] items-center gap-x-5 overflow-hidden border-b px-4 text-xs print:hidden',
        quality === 'offline'
          ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
          : quality === 'weak'
          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
          : 'border-slate-200 bg-card text-slate-600 dark:border-white/10 dark:text-slate-300'
      )}
    >
      <span className="flex items-center gap-1.5 font-semibold">
        <span className="relative flex h-2.5 w-2.5">
          {quality === 'offline' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />}
          <span
            className={cx(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              quality === 'good' ? 'bg-emerald-500' : quality === 'weak' ? 'bg-amber-500' : quality === 'offline' ? 'bg-rose-500' : 'bg-slate-400'
            )}
          />
        </span>
        {quality === 'offline' ? <WifiOff className="h-3.5 w-3.5" aria-hidden /> : <Wifi className="h-3.5 w-3.5" aria-hidden />}
        <span>{label}</span>
        {latency !== null && (
          <span className="hidden font-normal opacity-70 sm:inline" dir="ltr">
            {latency} ms
          </span>
        )}
      </span>

      {data?.clientIp && (
        <span className="hidden items-center gap-1.5 sm:flex" title="عنوان هذه الحاسبة كما يراه الخادم">
          <Monitor className="h-3.5 w-3.5" aria-hidden />
          <span className="font-semibold" dir="ltr">
            {data.clientIp}
          </span>
        </span>
      )}

      <span className="flex-1" />

      {data?.backup && (
        <span
          className={cx('hidden items-center gap-1.5 md:flex', backupStale && quality === 'good' && 'font-semibold text-amber-700 dark:text-amber-300')}
          title="تؤخذ النسخ الاحتياطية من لوحة التحكم"
        >
          <DatabaseBackup className="h-3.5 w-3.5" aria-hidden />
          {last ? (
            <span>
              آخر نسخة احتياطية: <span className="font-semibold">{formatBackup(last.at, offset)}</span>
              {BACKUP_TYPE_LABEL[last.type] ? ` (${BACKUP_TYPE_LABEL[last.type]})` : ''}
            </span>
          ) : (
            <span>لا توجد نسخة احتياطية بعد</span>
          )}
        </span>
      )}

      <span className="flex items-center gap-1.5" title="وقت وتاريخ الخادم">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline" dir="ltr">
          {c.date}
        </span>
        <span className="font-semibold tabular-nums" dir="ltr">
          {c.time}
        </span>
        <span className="font-semibold">{c.ampm}</span>
      </span>
    </div>
  );
};
