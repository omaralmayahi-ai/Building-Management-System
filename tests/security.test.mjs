// اختبارات الأمان (المرحلة 1): تشغّل الخادم المبني على منفذ مؤقت وبمجلد بيانات مؤقت ثم تفحص المصادقة والصلاحيات.
// التشغيل: npm test  (يلزم أن يكون النظام مبنياً: dist/server.cjs)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'dist', 'server.cjs');
const port = 39000 + Math.floor(Math.random() * 900);
const base = `http://127.0.0.1:${port}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bms-test-'));
let server;

async function call(method, url, { token, body, headers } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}

async function login(username, password) {
  const r = await call('POST', '/api/auth/login', { body: { username, password } });
  return { ...r, token: r.json?.token };
}

before(async () => {
  assert.ok(fs.existsSync(entry), 'النظام غير مبني: نفّذ «إعادة البناء» أولاً');
  server = spawn(process.execPath, [entry], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(port), BMS_DATA_DIR: dataDir, DATABASE_URL: '' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('الخادم لم يبدأ');
});

after(() => {
  if (server) server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const ADMIN_PASS = 'Admin#Test2026';
const tokens = {};

test('المسارات العامة تعمل دون دخول', async () => {
  assert.equal((await call('GET', '/api/health')).status, 200);
  assert.equal((await call('GET', '/api/branding')).status, 200);
});

test('مسارات البيانات ترفض الطلب دون جلسة', async () => {
  for (const url of ['/api/units', '/api/users', '/api/sync/all', '/api/sync/version', '/api/maintenance']) {
    assert.equal((await call('GET', url)).status, 401, url);
  }
  assert.equal((await call('POST', '/api/system/factory-reset', { body: {} })).status, 401);
  assert.equal((await call('POST', '/api/users/bulk', { body: { users: [] } })).status, 401);
});

test('المفتاح القديم وترويسات «نفس المصدر» لا تمنح دخولاً', async () => {
  const r = await call('GET', '/api/units', {
    headers: { 'X-API-Key': 'midland_oil_secure_api_key_2026', 'Sec-Fetch-Site': 'same-origin', Origin: base },
  });
  assert.equal(r.status, 401);
});

test('كلمة المرور الافتراضية يُفرض تغييرها قبل أي استخدام', async () => {
  const r = await login('admin', 'admin123');
  assert.equal(r.status, 200);
  assert.equal(r.json.mustChangePassword, true);
  assert.equal(r.json.user.password, undefined);
  const blocked = await call('GET', '/api/units', { token: r.token });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json.code, 'PASSWORD_CHANGE_REQUIRED');
  const weak = await call('POST', '/api/auth/change-password', {
    token: r.token,
    body: { currentPassword: 'admin123', newPassword: 'admin123' },
  });
  assert.equal(weak.status, 400);
  const wrong = await call('POST', '/api/auth/change-password', {
    token: r.token,
    body: { currentPassword: 'not-it', newPassword: ADMIN_PASS },
  });
  assert.equal(wrong.status, 400);
  const ok = await call('POST', '/api/auth/change-password', {
    token: r.token,
    body: { currentPassword: 'admin123', newPassword: ADMIN_PASS },
  });
  assert.equal(ok.status, 200);
  assert.equal((await call('GET', '/api/units', { token: r.token })).status, 200);
  assert.equal((await login('admin', 'admin123')).status, 401);
  tokens.admin = r.token;
});

test('المدير ينشئ حسابات الأدوار، وكلمة المرور لا تظهر في أي استجابة', async () => {
  const roles = {
    operator: 'مشغل النظام',
    inspector: 'موظف الكشف والصيانة',
    maintenance: 'موظف الصيانة',
    user: 'مستخدم',
  };
  for (const [name, role] of Object.entries(roles)) {
    const r = await call('POST', '/api/users', {
      token: tokens.admin,
      body: { id: `USR-${name}`, name, username: name, password: `${name}#Pass2026`, role, status: 'active', lastActive: '' },
    });
    assert.equal(r.status, 200, name);
    assert.equal(r.json.user.password, undefined);
    const l = await login(name, `${name}#Pass2026`);
    assert.equal(l.status, 200, name);
    assert.equal(l.json.mustChangePassword, false);
    tokens[name] = l.token;
  }
  for (const url of ['/api/users', '/api/sync/all']) {
    const r = await call('GET', url, { token: tokens.admin });
    assert.equal(r.status, 200);
    assert.ok(!r.text.includes('"password"'), url);
    assert.ok(!r.text.includes('scrypt$'), url);
  }
});

