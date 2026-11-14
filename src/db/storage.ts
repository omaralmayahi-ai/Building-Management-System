/**
 * طبقة التخزين الدائم لخادم النظام (المرحلة 2).
 *
 * وضعان:
 *  - postgres: عند ضبط DATABASE_URL — هو المصدر المعتمد. كل سجل صف في bms_records.
 *  - file:     بدون DATABASE_URL — ملف .data/store.json (للتجربة والاختبارات فقط).
 *
 * الخادم يحتفظ بنسخة عاملة في الذاكرة ويكتب كل تغيير هنا قبل الرد على الطلب.
 */
import fs from 'fs';
import path from 'path';
import { getDbPool } from './dbClient';

export type StorageOp =
  | { t: 'put'; c: string; id: string; data: any }
  | { t: 'del'; c: string; id: string };

export interface AuditEntry {
  at: string;
  userId: string;
  userName: string;
  role: string;
  method: string;
  path: string;
  status: number;
  ip: string;
}

export interface Storage {
  mode: 'postgres' | 'file';
  init(): Promise<void>;
  /** كل السجلات المخزنة: collection → [{id, data}] (فارغ في وضع الملف؛ الخادم يقرأ الملف بنفسه) */
  loadAll(): Promise<Record<string, Array<{ id: string; data: any }>>>;
  apply(ops: StorageOp[]): Promise<void>;
  appendAudit(entry: AuditEntry): Promise<void>;
  readAudit(limit: number): Promise<AuditEntry[]>;
  ping(): Promise<boolean>;
}

const MIGRATIONS: Array<{ id: string; sql: string }> = [
  {
    id: '001_records',
    sql: `
      CREATE TABLE IF NOT EXISTS bms_records (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data JSONB NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (collection, id)
      );`,
  },
  {
    id: '002_audit',
    sql: `
      CREATE TABLE IF NOT EXISTS bms_audit (
        seq BIGSERIAL PRIMARY KEY,
        at TIMESTAMPTZ NOT NULL DEFAULT now(),
        user_id TEXT NOT NULL DEFAULT '',
        user_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        status INTEGER NOT NULL,
        ip TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS bms_audit_at_idx ON bms_audit (at DESC);`,
  },
];

function createPostgresStorage(): Storage {
  const pool = getDbPool()!;
  return {
    mode: 'postgres',
    async init() {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      );
      const done = new Set((await pool.query<{ id: string }>('SELECT id FROM schema_migrations')).rows.map((r) => r.id));
      for (const m of MIGRATIONS) {
        if (done.has(m.id)) continue;
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(m.sql);
          await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        } finally {
          client.release();
        }
      }
    },
    async loadAll() {
      const out: Record<string, Array<{ id: string; data: any }>> = {};
      const res = await pool.query<{ collection: string; id: string; data: any }>(
        'SELECT collection, id, data FROM bms_records ORDER BY collection, updated_at DESC'
      );
      for (const row of res.rows) {
        (out[row.collection] = out[row.collection] || []).push({ id: row.id, data: row.data });
      }
      return out;
    },
    async apply(ops) {
      if (ops.length === 0) return;
      const puts = ops.filter((o) => o.t === 'put') as Array<Extract<StorageOp, { t: 'put' }>>;
      const dels = ops.filter((o) => o.t === 'del');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (dels.length > 0) {
          await client.query(
            `DELETE FROM bms_records r USING unnest($1::text[], $2::text[]) AS d(collection, id)
             WHERE r.collection = d.collection AND r.id = d.id`,
            [dels.map((o) => o.c), dels.map((o) => o.id)]
          );
        }
        // على دفعات حتى لا يكبر الاستعلام الواحد مع المرفقات
        for (let i = 0; i < puts.length; i += 200) {
          const chunk = puts.slice(i, i + 200);
          await client.query(
            `INSERT INTO bms_records (collection, id, data)
             SELECT c, i, d::jsonb FROM unnest($1::text[], $2::text[], $3::text[]) AS t(c, i, d)
             ON CONFLICT (collection, id) DO UPDATE
               SET data = EXCLUDED.data, version = bms_records.version + 1, updated_at = now()`,
            [chunk.map((o) => o.c), chunk.map((o) => o.id), chunk.map((o) => JSON.stringify(o.data))]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    async appendAudit(e) {
      await pool.query(
        `INSERT INTO bms_audit (at, user_id, user_name, role, method, path, status, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [e.at, e.userId, e.userName, e.role, e.method, e.path, e.status, e.ip]
      );
    },
    async readAudit(limit) {
      const res = await pool.query(
        `SELECT at, user_id, user_name, role, method, path, status, ip FROM bms_audit ORDER BY seq DESC LIMIT $1`,
        [limit]
      );
      return res.rows.map((r: any) => ({
        at: new Date(r.at).toISOString(),
        userId: r.user_id,
        userName: r.user_name,
        role: r.role,
        method: r.method,
        path: r.path,
        status: r.status,
        ip: r.ip,
      }));
    },
    async ping() {
      try {
        await pool.query('SELECT 1');
        return true;
      } catch {
        return false;
      }
    },
  };
}

function createFileStorage(dataDir: string, dump: () => string): Storage {
  const storePath = path.join(dataDir, 'store.json');
  const auditPath = path.join(dataDir, 'audit.jsonl');
  return {
    mode: 'file',
    async init() {
      fs.mkdirSync(dataDir, { recursive: true });
    },
    async loadAll() {
      return {};
    },
    async apply() {
      // كتابة ذرّية: ملف مؤقت ثم إعادة تسمية، حتى لا يتلف الملف عند انقطاع مفاجئ
      const tmp = storePath + '.tmp';
      fs.writeFileSync(tmp, dump(), 'utf-8');
      fs.renameSync(tmp, storePath);
    },
    async appendAudit(e) {
      fs.appendFileSync(auditPath, JSON.stringify(e) + '\n', 'utf-8');
    },
    async readAudit(limit) {
      if (!fs.existsSync(auditPath)) return [];
      const lines = fs.readFileSync(auditPath, 'utf-8').split('\n').filter(Boolean);
      const out: AuditEntry[] = [];
      for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
        try {
          out.push(JSON.parse(lines[i]));
        } catch {}
      }
      return out;
    },
    async ping() {
      return true;
    },
  };
}

export function createStorage(opts: { dataDir: string; dump: () => string }): Storage {
  return getDbPool() ? createPostgresStorage() : createFileStorage(opts.dataDir, opts.dump);
}
