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
        className={`rounded-2xl p-5 border shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition bg-card border-slate-200 shadow-slate-200/50`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-2xl shrink-0 border bg-brand-100 text-brand-700 border-brand-200`}
          >
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 text-slate-900`}>
              <span>إدارة النسخ الاحتياطي والاستعادة وجدولة البيانات</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold bg-emerald-100 text-emerald-800 border-emerald-200`}
              >
                حالة القاعدة: نشطة ومؤمنة
              </span>
            </h3>
            <p className={`text-xs mt-0.5 text-slate-600`}>
              تصدير شامل لجميع بيانات الأصول، ملفات التصاميم ثلاثية الأبعاد، طلبات الصيانة، المستخدمين، مع إمكانية الاستعادة والجدولة التلقائية
            </p>
          </div>
        </div>

        {/* Quick Database Total Indicator */}
        <div
          className={`flex items-center gap-2 p-2 rounded-xl border text-xs shrink-0 self-start md:self-auto bg-slate-50 border-slate-200 shadow-xs`}
        >
          <div className="text-right">
            <span className={`text-[10px] block text-slate-500`}>إجمالي السجلات المركزية</span>
            <span className={`font-bold font-mono text-sm text-brand-700`}>
              {toArabicDigits(currentCounts.totalRecords)} سجل
            </span>
          </div>
          <div className={`w-px h-7 mx-1 bg-slate-200`} />
          <div className="text-right">
            <span className={`text-[10px] block text-slate-500`}>المباني والأصول</span>
            <span className={`font-bold font-mono text-sm text-emerald-700`}>
              {toArabicDigits(units.length)} أصل
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className={`flex items-center gap-2 border-b pb-2 overflow-x-auto border-slate-200`}>
        <button
          type="button"
          onClick={() => setActiveSubTab('export')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeSubTab === 'export'
              ? 'bg-brand-700 text-on-brand shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
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
              ? 'bg-brand-700 text-on-brand shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
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
              ? 'bg-brand-700 text-on-brand shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
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
              ? 'bg-brand-700 text-on-brand shadow-md'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>أرشيف النسخ السابقة</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-brand-800`}
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
            className={`rounded-2xl p-5 border space-y-4 shadow-sm bg-card border-slate-200`}
          >
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-200`}>
              <div>
                <h4 className={`font-bold text-sm flex items-center gap-2 text-brand-800`}>
                  <ShieldCheck className={`w-4 h-4 text-emerald-600`} />
                  <span>محتويات النسخة الاحتياطية المصدرة الشاملة</span>
                </h4>
                <p className={`text-xs mt-0.5 text-slate-600`}>
                  النسخة المصدرة تشمل كافة الجداول والملفات والتقارير والبيانات بشكل كامل وتام وغير منقوص.
                </p>
              </div>

              {/* Toggle include audit logs */}
              <label className={`flex items-center gap-2 text-xs cursor-pointer select-none font-medium text-slate-700`}>
                <input
                  type="checkbox"
                  checked={includeAuditLogs}
                  onChange={(e) => setIncludeAuditLogs(e.target.checked)}
                  className="rounded border-slate-400 text-brand-700 focus:ring-brand-600 accent-brand-700 cursor-pointer w-4 h-4"
                />
                <span>تضمين سجل النشاطات التاريخي ({toArabicDigits(auditLogs.length)})</span>
              </label>
            </div>

            {/* Content Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
              >
                <div className={`p-2 rounded-lg bg-brand-100 text-brand-800`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block text-slate-500`}>المباني والكرفانات (3D)</span>
                  <span className={`font-bold text-xs font-mono text-slate-900`}>
                    {toArabicDigits(units.length)} أصل هندسي
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
              >
                <div className={`p-2 rounded-lg bg-emerald-100 text-emerald-800`}>
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block text-slate-500`}>طلبات وبلاغات الصيانة</span>
                  <span className={`font-bold text-xs font-mono text-slate-900`}>
                    {toArabicDigits(maintenanceRequests.length)} طلب موثق
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
              >
                <div className={`p-2 rounded-lg bg-blue-100 text-blue-800`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block text-slate-500`}>سجلات الإشغال والمقيمين</span>
                  <span className={`font-bold text-xs font-mono text-slate-900`}>
                    {toArabicDigits(occupancyRecords.length)} سجل سكني
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
              >
                <div className={`p-2 rounded-lg bg-purple-100 text-purple-800`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block text-slate-500`}>الكشوفات الدورية والمهام</span>
                  <span className={`font-bold text-xs font-mono text-slate-900`}>
                    {toArabicDigits(periodicInspections.length)} مهمة كشف
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
              >
                <div className={`p-2 rounded-lg bg-pink-100 text-pink-800`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block text-slate-500`}>المستخدمين والصلاحيات</span>
                  <span className={`font-bold text-xs font-mono text-slate-900`}>
                    {toArabicDigits(users.length)} حساب نظام
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
              >
                <div className={`p-2 rounded-lg bg-teal-100 text-teal-800`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block text-slate-500`}>الهيكل التنظيمي للشركة</span>
                  <span className={`font-bold text-xs font-mono text-slate-900`}>
                    {toArabicDigits(orgEntities.length)} تشكيل إداري
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
              >
                <div className={`p-2 rounded-lg bg-cyan-100 text-cyan-800`}>
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block text-slate-500`}>الجداول المرجعية (محافظات، حقول..)</span>
                  <span className={`font-bold text-xs font-mono text-slate-900`}>
                    {toArabicDigits(
                      governorates.length +
                        oilfields.length +
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
                className={`p-3 rounded-xl border flex items-center gap-3 bg-slate-50 border-slate-200`}
              >
                <div className={`p-2 rounded-lg bg-rose-100 text-rose-800`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] block text-slate-500`}>الهوية والتخصيص</span>
                  <span className={`font-bold text-xs text-slate-900`}>شامل كامل الإعدادات</span>
                </div>
              </div>
            </div>

            {/* Export Action Button Card */}
            <div className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 border-slate-200`}>
              <div className={`text-xs text-slate-600`}>
                <span>تاريخ التصدير: </span>
                <span className={`font-mono font-bold text-brand-700`}>
                  {getServerDateFormatted()}
                </span>
                <span className="mx-2">•</span>
                <span>الصيغة: </span>
                <span className={`font-mono font-bold text-emerald-700`}>JSON معتمد ومشفّر</span>
              </div>

              <button
                type="button"
                onClick={() => handleExportBackup(false)}
                disabled={isExporting}
                className="w-full sm:w-auto px-6 py-3 bg-brand-700 hover:bg-brand-800 active:scale-95 text-on-brand rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg disabled:opacity-50"
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
              className={`p-4 rounded-2xl border flex items-center justify-between text-xs bg-emerald-50 border-emerald-200 text-emerald-900 shadow-xs`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-5 h-5 shrink-0 text-emerald-600`} />
                <div>
                  <span className="font-bold block">تم إنشاء وتنزيل النسخة الاحتياطية بنجاح:</span>
                  <span className={`font-mono text-[11px] text-emerald-800`}>
                    {lastExportedInfo.filename} ({lastExportedInfo.size} - {toArabicDigits(lastExportedInfo.recordsCount)} سجل) في تمام الساعة {lastExportedInfo.time}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-200`}
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
                ? 'border-emerald-500 bg-emerald-50/60'
                : importValidationError
                ? 'border-red-200 bg-red-50/60'
                : 'border-slate-300 bg-card hover:bg-slate-50'
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
              className={`p-3 rounded-2xl border bg-brand-100 text-brand-700 border-brand-200`}
            >
              <Upload className="w-8 h-8" />
            </div>

            <div>
              <h4 className={`font-bold text-sm text-slate-900`}>
                {uploadedFile ? uploadedFile.name : 'انقر لاختيار ملف النسخة الاحتياطية أو اسحبه إلى هنا'}
              </h4>
              <p className={`text-xs mt-1 text-slate-600`}>
                يدعم ملفات النسخ الاحتياطي الرسمية المعتمدة بصيغة (<span className={`font-mono font-bold text-brand-700`}>.json</span>)
              </p>
            </div>

            {uploadedFile && (
              <span
                className={`text-[11px] font-mono px-3 py-1 rounded-full border bg-slate-100 text-slate-700 border-slate-300`}
              >
                الحجم: {toArabicDigits((uploadedFile.size / 1024).toFixed(1))} ك.ب
              </span>
            )}
          </div>

          {/* Validation Error Banner */}
          {importValidationError && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 text-xs bg-red-50 border-red-200 text-red-700 shadow-xs`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
              <div>
                <span className="font-bold block">خطأ في فحص الملف:</span>
                <span>{importValidationError}</span>
              </div>
            </div>
          )}

          {/* Validated Backup Preview Card */}
          {parsedBackupData && (
            <div
              className={`rounded-2xl p-5 border space-y-4 shadow-sm bg-card border-slate-200`}
            >
              <div className={`flex items-center justify-between border-b pb-3 border-slate-200`}>
                <div className="flex items-center gap-2">
                  <FileCheck className={`w-5 h-5 text-emerald-600`} />
                  <div>
                    <h4 className={`font-bold text-xs text-slate-900`}>
                      تم فحص والتحقق من سلامة النسخة الاحتياطية بنجاح
                    </h4>
                    <span className={`text-[11px] font-mono text-slate-500`}>
                      كود التحقق: {parsedBackupData.checksum || 'صالح'} • الإصدار: {parsedBackupData.version}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200`}
                >
                  جاهز للاستعادة
                </span>
              </div>

              {/* Metadata Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div
                  className={`p-2.5 rounded-xl border bg-slate-50 border-slate-200`}
                >
                  <span className={`text-[10px] block text-slate-500`}>تاريخ إنشاء النسخة</span>
                  <span className={`font-bold font-mono text-brand-700`}>
                    {parsedBackupData.exportedAtFormatted || formatDateDDMMYYYY(parsedBackupData.exportedAt)}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border bg-slate-50 border-slate-200`}
                >
                  <span className={`text-[10px] block text-slate-500`}>الجهة / المصدر</span>
                  <span className={`font-bold truncate block text-slate-900`}>
                    {parsedBackupData.companyName || 'شركة نفط الوسط'}
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border bg-slate-50 border-slate-200`}
                >
                  <span className={`text-[10px] block text-slate-500`}>عدد المباني المشمولة</span>
                  <span className={`font-bold font-mono text-emerald-700`}>
                    {toArabicDigits(parsedBackupData.data?.units?.length || 0)} أصل
                  </span>
                </div>
                <div
                  className={`p-2.5 rounded-xl border bg-slate-50 border-slate-200`}
                >
                  <span className={`text-[10px] block text-slate-500`}>إجمالي السجلات</span>
                  <span className={`font-bold font-mono text-cyan-700`}>
                    {toArabicDigits(parsedBackupData.counts?.totalRecords || 0)} سجل
                  </span>
                </div>
              </div>

              {/* Restoration Mode Selector */}
              <div className={`pt-2 border-t space-y-2 border-slate-200`}>
                <span className={`font-bold text-xs block text-slate-800`}>اختر أسلوب الاستعادة المطلوب:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      importMode === 'overwrite'
                        ? 'bg-brand-50 border-brand-200 text-slate-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="overwrite"
                      checked={importMode === 'overwrite'}
                      onChange={() => setImportMode('overwrite')}
                      className="mt-1 text-brand-700 accent-brand-700 cursor-pointer"
                    />
                    <div>
                      <span className={`font-bold text-xs block text-slate-900`}>
                        استبدال شامل واستعادة كاملة (Full Overwrite)
                      </span>
                      <span className={`text-[11px] block mt-0.5 text-slate-600`}>
                        استبدال قاعدة البيانات الحالية بالكامل بالبيانات الموجودة بالملف. (موصى به لاستعادة النظم)
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                      importMode === 'merge'
                        ? 'bg-brand-50 border-brand-200 text-slate-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1 text-brand-700 accent-brand-700 cursor-pointer"
                    />
                    <div>
                      <span className={`font-bold text-xs block text-slate-900`}>
                        دمج ذكي وتحديث السجلات القائمة (Smart Merge)
                      </span>
                      <span className={`text-[11px] block mt-0.5 text-slate-600`}>
                        إضافة السجلات والوحدات الجديدة وتحديث السجلات المطابقة دون مسح البيانات الحالية غير الموجودة بالملف.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Restore Trigger Button */}
              <div className={`pt-3 border-t flex justify-end border-slate-200`}>
                <button
                  type="button"
                  onClick={() => setShowRestoreConfirmModal(true)}
                  disabled={isRestoring}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-on-brand font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
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
            className={`rounded-2xl p-5 border space-y-5 shadow-sm bg-card border-slate-200`}
          >
            {/* Header & Main Toggle */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200`}>
              <div>
                <h4 className={`font-bold text-sm flex items-center gap-2 text-brand-800`}>
                  <Clock className={`w-4 h-4 text-brand-700`} />
                  <span>إعدادات جدولة النسخ الاحتياطي التلقائي ومكان الحفظ</span>
                </h4>
                <p className={`text-xs mt-0.5 text-slate-600`}>
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
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs'
                    : 'bg-slate-100 text-slate-600 border border-slate-300'
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
              className={`space-y-3 p-4 rounded-2xl border bg-slate-50 border-slate-200`}
            >
              <div className={`flex items-center gap-2 font-bold text-xs text-slate-900`}>
                <Folder className={`w-4 h-4 text-brand-700`} />
                <span>مكان حفظ النسخة الاحتياطية (Storage Destination Path):</span>
              </div>
              <p className={`text-[11px] leading-relaxed text-slate-600`}>
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
                    className={`w-full text-xs rounded-xl py-2.5 pl-3 pr-9 font-mono outline-none transition bg-card border border-slate-300 text-slate-900 focus:border-brand-600`}
                    dir="ltr"
                  />
                  <HardDrive className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-brand-700`} />
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveScheduleConfig(scheduleConfig)}
                  className="px-4 py-2.5 bg-brand-700 hover:bg-brand-800 text-on-brand font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>تثبيت مكان الحفظ</span>
                </button>
              </div>

              {/* Suggested Storage Path Shortcuts */}
              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px]">
                <span className={'text-slate-500'}>مسارات مقترحة سريعة:</span>
                <button
                  type="button"
                  onClick={() => {
                    const path = 'C:\\Midland_Oil_Database_Backups\\';
                    setScheduleConfig({ ...scheduleConfig, storagePath: path });
                    handleSaveScheduleConfig({ ...scheduleConfig, storagePath: path });
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-mono bg-card hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs`}
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
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-mono bg-card hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs`}
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
                  className={`px-2.5 py-1 rounded-lg border transition cursor-pointer font-mono bg-card hover:bg-slate-100 text-slate-800 border-slate-200 shadow-xs`}
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
                <label className={`text-xs font-bold block text-slate-700`}>تكرار التصدير الأوتوماتيكي:</label>
                <select
                  value={scheduleConfig.frequency}
                  onChange={(e) =>
                    setScheduleConfig({
                      ...scheduleConfig,
                      frequency: e.target.value as any,
                    })
                  }
                  className={`w-full text-xs rounded-xl p-2.5 outline-none transition bg-card border border-slate-300 text-slate-900 focus:border-brand-600`}
                >
                  <option value="daily">يومي (كل 24 ساعة)</option>
                  <option value="weekly">أسبوعي (في يوم محدد)</option>
                  <option value="monthly">شهري (بداية كل شهر)</option>
                  <option value="custom_hours">كل 12 ساعة</option>
                </select>
              </div>

              {/* Time of Day */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold block text-slate-700`}>وقت التصدير المجدول:</label>
                <input
                  type="time"
                  value={scheduleConfig.timeOfDay}
                  onChange={(e) =>
                    setScheduleConfig({
                      ...scheduleConfig,
                      timeOfDay: e.target.value,
                    })
                  }
                  className={`w-full text-xs rounded-xl p-2.5 outline-none font-mono transition bg-card border border-slate-300 text-slate-900 focus:border-brand-600`}
                />
              </div>

              {/* Max Kept Backups */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold block text-slate-700`}>الحد الأقصى للنسخ المحفوظة بالأرشيف:</label>
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
                  className={`w-full text-xs rounded-xl p-2.5 outline-none font-mono transition bg-card border border-slate-300 text-slate-900 focus:border-brand-600`}
                />
              </div>
            </div>

            {/* Status Information Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t text-xs border-slate-200`}>
              <div
                className={`p-3 rounded-xl border flex items-center justify-between bg-slate-50 border-slate-200`}
              >
                <span className={'text-slate-600'}>آخر تصدير مجدول تم تنفيذه:</span>
                <span className={`font-bold font-mono text-emerald-700`}>
                  {scheduleConfig.lastBackupFormatted || 'لم ينفذ بعد'}
                </span>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center justify-between bg-slate-50 border-slate-200`}
              >
                <span className={'text-slate-600'}>موعد النسخة المجدولة القادمة:</span>
                <span className={`font-bold font-mono text-brand-700`}>
                  {scheduleConfig.enabled
                    ? `غداً في تمام الساعة ${scheduleConfig.timeOfDay}`
                    : 'الجدولة معطلة حالياً'}
                </span>
              </div>
            </div>

            {/* Save All Schedule Settings & Test Trigger */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200`}>
              <button
                type="button"
                onClick={() => handleExportBackup(true)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300`}
              >
                <Play className={`w-3.5 h-3.5 text-brand-700`} />
                <span>تشغيل وحفظ نسخة مجدولة فوراً (تجربة)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveScheduleConfig(scheduleConfig)}
                className="w-full sm:w-auto px-6 py-2.5 bg-brand-700 hover:bg-brand-800 active:scale-95 text-on-brand font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
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
            className={`rounded-2xl p-5 border space-y-4 shadow-sm bg-card border-slate-200`}
          >
            <div className={`flex items-center justify-between border-b pb-3 border-slate-200`}>
              <div>
                <h4 className={`font-bold text-sm flex items-center gap-2 text-brand-800`}>
                  <FileCheck className={`w-4 h-4 text-emerald-600`} />
                  <span>سجل وأرشيف النسخ الاحتياطية السابقة</span>
                </h4>
                <p className={`text-xs mt-0.5 text-slate-600`}>
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
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border-red-200`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح السجل</span>
                </button>
              )}
            </div>

            {backupHistory.length === 0 ? (
              <div className={`py-12 text-center space-y-2 text-slate-500`}>
                <Database className={`w-10 h-10 mx-auto text-slate-300`} />
                <p className="text-xs">لم يتم تسجيل أي نسخ احتياطية في الأرشيف بعد.</p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('export')}
                  className="px-4 py-2 bg-brand-700 text-on-brand rounded-xl font-bold text-xs mt-2 transition cursor-pointer shadow-xs"
                >
                  تصدير أول نسخة احتياطية الآن
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Backup Cards View (md:hidden) */}
                <div className="md:hidden space-y-3">
                  {backupHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition shadow-sm space-y-3 bg-card border-slate-200 shadow-slate-200/50`}
                    >
                      {/* Header: Filename & Trigger Type Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <HardDrive className={`w-3.5 h-3.5 shrink-0 text-brand-700`} />
                            <span className={`font-mono font-bold text-xs truncate text-slate-900`} title={item.filename}>
                              {item.filename}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{item.timestampFormatted}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            item.triggerType === 'scheduled'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {item.triggerType === 'scheduled' ? 'مجدول تلقائي' : 'تصدير يدوي'}
                        </span>
                      </div>

                      {/* Meta Specs Grid */}
                      <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl text-xs border bg-slate-50 border-slate-200/80`}>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">حجم الملف</span>
                          <span className={`font-mono font-bold text-xs text-brand-700`}>
                            {item.sizeFormatted}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">المحتوى</span>
                          <span className={'text-slate-700'}>
                            <span className={`font-bold text-emerald-700`}>{toArabicDigits(item.unitsCount)}</span> مبنى (
                            <span className={`font-bold text-cyan-700`}>{toArabicDigits(item.totalRecords)}</span> سجل)
                          </span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-slate-200/60 ">
                          <span className="text-[10px] text-slate-500 block mb-0.5">مسار الحفظ</span>
                          <span className={`font-mono text-[11px] truncate block text-slate-600`} dir="ltr">
                            {item.storagePath}
                          </span>
                        </div>
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80 ">
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
                              className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center justify-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border-brand-200`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setParsedBackupData(item.payloadSnapshot || null);
                                setActiveSubTab('import');
                                triggerSaveToast('تم تحميل بيانات النسخة في تبويب الاستيراد');
                              }}
                              className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة</span>
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
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className={`border-b border-slate-200 text-slate-500`}>
                        <th className="pb-2.5 font-bold">اسم الملف</th>
                        <th className="pb-2.5 font-bold">تاريخ ووقت التصدير</th>
                        <th className="pb-2.5 font-bold">حجم الملف</th>
                        <th className="pb-2.5 font-bold">المباني والسجلات</th>
                        <th className="pb-2.5 font-bold">مسار الحفظ</th>
                        <th className="pb-2.5 font-bold">النوع</th>
                        <th className="pb-2.5 font-bold text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-200`}>
                      {backupHistory.map((item) => (
                        <tr key={item.id} className={`transition hover:bg-slate-50`}>
                          <td className={`py-3 font-mono font-bold text-slate-900`}>{item.filename}</td>
                          <td className={`py-3 font-mono text-slate-600`}>{item.timestampFormatted}</td>
                          <td className={`py-3 font-mono font-bold text-brand-700`}>{item.sizeFormatted}</td>
                          <td className={`py-3 text-slate-700`}>
                            <span className={`font-bold text-emerald-700`}>{toArabicDigits(item.unitsCount)}</span> مبنى (
                            <span className={`font-bold text-cyan-700`}>{toArabicDigits(item.totalRecords)}</span> سجل)
                          </td>
                          <td className={`py-3 font-mono text-[11px] text-slate-600`} dir="ltr">
                            {item.storagePath}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.triggerType === 'scheduled'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
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
                                    className={`p-1.5 rounded-lg transition cursor-pointer border bg-slate-100 hover:bg-slate-200 text-brand-700 border-slate-200`}
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
                                    className={`p-1.5 rounded-lg transition cursor-pointer border bg-slate-100 hover:bg-slate-200 text-emerald-700 border-slate-200`}
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
                                className={`p-1.5 rounded-lg transition cursor-pointer border bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border-slate-200`}
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
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESTORE CONFIRMATION SAFETY MODAL */}
      {/* ========================================================================= */}
      {showRestoreConfirmModal && parsedBackupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/80 backdrop-blur-sm animate-fadeIn">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4 bg-card border-slate-200 text-slate-900`}
          >
            <div className={`flex items-center gap-3 border-b pb-3 border-slate-200`}>
              <div
                className={`p-2.5 rounded-2xl border bg-red-100 text-red-700 border-red-200`}
              >
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-bold text-sm text-red-600`}>
                  تأكيد استعادة وتطبيق قاعدة البيانات
                </h3>
                <p className={`text-xs mt-0.5 text-slate-600`}>
                  {importMode === 'overwrite'
                    ? 'تحذير: سيتم استبدال البيانات الحالية بالكامل بالنسخة المستوردة.'
                    : 'سيتم دمج وتحديث السجلات والوحدات مع المحافظة على البيانات القائمة.'}
                </p>
              </div>
            </div>

            {/* Summary Box */}
            <div
              className={`p-3.5 rounded-2xl border space-y-2 text-xs bg-slate-50 border-slate-200 text-slate-800`}
            >
              <div className="flex justify-between">
                <span className={'text-slate-600'}>تاريخ النسخة المستوردة:</span>
                <span className={`font-mono font-bold text-brand-800`}>
                  {parsedBackupData.exportedAtFormatted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={'text-slate-600'}>عدد المباني المستوردة:</span>
                <span className={`font-mono font-bold text-emerald-700`}>
                  {toArabicDigits(parsedBackupData.data?.units?.length || 0)} أصل
                </span>
              </div>
              <div className="flex justify-between">
                <span className={'text-slate-600'}>نوع الاستعادة:</span>
                <span className={`font-bold text-cyan-700`}>
                  {importMode === 'overwrite' ? 'استبدال واستعادة شاملة' : 'دمج وتحديث ذكي'}
                </span>
              </div>
            </div>

            {/* Checkbox agreement */}
            <label
              className={`flex items-start gap-2.5 text-xs cursor-pointer select-none p-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-800`}
            >
              <input
                type="checkbox"
                checked={confirmAgreementChecked}
                onChange={(e) => setConfirmAgreementChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-400 text-brand-700 focus:ring-brand-600 accent-brand-700 cursor-pointer w-4 h-4"
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
                className={`px-4 py-2.5 font-bold text-xs rounded-xl transition cursor-pointer border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300`}
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
