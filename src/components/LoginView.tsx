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
    if (!pendingDeepLink || !pendingDeepLink.unit) return null;
    return units.find(
      (u) =>
        u.code.toLowerCase() === pendingDeepLink.unit.toLowerCase() ||
        u.id.toLowerCase() === pendingDeepLink.unit.toLowerCase()
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
        let usersList = allAvailableUsers;
        // If not found in current memory, fetch latest fresh users from backend
        let foundUser = usersList.find(
          (u) =>
            (u.username && u.username.toLowerCase() === trimmedUser) ||
            (u.email && u.email.toLowerCase() === trimmedUser) ||
            (u.email && u.email.split('@')[0].toLowerCase() === trimmedUser) ||
            (u.name && u.name.toLowerCase() === trimmedUser) ||
            (u.name && u.name.trim() === rawInput)
        );

        if (!foundUser) {
          try {
            const freshUsers = await api.getUsers();
            if (freshUsers && Array.isArray(freshUsers) && freshUsers.length > 0) {
              setInternalUsers(freshUsers);
              usersList = freshUsers;
              foundUser = usersList.find(
                (u) =>
                  (u.username && u.username.toLowerCase() === trimmedUser) ||
                  (u.email && u.email.toLowerCase() === trimmedUser) ||
                  (u.email && u.email.split('@')[0].toLowerCase() === trimmedUser) ||
                  (u.name && u.name.toLowerCase() === trimmedUser) ||
                  (u.name && u.name.trim() === rawInput)
              );
            }
          } catch (fetchErr) {
            console.warn('Live users check note:', fetchErr);
          }
        }

        if (!foundUser) {
          setErrorMessage(`اسم المستخدم أو الحساب (${rawInput}) غير مسجل في النظام. يرجى التأكد من صحة البيانات.`);
          setIsLoading(false);
          return;
        }

        // Check password: Must strictly match the user's password in the system
        const expectedPass = foundUser.password || 'admin123';
        const isPasswordValid = trimmedPass === expectedPass;

        if (!isPasswordValid) {
          setErrorMessage('كلمة المرور المدخلة غير صحيحة، يرجى التأكد والمحاولة مجدداً');
          setIsLoading(false);
          return;
        }

        // Check account status
        if (foundUser.status === 'disabled') {
          setErrorMessage(
            'تم إيقاف تنشيط هذا الحساب من قبل إدارة النظام. يرجى التواصل مع المسؤول لإعادة التفعيل.'
          );
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
        onLogin(foundUser);
      } catch (err) {
        setErrorMessage('حدث خطأ أثناء معالجة تسجيل الدخول، يرجى المحاولة ثانية.');
        setIsLoading(false);
      }
    };

    authenticate();
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between relative overflow-x-hidden transition-colors duration-300 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
      dir="rtl"
    >
      {/* Background Graphic Grids & Atmospheric Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div
          className={`absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-25 transition-opacity ${
            isLight ? 'bg-amber-300' : 'bg-amber-500/20'
          }`}
        />
        <div
          className={`absolute bottom-10 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 transition-opacity ${
            isLight ? 'bg-indigo-300' : 'bg-indigo-600/20'
          }`}
        />
        <div
          className={`absolute inset-0 opacity-[0.03] ${
            isLight ? 'bg-grid-slate-900' : 'bg-grid-slate-100'
          }`}
        />
      </div>

      {/* Top Header Bar */}
      <header
        className={`relative z-10 w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b backdrop-blur-md transition-colors ${
          isLight
            ? 'bg-white/85 border-slate-200 shadow-xs'
            : 'bg-slate-900/85 border-slate-800 shadow-md'
        }`}
      >
        {/* Company & Ministry Identity */}
        <div className="flex items-center gap-3">
          {currentBranding.logoUrl ? (
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-center p-1 shadow-inner overflow-hidden shrink-0">
              <img
                src={currentBranding.logoUrl}
                alt={currentBranding.companyName || 'Logo'}
                className="max-w-full max-h-full object-contain"
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-500 font-bold shadow-inner shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`font-black text-sm sm:text-base block tracking-tight ${
                  isLight ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                {currentBranding.companyName || 'شركة نفط الوسط'}
              </span>
              {currentBranding.logoSubtext && (
                <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-bold">
                  {currentBranding.logoSubtext}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] block font-semibold ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {currentBranding.countryName || 'جمهورية العراق'} • {currentBranding.ministryName || 'وزارة النفط العراقية'}
            </span>
          </div>
        </div>

        {/* Day / Night Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          type="button"
          id="login-theme-toggle-button"
          className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title={isLight ? 'التحويل للوضع الليلي' : 'التحويل للوضع النهاري'}
        >
          {isLight ? (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span>الوضع الليلي</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>الوضع النهاري</span>
            </>
          )}
        </button>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 w-full max-w-lg mx-auto my-auto px-4 py-6">
        {/* Deep Link Quick Access & External QR Location Card */}
        {pendingDeepLink && pendingDeepLink.unit && (() => {
          const lat = deepLinkUnitObj?.coordinates?.lat ?? pendingDeepLink.lat ?? 32.6189;
          const lng = deepLinkUnitObj?.coordinates?.lng ?? pendingDeepLink.lng ?? 45.7531;
          const unitName = deepLinkUnitObj?.name ?? pendingDeepLink.name ?? 'منشأة تابعة لشركة نفط الوسط';
          const unitGov = deepLinkUnitObj?.governorate ?? pendingDeepLink.gov ?? 'الموقع الميداني';
          const unitField = deepLinkUnitObj?.field ?? pendingDeepLink.field ?? '';
          const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
          const grade = deepLinkUnitObj?.conditionGrade;

          const handleCopyGps = () => {
            navigator.clipboard.writeText(`${lat}, ${lng}`);
            setCopiedCoords(true);
            setTimeout(() => setCopiedCoords(false), 2500);
          };

          return (
            <div
              className={`mb-5 p-4 sm:p-5 rounded-3xl border shadow-xl animate-fadeIn space-y-3.5 transition-all ${
                isLight
                  ? 'bg-gradient-to-br from-amber-50 via-white to-slate-50 border-amber-300 text-slate-900 shadow-amber-500/10'
                  : 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-amber-500/40 text-white shadow-2xl'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        موقع المنشأة الجغرافي (مسح رمز QR):
                      </span>
                      {grade && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Grade {grade}
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mt-0.5">
                      {unitName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {unitGov} {unitField ? `• ${unitField}` : ''} • الرمز: <span className="font-mono font-bold text-amber-500">{toArabicDigits(pendingDeepLink.unit)}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* GPS Coordinates & Actions */}
              <div className="bg-slate-950/70 dark:bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="text-xs">
                    <span className="text-slate-400">الإحداثيات GPS: </span>
                    <span className="font-mono font-bold text-amber-400">
                      {toArabicDigits(lat.toFixed(5))}°, {toArabicDigits(lng.toFixed(5))}°
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyGps}
                    className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
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
              <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-800 shadow-inner bg-slate-950">
                <iframe
                  title="موقع المنشأة الجغرافي"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008}%2C${lat - 0.006}%2C${lng + 0.008}%2C${lat + 0.006}&layer=mapnik&marker=${lat}%2C${lng}`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                تم مسح رمز الوصول السريع من خارج النظام. يمكنك الانتقال الميداني لموقع المنشأة عبر خرائط Google أعلاه، أو تسجيل الدخول بحسابك بالأسفل لإجراء الكشف الفني وتسجيل الصيانة.
              </div>
            </div>
          );
        })()}

        <div
          className={`border rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md transition-all ${
            isLight
              ? 'bg-white/95 border-slate-200 shadow-slate-300/60'
              : 'bg-slate-900/90 border-slate-800 shadow-black/80'
          }`}
        >
          {/* Card Header & System Branding Title */}
          <div className="text-center space-y-2 mb-6">
            {currentBranding.logoUrl ? (
              <div className="inline-flex w-16 h-16 rounded-2xl bg-slate-900 border border-amber-500/30 p-2 shadow-inner overflow-hidden mb-1 mx-auto items-center justify-center">
                <img
                  src={currentBranding.logoUrl}
                  alt={currentBranding.companyName || 'Logo'}
                  className="max-w-full max-h-full object-contain"
                  loading="eager"
                />
              </div>
            ) : (
              <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 mb-1 shadow-inner">
                <Building2 className="w-8 h-8" />
              </div>
            )}
            <h2
              className={`text-lg sm:text-xl font-black ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              تسجيل الدخول للنظام
            </h2>
            <p
              className={`text-xs max-w-xs mx-auto leading-relaxed ${
                isLight ? 'text-slate-600 font-medium' : 'text-slate-400'
              }`}
            >
              {currentBranding.systemName || 'السجل الرقمي الموحد للأصول الهندسية والإنشائية'}
            </p>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div
              className={`mb-5 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                isLight
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="font-bold leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label
                className={`block text-xs font-bold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                اسم المستخدم / البريد الإلكتروني:
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="مثال: inspector أو admin أو اسمك المسجل"
                  className={`w-full rounded-xl py-2.5 pr-10 pl-3 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-amber-500 border ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder:text-slate-400'
                      : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500/60 placeholder:text-slate-600'
                  }`}
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label
                className={`block text-xs font-bold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                كلمة المرور:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  className={`w-full rounded-xl py-2.5 pr-10 pl-10 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-amber-500 border font-mono ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white placeholder:text-slate-400'
                      : 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500/60 placeholder:text-slate-600'
                  }`}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute left-3 top-2.5 transition p-0.5 cursor-pointer ${
                    isLight
                      ? 'text-slate-400 hover:text-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 mt-4 border ${
                isLight
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400/50 shadow-amber-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-transparent shadow-amber-500/20'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جارٍ التحقق من الحساب...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>دخول النظام</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer Info & Copyright */}
      <footer
        className={`relative z-10 w-full py-4 px-6 text-center text-xs border-t backdrop-blur-sm transition-colors ${
          isLight
            ? 'border-slate-200/80 text-slate-600 bg-white/40'
            : 'border-slate-800/40 text-slate-400 bg-slate-950/40'
        }`}
      >
        <p className="font-semibold text-[11px] tracking-wide">
          {currentBranding.copyrightText || 'جميع الحقوق محفوظة © 2026 - شركة نفط الوسط • وزارة النفط العراقية'}
        </p>
      </footer>
    </div>
  );
};

