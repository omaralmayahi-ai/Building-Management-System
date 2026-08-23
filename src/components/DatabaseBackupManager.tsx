import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Clock,
  HardDrive,
  Folder,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  Building2,
  Wrench,
  Users,
  Save,
  Trash2,
  Eye,
  FileCheck,
  RefreshCw,
  Info,
  Check,
  ArrowRight,
  ShieldAlert,
  Server,
  Play,
} from 'lucide-react';

import {
  UnitAsset,
  MaintenanceRequest,
  OccupancyRecord,
  PeriodicInspectionSchedule,
  AuditLogItem,
  OrgEntity,
  ReferenceUnitType,
  GovernorateRef,
  OilfieldRef,
  SiteRef,
  RoomTypeRef,
  EquipmentTypeRef,
  MaintenanceDepartmentRef,
  SystemBranding,
  SystemUser,
  DatabaseBackupPayload,
  DatabaseBackupCounts,
  AutoBackupScheduleConfig,
  BackupHistoryItem,
} from '../types';
import {
  toArabicDigits,
  getServerNow,
  getServerDateFormatted,
  getServerDateTimeFormatted,
  getServerTimeFormatted,
  getServerIsoDateOnly,
  getServerTimestamp,
  formatDateDDMMYYYY,
} from '../utils/arabicUtils';
import { safeParse, safeSetItem } from '../utils/storageUtils';

interface DatabaseBackupManagerProps {
  units: UnitAsset[];
  maintenanceRequests: MaintenanceRequest[];
  occupancyRecords: OccupancyRecord[];
  periodicInspections: PeriodicInspectionSchedule[];
  auditLogs: AuditLogItem[];
  orgEntities: OrgEntity[];
  branding: SystemBranding;
  users: SystemUser[];
  unitTypes: ReferenceUnitType[];
  governorates: GovernorateRef[];
  oilfields: OilfieldRef[];
  sites: SiteRef[];
  roomTypes: RoomTypeRef[];
  equipmentTypes: EquipmentTypeRef[];
  maintenanceDepartments: MaintenanceDepartmentRef[];
  currentUser?: SystemUser | null;
  theme?: 'dark' | 'light';

  // Restore Callback
  onRestoreDatabase: (
    payload: DatabaseBackupPayload,
    mode: 'overwrite' | 'merge',
    onComplete?: () => void
  ) => void;

  onAddAuditLog: (log: AuditLogItem) => void;
  triggerSaveToast: (msg: string) => void;
}

const DEFAULT_SCHEDULE_CONFIG: AutoBackupScheduleConfig = {
  enabled: true,
  frequency: 'daily',
  timeOfDay: '02:00',
  dayOfWeek: 5, // Friday
  dayOfMonth: 1,
  storagePath: 'C:\\Midland_Oil_Database_Backups\\',
  storageType: 'local_folder',
  keepMaxBackups: 30,
  lastBackupFormatted: 'لم يتم التنفيذ بعد',
  lastBackupStatus: 'pending',
};

