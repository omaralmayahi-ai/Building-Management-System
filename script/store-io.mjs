// قراءة وكتابة بيانات النظام لأدوات لوحة التحكم، بحسب مكان التخزين المعتمد:
//  - PostgreSQL عند ضبط DATABASE_URL في .env (جدول bms_records)
//  - ملف .data/store.json بدونه
// الشكل الموحد للبيانات هو شكل store.json: { units, maintenance, occupancy, inspections, auditLogs, orgEntities, users, branding, referenceData }
import fs from 'node:fs';
import path from 'node:path';

const LIST_KEYS = ['units', 'maintenance', 'occupancy', 'inspections', 'auditLogs', 'orgEntities', 'users'];
const idOf = (key, rec) => String(key === 'units' ? rec?.code : rec?.id);

export function readEnv(appDir) {
  const env = {};
  try {
    for (const line of fs.readFileSync(path.join(appDir, '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

export function databaseUrl(appDir) {
  const url = process.env.DATABASE_URL || readEnv(appDir).DATABASE_URL || '';
  return url && !/CHANGE_ME/.test(url) ? url : '';
}

export function storeFile(appDir) {
  return path.join(appDir, '.data', 'store.json');
}

export function readStoreFile(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('الملف ليس ملف بيانات النظام');
  const known = ['units', 'maintenance', 'occupancy', 'inspections', 'users', 'orgEntities'];
  if (!known.some((k) => Array.isArray(data[k]))) throw new Error('الملف لا يحتوي جداول النظام');
  return data;
}

async function withClient(appDir, fn) {
  const { default: pg } = await import('pg');
  const url = databaseUrl(appDir);
  const env = readEnv(appDir);
  const ssl = env.DATABASE_SSL === 'true' || /sslmode=require/.test(url) ? { rejectUnauthorized: false } : false;
  const client = new pg.Client({ connectionString: url, ssl, connectionTimeoutMillis: 8000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

const ENSURE_TABLE = `
  CREATE TABLE IF NOT EXISTS bms_records (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (collection, id)
  )`;

export async function testConnection(appDir) {
  return withClient(appDir, async (c) => {
    await c.query('SELECT 1');
    return true;
  });
}

/** يعيد { mode, store } */
export async function loadStore(appDir) {
  if (!databaseUrl(appDir)) return { mode: 'file', store: readStoreFile(storeFile(appDir)) };
  return withClient(appDir, async (c) => {
    await c.query(ENSURE_TABLE);
    const res = await c.query(
      `SELECT collection, data FROM bms_records WHERE collection <> 'sessions' ORDER BY collection, updated_at DESC`
    );
    const store = Object.fromEntries(LIST_KEYS.map((k) => [k, []]));
    for (const row of res.rows) {
      if (row.collection === 'settings') {
        if (row.data?.id === 'branding') store.branding = row.data.value;
        if (row.data?.id === 'referenceData') store.referenceData = row.data.value;
      } else if (store[row.collection]) {
        store[row.collection].push(row.data);
      }
    }
    return { mode: 'postgres', store };
  });
}

/** يستبدل بيانات النظام كلها بمحتوى store (الجلسات تُلغى فيُطلب الدخول من جديد) */
export async function saveStore(appDir, store) {
  if (!databaseUrl(appDir)) {
    const file = storeFile(appDir);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(file + '.tmp', file);
    return 'file';
  }
  return withClient(appDir, async (c) => {
    await c.query(ENSURE_TABLE);
    await c.query('BEGIN');
    try {
      await c.query('DELETE FROM bms_records');
      const rows = [];
      for (const key of LIST_KEYS) {
        for (const rec of Array.isArray(store[key]) ? store[key] : []) {
          const id = idOf(key, rec);
          if (id && id !== 'undefined') rows.push([key, id, rec]);
        }
      }
      if (store.branding) rows.push(['settings', 'branding', { id: 'branding', value: store.branding }]);
      rows.push(['settings', 'referenceData', { id: 'referenceData', value: store.referenceData ?? null }]);
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        await c.query(
          `INSERT INTO bms_records (collection, id, data)
           SELECT c, i, d::jsonb FROM unnest($1::text[], $2::text[], $3::text[]) AS t(c, i, d)
           ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [chunk.map((r) => r[0]), chunk.map((r) => r[1]), chunk.map((r) => JSON.stringify(r[2]))]
        );
      }
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK').catch(() => {});
      throw err;
    }
    return 'postgres';
  });
}

/** يكتب سجلاً واحداً (مثلاً حساب مستخدم بعد تغيير كلمة مروره) */
export async function putRecord(appDir, key, record) {
  if (!databaseUrl(appDir)) {
    const store = readStoreFile(storeFile(appDir));
    const list = Array.isArray(store[key]) ? store[key] : (store[key] = []);
    const idx = list.findIndex((r) => idOf(key, r) === idOf(key, record));
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await saveStore(appDir, store);
    return;
  }
  await withClient(appDir, async (c) => {
    await c.query(
      `INSERT INTO bms_records (collection, id, data) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, version = bms_records.version + 1, updated_at = now()`,
      [key, idOf(key, record), JSON.stringify(record)]
    );
  });
}
