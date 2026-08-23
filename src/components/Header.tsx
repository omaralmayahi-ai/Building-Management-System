import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  UserCheck,
  QrCode,
  Clock,
  Maximize,
  Minimize,
} from 'lucide-react';

import { SystemBranding, SystemUser } from '../types';
import { getServerDateFormatted, getServerTimeFormatted } from '../services/serverTime';

interface HeaderProps {
  onOpenNewAssetModal?: () => void;
  onOpenNewMaintenanceModal?: () => void;
  onOpenQrScanner?: () => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  branding?: SystemBranding;
  currentUser?: SystemUser | null;
  onLogout?: () => void;
  onChangePassword?: (
    currentPass: string,
    newPass: string
  ) => { success: boolean; message: string } | Promise<{ success: boolean; message: string }>;
  syncStatus?: 'connected' | 'reconnecting' | 'polling';
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  branding,
  currentUser,
  onLogout,
  onChangePassword,
  onOpenQrScanner,
  syncStatus = 'connected',
}) => {
  const isLight = theme === 'light';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Change Password Form State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const [serverDateStr, setServerDateStr] = useState<string>(() => getServerDateFormatted());
  const [serverTimeStr, setServerTimeStr] = useState<string>(() => getServerTimeFormatted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync fullscreen status with browser fullscreenchange events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle not permitted or failed:', err);
    }
  };

  // Update synchronized server time display every second
  useEffect(() => {
    const updateTime = () => {
      setServerDateStr(getServerDateFormatted());
      setServerTimeStr(getServerTimeFormatted());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        if (isPasswordModalOpen) {
          handleClosePasswordModal();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPasswordModalOpen]);

  // Extract initials
  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const parts = name.replace(/^م\.\s*/, '').trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return name.slice(0, 2);
  };

  const getRoleBadgeStyle = (role?: string) => {
    if (role === 'مدير النظام' || role === 'admin') {
      return isLight
        ? 'bg-amber-100 text-amber-900 border-amber-300'
        : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    if (role === 'مشغل النظام' || role === 'operator') {
      return isLight
        ? 'bg-sky-100 text-sky-900 border-sky-300'
        : 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    }
    return isLight
      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  };

  const handleOpenPasswordModal = () => {
    setIsDropdownOpen(false);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPasswordInput.trim()) {
      setPasswordError('يرجى إدخال كلمة المرور الحالية');
      return;
    }

    if (!newPasswordInput) {
      setPasswordError('يرجى إدخال كلمة المرور الجديدة');
      return;
    }

    if (newPasswordInput.length < 3) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون من 3 خانات أو أكثر');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      if (onChangePassword) {
        const res = await onChangePassword(currentPasswordInput, newPasswordInput);
        if (res.success) {
          setPasswordSuccess(res.message || 'تم تحديث كلمة المرور بنجاح!');
          setTimeout(() => {
            handleClosePasswordModal();
          }, 1400);
        } else {
          setPasswordError(res.message || 'فشل تحديث كلمة المرور');
        }
      } else {
        // Fallback if prop not provided
        setPasswordSuccess('تم تحديث كلمة المرور بنجاح!');
        setTimeout(() => {
          handleClosePasswordModal();
        }, 1200);
      }
    } catch {
      setPasswordError('حدث خطأ غير متوقع أثناء تحديث كلمة المرور');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-30 border-b px-4 py-2.5 shadow-md backdrop-blur-md transition-colors duration-300 ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50'
            : 'bg-slate-900/95 border-slate-800 text-white shadow-slate-950/50'
        }`}
      >
        <div className="w-full px-2 sm:px-4 flex items-center justify-between gap-4">
          {/* Company Identity Branding */}
          <div className="flex items-center gap-3 shrink-0">
            {branding?.logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-center p-1 shadow-inner overflow-hidden shrink-0">
                <img
                  src={branding.logoUrl}
                  alt={branding.companyName || 'Logo'}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shadow-inner shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`font-bold text-base md:text-lg tracking-wide ${
                    isLight ? 'text-amber-600' : 'text-amber-400'
                  }`}
                >
                  {branding?.companyName || 'شركة نفط الوسط'}
                </h1>
                {branding?.logoSubtext && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-semibold">
                    {branding.logoSubtext}
                  </span>
                )}
              </div>
              <p
                className={`text-xs max-w-xs truncate ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {branding?.systemName || 'نظام إدارة المباني والكرفانات والأصول'}
              </p>
            </div>
          </div>

          {/* Actions & Unified User Profile Trigger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Unified Date & Time Badge + Live Sync Indicator Dot */}
            <div
              id="server-time-indicator-badge"
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-mono font-semibold select-none shadow-xs transition-all ${
                isLight
                  ? 'bg-amber-50/90 text-amber-950 border-amber-200'
                  : 'bg-slate-800/90 text-amber-300 border-slate-700'
              }`}
              title={`الوقت والتاريخ المعتمد (YYYY-MM-DD) • حالة المزامنة: ${
                syncStatus === 'connected'
                  ? 'متصلة ومزامنة فورية نشطة'
                  : syncStatus === 'reconnecting'
                  ? 'جاري إعادة الاتصال...'
                  : 'غير متصل أو مزامنة دورية'
              }`}
            >
              {/* Pulsing Sync Status Dot */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-400'
                      : syncStatus === 'reconnecting'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-500 shadow-xs shadow-emerald-500/60'
                      : syncStatus === 'reconnecting'
                      ? 'bg-amber-500 shadow-xs shadow-amber-500/60'
                      : 'bg-rose-600 shadow-xs shadow-rose-600/60'
                  }`}
                />
              </span>

              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-slate-700 dark:text-slate-200">{serverDateStr}</span>
              <span className="opacity-40 text-[10px]">|</span>
              <span className="text-amber-700 dark:text-amber-400 font-bold">{serverTimeStr}</span>
            </div>

            {/* Browser Fullscreen / Exit Fullscreen Button */}
            <button
              type="button"
              id="browser-fullscreen-toggle-btn"
              onClick={toggleBrowserFullscreen}
              className={`p-2 rounded-xl border transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center ${
                isFullscreen
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400/30'
                  : isLight
                  ? 'bg-slate-50/90 hover:bg-amber-50 text-slate-700 hover:text-amber-600 border-slate-200 hover:border-amber-300 shadow-2xs'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border-slate-700 hover:border-slate-600 shadow-sm'
              }`}
              title={isFullscreen ? 'العودة إلى وضع المتصفح الطبيعي' : 'تشغيل النظام بوضع ملء الشاشة الكامل'}
              aria-label={isFullscreen ? 'العودة إلى وضع المتصفح' : 'ملء الشاشة'}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>

            {/* Unified User Profile Trigger & Dropdown Menu */}
            {currentUser && (
              <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                id="user-profile-menu-button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isDropdownOpen
                    ? isLight
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                      : 'bg-slate-800 border-amber-500/50 ring-2 ring-amber-500/20 shadow-md'
                    : isLight
                    ? 'bg-slate-50/90 hover:bg-slate-100 border-slate-200 hover:border-slate-300 shadow-2xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
                }`}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                title="خيارات الحساب والمستخدم"
              >
                {/* User Full Name */}
                <span
                  className={`font-bold text-xs sm:text-sm tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-slate-100'
                  }`}
                >
                  {currentUser.name}
                </span>

                {/* Role Badge next to name */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getRoleBadgeStyle(
                    currentUser.role
                  )}`}
                >
                  {currentUser.role}
                </span>

                {/* Chevron icon */}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                    isDropdownOpen ? 'rotate-180 text-amber-500' : isLight ? 'text-slate-400' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Dropdown Menu Container */}
              {isDropdownOpen && (
                <div
                  className={`absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150 ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-800 shadow-slate-400/30 ring-1 ring-slate-900/5'
                      : 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/80 ring-1 ring-white/5'
                  }`}
                >
                  {/* Dropdown Header: User Summary */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm shadow-inner shrink-0 ${
                        isLight
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white'
                          : 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950'
                      }`}
                    >
                      {getInitials(currentUser.name)}
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p
                        className={`font-bold text-xs truncate ${
                          isLight ? 'text-slate-900' : 'text-slate-100'
                        }`}
                      >
                        {currentUser.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${getRoleBadgeStyle(
                            currentUser.role
                          )}`}
                        >
                          {currentUser.role}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                            isLight
                              ? 'bg-white text-slate-600 border-slate-200'
                              : 'bg-slate-900 text-amber-400 border-slate-800'
                          }`}
                        >
                          @{currentUser.username || currentUser.email?.split('@')[0] || 'user'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Item 1: Theme Switcher (Day / Night Mode) */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleTheme();
                    }}
                    className={`w-full text-right p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                      isLight
                        ? 'bg-slate-50/60 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                          isLight
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        }`}
                      >
                        {isLight ? (
                          <Sun className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Moon className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>وضع العرض</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                              isLight
                                ? 'bg-amber-100 text-amber-900 border-amber-200'
                                : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                            }`}
                          >
                            {isLight ? 'النهاري' : 'الليلي'}
                          </span>
                        </div>
                        <p
                          className={`text-[10px] font-normal mt-0.5 ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          {isLight ? 'انقر للتحويل إلى الوضع الليلي' : 'انقر للتحويل إلى الوضع النهاري'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch Visual Indicator */}
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
                        isLight ? 'bg-amber-500 justify-start' : 'bg-indigo-600 justify-end'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-[10px]">
                        {isLight ? (
                          <Sun className="w-3 h-3 text-amber-600" />
                        ) : (
                          <Moon className="w-3 h-3 text-indigo-600" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Menu Item 2: Change Password */}
                  <button
                    type="button"
                    onClick={handleOpenPasswordModal}
                    className={`w-full text-right p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                      isLight
                        ? 'bg-slate-50/60 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                        : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                          isLight
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <span>تغيير كلمة المرور</span>
                        <p
                          className={`text-[10px] font-normal mt-0.5 ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          تحديث كلمة مرور الدخول لحسابك
                        </p>
                      </div>
                    </div>
                    <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                  </button>

                  {/* Menu Item 3: Logout */}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogout();
                      }}
                      className={`w-full text-right p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border ${
                        isLight
                          ? 'bg-rose-50/70 hover:bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                            isLight
                              ? 'bg-rose-100 text-rose-700 border-rose-300'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}
                        >
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div>
                          <span>تسجيل الخروج</span>
                          <p
                            className={`text-[10px] font-normal mt-0.5 ${
                              isLight ? 'text-rose-600' : 'text-rose-400'
                            }`}
                          >
                            إنهاء الجلسة والعودة لشاشة الدخول
                          </p>
                        </div>
                      </div>
                      <LogOut className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>

      {/* ==================== Change Password Modal ==================== */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border transition-all ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
                : 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/80'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                    isLight
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  <KeyRound className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    تغيير كلمة المرور
                  </h3>
                  <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    لحساب المستخدم: <span className="font-bold">{currentUser?.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePasswordModal}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isLight
                    ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error / Success Alerts */}
            {passwordError && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  isLight
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {/* Change Password Form */}
            <form onSubmit={handleSubmitPasswordChange} className="space-y-3.5 text-xs">
              {/* Current Password Field */}
              <div className="space-y-1.5">
                <label
                  className={`block text-[11px] font-bold ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  كلمة المرور الحالية <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    className={`w-full rounded-xl px-3 py-2 pl-9 text-xs font-mono transition border focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                        : 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition ${
                      isLight
                        ? 'text-slate-400 hover:text-emerald-600'
                        : 'text-slate-500 hover:text-emerald-400'
                    }`}
                    title={showCurrentPass ? 'إخفاء' : 'إظهار'}
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div className="space-y-1.5">
                <label
                  className={`block text-[11px] font-bold ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  كلمة المرور الجديدة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة (3 خانات فأكثر)"
                    className={`w-full rounded-xl px-3 py-2 pl-9 text-xs font-mono transition border focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                        : 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition ${
                      isLight
                        ? 'text-slate-400 hover:text-emerald-600'
                        : 'text-slate-500 hover:text-emerald-400'
                    }`}
                    title={showNewPass ? 'إخفاء' : 'إظهار'}
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              <div className="space-y-1.5">
                <label
                  className={`block text-[11px] font-bold ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  تأكيد كلمة المرور الجديدة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور الجديدة للتأكيد"
                    className={`w-full rounded-xl px-3 py-2 pl-9 text-xs font-mono transition border focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                        : 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition ${
                      isLight
                        ? 'text-slate-400 hover:text-emerald-600'
                        : 'text-slate-500 hover:text-emerald-400'
                    }`}
                    title={showConfirmPass ? 'إخفاء' : 'إظهار'}
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div
                className={`flex items-center justify-end gap-2.5 pt-3 border-t ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={handleClosePasswordModal}
                  disabled={isSubmittingPassword}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className={`px-5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer ${
                    isLight
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingPassword ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};


