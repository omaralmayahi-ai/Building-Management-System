import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Official System Architecture Building Logo SVG
const svgStandard = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="appBg" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </radialGradient>
    <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Base App Background with refined slate radius -->
  <rect width="512" height="512" rx="112" fill="url(#appBg)" />
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="#334155" stroke-width="4" stroke-opacity="0.8" />

  <!-- Teal Architectural Building Logo with White Windows -->
  <g filter="url(#subtleGlow)" transform="translate(68, 68) scale(0.734)">
    <g fill="#248d9c">
      <rect x="36" y="412" width="440" height="44" rx="6"/>
      <path d="M 152 412 L 152 260 L 194 260 L 194 68 L 366 138 L 366 412 Z"/>
    </g>
    <g fill="#ffffff">
      <rect x="222" y="110" width="24" height="24" rx="3"/>
      <rect x="222" y="154" width="24" height="24" rx="3"/>
      <rect x="222" y="198" width="24" height="24" rx="3"/>
      <rect x="260" y="126" width="24" height="24" rx="3"/>
      <rect x="260" y="170" width="24" height="24" rx="3"/>
      <rect x="260" y="214" width="24" height="24" rx="3"/>
      <rect x="170" y="286" width="22" height="22" rx="3"/>
      <rect x="202" y="286" width="22" height="22" rx="3"/>
      <rect x="234" y="286" width="22" height="22" rx="3"/>
      <rect x="266" y="286" width="22" height="22" rx="3"/>
      <rect x="170" y="326" width="22" height="22" rx="3"/>
      <rect x="202" y="326" width="22" height="22" rx="3"/>
      <rect x="234" y="326" width="22" height="22" rx="3"/>
      <rect x="266" y="326" width="22" height="22" rx="3"/>
      <rect x="170" y="366" width="22" height="22" rx="3"/>
      <rect x="202" y="366" width="22" height="22" rx="3"/>
      <rect x="234" y="366" width="22" height="22" rx="3"/>
      <rect x="266" y="366" width="22" height="22" rx="3"/>
      <rect x="304" y="176" width="50" height="16" rx="3"/>
      <rect x="304" y="214" width="50" height="16" rx="3"/>
      <rect x="304" y="252" width="50" height="16" rx="3"/>
      <rect x="304" y="290" width="50" height="16" rx="3"/>
      <rect x="304" y="328" width="50" height="16" rx="3"/>
      <rect x="304" y="366" width="50" height="16" rx="3"/>
    </g>
  </g>
</svg>`;

// Safe-zone padded maskable SVG for Android adaptive launcher icons
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="appBgM" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </radialGradient>
  </defs>

  <!-- Full bleed background for Android maskable safe area -->
  <rect width="512" height="512" fill="url(#appBgM)" />
  
  <!-- Scaled center graphics to fit within 70% safe area circle -->
  <g transform="translate(86, 86) scale(0.664)">
    <g fill="#248d9c">
      <rect x="36" y="412" width="440" height="44" rx="6"/>
      <path d="M 152 412 L 152 260 L 194 260 L 194 68 L 366 138 L 366 412 Z"/>
    </g>
    <g fill="#ffffff">
      <rect x="222" y="110" width="24" height="24" rx="3"/>
      <rect x="222" y="154" width="24" height="24" rx="3"/>
      <rect x="222" y="198" width="24" height="24" rx="3"/>
      <rect x="260" y="126" width="24" height="24" rx="3"/>
      <rect x="260" y="170" width="24" height="24" rx="3"/>
      <rect x="260" y="214" width="24" height="24" rx="3"/>
      <rect x="170" y="286" width="22" height="22" rx="3"/>
      <rect x="202" y="286" width="22" height="22" rx="3"/>
      <rect x="234" y="286" width="22" height="22" rx="3"/>
      <rect x="266" y="286" width="22" height="22" rx="3"/>
      <rect x="170" y="326" width="22" height="22" rx="3"/>
      <rect x="202" y="326" width="22" height="22" rx="3"/>
      <rect x="234" y="326" width="22" height="22" rx="3"/>
      <rect x="266" y="326" width="22" height="22" rx="3"/>
      <rect x="170" y="366" width="22" height="22" rx="3"/>
      <rect x="202" y="366" width="22" height="22" rx="3"/>
      <rect x="234" y="366" width="22" height="22" rx="3"/>
      <rect x="266" y="366" width="22" height="22" rx="3"/>
      <rect x="304" y="176" width="50" height="16" rx="3"/>
      <rect x="304" y="214" width="50" height="16" rx="3"/>
      <rect x="304" y="252" width="50" height="16" rx="3"/>
      <rect x="304" y="290" width="50" height="16" rx="3"/>
      <rect x="304" y="328" width="50" height="16" rx="3"/>
      <rect x="304" y="366" width="50" height="16" rx="3"/>
    </g>
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
