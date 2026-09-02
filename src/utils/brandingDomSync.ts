import { SystemBranding } from '../types';

let currentManifestBlobUrl: string | null = null;

function setOrUpdateMetaTag(attrKey: 'name' | 'property', attrValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector<HTMLMetaElement>(`meta[${attrKey}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrKey, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Synchronizes the browser document title, favicons, meta tags, and PWA manifest
 * dynamically in real-time whenever the system branding or visual identity changes.
 */
export function syncBrowserBranding(branding: Partial<SystemBranding> | null | undefined) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !branding) return;

  const systemName = (branding.systemName || '').trim() || 'السجل الرقمي الموحد للأصول الهندسية والإنشائية';
  const companyName = (branding.companyName || '').trim() || 'شركة نفط الوسط';
  const ministryName = (branding.ministryName || '').trim() || 'وزارة النفط العراقية';
  const logoUrl = branding.logoUrl || '/icons/icon-512.png';

  // 1. Dynamic Document Title
  const pageTitle = companyName ? `${systemName} - ${companyName}` : systemName;
  document.title = pageTitle;

  // 2. OpenGraph & Standard Meta Tags
  const metaDescription = `${systemName} - ${companyName} - ${ministryName}`;
  setOrUpdateMetaTag('name', 'description', metaDescription);
  setOrUpdateMetaTag('property', 'og:title', pageTitle);
  setOrUpdateMetaTag('property', 'og:description', metaDescription);
  setOrUpdateMetaTag('property', 'og:image', logoUrl);

  // 3. Mobile / PWA App Names
  const shortName = systemName.length > 30 ? systemName.slice(0, 30) : systemName;
  setOrUpdateMetaTag('name', 'apple-mobile-web-app-title', shortName);
  setOrUpdateMetaTag('name', 'application-name', shortName);

  // 4. Dynamic Favicon Links (Instant update in browser tab)
  const isSvg = logoUrl.startsWith('data:image/svg') || logoUrl.endsWith('.svg');
  const mimeType = isSvg ? 'image/svg+xml' : 'image/png';

  // Remove existing static icons to force browser repaint of new icon
  const iconSelectors = [
    "link[rel='icon']",
    "link[rel='shortcut icon']",
    "link[rel='apple-touch-icon']",
    "link[rel='apple-touch-icon-precomposed']",
  ];

  const existingIcons = document.querySelectorAll<HTMLLinkElement>(iconSelectors.join(', '));
  if (existingIcons.length > 0) {
    existingIcons.forEach((el) => {
      el.href = logoUrl;
      el.type = mimeType;
    });
  } else {
    // If no icon tags exist, create them
    const newFavicon = document.createElement('link');
    newFavicon.rel = 'icon';
    newFavicon.type = mimeType;
    newFavicon.href = logoUrl;
    document.head.appendChild(newFavicon);

    const newAppleIcon = document.createElement('link');
    newAppleIcon.rel = 'apple-touch-icon';
    newAppleIcon.href = logoUrl;
    document.head.appendChild(newAppleIcon);
  }

  // 5. Dynamic Web App Manifest (for installation on Desktop PC & Mobile phone)
  try {
    const dynamicManifest = {
      id: '/',
      name: `${companyName} - ${systemName}`,
      short_name: shortName,
      description: metaDescription,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#0f172a',
      orientation: 'any',
      dir: 'rtl',
      lang: 'ar',
      categories: ['business', 'productivity', 'utilities'],
      icons: [
        {
          src: logoUrl,
          sizes: '192x192 512x512 any',
          type: mimeType,
          purpose: 'any maskable',
        },
        {
          src: logoUrl,
          sizes: '192x192',
          type: mimeType,
          purpose: 'any',
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: mimeType,
          purpose: 'any',
        },
      ],
    };

    if (currentManifestBlobUrl) {
      URL.revokeObjectURL(currentManifestBlobUrl);
      currentManifestBlobUrl = null;
    }

    const manifestBlob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
      type: 'application/manifest+json',
    });
    currentManifestBlobUrl = URL.createObjectURL(manifestBlob);

    let manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = currentManifestBlobUrl;
  } catch (err) {
    console.warn('Note: Dynamic manifest blob generation failed:', err);
  }
}
