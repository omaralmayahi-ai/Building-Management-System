import { SystemBranding } from '../types';

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
  const shortName = systemName.length > 20 ? 'إدارة الأبنية' : systemName;
  setOrUpdateMetaTag('name', 'apple-mobile-web-app-title', shortName);
  setOrUpdateMetaTag('name', 'application-name', shortName);

  // 4. Dynamic Favicon Links (Instant update in browser tab)
  const isSvg = logoUrl.startsWith('data:image/svg') || logoUrl.endsWith('.svg');
  const mimeType = isSvg ? 'image/svg+xml' : 'image/png';

  // Base path calculation for current deployment (supports GitHub Pages sub-directories)
  const pathname = window.location.pathname;
  const basePath = pathname.endsWith('/') ? pathname : pathname.substring(0, pathname.lastIndexOf('/') + 1) || './';
  const defaultPngIcon = `${basePath}icons/apple-touch-icon.png`;

  // Standard Favicons in browser tab
  const faviconSelectors = [
    "link[rel='icon']",
    "link[rel='shortcut icon']",
  ];
  const existingFavicons = document.querySelectorAll<HTMLLinkElement>(faviconSelectors.join(', '));
  if (existingFavicons.length > 0) {
    existingFavicons.forEach((el) => {
      el.href = logoUrl;
      el.type = mimeType;
    });
  } else {
    const newFavicon = document.createElement('link');
    newFavicon.rel = 'icon';
    newFavicon.type = mimeType;
    newFavicon.href = logoUrl;
    document.head.appendChild(newFavicon);
  }

  // Apple Touch Icon for iOS Safari Add-to-Home-Screen (iOS strictly requires PNG)
  const appleSelectors = [
    "link[rel='apple-touch-icon']",
    "link[rel='apple-touch-icon-precomposed']",
  ];
  const appleIconUrl = isSvg ? defaultPngIcon : logoUrl;
  const existingAppleIcons = document.querySelectorAll<HTMLLinkElement>(appleSelectors.join(', '));
  if (existingAppleIcons.length > 0) {
    existingAppleIcons.forEach((el) => {
      el.href = appleIconUrl;
      el.type = 'image/png';
    });
  } else {
    const newAppleIcon = document.createElement('link');
    newAppleIcon.rel = 'apple-touch-icon';
    newAppleIcon.type = 'image/png';
    newAppleIcon.href = appleIconUrl;
    document.head.appendChild(newAppleIcon);
  }

  // 5. PWA Manifest is loaded statically via <link rel="manifest" href="./manifest.json" /> in index.html.
  // Note: Modern browsers reject blob: URLs for PWA manifest start_url/scope, so keeping the static manifest avoids all console warnings.
}
