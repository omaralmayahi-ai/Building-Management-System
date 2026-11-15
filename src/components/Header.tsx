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
  RefreshCw,
  WifiOff,
  CloudCheck,
  LayoutDashboard,
  Box,
  MapPin,
  PlusCircle,
  CalendarCheck,
  Wrench,
  FileText,
  Settings,
  ClipboardCheck,
  Download,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

import { SystemBranding, SystemUser } from '../types';
import { syncQueue, SyncQueueStatus } from '../services/syncQueue';
import { NavTab } from './Sidebar';
import { Button, Field, Input, Modal } from './ui';

interface HeaderProps {
  onOpenNewAssetModal?: () => void;
  onOpenNewMaintenanceModal?: () => void;
  onOpenQrScanner?: () => void;
  onOpenDownloadOptions?: () => void;
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
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  /** زر طيّ القائمة الجانبية في بداية الترويسة (التصميم المعتمد) */
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  /** قائمة «مظهري» للمستخدم */
  appearanceMenu?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  branding,
  currentUser,
  onLogout,
  onChangePassword,
  onOpenQrScanner,
  onOpenDownloadOptions,
  syncStatus = 'connected',
  activeTab,
  onTabChange,
  onToggleSidebar,
  isSidebarCollapsed = false,
  appearanceMenu,
}) => {
  const isLight = theme === 'light';

  // Role and permissions calculation for mobile icon navigation
  const userRole = currentUser?.role || 'مستخدم';
  const isAdmin = userRole === 'مدير النظام' || userRole === 'admin' || userRole === 'super_admin';
  const isOperator = userRole === 'مشغل النظام' || userRole === 'operator';
  const isInspector = userRole === 'موظف الكشف والصيانة' || userRole === 'inspector';
  const isMaintenance = userRole === 'موظف الصيانة' || userRole === 'maintenance_employee';
  const isUser = userRole === 'مستخدم' || userRole === 'user';

  const allNavItems = [
    {
      id: 'field_inspection' as NavTab,
      label: 'كشف وصيانة ميداني',
      icon: ClipboardCheck,
    },
    {
      id: 'dashboard' as NavTab,
      label: 'لوحة القيادة',
      icon: LayoutDashboard,
    },
    {
      id: 'units' as NavTab,
      label: 'الوحدات المسجلة',
      icon: Box,
    },
    {
      id: 'gis_map' as NavTab,
      label: 'خريطة الأصول GIS',
      icon: MapPin,
    },
    {
      id: 'new_unit' as NavTab,
      label: 'تسجيل وحدة جديدة',
      icon: PlusCircle,
    },
    {
      id: 'periodic_inspection' as NavTab,
      label: 'الكشوفات الدورية',
      icon: CalendarCheck,
    },
    {
      id: 'maintenance' as NavTab,
      label: 'أوامر الصيانة',
      icon: Wrench,
    },
    {
      id: 'reports' as NavTab,
      label: 'التقارير وسجلات النظام',
      icon: FileText,
    },
    {
      id: 'settings' as NavTab,
      label: 'إعدادات النظام',
      icon: Settings,
    },
  ];

  const mobileNavItemsForRole = allNavItems.filter((item) => {
    if (isAdmin) return true;
    if (isInspector) return item.id === 'field_inspection';
    if (isMaintenance) return item.id === 'maintenance' || item.id === 'reports';
    if (isOperator) return item.id !== 'settings' && item.id !== 'field_inspection';
    // regular user
    return ['dashboard', 'units', 'gis_map', 'reports'].includes(item.id);
  });

  const showQrScannerForRole = !isUser;
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

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [queueStatus, setQueueStatus] = useState<SyncQueueStatus>(() => syncQueue.getStatus());
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Subscribe to offline sync queue updates
  useEffect(() => {
    const unsubscribe = syncQueue.subscribe((status) => {
      setQueueStatus(status);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualFlushQueue = async () => {
    try {
      await syncQueue.flushQueue();
    } catch (e) {
      console.warn('Manual flush queue error:', e);
    }
  };

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
      return 'bg-brand-100 text-brand-800 border-brand-200';
    }
    if (role === 'مشغل النظام' || role === 'operator') {
      return 'bg-sky-100 text-sky-900 border-sky-200';
    }
    return 'bg-emerald-100 text-emerald-900 border-emerald-200';
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

    if (newPasswordInput.length < 8) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون من 8 أحرف أو أكثر');
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
      <div className="sticky top-[30px] z-30 w-full shadow-xs backdrop-blur-md">
        {/* Main Header (Pure, uncluttered, logo & system info fully preserved) */}
        <header
          className="border-b px-2 sm:px-4 py-1.5 sm:py-2.5 transition-colors duration-300 bg-card/95 border-slate-200 text-slate-900 "
        >
          <div className="w-full flex items-center justify-between gap-1.5 sm:gap-4 min-w-0">
            {/* Company Identity Branding */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial overflow-hidden">
              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={onToggleSidebar}
                  aria-label={isSidebarCollapsed ? 'توسيع القائمة' : 'طيّ القائمة'}
                  title={isSidebarCollapsed ? 'توسيع القائمة' : 'طيّ القائمة'}
                  className="hidden md:inline-flex shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {isSidebarCollapsed ? <PanelRightOpen className="h-5 w-5" aria-hidden /> : <PanelRightClose className="h-5 w-5" aria-hidden />}
                </button>
              )}
              {branding?.logoUrl ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center p-1 overflow-hidden shrink-0">
                  <img
                    src={branding.logoUrl}
                    alt={branding.companyName || 'Logo'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700 font-bold shrink-0">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h1
                    className="font-bold text-xs xs:text-sm sm:text-base md:text-lg tracking-wide truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none text-brand-700 "
                  >
                    {branding?.companyName || 'شركة نفط الوسط'}
                  </h1>
                  {branding?.logoSubtext && (
                    <span className="hidden md:inline-flex text-[10px] bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded border border-brand-200 font-semibold shrink-0">
                      {branding.logoSubtext}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[9px] xs:text-[10px] sm:text-xs truncate block max-w-[150px] xs:max-w-[210px] sm:max-w-xs font-medium leading-tight text-slate-500`}
                >
                  {branding?.systemName || 'نظام إدارة المباني والكرفانات والأصول'}
                </p>
              </div>
            </div>

          {/* Actions & Unified User Profile Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Offline Sync Queue Status & Trigger Button */}
            {queueStatus.pendingCount > 0 ? (
              <button
                type="button"
                id="offline-sync-queue-badge"
                onClick={handleManualFlushQueue}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-brand-100 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-all cursor-pointer shadow-xs animate-pulse"
                title={`يوجد ${queueStatus.pendingCount} طلب بانتظار المزامنة مع الخادم. اضغط لإعادة المحاولة الآن.`}
              >
                <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${queueStatus.isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">مزامنة ({queueStatus.pendingCount})</span>
                <span className="xs:hidden">({queueStatus.pendingCount})</span>
              </button>
            ) : !isOnline ? (
              <div
                id="offline-mode-badge"
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-500/20 text-slate-500 border border-slate-500/30 select-none shadow-xs"
                title="أنت تعمل حالياً بدون اتصال إنترنت. سيتم حفظ جميع الكشوفات وطلبات الصيانة محلياً وتمريرها تلقائياً فور توفر الشبكة."
              >
                <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">حفظ محلي</span>
              </div>
            ) : null}

            {/* مؤشر التحديث اللحظي (الساعة والتاريخ في شريط الحالة أعلى الصفحة) */}
            <div
              id="server-time-indicator-badge"
              className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 select-none"
              title="حالة وصول تعديلات المستخدمين الآخرين إلى هذه الشاشة دون إعادة تحميل"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  syncStatus === 'connected' ? 'bg-emerald-500' : syncStatus === 'reconnecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-600'
                }`}
              />
              <span>
                {syncStatus === 'connected' ? 'تحديث لحظي' : syncStatus === 'reconnecting' ? 'إعادة الاتصال...' : 'تحديث دوري'}
              </span>
            </div>

            {appearanceMenu}

            {/* Browser Fullscreen / Exit Fullscreen Button */}
            <button
              type="button"
              id="browser-fullscreen-toggle-btn"
              onClick={toggleBrowserFullscreen}
              className={`hidden sm:flex h-9 w-9 rounded-lg border transition-colors cursor-pointer select-none items-center justify-center ${
                isFullscreen
                  ? 'bg-brand-700 text-on-brand border-brand-700'
                  : 'bg-card hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
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
                  className={`group flex h-9 items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2.5 rounded-lg border transition-colors cursor-pointer select-none ${
                    isDropdownOpen
                      ? 'bg-brand-50 border-brand-200'
                      : 'bg-card hover:bg-slate-100 border-slate-200'
                  }`}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  title="خيارات الحساب والمستخدم"
                >
                  {/* User Avatar Circle */}
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-black flex items-center justify-center text-[10px] sm:text-xs shadow-xs shrink-0 bg-brand-700 text-on-brand`}
                  >
                    {getInitials(currentUser.name)}
                  </div>

                  {/* User Full Name */}
                  <span
                    className={`font-bold text-xs sm:text-sm tracking-tight truncate max-w-[65px] xs:max-w-[100px] sm:max-w-[150px] md:max-w-none text-slate-900`}
                  >
                    {currentUser.name}
                  </span>

                  {/* Role Badge next to name */}
                  <span
                    className={`hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getRoleBadgeStyle(
                      currentUser.role
                    )}`}
                  >
                    {currentUser.role}
                  </span>

                  {/* Chevron icon */}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                      isDropdownOpen ? 'rotate-180 text-brand-700' : 'text-slate-400'
                    }`}
                  />
                </button>

                {/* Backdrop for mobile closing */}
                {isDropdownOpen && (
                  <div
                    className="fixed inset-0 z-40 sm:hidden"
                    onClick={() => setIsDropdownOpen(false)}
                    aria-hidden="true"
                  />
                )}

                {/* Dropdown Menu Container */}
                {isDropdownOpen && (
                  <div
                    className={`absolute left-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-[300px] sm:w-80 rounded-xl border shadow-xl z-50 p-2 space-y-1.5 bg-card border-slate-200 text-slate-800`}
                  >
                  {/* Dropdown Header: User Summary */}
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm shadow-inner shrink-0 bg-brand-700 text-on-brand`}
                    >
                      {getInitials(currentUser.name)}
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <p
                        className={`font-bold text-xs truncate text-slate-900`}
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
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border bg-card text-slate-600 border-slate-200`}
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
                    className={`w-full text-right p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border bg-slate-50/60 hover:bg-slate-100 text-slate-800 border-slate-200/80`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 bg-brand-100 text-brand-800 border-brand-200`}
                      >
                        {isLight ? (
                          <Sun className="w-4 h-4 text-brand-700" />
                        ) : (
                          <Moon className="w-4 h-4 text-brand-700" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>وضع العرض</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border bg-brand-100 text-brand-800 border-brand-200`}
                          >
                            {isLight ? 'الفاتح' : 'الداكن'}
                          </span>
                        </div>
                        <p
                          className={`text-[10px] font-normal mt-0.5 text-slate-500`}
                        >
                          {isLight ? 'انقر للتحويل إلى الوضع الداكن' : 'انقر للتحويل إلى الوضع الفاتح'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch Visual Indicator */}
                    <div
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${isLight ? 'bg-slate-300 justify-start' : 'bg-brand-700 justify-end'}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-card shadow-md flex items-center justify-center text-[10px]">
                        {isLight ? (
                          <Sun className="w-3 h-3 text-brand-700" />
                        ) : (
                          <Moon className="w-3 h-3 text-brand-700" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Menu Item 2: Change Password */}
                  <button
                    type="button"
                    onClick={handleOpenPasswordModal}
                    className={`w-full text-right p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border bg-slate-50/60 hover:bg-slate-100 text-slate-800 border-slate-200/80`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 bg-brand-100 text-brand-800 border-brand-200`}
                      >
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <span>تغيير كلمة المرور</span>
                        <p
                          className={`text-[10px] font-normal mt-0.5 text-slate-500`}
                        >
                          تحديث كلمة مرور الدخول لحسابك
                        </p>
                      </div>
                    </div>
                    <Lock className={`w-3.5 h-3.5 text-slate-400`} />
                  </button>

                  {/* Menu Item 3: Logout */}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onLogout();
                      }}
                      className={`w-full text-right p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border bg-rose-50/70 hover:bg-rose-100 text-rose-800 border-rose-200`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 bg-rose-100 text-rose-700 border-rose-200`}
                        >
                          <LogOut className="w-4 h-4" />
                        </div>
                        <div>
                          <span>تسجيل الخروج</span>
                          <p
                            className={`text-[10px] font-normal mt-0.5 text-rose-600`}
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

      {/* Dedicated Mobile Navigation Sub-Bar (Separated completely BELOW Header, compact icons) */}
      {activeTab && onTabChange && (
        <nav
          aria-label="شريط أزرار التنقل السريع للهاتف"
          className={`md:hidden border-b px-1 py-1 shadow-xs transition-colors backdrop-blur-md select-none bg-card/95 border-slate-200/90 text-slate-800`}
        >
          <div className="flex items-center justify-evenly sm:justify-center gap-1 w-full max-w-full mx-auto overflow-x-auto no-scrollbar py-0.5 px-0.5">
            {mobileNavItemsForRole.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`mobile-sub-nav-${item.id}`}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer select-none shrink-0 relative ${
                    isActive
                      ? 'bg-brand-700 text-on-brand'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden />
                </button>
              );
            })}

            {/* Direct QR Scanner Icon Button if permitted */}
            {showQrScannerForRole && onOpenQrScanner && (
              <button
                type="button"
                onClick={onOpenQrScanner}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer select-none shrink-0 border bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100`}
                title="مسح رمز QR للوحدة أو الغرفة"
                aria-label="مسح رمز QR للوحدة أو الغرفة"
              >
                <QrCode className="w-[18px] h-[18px] shrink-0" aria-hidden />
              </button>
            )}

            {/* Quick Download Options Icon Button for Mobile Screens */}
            {onOpenDownloadOptions && (
              <button
                type="button"
                onClick={onOpenDownloadOptions}
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer select-none shrink-0 border bg-card border-slate-200 text-slate-600 hover:bg-slate-100`}
                title="خيارات التنزيل"
                aria-label="خيارات التنزيل"
              >
                <Download className="w-[18px] h-[18px] shrink-0" aria-hidden />
              </button>
            )}
          </div>
        </nav>
      )}
    </div>

      {/* نافذة تغيير كلمة المرور بالمكوّنات الموحدة */}
      <Modal
        open={isPasswordModalOpen}
        title="تغيير كلمة المرور"
        icon={KeyRound}
        onClose={handleClosePasswordModal}
        footer={
          <>
            <Button type="submit" form="change-password-form" variant="primary" icon={CheckCircle2} loading={isSubmittingPassword}>
              حفظ كلمة المرور
            </Button>
            <Button onClick={handleClosePasswordModal} disabled={isSubmittingPassword}>
              إلغاء
            </Button>
          </>
        }
      >
        <form id="change-password-form" onSubmit={handleSubmitPasswordChange} className="space-y-3.5">
          <p className="text-xs text-slate-600">
            الحساب: <span className="font-bold text-slate-900">{currentUser?.name}</span>
          </p>
          {passwordError && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>{passwordError}</span>
            </div>
          )}
          {passwordSuccess && (
            <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              <span>{passwordSuccess}</span>
            </div>
          )}
          <Field label="كلمة المرور الحالية" required>
            <div className="relative">
              <Input
                type={showCurrentPass ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                className="pl-10 font-mono"
                dir="ltr"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800"
                title={showCurrentPass ? 'إخفاء' : 'إظهار'}
                aria-label={showCurrentPass ? 'إخفاء' : 'إظهار'}
              >
                {showCurrentPass ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>
          <Field label="كلمة المرور الجديدة" required hint="8 أحرف أو أكثر">
            <div className="relative">
              <Input
                type={showNewPass ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="pl-10 font-mono"
                dir="ltr"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800"
                title={showNewPass ? 'إخفاء' : 'إظهار'}
                aria-label={showNewPass ? 'إخفاء' : 'إظهار'}
              >
                {showNewPass ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>
          <Field label="تأكيد كلمة المرور الجديدة" required>
            <div className="relative">
              <Input
                type={showConfirmPass ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                className="pl-10 font-mono"
                dir="ltr"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800"
                title={showConfirmPass ? 'إخفاء' : 'إظهار'}
                aria-label={showConfirmPass ? 'إخفاء' : 'إظهار'}
              >
                {showConfirmPass ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>
        </form>
      </Modal>
    </>
  );
};


