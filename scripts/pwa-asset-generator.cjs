/**
 * PWA Asset Generator & Validator Tool
 * شركة نفط الوسط - نظام السجل الرقمي الموحد للأصول
 *
 * يستخدم هذا السكربت مكتبة sharp لفحص وإنشاء جميع أحجام أيقونات PWA
 * المطلوبة للتشغيل على أجهزة أندرويد وآيفون وسطح المكتب.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const OFFICIAL_MOC_LOGO_SVG = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="104" fill="url(#bg)" />
  <g fill="url(#accent)">
    <rect x="56" y="400" width="400" height="40" rx="8" />
    <path d="M 160 400 L 160 250 L 200 250 L 200 80 L 350 144 L 350 400 Z" />
  </g>
  <g fill="#ffffff">
    <rect x="224" y="118" width="22" height="22" rx="3" opacity="0.9" />
    <rect x="224" y="158" width="22" height="22" rx="3" opacity="0.9" />
    <rect x="224" y="198" width="22" height="22" rx="3" opacity="0.9" />
    <rect x="260" y="132" width="22" height="22" rx="3" opacity="0.9" />
    <rect x="260" y="172" width="22" height="22" rx="3" opacity="0.9" />
    <rect x="260" y="212" width="22" height="22" rx="3" opacity="0.9" />
    <rect x="176" y="278" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="206" y="278" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="236" y="278" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="266" y="278" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="176" y="314" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="206" y="314" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="236" y="314" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="266" y="314" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="176" y="350" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="206" y="350" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="236" y="350" width="20" height="20" rx="3" opacity="0.9" />
    <rect x="266" y="350" width="20" height="20" rx="3" opacity="0.9" />
  </g>
</svg>
`);

async function generateIcons() {
  console.log('🎨 توليد وفحص أيقونات PWA...');

  // 192x192
  await sharp(OFFICIAL_MOC_LOGO_SVG)
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'));
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-192.png'), path.join(PUBLIC_DIR, 'pwa-192x192.png'));

  // 512x512
  await sharp(OFFICIAL_MOC_LOGO_SVG)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'));
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-512.png'), path.join(PUBLIC_DIR, 'pwa-512x512.png'));

  // 512x512 Maskable with safe area margin
  await sharp(OFFICIAL_MOC_LOGO_SVG)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    })
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-512.png'));
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-maskable-512.png'), path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'));

  // Apple touch icon 180x180
  await sharp(OFFICIAL_MOC_LOGO_SVG)
    .resize(180, 180)
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
  fs.copyFileSync(path.join(ICONS_DIR, 'apple-touch-icon.png'), path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  console.log('✅ تم إنشاء وحفظ جميع الأيقونات بنجاح!');
}

generateIcons().catch((err) => {
  console.error('❌ خطأ في توليد الأيقونات:', err);
  process.exit(1);
});
