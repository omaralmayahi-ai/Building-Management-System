// اختبارات التخزين (المرحلة 2): PostgreSQL مصدراً معتمداً، رقم النسخة، الدفعات، سجل التدقيق، انقطاع القاعدة، مزامنة Firestore.
// تحتاج PostgreSQL: إمّا BMS_TEST_DATABASE_URL لقاعدة اختبار فارغة، أو أدوات PostgreSQL منصّبة لتشغيل قاعدة مؤقتة.
// بدون أي منهما تُتخطى اختبارات PostgreSQL ويبقى اختبار وضع الملف.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'dist', 'server.cjs');
const ADMIN_PASS = 'Admin#Test2026';

function makeClient(port) {
  const base = `http://127.0.0.1:${port}`;
  async function call(method, url, { token, body } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text };
  }
  return { base, call };
}

async function startServer(port, env) {
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(port), DATABASE_URL: '', ...env },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) return child;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error('الخادم لم يبدأ');
}

async function stopServer(child) {
  if (!child) return;
  await new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill();
    setTimeout(resolve, 3000);
  });
}

// دخول المدير؛ في أول مرة يغيّر كلمة المرور الافتراضية
async function adminToken(call) {
  let r = await call('POST', '/api/auth/login', { body: { username: 'admin', password: ADMIN_PASS } });
  if (r.status === 200 && r.json?.token) return r.json.token;
  r = await call('POST', '/api/auth/login', { body: { username: 'admin', password: 'admin123' } });
  assert.equal(r.status, 200, r.text);
  const first = r.json.token;
  const ch = await call('POST', '/api/auth/change-password', {
    token: first,
    body: { currentPassword: 'admin123', newPassword: ADMIN_PASS },
  });
  assert.equal(ch.status, 200, ch.text);
  return first;
}

const unit = (code, extra = {}) => ({ id: code, code, name: `وحدة ${code}`, type: 'building', ...extra });

// ---------------------------------------------------------------------------
// قاعدة PostgreSQL للاختبار
// ---------------------------------------------------------------------------
function findPgBin() {
  const names = process.platform === 'win32' ? ['initdb.exe'] : ['initdb'];
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const base of ['/usr/lib/postgresql', path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL')]) {
    try {
      for (const v of fs.readdirSync(base).sort().reverse()) dirs.push(path.join(base, v, 'bin'));
    } catch {}
  }
  for (const d of dirs) if (d && names.some((n) => fs.existsSync(path.join(d, n)))) return d;
  return null;
}

const pg = { url: process.env.BMS_TEST_DATABASE_URL || '', dir: null, bin: null, port: 0, asUser: null };

function pgRun(tool, args) {
  const exe = path.join(pg.bin, tool);
  // PostgreSQL يرفض العمل بحساب root: نشغّله بحساب postgres إن كنا root
  const r = pg.asUser
    ? spawnSync('runuser', ['-u', pg.asUser, '--', exe, ...args], { encoding: 'utf-8' })
    : spawnSync(exe, args, { encoding: 'utf-8' });
  if (r.status !== 0) throw new Error(`${tool} failed: ${r.stderr || r.stdout}`);
}

function startTempPostgres() {
  pg.bin = findPgBin();
  if (!pg.bin) return false;
  const isRoot = process.platform !== 'win32' && process.getuid && process.getuid() === 0;
  if (isRoot) {
    if (spawnSync('id', ['postgres']).status !== 0) return false;
    pg.asUser = 'postgres';
  }
  pg.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bms-pg-'));
  if (pg.asUser) spawnSync('chown', ['-R', pg.asUser, pg.dir]);
  pg.port = 54000 + Math.floor(Math.random() * 900);
  const data = path.join(pg.dir, 'data');
  pgRun('initdb', ['-D', data, '-A', 'trust', '-U', 'postgres', '-E', 'UTF8']);
  pgCtl('start');
  pgRun('createdb', ['-h', '127.0.0.1', '-p', String(pg.port), '-U', 'postgres', 'bms_test']);
  pg.url = `postgres://postgres@127.0.0.1:${pg.port}/bms_test`;
  return true;
}

