/**
 * مزامنة Firestore من الخادم (قرار 14-11-2026).
 *
 * Firestore نسخة مزامنة فقط: الخادم يرسل إليه التغييرات عند توفر الإنترنت، ولا يُقرأ منه شيء.
 * فشل المزامنة لا يعطّل العمل: التغييرات تبقى في قائمة انتظار على القرص ويُعاد إرسالها.
 *
 * التفعيل: FIREBASE_SERVICE_ACCOUNT_PATH في .env (ملف مفتاح حساب خدمة من Firebase).
 * بدون هذا المتغير المزامنة معطّلة تماماً ولا يجري أي اتصال خارجي.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { StorageOp } from './storage';

export interface MirrorStatus {
  enabled: boolean;
  pending: number;
  lastSyncAt: string | null;
  lastError: string | null;
  skipped: number;
}

export interface FirestoreMirror {
  enqueue(ops: StorageOp[]): void;
  status(): MirrorStatus;
  flush(): Promise<void>;
}

// أسماء المجموعات في Firestore كما استخدمتها النسخة السابقة من الواجهة
const COLLECTION_MAP: Record<string, string> = {
  units: 'units',
  maintenance: 'maintenance_requests',
  occupancy: 'occupancy_records',
  inspections: 'periodic_inspections',
  auditLogs: 'audit_logs',
  orgEntities: 'org_entities',
  users: 'system_users',
  settings: 'system_settings',
};
const SETTINGS_DOC_MAP: Record<string, string> = { branding: 'branding', referenceData: 'reference_data' };
const MAX_DOC_BYTES = 900 * 1024; // حد مستند Firestore 1MiB

function toFirestoreValue(v: any, insideArray = false): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return { nullValue: null };
    return Number.isSafeInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) {
    // Firestore لا يقبل مصفوفة داخل مصفوفة مباشرة
    if (insideArray) return { stringValue: JSON.stringify(v) };
    return { arrayValue: { values: v.filter((x) => x !== undefined).map((x) => toFirestoreValue(x, true)) } };
  }
  if (typeof v === 'object') return { mapValue: { fields: toFirestoreFields(v) } };
  return { stringValue: String(v) };
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || k === '') continue;
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function createFirestoreMirror(opts: {
  dataDir: string;
  /** القيمة الحالية للسجل من ذاكرة الخادم، أو null إن حُذف */
  getRecord: (collection: string, id: string) => any | null;
}): FirestoreMirror {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const disabled: FirestoreMirror = {
    enqueue() {},
    status: () => ({ enabled: false, pending: 0, lastSyncAt: null, lastError: null, skipped: 0 }),
    async flush() {},
  };
  if (!keyPath) return disabled;

  let account: { client_email: string; private_key: string; project_id: string };
  try {
    account = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    if (!account.client_email || !account.private_key || !account.project_id) throw new Error('ملف المفتاح ناقص');
  } catch (err: any) {
    console.warn(`[Firestore] تعذّر قراءة ملف حساب الخدمة، المزامنة معطّلة: ${err.message}`);
    return disabled;
  }

  let databaseId = process.env.FIRESTORE_DATABASE_ID || '';
  if (!databaseId) {
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
      if (cfg.projectId === account.project_id && cfg.firestoreDatabaseId) databaseId = cfg.firestoreDatabaseId;
    } catch {}
  }
  if (!databaseId) databaseId = '(default)';

  const baseUrl = (process.env.FIRESTORE_BASE_URL || 'https://firestore.googleapis.com').replace(/\/$/, '');
  const tokenUrl = process.env.FIRESTORE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
  const intervalMs = Math.max(1000, Number(process.env.FIRESTORE_MIRROR_INTERVAL_MS) || 30000);
  const dbPath = `projects/${account.project_id}/databases/${databaseId}`;
  const queuePath = path.join(opts.dataDir, 'mirror-queue.json');

  // قائمة الانتظار: مفتاح السجل فقط؛ القيمة تؤخذ من ذاكرة الخادم وقت الإرسال (الأحدث يفوز)
  const pending = new Set<string>();
  try {
    if (fs.existsSync(queuePath)) for (const k of JSON.parse(fs.readFileSync(queuePath, 'utf-8'))) pending.add(k);
  } catch {}

  let lastSyncAt: string | null = null;
  let lastError: string | null = null;
  let skipped = 0;
  let flushing = false;
  let saveTimer: NodeJS.Timeout | null = null;
  let token: { value: string; expiresAt: number } | null = null;

  function saveQueueNow() {
    try {
      fs.writeFileSync(queuePath, JSON.stringify(Array.from(pending)), 'utf-8');
    } catch {}
  }

  function saveQueueSoon() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        fs.writeFileSync(queuePath, JSON.stringify(Array.from(pending)), 'utf-8');
      } catch {}
    }, 500);
  }

  async function getToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 60000) return token.value;
    const now = Math.floor(Date.now() / 1000);
    const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(
      JSON.stringify({
        iss: account.client_email,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: tokenUrl,
        iat: now,
        exp: now + 3600,
      })
    );
    const signature = b64url(crypto.createSign('RSA-SHA256').update(`${head}.${claims}`).sign(account.private_key));
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${head}.${claims}.${signature}`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`رفض خادم المصادقة الطلب (${res.status})`);
    const json: any = await res.json();
    token = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 };
    return token.value;
  }

  function docName(collection: string, id: string): string | null {
    const col = COLLECTION_MAP[collection];
    if (!col) return null;
    const docId = collection === 'settings' ? SETTINGS_DOC_MAP[id] : encodeURIComponent(id);
    if (!docId) return null;
    return `${dbPath}/documents/${col}/${docId}`;
  }

  function buildWrite(key: string): any | null {
    const sep = key.indexOf('/');
    const collection = key.slice(0, sep);
    const id = key.slice(sep + 1);
    const name = docName(collection, id);
    if (!name) return null;
    let record = opts.getRecord(collection, id);
    if (record === null || record === undefined) return { delete: name };
    if (collection === 'users') {
      // كلمات المرور لا تغادر الخادم
      const { password, ...safe } = record;
      record = safe;
    }
    if (collection === 'settings') record = record.value ?? {};
    const fields = toFirestoreFields(record);
    if (Buffer.byteLength(JSON.stringify(fields)) > MAX_DOC_BYTES) {
      skipped++;
      return null;
    }
    return { update: { name, fields } };
  }

  async function flush() {
    if (flushing || pending.size === 0) return;
    flushing = true;
    try {
      const accessToken = await getToken();
      const keys = Array.from(pending);
      for (let i = 0; i < keys.length; i += 200) {
        const chunk = keys.slice(i, i + 200);
        const writes = chunk.map(buildWrite).filter(Boolean);
        if (writes.length > 0) {
          const res = await fetch(`${baseUrl}/v1/${dbPath}/documents:commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ writes }),
            signal: AbortSignal.timeout(60000),
          });
          if (!res.ok) throw new Error(`رفض Firestore الكتابة (${res.status})`);
        }
        for (const k of chunk) pending.delete(k);
        saveQueueSoon();
      }
      lastSyncAt = new Date().toISOString();
      lastError = null;
    } catch (err: any) {
      lastError = err?.name === 'TimeoutError' || err?.cause ? 'لا يوجد اتصال بالإنترنت' : String(err?.message || err);
    } finally {
      flushing = false;
    }
  }

  const timer = setInterval(() => void flush(), intervalMs);
  timer.unref?.();
  console.log(`[Firestore] المزامنة مفعّلة نحو ${account.project_id} (${databaseId})`);

  return {
    enqueue(ops) {
      for (const op of ops) {
        if (op.c === 'sessions') continue; // الجلسات لا تُرسل أبداً
        pending.add(`${op.c}/${op.id}`);
      }
      // تُكتب القائمة فوراً حتى لا تضيع تغييرات عند إيقاف الخادم قبل الإرسال
      if (ops.length > 0) saveQueueNow();
    },
    status: () => ({ enabled: true, pending: pending.size, lastSyncAt, lastError, skipped }),
    flush,
  };
}
