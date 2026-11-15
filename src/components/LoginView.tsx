import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Building2,
  Sun,
  Moon,
  QrCode,
} from 'lucide-react';
import { SystemUser, SystemBranding, UnitAsset } from '../types';
import { INITIAL_BRANDING, INITIAL_USERS } from '../data/mockData';
import { safeParse } from '../utils/storageUtils';
import * as api from '../services/apiClient';
import { Button, Field, Input } from './ui';
import { MapPin, Navigation, ExternalLink, Compass, Copy, Check } from 'lucide-react';
import { toArabicDigits } from '../utils/arabicUtils';

interface LoginViewProps {
  users: SystemUser[];
  units?: UnitAsset[];
  branding?: SystemBranding;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogin: (user: SystemUser) => void;
  pendingDeepLink?: {
    view: string;
    unit: string;
    lat?: number;
    lng?: number;
    name?: string;
    gov?: string;
    field?: string;
    src?: string;
    isRoom?: boolean;
    roomCode?: string;
    roomName?: string;
    floor?: string;
    occupiedBy?: string;
  } | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users: propUsers,
  units = [],
  branding: propBranding,
  theme,
  onToggleTheme,
  onLogin,
  pendingDeepLink,
}) => {
  const isLight = theme === 'light';
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Find matched unit if present in units list
  const deepLinkUnitObj = useMemo(() => {
    if (!pendingDeepLink) return null;
    return units.find(
      (u) =>
        (pendingDeepLink.unit && (u.code.toLowerCase() === pendingDeepLink.unit.toLowerCase() || u.id.toLowerCase() === pendingDeepLink.unit.toLowerCase())) ||
        (pendingDeepLink.roomCode && u.rooms?.some((r) => r.code?.toUpperCase() === pendingDeepLink.roomCode?.toUpperCase() || r.id === pendingDeepLink.roomCode))
    );
  }, [pendingDeepLink, units]);

  // Live and synchronized users list & branding
  const [internalUsers, setInternalUsers] = useState<SystemUser[]>(() => {
    if (propUsers && propUsers.length > 0) return propUsers;
    const local = safeParse<SystemUser[]>('app_users', []);
    return local.length > 0 ? local : INITIAL_USERS;
  });

  const [internalBranding, setInternalBranding] = useState<SystemBranding>(() => {
    if (propBranding && propBranding.systemName) return propBranding;
    return safeParse('app_branding', INITIAL_BRANDING);
  });

  // Sync with props whenever updated
  useEffect(() => {
    if (propUsers && propUsers.length > 0) {
      setInternalUsers(propUsers);
    }
  }, [propUsers]);

  useEffect(() => {
    if (propBranding && propBranding.systemName) {
      setInternalBranding(propBranding);
    }
  }, [propBranding]);

  // Fetch latest users & branding directly from API on mount to guarantee mobile/QR sync
  useEffect(() => {
    let isMounted = true;
    Promise.all([api.getBranding(), api.getUsers()]).then(([b, u]) => {
      if (!isMounted) return;
      if (b && b.systemName) setInternalBranding(b);
      if (u && Array.isArray(u) && u.length > 0) setInternalUsers(u);
    }).catch((e) => console.warn('LoginView sync note:', e));

    const unsubscribe = api.subscribeToRealtimeSync((event) => {
      if (!isMounted) return;
      if (event.type === 'branding_updated' || event.type === 'all_updated') {
        api.getBranding().then((b) => {
          if (isMounted && b && b.systemName) setInternalBranding(b);
        }).catch(() => {});
      }
      if (event.type === 'users_updated' || event.type === 'all_updated') {
        api.getUsers().then((u) => {
          if (isMounted && u && Array.isArray(u) && u.length > 0) setInternalUsers(u);
        }).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const currentBranding: SystemBranding = internalBranding || INITIAL_BRANDING;
  const allAvailableUsers: SystemUser[] = internalUsers.length > 0 ? internalUsers : INITIAL_USERS;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // حساب دخل بكلمة مرور افتراضية: يُطلب منه تغييرها قبل فتح النظام
  const [pendingUser, setPendingUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleForcedPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const next = newPassword.trim();
    if (next.length < 8) {
      setErrorMessage('كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف');
      return;
    }
    if (next !== confirmPassword.trim()) {
      setErrorMessage('تأكيد كلمة المرور لا يطابق الكلمة الجديدة');
      return;
    }
    setIsLoading(true);
    const result = await api.changeOwnPassword(password.trim(), next);
    setIsLoading(false);
    if (!result.success) {
      setErrorMessage(result.error || 'تعذر تغيير كلمة المرور');
      return;
    }
    const user = pendingUser;
    setPendingUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setPassword('');
    if (user) onLogin(user);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawInput = username.trim();
    const trimmedUser = rawInput.toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);

    const authenticate = async () => {
      try {
        // 1. Primary: Secure Server-Side Authentication with Lockout & Rate Limiting
        const serverAuthResult = await api.loginWithServer(trimmedUser, trimmedPass);

        if (serverAuthResult.success && serverAuthResult.user) {
          setIsLoading(false);
          if (serverAuthResult.mustChangePassword) {
            setPendingUser(serverAuthResult.user);
            return;
          }
          onLogin(serverAuthResult.user);
          return;
        }

        // لا يوجد دخول بديل داخل المتصفح: المصادقة على الخادم فقط
        setErrorMessage(serverAuthResult.error || 'تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً');
        setIsLoading(false);
      } catch {
        setErrorMessage('حدث خطأ أثناء معالجة تسجيل الدخول، يرجى المحاولة ثانية.');
        setIsLoading(false);
      }
    };

    authenticate();
  };

  return (
    <div
      className="ds min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden transition-colors duration-300 bg-page text-slate-900"
      dir="rtl"
    >
      {/* Background Graphic Grids & Atmospheric Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div
          className={`absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-25 transition-opacity bg-brand-700`}
        />
        <div
          className={`absolute bottom-10 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 transition-opacity bg-indigo-300`}
        />
        <div
          className={`absolute inset-0 opacity-[0.03] bg-grid-slate-900`}
        />
      </div>

      {/* Top Header Bar */}
      <header
        className={`relative z-10 w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b backdrop-blur-md transition-colors bg-card/85 border-slate-200 shadow-xs`}
      >
        {/* Company & Ministry Identity */}
        <div className="flex items-center gap-3">
          {currentBranding.logoUrl ? (
            <div className="w-11 h-11 rounded-xl bg-card border border-brand-200 flex items-center justify-center p-1 shadow-inner overflow-hidden shrink-0">
              <img
                src={currentBranding.logoUrl}
                alt={currentBranding.companyName || 'Logo'}
                className="max-w-full max-h-full object-contain"
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold shadow-inner shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`font-black text-sm sm:text-base block tracking-tight text-brand-700`}
              >
                {currentBranding.companyName || 'شركة نفط الوسط'}
              </span>
              {currentBranding.logoSubtext && (
                <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.2 rounded border border-brand-200 font-bold">
                  {currentBranding.logoSubtext}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] block font-semibold text-slate-500`}
            >
              {currentBranding.countryName || 'جمهورية العراق'} • {currentBranding.ministryName || 'وزارة النفط العراقية'}
            </span>
          </div>
        </div>

        {/* Theme Toggle Button (Light / Dark) */}
        <Button
          id="login-theme-toggle-button"
          icon={isLight ? Moon : Sun}
          onClick={onToggleTheme}
          title={isLight ? 'التحويل للوضع الداكن' : 'التحويل للوضع الفاتح'}
        >
          {isLight ? 'الوضع الداكن' : 'الوضع الفاتح'}
        </Button>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 w-full max-w-lg mx-auto my-auto px-4 py-6">
        {/* Deep Link Quick Access & External QR Location Card */}
        {pendingDeepLink && (pendingDeepLink.unit || pendingDeepLink.roomCode) && (() => {
          const lat = deepLinkUnitObj?.coordinates?.lat ?? pendingDeepLink.lat ?? 32.6189;
          const lng = deepLinkUnitObj?.coordinates?.lng ?? pendingDeepLink.lng ?? 45.7531;
          const unitName = deepLinkUnitObj?.name ?? pendingDeepLink.name ?? 'منشأة تابعة لشركة نفط الوسط';
          const unitGov = deepLinkUnitObj?.governorate ?? pendingDeepLink.gov ?? 'الموقع الميداني';
          const unitField = deepLinkUnitObj?.field ?? pendingDeepLink.field ?? '';
          const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
          const grade = deepLinkUnitObj?.conditionGrade;
          const isRoom = Boolean(pendingDeepLink.isRoom || pendingDeepLink.roomCode);
          const roomName = pendingDeepLink.roomName || 'غرفة مخصصة';
          const roomCode = pendingDeepLink.roomCode || '';
          const floor = pendingDeepLink.floor || '';

          const handleCopyGps = () => {
            navigator.clipboard.writeText(`${lat}, ${lng}`);
            setCopiedCoords(true);
            setTimeout(() => setCopiedCoords(false), 2500);
          };

          return (
            <div
              className={`mb-5 p-4 sm:p-5 rounded-3xl border shadow-xl animate-fadeIn space-y-3.5 transition-all bg-brand-50 border-brand-200 text-slate-900 `}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-700 text-on-brand flex items-center justify-center font-black shadow-lg shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-brand-700 ">
                        {isRoom ? 'موقع الغرفة والمنشأة (مسح رمز QR للغرفة):' : 'موقع المنشأة الجغرافي (مسح رمز QR):'}
                      </span>
                      {grade && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                          Grade {grade}
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                      {isRoom ? `${unitName} • ${roomName}` : unitName}
                    </h3>
                    <p className="text-xs text-slate-500 ">
                      {unitGov} {unitField ? `• ${unitField}` : ''} {floor ? `• ${floor}` : ''} • الرمز:{' '}
                      <span className="font-mono font-bold text-brand-700">
                        {toArabicDigits(isRoom && roomCode ? roomCode : pendingDeepLink.unit || '')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* GPS Coordinates & Actions */}
              <div className="bg-card/70 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-brand-700 shrink-0" />
                  <div className="text-xs">
                    <span className="text-slate-500">الإحداثيات GPS: </span>
                    <span className="font-mono font-bold text-brand-700">
                      {toArabicDigits(lat.toFixed(5))}°, {toArabicDigits(lng.toFixed(5))}°
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyGps}
                    className="p-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-100 text-slate-600 text-[10px] flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCoords ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>فتح الاتجاهات في Google Maps</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>

              {/* Map Preview Embed */}
              <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-card">
                <iframe
                  title="موقع المنشأة الجغرافي"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008}%2C${lat - 0.006}%2C${lng + 0.008}%2C${lat + 0.006}&layer=mapnik&marker=${lat}%2C${lng}`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>

              <div className="text-[11px] text-slate-500 text-center leading-relaxed">
                تم مسح رمز الوصول السريع من خارج النظام. يمكنك الانتقال الميداني لموقع المنشأة عبر خرائط Google أعلاه، أو تسجيل الدخول بحسابك بالأسفل لإجراء الكشف الفني وتسجيل الصيانة.
              </div>
            </div>
          );
        })()}

        <div
          className={`border rounded-2xl p-6 sm:p-8 shadow-xl bg-card border-slate-200`}
        >
          {/* Card Header & System Branding Title */}
          <div className="text-center space-y-2 mb-6">
            {currentBranding.logoUrl ? (
              <div className="inline-flex w-16 h-16 rounded-2xl bg-card border border-brand-200 p-2 shadow-inner overflow-hidden mb-1 mx-auto items-center justify-center">
                <img
                  src={currentBranding.logoUrl}
                  alt={currentBranding.companyName || 'Logo'}
                  className="max-w-full max-h-full object-contain"
                  loading="eager"
                />
              </div>
            ) : (
              <div className="inline-flex p-3.5 rounded-2xl bg-brand-50 text-brand-700 border border-brand-200 mb-1 shadow-inner">
                <Building2 className="w-8 h-8" />
              </div>
            )}
            <h2
              className={`text-lg sm:text-xl font-black text-slate-900`}
            >
              تسجيل الدخول للنظام
            </h2>
            <p
              className={`text-xs max-w-xs mx-auto leading-relaxed text-slate-600 font-medium`}
            >
              {currentBranding.systemName || 'السجل الرقمي الموحد للأصول الهندسية والإنشائية'}
            </p>
          </div>

          {/* تنبيه الخطأ */}
          {errorMessage && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="font-bold leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* النماذج بالمكوّنات الموحدة */}
          {pendingUser ? (
            <form onSubmit={handleForcedPasswordChange} className="space-y-4">
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-bold leading-relaxed text-brand-800">
                حسابك «{pendingUser.name}» ما زال بكلمة المرور الافتراضية. اختر كلمة مرور جديدة (8 أحرف على الأقل) للمتابعة.
              </div>
              <Field label="كلمة المرور الجديدة" required>
                <Input
                  type="password"
                  dir="ltr"
                  autoFocus
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="font-mono"
                />
              </Field>
              <Field label="تأكيد كلمة المرور الجديدة" required>
                <Input
                  type="password"
                  dir="ltr"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="font-mono"
                />
              </Field>
              <Button type="submit" variant="primary" loading={isLoading} className="h-11 w-full">
                حفظ كلمة المرور والدخول
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="اسم المستخدم" required>
                <div className="relative">
                  <Input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="اسم الحساب المسجل"
                    className="pr-10"
                  />
                  <User className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" aria-hidden />
                </div>
              </Field>
              <Field label="كلمة المرور" required>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="pl-10 pr-10 font-mono"
                  />
                  <Lock className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" aria-hidden />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-500 hover:text-slate-800"
                    title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
              </Field>
              <Button type="submit" variant="primary" icon={LogIn} loading={isLoading} className="mt-2 h-11 w-full">
                {isLoading ? 'جارٍ التحقق من الحساب...' : 'دخول النظام'}
              </Button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Info & Copyright */}
      <footer
        className={`relative z-10 w-full py-4 px-6 text-center text-xs border-t backdrop-blur-sm transition-colors border-slate-200/80 text-slate-600 bg-card/40`}
      >
        <p className="font-semibold text-[11px] tracking-wide">
          {currentBranding.copyrightText || 'جميع الحقوق محفوظة © 2026 - شركة نفط الوسط • وزارة النفط العراقية'}
        </p>
      </footer>
    </div>
  );
};

