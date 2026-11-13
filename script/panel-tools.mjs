// أدوات لوحة التحكم — نظام إدارة الأبنية والكرفانات
// تُستدعى من tools\control-app.ps1 والمخرجات سطور KEY=VALUE للقراءة الآلية.
//   node script/panel-tools.mjs check <ملف البيانات>
//   node script/panel-tools.mjs stats <مجلد النظام>
//   node script/panel-tools.mjs reset-admin        (ECP_ADMIN_USERNAME / ECP_ADMIN_PASSWORD)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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

function readStore(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('الملف ليس ملف بيانات النظام');
  const known = ['units', 'maintenance', 'occupancy', 'inspections', 'users', 'orgEntities'];
  if (!known.some((k) => Array.isArray(data[k]))) throw new Error('الملف لا يحتوي جداول النظام');
  return data;
}

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

function stats(appDir) {
  try {
    const d = readStore(path.join(appDir, '.data', 'store.json'));
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

function resetAdmin() {
  const username = String(process.env.ECP_ADMIN_USERNAME || '').trim();
  const password = String(process.env.ECP_ADMIN_PASSWORD || '');
  if (!username || password.length < 8) {
    out('ERROR', 'اسم المستخدم مطلوب وكلمة المرور 8 أحرف على الأقل');
    return 1;
  }
  const file = path.join(process.cwd(), '.data', 'store.json');
  try {
    const d = readStore(file);
    const users = Array.isArray(d.users) ? d.users : [];
    const u = users.find((x) => String(x?.username || '').toLowerCase() === username.toLowerCase());
    if (!u) {
      out('ERROR', 'الحساب غير موجود: ' + username);
      return 1;
    }
    u.password = hashPassword(password);
    u.status = 'active';
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(d, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    out('OK', 1);
    return 0;
  } catch (e) {
    out('ERROR', e.message);
    return 1;
  }
}

const [cmd, arg] = process.argv.slice(2);
let code = 1;
if (cmd === 'check' && arg) code = check(arg);
else if (cmd === 'stats' && arg) code = stats(arg);
else if (cmd === 'reset-admin') code = resetAdmin();
else out('ERROR', 'أمر غير معروف');
process.exit(code);
