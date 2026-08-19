import React, { useState } from 'react';
import {
  LayoutDashboard,
  Box,
  PlusCircle,
  MapPin,
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
} from 'lucide-react';

import { SystemBranding } from '../types';
import { toArabicDigits } from '../utils/arabicUtils';

export type NavTab =
  | 'dashboard'
  | 'units'
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
  theme?: 'dark' | 'light';
  currentUserRole?: string;
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
  theme = 'dark',
  currentUserRole = 'مدير النظام',
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
      label: 'كشف وصيانة ميدانية',
      icon: ClipboardCheck,
      badge: 'ميداني',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      roles: ['موظف الكشف والصيانة'],
    },
    {
      id: 'dashboard' as NavTab,
      label: 'لوحة القيادة',
      icon: LayoutDashboard,
      badge: null,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'units' as NavTab,
      label: 'الوحدات و 3D',
      icon: Box,
      badge: `${toArabicDigits(unitsCount)} أصل`,
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'new_unit' as NavTab,
      label: 'تسجيل وحدة جديدة',
      icon: PlusCircle,
      badge: 'جديد',
      roles: ['مدير النظام', 'مشغل النظام'],
    },
    {
      id: 'periodic_inspection' as NavTab,
      label: 'سجل الكشوفات الدورية',
      icon: CalendarCheck,
      badge: 'مجدول',
      roles: ['مدير النظام', 'مشغل النظام'],
    },
    {
      id: 'maintenance' as NavTab,
      label: 'طلبات الصيانة',
      icon: Wrench,
      badge: `${toArabicDigits(maintenanceCount)} طلب`,
      badgeColor: maintenanceCount > 0 ? 'bg-red-500 text-white' : undefined,
      roles: ['مدير النظام', 'مشغل النظام'],
    },
    {
      id: 'reports' as NavTab,
      label: 'التقارير',
      icon: FileText,
      badge: 'تقرير',
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      roles: ['مدير النظام', 'مشغل النظام', 'مستخدم'],
    },
    {
      id: 'settings' as NavTab,
      label: 'إعدادات النظام',
      icon: Settings,
      badge: null,
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
    // If operator, show all except settings & field_inspection
    if (currentUserRole === 'مشغل النظام' || currentUserRole === 'operator') {
      return item.id !== 'settings' && item.id !== 'field_inspection';
    }
    // If user, only dashboard, units, reports
    return item.roles.includes('مستخدم') && item.id !== 'field_inspection';
  });

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } ${
        theme === 'light'
          ? 'bg-white border-slate-200 text-slate-700 shadow-sm'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      } border-l shrink-0 hidden md:flex flex-col justify-between p-2.5 select-none sticky top-[61px] self-start h-[calc(100vh-61px)] overflow-y-auto overflow-x-hidden transition-all duration-300 z-20 [&::-webkit-scrollbar:horizontal]:hidden`}
    >
      {/* Navigation Links */}
      <div className="space-y-1">
        {/* Sidebar Header & Toggle Button */}
        <div
          className={`flex items-center justify-between px-2 py-1.5 mb-1 border-b pb-2 ${
            theme === 'light' ? 'border-slate-200' : 'border-slate-800/80'
          }`}
        >
          {!isCollapsed && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              القائمة الرئيسية
            </span>
          )}
          <button
            onClick={handleToggle}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-100 hover:bg-amber-500/10 hover:text-amber-600 text-slate-600 border-slate-200 hover:border-amber-400/40'
                : 'bg-slate-800/80 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 border-slate-700/60'
            } ${isCollapsed ? 'mx-auto' : ''}`}
            title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 transform rotate-180" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-0 overflow-hidden' : 'justify-between px-3'
              } py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer relative group ${
                isActive
                  ? theme === 'light'
                    ? 'bg-amber-500/15 text-amber-800 border border-amber-500/40 shadow-sm font-bold'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 max-w-full overflow-hidden">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? theme === 'light'
                        ? 'text-amber-600'
                        : 'text-amber-400'
                      : theme === 'light'
                      ? 'text-slate-500'
                      : 'text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                    item.badgeColor
                      ? item.badgeColor
                      : isActive
                      ? 'bg-amber-500 text-slate-950'
                      : theme === 'light'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {/* Tooltip on Collapsed Mode */}
              {isCollapsed && (
                <div
                  className={`fixed right-16 mr-2 px-2.5 py-1 text-xs rounded-md border shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity ${
                    theme === 'light'
                      ? 'bg-slate-900 text-white border-slate-700'
                      : 'bg-slate-950 text-white border-slate-700'
                  }`}
                >
                  {item.label}
                  {item.badge && <span className="mr-1.5 text-[10px] text-amber-400">({item.badge})</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box (Center-Aligned Copyright) */}
      <div
        className={`mt-4 p-2.5 rounded-xl border text-xs transition-all overflow-hidden flex flex-col items-center justify-center text-center ${
          theme === 'light'
            ? 'bg-slate-50 border-slate-200 text-slate-600'
            : 'bg-slate-950/80 border-slate-800 text-slate-400'
        } ${isCollapsed ? 'p-1.5' : ''}`}
        title={isCollapsed ? branding?.copyrightText || 'جميع الحقوق محفوظة © 2026' : undefined}
      >
        <div className="flex flex-col items-center justify-center text-center gap-1.5 w-full">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="w-4 h-4 object-contain rounded shrink-0 mx-auto" />
          ) : (
            <ShieldCheck className={`w-4 h-4 shrink-0 mx-auto ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
          )}
          {!isCollapsed && (
            <p
              className={`text-[11px] leading-relaxed font-semibold text-center w-full ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {branding?.copyrightText || 'جميع الحقوق محفوظة © 2026 - شركة نفط الوسط • وزارة النفط العراقية'}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