function pgCtl(action) {
  const data = path.join(pg.dir, 'data');
  const args = ['-D', data, '-w', action];
  if (action === 'start') {
    args.push('-l', path.join(pg.dir, 'log.txt'), '-o', `-p ${pg.port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=''`);
  } else {
    args.push('-m', 'fast');
  }
  pgRun('pg_ctl', args);
}

let pgAvailable = !!pg.url;
if (!pgAvailable) {
  try {
    pgAvailable = startTempPostgres();
  } catch (err) {
    console.warn('تعذّر تشغيل PostgreSQL مؤقت:', err.message);
    pgAvailable = false;
  }
}

after(() => {
  if (pg.dir) {
    try {
      pgCtl('stop');
    } catch {}
    fs.rmSync(pg.dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
describe('PostgreSQL مصدراً معتمداً', { skip: pgAvailable ? false : 'PostgreSQL غير متاح للاختبار' }, () => {
  const port = 39900 + Math.floor(Math.random() * 90);
  const { call } = makeClient(port);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bms-store-'));
  const storeFile = path.join(dataDir, 'store.json');
  let server;
  let token;

  // خادم Firestore وهمي يستقبل ما يرسله الخادم
  const fake = { server: null, port: 0, commits: [], tokenRequests: 0 };
  const keyFile = path.join(dataDir, 'service-account.json');

  const env = () => ({
    BMS_DATA_DIR: dataDir,
    DATABASE_URL: pg.url,
    BMS_DB_HEALTH_INTERVAL_MS: '1000',
    FIREBASE_SERVICE_ACCOUNT_PATH: keyFile,
    FIRESTORE_BASE_URL: `http://127.0.0.1:${fake.port}`,
    FIRESTORE_TOKEN_URL: `http://127.0.0.1:${fake.port}/token`,
    FIRESTORE_MIRROR_INTERVAL_MS: '1000',
    FIRESTORE_DATABASE_ID: 'test-db',
  });

  before(async () => {
    assert.ok(fs.existsSync(entry), 'النظام غير مبني');
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    fs.writeFileSync(keyFile, JSON.stringify({ client_email: 'svc@test', private_key: privateKey, project_id: 'test-project' }));
    fake.server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        if (req.url === '/token') {
          fake.tokenRequests++;
          return res.end(JSON.stringify({ access_token: 'fake-token', expires_in: 3600 }));
        }
        if (req.url.endsWith('/documents:commit') && req.headers.authorization === 'Bearer fake-token') {
          fake.commits.push({ url: req.url, body: JSON.parse(body) });
          return res.end(JSON.stringify({ writeResults: [] }));
        }
        res.statusCode = 404;
        res.end('{}');
      });
    });
    await new Promise((r) => fake.server.listen(0, '127.0.0.1', r));
    fake.port = fake.server.address().port;

    // ملف قديم فيه وحدة: يجب أن يُنقل إلى القاعدة الفارغة في أول تشغيل
    fs.writeFileSync(storeFile, JSON.stringify({ units: [unit('LEGACY-1')] }));
    server = await startServer(port, env());
    token = await adminToken(call);
  });

  after(async () => {
    await stopServer(server);
    fake.server?.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  test('أول تشغيل ينقل store.json إلى القاعدة ولا يبقيه مصدراً ثانياً', async () => {
    const r = await call('GET', '/api/units', { token });
    assert.equal(r.status, 200);
    assert.ok(r.json.some((u) => u.code === 'LEGACY-1'));
    assert.equal(fs.existsSync(storeFile), false);
    const h = await call('GET', '/api/health');
    assert.equal(h.json.storage, 'postgres');
    assert.equal(h.json.database, 'connected');
  });

  test('مسار الصحة العام لا يعيد بيانات تشغيلية', async () => {
    const h = await call('GET', '/api/health');
    for (const key of ['users', 'inspections', 'auditLogs', 'orgEntities', 'branding', 'referenceData']) {
      assert.equal(key in h.json, false, key);
    }
  });

  test('الحفظ يبقى بعد إعادة تشغيل الخادم ولا يُكتب ملف محلي', async () => {
    const a = await call('POST', '/api/units', { token, body: unit('U-1') });
    assert.equal(a.status, 200, a.text);
    assert.equal(a.json.unit._v, 1);
    await stopServer(server);
    server = await startServer(port, env());
    const r = await call('GET', '/api/units', { token });
    assert.equal(r.status, 200, 'الجلسة تبقى بعد إعادة التشغيل');
    assert.ok(r.json.some((u) => u.code === 'U-1'));
    assert.equal(fs.existsSync(storeFile), false);
    assert.equal(fs.existsSync(path.join(dataDir, 'sessions.json')), false);
  });

  test('تعديل متزامن: الثاني يُرفض بدل أن يمسح عمل الأول', async () => {
    const list = (await call('GET', '/api/units', { token })).json;
    const opened = list.find((u) => u.code === 'U-1');
    const first = await call('PUT', '/api/units/U-1', { token, body: { ...opened, name: 'تعديل المستخدم الأول' } });
    assert.equal(first.status, 200);
    assert.equal(first.json.unit._v, 2);
    const second = await call('PUT', '/api/units/U-1', { token, body: { ...opened, name: 'تعديل المستخدم الثاني' } });
    assert.equal(second.status, 409);
    assert.equal(second.json.code, 'VERSION_CONFLICT');
    assert.equal(second.json.current.name, 'تعديل المستخدم الأول');
    const now = (await call('GET', '/api/units', { token })).json.find((u) => u.code === 'U-1');
    assert.equal(now.name, 'تعديل المستخدم الأول');
  });

  test('الدفعة ذرّية: تعارض واحد يمنع تطبيق الباقي', async () => {
    const stale = { ...unit('U-1'), _v: 1 };
    const r = await call('POST', '/api/units/batch', { token, body: { upserts: [unit('U-2'), stale] } });
    assert.equal(r.status, 409);
    assert.equal(r.json.conflicts.length, 1);
    const list = (await call('GET', '/api/units', { token })).json;
    assert.equal(list.some((u) => u.code === 'U-2'), false);
  });

  test('الدفعة تضيف وتحذف سجلات محددة فقط', async () => {
    const r = await call('POST', '/api/units/batch', {
      token,
      body: { upserts: [unit('U-2'), unit('U-3')], deletes: ['LEGACY-1'] },
    });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.records.length, 2);
    const codes = (await call('GET', '/api/units', { token })).json.map((u) => u.code).sort();
    assert.deepEqual(codes, ['U-1', 'U-2', 'U-3']);
  });

  test('الاستيراد الجماعي لا يحذف ما ليس في القائمة', async () => {
    const r = await call('POST', '/api/units/bulk', { token, body: { units: [unit('U-9')] } });
    assert.equal(r.status, 200);
    const codes = (await call('GET', '/api/units', { token })).json.map((u) => u.code).sort();
    assert.deepEqual(codes, ['U-1', 'U-2', 'U-3', 'U-9']);
  });

  test('سجل النشاطات: إضافة فقط، ولا يُفرَّغ', async () => {
    const log = { id: 'LOG-T1', timestamp: new Date().toISOString(), action: 'اختبار', user: 'admin' };
    assert.equal((await call('POST', '/api/audit-logs', { token, body: log })).status, 200);
    assert.equal((await call('POST', '/api/audit-logs', { token, body: { ...log, action: 'تزوير' } })).status, 200);
    const logs = (await call('GET', '/api/audit-logs', { token })).json;
    assert.equal(logs.find((l) => l.id === 'LOG-T1').action, 'اختبار');
    assert.equal((await call('DELETE', '/api/audit-logs/LOG-T1', { token })).status, 404);
    const reset = await call('POST', '/api/system/reset-module', { token, body: { moduleName: 'audit_logs', actionType: 'clear' } });
    assert.equal(reset.status, 403);
    const wipe = await call('POST', '/api/system/reset-module', { token, body: { moduleName: 'occupancy', actionType: 'clear' } });
    assert.equal(wipe.status, 200);
    const after = (await call('GET', '/api/audit-logs', { token })).json;
    assert.ok(after.some((l) => l.id === 'LOG-T1'));
    assert.ok(after.some((l) => String(l.id).startsWith('LOG-RESET-')));
  });

  test('الخادم يكتب سجل تدقيق لكل عملية كتابة، للمدير فقط', async () => {
    await new Promise((r) => setTimeout(r, 300));
    const r = await call('GET', '/api/audit-trail?limit=500', { token });
    assert.equal(r.status, 200);
    const paths = r.json.entries.map((e) => `${e.method} ${e.path} ${e.status}`);
    assert.ok(paths.includes('PUT /units/U-1 409'), 'العملية المرفوضة مسجلة');
    assert.ok(paths.includes('POST /units/batch 200'));
    assert.ok(r.json.entries.every((e) => !('body' in e)));
    assert.equal((await call('DELETE', '/api/audit-trail', { token })).status, 404);
  });

  test('Firestore يستقبل نسخة مزامنة من الخادم دون كلمات مرور ودون جلسات', async () => {
    for (let i = 0; i < 40 && !fake.commits.some((c) => JSON.stringify(c.body).includes('U-3')); i++) {
      await new Promise((r) => setTimeout(r, 250));
    }
    const writes = fake.commits.flatMap((c) => c.body.writes);
    const names = writes.map((w) => w.update?.name || w.delete);
    if (process.env.DEBUG_MIRROR) console.log(names, fake.tokenRequests);
    assert.ok(names.some((n) => n.endsWith('/databases/test-db/documents/units/U-3')));
    assert.ok(writes.some((w) => w.delete && w.delete.endsWith('/units/LEGACY-1')), 'الحذف يُرسل أيضاً');
    const userDocs = writes.filter((w) => w.update?.name.includes('/system_users/'));
    assert.ok(userDocs.length > 0);
    assert.ok(userDocs.every((w) => !('password' in w.update.fields)));
    assert.equal(names.some((n) => n.includes('session')), false);
    const st = await call('GET', '/api/status', { token });
    assert.equal(st.json.mirror.enabled, true);
    assert.equal(st.json.storage.mode, 'postgres');
  });

  test('توقف القاعدة يُظهر خطأ واضحاً، وعودتها تعيد العمل دون فقدان', { skip: pg.dir ? false : 'قاعدة خارجية' }, async () => {
    pgCtl('stop');
    const w = await call('POST', '/api/units', { token, body: unit('U-DOWN') });
    assert.equal(w.status, 503, w.text);
    assert.equal(w.json.code, 'DB_UNAVAILABLE');
    const g = await call('GET', '/api/units', { token });
    assert.equal(g.status, 503, 'لا تُعرض بيانات قديمة أثناء التوقف');
    pgCtl('start');
    let ok = null;
    for (let i = 0; i < 40; i++) {
      ok = await call('GET', '/api/units', { token });
      if (ok.status === 200) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.equal(ok.status, 200);
    const codes = ok.json.map((u) => u.code).sort();
    assert.deepEqual(codes, ['U-1', 'U-2', 'U-3', 'U-9'], 'السجل الذي فشل حفظه غير موجود');
    assert.equal((await call('POST', '/api/units', { token, body: unit('U-BACK') })).status, 200);
  });
});

// ---------------------------------------------------------------------------
describe('وضع الملف المحلي (للتجربة)', () => {
  const port = 39800 + Math.floor(Math.random() * 90);
  const { call } = makeClient(port);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bms-file-'));
  let server;
  let token;

  before(async () => {
    server = await startServer(port, { BMS_DATA_DIR: dataDir });
    token = await adminToken(call);
  });
  after(async () => {
    await stopServer(server);
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  test('الحفظ ورقم النسخة يعملان ويبقيان بعد إعادة التشغيل', async () => {
    const a = await call('POST', '/api/units', { token, body: unit('F-1') });
    assert.equal(a.status, 200, a.text);
    const stale = await call('PUT', '/api/units/F-1', { token, body: { ...unit('F-1'), _v: 0 } });
    assert.equal(stale.status, 409);
    await stopServer(server);
    server = await startServer(port, { BMS_DATA_DIR: dataDir });
    const r = await call('GET', '/api/units', { token });
    assert.equal(r.status, 200);
    assert.ok(r.json.some((u) => u.code === 'F-1'));
    const h = await call('GET', '/api/health');
    assert.equal(h.json.storage, 'file');
    assert.equal((await call('GET', '/api/status', { token })).json.mirror.enabled, false);
  });

  test('لا يضيع أي حقل من حقول الوحدة بين الحفظ والقراءة', async () => {
    const full = unit('F-FIELDS', {
      unitTypeCode: 'ADM',
      landAreaSqM: 1250.5,
      roofType: 'سقف خرساني',
      structureType: 'هيكل خرساني مسلح',
      rooms: [{ id: 'r1', code: 'F-FIELDS-F1-OFF-101', name: 'مكتب', areaSqM: 20 }],
      nested: { deep: [1, 'نص', { ok: true }] },
    });
    assert.equal((await call('POST', '/api/units', { token, body: full })).status, 200);
    const back = (await call('GET', '/api/units', { token })).json.find((u) => u.code === 'F-FIELDS');
    for (const [k, v] of Object.entries(full)) assert.deepEqual(back[k], v, k);
  });

  test('المرفق يُحفظ ملفاً ويُقرأ بجلسة صالحة فقط', async () => {
    const bytes = Buffer.alloc(2000, 7);
    const dataUrl = 'data:image/png;base64,' + bytes.toString('base64');
    const r = await call('POST', '/api/units', {
      token,
      body: unit('F-ATT', { attachments: [{ id: 'a1', name: 'مخطط.png', url: dataUrl }], icon: 'data:image/png;base64,AAAA' }),
    });
    assert.equal(r.status, 200, r.text);
    const url = r.json.unit.attachments[0].url;
    assert.match(url, /^\/api\/files\/[a-f0-9]{64}\.png$/);
    assert.equal(r.json.unit.icon, 'data:image/png;base64,AAAA', 'الصغير جداً يبقى مضمّناً');
    assert.equal(fs.existsSync(path.join(dataDir, 'files', url.split('/').pop())), true);
    assert.equal(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf-8').includes(bytes.toString('base64').slice(0, 200)), false);

    const base = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(base + url)).status, 401, 'دون جلسة');
    const withBearer = await fetch(base + url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(withBearer.status, 200);
    assert.equal(withBearer.headers.get('content-type'), 'image/png');
    assert.equal(withBearer.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await withBearer.arrayBuffer()), bytes);

    // المتصفح يطلب الصور بكعكة الملفات التي يضعها الخادم مع أي طلب موثَّق
    const any = await fetch(base + '/api/units', { headers: { Authorization: `Bearer ${token}` } });
    const cookie = (any.headers.get('set-cookie') || '').split(';')[0];
    assert.match(cookie, /^bms_files=/);
    assert.match(any.headers.get('set-cookie'), /Path=\/api\/files; HttpOnly; SameSite=Strict/);
    assert.equal((await fetch(base + url, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(base + '/api/units', { headers: { Cookie: cookie } })).status, 401, 'الكعكة لا تفتح غير الملفات');

    assert.equal((await fetch(base + '/api/files/..%2Fstore.json', { headers: { Authorization: `Bearer ${token}` } })).status, 404);
    const html = await call('POST', '/api/units', {
      token,
      body: unit('F-HTML', { attachments: [{ id: 'h', url: 'data:text/html;base64,' + Buffer.alloc(900, 60).toString('base64') }] }),
    });
    const htmlRes = await fetch(base + html.json.unit.attachments[0].url, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(htmlRes.headers.get('content-type'), 'application/octet-stream');
    assert.match(htmlRes.headers.get('content-disposition'), /^attachment/);
  });

  test('وحدة لها سجل لا تُحذف، ووحدة بلا سجل تُحذف', async () => {
    await call('POST', '/api/units', { token, body: unit('F-HIST') });
    await call('POST', '/api/units', { token, body: unit('F-EMPTY') });
    const m = await call('POST', '/api/maintenance', { token, body: { id: 'M-1', unitCode: 'F-HIST', title: 'تسرب' } });
    assert.equal(m.status, 200, m.text);
    const blocked = await call('DELETE', '/api/units/F-HIST', { token });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.json.code, 'UNIT_HAS_HISTORY');
    const batch = await call('POST', '/api/units/batch', { token, body: { upserts: [], deletes: ['F-EMPTY', 'F-HIST'] } });
    assert.equal(batch.status, 409, 'الدفعة كلها تُرفض');
    assert.equal((await call('DELETE', '/api/units/F-EMPTY', { token })).status, 200);
    const codes = (await call('GET', '/api/units', { token })).json.map((u) => u.code);
    assert.equal(codes.includes('F-HIST'), true);
    assert.equal(codes.includes('F-EMPTY'), false);
  });

  test('رموز الغرف والمعدات المكررة تُرفض', async () => {
    const room = (id, code) => ({ id, code, name: id, type: 'مكتب', areaSqM: 10, floor: 'الطابق 1' });
    const post = (body) => call('POST', '/api/units', { token, body });

    const inside = await post(unit('D-1', { rooms: [room('r1', 'DDDD-F1-OFF-101'), room('r2', 'dddd-f1-off-101 ')] }));
    assert.equal(inside.status, 400);
    assert.equal(inside.json.code, 'DUPLICATE_CODE');
    assert.match(inside.json.error, /DDDD-F1-OFF-101/);
    assert.equal((await post(unit('D-1', { rooms: [room('r1', 'A'), room('r1', 'B')] }))).status, 400, 'معرّف غرفة مكرر');
    assert.equal((await post(unit('D-1', { equipment: [{ id: 'e1', name: 'مولد' }, { id: 'e1', name: 'مضخة' }] }))).status, 400);
    assert.equal((await call('GET', '/api/units', { token })).json.some((u) => u.code === 'D-1'), false, 'لم يُحفظ شيء');

    assert.equal((await post(unit('D-1', { rooms: [room('r1', 'DDDD-F1-OFF-101'), room('r2', 'DDDD-F1-OFF-102'), room('r3', '')], equipment: [{ id: 'e1' }, { id: 'e2' }] }))).status, 200);
    const cross = await post(unit('D-2', { rooms: [room('x1', 'DDDD-F1-OFF-102')] }));
    assert.equal(cross.status, 400);
    assert.match(cross.json.error, /D-1/);

    // الدفعة: تكرار بين وحدتين جديدتين يرفضها كلها
    const batch = await call('POST', '/api/units/batch', {
      token,
      body: { upserts: [unit('D-3', { rooms: [room('a', 'ZZZZ-F1-OFF-101')] }), unit('D-4', { rooms: [room('b', 'ZZZZ-F1-OFF-101')] })] },
    });
    assert.equal(batch.status, 400);
    assert.equal((await call('GET', '/api/units', { token })).json.some((u) => u.code === 'D-3'), false);

    // تعديل الوحدة نفسها برموزها الحالية مقبول، وتبديل رمز غرفة إلى رمز حر مقبول
    const current = (await call('GET', '/api/units', { token })).json.find((u) => u.code === 'D-1');
    assert.equal((await call('PUT', '/api/units/D-1', { token, body: { ...current, name: 'معدّلة' } })).status, 200);
    const bulk = await call('POST', '/api/units/bulk', { token, body: { units: [unit('D-5', { rooms: [room('q', 'DDDD-F1-OFF-101')] })] } });
    assert.equal(bulk.status, 400, 'الاستيراد الجماعي يخضع للفحص نفسه');
  });
});
