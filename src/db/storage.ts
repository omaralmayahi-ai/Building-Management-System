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
  {
    id: '003_rooms',
    sql: `
      CREATE TABLE IF NOT EXISTS bms_rooms (
        unit_id TEXT NOT NULL,
        id TEXT NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY (unit_id, id)
      );
      CREATE INDEX IF NOT EXISTS bms_rooms_unit_idx ON bms_rooms (unit_id);
      INSERT INTO bms_rooms (unit_id, id, data)
        SELECT r.id, room->>'id', room
        FROM bms_records r,
             jsonb_array_elements(r.data->'rooms') AS room
        WHERE r.collection = 'units'
          AND r.data ? 'rooms'
          AND jsonb_array_length(r.data->'rooms') > 0
          AND (room->>'id') IS NOT NULL
      ON CONFLICT DO NOTHING;`,
  },
  {
    id: '004_equipment',
    sql: `
      CREATE TABLE IF NOT EXISTS bms_equipment (
        unit_id TEXT NOT NULL,
        id TEXT NOT NULL,
        data JSONB NOT NULL,
        PRIMARY KEY (unit_id, id)
      );
      CREATE INDEX IF NOT EXISTS bms_equipment_unit_idx ON bms_equipment (unit_id);
      INSERT INTO bms_equipment (unit_id, id, data)
        SELECT r.id, eq->>'id', eq
        FROM bms_records r,
             jsonb_array_elements(r.data->'equipment') AS eq
        WHERE r.collection = 'units'
          AND r.data ? 'equipment'
          AND jsonb_array_length(r.data->'equipment') > 0
          AND (eq->>'id') IS NOT NULL
      ON CONFLICT DO NOTHING;`,
  },
  {
    id: '005_date_columns',
    sql: `
      -- أعمدة DATE مستخرجة من JSONB لتمكين الفرز والتصفية الصحيحين في PostgreSQL
      ALTER TABLE bms_records
        ADD COLUMN IF NOT EXISTS d_created_at   DATE,
        ADD COLUMN IF NOT EXISTS d_next_due     DATE,
        ADD COLUMN IF NOT EXISTS d_start_date   DATE;

      CREATE INDEX IF NOT EXISTS bms_records_d_created_at  ON bms_records (d_created_at)  WHERE d_created_at  IS NOT NULL;
      CREATE INDEX IF NOT EXISTS bms_records_d_next_due    ON bms_records (d_next_due)    WHERE d_next_due    IS NOT NULL;
      CREATE INDEX IF NOT EXISTS bms_records_d_start_date  ON bms_records (d_start_date)  WHERE d_start_date  IS NOT NULL;

      -- استخراج القيم من السجلات الموجودة (التواريخ مخزنة بصيغة YYYY-MM-DD)
      UPDATE bms_records
        SET d_created_at = CASE
              WHEN collection IN ('maintenance','inspections')
                   AND (data->>'createdAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
              THEN (data->>'createdAt')::date
              ELSE NULL
            END,
            d_next_due = CASE
              WHEN collection = 'inspections'
                   AND (data->>'nextDueDate') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
              THEN (data->>'nextDueDate')::date
              ELSE NULL
            END,
            d_start_date = CASE
              WHEN collection = 'occupancy'
                   AND (data->>'startDate') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
              THEN (data->>'startDate')::date
              ELSE NULL
            END
      WHERE collection IN ('maintenance','inspections','occupancy');`,
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
      // حقن الغرف والمعدات من الجداول المستقلة في سجلات الوحدات
      const [roomsRes, equipRes] = await Promise.all([
        pool.query<{ unit_id: string; id: string; data: any }>(
          'SELECT unit_id, id, data FROM bms_rooms'
        ),
        pool.query<{ unit_id: string; id: string; data: any }>(
          'SELECT unit_id, id, data FROM bms_equipment'
        ),
      ]);
      const roomsByUnit: Record<string, any[]> = {};
      for (const r of roomsRes.rows) {
        (roomsByUnit[r.unit_id] = roomsByUnit[r.unit_id] || []).push(r.data);
      }
      const equipByUnit: Record<string, any[]> = {};
      for (const r of equipRes.rows) {
        (equipByUnit[r.unit_id] = equipByUnit[r.unit_id] || []).push(r.data);
      }
      for (const rec of out['units'] || []) {
        rec.data = {
          ...rec.data,
          rooms: roomsByUnit[rec.id] || [],
          equipment: equipByUnit[rec.id] || [],
        };
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
          // حذف الغرف والمعدات للوحدات المحذوفة
          const unitDels = dels.filter((o) => o.c === 'units');
          if (unitDels.length > 0) {
            const unitIds = unitDels.map((o) => o.id);
            await client.query(
              `DELETE FROM bms_rooms WHERE unit_id = ANY($1::text[])`,
              [unitIds]
            );
            await client.query(
              `DELETE FROM bms_equipment WHERE unit_id = ANY($1::text[])`,
              [unitIds]
            );
          }
        }
        // استخراج الغرف والمعدات من سجلات الوحدات قبل الحفظ
        const unitPuts = puts.filter((o) => o.c === 'units');
        for (const op of unitPuts) {
          const rooms: any[] = op.data.rooms || [];
          const equipment: any[] = op.data.equipment || [];
          // حفظ الغرف في الجدول المستقل
          if (rooms.length > 0) {
            await client.query(
              `DELETE FROM bms_rooms WHERE unit_id = $1`,
              [op.id]
            );
            for (let i = 0; i < rooms.length; i += 200) {
              const chunk = rooms.slice(i, i + 200);
              await client.query(
                `INSERT INTO bms_rooms (unit_id, id, data)
                 SELECT $1, r->>'id', r FROM unnest($2::jsonb[]) AS r
                 WHERE r->>'id' IS NOT NULL`,
                [op.id, chunk.map((r) => JSON.stringify(r))]
              );
            }
          } else {
            await client.query(`DELETE FROM bms_rooms WHERE unit_id = $1`, [op.id]);
          }
          // حفظ المعدات في الجدول المستقل
          if (equipment.length > 0) {
            await client.query(
              `DELETE FROM bms_equipment WHERE unit_id = $1`,
              [op.id]
            );
            for (let i = 0; i < equipment.length; i += 200) {
              const chunk = equipment.slice(i, i + 200);
              await client.query(
                `INSERT INTO bms_equipment (unit_id, id, data)
                 SELECT $1, e->>'id', e FROM unnest($2::jsonb[]) AS e
                 WHERE e->>'id' IS NOT NULL`,
                [op.id, chunk.map((e) => JSON.stringify(e))]
              );
            }
          } else {
            await client.query(`DELETE FROM bms_equipment WHERE unit_id = $1`, [op.id]);
          }
          // حذف الغرف والمعدات من JSONB قبل الحفظ في bms_records
          op.data = { ...op.data };
          delete op.data.rooms;
          delete op.data.equipment;
        }
        // دالة مساعدة: تستخرج قيمة DATE من JSONB للأعمدة المستقلة
        const extractDate = (data: any, field: string): string | null => {
          const v = data?.[field];
          if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
          return null;
        };

        // على دفعات حتى لا يكبر الاستعلام الواحد مع المرفقات
        for (let i = 0; i < puts.length; i += 200) {
          const chunk = puts.slice(i, i + 200);
          await client.query(
            `INSERT INTO bms_records (collection, id, data, d_created_at, d_next_due, d_start_date)
             SELECT c, i, d::jsonb, da::date, nd::date, sd::date
             FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[]) AS t(c, i, d, da, nd, sd)
             ON CONFLICT (collection, id) DO UPDATE
               SET data        = EXCLUDED.data,
                   version     = bms_records.version + 1,
                   updated_at  = now(),
                   d_created_at = EXCLUDED.d_created_at,
                   d_next_due   = EXCLUDED.d_next_due,
                   d_start_date = EXCLUDED.d_start_date`,
            [
              chunk.map((o) => o.c),
              chunk.map((o) => o.id),
              chunk.map((o) => JSON.stringify(o.data)),
              chunk.map((o) => {
                if (o.c === 'maintenance' || o.c === 'inspections') return extractDate(o.data, 'createdAt');
                return null;
              }),
              chunk.map((o) => {
                if (o.c === 'inspections') return extractDate(o.data, 'nextDueDate');
                return null;
              }),
              chunk.map((o) => {
                if (o.c === 'occupancy') return extractDate(o.data, 'startDate');
                return null;
              }),
            ]
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