test('كلمات المرور مخزنة مجزّأة', () => {
  const store = JSON.parse(fs.readFileSync(path.join(dataDir, 'store.json'), 'utf8'));
  assert.ok(store.users.length >= 5);
  for (const u of store.users) assert.ok(String(u.password).startsWith('scrypt$'), u.username);
});

test('جدول الصلاحيات حسب الدور', async () => {
  const unit = { id: 'U-1', code: 'T-001', name: 'وحدة اختبار', type: 'caravan' };
  const maint = { id: 'M-1', unitCode: 'T-001', issue: 'اختبار' };
  const expectStatus = async (who, method, url, body, status) => {
    const r = await call(method, url, { token: tokens[who], body });
    assert.equal(r.status, status, `${who} ${method} ${url}`);
  };
  await expectStatus('user', 'POST', '/api/units', unit, 403);
  await expectStatus('inspector', 'POST', '/api/units', unit, 403);
  await expectStatus('operator', 'POST', '/api/units', unit, 200);
  await expectStatus('inspector', 'PUT', '/api/units/T-001', { ...unit, conditionGrade: 'B' }, 200);
  await expectStatus('user', 'PUT', '/api/units/T-001', unit, 403);
  await expectStatus('maintenance', 'POST', '/api/occupancy', { id: 'O-1', unitCode: 'T-001' }, 403);
  await expectStatus('user', 'POST', '/api/maintenance', maint, 200);
  await expectStatus('user', 'PUT', '/api/maintenance/M-1', maint, 403);
  await expectStatus('maintenance', 'PUT', '/api/maintenance/M-1', maint, 200);
  await expectStatus('maintenance', 'POST', '/api/inspections', { id: 'I-1', unitCode: 'T-001' }, 403);
  // الاستبدال الجماعي والإعدادات والمستخدمون: المدير فقط
  await expectStatus('operator', 'POST', '/api/units/bulk', { units: [] }, 403);
  await expectStatus('operator', 'POST', '/api/maintenance/bulk', { requests: [] }, 403);
  await expectStatus('operator', 'POST', '/api/users', { id: 'X', username: 'x' }, 403);
  await expectStatus('operator', 'PUT', '/api/users/USR-operator', { id: 'USR-operator', username: 'operator', role: 'مدير النظام' }, 403);
  await expectStatus('operator', 'POST', '/api/system/factory-reset', {}, 403);
  await expectStatus('operator', 'POST', '/api/branding', { systemName: 'x' }, 403);
  await expectStatus('inspector', 'DELETE', '/api/units/T-001', undefined, 403);
  // للوحدة T-001 طلب صيانة: الصلاحية موجودة لكن الحذف ممنوع حفاظاً على السجل (تُشطب بدل الحذف)
  await expectStatus('operator', 'DELETE', '/api/units/T-001', undefined, 409);
  await expectStatus('operator', 'POST', '/api/units', { ...unit, id: 'U-2', code: 'T-002' }, 200);
  await expectStatus('operator', 'DELETE', '/api/units/T-002', undefined, 200);
});

test('المدخلات الناقصة تُرفض', async () => {
  const r = await call('POST', '/api/units', { token: tokens.operator, body: { code: 'T-002' } });
  assert.equal(r.status, 400);
  assert.equal(r.json.code, 'INVALID_INPUT');
  const r2 = await call('POST', '/api/maintenance', { token: tokens.user, body: { issue: 'بلا معرّف' } });
  assert.equal(r2.status, 400);
});

test('تعديل المدير لحساب دون كلمة مرور يُبقي كلمته الحالية', async () => {
  const r = await call('PUT', '/api/users/USR-user', {
    token: tokens.admin,
    body: { id: 'USR-user', name: 'اسم جديد', username: 'user', role: 'مستخدم', status: 'active', lastActive: '' },
  });
  assert.equal(r.status, 200);
  assert.equal((await login('user', 'user#Pass2026')).status, 200);
});

test('تسجيل الخروج يلغي الجلسة', async () => {
  assert.equal((await call('POST', '/api/auth/logout', { token: tokens.maintenance })).status, 200);
  assert.equal((await call('GET', '/api/units', { token: tokens.maintenance })).status, 401);
});
