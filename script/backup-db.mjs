// نسخة احتياطية من بيانات النظام — تُستدعى من لوحة التحكم:
//   node script/backup-db.mjs <مجلد النظام> <مجلد النسخة>
// تكتب <مجلد النسخة>\.data\store.json، ومعها database.dump إذا كان PostgreSQL مُعدّاً في .env
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [appDir, folder] = process.argv.slice(2);
if (!appDir || !folder) {
  console.error('usage: backup-db.mjs <appDir> <backupFolder>');
  process.exit(2);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// 1) ملف البيانات: يُقرأ ويُتحقق من سلامته (مع إعادة المحاولة إن كان الخادم يكتبه في اللحظة نفسها)
const src = path.join(appDir, '.data', 'store.json');
let raw = null;
for (let i = 0; i < 5 && raw === null; i++) {
  try {
    const text = fs.readFileSync(src, 'utf8');
    JSON.parse(text.replace(/^\uFEFF/, ''));
    raw = text;
  } catch (e) {
    if (i === 4) {
      console.error('تعذر قراءة ملف البيانات أو أنه تالف: ' + e.message);
      process.exit(1);
    }
    sleep(400);
  }
}
const destDir = path.join(folder, '.data');
fs.mkdirSync(destDir, { recursive: true });
fs.writeFileSync(path.join(destDir, 'store.json'), raw, 'utf8');
console.log('تم نسخ ملف البيانات (' + Math.round(Buffer.byteLength(raw) / 1024) + ' KB)');

// 2) PostgreSQL (إن كان مُعدّاً)
function readEnv() {
  const env = {};
  try {
    for (const line of fs.readFileSync(path.join(appDir, '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

function findPgDump() {
  const exe = process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump';
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir && fs.existsSync(path.join(dir, exe))) return path.join(dir, exe);
  }
  const base = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL');
  try {
    const versions = fs.readdirSync(base).sort((a, b) => parseFloat(b) - parseFloat(a));
    for (const v of versions) {
      const p = path.join(base, v, 'bin', exe);
      if (fs.existsSync(p)) return p;
    }
  } catch {}
  return null;
}

const url = readEnv().DATABASE_URL || '';
if (url && !/CHANGE_ME/.test(url)) {
  const pgDump = findPgDump();
  if (!pgDump) {
    console.error('PostgreSQL مُعدّ في .env لكن أداة pg_dump غير موجودة: النسخة ناقصة.');
    process.exit(1);
  }
  const dump = path.join(folder, 'database.dump');
  const r = spawnSync(pgDump, ['--dbname=' + url, '-F', 'c', '-f', dump], { stdio: 'inherit' });
  if (r.status !== 0 || !fs.existsSync(dump)) {
    console.error('فشل نسخ قاعدة بيانات PostgreSQL.');
    process.exit(1);
  }
  console.log('تم نسخ قاعدة بيانات PostgreSQL (database.dump)');
}
process.exit(0);