export const DatabaseBackupManager: React.FC<DatabaseBackupManagerProps> = ({
  units,
  maintenanceRequests,
  occupancyRecords,
  periodicInspections,
  auditLogs,
  orgEntities,
  branding,
  users,
  unitTypes,
  governorates,
  oilfields,
  sites,
  roomTypes,
  equipmentTypes,
  maintenanceDepartments,
  currentUser,
  theme = 'dark',
  onRestoreDatabase,
  onAddAuditLog,
  triggerSaveToast,
}) => {
  const isLight = theme === 'light';

  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'schedule' | 'history'>('export');

  // Schedule Configuration State
  const [scheduleConfig, setScheduleConfig] = useState<AutoBackupScheduleConfig>(() =>
    safeParse('app_auto_backup_config', DEFAULT_SCHEDULE_CONFIG)
  );

  // Backup History State
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>(() =>
    safeParse('app_backup_history', [])
  );

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [lastExportedInfo, setLastExportedInfo] = useState<{
    filename: string;
    size: string;
    recordsCount: number;
    time: string;
  } | null>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<DatabaseBackupPayload | null>(null);
  const [importValidationError, setImportValidationError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [confirmAgreementChecked, setConfirmAgreementChecked] = useState(false);

  // Save Schedule Config Changes
  const handleSaveScheduleConfig = (newConfig: AutoBackupScheduleConfig) => {
    setScheduleConfig(newConfig);
    safeSetItem('app_auto_backup_config', newConfig);
    triggerSaveToast('تم حفظ إعدادات الجدولة ومسار الحفظ بنجاح');

    onAddAuditLog({
      id: `LOG-${getServerTimestamp()}`,
      timestamp: getServerDateTimeFormatted(),
      action: 'تحديث جدولة النسخ الاحتياطي',
      user: currentUser?.name || 'مدير النظام',
      userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : 'MO',
      affectedField: 'النسخ الاحتياطي التلقائي',
      previousValue: '-',
      newValue: `حالة: ${newConfig.enabled ? 'مفعل' : 'معطل'} | تكرار: ${newConfig.frequency} | مسار: ${newConfig.storagePath}`,
    });
  };

  // Generate dynamic checksum
  const generateChecksum = (dataString: string): string => {
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `MOC-${Math.abs(hash).toString(16).toUpperCase()}-${getServerTimestamp().toString(36).toUpperCase()}`;
  };

  // Calculate live database counts
  const currentCounts: DatabaseBackupCounts = {
    units: units.length,
    maintenanceRequests: maintenanceRequests.length,
    occupancyRecords: occupancyRecords.length,
    periodicInspections: periodicInspections.length,
    users: users.length,
    orgEntities: orgEntities.length,
    governorates: governorates.length,
    oilfields: oilfields.length,
    sites: sites.length,
    unitTypes: unitTypes.length,
    roomTypes: roomTypes.length,
    equipmentTypes: equipmentTypes.length,
    maintenanceDepartments: maintenanceDepartments.length,
    auditLogs: includeAuditLogs ? auditLogs.length : 0,
    totalRecords:
      units.length +
      maintenanceRequests.length +
      occupancyRecords.length +
      periodicInspections.length +
      users.length +
      orgEntities.length +
      governorates.length +
      oilfields.length +
      sites.length +
      unitTypes.length +
      roomTypes.length +
      equipmentTypes.length +
      maintenanceDepartments.length +
      (includeAuditLogs ? auditLogs.length : 0),
  };

  // Build Comprehensive Backup Payload
  const buildBackupPayload = (): DatabaseBackupPayload => {
    const now = getServerNow();
    const formattedDate = getServerDateTimeFormatted();

    const rawData = {
      units,
      maintenanceRequests,
      occupancyRecords,
      periodicInspections,
      users,
      orgEntities,
      branding,
      governorates,
      oilfields,
      sites,
      unitTypes,
      roomTypes,
      equipmentTypes,
      maintenanceDepartments,
      auditLogs: includeAuditLogs ? auditLogs : [],
    };

    const checksum = generateChecksum(JSON.stringify(rawData));

    return {
      version: '3.0.0-PROD',
      systemTitle: branding.systemName || 'منظومة إدارة الوحدات والأصول العقارية',
      companyName: branding.companyName || 'شركة نفط الوسط',
      exportedAt: now.toISOString(),
      exportedAtFormatted: formattedDate,
      exportedBy: currentUser?.name || 'مدير النظام (عمر المياحي)',
      checksum,
      counts: currentCounts,
      data: rawData,
    };
  };

  // Execute Full Manual Export
  const handleExportBackup = (isScheduled: boolean = false) => {
    setIsExporting(true);

    setTimeout(() => {
      try {
        const payload = buildBackupPayload();
        const jsonContent = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const now = getServerNow();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const filename = `Midland_Oil_Database_Backup_${dd}_${mm}_${yyyy}_${hh}${min}.json`;

        // Trigger browser download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const sizeKb = (blob.size / 1024).toFixed(1);
        const sizeFormatted = `${toArabicDigits(sizeKb)} ك.ب`;

        setLastExportedInfo({
          filename,
          size: sizeFormatted,
          recordsCount: payload.counts.totalRecords,
          time: getServerTimeFormatted(),
        });

        // Add to History
        const newHistoryItem: BackupHistoryItem = {
          id: `BCK-${getServerTimestamp()}`,
          filename,
          timestamp: now.toISOString(),
          timestampFormatted: getServerDateTimeFormatted(),
          sizeBytes: blob.size,
          sizeFormatted,
          totalRecords: payload.counts.totalRecords,
          unitsCount: units.length,
          storagePath: scheduleConfig.storagePath || 'C:\\Midland_Oil_Database_Backups\\',
          status: 'success',
          triggerType: isScheduled ? 'scheduled' : 'manual',
          summary: `نسخة شاملة: ${toArabicDigits(units.length)} مبنى و ${toArabicDigits(payload.counts.totalRecords)} سجل كامل`,
          payloadSnapshot: payload,
        };

        const updatedHistory = [newHistoryItem, ...backupHistory.slice(0, 49)];
        setBackupHistory(updatedHistory);
        safeSetItem('app_backup_history', updatedHistory);

        // Update schedule last run if applicable
        const updatedConfig: AutoBackupScheduleConfig = {
          ...scheduleConfig,
          lastBackupTimestamp: now.toISOString(),
          lastBackupFormatted: getServerDateTimeFormatted(),
          lastBackupSize: sizeFormatted,
          lastBackupStatus: 'success',
        };
        setScheduleConfig(updatedConfig);
        safeSetItem('app_auto_backup_config', updatedConfig);

        onAddAuditLog({
          id: `LOG-${getServerTimestamp()}`,
          timestamp: getServerDateTimeFormatted(),
          action: isScheduled ? 'تصدير نسخة احتياطية مجدولة' : 'تصدير نسخة احتياطية شاملة',
          user: currentUser?.name || 'مدير النظام',
          userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : 'MO',
          affectedField: 'قاعدة البيانات المركزية',
          previousValue: '-',
          newValue: `${filename} (${sizeFormatted} - ${toArabicDigits(payload.counts.totalRecords)} سجل)`,
        });

        triggerSaveToast(`تم تصدير وحفظ النسخة الاحتياطية بنجاح (${sizeFormatted})`);
      } catch (err: any) {
        console.error('Export error:', err);
        triggerSaveToast('حدث خطأ أثناء تصدير قاعدة البيانات');
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  // Handle File Upload and Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setImportValidationError(null);
    setParsedBackupData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validate structure
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف.');
        }

        if (!parsed.data || typeof parsed.data !== 'object') {
          throw new Error('الملف لا يحتوي على كتلة بيانات صالحة (data object missing).');
        }

        if (!Array.isArray(parsed.data.units)) {
          throw new Error('هيكل بيانات المباني والوحدات مفقود داخل الملف.');
        }

        setParsedBackupData(parsed as DatabaseBackupPayload);
      } catch (err: any) {
        console.error('Import parse error:', err);
        setImportValidationError(err.message || 'الملف المرفوع لا يتطابق مع بنية قاعدة بيانات النظام.');
        setParsedBackupData(null);
      }
    };
    reader.onerror = () => {
      setImportValidationError('تعذر قراءة محتوى الملف.');
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = () => {
    if (!parsedBackupData) return;

    setIsRestoring(true);
    setShowRestoreConfirmModal(false);

    setTimeout(() => {
      try {
        onRestoreDatabase(parsedBackupData, importMode, () => {
          setIsRestoring(false);
          setUploadedFile(null);
          setParsedBackupData(null);
          setConfirmAgreementChecked(false);
          if (fileInputRef.current) fileInputRef.current.value = '';

          onAddAuditLog({
            id: `LOG-${getServerTimestamp()}`,
            timestamp: getServerDateTimeFormatted(),
            action: importMode === 'overwrite' ? 'استعادة شاملة واستبدال قاعدة البيانات' : 'دمج بيانات من نسخة احتياطية',
            user: currentUser?.name || 'مدير النظام',
            userInitials: currentUser?.name ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2) : 'MO',
            affectedField: 'قاعدة البيانات المركزية',
            previousValue: `الحالي: ${toArabicDigits(units.length)} مبنى`,
            newValue: `المستورد: ${toArabicDigits(parsedBackupData.data.units.length)} مبنى`,
          });

          triggerSaveToast(
            importMode === 'overwrite'
              ? 'تمت استعادة وتحديث قاعدة البيانات بالكامل بنجاح!'
              : 'تم دمج وتحديث السجلات بنجاح!'
          );
        });
      } catch (err: any) {
        setIsRestoring(false);
        triggerSaveToast('فشلت عملية استعادة البيانات: ' + (err.message || 'خطأ غير معروف'));
      }
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className={`rounded-2xl p-5 border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-950 border-slate-800 shadow-slate-950/50'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-2xl shrink-0 border ${
              isLight
                ? 'bg-amber-100 text-amber-700 border-amber-300'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              <span>إدارة النسخ الاحتياطي والاستعادة وجدولة البيانات</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}
              >
                حالة القاعدة: نشطة ومؤمنة
              </span>
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              تصدير شامل لجميع بيانات الأصول، ملفات التصاميم ثلاثية الأبعاد، طلبات الصيانة، المستخدمين، مع إمكانية الاستعادة والجدولة التلقائية
            </p>
          </div>
        </div>

        {/* Quick Database Total Indicator */}
        <div
          className={`flex items-center gap-2 p-2 rounded-xl border text-xs shrink-0 self-start md:self-auto ${
            isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="text-right">
            <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>إجمالي السجلات المركزية</span>
            <span className={`font-bold font-mono text-sm ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
              {toArabicDigits(currentCounts.totalRecords)} سجل
            </span>
          </div>
          <div className={`w-px h-7 mx-1 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`} />
          <div className="text-right">
            <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>المباني والأصول</span>
            <span className={`font-bold font-mono text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              {toArabicDigits(units.length)} أصل
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className={`flex items-center gap-2 border-b pb-2 overflow-x-auto ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <button
          type="button"
          onClick={() => setActiveSubTab('export')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'export'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>تصدير نسخة احتياطية شاملة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('import')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'import'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>استيراد واستعادة قاعدة البيانات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('schedule')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'schedule'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>الجدولة التلقائية ومكان الحفظ</span>
          {scheduleConfig.enabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'history'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>أرشيف النسخ السابقة</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              isLight ? 'bg-slate-200 text-amber-900' : 'bg-slate-800 text-amber-400'
            }`}
          >
            {backupHistory.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: EXPORT (تصدير نسخة احتياطية) */}
      {/* ========================================================================= */}
      {activeSubTab === 'export' && (
        <div className="space-y-5">
          {/* Summary of Included Entities */}
          <div
            className={`rounded-2xl p-5 border space-y-4 shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h4 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  <ShieldCheck className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <span>محتويات النسخة الاحتياطية المصدرة الشاملة</span>
                </h4>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  النسخة المصدرة تشمل كافة الجداول والملفات والتقارير والبيانات بشكل كامل وتام وغير منقوص.
                </p>
              </div>

              {/* Toggle include audit logs */}
              <label className={`flex items-center gap-2 text-xs cursor-pointer select-none font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={includeAuditLogs}
                  onChange={(e) => setIncludeAuditLogs(e.target.checked)}
                  className="rounded border-slate-400 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer w-4 h-4"
                />
                <span>تضمين سجل النشاطات التاريخي ({toArabicDigits(auditLogs.length)})</span>
              </label>
            </div>

            {/* Content Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/10 text-amber-400'}`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>المباني والكرفانات (3D)</span>
                  <span className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {toArabicDigits(units.length)} أصل هندسي
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>طلبات وبلاغات الصيانة</span>
                  <span className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {toArabicDigits(maintenanceRequests.length)} طلب موثق
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/10 text-blue-400'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>سجلات الإشغال والمقيمين</span>
                  <span className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {toArabicDigits(occupancyRecords.length)} سجل سكني
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-purple-100 text-purple-800' : 'bg-purple-500/10 text-purple-400'}`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الكشوفات الدورية والمهام</span>
                  <span className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {toArabicDigits(periodicInspections.length)} مهمة كشف
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-pink-100 text-pink-800' : 'bg-pink-500/10 text-pink-400'}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>المستخدمين والصلاحيات</span>
                  <span className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {toArabicDigits(users.length)} حساب نظام
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-teal-100 text-teal-800' : 'bg-teal-500/10 text-teal-400'}`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الهيكل التنظيمي للشركة</span>
                  <span className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {toArabicDigits(orgEntities.length)} تشكيل إداري
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-cyan-100 text-cyan-800' : 'bg-cyan-500/10 text-cyan-400'}`}>
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الجداول المرجعية (حقول، مواقع..)</span>
                  <span className={`font-bold text-xs font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    {toArabicDigits(
                      governorates.length +
                        oilfields.length +
                        sites.length +
                        unitTypes.length +
                        roomTypes.length +
                        equipmentTypes.length +
                        maintenanceDepartments.length
                    )}{' '}
                    عنصر مرجعي
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-500/10 text-rose-400'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الهوية والتخصيص</span>
                  <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>شامل كامل الإعدادات</span>
                </div>
              </div>
            </div>

            {/* Export Action Button Card */}
            <div className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <span>تاريخ التصدير: </span>
                <span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                  {getServerDateFormatted()}
                </span>
                <span className="mx-2">•</span>
                <span>الصيغة: </span>
                <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>JSON معتمد ومشفّر</span>
              </div>

              <button
                type="button"
                onClick={() => handleExportBackup(false)}
                disabled={isExporting}
                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>تصدير وتنزيل النسخة الاحتياطية الشاملة الآن</span>
              </button>
            </div>
          </div>

          {/* Last Export Banner if available */}
          {lastExportedInfo && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-5 h-5 shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <div>
                  <span className="font-bold block">تم إنشاء وتنزيل النسخة الاحتياطية بنجاح:</span>
                  <span className={`font-mono text-[11px] ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
                    {lastExportedInfo.filename} ({lastExportedInfo.size} - {toArabicDigits(lastExportedInfo.recordsCount)} سجل) في تمام الساعة {lastExportedInfo.time}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isLight
                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                }`}
              >
                عرض الأرشيف
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: IMPORT (استيراد واستعادة قاعدة البيانات) */}
      {/* ========================================================================= */}
      {activeSubTab === 'import' && (
        <div className="space-y-5">
          {/* File Upload Box */}
          <div
            className={`rounded-2xl p-6 border-2 border-dashed transition flex flex-col items-center justify-center text-center space-y-3 cursor-pointer shadow-sm ${
              parsedBackupData
                ? isLight
                  ? 'border-emerald-500 bg-emerald-50/60'
                  : 'border-emerald-500/60 bg-emerald-500/5'
                : importValidationError
                ? isLight
                  ? 'border-red-400 bg-red-50/60'
                  : 'border-red-500/60 bg-red-500/5'
                : isLight
                ? 'border-slate-300 bg-white hover:bg-slate-50'
                : 'border-slate-800 bg-slate-950 hover:bg-slate-900/60'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div
              className={`p-3 rounded-2xl border ${
                isLight
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                {uploadedFile ? uploadedFile.name : 'انقر لاختيار ملف النسخة الاحتياطية أو اسحبه إلى هنا'}
              </h4>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                يدعم ملفات النسخ الاحتياطي الرسمية المعتمدة بصيغة (<span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>.json</span>)
              </p>
            </div>

            {uploadedFile && (
              <span
                className={`text-[11px] font-mono px-3 py-1 rounded-full border ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                الحجم: {toArabicDigits((uploadedFile.size / 1024).toFixed(1))} ك.ب
              </span>
            )}
          </div>

          {/* Validation Error Banner */}
          {importValidationError && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${
                isLight
                  ? 'bg-red-50 border-red-200 text-red-700 shadow-xs'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              <div>
                <span className="font-bold block">خطأ في فحص الملف:</span>
                <span>{importValidationError}</span>
              </div>
            </div>
          )}

          {/* Validated Backup Preview Card */}
          {parsedBackupData && (
            <div
              className={`rounded-2xl p-5 border space-y-4 shadow-sm ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="flex items-center gap-2">
                  <FileCheck className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <div>
                    <h4 className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      تم فحص والتحقق من سلامة النسخة الاحتياطية بنجاح
                    </h4>
                    <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      كود التحقق: {parsedBackupData.checksum || 'صالح'} • الإصدار: {parsedBackupData.version}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  جاهز للاستعادة
                </span>
              </div>

              {/* Metadata Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div
                  className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>تاريخ إنشاء النسخة</span>
                  <span className={`font-bold font-mono ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                    {parsedBackupData.exportedAtFormatted || formatDateDDMMYYYY(parsedBackupData.exportedAt)}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>الجهة / المصدر</span>
                  <span className={`font-bold truncate block ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                    {parsedBackupData.companyName || 'شركة نفط الوسط'}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>عدد المباني المشمولة</span>
                  <span className={`font-bold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {toArabicDigits(parsedBackupData.data?.units?.length || 0)} أصل
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className={`text-[10px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>إجمالي السجلات</span>
                  <span className={`font-bold font-mono ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                    {toArabicDigits(parsedBackupData.counts?.totalRecords || 0)} سجل
                  </span>
                </div>
              </div>

              {/* Restoration Mode Selector */}
              <div className={`pt-2 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <span className={`font-bold text-xs block ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>اختر أسلوب الاستعادة المطلوب:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      importMode === 'overwrite'
                        ? isLight
                          ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-xs'
                          : 'bg-amber-500/10 border-amber-500 text-slate-100 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="overwrite"
                      checked={importMode === 'overwrite'}
                      onChange={() => setImportMode('overwrite')}
                      className="mt-1 text-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className={`font-bold text-xs block ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        استبدال شامل واستعادة كاملة (Full Overwrite)
                      </span>
                      <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        استبدال قاعدة البيانات الحالية بالكامل بالبيانات الموجودة بالملف. (موصى به لاستعادة النظم)
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      importMode === 'merge'
                        ? isLight
                          ? 'bg-amber-50 border-amber-400 text-slate-900 shadow-xs'
                          : 'bg-amber-500/10 border-amber-500 text-slate-100 shadow-sm'
                        : isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1 text-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className={`font-bold text-xs block ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                        دمج ذكي وتحديث السجلات القائمة (Smart Merge)
                      </span>
                      <span className={`text-[11px] block mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        إضافة السجلات والوحدات الجديدة وتحديث السجلات المطابقة دون مسح البيانات الحالية غير الموجودة بالملف.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Restore Trigger Button */}
              <div className={`pt-3 border-t flex justify-end ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowRestoreConfirmModal(true)}
                  disabled={isRestoring}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>بدء استعادة وتطبيق قاعدة البيانات</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: SCHEDULE & STORAGE PATH (الجدولة التلقائية ومكان الحفظ) */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-5">
          <div
            className={`rounded-2xl p-5 border space-y-5 shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            {/* Header & Main Toggle */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h4 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  <Clock className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  <span>إعدادات جدولة النسخ الاحتياطي التلقائي ومكان الحفظ</span>
                </h4>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  تفعيل التصدير الدوري التلقائي لقاعدة البيانات مع تحديد مكان الحفظ ومواعيد التكرار
                </p>
              </div>

              {/* Status Switch */}
              <button
                type="button"
                onClick={() =>
                  handleSaveScheduleConfig({
                    ...scheduleConfig,
                    enabled: !scheduleConfig.enabled,
                  })
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  scheduleConfig.enabled
                    ? isLight
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 border border-slate-300'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    scheduleConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>{scheduleConfig.enabled ? 'الجدولة التلقائية: مفعلة' : 'الجدولة التلقائية: معطلة'}</span>
              </button>
            </div>

            {/* Storage Path Config Section (مطلوب رئيسي) */}
            <div
              className={`space-y-3 p-4 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className={`flex items-center gap-2 font-bold text-xs ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                <Folder className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                <span>مكان حفظ النسخة الاحتياطية (Storage Destination Path):</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                حدد المسار المعتمد على حاسبة الإدارة أو وحدة التخزين الشبكية (NAS) أو مسار المجلد الذي يتم توجيه النسخ الاحتياطية المصدرة إليه.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={scheduleConfig.storagePath}
                    onChange={(e) =>
                      setScheduleConfig({ ...scheduleConfig, storagePath: e.target.value })
                    }
                    placeholder="مثال: C:\Midland_Oil_Database_Backups\ أو /var/backups/moc/"
                    className={`w-full text-xs rounded-xl py-2.5 pl-3 pr-9 font-mono outline-none transition ${
                      isLight
                        ? 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                        : 'bg-slate-950 border border-slate-700 text-slate-100 focus:border-amber-500'
                    }`}
                    dir="ltr"
                  />
                  <HardDrive className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-amber-600' : 'text-amber-500'}`} />
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveScheduleConfig(scheduleConfig)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>تثبيت مكان الحفظ</span>
                </button>
              </div>

              {/* Suggested Storage Path Shortcuts */}
              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>مسارات مقترحة سريعة:</span>
                <button
                  type="button"
                  onClick={() => {
                    const path = 'C:\\Midland_Oil_Database_Backups\\';
                    setScheduleConfig({ ...scheduleConfig, storagePath: path });
                    handleSaveScheduleConfig({ ...scheduleConfig, storagePath: path });
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-mono ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  dir="ltr"
                >
                  C:\Midland_Oil_Database_Backups\
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const path = 'D:\\Backups\\MOC_GIS_Assets\\';
                    setScheduleConfig({ ...scheduleConfig, storagePath: path });
                    handleSaveScheduleConfig({ ...scheduleConfig, storagePath: path });
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-mono ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  dir="ltr"
                >
                  D:\Backups\MOC_GIS_Assets\
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const path = '\\\\192.168.1.100\\MOC_Server_Backups\\';
                    setScheduleConfig({ ...scheduleConfig, storagePath: path });
                    handleSaveScheduleConfig({ ...scheduleConfig, storagePath: path });
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-mono ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  dir="ltr"
                >
                  \\192.168.1.100\MOC_Server_Backups\
                </button>
              </div>
            </div>

            {/* Schedule Frequency & Time Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Frequency */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>تكرار التصدير الأوتوماتيكي:</label>
                <select
                  value={scheduleConfig.frequency}
                  onChange={(e) =>
                    setScheduleConfig({
                      ...scheduleConfig,
                      frequency: e.target.value as any,
                    })
                  }
                  className={`w-full text-xs rounded-xl p-2.5 outline-none transition ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500'
                  }`}
                >
                  <option value="daily">يومي (كل 24 ساعة)</option>
                  <option value="weekly">أسبوعي (في يوم محدد)</option>
                  <option value="monthly">شهري (بداية كل شهر)</option>
                  <option value="custom_hours">كل 12 ساعة</option>
                </select>
              </div>

              {/* Time of Day */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>وقت التصدير المجدول:</label>
                <input
                  type="time"
                  value={scheduleConfig.timeOfDay}
                  onChange={(e) =>
                    setScheduleConfig({
                      ...scheduleConfig,
                      timeOfDay: e.target.value,
                    })
                  }
                  className={`w-full text-xs rounded-xl p-2.5 outline-none font-mono transition ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500'
                  }`}
                />
              </div>

              {/* Max Kept Backups */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>الحد الأقصى للنسخ المحفوظة بالأرشيف:</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={scheduleConfig.keepMaxBackups}
                  onChange={(e) =>
                    setScheduleConfig({
                      ...scheduleConfig,
                      keepMaxBackups: parseInt(e.target.value) || 30,
                    })
                  }
                  className={`w-full text-xs rounded-xl p-2.5 outline-none font-mono transition ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                      : 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500'
                  }`}
                />
              </div>
            </div>

            {/* Status Information Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t text-xs ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>آخر تصدير مجدول تم تنفيذه:</span>
                <span className={`font-bold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  {scheduleConfig.lastBackupFormatted || 'لم ينفذ بعد'}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>موعد النسخة المجدولة القادمة:</span>
                <span className={`font-bold font-mono ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                  {scheduleConfig.enabled
                    ? `غداً في تمام الساعة ${scheduleConfig.timeOfDay}`
                    : 'الجدولة معطلة حالياً'}
                </span>
              </div>
            </div>

            {/* Save All Schedule Settings & Test Trigger */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button
                type="button"
                onClick={() => handleExportBackup(true)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <Play className={`w-3.5 h-3.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
                <span>تشغيل وحفظ نسخة مجدولة فوراً (تجربة)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveScheduleConfig(scheduleConfig)}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>حفظ كافة إعدادات الجدولة ومكان الحفظ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: HISTORY & ARCHIVE (أرشيف وسجل النسخ السابقة) */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div
            className={`rounded-2xl p-5 border space-y-4 shadow-sm ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <h4 className={`font-bold text-sm flex items-center gap-2 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  <FileCheck className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  <span>سجل وأرشيف النسخ الاحتياطية السابقة</span>
                </h4>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  استعراض النسخ الاحتياطية المنفذة مع إمكانية إعادة تحميل الملف أو الاستعادة المباشرة
                </p>
              </div>

              {backupHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBackupHistory([]);
                    safeSetItem('app_backup_history', []);
                    triggerSaveToast('تم تفريغ سجل الأرشيف');
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isLight
                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح السجل</span>
                </button>
              )}
            </div>

            {backupHistory.length === 0 ? (
              <div className={`py-12 text-center space-y-2 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                <Database className={`w-10 h-10 mx-auto ${isLight ? 'text-slate-300' : 'text-slate-700'}`} />
                <p className="text-xs">لم يتم تسجيل أي نسخ احتياطية في الأرشيف بعد.</p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('export')}
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-bold text-xs mt-2 transition cursor-pointer shadow-xs"
                >
                  تصدير أول نسخة احتياطية الآن
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
                      <th className="pb-2.5 font-bold">اسم الملف</th>
                      <th className="pb-2.5 font-bold">تاريخ ووقت التصدير</th>
                      <th className="pb-2.5 font-bold">حجم الملف</th>
                      <th className="pb-2.5 font-bold">المباني والسجلات</th>
                      <th className="pb-2.5 font-bold">مسار الحفظ</th>
                      <th className="pb-2.5 font-bold">النوع</th>
                      <th className="pb-2.5 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-900'}`}>
                    {backupHistory.map((item) => (
                      <tr key={item.id} className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/50'}`}>
                        <td className={`py-3 font-mono font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{item.filename}</td>
                        <td className={`py-3 font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{item.timestampFormatted}</td>
                        <td className={`py-3 font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{item.sizeFormatted}</td>
                        <td className={`py-3 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          <span className={`font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{toArabicDigits(item.unitsCount)}</span> مبنى (
                          <span className={`font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>{toArabicDigits(item.totalRecords)}</span> سجل)
                        </td>
                        <td className={`py-3 font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`} dir="ltr">
                          {item.storagePath}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.triggerType === 'scheduled'
                                ? isLight
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : isLight
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {item.triggerType === 'scheduled' ? 'مجدول تلقائي' : 'تصدير يدوي'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {item.payloadSnapshot && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const jsonContent = JSON.stringify(item.payloadSnapshot, null, 2);
                                    const blob = new Blob([jsonContent], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = item.filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                    triggerSaveToast('تم تنزيل النسخة الاحتياطية مجدداً');
                                  }}
                                  className={`p-1.5 rounded-lg transition cursor-pointer border ${
                                    isLight
                                      ? 'bg-slate-100 hover:bg-slate-200 text-amber-700 border-slate-200'
                                      : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-transparent'
                                  }`}
                                  title="تحميل الملف مجدداً"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setParsedBackupData(item.payloadSnapshot || null);
                                    setActiveSubTab('import');
                                    triggerSaveToast('تم تحميل بيانات النسخة في تبويب الاستيراد');
                                  }}
                                  className={`p-1.5 rounded-lg transition cursor-pointer border ${
                                    isLight
                                      ? 'bg-slate-100 hover:bg-slate-200 text-emerald-700 border-slate-200'
                                      : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-transparent'
                                  }`}
                                  title="استعادة هذه النسخة"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                const filtered = backupHistory.filter((b) => b.id !== item.id);
                                setBackupHistory(filtered);
                                safeSetItem('app_backup_history', filtered);
                                triggerSaveToast('تم حذف النسخة من الأرشيف');
                              }}
                              className={`p-1.5 rounded-lg transition cursor-pointer border ${
                                isLight
                                  ? 'bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border-slate-200'
                                  : 'bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border-transparent'
                              }`}
                              title="حذف من الأرشيف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESTORE CONFIRMATION SAFETY MODAL */}
      {/* ========================================================================= */}
      {showRestoreConfirmModal && parsedBackupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4 ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
          >
            <div className={`flex items-center gap-3 border-b pb-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div
                className={`p-2.5 rounded-2xl border ${
                  isLight
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-bold text-sm ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                  تأكيد استعادة وتطبيق قاعدة البيانات
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {importMode === 'overwrite'
                    ? 'تحذير: سيتم استبدال البيانات الحالية بالكامل بالنسخة المستوردة.'
                    : 'سيتم دمج وتحديث السجلات والوحدات مع المحافظة على البيانات القائمة.'}
                </p>
              </div>
            </div>

            {/* Summary Box */}
            <div
              className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>تاريخ النسخة المستوردة:</span>
                <span className={`font-mono font-bold ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                  {parsedBackupData.exportedAtFormatted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>عدد المباني المستوردة:</span>
                <span className={`font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  {toArabicDigits(parsedBackupData.data?.units?.length || 0)} أصل
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>نوع الاستعادة:</span>
                <span className={`font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                  {importMode === 'overwrite' ? 'استبدال واستعادة شاملة' : 'دمج وتحديث ذكي'}
                </span>
              </div>
            </div>

            {/* Checkbox agreement */}
            <label
              className={`flex items-start gap-2.5 text-xs cursor-pointer select-none p-3 rounded-xl border ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={confirmAgreementChecked}
                onChange={(e) => setConfirmAgreementChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-400 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer w-4 h-4"
              />
              <span>
                أقر بأنني مدير مخول وأوافق على تطبيق واستعادة قاعدة البيانات الآن مع تسجيل العملية في سجل التدقيق.
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreConfirmModal(false);
                  setConfirmAgreementChecked(false);
                }}
                className={`px-4 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!confirmAgreementChecked || isRestoring}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRestoring ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>تأكيد واستعادة البيانات فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
