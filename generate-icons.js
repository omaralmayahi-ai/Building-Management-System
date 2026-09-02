import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgStandard = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="glow" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="goldLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.6" />
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Base App Background -->
  <rect width="512" height="512" rx="115" fill="url(#glow)" />
  <rect x="12" y="12" width="488" height="488" rx="103" fill="none" stroke="url(#shieldBorder)" stroke-width="6" />

  <!-- Inner Badge / Shield -->
  <g filter="url(#dropShadow)">
    <!-- Central Engineering Building & Oil Drop -->
    <g transform="translate(106, 75) scale(3.0)">
      <!-- Architectural Building Body -->
      <path d="M 12 78 L 12 34 L 50 12 L 88 34 L 88 78 Z" fill="#0f172a" stroke="url(#gold)" stroke-width="4.5" stroke-linejoin="round" />
      
      <!-- Stepped Foundation Lines -->
      <line x1="6" y1="84" x2="94" y2="84" stroke="url(#gold)" stroke-width="4" stroke-linecap="round" />
      <line x1="16" y1="89" x2="84" y2="89" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />

      <!-- Modern Engineering Grid / Windows -->
      <rect x="22" y="42" width="13" height="13" rx="2.5" fill="url(#goldLight)" />
      <rect x="43" y="42" width="14" height="13" rx="2.5" fill="url(#goldLight)" />
      <rect x="65" y="42" width="13" height="13" rx="2.5" fill="url(#goldLight)" />
      
      <rect x="22" y="61" width="13" height="13" rx="2.5" fill="url(#goldLight)" />
      <rect x="43" y="61" width="14" height="13" rx="2.5" fill="url(#goldLight)" />
      <rect x="65" y="61" width="13" height="13" rx="2.5" fill="url(#goldLight)" />

      <!-- Crown Oil Flame / Golden Drop -->
      <path d="M 50 10 C 50 10 37 23 37 30 C 37 37 42.8 42 50 42 C 57.2 42 63 37 63 30 C 63 23 50 10 50 10 Z" fill="url(#gold)" stroke="#fef08a" stroke-width="1.5" />
      <circle cx="48" cy="27" r="3" fill="#ffffff" opacity="0.6" />
    </g>
  </g>

  <!-- MDOC Central Oil Co. Typography Badge -->
  <rect x="136" y="392" width="240" height="52" rx="26" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5" stroke-opacity="0.7" />
  <text x="256" y="428" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Cairo', sans-serif" font-size="28" font-weight="900" fill="#f8fafc" text-anchor="middle" letter-spacing="3">MDOC</text>
  <text x="256" y="468" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Cairo', sans-serif" font-size="16" font-weight="700" fill="#fbbf24" text-anchor="middle">شركة نفط الوسط</text>
</svg>`;

// Safe-zone padded maskable SVG for Android adaptive launcher icons
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="glowM" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </radialGradient>
    <linearGradient id="goldM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="goldLightM" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>

  <!-- Full bleed background for maskable safe area -->
  <rect width="512" height="512" fill="url(#glowM)" />
  
  <!-- Scaled center graphics to fit within 75% safe area circle -->
  <g transform="translate(64, 48) scale(0.75)">
    <g transform="translate(106, 75) scale(3.0)">
      <!-- Architectural Building Body -->
      <path d="M 12 78 L 12 34 L 50 12 L 88 34 L 88 78 Z" fill="#0f172a" stroke="url(#goldM)" stroke-width="4.5" stroke-linejoin="round" />
      
      <!-- Stepped Foundation Lines -->
      <line x1="6" y1="84" x2="94" y2="84" stroke="url(#goldM)" stroke-width="4" stroke-linecap="round" />
      <line x1="16" y1="89" x2="84" y2="89" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />

      <!-- Modern Engineering Grid / Windows -->
      <rect x="22" y="42" width="13" height="13" rx="2.5" fill="url(#goldLightM)" />
      <rect x="43" y="42" width="14" height="13" rx="2.5" fill="url(#goldLightM)" />
      <rect x="65" y="42" width="13" height="13" rx="2.5" fill="url(#goldLightM)" />
      
      <rect x="22" y="61" width="13" height="13" rx="2.5" fill="url(#goldLightM)" />
      <rect x="43" y="61" width="14" height="13" rx="2.5" fill="url(#goldLightM)" />
      <rect x="65" y="61" width="13" height="13" rx="2.5" fill="url(#goldLightM)" />

      <!-- Crown Oil Flame / Golden Drop -->
      <path d="M 50 10 C 50 10 37 23 37 30 C 37 37 42.8 42 50 42 C 57.2 42 63 37 63 30 C 63 23 50 10 50 10 Z" fill="url(#goldM)" stroke="#fef08a" stroke-width="1.5" />
      <circle cx="48" cy="27" r="3" fill="#ffffff" opacity="0.6" />
    </g>

    <!-- MDOC Typography Badge -->
    <rect x="136" y="392" width="240" height="52" rx="26" fill="#1e293b" stroke="#f59e0b" stroke-width="2.5" stroke-opacity="0.7" />
    <text x="256" y="428" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Cairo', sans-serif" font-size="28" font-weight="900" fill="#f8fafc" text-anchor="middle" letter-spacing="3">MDOC</text>
    <text x="256" y="468" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Cairo', sans-serif" font-size="16" font-weight="700" fill="#fbbf24" text-anchor="middle">شركة نفط الوسط</text>
  </g>
</svg>`;

async function run() {
  const publicDir = path.resolve('public');
  const iconsDir = path.resolve('public/icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Write SVGs
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgStandard);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgStandard);

  const standardBuffer = Buffer.from(svgStandard);
  const maskableBuffer = Buffer.from(svgMaskable);

  // 1. Standard Icons
  await sharp(standardBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(standardBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(standardBuffer).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  await sharp(standardBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(standardBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon-precomposed.png'));

  // 2. Favicons
  await sharp(standardBuffer).resize(64, 64).png().toFile(path.join(iconsDir, 'favicon-64.png'));
  await sharp(standardBuffer).resize(32, 32).png().toFile(path.join(iconsDir, 'favicon-32.png'));
  await sharp(standardBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(standardBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16x16.png'));
  await sharp(standardBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.ico'));

  // 3. Maskable Icons (Android Adaptive Icons)
  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  await sharp(maskableBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-maskable-192.png'));

  console.log('All icons generated successfully!');
}

run().catch(console.error);
