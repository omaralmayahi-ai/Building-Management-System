import React, { useState } from 'react';
import {
  LayoutDashboard,
  Box,
  PlusCircle,
  MapPin,
  Map as MapIcon,
  Users,
  CalendarCheck,
  Wrench,
  FileText,
  Settings,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardCheck,
  QrCode,
  X,
  Download,
} from 'lucide-react';

import { SystemBranding } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';

export type NavTab =
  | 'dashboard'
  | 'units'
  | 'gis_map'
  | 'new_unit'
  | 'periodic_inspection'
  | 'maintenance'
  | 'reports'
  | 'settings'
  | 'field_inspection';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  branding?: SystemBranding;
  unitsCount?: number;
  occupancyPercentage?: string;
  maintenanceCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenQrScanner?: () => void;
  onOpenDownloadOptions?: () => void;
  theme?: 'dark' | 'light';
  /** نمط القائمة: بلون الثيم (الافتراضي) أو فاتحة */
  sidebarStyle?: 'primary' | 'light';
  currentUserRole?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  branding,
  unitsCount = 0,
  occupancyPercentage = '0%',
  maintenanceCount = 0,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
  onOpenQrScanner,
  onOpenDownloadOptions,
  theme = 'dark',
  sidebarStyle = 'primary',
  currentUserRole = 'مدير النظام',
  isMobileOpen = false,
  onMobileClose,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const allMenuItems = [
    {
      id: 'field_inspection' as NavTab,
      label: 'كشف وصيانة',
      icon: ClipboardCheck,
      roles: ['موظف الكشف والصيانة'],
    },
    {
      id: 'dashboard' as NavTab,
      label: 'لوحة القيادة',
      icon: LayoutDashboard,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'units' as NavTab,
      label: 'الوحدات المسجلة',
      icon: Box,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'gis_map' as NavTab,
      label: 'خريطة الأصول GIS',
      icon: MapIcon,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'new_unit' as NavTab,
      label: 'تسجيل وحدة',
      icon: PlusCircle,
      roles: ['مدير النظام', 'مشغل النظام'],
    },
    {
      id: 'periodic_inspection' as NavTab,
      label: 'الكشوفات الدورية',
      icon: CalendarCheck,
      roles: ['مدير النظام', 'مشغل النظام'],
    },
    {
      id: 'maintenance' as NavTab,
      label: 'الصيانة',
      icon: Wrench,
      roles: ['مدير النظام', 'مشغل النظام', 'موظف الصيانة'],
    },
    {
      id: 'reports' as NavTab,
      label: 'التقارير',
      icon: FileText,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم', 'موظف الصيانة'],
    },
    {
      id: 'settings' as NavTab,
      label: 'إعدادات النظام',
      icon: Settings,
      roles: ['مدير النظام'],
    },
  ];

  const menuItems = allMenuItems.filter((item) => {
    // If admin, show all
    if (currentUserRole === 'مدير النظام' || currentUserRole === 'admin') return true;
    // If field inspector, show only field_inspection
    if (currentUserRole === 'موظف الكشف والصيانة' || currentUserRole === 'inspector') {
      return ['field_inspection'].includes(item.id);
    }
    // If maintenance employee, show ONLY maintenance and reports
    if (currentUserRole === 'موظف الصيانة' || currentUserRole === 'maintenance_employee') {
      return ['maintenance', 'reports'].includes(item.id);
    }
    // If operator, show all except settings & field_inspection
    if (currentUserRole === 'مشغل النظام' || currentUserRole === 'operator') {
      return item.id !== 'settings' && item.id !== 'field_inspection';
    }
    // If user, only dashboard, units, reports
    return item.roles.includes('مستخدم') && item.id !== 'field_inspection';
  });

  const isUserRoleForbiddenFromQr =
    currentUserRole === 'مستخدم' ||
    currentUserRole === 'user' ||
    currentUserRole === 'موظف الصيانة' ||
    currentUserRole === 'maintenance_employee';

  const showQrScannerInSidebar = Boolean(onOpenQrScanner && !isUserRoleForbiddenFromQr);

  // التصميم المعتمد: قائمة يمنى بلون الثيم (أو فاتحة)، قابلة للطي إلى أيقونات
  const light = sidebarStyle === 'light';
  const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

  const itemClass = (active: boolean) =>
    cx(
      'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer',
      isCollapsed && 'justify-center px-0',
      active
        ? light
          ? 'bg-brand-100 text-brand-800 font-bold dark:text-white'
          : 'bg-white/15 text-white font-bold ring-1 ring-white/20'
        : light
        ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
        : 'text-white/75 hover:bg-white/10 hover:text-white'
    );
  const mutedText = light ? 'text-slate-500 dark:text-slate-400' : 'text-white/60';
  const divider = light ? 'border-slate-200 dark:border-white/10' : 'border-white/10';

  return (
    <aside
      className={cx(
        isCollapsed ? 'w-[76px]' : 'w-64',
        'ds-off bg-sidebar shrink-0 hidden md:flex flex-col select-none sticky top-[91px] self-start h-[calc(100vh-91px)] overflow-y-auto overflow-x-hidden transition-[width] duration-200 z-20 print:hidden rounded-b-xl',
        light ? 'border-l border-slate-200 text-slate-700 dark:border-white/10 dark:text-slate-200' : 'text-white'
      )}
    >
      {/* رأس القائمة: الشعار واسم النظام وزر الطي */}
      <div className={cx('flex items-center gap-3 border-b px-3 py-3', divider, isCollapsed && 'flex-col gap-2 px-2')}>
        <span
          className={cx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden',
            light ? 'bg-brand-700 text-on-brand' : 'bg-white/12 text-white ring-1 ring-white/15'
          )}
        >
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <ShieldCheck className="h-5 w-5" aria-hidden />
          )}
        </span>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{branding?.companyName || 'شركة نفط الوسط'}</div>
            <div className={cx('truncate text-[11px]', mutedText)}>القائمة الرئيسية</div>
          </div>
        )}
      </div>

      {/* روابط التنقل */}
      <nav className="flex-1 space-y-1 px-2.5 py-3" aria-label="القائمة الرئيسية">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={itemClass(isActive)}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {!isCollapsed && <span className="flex-1 truncate text-start">{item.label}</span>}
            </button>
          );
        })}

        {onOpenDownloadOptions && (
          <>
            <div className={cx('mx-1 my-2 border-t', divider)} />
            <button
              type="button"
              onClick={onOpenDownloadOptions}
              title={isCollapsed ? 'خيارات التنزيل' : undefined}
              className={itemClass(false)}
            >
              <Download className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {!isCollapsed && <span className="flex-1 truncate text-start">خيارات التنزيل</span>}
            </button>
          </>
        )}
      </nav>

      {/* مسح رمز QR */}
      {showQrScannerInSidebar && (
        <div className="px-2.5 pb-2">
          <button
            type="button"
            onClick={onOpenQrScanner}
            title="مسح رمز الاستجابة السريعة QR للوحدة (الموقع / الكشف / الصيانة)"
            className={cx(
              'flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-bold transition-colors cursor-pointer',
              light
                ? 'bg-brand-700 text-on-brand hover:bg-brand-800'
                : 'bg-white/12 text-white ring-1 ring-white/20 hover:bg-white/20'
            )}
          >
            <QrCode className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {!isCollapsed && <span>مسح رمز QR للوحدة</span>}
          </button>
        </div>
      )}

      {/* حقوق الملكية */}
      {!isCollapsed && (
        <div className={cx('border-t px-3 py-3', divider)}>
          <p className={cx('text-center text-[11px] leading-relaxed', mutedText)}>
            {branding?.copyrightText || 'جميع الحقوق محفوظة © 2026 - شركة نفط الوسط • وزارة النفط العراقية'}
          </p>
        </div>
      )}
    </aside>
  );
};
