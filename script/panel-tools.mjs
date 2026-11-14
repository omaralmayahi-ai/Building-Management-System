// أدوات لوحة التحكم — نظام إدارة الأبنية والكرفانات
// تُستدعى من tools\control-app.ps1 والمخرجات سطور KEY=VALUE للقراءة الآلية.
//   node script/panel-tools.mjs check <ملف البيانات>
//   node script/panel-tools.mjs stats <مجلد النظام>
//   node script/panel-tools.mjs reset-admin        (ECP_ADMIN_USERNAME / ECP_ADMIN_PASSWORD)
//   node script/panel-tools.mjs restore <ملف نسخة>  (يستبدل بيانات النظام بمحتوى النسخة؛ يعمل مع PostgreSQL والملف)
//   node script/panel-tools.mjs storage <مجلد النظام> (مكان التخزين المعتمد واختبار الاتصال)
// البيانات تُقرأ وتُكتب عبر store-io.mjs: PostgreSQL عند ضبط DATABASE_URL وإلا ملف .data/store.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadStore, saveStore, putRecord, readStoreFile, databaseUrl, testConnection } from './store-io.mjs';

// نفس صيغة الخادم: scrypt$<salt>$<hash>
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function matchesPassword(plain, stored) {
  if (!stored) return false;
  if (typeof stored === 'string' && stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const expected = Buffer.from(parts[2], 'hex');
    const actual = crypto.scryptSync(plain, parts[1], 64);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }
  return stored === plain;
}

const out = (k, v) => console.log(`${k}=${String(v ?? '').replace(/[\r\n]+/g, ' ')}`);
const len = (v) => (Array.isArray(v) ? v.length : 0);

const readStore = readStoreFile;

function isHashed(p) {
  return typeof p === 'string' && (/^\$2[aby]\$/.test(p) || p.startsWith('scrypt$'));
}

function check(file) {
  try {
    const d = readStore(file);
    let last = '';
    for (const u of d.units || []) {
      const t = String(u?.lastUpdated || '');
      if (t > last) last = t;
    }
    out('QUICK_CHECK', 'ok');
    out('USERS', len(d.users));
    out('UNITS', len(d.units));
    out('MAINTENANCE', len(d.maintenance));
    out('INSPECTIONS', len(d.inspections));
    out('OCCUPANCY', len(d.occupancy));
    out('ORG_ENTITIES', len(d.orgEntities));
    out('LAST_UPDATE', last);
    return 0;
  } catch (e) {
    out('QUICK_CHECK', 'failed');
    out('ERROR', e.message);
    return 1;
  }
}

async function stats(appDir) {
  try {
    const { store: d } = await loadStore(appDir);
    const users = Array.isArray(d.users) ? d.users : [];
    const admin = users.find((u) => String(u?.username || '').toLowerCase() === 'admin');
    const isDefault = admin && (!admin.password || ['admin123', '123'].some((w) => matchesPassword(w, admin.password)));
    out('DEFAULT_ADMIN_PASSWORD', isDefault ? 1 : 0);
    out('PLAINTEXT_PASSWORDS', users.filter((u) => u && u.password && !isHashed(u.password)).length);
    return 0;
  } catch (e) {
    out('ERROR', e.message);
    return 1;
  }
}

async function resetAdmin() {
  const username = String(process.env.ECP_ADMIN_USERNAME || '').trim();
  const password = String(process.env.ECP_ADMIN_PASSWORD || '');
  if (!username || password.length < 8) {
    out('ERROR', 'اسم المستخدم مطلوب وكلمة المرور 8 أحرف على الأقل');
    return 1;
  }
  const appDir = process.cwd();
  try {
    const { store: d } = await loadStore(appDir);
    const users = Array.isArray(d.users) ? d.users : [];
    const u = users.find((x) => String(x?.username || '').toLowerCase() === username.toLowerCase());
    if (!u) {
      out('ERROR', 'الحساب غير موجود: ' + username);
      return 1;
    }
    u.password = hashPassword(password);
    u.status = 'active';
    await putRecord(appDir, 'users', u);
    out('OK', 1);
    return 0;
  } catch (e) {
    out('ERROR', e.message);
    return 1;
  }
}

// استعادة نسخة: تستبدل بيانات النظام كلها بمحتوى ملف النسخة
async function restore(file) {
  try {
    const d = readStore(file);
    const mode = await saveStore(process.cwd(), d);
    out('OK', 1);
    out('MODE', mode);
    return 0;
  } catch (e) {
    out('ERROR', e.message);
    return 1;
  }
}

async function storage(appDir) {
  if (!databaseUrl(appDir)) {
    out('MODE', 'file');
    return 0;
  }
  out('MODE', 'postgres');
  try {
    await testConnection(appDir);
    out('CONNECTION', 'ok');
    return 0;
  } catch (e) {
    out('CONNECTION', 'failed');
    out('ERROR', e.message);
    return 1;
  }
}

const [cmd, arg] = process.argv.slice(2);
let code = 1;
if (cmd === 'check' && arg) code = check(arg);
else if (cmd === 'stats' && arg) code = await stats(arg);
else if (cmd === 'reset-admin') code = await resetAdmin();
else if (cmd === 'restore' && arg) code = await restore(arg);
else if (cmd === 'storage' && arg) code = await storage(arg);
else out('ERROR', 'أمر غير معروف');
process.exit(code);
