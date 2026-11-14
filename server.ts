import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { createServer as createViteServer } from 'vite';
import { configuredDatabaseUrl } from './src/db/dbClient';
import { createStorage, type StorageOp } from './src/db/storage';
import { createFirestoreMirror } from './src/db/firestoreMirror';
import {
  INITIAL_UNITS,
  INITIAL_MAINTENANCE_REQUESTS,
  INITIAL_OCCUPANCY_RECORDS,
  INITIAL_PERIODIC_INSPECTIONS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ORG_ENTITIES,
} from './src/data/mockData';

async function startServer() {
  const app = express();
  // Trust first proxy (Cloud Run / Nginx reverse proxy)
  app.set('trust proxy', 1);

  const PORT = Number(process.env.PORT) || 3000;
  const API_SECRET_KEY = process.env.API_SECRET_KEY || 'CHANGE_ME_BEFORE_DEPLOY';

  // Production Security Warning Check for insecure placeholder secrets
  if (process.env.NODE_ENV === 'production') {
    const dbUrl = process.env.DATABASE_URL || '';
    const hasInsecureApiKey = API_SECRET_KEY === 'CHANGE_ME_BEFORE_DEPLOY';
    const hasInsecureDbUrl = dbUrl.includes('CHANGE_ME_BEFORE_DEPLOY');

    if (hasInsecureApiKey || hasInsecureDbUrl) {
      console.warn('====================================================================');
      console.warn('⚠️  SECURITY WARNING: Default placeholder credentials detected in PRODUCTION!');
      if (hasInsecureApiKey) {
        console.warn('⚠️  API_SECRET_KEY is still using the default placeholder ("CHANGE_ME_BEFORE_DEPLOY").');
      }
      if (hasInsecureDbUrl) {
        console.warn('⚠️  DATABASE_URL is still using the default placeholder password.');
      }
      console.warn('⚠️  Please configure strong, production-grade environment variables.');
      console.warn('====================================================================');
    }
  }

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Enterprise Cyber Defense: Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()');
    next();
  });

  // Cyber Security Authentication & Brute-Force Defense Tracking
  interface ActiveSession {
    token: string;
    userId: string;
    username: string;
    role: string;
    name: string;
    createdAt: number;
    expiresAt: number;
    mustChangePassword?: boolean;
  }
  const activeSessions = new Map<string, ActiveSession>();
  const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();

  const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 10, // Max 10 attempts per IP in 15 minutes
    message: {
      success: false,
      error: 'تم تجاوز الحد المسموح به لمحاولات الدخول. يرجى الانتظار 15 دقيقة لدواعٍ أمنية.',
      code: 'TOO_MANY_ATTEMPTS',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  function sanitizeUserObject(user: any) {
    if (!user) return null;
    const { password, passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // كلمات المرور تُخزَّن مجزّأة بـ scrypt مع ملح عشوائي لكل حساب: scrypt$<salt>$<hash>
  function isPasswordHashed(value: any): boolean {
    return typeof value === 'string' && value.startsWith('scrypt$');
  }

  function hashSecurePassword(password: string): string {
    if (!password) return '';
    if (isPasswordHashed(password)) return password;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  function verifyPasswordMatch(plainInput: string, stored: string): boolean {
    if (!plainInput || !stored) return false;
    if (isPasswordHashed(stored)) {
      const parts = stored.split('$');
      if (parts.length !== 3) return false;
      const expected = Buffer.from(parts[2], 'hex');
      const actual = crypto.scryptSync(plainInput, parts[1], 64);
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    }
    if (stored.startsWith('sha256$')) {
      // صيغة قديمة (ملح ثابت): تُقبل مرة واحدة ثم تُرقّى عند الدخول
      const legacy = crypto.createHmac('sha256', 'mdoc_sec_salt_2026').update(plainInput).digest('hex');
      return `sha256$${legacy}` === stored;
    }
    // نص صريح قديم: يُقبل مرة واحدة ثم يُرقّى إلى scrypt عند الدخول
    return stored === plainInput;
  }

  // تجهيز قائمة مستخدمين للحفظ: تجزئة كلمات المرور الجديدة والإبقاء على الحالية إن لم تُرسل كلمة جديدة
  function secureUsersForStore(incoming: any[], existing: any[]): any[] {
    return (incoming || []).map((u: any) => {
      if (!u || typeof u !== 'object') return u;
      const { passwordHash, ...rest } = u;
      const prev = (existing || []).find((e: any) => e && e.id === u.id);
      const supplied = typeof rest.password === 'string' ? rest.password.trim() : '';
      if (supplied) {
        rest.password = hashSecurePassword(supplied);
      } else if (prev && prev.password) {
        rest.password = hashSecurePassword(prev.password);
      } else {
        delete rest.password;
      }
      return rest;
    });
  }

  const DEFAULT_PASSWORDS = ['admin123', '123'];

  function isAdminRole(role: any): boolean {
    return role === 'مدير النظام' || role === 'admin' || role === 'super_admin';
  }

  const OFFICIAL_MOC_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><g fill="%23248d9c"><rect x="36" y="412" width="440" height="44" rx="4"/><path d="M 152 412 L 152 260 L 194 260 L 194 68 L 366 138 L 366 412 Z"/></g><g fill="%23ffffff"><rect x="222" y="110" width="24" height="24" rx="2"/><rect x="222" y="154" width="24" height="24" rx="2"/><rect x="222" y="198" width="24" height="24" rx="2"/><rect x="260" y="126" width="24" height="24" rx="2"/><rect x="260" y="170" width="24" height="24" rx="2"/><rect x="260" y="214" width="24" height="24" rx="2"/><rect x="170" y="286" width="22" height="22" rx="2"/><rect x="202" y="286" width="22" height="22" rx="2"/><rect x="234" y="286" width="22" height="22" rx="2"/><rect x="266" y="286" width="22" height="22" rx="2"/><rect x="170" y="326" width="22" height="22" rx="2"/><rect x="202" y="326" width="22" height="22" rx="2"/><rect x="234" y="326" width="22" height="22" rx="2"/><rect x="266" y="326" width="22" height="22" rx="2"/><rect x="170" y="366" width="22" height="22" rx="2"/><rect x="202" y="366" width="22" height="22" rx="2"/><rect x="234" y="366" width="22" height="22" rx="2"/><rect x="266" y="366" width="22" height="22" rx="2"/><rect x="304" y="176" width="50" height="16" rx="2"/><rect x="304" y="214" width="50" height="16" rx="2"/><rect x="304" y="252" width="50" height="16" rx="2"/><rect x="304" y="290" width="50" height="16" rx="2"/><rect x="304" y="328" width="50" height="16" rx="2"/><rect x="304" y="366" width="50" height="16" rx="2"/></g></svg>`;

  // ==========================================================================
  // In-Memory Fallback Stores (active when PostgreSQL is not configured / during dev)
  // ==========================================================================
  const memStore = {
    units: [] as any[],
    maintenance: [] as any[],
    occupancy: [] as any[],
    inspections: [] as any[],
    auditLogs: [] as any[],
    orgEntities: [] as any[],
    branding: {
      systemName: 'السجل الرقمي الموحد للأصول الهندسية والإنشائية',
      companyName: 'شركة نفط الوسط',
      ministryName: 'وزارة النفط العراقية',
      countryName: 'جمهورية العراق',
      copyrightText: 'جميع الحقوق محفوظة © 2026 - شركة نفط الوسط • وزارة النفط العراقية',
      logoSubtext: 'عراق',
      logoUrl: OFFICIAL_MOC_LOGO_SVG,
    } as any,
    users: [
      {
        id: 'USR-101',
        name: 'مدير النظام',
        username: 'admin',
        password: 'admin123',
        role: 'مدير النظام',
        email: 'admin@mdoc.gov.iq',
        governorate: 'واسط',
        field: 'الأحدب',
        status: 'active',
        lastActive: 'الآن',
      },
    ] as any[],
    referenceData: null as any,
  };

  // ملف البيانات في .data\store.json (نفس ترتيب بقية الأنظمة). الملف القديم data_store_backup.json يُنقل تلقائياً عند أول تشغيل.
  const DATA_DIR = process.env.BMS_DATA_DIR || path.join(process.cwd(), '.data');
  const PERSISTENCE_FILE_PATH = path.join(DATA_DIR, 'store.json');
  const LEGACY_PERSISTENCE_FILE_PATH = path.join(process.cwd(), 'data_store_backup.json');
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // الملف القديم يُنسخ في وضع الملف فقط؛ مع PostgreSQL لا يُنشأ ملف بيانات محلي
    if (!configuredDatabaseUrl() && !fs.existsSync(PERSISTENCE_FILE_PATH) && fs.existsSync(LEGACY_PERSISTENCE_FILE_PATH)) {
      fs.copyFileSync(LEGACY_PERSISTENCE_FILE_PATH, PERSISTENCE_FILE_PATH);
      fs.chmodSync(PERSISTENCE_FILE_PATH, 0o644);
    }
  } catch (err) {
    console.warn('Note: Could not prepare data directory:', err);
  }

  // Load from disk if present to survive dev reboots and sync across all sessions
  try {
    if (fs.existsSync(PERSISTENCE_FILE_PATH)) {
      const diskRaw = fs.readFileSync(PERSISTENCE_FILE_PATH, 'utf-8');
      const diskData = JSON.parse(diskRaw);
      if (diskData.units && Array.isArray(diskData.units)) memStore.units = diskData.units;
      if (diskData.maintenance && Array.isArray(diskData.maintenance)) memStore.maintenance = diskData.maintenance;
      if (diskData.occupancy && Array.isArray(diskData.occupancy)) memStore.occupancy = diskData.occupancy;
      if (diskData.inspections && Array.isArray(diskData.inspections)) memStore.inspections = diskData.inspections;
      if (diskData.auditLogs && Array.isArray(diskData.auditLogs)) memStore.auditLogs = diskData.auditLogs;
      if (diskData.orgEntities && Array.isArray(diskData.orgEntities)) memStore.orgEntities = diskData.orgEntities;
      if (diskData.branding && diskData.branding.systemName) {
        memStore.branding = {
          ...memStore.branding,
          ...diskData.branding,
          logoUrl: diskData.branding.logoUrl || OFFICIAL_MOC_LOGO_SVG,
        };
      }
      if (diskData.users && Array.isArray(diskData.users) && diskData.users.length > 0) {
        memStore.users = diskData.users.map((u: any) => {
          if (u.username === 'admin') {
            return {
              ...u,
              id: 'USR-101',
              name: u.name || 'مدير النظام',
              phone: u.phone || '',
              role: 'مدير النظام',
              status: 'active',
              password: u.password || 'admin123',
            };
          }
          return u;
        });
      }
      if (diskData.referenceData) memStore.referenceData = diskData.referenceData;
    }
  } catch (err) {
    console.warn('Note: Could not load persistence file on startup:', err);
  }

  // ==========================================================================
  // طبقة التخزين الدائم (المرحلة 2): PostgreSQL هو المصدر المعتمد عند ضبط DATABASE_URL
  // ==========================================================================
  class StorageUnavailableError extends Error {}
  const storage = createStorage({ dataDir: DATA_DIR, dump: () => JSON.stringify(memStore, null, 2) });
  type CollectionDef = { get: () => any[]; set: (rows: any[]) => void; idOf: (r: any) => string };
  const COLLECTIONS: Record<string, CollectionDef> = {
    units: { get: () => memStore.units, set: (r) => { memStore.units = r; }, idOf: (r) => String(r?.code) },
    maintenance: { get: () => memStore.maintenance, set: (r) => { memStore.maintenance = r; }, idOf: (r) => String(r?.id) },
    occupancy: { get: () => memStore.occupancy, set: (r) => { memStore.occupancy = r; }, idOf: (r) => String(r?.id) },
    inspections: { get: () => memStore.inspections, set: (r) => { memStore.inspections = r; }, idOf: (r) => String(r?.id) },
    auditLogs: { get: () => memStore.auditLogs, set: (r) => { memStore.auditLogs = r; }, idOf: (r) => String(r?.id) },
    orgEntities: { get: () => memStore.orgEntities, set: (r) => { memStore.orgEntities = r; }, idOf: (r) => String(r?.id) },
    users: { get: () => memStore.users, set: (r) => { memStore.users = r; }, idOf: (r) => String(r?.id) },
    settings: {
      get: () => [
        { id: 'branding', value: memStore.branding },
        { id: 'referenceData', value: memStore.referenceData ?? null },
      ],
      set: (rows) => {
        for (const r of rows) {
          if (r.id === 'branding' && r.value) memStore.branding = r.value;
          if (r.id === 'referenceData') memStore.referenceData = r.value;
        }
      },
      idOf: (r) => String(r?.id),
    },
    sessions: {
      get: () => Array.from(activeSessions.values()),
      set: (rows) => {
        activeSessions.clear();
        for (const s of rows) if (s && s.token && s.expiresAt > Date.now()) activeSessions.set(s.token, s);
      },
      idOf: (r) => String(r?.token),
    },
  };

  const mirror = createFirestoreMirror({
    dataDir: DATA_DIR,
    getRecord: (collection, id) => {
      const def = COLLECTIONS[collection];
      return def ? def.get().find((r) => def.idOf(r) === id) ?? null : null;
    },
  });

  // آخر ما كُتب فعلاً في المخزن الدائم: collection → id → JSON
  const persisted = new Map<string, Map<string, string>>();
  let dbHealthy = true;
  let commitChain: Promise<void> = Promise.resolve();

  /**
   * يكتب الفرق بين الذاكرة والمخزن الدائم. عند الفشل تُعاد الذاكرة إلى آخر حالة محفوظة ويُرمى خطأ،
   * فلا يرى المستخدم تعديلاً لم يُحفظ. ids اختيارية لتقليل المقارنة إلى سجلات بعينها.
   */
  function commit(keys?: string[], ids?: string[]): Promise<void> {
    const run = async () => {
      const targets = keys || Object.keys(COLLECTIONS);
      const only = ids && targets.length === 1 ? new Set(ids) : null;
      const ops: StorageOp[] = [];
      const staged: Array<() => void> = [];
      for (const key of targets) {
        const def = COLLECTIONS[key];
        let prev = persisted.get(key);
        if (!prev) {
          prev = new Map();
          persisted.set(key, prev);
        }
        const prevMap = prev;
        const seen = new Set<string>();
        for (const row of def.get()) {
          const id = def.idOf(row);
          seen.add(id);
          if (only && !only.has(id)) continue;
          const json = JSON.stringify(row);
          if (prevMap.get(id) !== json) {
            ops.push({ t: 'put', c: key, id, data: row });
            staged.push(() => prevMap.set(id, json));
          }
        }
        for (const id of only ? Array.from(only) : Array.from(prevMap.keys())) {
          if (!seen.has(id) && prevMap.has(id)) {
            ops.push({ t: 'del', c: key, id });
            staged.push(() => prevMap.delete(id));
          }
        }
      }
      if (ops.length === 0) return;
      try {
        await storage.apply(ops);
      } catch (err) {
        for (const key of targets) {
          const prevMap = persisted.get(key)!;
          COLLECTIONS[key].set(Array.from(prevMap.values()).map((j) => JSON.parse(j)));
        }
        if (storage.mode === 'postgres') dbHealthy = await storage.ping();
        console.error('[storage] فشل الحفظ في المخزن الدائم:', (err as any)?.message || err);
        throw new StorageUnavailableError('storage write failed');
      }
      for (const fn of staged) fn();
      mirror.enqueue(ops);
    };
    const p = commitChain.then(run, run);
    commitChain = p.catch(() => {});
    return p;
  }

  async function loadFromStorage(): Promise<boolean> {
    const snapshot = await storage.loadAll();
    const hasData = Object.values(snapshot).some((rows) => rows.length > 0);
    if (!hasData) return false;
    for (const [key, def] of Object.entries(COLLECTIONS)) {
      const rows = (snapshot[key] || []).map((r) => r.data);
      if (key === 'orgEntities') rows.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      def.set(rows);
      const map = new Map<string, string>();
      for (const row of rows) map.set(def.idOf(row), JSON.stringify(row));
      persisted.set(key, map);
    }
    return true;
  }

  let importedFromFile = false;
  if (storage.mode === 'postgres') {
    try {
      await storage.init();
      const loaded = await loadFromStorage();
      // أول تشغيل على قاعدة فارغة: تُنقل إليها محتويات store.json الحالية (إن وُجدت) مرة واحدة
      importedFromFile = !loaded && fs.existsSync(PERSISTENCE_FILE_PATH);
      console.log(`[storage] PostgreSQL هو المصدر المعتمد${loaded ? '' : ' (قاعدة فارغة، ستُهيَّأ الآن)'}`);
    } catch (err: any) {
      console.error(`[storage] تعذّر الاتصال بقاعدة البيانات PostgreSQL المحددة في DATABASE_URL: ${err?.message || err}`);
      console.error('[storage] لن يعمل الخادم دون قاعدته المعتمدة. تحقق من تشغيل خدمة PostgreSQL ومن DATABASE_URL في .env');
      process.exit(1);
    }
  } else {
    await storage.init();
    console.warn('[storage] DATABASE_URL غير مضبوط: التخزين في ملف محلي (.data/store.json) — للتجربة فقط، غير معتمد للتشغيل الفعلي');
  }

  // Seed default official Midland Oil Company organizational entities if empty
  if (!memStore.orgEntities || memStore.orgEntities.length === 0) {
    memStore.orgEntities = [...INITIAL_ORG_ENTITIES];
  }

  // ترقية كلمات المرور المخزنة كنص صريح إلى scrypt عند الإقلاع
  if (memStore.users.some((u: any) => u && u.password && !isPasswordHashed(u.password))) {
    memStore.users = secureUsersForStore(memStore.users, memStore.users);
  }

  // الجلسات تُحفظ على القرص حتى لا يُسجَّل خروج المستخدمين عند إعادة تشغيل الخادم
  const SESSIONS_FILE_PATH = path.join(DATA_DIR, 'sessions.json');
  try {
    if (storage.mode === 'file' && fs.existsSync(SESSIONS_FILE_PATH)) {
      const saved = JSON.parse(fs.readFileSync(SESSIONS_FILE_PATH, 'utf-8'));
      if (Array.isArray(saved)) {
        for (const s of saved) {
          if (s && s.token && s.expiresAt > Date.now()) activeSessions.set(s.token, s);
        }
      }
    }
  } catch (err) {
    console.warn('Note: Could not load sessions file:', err);
  }

  function saveSessions() {
    if (storage.mode === 'postgres') {
      void commit(['sessions']).catch(() => {});
      return;
    }
    try {
      fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(Array.from(activeSessions.values())), 'utf-8');
    } catch (err) {
      console.warn('Note: Could not write sessions file:', err);
    }
  }

  // أول كتابة: تثبيت الحالة الحالية (البذور وترقية كلمات المرور، أو الاستيراد الأول من الملف)
  try {
    await commit();
    if (importedFromFile) {
      fs.renameSync(PERSISTENCE_FILE_PATH, path.join(DATA_DIR, `store.imported-${Date.now()}.json`));
      console.log('[storage] نُقلت بيانات store.json إلى PostgreSQL، وأُعيدت تسمية الملف');
    }
  } catch (err) {
    console.error('[storage] تعذّرت الكتابة الأولى في المخزن الدائم');
    if (storage.mode === 'postgres') process.exit(1);
  }

  // مراقبة قاعدة البيانات: عند انقطاعها تُرفض الطلبات بخطأ واضح، وعند عودتها تُعاد قراءة البيانات منها
  if (storage.mode === 'postgres') {
    const healthTimer = setInterval(async () => {
      const ok = await storage.ping();
      if (ok && !dbHealthy) {
        try {
          await loadFromStorage();
          dbHealthy = true;
          notifySyncChange('all_updated', { reason: 'db-recovered' });
        } catch {}
      } else {
        dbHealthy = ok;
      }
    }, Math.max(1000, Number(process.env.BMS_DB_HEALTH_INTERVAL_MS) || 15000));
    healthTimer.unref?.();
  }

  function getRequestSession(req: express.Request): ActiveSession | null {
    const header = String(req.headers.authorization || '');
    let token = header.replace(/^Bearer\s+/i, '').trim();
    // EventSource لا يرسل ترويسات: يُقبل الرمز في عنوان الطلب لمسار الأحداث فقط
    if (!token && req.path === '/sync/events' && typeof req.query.token === 'string') token = req.query.token;
    if (!token) return null;
    const session = activeSessions.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      activeSessions.delete(token);
      saveSessions();
      return null;
    }
    return session;
  }


  // ==========================================================================
  // Real-Time Synchronization Bus (SSE & Event Push)
  // ==========================================================================
  let syncVersion = Date.now();
  const sseClients = new Set<express.Response>();

  function notifySyncChange(eventType: string, payload?: any) {
    syncVersion = Date.now();
    const eventData = JSON.stringify({
      type: eventType,
      syncVersion,
      timestamp: Date.now(),
      payload: payload || null,
    });
    for (const client of sseClients) {
      try {
        client.write(`data: ${eventData}\n\n`);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  }

  // Periodic heartbeat for SSE
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }, 25000);

  // Attach server time header to all API responses for client synchronization
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Server-Time', Date.now().toString());
    next();
  });

  // ==========================================================================
  // المصادقة والصلاحيات: كل مسارات /api تتطلب جلسة صالحة عدا القائمة العامة أدناه
  // ==========================================================================
  // ---- جدول الصلاحيات حسب الدور (يطابق ما تعرضه الواجهة لكل دور) ----
  type RoleKind = 'admin' | 'operator' | 'inspector' | 'maintenance' | 'user';
  function roleKind(role: any): RoleKind {
    if (isAdminRole(role)) return 'admin';
    if (role === 'مشغل النظام' || role === 'operator') return 'operator';
    if (role === 'موظف الكشف والصيانة' || role === 'inspector') return 'inspector';
    if (role === 'موظف الصيانة' || role === 'maintenance_employee') return 'maintenance';
    return 'user';
  }

  function isWriteAllowed(method: string, apiPath: string, kind: RoleKind): boolean {
    if (kind === 'admin') return true;
    if (apiPath.startsWith('/auth/')) return true;
    // الإعدادات والمستخدمون والهيكل التنظيمي وكل عمليات الاستبدال الجماعي: مدير النظام فقط
    if (ADMIN_ONLY_PREFIXES.some((p) => apiPath === p || apiPath.startsWith(p + '/'))) return false;
    if (apiPath.endsWith('/bulk')) return false;
    // الدفعة: يكفي أن يملك الدور إحدى عمليات القسم؛ كل سجل يُفحص داخل المسار نفسه
    if (apiPath.endsWith('/batch')) {
      const base = apiPath.slice(0, -'/batch'.length);
      return isWriteAllowed('POST', base, kind) || isWriteAllowed('PUT', `${base}/x`, kind);
    }
    const section = apiPath.split('/')[1] || '';
    if (method === 'DELETE') return kind === 'operator' && ['units', 'maintenance', 'occupancy', 'inspections'].includes(section);
    switch (section) {
      case 'units':
        // الإنشاء للمشغل؛ التعديل (درجة الحالة بعد الكشف أو الصيانة) للمشغل وموظفي الكشف والصيانة
        if (method === 'POST') return kind === 'operator';
        return kind === 'operator' || kind === 'inspector' || kind === 'maintenance';
      case 'occupancy':
        return kind === 'operator';
      case 'inspections':
        return kind === 'operator' || kind === 'inspector';
      case 'maintenance':
        // أي مستخدم يستطيع رفع طلب صيانة؛ التعديل لغير دور «مستخدم»
        return method === 'POST' ? true : kind !== 'user';
      case 'audit-logs':
        return true;
      default:
        return false;
    }
  }

  // ---- التحقق من مدخلات مسارات الكتابة ----
  const idField = z.string().trim().min(1).max(128);
  const unitSchema = z.object({ code: idField, name: z.string().trim().min(1).max(255) }).passthrough();
  const linkedRecordSchema = z.object({ id: idField, unitCode: idField }).passthrough();
  const orgEntitySchema = z.object({ id: idField }).passthrough();
  const bodySchemas: Array<{ method: string; pattern: RegExp; schema: z.ZodTypeAny }> = [
    { method: 'POST', pattern: /^\/auth\/login$/, schema: z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(500) }) },
    { method: 'POST', pattern: /^\/units$/, schema: unitSchema },
    { method: 'PUT', pattern: /^\/units\/[^/]+$/, schema: unitSchema },
    { method: 'POST', pattern: /^\/units\/bulk$/, schema: z.object({ units: z.array(unitSchema).max(50000).optional() }).passthrough() },
    { method: 'POST', pattern: /^\/(maintenance|occupancy|inspections)$/, schema: linkedRecordSchema },
    { method: 'PUT', pattern: /^\/(maintenance|occupancy|inspections)\/[^/]+$/, schema: linkedRecordSchema },
    {
      method: 'POST',
      pattern: /^\/[a-z-]+\/batch$/,
      schema: z.object({
        upserts: z.array(z.object({}).passthrough()).max(50000).optional(),
        deletes: z.array(idField).max(50000).optional(),
      }),
    },
    { method: 'POST', pattern: /^\/org-entities$/, schema: orgEntitySchema },
    { method: 'PUT', pattern: /^\/org-entities\/[^/]+$/, schema: orgEntitySchema },
    { method: 'POST', pattern: /^\/users\/bulk$/, schema: z.object({ users: z.array(z.object({ id: idField, username: idField }).passthrough()).max(5000).optional() }).passthrough() },
  ];

  function validateRequestBody(method: string, apiPath: string, body: any): string | null {
    const entry = bodySchemas.find((e) => e.method === method && e.pattern.test(apiPath));
    if (!entry) return null;
    const result = entry.schema.safeParse(body);
    if (result.success) return null;
    const issue = result.error.issues[0];
    return `${issue.path.join('.') || 'الطلب'} — ${issue.message}`;
  }

  // سجل تدقيق يكتبه الخادم مع كل عملية كتابة (ناجحة أو مرفوضة)، بلا محتوى الطلب
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      const apiPath = req.path;
      if (apiPath !== '/audit-logs' && apiPath !== '/auth/verify-session') {
        res.on('finish', () => {
          const session = (req as any).session as ActiveSession | undefined;
          storage
            .appendAudit({
              at: new Date().toISOString(),
              userId: session?.userId || '',
              userName: session?.username || (apiPath === '/auth/login' ? String(req.body?.username || '').slice(0, 100) : ''),
              role: session?.role || '',
              method: req.method,
              path: apiPath.slice(0, 300),
              status: res.statusCode,
              ip: (req.ip || '').replace(/^::ffff:/, ''),
            })
            .catch(() => {});
        });
      }
    }
    // قاعدة البيانات المعتمدة متوقفة: خطأ واضح بدل بيانات قديمة
    if (!dbHealthy && !['/health', '/health/', '/server-time', '/status'].includes(req.path) && !req.path.startsWith('/download')) {
      return res.status(503).json({
        success: false,
        error: 'قاعدة البيانات غير متاحة حالياً. أعد المحاولة بعد قليل أو أبلغ مسؤول النظام.',
        code: 'DB_UNAVAILABLE',
      });
    }
    next();
  });

  const PUBLIC_API_PATHS = new Set(['/health', '/health/', '/server-time', '/auth/login', '/auth/verify-session']);
  const ADMIN_ONLY_PREFIXES = ['/users', '/system', '/branding', '/reference-data', '/org-entities'];

  app.use('/api', (req, res, next) => {
    if (
      PUBLIC_API_PATHS.has(req.path) ||
      req.path.startsWith('/download') ||
      (req.method === 'GET' && req.path === '/branding')
    ) {
      return next();
    }
    const session = getRequestSession(req);
    if (!session) {
      return res.status(401).json({ error: 'غير مصرح: يلزم تسجيل الدخول', code: 'UNAUTHENTICATED' });
    }
    (req as any).session = session;

    // حساب بكلمة مرور افتراضية: لا يُسمح له بشيء قبل تغييرها
    if (session.mustChangePassword && req.path !== '/auth/change-password' && req.path !== '/auth/logout') {
      return res.status(403).json({
        error: 'يجب تغيير كلمة المرور الافتراضية قبل استخدام النظام',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }

    if (req.method !== 'GET') {
      if (!isWriteAllowed(req.method, req.path, roleKind(session.role))) {
        return res.status(403).json({ error: 'ليست لديك صلاحية تنفيذ هذه العملية', code: 'FORBIDDEN' });
      }
      const problem = validateRequestBody(req.method, req.path, req.body);
      if (problem) {
        return res.status(400).json({ success: false, error: `بيانات الطلب غير صالحة: ${problem}`, code: 'INVALID_INPUT' });
      }
    }
    return next();
  });

  // Health check endpoint (public, no auth required)
  app.get('/api/health', async (req, res) => {
    // مسار عام: لا يعيد أي بيانات تشغيلية
    res.json({
      status: 'ok',
      storage: storage.mode,
      database: storage.mode === 'postgres' ? (dbHealthy ? 'connected' : 'unavailable') : 'not-configured',
      syncVersion,
      timestamp: Date.now(),
    });
  });

  // Dedicated Server Time & Date Endpoint (public, for client synchronization)
  app.get('/api/server-time', (req, res) => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    res.json({
      serverTimeMs: now.getTime(),
      serverIso: now.toISOString(),
      serverDateFormatted: `${d}-${m}-${y}`,
      serverTimeFormatted: `${hh}:${mm}:${ss}`,
      serverDateTimeFormatted: `${d}-${m}-${y} ${hh}:${mm}:${ss}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Baghdad',
    });
  });

  // حالة الخادم لشريط الحالة في الواجهة: الساعة، عنوان العميل، آخر نسخة احتياطية (للمدير فقط)
  let backupInfoCache: { at: number; value: any } | null = null;
  function readLastBackup() {
    if (backupInfoCache && Date.now() - backupInfoCache.at < 30000) return backupInfoCache.value;
    let last: { at: string; type: string; name: string } | null = null;
    try {
      const dir = path.join(process.cwd(), 'backups');
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const infoFile = path.join(dir, entry.name, 'backup-info.json');
        if (!fs.existsSync(infoFile)) continue;
        const info = JSON.parse(fs.readFileSync(infoFile, 'utf-8').replace(/^\uFEFF/, ''));
        if (info && info.at && (!last || new Date(info.at).getTime() > new Date(last.at).getTime())) {
          last = { at: info.at, type: String(info.type || 'manual'), name: entry.name };
        }
      }
    } catch {}
    backupInfoCache = { at: Date.now(), value: { last } };
    return backupInfoCache.value;
  }

  app.get('/api/status', (req, res) => {
    const session = (req as any).session as ActiveSession | undefined;
    const now = new Date();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      serverTime: now.toISOString(),
      serverUtcOffset: -now.getTimezoneOffset(),
      clientIp: (req.ip || '').replace(/^::ffff:/, ''),
      backup: session && isAdminRole(session.role) ? readLastBackup() : null,
      storage: { mode: storage.mode, healthy: dbHealthy },
      mirror: session && isAdminRole(session.role) ? mirror.status() : null,
    });
  });

  // Real-Time SSE Stream Endpoint
  app.get('/api/sync/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'connected', syncVersion, timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.get('/api/sync/version', (req, res) => {
    res.json({ syncVersion, timestamp: Date.now() });
  });

  app.get('/api/sync/all', async (req, res) => {
    res.json({
      units: memStore.units,
      maintenance: memStore.maintenance,
      occupancy: memStore.occupancy,
      inspections: memStore.inspections,
      auditLogs: memStore.auditLogs,
      orgEntities: memStore.orgEntities,
      branding: memStore.branding,
      users: memStore.users.map(sanitizeUserObject),
      referenceData: memStore.referenceData,
      syncVersion,
      timestamp: Date.now(),
    });
  });

  // ==========================================================================
  // Rate Limiting Middleware (Protected Routes under /api, excluding /health)
  // ==========================================================================
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
      trustProxy: false,
    },
    skip: (req) =>
      req.path === '/health' || req.path === '/health/' || req.path === '/server-time' || req.path === '/status',
    message: { error: 'عدد الطلبات كبير جداً، الرجاء المحاولة بعد قليل' },
    statusCode: 429,
  });
  app.use('/api', apiLimiter);

  // ==========================================================================
  // 1. مجموعات البيانات — عمليات على السجل الواحد مع رقم نسخة (المرحلة 2)
  // ==========================================================================
  function stampRecord(rec: any, existing: any, req: express.Request) {
    const session = (req as any).session as ActiveSession | undefined;
    return {
      ...rec,
      _v: (Number(existing?._v) || 0) + 1,
      _updatedAt: new Date().toISOString(),
      _updatedBy: session?.username || '',
    };
  }

  function isVersionConflict(incoming: any, existing: any): boolean {
    if (!existing || incoming?._v === undefined || incoming?._v === null) return false;
    return Number(incoming._v) !== (Number(existing._v) || 0);
  }

  function storageFailure(res: express.Response, err: any) {
    if (err instanceof StorageUnavailableError) {
      return res.status(503).json({
        success: false,
        error: 'تعذّر الحفظ: قاعدة البيانات غير متاحة حالياً. لم يُحفظ التعديل.',
        code: 'DB_UNAVAILABLE',
      });
    }
    console.error('Request failed:', err);
    return res.status(500).json({ success: false, error: 'فشل تنفيذ العملية على الخادم', code: 'SERVER_ERROR' });
  }

  const CONFLICT_MESSAGE = 'عُدّل هذا السجل من مستخدم آخر بعد فتحه. حُدّثت البيانات على شاشتك، أعد التعديل إن لزم.';

  function registerCollection(o: {
    route: string;
    key: 'units' | 'maintenance' | 'occupancy' | 'inspections' | 'auditLogs' | 'orgEntities';
    event: string;
    single: string;
    appendOnly?: boolean;
  }) {
    const def = COLLECTIONS[o.key];
    const list = () => def.get();
    const find = (id: string) => list().find((r) => def.idOf(r) === id);
    const put = (rec: any, replaceId?: string) => {
      const rows = list();
      const idx = rows.findIndex((r) => def.idOf(r) === (replaceId ?? def.idOf(rec)));
      if (idx >= 0) rows[idx] = rec;
      else rows.unshift(rec);
    };
    const remove = (id: string) => def.set(list().filter((r) => def.idOf(r) !== id));

    app.get(`/api/${o.route}`, (req, res) => res.json(list()));

    app.post(`/api/${o.route}`, async (req, res) => {
      const id = def.idOf(req.body);
      const existing = find(id);
      if (o.appendOnly && existing) return res.json({ success: true, [o.single]: existing });
      if (isVersionConflict(req.body, existing)) {
        return res.status(409).json({ success: false, code: 'VERSION_CONFLICT', error: CONFLICT_MESSAGE, current: existing });
      }
      const rec = stampRecord(req.body, existing, req);
      put(rec);
      try {
        await commit([o.key], [id]);
      } catch (err) {
        return storageFailure(res, err);
      }
      notifySyncChange(o.event, { action: existing ? 'update' : 'add', id });
      return res.json({ success: true, [o.single]: rec });
    });

    if (!o.appendOnly) {
      app.put(`/api/${o.route}/:id`, async (req, res) => {
        const paramId = req.params.id;
        const existing = find(paramId);
        if (isVersionConflict(req.body, existing)) {
          return res.status(409).json({ success: false, code: 'VERSION_CONFLICT', error: CONFLICT_MESSAGE, current: existing });
        }
        const rec = stampRecord(req.body, existing, req);
        put(rec, paramId);
        try {
          await commit([o.key], [paramId, def.idOf(rec)]);
        } catch (err) {
          return storageFailure(res, err);
        }
        notifySyncChange(o.event, { action: 'update', id: paramId });
        return res.json({ success: true, [o.single]: rec });
      });

      app.delete(`/api/${o.route}/:id`, async (req, res) => {
        remove(req.params.id);
        try {
          await commit([o.key], [req.params.id]);
        } catch (err) {
          return storageFailure(res, err);
        }
        notifySyncChange(o.event, { action: 'delete', id: req.params.id });
        return res.json({ success: true });
      });
    }

    // دفعة عمليات على سجلات محددة: إمّا تُطبَّق كلها أو لا يُطبَّق شيء
    app.post(`/api/${o.route}/batch`, async (req, res) => {
      const kind = roleKind(((req as any).session as ActiveSession).role);
      const upserts: any[] = Array.isArray(req.body?.upserts) ? req.body.upserts : [];
      const deletes: string[] = o.appendOnly ? [] : Array.isArray(req.body?.deletes) ? req.body.deletes.map(String) : [];
      const conflicts: any[] = [];
      for (const rec of upserts) {
        const id = def.idOf(rec);
        if (!id || id === 'undefined') {
          return res.status(400).json({ success: false, error: 'بيانات الطلب غير صالحة: سجل بلا معرّف', code: 'INVALID_INPUT' });
        }
        const existing = find(id);
        const allowed = existing
          ? isWriteAllowed('PUT', `/${o.route}/${id}`, kind)
          : isWriteAllowed('POST', `/${o.route}`, kind);
        if (!allowed) return res.status(403).json({ error: 'ليست لديك صلاحية تنفيذ هذه العملية', code: 'FORBIDDEN' });
        if (isVersionConflict(rec, existing)) conflicts.push({ id, current: existing });
      }
      if (deletes.length > 0 && !isWriteAllowed('DELETE', `/${o.route}/x`, kind)) {
        return res.status(403).json({ error: 'ليست لديك صلاحية تنفيذ هذه العملية', code: 'FORBIDDEN' });
      }
      if (conflicts.length > 0) {
        return res.status(409).json({ success: false, code: 'VERSION_CONFLICT', error: CONFLICT_MESSAGE, conflicts });
      }
      const records: any[] = [];
      for (const rec of upserts) {
        const existing = find(def.idOf(rec));
        if (o.appendOnly && existing) continue;
        const stamped = stampRecord(rec, existing, req);
        put(stamped);
        records.push(stamped);
      }
      for (const id of deletes) remove(id);
      try {
        await commit([o.key], [...records.map((r) => def.idOf(r)), ...deletes]);
      } catch (err) {
        return storageFailure(res, err);
      }
      if (records.length > 0 || deletes.length > 0) notifySyncChange(o.event, { action: 'batch' });
      return res.json({ success: true, records });
    });

    // استيراد جماعي (للمدير): يضيف ويحدّث فقط، ولا يحذف ما ليس في القائمة
    app.post(`/api/${o.route}/bulk`, async (req, res) => {
      const items: any[] = (Object.values(req.body || {}).find((v) => Array.isArray(v)) as any[]) || [];
      const ids: string[] = [];
      for (const rec of items) {
        const id = def.idOf(rec);
        if (!id || id === 'undefined') continue;
        const existing = find(id);
        if (o.appendOnly && existing) continue;
        put(stampRecord(rec, existing, req));
        ids.push(id);
      }
      try {
        await commit([o.key], ids);
      } catch (err) {
        return storageFailure(res, err);
      }
      if (ids.length > 0) notifySyncChange(o.event, { action: 'bulk' });
      return res.json({ success: true, count: ids.length });
    });
  }

  registerCollection({ route: 'units', key: 'units', event: 'units_updated', single: 'unit' });
  registerCollection({ route: 'maintenance', key: 'maintenance', event: 'maintenance_updated', single: 'request' });
  registerCollection({ route: 'occupancy', key: 'occupancy', event: 'occupancy_updated', single: 'record' });
  registerCollection({ route: 'inspections', key: 'inspections', event: 'inspections_updated', single: 'inspection' });
  registerCollection({ route: 'org-entities', key: 'orgEntities', event: 'org_entities_updated', single: 'entity' });
  // سجل النشاطات: إضافة فقط — لا تعديل ولا حذف من أي مسار
  registerCollection({ route: 'audit-logs', key: 'auditLogs', event: 'audit_logs_updated', single: 'log', appendOnly: true });

  // سجل التدقيق الذي يكتبه الخادم نفسه مع كل عملية كتابة (للمدير، قراءة فقط)
  app.get('/api/audit-trail', async (req, res) => {
    const session = (req as any).session as ActiveSession;
    if (!isAdminRole(session.role)) {
      return res.status(403).json({ error: 'ليست لديك صلاحية تنفيذ هذه العملية', code: 'FORBIDDEN' });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 2000);
    try {
      return res.json({ entries: await storage.readAudit(limit) });
    } catch (err) {
      return storageFailure(res, new StorageUnavailableError());
    }
  });

  // ==========================================================================
  // 7. هوية النظام
  // ==========================================================================
  app.get('/api/branding', (req, res) => res.json(memStore.branding));

  app.post('/api/branding', async (req, res) => {
    memStore.branding = req.body;
    try {
      await commit(['settings']);
    } catch (err) {
      return storageFailure(res, err);
    }
    notifySyncChange('branding_updated', { branding: memStore.branding });
    return res.json({ success: true, branding: memStore.branding });
  });

  // ==========================================================================
  // 7.5. Authentication & Cyber Defense Endpoints (المصادقة وحماية الجلسات)
  // ==========================================================================
  app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
    const { username, password } = req.body || {};
    const clientIp = req.ip || 'unknown';
    const rawUser = String(username || '').trim().toLowerCase();
    const plainPass = String(password || '').trim();

    if (!rawUser || !plainPass) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال اسم المستخدم وكلمة المرور',
      });
    }

    const lockoutKey = `${clientIp}_${rawUser}`;
    const attemptRecord = failedLoginAttempts.get(lockoutKey);
    const now = Date.now();

    if (attemptRecord && attemptRecord.lockedUntil > now) {
      const remainingMinutes = Math.ceil((attemptRecord.lockedUntil - now) / 60000);
      return res.status(429).json({
        success: false,
        error: `تم إيقاف محاولات الدخول لهذا الحساب مؤقتاً لتكرار الإدخال الخاطئ. يرجى الانتظار ${remainingMinutes} دقيقة.`,
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
      });
    }

    // Retrieve active users list
    const usersList = memStore.users;

    const foundUser = usersList.find(
      (u: any) =>
        (u.username && u.username.toLowerCase() === rawUser) ||
        (u.email && u.email.toLowerCase() === rawUser) ||
        (u.email && u.email.split('@')[0].toLowerCase() === rawUser) ||
        (u.name && u.name.toLowerCase() === rawUser)
    );

    if (!foundUser) {
      const curr = failedLoginAttempts.get(lockoutKey) || { count: 0, lockedUntil: 0 };
      const newCount = curr.count + 1;
      const lockedUntil = newCount >= 5 ? now + 15 * 60 * 1000 : 0;
      failedLoginAttempts.set(lockoutKey, { count: newCount, lockedUntil });

      const auditEntry = {
        id: `LOG-SEC-${Date.now()}`,
        unitCode: 'SEC-GATE',
        action: 'محاولة اختراق/دخول بحساب غير معروف',
        user: rawUser || 'مجهول',
        details: `محاولة دخول فاشلة من عنوان IP: ${clientIp} (المحاولة ${newCount} من 5)`,
        timestamp: new Date().toISOString(),
      };
      memStore.auditLogs.unshift(auditEntry);

      return res.status(401).json({
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      });
    }

    // Check account status
    if (foundUser.status === 'disabled') {
      return res.status(403).json({
        success: false,
        error: 'تم إيقاف تنشيط هذا الحساب من قبل إدارة النظام. يرجى مراجعة المسؤول.',
      });
    }

    // Validate password
    const expectedPass = foundUser.password || foundUser.passwordHash || '';
    const isPasswordValid = verifyPasswordMatch(plainPass, expectedPass);

    if (!isPasswordValid) {
      const curr = failedLoginAttempts.get(lockoutKey) || { count: 0, lockedUntil: 0 };
      const newCount = curr.count + 1;
      const lockedUntil = newCount >= 5 ? now + 15 * 60 * 1000 : 0;
      failedLoginAttempts.set(lockoutKey, { count: newCount, lockedUntil });

      const auditEntry = {
        id: `LOG-SEC-${Date.now()}`,
        unitCode: 'SEC-GATE',
        action: 'فشل إدخال كلمة المرور',
        user: foundUser.name || foundUser.username,
        details: `كلمة مرور خاطئة (محاولة ${newCount} من 5) من IP: ${clientIp}`,
        timestamp: new Date().toISOString(),
      };
      memStore.auditLogs.unshift(auditEntry);

      return res.status(401).json({
        success: false,
        error: newCount >= 5
          ? 'تم تجاوز الحد الأقصى للمحاولات الخاطئة وتم قفل الحساب مؤقتاً لمدة 15 دقيقة.'
          : 'كلمة المرور غير صحيحة، يرجى التأكد والمحاولة ثانية.',
      });
    }

    // Successful Login: Reset lockout counter
    failedLoginAttempts.delete(lockoutKey);

    // كلمة مرور افتراضية معروفة: يُفرض تغييرها قبل أي استخدام
    const mustChangePassword = DEFAULT_PASSWORDS.includes(plainPass);

    // ترقية كلمة المرور القديمة (نص صريح أو sha256) إلى scrypt بعد أول دخول ناجح
    if (!isPasswordHashed(expectedPass)) {
      const idx = memStore.users.findIndex((u: any) => u.id === foundUser.id);
      if (idx >= 0) {
        memStore.users[idx] = { ...memStore.users[idx], password: hashSecurePassword(plainPass) };
        await commit(['users']).catch(() => {});
      }
    }

    // Generate random 256-bit cryptographically secure token
    const token = `moc_sec_${crypto.randomBytes(32).toString('hex')}`;
    const session: ActiveSession = {
      token,
      userId: foundUser.id,
      username: foundUser.username,
      role: foundUser.role,
      name: foundUser.name,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      mustChangePassword,
    };
    activeSessions.set(token, session);
    saveSessions();

    // Record forensic audit log
    const successLog = {
      id: `LOG-SEC-${Date.now()}`,
      unitCode: 'SEC-GATE',
      action: 'تسجيل دخول موثق وناجح',
      user: `${foundUser.name} (${foundUser.role})`,
      details: `تم توثيق الدخول بنجاح عبر بروتوكول المصادقة المحمي من IP: ${clientIp}`,
      timestamp: new Date().toISOString(),
    };
    memStore.auditLogs.unshift(successLog);

    return res.json({
      success: true,
      token,
      mustChangePassword,
      user: sanitizeUserObject(foundUser),
    });
  });

  app.post('/api/auth/verify-session', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || (req.body && req.body.token);
    if (!token) {
      return res.status(401).json({ valid: false, error: 'رمز الجلسة غير موجود' });
    }
    const session = activeSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      activeSessions.delete(token);
      return res.status(401).json({ valid: false, error: 'انتهت صلاحية الجلسة' });
    }
    return res.json({ valid: true, user: { id: session.userId, username: session.username, role: session.role, name: session.name } });
  });

  app.post('/api/auth/logout', (req, res) => {
    const session = (req as any).session as ActiveSession | undefined;
    if (session) {
      activeSessions.delete(session.token);
      saveSessions();
    }
    return res.json({ success: true });
  });

  // تفضيلات مظهر الواجهة لكل مستخدم (اللون، الخط، نمط القائمة، الطي). null = العودة لمظهر النظام
  const uiPrefsSchema = z
    .object({
      theme: z.string().max(40).nullable().optional(),
      font: z.string().max(40).nullable().optional(),
      sidebar: z.enum(['primary', 'light']).nullable().optional(),
      collapsed: z.boolean().nullable().optional(),
    })
    .strict();

  app.patch('/api/auth/preferences', async (req, res) => {
    const session = (req as any).session as ActiveSession;
    const parsed = uiPrefsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'تفضيلات غير صالحة', code: 'INVALID_INPUT' });
    }
    const idx = memStore.users.findIndex((u: any) => u.id === session.userId);
    if (idx < 0) return res.status(404).json({ success: false, error: 'الحساب غير موجود' });
    const next: Record<string, any> = { ...(memStore.users[idx].uiPrefs || {}) };
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value === null) delete next[key];
      else if (value !== undefined) next[key] = value;
    }
    memStore.users[idx] = { ...memStore.users[idx], uiPrefs: next };
    try {
      await commit(['users']);
    } catch (err) {
      return storageFailure(res, err);
    }
    return res.json({ success: true, uiPrefs: next });
  });

  // تغيير المستخدم لكلمة مروره: التحقق من الكلمة الحالية يجري على الخادم فقط
  app.post('/api/auth/change-password', async (req, res) => {
    const session = (req as any).session as ActiveSession;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '').trim();
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف' });
    }
    if (DEFAULT_PASSWORDS.includes(newPassword) || newPassword === currentPassword) {
      return res.status(400).json({ success: false, error: 'اختر كلمة مرور جديدة مختلفة عن الحالية وعن الكلمات الافتراضية' });
    }
    const idx = memStore.users.findIndex((u: any) => u.id === session.userId);
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'الحساب غير موجود' });
    }
    if (!verifyPasswordMatch(currentPassword, memStore.users[idx].password || '')) {
      return res.status(400).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة، يرجى المحاولة ثانية' });
    }
    memStore.users[idx] = { ...memStore.users[idx], password: hashSecurePassword(newPassword) };
    try {
      await commit(['users']);
    } catch (err) {
      return storageFailure(res, err);
    }
    session.mustChangePassword = false;
    // إنهاء الجلسات الأخرى لهذا الحساب
    for (const [token, s] of activeSessions) {
      if (s.userId === session.userId && token !== session.token) activeSessions.delete(token);
    }
    saveSessions();
    notifySyncChange('users_updated', { action: 'update', id: session.userId });
    return res.json({ success: true });
  });

  // ==========================================================================
  // 8. المستخدمون (كلمات المرور لا تُرسل في أي استجابة)
  // ==========================================================================
  app.get('/api/users', (req, res) => res.json(memStore.users.map(sanitizeUserObject)));

  async function persistUsers(res: express.Response, payload: any, body: any) {
    try {
      await commit(['users']);
    } catch (err) {
      return storageFailure(res, err);
    }
    notifySyncChange('users_updated', payload);
    return res.json(body);
  }

  function protectPrimaryAdmin(user: any) {
    if (user.id === 'USR-101' || user.username === 'admin') {
      user.id = 'USR-101';
      user.username = 'admin';
      user.role = 'مدير النظام';
      user.status = 'active';
    }
    return user;
  }

  // استيراد جماعي: يضيف ويحدّث فقط، ولا يحذف حسابات غير واردة في القائمة
  app.post('/api/users/bulk', async (req, res) => {
    const incoming = secureUsersForStore(req.body.users || [], memStore.users).map(protectPrimaryAdmin);
    for (const user of incoming) {
      if (!user || !user.id || !user.username) continue;
      const idx = memStore.users.findIndex((u: any) => u.id === user.id);
      if (idx >= 0) memStore.users[idx] = user;
      else memStore.users.push(user);
    }
    return persistUsers(res, { action: 'bulk' }, { success: true });
  });

  app.post('/api/users', async (req, res) => {
    const user = secureUsersForStore([req.body], memStore.users)[0];
    if (!user || !user.id || !user.username) {
      return res.status(400).json({ success: false, error: 'بيانات الحساب ناقصة' });
    }
    protectPrimaryAdmin(user);
    const idx = memStore.users.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) memStore.users[idx] = user;
    else memStore.users.unshift(user);
    return persistUsers(res, { action: 'add', id: user.id }, { success: true, user: sanitizeUserObject(user) });
  });

  app.put('/api/users/:id', async (req, res) => {
    const user = secureUsersForStore([{ ...req.body, id: req.body?.id || req.params.id }], memStore.users)[0];
    if (req.params.id === 'USR-101') user.id = 'USR-101';
    protectPrimaryAdmin(user);
    const idx = memStore.users.findIndex((u: any) => u.id === req.params.id);
    if (idx >= 0) memStore.users[idx] = user;
    else memStore.users.push(user);
    return persistUsers(res, { action: 'update', id: req.params.id }, { success: true, user: sanitizeUserObject(user) });
  });

  app.delete('/api/users/:id', async (req, res) => {
    if (req.params.id === 'USR-101' || req.params.id === 'admin') {
      return res.status(403).json({ success: false, error: 'لا يمكن حذف حساب مدير النظام الأساسي (admin) أبداً' });
    }
    memStore.users = memStore.users.filter((u: any) => u.id !== req.params.id);
    // إنهاء جلسات الحساب المحذوف
    for (const [token, s] of activeSessions) if (s.userId === req.params.id) activeSessions.delete(token);
    saveSessions();
    return persistUsers(res, { action: 'delete', id: req.params.id }, { success: true });
  });

  // ==========================================================================
  // 9. البيانات المرجعية
  // ==========================================================================
  app.get('/api/reference-data', (req, res) => res.json(memStore.referenceData || null));

  app.post('/api/reference-data', async (req, res) => {
    memStore.referenceData = req.body;
    try {
      await commit(['settings']);
    } catch (err) {
      return storageFailure(res, err);
    }
    notifySyncChange('reference_data_updated', {});
    return res.json({ success: true });
  });

  // ==========================================================================
  // 10. ضبط المصنع وإعادة ضبط الأقسام (سجل النشاطات لا يُحذف)
  // ==========================================================================
  function resetLogEntry(req: express.Request, details: string) {
    const session = (req as any).session as ActiveSession;
    return {
      id: `LOG-RESET-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'إعادة ضبط',
      user: session.name || session.username,
      userInitials: (session.name || session.username || '').slice(0, 2),
      affectedField: 'النظام',
      previousValue: '',
      newValue: details,
    };
  }

  app.post('/api/system/factory-reset', async (req, res) => {
    const { mode } = req.body;
    const currentAdmin = memStore.users.find((u: any) => u.id === 'USR-101' || u.username === 'admin');
    const adminUser = {
      id: 'USR-101',
      name: 'مدير النظام',
      username: 'admin',
      role: 'مدير النظام',
      department: 'قسم إدارة وتقييم الأصول الهندسية',
      governorate: 'واسط',
      field: 'الأحدب',
      status: 'active',
      lastActive: 'الآن',
      // تبقى كلمة مرور المدير الحالية كما هي بعد ضبط المصنع
      password: currentAdmin?.password || hashSecurePassword('admin123'),
    };
    if (mode === 'full_default') {
      memStore.units = [...INITIAL_UNITS];
      memStore.maintenance = [...INITIAL_MAINTENANCE_REQUESTS];
      memStore.occupancy = [...INITIAL_OCCUPANCY_RECORDS];
      memStore.inspections = [...INITIAL_PERIODIC_INSPECTIONS];
      memStore.users = secureUsersForStore(INITIAL_USERS as any[], [adminUser]).map((u: any) =>
        u.id === 'USR-101' ? { ...u, password: adminUser.password } : u
      );
      memStore.orgEntities = [...INITIAL_ORG_ENTITIES];
    } else {
      memStore.units = [];
      memStore.maintenance = [];
      memStore.occupancy = [];
      memStore.inspections = [];
      memStore.orgEntities = [];
      memStore.users = [adminUser];
    }
    memStore.auditLogs.unshift(resetLogEntry(req, 'ضبط المصنع الشامل للنظام'));
    try {
      await commit();
    } catch (err) {
      return storageFailure(res, err);
    }
    notifySyncChange('all_updated', { mode });
    return res.json({ success: true, message: 'تمت استعادة ضبط المصنع الشامل بنجاح' });
  });

  app.post('/api/system/reset-module', async (req, res) => {
    const { moduleName, actionType } = req.body;
    const clear = actionType === 'clear';
    let event = '';
    switch (moduleName) {
      case 'units':
        memStore.units = clear ? [] : [...INITIAL_UNITS];
        event = 'units_updated';
        break;
      case 'maintenance':
        memStore.maintenance = clear ? [] : [...INITIAL_MAINTENANCE_REQUESTS];
        event = 'maintenance_updated';
        break;
      case 'inspections':
        memStore.inspections = clear ? [] : [...INITIAL_PERIODIC_INSPECTIONS];
        event = 'inspections_updated';
        break;
      case 'occupancy':
        memStore.occupancy = clear ? [] : [...INITIAL_OCCUPANCY_RECORDS];
        event = 'occupancy_updated';
        break;
      case 'users': {
        const currentAdmin = memStore.users.find((u: any) => u.id === 'USR-101' || u.username === 'admin');
        if (clear) {
          memStore.users = [
            currentAdmin || {
              id: 'USR-101',
              name: 'مدير النظام',
              username: 'admin',
              role: 'مدير النظام',
              status: 'active',
              password: hashSecurePassword('admin123'),
            },
          ];
        } else {
          memStore.users = secureUsersForStore(INITIAL_USERS as any[], currentAdmin ? [currentAdmin] : []);
        }
        event = 'users_updated';
        break;
      }
      case 'org_entities':
        memStore.orgEntities = clear ? [] : [...INITIAL_ORG_ENTITIES];
        event = 'org_entities_updated';
        break;
      case 'audit_logs':
        return res.status(403).json({
          success: false,
          error: 'سجل النشاطات لا يُحذف ولا يُعاد ضبطه',
          code: 'AUDIT_LOG_PROTECTED',
        });
      default:
        return res.status(400).json({ success: false, error: 'قسم غير معروف', code: 'INVALID_INPUT' });
    }
    memStore.auditLogs.unshift(resetLogEntry(req, `إعادة ضبط قسم ${moduleName} (${clear ? 'تفريغ' : 'القيم الافتراضية'})`));
    try {
      await commit();
    } catch (err) {
      return storageFailure(res, err);
    }
    notifySyncChange(event, { action: 'bulk' });
    notifySyncChange('audit_logs_updated', { action: 'add' });
    return res.json({ success: true });
  });

  // ==========================================================================
  // Dynamic Web App Manifest (Reflects System Branding in Real-Time for PWA/Mobile/PC)
  // ==========================================================================
  app.get('/manifest.json', (req, res) => {
    const branding = memStore.branding || {};
    const systemName = (branding.systemName || '').trim() || 'السجل الرقمي الموحد للأصول الهندسية والإنشائية';
    const companyName = (branding.companyName || '').trim() || 'شركة نفط الوسط';
    const ministryName = (branding.ministryName || '').trim() || 'وزارة النفط العراقية';
    const logoUrl = branding.logoUrl || '/icons/icon-512.png';
    const shortName = systemName.length > 30 ? systemName.slice(0, 30) : systemName;
    const isSvg = logoUrl.startsWith('data:image/svg') || logoUrl.endsWith('.svg');
    const mimeType = isSvg ? 'image/svg+xml' : 'image/png';

    const manifestData = {
      id: '/',
      name: `${companyName} - ${systemName}`,
      short_name: shortName,
      description: `${systemName} - ${companyName} - ${ministryName}`,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#0f172a',
      orientation: 'any',
      dir: 'rtl',
      lang: 'ar',
      categories: ['business', 'productivity', 'utilities'],
      icons: [
        {
          src: logoUrl,
          sizes: '192x192 512x512 any',
          type: mimeType,
          purpose: 'any maskable',
        },
        {
          src: logoUrl,
          sizes: '192x192',
          type: mimeType,
          purpose: 'any',
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: mimeType,
          purpose: 'any',
        },
      ],
    };

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json(manifestData);
  });

  // ==========================================================================
  // Direct Installer Downloads (Android APK & Package ZIP)
  // ==========================================================================
  app.get('/api/download/apk', (req, res) => {
    const apkFile = path.join(process.cwd(), 'public', 'downloads', 'MidlandOil-Assets-Registry.apk');
    if (!fs.existsSync(apkFile)) {
      return res.status(404).json({ error: 'ملف الـ APK غير متوفر حالياً' });
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="MidlandOil-Assets-Registry.apk"');
    return res.sendFile(apkFile);
  });

  app.get('/api/download/ios-profile', (req, res) => {
    const profileFile = path.join(process.cwd(), 'public', 'downloads', 'MidlandOil-Assets-iOS.mobileconfig');
    if (!fs.existsSync(profileFile)) {
      return res.status(404).json({ error: 'ملف تثبيت الآيفون (iOS Profile) غير متوفر حالياً' });
    }
    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    res.setHeader('Content-Disposition', 'attachment; filename="MidlandOil-Assets-iOS.mobileconfig"');
    return res.sendFile(profileFile);
  });

  app.get('/api/download/desktop', (req, res) => {
    const desktopFile = path.join(process.cwd(), 'public', 'downloads', 'MidlandOil-Assets-Desktop-Setup.exe');
    if (!fs.existsSync(desktopFile)) {
      return res.status(404).json({ error: 'ملف تثبيت الحاسوب (Desktop Setup) غير متوفر حالياً' });
    }
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    res.setHeader('Content-Disposition', 'attachment; filename="MidlandOil-Assets-Desktop-Setup.exe"');
    return res.sendFile(desktopFile);
  });

  app.get('/api/download/package', (req, res) => {
    const zipFile = path.join(process.cwd(), 'public', 'downloads', 'MidlandOil-Assets-Installation-Package.zip');
    if (!fs.existsSync(zipFile)) {
      return res.status(404).json({ error: 'حزمة التثبيت غير متوفرة حالياً' });
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="MidlandOil-Assets-Installation-Package.zip"');
    return res.sendFile(zipFile);
  });

  app.use('/downloads', express.static(path.join(process.cwd(), 'public', 'downloads')));

  // ==========================================================================
  // Vite Integration & Static Frontend Serving
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ==========================================================================
  // HTTPS & HTTP Server Initialization (Native Node.js SSL / Standalone Deployment)
  // ==========================================================================
  const certPath = process.env.HTTPS_CERT_PATH;
  const keyPath = process.env.HTTPS_KEY_PATH;

  let isHttpsStarted = false;
  if (certPath && keyPath) {
    try {
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const cert = fs.readFileSync(certPath);
        const key = fs.readFileSync(keyPath);
        https.createServer({ cert, key }, app).listen(PORT, '0.0.0.0', () => {
          console.log(`🔒 Midland Oil Assets Backend & UI Server running SECURELY via HTTPS on https://0.0.0.0:${PORT}`);
        });
        isHttpsStarted = true;
      } else {
        console.warn('⚠️ [HTTPS] Specified certificate or key file not found on disk. Falling back to HTTP...');
      }
    } catch (err: any) {
      console.warn(`⚠️ [HTTPS] Failed to initialize SSL/TLS server (${err.message}). Falling back to HTTP...`);
    }
  } else {
    console.warn('⚠️ HTTPS not configured — running over insecure HTTP. Set HTTPS_CERT_PATH and HTTPS_KEY_PATH environment variables to enable HTTPS.');
  }

  if (!isHttpsStarted) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Midland Oil Assets Backend & UI Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
