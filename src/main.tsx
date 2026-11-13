import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { applyAppearance, cachedAppearance } from './lib/theme';

// تطبيق آخر مظهر مستخدم على هذا المتصفح قبل أول رسم (بلا وميض)
applyAppearance(cachedAppearance());

// Register Service Worker for PWA offline caching & instant launch
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('PWA: New version available');
  },
  onOfflineReady() {
    console.info('PWA: Ready for offline operation');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
