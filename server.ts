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
import { createFileStore } from './src/db/fileStore';
import { normalizeRecordDates } from './src/utils/dateFormat';
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
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:;"
    );
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
  // المرفقات ملفات على القرص؛ السجلات تحمل روابطها فقط
  const fileStore = createFileStore(DATA_DIR);
  const FILE_COLLECTIONS = ['units', 'maintenance', 'occupancy', 'inspections'];
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

  // المجموعات الكبيرة تُحمَّل كسولاً (عند الطلب الأول) بدلاً من تحميلها كلها عند الإقلاع.
  // المجموعات الصغيرة الضرورية للمصادقة وإعدادات النظام تُحمَّل فور الإقلاع.
  const LAZY_COLLECTIONS = new Set(['units', 'maintenance', 'occupancy', 'inspections', 'auditLogs']);
  const lazyLoaded = new Set<string>();
  // طابور تحميل كسول: يمنع طلبين متزامنين من تحميل نفس المجموعة مرتين
  const lazyLoadingChain = new Map<string, Promise<void>>();

  async function loadCollectionFromStorage(key: string): Promise<void> {
    const def = COLLECTIONS[key];
    if (!def) return;
    const rows = (await storage.readCollection(key)).map((r) => r.data);
    if (key === 'orgEntities') rows.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    def.set(rows);
    const map = new Map<string, string>();
    for (const row of rows) map.set(def.idOf(row), JSON.stringify(row));
    persisted.set(key, map);
    if (FILE_COLLECTIONS.includes(key)) {
      def.set(fileStore.externalize(def.get()));
      def.set(def.get().map((r) => normalizeRecordDates(key, r, { lenient: true }).record));
    }
    lazyLoaded.add(key);
  }

  async function ensureLoaded(key: string): Promise<void> {
    if (!LAZY_COLLECTIONS.has(key) || lazyLoaded.has(key) || storage.mode !== 'postgres') return;
    if (!lazyLoadingChain.has(key)) {
      const p = loadCollectionFromStorage(key)
        .catch((err) => {
          console.error(`[lazy-load] فشل تحميل ${key}:`, err?.message || err);
          lazyLoadingChain.delete(key);
          throw err;
        })
        .finally(() => lazyLoadingChain.delete(key));
      lazyLoadingChain.set(key, p);
    }
    return lazyLoadingChain.get(key);
  }

  async function loadFromStorage(): Promise<boolean> {
    if (storage.mode !== 'postgres') {
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
    // وضع PostgreSQL: نحمّل فقط المجموعات الصغيرة الضرورية الآن
    const eagerKeys = Object.keys(COLLECTIONS).filter((k) => !LAZY_COLLECTIONS.has(k));
    let hasData = false;
    await Promise.all(
      eagerKeys.map(async (key) => {
        const rows = await storage.readCollection(key);
        if (rows.length > 0) hasData = true;
        const def = COLLECTIONS[key];
        const data = rows.map((r) => r.data);
        if (key === 'orgEntities') data.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        def.set(data);
        const map = new Map<string, string>();
        for (const row of data) map.set(def.idOf(row), JSON.stringify(row));
        persisted.set(key, map);
      })
    );
    if (!hasData) {
      // تحقق من وجود أي بيانات (حتى في المجموعات الكسولة)
      const anyRow = await storage.readCollection('units');
      if (anyRow.length > 0) hasData = true;
    }
    return hasData;
  }

  async function reloadLazyCollections(): Promise<void> {
    for (const key of LAZY_COLLECTIONS) {
      lazyLoaded.delete(key); // يُعيد التحميل في الطلب القادم
    }
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

  // المرفقات المضمّنة في سجلات قديمة تُخرج إلى ملفات مرة واحدة (المجموعات الكسولة تعالج عند التحميل)
  for (const key of FILE_COLLECTIONS) {
    if (LAZY_COLLECTIONS.has(key)) continue; // ستعالج عند التحميل الكسول
    COLLECTIONS[key].set(fileStore.externalize(COLLECTIONS[key].get()));
  }
  // توحيد صيغ التواريخ في السجلات المخزنة سابقاً (ما لا يُفهم يبقى كما هو)
  for (const key of FILE_COLLECTIONS) {
    if (LAZY_COLLECTIONS.has(key)) continue;
    COLLECTIONS[key].set(COLLECTIONS[key].get().map((r) => normalizeRecordDates(key, r, { lenient: true }).record));
  }

  // أول كتابة: تثبيت الحالة الحالية (البذور وترقية كلمات المرور، أو الاستيراد الأول من الملف)
  try {
    await commit();
    try {
      fileStore.sweep(FILE_COLLECTIONS.map((key) => JSON.stringify(COLLECTIONS[key].get())));
    } catch {}
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
          await reloadLazyCollections();
          dbHealthy = true;
          notifySyncChange('all_updated', { reason: 'db-recovered' });
        } catch {}
      } else {
        dbHealthy = ok;
      }
    }, Math.max(1000, Number(process.env.BMS_DB_HEALTH_INTERVAL_MS) || 15000));
    healthTimer.unref?.();
  }

  const FILES_COOKIE = 'bms_files';

  function readFilesCookie(req: express.Request): string {
    for (const part of String(req.headers.cookie || '').split(';')) {
      const idx = part.indexOf('=');
      if (idx > 0 && part.slice(0, idx).trim() === FILES_COOKIE) return decodeURIComponent(part.slice(idx + 1).trim());
    }
    return '';
  }

  function setFilesCookie(req: express.Request, res: express.Response, token: string | null) {
    const attrs = ['Path=/api/files', 'HttpOnly', 'SameSite=Strict'];
    if (req.secure) attrs.push('Secure');
    attrs.push(token ? 'Max-Age=86400' : 'Max-Age=0');
    res.append('Set-Cookie', `${FILES_COOKIE}=${token ? encodeURIComponent(token) : ''}; ${attrs.join('; ')}`);
  }

  function getRequestSession(req: express.Request): ActiveSession | null {
    const header = String(req.headers.authorization || '');
    let token = header.replace(/^Bearer\s+/i, '').trim();
    // EventSource لا يرسل ترويسات: يُقبل الرمز في عنوان الطلب لمسار الأحداث فقط
    if (!token && req.path === '/sync/events' && typeof req.query.token === 'string') token = req.query.token;
    // الصور والملفات يطلبها المتصفح دون ترويسات: يُقبل رمز الجلسة من كعكة محصورة بمسار الملفات فقط
    if (!token && req.path.startsWith('/files/')) token = readFilesCookie(req);
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

  // ─── النسخ الاحتياطي التلقائي المجدول داخل الخادم ───────────────────────────
  // يعمل كل BMS_AUTO_BACKUP_INTERVAL_MS (افتراضي 6 ساعات) ويُكمل النسخ المجدول
  // عبر Windows Task Scheduler في لوحة التحكم — كلاهما مستقل.
  const AUTO_BACKUP_INTERVAL_MS =
    Math.max(60_000, Number(process.env.BMS_AUTO_BACKUP_INTERVAL_MS) || 6 * 60 * 60 * 1000);

  let autoBackupState: {
    lastAt: string | null;
    status: 'idle' | 'running' | 'ok' | 'error';
    error?: string;
  } = { lastAt: null, status: 'idle' };

  async function runAutoBackup(): Promise<void> {
    if (autoBackupState.status === 'running') return;
    autoBackupState = { lastAt: autoBackupState.lastAt, status: 'running' };
    try {
      const { spawn } = await import('child_process');
      const backupsDir = path.join(process.cwd(), 'backups');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16) + '_auto';
      const folder = path.join(backupsDir, stamp);
      fs.mkdirSync(folder, { recursive: true });

      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [path.join(process.cwd(), 'script', 'backup-db.mjs'), process.cwd(), folder],
          { stdio: 'pipe', shell: false }
        );
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`backup-db.mjs exited with code ${code}`));
        });
        child.on('error', reject);
      });

      // كتابة ملف backup-info.json بنوع 'auto' (نفس صيغة النسخة اليدوية)
      const infoAt = new Date().toISOString();
      const info = JSON.stringify({ at: infoAt, type: 'auto', machine: process.env.COMPUTERNAME || '' });
      fs.writeFileSync(path.join(folder, 'backup-info.json'), info, 'utf-8');

      // إبطال ذاكرة readLastBackup لتظهر النسخة الجديدة فور الطلب التالي
      backupInfoCache = null;

      autoBackupState = { lastAt: infoAt, status: 'ok' };
      console.log(`[auto-backup] ✔ نسخة احتياطية تلقائية: ${folder}`);
    } catch (err: any) {
      autoBackupState = {
        lastAt: autoBackupState.lastAt,
        status: 'error',
        error: String(err?.message || err),
      };
      console.error('[auto-backup] ✖ فشل النسخ التلقائي:', err?.message || err);
    }
  }

  // التنفيذ الأول بعد دقيقتين من الإقلاع (لا يُعقِّد بدء التشغيل)
  const autoBackupFirstDelay = setTimeout(() => {
    void runAutoBackup();
  }, 2 * 60 * 1000);
  autoBackupFirstDelay.unref?.();

  const autoBackupTimer = setInterval(() => {
    void runAutoBackup();
  }, AUTO_BACKUP_INTERVAL_MS);
  autoBackupTimer.unref?.();
  // ─────────────────────────────────────────────────────────────────────────────

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
    // كعكة الملفات تُجدَّد مع أي طلب موثَّق (تغطي الجلسات المفتوحة قبل إضافتها)
    if (!req.path.startsWith('/files/') && readFilesCookie(req) !== session.token) setFilesCookie(req, res, session.token);

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
      autoBackup: { lastAt: autoBackupState.lastAt, status: autoBackupState.status },
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
    await Promise.all(Array.from(LAZY_COLLECTIONS).map((k) => ensureLoaded(k)));
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
      ...fileStore.externalize(rec),
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

  // وحدة لها تاريخ (صيانة أو كشوفات أو إشغال) لا تُحذف: تُشطب فتخرج من الخدمة ويبقى سجلها
  function unitHasHistory(code: string): boolean {
    return (
      memStore.maintenance.some((r: any) => r?.unitCode === code) ||
      memStore.inspections.some((r: any) => r?.unitCode === code) ||
      memStore.occupancy.some((r: any) => r?.unitCode === code)
    );
  }
  const UNIT_HISTORY_ERROR = {
    success: false,
    code: 'UNIT_HAS_HISTORY',
    error: 'لا يمكن حذف وحدة لها طلبات صيانة أو كشوفات أو سجلات إشغال. استخدم «شطب الوحدة» لإخراجها من الخدمة مع بقاء سجلها.',
  };

  // رموز الغرف والمعدات فريدة: داخل الوحدة دائماً، ورمز الغرفة الجديد أو المعدَّل لا يكرر رمز غرفة في وحدة أخرى.
  // (رمز قديم مكرر بين وحدتين لا يمنع تعديلات أخرى على أي منهما؛ يُرفض فقط إدخال تكرار جديد.)
  const normCode = (v: any) => String(v ?? '').trim().toUpperCase();

  function findDuplicateCodeError(unit: any, existing: any): string | null {
    const rooms: any[] = Array.isArray(unit?.rooms) ? unit.rooms : [];
    const seenCodes = new Set<string>();
    const seenIds = new Set<string>();
    for (const room of rooms) {
      const code = normCode(room?.code);
      if (code) {
        if (seenCodes.has(code)) return `رمز الغرفة مكرر داخل الوحدة: ${code}`;
        seenCodes.add(code);
      }
      const id = String(room?.id ?? '').trim();
      if (id) {
        if (seenIds.has(id)) return `معرّف الغرفة مكرر داخل الوحدة: ${id}`;
        seenIds.add(id);
      }
    }
    const equipmentIds = new Set<string>();
    for (const item of Array.isArray(unit?.equipment) ? unit.equipment : []) {
      const id = String(item?.id ?? '').trim();
      if (!id) continue;
      if (equipmentIds.has(id)) return `معرّف المعدة مكرر داخل الوحدة: ${id}`;
      equipmentIds.add(id);
    }
    const before = new Set<string>((Array.isArray(existing?.rooms) ? existing.rooms : []).map((r: any) => normCode(r?.code)));
    const fresh = Array.from(seenCodes).filter((code) => !before.has(code));
    if (fresh.length > 0) {
      const unitCode = String(unit?.code);
      for (const other of memStore.units) {
        if (String(other?.code) === unitCode || String(other?.code) === String(existing?.code)) continue;
        for (const room of Array.isArray(other?.rooms) ? other.rooms : []) {
          const code = normCode(room?.code);
          if (code && fresh.includes(code)) return `رمز الغرفة ${code} مستخدم في وحدة أخرى (${other.code})`;
        }
      }
    }
    return null;
  }

  // ==========================================================================
  // الروابط المرجعية (3-و): السجلات تحمل اسم المحافظة والحقل والقسم. الخادم يبقيها متسقة:
  //  - تغيير الاسم في القائمة المرجعية ينتقل إلى كل السجلات التي تحمله.
  //  - عنصر مستخدم في سجلات لا يُحذف من قائمته.
  //  - الوحدة والكشف يحملان أيضاً معرّف المحافظة والحقل (governorateId / fieldId).
  // ==========================================================================
  type NameLink = [collection: string, field: string];
  const REFERENCE_NAME_LINKS: Record<string, { label: string; links: NameLink[] }> = {
    governorates: { label: 'المحافظة', links: [['units', 'governorate'], ['inspections', 'governorate']] },
    oilfields: { label: 'الحقل', links: [['units', 'field'], ['inspections', 'field'], ['maintenance', 'field']] },
    maintenanceDepartments: { label: 'قسم الصيانة', links: [['maintenance', 'maintenanceDepartment']] },
  };
  const ORG_NAME_LINKS: NameLink[] = [['units', 'department'], ['occupancy', 'department']];
  const refName = (item: any) => String(item?.nameAr ?? '').trim();

  function recordUsesName(record: any, field: string, name: string): boolean {
    if (!record || !name) return false;
    if (record[field] === name) return true;
    return field === 'department' && Array.isArray(record.departments) && record.departments.includes(name);
  }

  function countNameUsage(links: NameLink[], name: string): number {
    let count = 0;
    for (const [key, field] of links) {
      for (const record of COLLECTIONS[key].get()) if (recordUsesName(record, field, name)) count++;
    }
    return count;
  }

  /** يغيّر الاسم في كل السجلات المرتبطة ويعيد المجموعات التي تغيّرت */
  function renameInRecords(links: NameLink[], oldName: string, newName: string): string[] {
    const touched: string[] = [];
    if (!oldName || !newName || oldName === newName) return touched;
    for (const [key, field] of links) {
      const def = COLLECTIONS[key];
      let changed = false;
      const next = def.get().map((record) => {
        if (!recordUsesName(record, field, oldName)) return record;
        changed = true;
        const copy: any = { ...record, _v: (Number(record._v) || 0) + 1, _updatedAt: new Date().toISOString() };
        if (record[field] === oldName) copy[field] = newName;
        if (field === 'department' && Array.isArray(record.departments)) {
          copy.departments = record.departments.map((d: any) => (d === oldName ? newName : d));
        }
        return copy;
      });
      if (changed) {
        def.set(next);
        if (!touched.includes(key)) touched.push(key);
      }
    }
    return touched;
  }

  const COLLECTION_EVENTS: Record<string, string> = {
    units: 'units_updated',
    maintenance: 'maintenance_updated',
    occupancy: 'occupancy_updated',
    inspections: 'inspections_updated',
  };

  /** يضيف معرّف المحافظة والحقل إلى الوحدة أو الكشف بحسب الاسم (إن وُجد في القوائم المرجعية) */
  function linkReferenceIds(key: string, record: any): any {
    if (key !== 'units' && key !== 'inspections') return record;
    const ref = memStore.referenceData;
    if (!ref || !record) return record;
    const gov = (Array.isArray(ref.governorates) ? ref.governorates : []).find((g: any) => refName(g) && refName(g) === record.governorate);
    const fld = (Array.isArray(ref.oilfields) ? ref.oilfields : []).find(
      (f: any) => refName(f) && refName(f) === record.field && (!gov || !f.governorateId || f.governorateId === gov.id)
    );
    const governorateId = gov ? String(gov.id) : undefined;
    const fieldId = fld ? String(fld.id) : undefined;
    if (record.governorateId === governorateId && record.fieldId === fieldId) return record;
    return { ...record, governorateId, fieldId };
  }

  /** أثر تغيير اسم تشكيل في الهيكل التنظيمي: يعيد المجموعات المتأثرة. الاسم المشترك بين تشكيلين لا يُنقل (لا يُعرف أيهما المقصود) */
  function cascadeOrgRename(existing: any, next: any): string[] {
    const oldName = refName(existing);
    const newName = refName(next);
    if (!existing || !oldName || !newName || oldName === newName) return [];
    const shared = memStore.orgEntities.some((e: any) => String(e?.id) !== String(existing.id) && refName(e) === oldName);
    return shared ? [] : renameInRecords(ORG_NAME_LINKS, oldName, newName);
  }

  /** رسالة منع حذف تشكيل مستخدم في وحدات أو إشغال، أو null */
  function orgDeleteError(id: string, alsoDeleting: string[] = []): string | null {
    const entity = memStore.orgEntities.find((e: any) => String(e?.id) === id);
    const name = refName(entity);
    if (!entity || !name) return null;
    const gone = new Set([id, ...alsoDeleting]);
    if (memStore.orgEntities.some((e: any) => !gone.has(String(e?.id)) && refName(e) === name)) return null;
    const count = countNameUsage(ORG_NAME_LINKS, name);
    return count > 0 ? `التشكيل «${name}» مستخدم في ${count} سجل (وحدات أو إشغال) فلا يُحذف. عطّله بدل حذفه، أو انقل تلك السجلات أولاً.` : null;
  }

  // نوع الوحدة: الرمز المرجعي (BLD، CRV...)؛ السجلات القديمة تحمل الاسم الإنجليزي في type
  const LEGACY_UNIT_TYPE_CODES: Record<string, string> = {
    building: 'BLD',
    caravan: 'CRV',
    warehouse: 'WHS',
    equipment: 'EQP',
    safety_system: 'SFT',
    storage_tank: 'TNK',
  };

  function unitTypeCodeOf(unit: any): string {
    const explicit = normCode(unit?.unitTypeCode);
    if (explicit) return explicit;
    const type = String(unit?.type ?? '').trim();
    return LEGACY_UNIT_TYPE_CODES[type] || normCode(type);
  }

  function knownUnitTypeCodes(): Set<string> {
    const list = memStore.referenceData?.unitTypes;
    return new Set<string>((Array.isArray(list) ? list : []).map((ut: any) => normCode(ut?.code)).filter(Boolean));
  }

  // نوع الوحدة يجب أن يكون من قائمة الأنواع المرجعية (إن كانت القائمة محفوظة على الخادم)
  // (وحدة قديمة بنوع خارج القائمة تبقى قابلة للتعديل ما دام نوعها لم يتغير)
  function findUnitTypeError(unit: any, existing: any): string | null {
    const known = knownUnitTypeCodes();
    if (known.size === 0) return null;
    const code = unitTypeCodeOf(unit);
    if (!code || known.has(code)) return null;
    if (existing && unitTypeCodeOf(existing) === code) return null;
    return `نوع الوحدة «${code}» غير موجود في قائمة أنواع الوحدات. أضفه من الإعدادات ← أنواع المباني أولاً.`;
  }

  function rejectInvalidDate(res: express.Response, message: string) {
    return res.status(400).json({ success: false, code: 'INVALID_DATE', error: message });
  }

  function rejectDuplicateCodes(res: express.Response, message: string) {
    return res.status(400).json({ success: false, code: 'DUPLICATE_CODE', error: message });
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

    app.get(`/api/${o.route}`, async (req, res) => {
      await ensureLoaded(o.key);
      res.json(list());
    });

    app.post(`/api/${o.route}`, async (req, res) => {
      await ensureLoaded(o.key);
      const id = def.idOf(req.body);
      const existing = find(id);
      if (o.appendOnly && existing) return res.json({ success: true, [o.single]: existing });
      if (isVersionConflict(req.body, existing)) {
        return res.status(409).json({ success: false, code: 'VERSION_CONFLICT', error: CONFLICT_MESSAGE, current: existing });
      }
      if (o.key === 'units') {
        const dup = findDuplicateCodeError(req.body, existing);
        if (dup) return rejectDuplicateCodes(res, dup);
        const badType = findUnitTypeError(req.body, existing);
        if (badType) return res.status(400).json({ success: false, code: 'INVALID_UNIT_TYPE', error: badType });
      }
      const dated = normalizeRecordDates(o.key, req.body);
      if (dated.error) return rejectInvalidDate(res, dated.error);
      const rec = stampRecord(linkReferenceIds(o.key, dated.record), existing, req);
      put(rec);
      const cascaded = o.key === 'orgEntities' ? cascadeOrgRename(existing, rec) : [];
      try {
        if (cascaded.length > 0) await commit([o.key, ...cascaded]);
        else await commit([o.key], [id]);
      } catch (err) {
        return storageFailure(res, err);
      }
      for (const key of cascaded) notifySyncChange(COLLECTION_EVENTS[key], { action: 'rename' });
      notifySyncChange(o.event, { action: existing ? 'update' : 'add', id });
      return res.json({ success: true, [o.single]: rec });
    });

    if (!o.appendOnly) {
      app.put(`/api/${o.route}/:id`, async (req, res) => {
        await ensureLoaded(o.key);
        const paramId = req.params.id;
        const existing = find(paramId);
        if (isVersionConflict(req.body, existing)) {
          return res.status(409).json({ success: false, code: 'VERSION_CONFLICT', error: CONFLICT_MESSAGE, current: existing });
        }
        if (o.key === 'units') {
          const dup = findDuplicateCodeError(req.body, existing);
          if (dup) return rejectDuplicateCodes(res, dup);
          const badType = findUnitTypeError(req.body, existing);
          if (badType) return res.status(400).json({ success: false, code: 'INVALID_UNIT_TYPE', error: badType });
        }
        const dated = normalizeRecordDates(o.key, req.body);
        if (dated.error) return rejectInvalidDate(res, dated.error);
        const rec = stampRecord(linkReferenceIds(o.key, dated.record), existing, req);
        put(rec, paramId);
        const cascaded = o.key === 'orgEntities' ? cascadeOrgRename(existing, rec) : [];
        try {
          if (cascaded.length > 0) await commit([o.key, ...cascaded]);
          else await commit([o.key], [paramId, def.idOf(rec)]);
        } catch (err) {
          return storageFailure(res, err);
        }
        for (const key of cascaded) notifySyncChange(COLLECTION_EVENTS[key], { action: 'rename' });
        notifySyncChange(o.event, { action: 'update', id: paramId });
        return res.json({ success: true, [o.single]: rec });
      });

      app.delete(`/api/${o.route}/:id`, async (req, res) => {
        await ensureLoaded(o.key);
        if (o.key === 'units') await Promise.all(['maintenance', 'inspections', 'occupancy'].map((k) => ensureLoaded(k)));
        if (o.key === 'units' && unitHasHistory(req.params.id)) return res.status(409).json(UNIT_HISTORY_ERROR);
        if (o.key === 'orgEntities') {
          const inUse = orgDeleteError(req.params.id);
          if (inUse) return res.status(409).json({ success: false, code: 'REFERENCE_IN_USE', error: inUse });
        }
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
      await ensureLoaded(o.key);
      if (o.key === 'units') await Promise.all(['maintenance', 'inspections', 'occupancy'].map((k) => ensureLoaded(k)));
      const kind = roleKind(((req as any).session as ActiveSession).role);
      const upserts: any[] = Array.isArray(req.body?.upserts) ? [...req.body.upserts] : [];
      for (let i = 0; i < upserts.length; i++) {
        const dated = normalizeRecordDates(o.key, upserts[i]);
        if (dated.error) return rejectInvalidDate(res, dated.error);
        upserts[i] = dated.record;
      }
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
      if (o.key === 'units' && deletes.some((id) => unitHasHistory(id))) return res.status(409).json(UNIT_HISTORY_ERROR);
      if (o.key === 'orgEntities') {
        for (const id of deletes) {
          const inUse = orgDeleteError(id, deletes);
          if (inUse) return res.status(409).json({ success: false, code: 'REFERENCE_IN_USE', error: inUse });
        }
      }
      if (o.key === 'units') {
        const batchCodes = new Map<string, string>();
        for (const rec of upserts) {
          const dup = findDuplicateCodeError(rec, find(def.idOf(rec)));
          if (dup) return rejectDuplicateCodes(res, dup);
          const badType = findUnitTypeError(rec, find(def.idOf(rec)));
          if (badType) return res.status(400).json({ success: false, code: 'INVALID_UNIT_TYPE', error: badType });
          // تكرار بين وحدتين في الدفعة نفسها
          for (const room of Array.isArray(rec?.rooms) ? rec.rooms : []) {
            const code = normCode(room?.code);
            if (!code) continue;
            const owner = batchCodes.get(code);
            if (owner && owner !== String(rec.code)) return rejectDuplicateCodes(res, `رمز الغرفة ${code} مكرر بين الوحدتين ${owner} و${rec.code}`);
            batchCodes.set(code, String(rec.code));
          }
        }
      }
      const records: any[] = [];
      const cascaded: string[] = [];
      for (const rec of upserts) {
        const existing = find(def.idOf(rec));
        if (o.appendOnly && existing) continue;
        const stamped = stampRecord(linkReferenceIds(o.key, rec), existing, req);
        put(stamped);
        records.push(stamped);
        if (o.key === 'orgEntities') {
          for (const key of cascadeOrgRename(existing, stamped)) if (!cascaded.includes(key)) cascaded.push(key);
        }
      }
      for (const id of deletes) remove(id);
      try {
        if (cascaded.length > 0) await commit([o.key, ...cascaded]);
        else await commit([o.key], [...records.map((r) => def.idOf(r)), ...deletes]);
      } catch (err) {
        return storageFailure(res, err);
      }
      for (const key of cascaded) notifySyncChange(COLLECTION_EVENTS[key], { action: 'rename' });
      if (records.length > 0 || deletes.length > 0) notifySyncChange(o.event, { action: 'batch' });
      return res.json({ success: true, records });
    });

    // استيراد جماعي (للمدير): يضيف ويحدّث فقط، ولا يحذف ما ليس في القائمة
    app.post(`/api/${o.route}/bulk`, async (req, res) => {
      await ensureLoaded(o.key);
      const items: any[] = [...((Object.values(req.body || {}).find((v) => Array.isArray(v)) as any[]) || [])];
      for (let i = 0; i < items.length; i++) {
        const dated = normalizeRecordDates(o.key, items[i]);
        if (dated.error) return rejectInvalidDate(res, dated.error);
        items[i] = dated.record;
      }
      if (o.key === 'units') {
        for (const rec of items) {
          const dup = findDuplicateCodeError(rec, find(def.idOf(rec)));
          if (dup) return rejectDuplicateCodes(res, `${dup} — الوحدة ${rec?.code}`);
        }
      }
      const ids: string[] = [];
      for (const rec of items) {
        const id = def.idOf(rec);
        if (!id || id === 'undefined') continue;
        const existing = find(id);
        if (o.appendOnly && existing) continue;
        put(stampRecord(linkReferenceIds(o.key, rec), existing, req));
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

  // المرفقات: تُقرأ بجلسة صالحة فقط (ترويسة أو كعكة الملفات)
  app.get('/api/files/:name', (req, res) => {
    const found = fileStore.resolve(req.params.name);
    if (!found) return res.status(404).json({ error: 'الملف غير موجود', code: 'NOT_FOUND' });
    res.setHeader('Content-Type', found.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', found.inline ? 'inline' : `attachment; filename="${req.params.name}"`);
    return res.sendFile(found.file);
  });

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
    setFilesCookie(req, res, token);

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
    void commit(['auditLogs'], [successLog.id]).catch(() => {});

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
    setFilesCookie(req, res, null);
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

  // البيانات المرجعية مصدرها الخادم (3-هـ): أنواع الوحدات والمحافظات والحقول وأنواع الغرف والمعدات وأقسام الصيانة
  const REFERENCE_LISTS = ['unitTypes', 'governorates', 'oilfields', 'roomTypes', 'equipmentTypes', 'maintenanceDepartments'];

  app.post('/api/reference-data', async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'بيانات الطلب غير صالحة' });
    }
    for (const key of REFERENCE_LISTS) {
      if (key in body && !Array.isArray(body[key])) {
        return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: `القائمة ${key} غير صالحة` });
      }
    }
    if (Array.isArray(body.unitTypes)) {
      const codes = new Set<string>();
      for (const ut of body.unitTypes) {
        const code = normCode(ut?.code);
        if (!code) return res.status(400).json({ success: false, code: 'INVALID_INPUT', error: 'نوع وحدة بلا رمز' });
        if (codes.has(code)) {
          return res.status(400).json({ success: false, code: 'DUPLICATE_CODE', error: `رمز نوع الوحدة مكرر: ${code}` });
        }
        codes.add(code);
      }
      // نوع مستخدم في وحدات قائمة لا يُحذف من القائمة: يُعطَّل بدل ذلك
      const usage = new Map<string, number>();
      for (const unit of memStore.units) {
        const code = unitTypeCodeOf(unit);
        if (code) usage.set(code, (usage.get(code) || 0) + 1);
      }
      for (const [code, count] of usage) {
        if (!codes.has(code) && knownUnitTypeCodes().has(code)) {
          return res.status(409).json({
            success: false,
            code: 'REFERENCE_IN_USE',
            error: `نوع الوحدة ${code} مستخدم في ${count} وحدة فلا يُحذف. عطّله بدل حذفه، أو غيّر نوع تلك الوحدات أولاً.`,
          });
        }
      }
    }
    // المحافظات والحقول وأقسام الصيانة: الاسم فريد، والمستخدم لا يُحذف، وتغيير الاسم ينتقل إلى السجلات
    const previous = memStore.referenceData || {};
    const renames: Array<{ links: NameLink[]; from: string; to: string }> = [];
    for (const [listKey, cfg] of Object.entries(REFERENCE_NAME_LINKS)) {
      if (!Array.isArray(body[listKey])) continue;
      const names = new Set<string>();
      for (const item of body[listKey]) {
        const name = refName(item);
        if (!name) continue;
        if (names.has(name)) {
          return res.status(400).json({ success: false, code: 'DUPLICATE_NAME', error: `${cfg.label} «${name}» مكرر في القائمة` });
        }
        names.add(name);
      }
      for (const old of Array.isArray(previous[listKey]) ? previous[listKey] : []) {
        const oldName = refName(old);
        if (!oldName) continue;
        const next = body[listKey].find((item: any) => String(item?.id) === String(old?.id));
        if (!next) {
          // حُذف العنصر: مسموح إن لم يُستخدم اسمه، أو إن بقي عنصر آخر بالاسم نفسه
          const count = names.has(oldName) ? 0 : countNameUsage(cfg.links, oldName);
          if (count > 0) {
            return res.status(409).json({
              success: false,
              code: 'REFERENCE_IN_USE',
              error: `${cfg.label} «${oldName}» مستخدم في ${count} سجل فلا يُحذف. عطّله بدل حذفه، أو انقل تلك السجلات أولاً.`,
            });
          }
        } else if (refName(next) && refName(next) !== oldName) {
          renames.push({ links: cfg.links, from: oldName, to: refName(next) });
        }
      }
    }
    if (Array.isArray(body.governorates) && Array.isArray(body.oilfields)) {
      const govIds = new Set(body.governorates.map((g: any) => String(g?.id)));
      const orphan = body.oilfields.find((f: any) => f?.governorateId && !govIds.has(String(f.governorateId)));
      if (orphan) {
        return res.status(409).json({
          success: false,
          code: 'REFERENCE_IN_USE',
          error: `الحقل «${refName(orphan)}» تابع لمحافظة غير موجودة في القائمة. انقله إلى محافظة أخرى أو احذفه أولاً.`,
        });
      }
    }

    memStore.referenceData = body;
    const touched: string[] = [];
    for (const r of renames) {
      for (const key of renameInRecords(r.links, r.from, r.to)) if (!touched.includes(key)) touched.push(key);
    }
    try {
      await commit(['settings', ...touched]);
    } catch (err) {
      return storageFailure(res, err);
    }
    for (const key of touched) notifySyncChange(COLLECTION_EVENTS[key], { action: 'rename' });
    notifySyncChange('reference_data_updated', {});
    return res.json({ success: true, renamed: renames.length });
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
