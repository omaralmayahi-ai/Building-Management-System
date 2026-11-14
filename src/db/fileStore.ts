/**
 * المرفقات كملفات على القرص (المرحلة 3).
 *
 * الواجهة ترسل المرفق نصاً مضمّناً (data:...;base64,...) داخل السجل. الخادم يخرجه إلى ملف في
 * <مجلد البيانات>/files/<sha256>.<ext> ويضع مكانه رابطاً /api/files/<الاسم>، فيبقى السجل صغيراً
 * في قاعدة البيانات والذاكرة والمزامنة. الاسم مشتق من المحتوى، فالملف نفسه لا يُخزَّن مرتين.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_URL = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)?((?:;[a-z0-9=.+-]+)*);base64,/i;
const FILE_NAME = /^[a-f0-9]{64}\.[a-z0-9]{1,8}$/;
const FILE_REF = /\/api\/files\/([a-f0-9]{64}\.[a-z0-9]{1,8})/g;
const MIN_LENGTH = 512; // الأيقونات الصغيرة جداً تبقى مضمّنة

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'model/gltf-binary': 'glb',
  'model/gltf+json': 'gltf',
  'application/zip': 'zip',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

// الأنواع التي يعرضها المتصفح مباشرة؛ ما عداها يُنزَّل ملفاً (حماية من تنفيذ محتوى مرفوع)
const INLINE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  glb: 'model/gltf-binary',
};

export interface FileStore {
  dir: string;
  /** يعيد نسخة من القيمة بعد إخراج كل مرفق مضمّن إلى ملف */
  externalize<T>(value: T): T;
  /** المسار على القرص ونوع المحتوى، أو null إن كان الاسم غير صالح أو الملف غير موجود */
  resolve(name: string): { file: string; contentType: string; inline: boolean } | null;
  /** يحذف الملفات التي لا يشير إليها أي سجل ومضى عليها يوم */
  sweep(referencedJson: string[]): number;
}

export function createFileStore(dataDir: string): FileStore {
  const dir = path.join(dataDir, 'files');
  fs.mkdirSync(dir, { recursive: true });

  function saveDataUrl(text: string): string {
    const m = DATA_URL.exec(text);
    if (!m) return text;
    const mime = (m[1] || 'application/octet-stream').toLowerCase();
    let bytes: Buffer;
    try {
      bytes = Buffer.from(text.slice(m[0].length), 'base64');
    } catch {
      return text;
    }
    if (bytes.length === 0) return text;
    const ext = EXT_BY_MIME[mime] || 'bin';
    const name = `${crypto.createHash('sha256').update(bytes).digest('hex')}.${ext}`;
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) {
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, bytes);
      fs.renameSync(tmp, file);
    }
    return `/api/files/${name}`;
  }

  function walk(value: any): any {
    if (typeof value === 'string') {
      return value.length >= MIN_LENGTH && value.startsWith('data:') ? saveDataUrl(value) : value;
    }
    if (Array.isArray(value)) {
      let changed = false;
      const out = value.map((v) => {
        const n = walk(v);
        if (n !== v) changed = true;
        return n;
      });
      return changed ? out : value;
    }
    if (value && typeof value === 'object') {
      let out: any = null;
      for (const [k, v] of Object.entries(value)) {
        const n = walk(v);
        if (n !== v) {
          if (!out) out = { ...value };
          out[k] = n;
        }
      }
      return out || value;
    }
    return value;
  }

  return {
    dir,
    externalize: (value) => walk(value),
    resolve(name) {
      if (!FILE_NAME.test(name)) return null;
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) return null;
      const ext = name.slice(name.lastIndexOf('.') + 1);
      const inlineType = INLINE_TYPES[ext];
      return { file, contentType: inlineType || 'application/octet-stream', inline: !!inlineType };
    },
    sweep(referencedJson) {
      const used = new Set<string>();
      for (const json of referencedJson) {
        for (const m of json.matchAll(FILE_REF)) used.add(m[1]);
      }
      let removed = 0;
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const name of fs.readdirSync(dir)) {
        if (!FILE_NAME.test(name) || used.has(name)) continue;
        const file = path.join(dir, name);
        try {
          if (fs.statSync(file).mtimeMs < cutoff) {
            fs.unlinkSync(file);
            removed++;
          }
        } catch {}
      }
      return removed;
    },
  };
}
