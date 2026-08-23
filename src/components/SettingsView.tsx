import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Plus,
  PlusCircle,
  Edit2,
  Trash2,
  ShieldCheck,
  Building2,
  MapPin,
  Layers,
  Users,
  Search,
  Box,
  Zap,
  Activity,
  Database,
  ToggleLeft,
  ToggleRight,
  Palette,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Lock,
  Globe,
  Building,
  Copyright,
  Sparkles,
  FileText,
  UserCheck,
  Phone,
  Mail,
  ShieldAlert,
  RefreshCw,
  Wrench,
  Upload,
  FileImage,
  X,
  Network,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';

import {
  UnitAsset,
  ReferenceUnitType,
  GovernorateRef,
  OilfieldRef,
  SiteRef,
  RoomTypeRef,
  EquipmentTypeRef,
  MaintenanceDepartmentRef,
  SystemBranding,
  SystemUser,
  UserAccountRole,
  AuditLogItem,
  MaintenanceRequest,
  OccupancyRecord,
  OrgEntity,
  PeriodicInspectionSchedule,
  DatabaseBackupPayload,
} from '../types';
import { OrgStructureBuilder } from './OrgStructureBuilder';
import { DatabaseBackupManager } from './DatabaseBackupManager';
import { toArabicDigits, getServerDateTimeFormatted, getServerTimestamp } from '../utils/arabicUtils';

interface SettingsViewProps {
  units: UnitAsset[];
  branding: SystemBranding;
  onUpdateBranding: (branding: SystemBranding) => void;

  currentUser?: SystemUser | null;
  users: SystemUser[];
  onAddUser: (user: SystemUser) => void;
  onUpdateUser: (user: SystemUser) => void;
  onDeleteUser: (userId: string) => void;
  onToggleUserStatus: (userId: string) => void;

  maintenanceRequests?: MaintenanceRequest[];
  occupancyRecords?: OccupancyRecord[];
  periodicInspections?: PeriodicInspectionSchedule[];

  onRestoreDatabase?: (
    payload: DatabaseBackupPayload,
    mode: 'overwrite' | 'merge',
    onComplete?: () => void
  ) => void;

  auditLogs: AuditLogItem[];
  onAddAuditLog: (log: AuditLogItem) => void;
  onClearAuditLogs: () => void;

  unitTypes: ReferenceUnitType[];
  governorates: GovernorateRef[];
  oilfields: OilfieldRef[];
  sites: SiteRef[];
  roomTypes: RoomTypeRef[];
  equipmentTypes: EquipmentTypeRef[];
  maintenanceDepartments?: MaintenanceDepartmentRef[];

  orgEntities?: OrgEntity[];
  onAddOrgEntity?: (newEntity: OrgEntity) => void;
  onUpdateOrgEntity?: (updatedEntity: OrgEntity) => void;
  onDeleteOrgEntity?: (id: string) => void;
  onToggleOrgEntityStatus?: (id: string) => void;
  onResetOrgEntitiesToDefault?: () => void;

  onAddUnitType: (type: ReferenceUnitType) => void;
  onUpdateUnitType: (type: ReferenceUnitType) => void;
  onDeleteUnitType: (code: string) => void;

  onAddGovernorate: (gov: GovernorateRef) => void;
  onUpdateGovernorate: (gov: GovernorateRef) => void;
  onDeleteGovernorate: (id: string) => void;

  onAddOilfield: (field: OilfieldRef) => void;
  onUpdateOilfield: (field: OilfieldRef) => void;
  onDeleteOilfield: (id: string) => void;

  onAddSite: (site: SiteRef) => void;
  onUpdateSite: (site: SiteRef) => void;
  onDeleteSite: (id: string) => void;

  onAddRoomType: (rt: RoomTypeRef) => void;
  onUpdateRoomType: (rt: RoomTypeRef) => void;
  onDeleteRoomType: (id: string) => void;

  onAddEquipmentType: (eq: EquipmentTypeRef) => void;
  onUpdateEquipmentType: (eq: EquipmentTypeRef) => void;
  onDeleteEquipmentType: (id: string) => void;

  onAddMaintenanceDepartment?: (dept: MaintenanceDepartmentRef) => void;
  onUpdateMaintenanceDepartment?: (dept: MaintenanceDepartmentRef) => void;
  onDeleteMaintenanceDepartment?: (id: string) => void;
  onToggleMaintenanceDepartmentStatus?: (id: string) => void;
  onClearMaintenanceDepartments?: () => void;
  onResetMaintenanceDepartmentsToDefault?: () => void;

  onToggleStatus: (
    category: 'unitType' | 'governorate' | 'oilfield' | 'site' | 'roomType' | 'equipmentType',
    idOrCode: string
  ) => void;

  // Custom Granular Resets
  onClearUnits: () => void;
  onResetUnitsToDefault: () => void;

  onClearOilfields: () => void;
  onResetOilfieldsToDefault: () => void;

  onClearUnitTypes: () => void;
  onResetUnitTypesToDefault: () => void;

  onClearGovernorates: () => void;
  onResetGovernoratesToDefault: () => void;

  onClearSites: () => void;
  onResetSitesToDefault: () => void;

  onClearUsers: () => void;
  onResetUsersToDefault: () => void;

  onClearRoomTypes: () => void;
  onResetRoomTypesToDefault: () => void;

  onClearEquipmentTypes: () => void;
  onResetEquipmentTypesToDefault: () => void;

  onClearMaintenanceRequests?: () => void;
  onResetMaintenanceRequestsToDefault?: () => void;

  onClearOccupancyRecords?: () => void;
  onResetOccupancyRecordsToDefault?: () => void;

  onFactoryReset: () => void;
  theme?: 'dark' | 'light';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  units,
  branding,
  onUpdateBranding,
  currentUser,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onToggleUserStatus,
  maintenanceRequests = [],
  occupancyRecords = [],
  periodicInspections = [],
  onRestoreDatabase,
  auditLogs,
  onAddAuditLog,
  onClearAuditLogs,
  unitTypes,
  governorates,
  oilfields,
  sites,
  roomTypes,
  equipmentTypes,
  maintenanceDepartments = [],
  orgEntities = [],
  onAddOrgEntity,
  onUpdateOrgEntity,
  onDeleteOrgEntity,
  onToggleOrgEntityStatus,
  onResetOrgEntitiesToDefault,
  onAddUnitType,
  onUpdateUnitType,
  onDeleteUnitType,
  onAddGovernorate,
  onUpdateGovernorate,
  onDeleteGovernorate,
  onAddOilfield,
  onUpdateOilfield,
  onDeleteOilfield,
  onAddSite,
  onUpdateSite,
  onDeleteSite,
  onAddRoomType,
  onUpdateRoomType,
  onDeleteRoomType,
  onAddEquipmentType,
  onUpdateEquipmentType,
  onDeleteEquipmentType,
  onAddMaintenanceDepartment,
  onUpdateMaintenanceDepartment,
  onDeleteMaintenanceDepartment,
  onToggleMaintenanceDepartmentStatus,
  onClearMaintenanceDepartments,
  onResetMaintenanceDepartmentsToDefault,
  onToggleStatus,
  onClearUnits,
  onResetUnitsToDefault,
  onClearOilfields,
  onResetOilfieldsToDefault,
  onClearUnitTypes,
  onResetUnitTypesToDefault,
  onClearGovernorates,
  onResetGovernoratesToDefault,
  onClearSites,
  onResetSitesToDefault,
  onClearUsers,
  onResetUsersToDefault,
  onClearRoomTypes,
  onResetRoomTypesToDefault,
  onClearEquipmentTypes,
  onResetEquipmentTypesToDefault,
  onClearMaintenanceRequests,
  onResetMaintenanceRequestsToDefault,
  onClearOccupancyRecords,
  onResetOccupancyRecordsToDefault,
  onFactoryReset,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<
    | 'branding'
    | 'org'
    | 'users'
    | 'governorates'
    | 'oilfields'
    | 'sites'
    | 'unit_types'
    | 'rooms'
    | 'equipment'
    | 'maintenance_depts'
    | 'backup_restore'
    | 'audit'
    | 'reset'
  >('branding');

  // Success Notification banner
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Custom Reset Confirmation Modal State
  const [customResetModal, setCustomResetModal] = useState<{
    title: string;
    description: string;
    actionType: 'clear' | 'resetDefault';
    onConfirm: () => void;
  } | null>(null);

  const triggerSaveToast = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 3500);
  };

  // Branding Form State
  const [brandingForm, setBrandingForm] = useState<SystemBranding>({ ...branding });
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setBrandingForm({ ...branding });
  }, [branding]);

  const handleLogoFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالحة (PNG, JPG, SVG, WebP, GIF)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً. يرجى اختيار صورة بحجم أقل من 10 ميغابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      // For SVG vector logos, keep original content
      if (file.type.includes('svg')) {
        setBrandingForm((prev) => ({ ...prev, logoUrl: result }));
        triggerSaveToast('تم رفع لوكو SVG بنجاح (اضغط حفظ الهوية لتثبيته)');
        return;
      }

      // Optimize raster images (PNG, JPG, WebP) to max 350x350
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 350;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png');
          setBrandingForm((prev) => ({ ...prev, logoUrl: compressedDataUrl }));
          triggerSaveToast('تم رفع ومعالجة صورة اللوكو بنجاح (اضغط حفظ الهوية لتثبيت الشعار)');
        } else {
          setBrandingForm((prev) => ({ ...prev, logoUrl: result }));
          triggerSaveToast('تم تحميل صورة اللوكو بنجاح (احفظ الهوية لتثبيت التغيير)');
        }
      };
      img.onerror = () => {
        setBrandingForm((prev) => ({ ...prev, logoUrl: result }));
        triggerSaveToast('تم تحميل صورة اللوكو بنجاح');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBranding(brandingForm);
    triggerSaveToast('تم تحديث الهوية البصرية وشعار النظام المعتمد بنجاح!');
  };

  // Modal State Management
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); // Null for create, object for edit

  // Confirm Delete Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type:
      | 'governorate'
      | 'oilfield'
      | 'site'
      | 'unitType'
      | 'roomType'
      | 'equipmentType'
      | 'maintenanceDepartment'
      | 'user';
    id: string;
    name: string;
  } | null>(null);

  // Reset Confirm Modal State
  const [showResetModal, setShowResetModal] = useState(false);

  // Manual Audit Log Modal State
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [newLogAction, setNewLogAction] = useState('');
  const [newLogField, setNewLogField] = useState('إعدادات النظام');
  const [newLogUser, setNewLogUser] = useState('أحمد كريم');

  // Search State for Audit Logs
  const [auditSearch, setAuditSearch] = useState('');

  // Universal Form Field States for Add/Edit
  // Governorates
  const [govNameAr, setGovNameAr] = useState('');
  const [govNameEn, setGovNameEn] = useState('');
  const [govCode, setGovCode] = useState('');

  // Oilfields
  const [fldGovId, setFldGovId] = useState('');
  const [fldNameAr, setFldNameAr] = useState('');
  const [fldNameEn, setFldNameEn] = useState('');
  const [fldCode, setFldCode] = useState('');

  // Sites
  const [siteFieldId, setSiteFieldId] = useState('');
  const [siteNameAr, setSiteNameAr] = useState('');
  const [siteNameEn, setSiteNameEn] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [siteLat, setSiteLat] = useState('32.6189');
  const [siteLng, setSiteLng] = useState('45.7531');

  // Unit Types
  const [utCode, setUtCode] = useState('');
  const [utNameAr, setUtNameAr] = useState('');
  const [utNameEn, setUtNameEn] = useState('');
  const [utMultiStory, setUtMultiStory] = useState(true);
  const [utDefaultRoof, setUtDefaultRoof] = useState('خرسانة مسلحة');

  // Room Types
  const [rtCode, setRtCode] = useState('');
  const [rtNameAr, setRtNameAr] = useState('');
  const [rtColorHex, setRtColorHex] = useState('#38bdf8');

  // Equipment Types
  const [eqCode, setEqCode] = useState('');
  const [eqNameAr, setEqNameAr] = useState('');
  const [eqNameEn, setEqNameEn] = useState('');
  const [eqGeometry, setEqGeometry] = useState<'box' | 'cylinder' | 'wall_panel' | 'camera' | 'pump'>('box');
  const [eqCapacity, setEqCapacity] = useState('قياسي');

  // Maintenance Departments
  const [mdeptCode, setMdeptCode] = useState('');
  const [mdeptNameAr, setMdeptNameAr] = useState('');
  const [mdeptNameEn, setMdeptNameEn] = useState('');
  const [mdeptDescription, setMdeptDescription] = useState('');

  // Inline User Form State (Horizontal Design)
  const [showUserInlineForm, setShowUserInlineForm] = useState(false);
  const [userFormEditingId, setUserFormEditingId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userAccountName, setUserAccountName] = useState('');
  const [userPassword, setUserPassword] = useState('123');
  const [userRole, setUserRole] = useState<UserAccountRole>('مشغل النظام');
  const [userPhone, setUserPhone] = useState('');
  const [userMaintDept, setUserMaintDept] = useState<string>('');
  const [userStatus, setUserStatus] = useState<'active' | 'disabled'>('active');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [showPasswordsTable, setShowPasswordsTable] = useState(false);

  // Open Horizontal User Form for Create
  const handleOpenCreateUserInline = () => {
    setUserFormEditingId(null);
    setUserDisplayName('');
    setUserAccountName('');
    setUserPassword('123');
    setUserRole('مشغل النظام');
    setUserPhone('');
    setUserMaintDept(maintenanceDepartments[0]?.nameAr || 'الصيانة العامة');
    setUserStatus('active');
    setUserFormError(null);
    setShowFormPassword(false);
    setShowUserInlineForm(true);
  };

  // Open Horizontal User Form for Edit
  const handleOpenEditUserInline = (usr: SystemUser) => {
    const isPrimaryAdmin = usr.id === 'USR-101' || usr.username === 'admin';
    const isCurrentAdmin = currentUser?.id === 'USR-101' || currentUser?.username === 'admin';

    if (isPrimaryAdmin && !isCurrentAdmin) {
      triggerSaveToast('تنبيه: حساب مدير النظام الأساسي (admin) محمي، ولا يمكن تعديله إلا من خلال تسجيل الدخول بحساب admin نفسه');
      return;
    }

    setUserFormEditingId(usr.id);
    setUserDisplayName(usr.name || '');
    setUserAccountName(usr.username || usr.email?.split('@')[0] || '');
    setUserPassword(usr.password || '123');
    setUserRole(usr.role || 'مشغل النظام');
    setUserPhone(usr.phone || '');
    setUserMaintDept(usr.maintenanceDepartment || maintenanceDepartments[0]?.nameAr || 'الصيانة العامة');
    setUserStatus(usr.status || 'active');
    setUserFormError(null);
    setShowFormPassword(false);
    setShowUserInlineForm(true);
  };

  // Cancel User Inline Form
  const handleCancelUserInline = () => {
    setShowUserInlineForm(false);
    setUserFormEditingId(null);
    setUserFormError(null);
  };

  // Save User (Create or Update from Horizontal Form)
  const handleSaveUserInline = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);

    const cleanDisplayName = userDisplayName.trim();
    const cleanAccountName = userAccountName.trim().toLowerCase().replace(/\s+/g, '.');
    const cleanPassword = userPassword.trim();
    const cleanPhone = userPhone.trim();

    if (!cleanDisplayName) {
      setUserFormError('يرجى إدخال اسم المستخدم ليظهر للمستخدم في النظام');
      return;
    }

    if (!cleanAccountName) {
      setUserFormError('يرجى إدخال اسم الحساب لتسجيل الدخول به');
      return;
    }

    if (!cleanPassword) {
      setUserFormError('يرجى تحديد كلمة المرور للحساب');
      return;
    }

    // Protection check for primary admin
    if (userFormEditingId === 'USR-101') {
      const isCurrentAdmin = currentUser?.id === 'USR-101' || currentUser?.username === 'admin';
      if (!isCurrentAdmin) {
        setUserFormError('لا يمكن تعديل بيانات مدير النظام الأساسي إلا بواسطة حساب admin نفسه');
        return;
      }
    }

    // Check duplicate username
    const duplicate = users.find(
      (u) =>
        u.id !== userFormEditingId &&
        ((u.username && u.username.toLowerCase() === cleanAccountName) ||
          (u.email && u.email.toLowerCase() === cleanAccountName))
    );

    if (duplicate) {
      setUserFormError(`اسم الحساب «${cleanAccountName}» محجوز مسبقاً لمستخدم آخر. يرجى اختيار اسم حساب مختلف`);
      return;
    }

    if (userFormEditingId) {
      const existing = users.find((u) => u.id === userFormEditingId);
      onUpdateUser({
        ...(existing || { id: userFormEditingId, lastActive: 'الآن' }),
        id: userFormEditingId,
        name: cleanDisplayName,
        username: cleanAccountName,
        password: cleanPassword,
        role: userFormEditingId === 'USR-101' ? 'مدير النظام' : userRole,
        phone: cleanPhone,
        maintenanceDepartment: userRole === 'موظف الصيانة' ? (userMaintDept || maintenanceDepartments[0]?.nameAr || 'الصيانة العامة') : undefined,
        status: userFormEditingId === 'USR-101' ? 'active' : userStatus,
        lastActive: existing?.lastActive || 'الآن',
      });
      triggerSaveToast(`تم تحديث بيانات وصلاحيات الحساب «${cleanDisplayName}» بنجاح`);
    } else {
      onAddUser({
        id: `USR-${Date.now()}`,
        name: cleanDisplayName,
        username: cleanAccountName,
        password: cleanPassword,
        role: userRole,
        phone: cleanPhone,
        maintenanceDepartment: userRole === 'موظف الصيانة' ? (userMaintDept || maintenanceDepartments[0]?.nameAr || 'الصيانة العامة') : undefined,
        status: userStatus,
        lastActive: 'الآن',
      });
      triggerSaveToast(`تم إنشاء حساب الدخول الجديد «${cleanDisplayName}» بنجاح`);
    }

    setShowUserInlineForm(false);
    setUserFormEditingId(null);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingItem(null);

    // Reset Form Fields
    setGovNameAr('');
    setGovNameEn('');
    setGovCode('');

    setFldGovId(governorates[0]?.id || '');
    setFldNameAr('');
    setFldNameEn('');
    setFldCode('');

    setSiteFieldId(oilfields[0]?.id || '');
    setSiteNameAr('');
    setSiteNameEn('');
    setSiteCode('');
    setSiteLat('32.6189');
    setSiteLng('45.7531');

    setUtCode('');
    setUtNameAr('');
    setUtNameEn('');
    setUtMultiStory(true);

    setRtCode('');
    setRtNameAr('');
    setRtColorHex('#38bdf8');

    setEqCode('');
    setEqNameAr('');
    setEqNameEn('');
    setEqGeometry('box');
    setEqCapacity('قياسي');

    setMdeptCode('');
    setMdeptNameAr('');
    setMdeptNameEn('');
    setMdeptDescription('');

    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);

    if (activeTab === 'governorates') {
      setGovNameAr(item.nameAr || '');
      setGovNameEn(item.nameEn || '');
      setGovCode(item.code || '');
    } else if (activeTab === 'oilfields') {
      setFldGovId(item.governorateId || '');
      setFldNameAr(item.nameAr || '');
      setFldNameEn(item.nameEn || '');
      setFldCode(item.code || '');
    } else if (activeTab === 'sites') {
      setSiteFieldId(item.fieldId || '');
      setSiteNameAr(item.nameAr || '');
      setSiteNameEn(item.nameEn || '');
      setSiteCode(item.code || '');
      setSiteLat(item.coordinates?.lat?.toString() || '32.6189');
      setSiteLng(item.coordinates?.lng?.toString() || '45.7531');
    } else if (activeTab === 'unit_types') {
      setUtCode(item.code || '');
      setUtNameAr(item.nameAr || '');
      setUtNameEn(item.nameEn || '');
      setUtMultiStory(item.multiStory ?? true);
      setUtDefaultRoof(item.defaultRoof || 'خرسانة مسلحة');
    } else if (activeTab === 'rooms') {
      setRtCode(item.code || '');
      setRtNameAr(item.nameAr || '');
      setRtColorHex(item.colorHex || '#38bdf8');
    } else if (activeTab === 'equipment') {
      setEqCode(item.code || '');
      setEqNameAr(item.nameAr || '');
      setEqNameEn(item.nameEn || '');
      setEqGeometry(item.renderGeometry || 'box');
      setEqCapacity(item.defaultCapacity || 'قياسي');
    } else if (activeTab === 'maintenance_depts') {
      setMdeptCode(item.code || '');
      setMdeptNameAr(item.nameAr || '');
      setMdeptNameEn(item.nameEn || '');
      setMdeptDescription(item.description || '');
    }

    setShowModal(true);
  };

  // Handle Form Submit (Create or Update)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'governorates') {
      if (!govNameAr) return;
      if (editingItem) {
        onUpdateGovernorate({
          ...editingItem,
          nameAr: govNameAr,
          nameEn: govNameEn || govNameAr,
          code: (govCode || govNameAr.slice(0, 3)).toUpperCase(),
        });
        triggerSaveToast('تم تحديث بيانات المحافظة بنجاح');
      } else {
        onAddGovernorate({
          id: `GOV-${Date.now()}`,
          nameAr: govNameAr,
          nameEn: govNameEn || govNameAr,
          code: (govCode || govNameAr.slice(0, 3)).toUpperCase(),
          status: 'active',
        });
        triggerSaveToast('تم إضافة المحافظة الجديدة بنجاح');
      }
    } else if (activeTab === 'oilfields') {
      if (!fldNameAr || !fldGovId) return;
      if (editingItem) {
        onUpdateOilfield({
          ...editingItem,
          governorateId: fldGovId,
          nameAr: fldNameAr,
          nameEn: fldNameEn || fldNameAr,
          code: (fldCode || fldNameAr.slice(0, 3)).toUpperCase(),
        });
        triggerSaveToast('تم تحديث بيانات الحقل النفطي');
      } else {
        onAddOilfield({
          id: `FLD-${Date.now()}`,
          governorateId: fldGovId,
          nameAr: fldNameAr,
          nameEn: fldNameEn || fldNameAr,
          code: (fldCode || fldNameAr.slice(0, 3)).toUpperCase(),
          status: 'active',
        });
        triggerSaveToast('تم إضافة الحقل النفطي الجديد');
      }
    } else if (activeTab === 'sites') {
      if (!siteNameAr || !siteFieldId) return;
      if (editingItem) {
        onUpdateSite({
          ...editingItem,
          fieldId: siteFieldId,
          nameAr: siteNameAr,
          nameEn: siteNameEn || siteNameAr,
          code: (siteCode || siteNameAr.slice(0, 3)).toUpperCase(),
          coordinates: { lat: parseFloat(siteLat) || 32.6189, lng: parseFloat(siteLng) || 45.7531 },
        });
        triggerSaveToast('تم تحديث بيانات الموقع / المنشأة');
      } else {
        onAddSite({
          id: `SITE-${Date.now()}`,
          fieldId: siteFieldId,
          nameAr: siteNameAr,
          nameEn: siteNameEn || siteNameAr,
          code: (siteCode || siteNameAr.slice(0, 3)).toUpperCase(),
          coordinates: { lat: parseFloat(siteLat) || 32.6189, lng: parseFloat(siteLng) || 45.7531 },
          totalUnits: 0,
          status: 'active',
        });
        triggerSaveToast('تم إضافة المنشأة الجديدة');
      }
    } else if (activeTab === 'unit_types') {
      if (!utCode || !utNameAr) return;
      const itemToSave: ReferenceUnitType = {
        code: utCode.toUpperCase(),
        nameAr: utNameAr,
        nameEn: utNameEn || utNameAr,
        multiStory: utMultiStory,
        defaultRoof: utDefaultRoof,
        status: editingItem ? editingItem.status : 'active',
      };

      if (editingItem) {
        onUpdateUnitType(itemToSave);
        triggerSaveToast('تم تحديث نوع المبنى المرجعي');
      } else {
        onAddUnitType(itemToSave);
        triggerSaveToast('تم إضافة نوع المبنى المرجعي الجديد');
      }
    } else if (activeTab === 'rooms') {
      if (!rtNameAr) return;
      if (editingItem) {
        onUpdateRoomType({
          ...editingItem,
          code: rtCode || editingItem.code,
          nameAr: rtNameAr,
          colorHex: rtColorHex,
        });
        triggerSaveToast('تم تحديث تصنيف الغرفة');
      } else {
        onAddRoomType({
          id: `RT-${Date.now()}`,
          code: rtCode || `rt_${Date.now()}`,
          nameAr: rtNameAr,
          colorHex: rtColorHex,
          iconName: 'Box',
          status: 'active',
        });
        triggerSaveToast('تم إضافة تصنيف الغرفة الجديد');
      }
    } else if (activeTab === 'equipment') {
      if (!eqNameAr) return;
      if (editingItem) {
        onUpdateEquipmentType({
          ...editingItem,
          code: eqCode || editingItem.code,
          nameAr: eqNameAr,
          nameEn: eqNameEn || eqNameAr,
          renderGeometry: eqGeometry,
          defaultCapacity: eqCapacity,
        });
        triggerSaveToast('تم تحديث بيانات المعدة');
      } else {
        onAddEquipmentType({
          id: `EQT-${Date.now()}`,
          code: eqCode || `eq_${Date.now()}`,
          nameAr: eqNameAr,
          nameEn: eqNameEn || eqNameAr,
          iconName: 'Zap',
          renderGeometry: eqGeometry,
          defaultCapacity: eqCapacity,
          status: 'active',
        });
        triggerSaveToast('تم إضافة المعدة المرجعية الجديدة');
      }
    } else if (activeTab === 'maintenance_depts') {
      if (!mdeptNameAr) return;
      if (editingItem) {
        onUpdateMaintenanceDepartment?.({
          ...editingItem,
          nameAr: mdeptNameAr,
          nameEn: mdeptNameEn || mdeptNameAr,
          code: (mdeptCode || mdeptNameAr.slice(0, 4)).toUpperCase(),
          description: mdeptDescription,
        });
        triggerSaveToast('تم تحديث بيانات جهة الصيانة بنجاح');
      } else {
        onAddMaintenanceDepartment?.({
          id: `MAINT-DEPT-${Date.now()}`,
          nameAr: mdeptNameAr,
          nameEn: mdeptNameEn || mdeptNameAr,
          code: (mdeptCode || mdeptNameAr.slice(0, 4)).toUpperCase(),
          description: mdeptDescription,
          status: 'active',
        });
        triggerSaveToast('تم إضافة جهة الصيانة الجديدة بنجاح');
      }
    }

    setShowModal(false);
  };

  // Perform Delete
  const handleExecuteDelete = () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;

    if (type === 'user' && id === 'USR-101') {
      triggerSaveToast('خطأ: لا يمكن حذف حساب مدير النظام الأساسي (admin) نهائياً');
      setDeleteConfirm(null);
      return;
    }

    if (type === 'governorate') onDeleteGovernorate(id);
    else if (type === 'oilfield') onDeleteOilfield(id);
    else if (type === 'site') onDeleteSite(id);
    else if (type === 'unitType') onDeleteUnitType(id);
    else if (type === 'roomType') onDeleteRoomType(id);
    else if (type === 'equipmentType') onDeleteEquipmentType(id);
    else if (type === 'maintenanceDepartment') onDeleteMaintenanceDepartment?.(id);
    else if (type === 'user') onDeleteUser(id);

    triggerSaveToast(`تم حذف العنصر بنجاح`);
    setDeleteConfirm(null);
  };

  // Manual Audit Log Submit
  const handleAddManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogAction) return;

    const newLog: AuditLogItem = {
      id: `LOG-${getServerTimestamp()}`,
      unitCode: 'النظام العام',
      timestamp: getServerDateTimeFormatted(),
      action: newLogAction,
      user: newLogUser,
      userInitials: newLogUser.split(' ').map((n) => n[0]).join('').slice(0, 2) || 'SYS',
      affectedField: newLogField,
      previousValue: '--',
      newValue: 'تسجيل يدوي من الإعدادات',
    };

    onAddAuditLog(newLog);
    triggerSaveToast('تم تسجيل النشاط في سجل التغييرات المركزي');
    setShowAddLogModal(false);
    setNewLogAction('');
  };

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = (auditSearch || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.user && log.user.toLowerCase().includes(q)) ||
      (log.unitCode && log.unitCode.toLowerCase().includes(q)) ||
      (log.affectedField && log.affectedField.toLowerCase().includes(q)) ||
      (log.previousValue && log.previousValue.toLowerCase().includes(q)) ||
      (log.newValue && log.newValue.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-2xl border border-emerald-300 flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className={`rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition ${
          isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div>
          <h2
            className={`text-lg font-bold flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            <Settings className="w-5 h-5 text-amber-500" />
            <span>إعدادات النظام</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            تخصيص اسم النظام والشركة المالك، إدارة المستخدمين والمحافظات والحقول والدليل المرجعي الكامل مع التعديل والحذف
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Navigation Tabs Sidebar (3 cols) */}
        <div
          className={`lg:col-span-3 rounded-2xl p-3 shadow-lg space-y-1.5 text-xs border ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            إعدادات النظام العامة
          </div>

          <button
            onClick={() => setActiveTab('branding')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'branding'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Palette className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>الهوية البصرية واسم النظام</span>
            </span>
            <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
          </button>

          <button
            onClick={() => setActiveTab('org')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'org'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Network className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-500'}`} />
              <span>الهيكل التنظيمي للمؤسسة</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isLight
                  ? 'bg-slate-100 text-amber-800 border border-slate-200'
                  : 'bg-slate-950 text-amber-400'
              }`}
            >
              {orgEntities.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'users'
                ? isLight
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <span>إدارة المستخدمين والصلاحيات</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isLight
                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-slate-950 text-slate-400'
              }`}
            >
              {users.length}
            </span>
          </button>

          <div
            className={`px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            الجداول والدليل المرجعي
          </div>

          <button
            onClick={() => setActiveTab('governorates')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'governorates'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <MapPin className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
              <span>المحافظات العراقية</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
              }`}
            >
              {governorates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('oilfields')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'oilfields'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Database className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-500'}`} />
              <span>الحقول النفطية</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
              }`}
            >
              {oilfields.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sites')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'sites'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Building2 className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
              <span>المواقع والمنشآت الحقليّة</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
              }`}
            >
              {sites.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('unit_types')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'unit_types'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Box className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
              <span>أنواع المباني والكرفانات</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
              }`}
            >
              {unitTypes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'rooms'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className={`w-4 h-4 ${isLight ? 'text-pink-600' : 'text-pink-400'}`} />
              <span>تصنيفات الغرف والقاعات</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
              }`}
            >
              {roomTypes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('equipment')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'equipment'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>المعدات والملحقات المرفقة</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
              }`}
            >
              {equipmentTypes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance_depts')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'maintenance_depts'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Wrench className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>جهات وأقسام الصيانة</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
              }`}
            >
              {maintenanceDepartments.length}
            </span>
          </button>

          <div
            className={`px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            النسخ الاحتياطي والمراقبة
          </div>

          <button
            onClick={() => setActiveTab('backup_restore')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'backup_restore'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Database className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              <span>النسخ الاحتياطي واستعادة البيانات</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              شامل
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'audit'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${isLight ? 'text-teal-600' : 'text-teal-400'}`} />
              <span>سجل النشاطات والتغييرات</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'
              }`}
            >
              {auditLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reset')}
            className={`w-full text-right p-3 rounded-xl font-bold transition flex items-center justify-between cursor-pointer ${
              activeTab === 'reset'
                ? isLight
                  ? 'bg-red-100 text-red-900 border border-red-300'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                : isLight
                ? 'text-slate-600 hover:bg-red-50 hover:text-red-700'
                : 'text-slate-400 hover:bg-red-500/10 hover:text-red-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <RotateCcw className={`w-4 h-4 ${isLight ? 'text-red-600' : 'text-red-400'}`} />
              <span>استعادة ضبط المصنع</span>
            </span>
            <AlertTriangle className={`w-3.5 h-3.5 ${isLight ? 'text-red-600' : 'text-red-400'}`} />
          </button>
        </div>

        {/* Content Body Area (9 cols) */}
        <div
          className={`lg:col-span-9 rounded-2xl p-5 shadow-lg space-y-4 text-xs border ${
            isLight
              ? 'bg-white border-slate-200 shadow-slate-200/50 text-slate-800'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}
        >
          {/* TAB 0: Visual Identity & Branding */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-400" />
                    <span>التحكم بالهوية البصرية والملكية للنظام</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    تعديل المسميات الرسمية التي تظهر في شريط العنوان الأعلى، الهيدر، التقارير المطبوعة، وحقوق الملكية
                  </p>
                </div>
              </div>

              {/* Form & Live Preview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Controls */}
                <form onSubmit={handleSaveBranding} className="lg:col-span-7 space-y-4">
                  {/* LOGO UPLOAD & MANAGEMENT SECTION */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5 shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <label className="text-slate-200 font-bold text-xs flex items-center gap-2">
                        <FileImage className="w-4 h-4 text-amber-400" />
                        <span>شعار / لوكو النظام (System Logo):</span>
                      </label>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-bold">
                        تخزين دائم في قاعدة البيانات (Base64)
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* LOGO PREVIEW DISPLAY BOX */}
                      <div className="relative group shrink-0">
                        <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-dashed border-amber-500/30 flex items-center justify-center p-2 overflow-hidden shadow-inner relative">
                          {brandingForm.logoUrl ? (
                            <img
                              src={brandingForm.logoUrl}
                              alt="System Logo"
                              className="max-w-full max-h-full object-contain drop-shadow"
                            />
                          ) : (
                            <div className="text-center text-slate-500">
                              <ShieldCheck className="w-10 h-10 mx-auto text-amber-500/50 mb-1" />
                              <span className="text-[9px] block text-slate-400 font-semibold">الشعار الافتراضي</span>
                            </div>
                          )}
                        </div>

                        {brandingForm.logoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setBrandingForm({ ...brandingForm, logoUrl: undefined });
                              triggerSaveToast('تم إزالة اللوكو والعودة للشعار الافتراضي');
                            }}
                            className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1 shadow-md transition cursor-pointer"
                            title="حذف اللوكو"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* UPLOAD CONTROLS & INSTRUCTIONS */}
                      <div className="space-y-2 flex-1 w-full">
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleLogoFileUpload(e.dataTransfer.files[0]);
                            }
                          }}
                          className="border-2 border-dashed border-slate-800 hover:border-amber-500/60 bg-slate-900/80 hover:bg-slate-900 rounded-xl p-3 text-center transition cursor-pointer group"
                          onClick={() => logoFileInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            ref={logoFileInputRef}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleLogoFileUpload(e.target.files[0]);
                              }
                            }}
                            accept="image/*"
                            className="hidden"
                          />
                          <Upload className="w-6 h-6 mx-auto text-amber-500 group-hover:scale-110 transition mb-1" />
                          <span className="text-xs font-bold text-slate-200 block">
                            رفع صورة اللوكو من الحاسوب (أو اسحب الملف هنا)
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            يدعم PNG, JPG, WebP, SVG - يفضل خلفية شفافة (أقل من 5 ميغا)
                          </span>
                        </div>

                        {/* SAMPLE PRESET LOGOS */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-bold">شعارات نموذجية سريعة:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBrandingForm({
                                ...brandingForm,
                                logoUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&auto=format&fit=crop&q=80',
                              });
                              triggerSaveToast('تم اختيار الشعار الذهبي النموذجي');
                            }}
                            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-amber-400 px-2.5 py-1 rounded-lg border border-slate-800 font-bold transition cursor-pointer"
                          >
                            شعار نفط الوسط الذهبي
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBrandingForm({ ...brandingForm, logoUrl: undefined });
                              triggerSaveToast('تم العودة للدرع الافتراضي');
                            }}
                            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-800 font-semibold transition cursor-pointer"
                          >
                            درع السلامة الافتراضي
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>اسم النظام / التطبيق:</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={brandingForm.systemName}
                      onChange={(e) => setBrandingForm({ ...brandingForm, systemName: e.target.value })}
                      placeholder="السجل الرقمي الموحد للأصول الهندسية والإنشائية"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold focus:border-amber-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-sky-400" />
                        <span>الشركة / المؤسسة:</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={brandingForm.companyName}
                        onChange={(e) => setBrandingForm({ ...brandingForm, companyName: e.target.value })}
                        placeholder="شركة نفط الوسط"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>الوزارة / الجهة العليا:</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={brandingForm.ministryName}
                        onChange={(e) => setBrandingForm({ ...brandingForm, ministryName: e.target.value })}
                        placeholder="وزارة النفط العراقية"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-teal-400" />
                        <span>الدولة:</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={brandingForm.countryName}
                        onChange={(e) => setBrandingForm({ ...brandingForm, countryName: e.target.value })}
                        placeholder="جمهورية العراق"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>شعار الشارة (Subtext):</span>
                      </label>
                      <input
                        type="text"
                        value={brandingForm.logoSubtext || ''}
                        onChange={(e) => setBrandingForm({ ...brandingForm, logoSubtext: e.target.value })}
                        placeholder="عراق"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Copyright className="w-3.5 h-3.5 text-purple-400" />
                      <span>حقل حقوق الملكية الفكرية والطباعة:</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={brandingForm.copyrightText}
                      onChange={(e) => setBrandingForm({ ...brandingForm, copyrightText: e.target.value })}
                      placeholder="جميع الحقوق محفوظة © 2026 - شركة نفط الوسط"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-300"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ الهوية البصرية واللوكو بالنظام</span>
                    </button>
                  </div>
                </form>

                {/* Live Preview Card */}
                <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4 flex flex-col justify-between shadow-xl">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <Sparkles className="w-4 h-4" />
                        <span>معاينة الهوية البصرية الحية</span>
                      </div>
                      <span className="text-[10px] text-slate-400">تحديث مباشر</span>
                    </div>

                    {/* Simulated Header Bar */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                      {brandingForm.logoUrl ? (
                        <div className="w-9 h-9 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-center p-1 shadow-inner overflow-hidden shrink-0">
                          <img src={brandingForm.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 truncate">{brandingForm.companyName || 'الشركة'}</span>
                          {brandingForm.logoSubtext && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-bold shrink-0">
                              {brandingForm.logoSubtext}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{brandingForm.systemName || 'اسم النظام'}</p>
                      </div>
                    </div>

                    {/* Simulated Report Header */}
                    <div className="bg-white text-slate-950 rounded-xl p-3 space-y-1 shadow relative overflow-hidden">
                      {brandingForm.logoUrl && (
                        <img
                          src={brandingForm.logoUrl}
                          alt="Logo"
                          className="w-10 h-10 object-contain absolute right-2 top-2"
                        />
                      )}
                      <div className="text-[10px] font-bold text-slate-500 text-center">
                        {brandingForm.countryName} • {brandingForm.ministryName}
                      </div>
                      <div className="text-center font-black text-xs text-slate-900">
                        {brandingForm.companyName}
                      </div>
                      <div className="text-[10px] font-bold text-amber-700 text-center pt-1 border-t border-slate-200">
                        {brandingForm.systemName}
                      </div>
                    </div>
                  </div>

                  {/* Copyright Notice Box */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 text-center font-mono">
                    {brandingForm.copyrightText}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 0: Org Structure Builder */}
          {activeTab === 'org' && (
            <OrgStructureBuilder
              isLight={isLight}
              orgEntities={orgEntities}
              units={units}
              onAddOrgEntity={onAddOrgEntity || (() => {})}
              onUpdateOrgEntity={onUpdateOrgEntity || (() => {})}
              onDeleteOrgEntity={onDeleteOrgEntity || (() => {})}
              onToggleOrgEntityStatus={onToggleOrgEntityStatus || (() => {})}
              onResetOrgEntitiesToDefault={onResetOrgEntitiesToDefault}
            />
          )}

          {/* TAB 1: User Management (Horizontal In-Browser Design) */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Header and Toolbar */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3 ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}
              >
                <div>
                  <h3
                    className={`font-bold text-sm flex items-center gap-2 ${
                      isLight ? 'text-slate-900' : 'text-slate-100'
                    }`}
                  >
                    <Users className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    <span>إدارة حسابات المستخدمين وصلاحيات الدخول (RBAC)</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    إدارة حسابات الدخول، تحديد الصلاحيات، وتنشيط أو تعطيل الحسابات فورياً
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPasswordsTable(!showPasswordsTable)}
                    className={`font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title={showPasswordsTable ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور'}
                  >
                    <Eye className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                    <span>{showPasswordsTable ? 'إخفاء المرور' : 'كشف المرور'}</span>
                  </button>
                  <button
                    onClick={handleOpenCreateUserInline}
                    className={`font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer ${
                      showUserInlineForm && !userFormEditingId
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : isLight
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>إضافة حساب جديد</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Inline Account Creation & Editing Form */}
              {showUserInlineForm && (
                <div
                  className={`rounded-2xl border p-4 transition-all duration-300 shadow-xl ${
                    isLight
                      ? 'bg-slate-50 border-emerald-400 shadow-slate-200 ring-1 ring-emerald-500/20'
                      : 'bg-slate-900/95 border-emerald-500/40 shadow-emerald-950/20'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between pb-3 mb-3 border-b ${
                      isLight ? 'border-slate-200' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
                          isLight
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        }`}
                      >
                        {userFormEditingId ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          {userFormEditingId ? 'تعديل بيانات حساب المستخدم' : 'إنشاء حساب مستخدم جديد'}
                        </h4>
                        <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          يرجى تعبئة الحقول المطلوبة لضبط اسم الظهور، اسم الدخول، كلمة المرور، والدور
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          userFormEditingId
                            ? isLight
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : isLight
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {userFormEditingId ? 'وضع التعديل' : 'حساب جديد'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelUserInline}
                        className={`p-1 rounded-lg transition cursor-pointer ${
                          isLight
                            ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title="إغلاق النموذج"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {userFormError && (
                    <div
                      className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                        isLight
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{userFormError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveUserInline} className="space-y-4">
                    {/* Horizontal Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {/* 1. Display Name */}
                      <div className="space-y-1.5">
                        <label
                          className={`block text-[11px] font-bold ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          اسم المستخدم (الظاهر) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={userDisplayName}
                            onChange={(e) => setUserDisplayName(e.target.value)}
                            placeholder="مثال: م. علي حسن"
                            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition border ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                                : 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* 2. Login Username */}
                      <div className="space-y-1.5">
                        <label
                          className={`block text-[11px] font-bold ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          اسم الحساب (Login) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={userAccountName}
                            onChange={(e) => setUserAccountName(e.target.value)}
                            placeholder="مثال: ali.hassan"
                            className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none transition border ${
                              isLight
                                ? 'bg-amber-50/50 border-amber-300 text-amber-900 placeholder:text-slate-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-500'
                                : 'bg-slate-950 border-slate-700/80 text-amber-400 placeholder:text-slate-600 focus:border-amber-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* 3. Password */}
                      <div className="space-y-1.5">
                        <label
                          className={`block text-[11px] font-bold ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          كلمة المرور <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showFormPassword ? 'text' : 'password'}
                            required
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full rounded-xl px-3 py-2 pl-8 text-xs font-mono focus:outline-none transition border ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                                : 'bg-slate-950 border-slate-700/80 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowFormPassword(!showFormPassword)}
                            className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition ${
                              isLight
                                ? 'text-slate-400 hover:text-amber-600'
                                : 'text-slate-500 hover:text-amber-400'
                            }`}
                            title={showFormPassword ? 'إخفاء' : 'إظهار'}
                          >
                            {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* 4. Role */}
                      <div className="space-y-1.5">
                        <label
                          className={`block text-[11px] font-bold ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          الدور / الصلاحية <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={userRole}
                          onChange={(e) => setUserRole(e.target.value as UserAccountRole)}
                          className={`w-full rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none transition cursor-pointer border ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                              : 'bg-slate-950 border-slate-700/80 text-slate-100 focus:border-emerald-500'
                          }`}
                        >
                          <option
                            value="مدير النظام"
                            className={isLight ? 'bg-white text-amber-800' : 'bg-slate-900 text-amber-400'}
                          >
                            مدير النظام (Admin)
                          </option>
                          <option
                            value="مشغل النظام"
                            className={isLight ? 'bg-white text-sky-800' : 'bg-slate-900 text-sky-400'}
                          >
                            مشغل النظام (Operator)
                          </option>
                          <option
                            value="مستخدم"
                            className={isLight ? 'bg-white text-emerald-800' : 'bg-slate-900 text-emerald-400'}
                          >
                            مستخدم (User)
                          </option>
                          <option
                            value="موظف الكشف والصيانة"
                            className={isLight ? 'bg-white text-orange-800' : 'bg-slate-900 text-orange-400'}
                          >
                            موظف الكشف الميداني (Field Inspector)
                          </option>
                          <option
                            value="موظف الصيانة"
                            className={isLight ? 'bg-white text-amber-800' : 'bg-slate-900 text-amber-400'}
                          >
                            موظف الصيانة (Maintenance Staff)
                          </option>
                        </select>
                      </div>

                      {/* 5. Maintenance Department Selection (If role is موظف الصيانة) */}
                      {userRole === 'موظف الصيانة' && (
                        <div className="space-y-1.5">
                          <label
                            className={`block text-[11px] font-bold ${
                              isLight ? 'text-amber-900' : 'text-amber-400'
                            }`}
                          >
                            جهة الصيانة المخصصة <span className="text-rose-500">*</span>
                          </label>
                          <select
                            required
                            value={userMaintDept}
                            onChange={(e) => setUserMaintDept(e.target.value)}
                            className={`w-full rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none transition cursor-pointer border ${
                              isLight
                                ? 'bg-amber-50 border-amber-300 text-amber-950 focus:border-amber-600 focus:ring-1 focus:ring-amber-500'
                                : 'bg-slate-950 border-amber-500/40 text-amber-400 focus:border-amber-500'
                            }`}
                          >
                            {maintenanceDepartments.map((dept) => (
                              <option
                                key={dept.id}
                                value={dept.nameAr}
                                className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}
                              >
                                {dept.nameAr}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* 6. Phone Number */}
                      <div className="space-y-1.5">
                        <label
                          className={`block text-[11px] font-bold ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          رقم الهاتف{' '}
                          <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                            (اختياري)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          placeholder="0770xxxxxxx"
                          className={`w-full rounded-xl px-3 py-2 text-xs font-mono focus:outline-none transition border ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                              : 'bg-slate-950 border-slate-700/80 text-slate-200 placeholder:text-slate-600 focus:border-emerald-500'
                          }`}
                        />
                      </div>

                      {/* 7. Status Toggle Button */}
                      <div className="space-y-1.5">
                        <label
                          className={`block text-[11px] font-bold ${
                            isLight ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          حالة الحساب
                        </label>
                        <button
                          type="button"
                          onClick={() => setUserStatus(userStatus === 'active' ? 'disabled' : 'active')}
                          className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            userStatus === 'active'
                              ? isLight
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200/80'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                              : isLight
                              ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200/80'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                          }`}
                        >
                          {userStatus === 'active' ? (
                            <>
                              <ToggleRight
                                className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
                              />
                              <span>نشط ومفعّل</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft
                                className={`w-4 h-4 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}
                              />
                              <span>معطّل وموقوف</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Actions Toolbar */}
                    <div
                      className={`flex flex-col sm:flex-row items-center justify-between pt-3 border-t gap-3 ${
                        isLight ? 'border-slate-200' : 'border-slate-800/80'
                      }`}
                    >
                      <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {userRole === 'مدير النظام' && '• صلاحيات كاملة لإدارة الوحدات والمستخدمين وضبط النظام'}
                        {userRole === 'مشغل النظام' && '• صلاحيات تشغيلية وتعديل ومطابقة بدون تعديل إعدادات النظام'}
                        {userRole === 'مستخدم' && '• صلاحيات استعراض وبحث وطباعة التقارير وإجراء التفتيش الدوري'}
                        {userRole === 'موظف الكشف والصيانة' && '• صلاحيات المسح الميداني وتوثيق الكشف الدوري ورفع بلاغات الصيانة'}
                        {userRole === 'موظف الصيانة' && '• صلاحيات استقبال ومعالجة طلبات الصيانة الموجهة لقسمه وتوثيق إنجازها فقط'}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={handleCancelUserInline}
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
                          className={`px-5 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer ${
                            isLight
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{userFormEditingId ? 'تحديث الحساب' : 'حفظ وإنشاء الحساب'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Users Data Table */}
              <div
                className={`overflow-x-auto rounded-2xl border shadow-lg ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-slate-200/50'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr
                      className={`border-b ${
                        isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-200 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <th className="p-3 font-bold">المستخدم والاسم الكامل</th>
                      <th className="p-3 font-bold">اسم الحساب (Login)</th>
                      <th className="p-3 font-bold">كلمة المرور</th>
                      <th className="p-3 font-bold">نوع الحساب / الصلاحية</th>
                      <th className="p-3 font-bold">رقم الهاتف</th>
                      <th className="p-3 font-bold text-center">حالة الحساب</th>
                      <th className="p-3 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      isLight
                        ? 'divide-slate-200 text-slate-800'
                        : 'divide-slate-800/80 text-slate-300'
                    }`}
                  >
                    {users.map((usr) => {
                      const isAdm = usr.role === 'مدير النظام' || usr.role === 'admin';
                      const isOp = usr.role === 'مشغل النظام' || usr.role === 'operator';
                      const isEditingThis = userFormEditingId === usr.id && showUserInlineForm;
                      const isPrimaryAdmin = usr.id === 'USR-101' || usr.username === 'admin';
                      const isCurrentAdmin = currentUser?.id === 'USR-101' || currentUser?.username === 'admin';

                      return (
                        <tr
                          key={usr.id}
                          className={`transition ${
                            isEditingThis
                              ? isLight
                                ? 'bg-emerald-50 border-r-2 border-emerald-600'
                                : 'bg-emerald-950/30 border-l-2 border-emerald-400'
                              : isLight
                              ? 'hover:bg-slate-50'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* 1. Display Name */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 shadow-inner border ${
                                  isLight
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : 'bg-slate-800 border-slate-700 text-amber-400'
                                }`}
                              >
                                {usr.name ? usr.name.slice(0, 2) : 'US'}
                              </div>
                              <div>
                                <div
                                  className={`font-bold flex items-center gap-1.5 ${
                                    isLight ? 'text-slate-900' : 'text-slate-100'
                                  }`}
                                >
                                  <span>{usr.name}</span>
                                  {isPrimaryAdmin && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold flex items-center gap-0.5 ${
                                        isLight
                                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                      }`}
                                      title="حساب مدير النظام الأساسي - محمي من الحذف والتعديل الخارجي"
                                    >
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>حساب محمي</span>
                                    </span>
                                  )}
                                  {isEditingThis && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${
                                        isLight
                                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      }`}
                                    >
                                      قيد التعديل
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-[10px] font-mono ${
                                    isLight ? 'text-slate-500' : 'text-slate-500'
                                  }`}
                                >
                                  آخر تواجد: {usr.lastActive || 'الآن'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Login Username */}
                          <td className="p-3">
                            <span
                              className={`font-mono font-bold px-2 py-1 rounded-lg border ${
                                isLight
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-slate-900 text-amber-400 border-slate-800'
                              }`}
                            >
                              {usr.username || usr.email?.split('@')[0] || 'user'}
                            </span>
                          </td>

                          {/* 3. Password */}
                          <td className="p-3 font-mono">
                            {isPrimaryAdmin && !isCurrentAdmin ? (
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 opacity-80 ${
                                  isLight
                                    ? 'text-amber-900 bg-amber-50 border-amber-300'
                                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                                }`}
                                title="كلمة مرور مدير النظام محجوبة ولا تظهر إلا لحساب المدير نفسه"
                              >
                                <Lock className="w-3 h-3" />
                                <span>•••••••• (محمية)</span>
                              </span>
                            ) : showPasswordsTable ? (
                              <span
                                className={`font-bold px-2 py-0.5 rounded border ${
                                  isLight
                                    ? 'text-amber-900 bg-amber-100 border-amber-300'
                                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                                }`}
                              >
                                {usr.password || '123'}
                              </span>
                            ) : (
                              <span
                                className={`tracking-widest font-bold ${
                                  isLight ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                ••••••
                              </span>
                            )}
                          </td>

                          {/* 4. Role */}
                          <td className="p-3">
                            <div className="flex flex-col gap-1 items-start">
                              <span
                                className={`px-2.5 py-1 rounded-full font-bold text-[10px] border inline-flex items-center gap-1 ${
                                  isAdm
                                    ? isLight
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                    : isOp
                                    ? isLight
                                      ? 'bg-sky-100 text-sky-900 border-sky-300'
                                      : 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                                    : usr.role === 'موظف الصيانة'
                                    ? isLight
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                    : usr.role === 'موظف الكشف والصيانة'
                                    ? isLight
                                      ? 'bg-orange-100 text-orange-900 border-orange-300'
                                      : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                    : isLight
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>{usr.role}</span>
                              </span>
                              {usr.role === 'موظف الصيانة' && usr.maintenanceDepartment && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${
                                    isLight
                                      ? 'bg-slate-100 text-amber-900 border-amber-200'
                                      : 'bg-slate-900 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  <Wrench className="w-2.5 h-2.5" />
                                  <span>{usr.maintenanceDepartment}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Phone */}
                          <td className="p-3 font-mono text-xs">
                            {usr.phone ? (
                              <span className={isLight ? 'text-slate-800 font-bold' : 'text-slate-200'}>
                                {usr.phone}
                              </span>
                            ) : (
                              <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>--</span>
                            )}
                          </td>

                          {/* 6. Status & Activation Toggle */}
                          <td className="p-3 text-center">
                            {isPrimaryAdmin ? (
                              <span
                                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] border inline-flex items-center gap-1.5 opacity-90 ${
                                  isLight
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                }`}
                                title="حساب مدير النظام الأساسي نشط ومحمي دائماً ولا يمكن تعطيله"
                              >
                                <Lock className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                                <span>نشط دائم (محمي)</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => onToggleUserStatus(usr.id)}
                                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] border inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                                  usr.status === 'active'
                                    ? isLight
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200/80'
                                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                    : isLight
                                    ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200/80'
                                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30'
                                }`}
                                title={usr.status === 'active' ? 'انقر لتعطيل الحساب' : 'انقر لتنشيط الحساب'}
                              >
                                {usr.status === 'active' ? (
                                  <>
                                    <ToggleRight
                                      className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}
                                    />
                                    <span>نشط</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft
                                      className={`w-4 h-4 ${isLight ? 'text-rose-700' : 'text-rose-400'}`}
                                    />
                                    <span>معطّل وموقوف</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>

                          {/* 7. Actions: Edit and Delete only */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isPrimaryAdmin && !isCurrentAdmin ? (
                                <button
                                  disabled
                                  className={`p-1.5 rounded-lg border transition cursor-not-allowed opacity-50 ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                                      : 'bg-slate-800 text-slate-600 border-slate-700'
                                  }`}
                                  title="لا يمكن تعديل هذا الحساب إلا من خلال الحساب نفسه"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenEditUserInline(usr)}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                    isLight
                                      ? 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border-slate-300 hover:border-amber-300'
                                      : 'bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border-slate-700 hover:border-amber-500/40'
                                  }`}
                                  title="تعديل بيانات وصلاحيات الحساب"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isPrimaryAdmin ? (
                                <button
                                  disabled
                                  className={`p-1.5 rounded-lg border transition cursor-not-allowed opacity-40 ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                                      : 'bg-slate-800 text-slate-600 border-slate-700'
                                  }`}
                                  title="لا يمكن حذف هذا الحساب أبداً (حساب مدير النظام الأساسي)"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: 'user',
                                      id: usr.id,
                                      name: usr.name,
                                    })
                                  }
                                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                    isLight
                                      ? 'bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-900 border-slate-300 hover:border-rose-300'
                                      : 'bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border-slate-700 hover:border-rose-500/40'
                                  }`}
                                  title="حذف الحساب نهائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Governorates Table */}
          {activeTab === 'governorates' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-slate-100 text-sm">جدول المحافظات المعتمدة لدى الشركة</h3>
                <span className="text-[11px] text-slate-400">إمكانية التعديل والحذف والربط الحركي</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3 font-semibold">الكود</th>
                      <th className="p-3 font-semibold">اسم المحافظة (عربي)</th>
                      <th className="p-3 font-semibold">اسم المحافظة (إنجليزي)</th>
                      <th className="p-3 font-semibold text-center">الحالة</th>
                      <th className="p-3 font-semibold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {governorates.map((gov) => (
                      <tr key={gov.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{gov.code}</td>
                        <td className="p-3 font-bold text-slate-100">{gov.nameAr}</td>
                        <td className="p-3 font-mono text-slate-400">{gov.nameEn || '--'}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded font-bold ${
                              gov.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {gov.status === 'active' ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onToggleStatus('governorate', gov.id)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                              title="تغيير الحالة"
                            >
                              {gov.status === 'active' ? (
                                <ToggleRight className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(gov)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                              title="تعديل المحافظة"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'governorate',
                                  id: gov.id,
                                  name: gov.nameAr,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                              title="حذف المحافظة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Oilfields Table */}
          {activeTab === 'oilfields' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-slate-100 text-sm">جدول الحقول النفطية والامتيازات</h3>
                <span className="text-[11px] text-slate-400">إمكانية التعديل والحذف وتغيير المحافظة التابعة</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3 font-semibold">الكود</th>
                      <th className="p-3 font-semibold">اسم الحقل النفطي</th>
                      <th className="p-3 font-semibold">المحافظة التابع لها</th>
                      <th className="p-3 font-semibold text-center">الحالة</th>
                      <th className="p-3 font-semibold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {oilfields.map((fld) => {
                      const parentGov = governorates.find((g) => g.id === fld.governorateId);
                      return (
                        <tr key={fld.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-bold text-amber-400">{fld.code}</td>
                          <td className="p-3 font-bold text-slate-100">{fld.nameAr}</td>
                          <td className="p-3 text-slate-300">{parentGov?.nameAr || 'غير محدد'}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold ${
                                fld.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {fld.status === 'active' ? 'نشط' : 'معطل'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onToggleStatus('oilfield', fld.id)}
                                className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                              >
                                {fld.status === 'active' ? (
                                  <ToggleRight className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                                )}
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(fld)}
                                className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'oilfield',
                                    id: fld.id,
                                    name: fld.nameAr,
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Sites Table */}
          {activeTab === 'sites' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-slate-100 text-sm">دليل المواقع والمنشآت والمحطات الحقليّة</h3>
                <span className="text-[11px] text-slate-400">إدارة تفصيلية مع تعديل الإحداثيات وحذف المنشأة</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3 font-semibold">رمز الموقع</th>
                      <th className="p-3 font-semibold">اسم الموقع/المنشأة</th>
                      <th className="p-3 font-semibold">الحقل النفطي</th>
                      <th className="p-3 font-semibold">الإحداثيات GIS</th>
                      <th className="p-3 font-semibold text-center">الحالة</th>
                      <th className="p-3 font-semibold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {sites.map((st) => {
                      const parentFld = oilfields.find((f) => f.id === st.fieldId);
                      return (
                        <tr key={st.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-bold text-amber-400">{st.code}</td>
                          <td className="p-3 font-bold text-slate-100">{st.nameAr}</td>
                          <td className="p-3 text-slate-300">{parentFld?.nameAr || 'غير محدد'}</td>
                          <td className="p-3 font-mono text-slate-400">
                            {st.coordinates?.lat?.toFixed(4) || '0.0000'}°, {st.coordinates?.lng?.toFixed(4) || '0.0000'}°
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold ${
                                st.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {st.status === 'active' ? 'نشط' : 'معطل'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onToggleStatus('site', st.id)}
                                className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                              >
                                {st.status === 'active' ? (
                                  <ToggleRight className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                                )}
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(st)}
                                className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'site',
                                    id: st.id,
                                    name: st.nameAr,
                                  })
                                }
                                className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Unit Types Table */}
          {activeTab === 'unit_types' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-slate-100 text-sm">أنواع المباني والأبنية المرجعية</h3>
                <span className="text-[11px] text-slate-400">إضافة وتعديل وحذف رموز الأبنية الهندسية</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3 font-semibold">رمز الفئة</th>
                      <th className="p-3 font-semibold">نوع الوحدة بالعربية</th>
                      <th className="p-3 font-semibold">الاسم بالإنجليزي</th>
                      <th className="p-3 font-semibold">متعدد الطوابق</th>
                      <th className="p-3 font-semibold">العزل السطحي</th>
                      <th className="p-3 font-semibold text-center">الحالة</th>
                      <th className="p-3 font-semibold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {unitTypes.map((ut) => (
                      <tr key={ut.code} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{ut.code}</td>
                        <td className="p-3 font-bold text-slate-100">{ut.nameAr}</td>
                        <td className="p-3 font-mono text-slate-400">{ut.nameEn || '--'}</td>
                        <td className="p-3">{ut.multiStory ? 'نعم (متعدد)' : 'لا (طابق واحد)'}</td>
                        <td className="p-3 text-slate-400">{ut.defaultRoof}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded font-bold ${
                              ut.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {ut.status === 'active' ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onToggleStatus('unitType', ut.code)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                            >
                              {ut.status === 'active' ? (
                                <ToggleRight className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(ut)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'unitType',
                                  id: ut.code,
                                  name: ut.nameAr,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: Room Types Table */}
          {activeTab === 'rooms' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-slate-100 text-sm">تصنيفات واستخدامات الغرف والقاعات 3D</h3>
                <span className="text-[11px] text-slate-400">تعديل التمييز اللوني وتغيير الاسم والحذف</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3 font-semibold">الكود</th>
                      <th className="p-3 font-semibold">تصنيف الغرفة/القاعة</th>
                      <th className="p-3 font-semibold">الرمز اللوني 3D</th>
                      <th className="p-3 font-semibold text-center">الحالة</th>
                      <th className="p-3 font-semibold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {roomTypes.map((rt) => (
                      <tr key={rt.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{rt.code}</td>
                        <td className="p-3 font-bold text-slate-100">{rt.nameAr}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full border border-slate-700 shadow"
                              style={{ backgroundColor: rt.colorHex }}
                            ></span>
                            <span className="font-mono text-slate-400">{rt.colorHex}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded font-bold ${
                              rt.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {rt.status === 'active' ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onToggleStatus('roomType', rt.id)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                            >
                              {rt.status === 'active' ? (
                                <ToggleRight className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(rt)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'roomType',
                                  id: rt.id,
                                  name: rt.nameAr,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: Equipment Types Table */}
          {activeTab === 'equipment' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-slate-100 text-sm">سجل المعدات والملحقات المتاحة بالمشهد 3D</h3>
                <span className="text-[11px] text-slate-400">إضافة وتعديل وحذف أنواع الملحقات والتجهيزات</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3 font-semibold">رمز المعدة</th>
                      <th className="p-3 font-semibold">نوع المعدة / الملحق الهندسي</th>
                      <th className="p-3 font-semibold">الشكل الهندسي 3D</th>
                      <th className="p-3 font-semibold">السعة الافتراضية</th>
                      <th className="p-3 font-semibold text-center">الحالة</th>
                      <th className="p-3 font-semibold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {equipmentTypes.map((eq) => (
                      <tr key={eq.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{eq.code}</td>
                        <td className="p-3 font-bold text-slate-100">{eq.nameAr}</td>
                        <td className="p-3">
                          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono text-sky-400">
                            {eq.renderGeometry}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{eq.defaultCapacity || '--'}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded font-bold ${
                              eq.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {eq.status === 'active' ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onToggleStatus('equipmentType', eq.id)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                            >
                              {eq.status === 'active' ? (
                                <ToggleRight className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(eq)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'equipmentType',
                                  id: eq.id,
                                  name: eq.nameAr,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7.5: Maintenance Departments Table */}
          {activeTab === 'maintenance_depts' && (
            <div className="space-y-3">
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b gap-3 ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}
              >
                <div>
                  <h3
                    className={`font-bold text-sm flex items-center gap-2 ${
                      isLight ? 'text-slate-900' : 'text-slate-100'
                    }`}
                  >
                    <Wrench className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                    <span>سجل جهات وأقسام الصيانة الهندسية والفنية</span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    إدارة جهات الصيانة (الكهربائية، الميكانيكية، الإنشائية، تكييف، أجهزة دقيقة...) وتوجيه البلاغات إليها
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateModal}
                  className={`font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow transition cursor-pointer ${
                    isLight
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة جهة صيانة جديدة</span>
                </button>
              </div>

              <div
                className={`overflow-x-auto rounded-2xl border shadow-lg ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-slate-200/50'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr
                      className={`border-b ${
                        isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-200 font-bold'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      <th className="p-3 font-bold">كود الجهة</th>
                      <th className="p-3 font-bold">اسم جهة / قسم الصيانة</th>
                      <th className="p-3 font-bold">الاسم بالإنجليزية</th>
                      <th className="p-3 font-bold">الوصف والتخصص</th>
                      <th className="p-3 font-bold text-center">الحالة</th>
                      <th className="p-3 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      isLight
                        ? 'divide-slate-200 text-slate-800'
                        : 'divide-slate-800/80 text-slate-300'
                    }`}
                  >
                    {maintenanceDepartments.map((dept) => (
                      <tr
                        key={dept.id}
                        className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}`}
                      >
                        <td className="p-3 font-mono font-bold text-amber-500">{dept.code}</td>
                        <td className="p-3 font-bold">
                          <div className="flex items-center gap-2">
                            <Wrench className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                            <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>{dept.nameAr}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{dept.nameEn || dept.nameAr}</td>
                        <td className="p-3 text-slate-400">{dept.description || '--'}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded font-bold ${
                              dept.status === 'active'
                                ? isLight
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isLight
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {dept.status === 'active' ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onToggleMaintenanceDepartmentStatus?.(dept.id)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                              title="تبديل الحالة"
                            >
                              {dept.status === 'active' ? (
                                <ToggleRight className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(dept)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: 'maintenanceDepartment',
                                  id: dept.id,
                                  name: dept.nameAr,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-red-400 transition cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {maintenanceDepartments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          لا توجد جهات صيانة مسجلة حالياً. اضغط على «إضافة جهة صيانة جديدة» لإضافة أقسام الصيانة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: Audit Activity Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-400" />
                    <span>سجل النشاطات وتغييرات الإعدادات المركزية</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    توثيق حركية إضافة وتعديل وتقييم المباني، وإجراءات السلامة والصيانة بالنظام
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddLogModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>إضافة نشاط يدوي</span>
                  </button>
                  <button
                    onClick={onClearAuditLogs}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تفريغ السجل</span>
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="فلترة بالاسم، نوع الإجراء، أو رمز الأصل..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-3 font-semibold">الطابع الزمني</th>
                      <th className="p-3 font-semibold">المستخدم</th>
                      <th className="p-3 font-semibold">نوع الإجراء</th>
                      <th className="p-3 font-semibold">رمز الوحدة/المكون</th>
                      <th className="p-3 font-semibold">الحقل المتأثر</th>
                      <th className="p-3 font-semibold">القيمة السابقة / الجديدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono text-slate-400 text-[11px]">{log.timestamp}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center justify-center text-[10px]">
                              {log.userInitials}
                            </span>
                            <span className="font-bold text-slate-200">{log.user}</span>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-amber-400">{log.action}</td>
                        <td className="p-3 font-mono text-slate-300">{log.unitCode}</td>
                        <td className="p-3 text-slate-400">{log.affectedField}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-slate-500 line-through">{log.previousValue}</span>
                            <span className="text-slate-600">←</span>
                            <span className="text-emerald-400 font-bold">{log.newValue}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: Comprehensive Database Backup & Restore */}
          {activeTab === 'backup_restore' && (
            <DatabaseBackupManager
              units={units}
              maintenanceRequests={maintenanceRequests}
              occupancyRecords={occupancyRecords}
              periodicInspections={periodicInspections}
              auditLogs={auditLogs}
              orgEntities={orgEntities}
              branding={branding}
              users={users}
              unitTypes={unitTypes}
              governorates={governorates}
              oilfields={oilfields}
              sites={sites}
              roomTypes={roomTypes}
              equipmentTypes={equipmentTypes}
              maintenanceDepartments={maintenanceDepartments}
              currentUser={currentUser}
              theme={theme}
              onRestoreDatabase={onRestoreDatabase || (() => {})}
              onAddAuditLog={onAddAuditLog}
              triggerSaveToast={triggerSaveToast}
            />
          )}

          {/* TAB 9: Custom Granular Factory Reset */}
          {activeTab === 'reset' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>استعادة ضبط المصنع والمسح المخصص</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  تسمح لك هذه اللوحة باختيار القسم المحدد للمسح أو إعادة التعيين دون الحاجة لمسح جميع بيانات النظام مرة واحدة.
                </p>
              </div>

              {/* Granular Reset Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Units & Buildings */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">مسح/إعادة تعيين المباني والوحدات</h4>
                          <span className="text-[11px] text-amber-400 font-mono font-bold">
                            العدد الحالي: {units.length} أصل/مبنى
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      يشمل كافة الأصول والمباني والكرفانات المسجلة مع تقييماتها الهندسية وبيانات السلامة.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'مسح جميع المباني والوحدات',
                          description: 'هل أنت تأكد من ترغبتك بمسح وتفريغ جميع المباني والأصول المسجلة بالنظام؟ ستصبح قائمة الأصول فارغة تماماً.',
                          actionType: 'clear',
                          onConfirm: () => {
                            onClearUnits();
                            triggerSaveToast('تم مسح وتفريغ كافة المباني والوحدات بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل (تفريغ)</span>
                    </button>
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'إعادة تعيين المباني للوضع الافتراضي',
                          description: 'هل ترغب بإعادة تحميل قائمة المباني والكرفانات الافتراضية لشركة نفط الوسط؟',
                          actionType: 'resetDefault',
                          onConfirm: () => {
                            onResetUnitsToDefault();
                            triggerSaveToast('تمت استعادة قائمة المباني الافتراضية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الافتراضي</span>
                    </button>
                  </div>
                </div>

                {/* 2. Oilfields */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">مسح/إعادة تعيين الحقول النفطية</h4>
                          <span className="text-[11px] text-emerald-400 font-mono font-bold">
                            العدد الحالي: {oilfields.length} حقل
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      سجل الحقول النفطية (حقل الأحدب، حقل شرق بغداد، حقل نفط الوسط...).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'مسح جميع الحقول النفطية',
                          description: 'هل أنت تأكد من مسح كافة الحقول النفطية المسجلة من الجدول المرجعي؟',
                          actionType: 'clear',
                          onConfirm: () => {
                            onClearOilfields();
                            triggerSaveToast('تم مسح جميع الحقول النفطية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل (تفريغ)</span>
                    </button>
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'إعادة تعيين الحقول النفطية للوضع الافتراضي',
                          description: 'هل ترغب بإعادة تحميل الحقول النفطية الأساسية لشركة نفط الوسط؟',
                          actionType: 'resetDefault',
                          onConfirm: () => {
                            onResetOilfieldsToDefault();
                            triggerSaveToast('تمت استعادة الحقول النفطية الافتراضية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الافتراضي</span>
                    </button>
                  </div>
                </div>

                {/* 3. Unit Types */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">مسح/إعادة تعيين أنواع وفئات المباني</h4>
                          <span className="text-[11px] text-sky-400 font-mono font-bold">
                            العدد الحالي: {unitTypes.length} فئة
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      تصنيفات وأنواع المباني (كرفانات، مباني مسلحة، مراكز تحكم، ورش...).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'مسح جميع أنواع المباني',
                          description: 'هل ترغب بمسح كافة تصنيفات أنواع المباني والكرفانات المرجعية؟',
                          actionType: 'clear',
                          onConfirm: () => {
                            onClearUnitTypes();
                            triggerSaveToast('تم مسح جميع أنواع المباني بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل (تفريغ)</span>
                    </button>
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'إعادة تعيين أنواع المباني للوضع الافتراضي',
                          description: 'هل ترغب بإعادة تحميل تصنيفات أنواع الأبنية الهندسية الافتراضية؟',
                          actionType: 'resetDefault',
                          onConfirm: () => {
                            onResetUnitTypesToDefault();
                            triggerSaveToast('تمت استعادة تصنيفات المباني الافتراضية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الافتراضي</span>
                    </button>
                  </div>
                </div>

                {/* 4. Governorates */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">مسح/إعادة تعيين المحافظات</h4>
                          <span className="text-[11px] text-purple-400 font-mono font-bold">
                            العدد الحالي: {governorates.length} محافظة
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      قائمة المحافظات العراقية المعتمدة بنظام التفتيش والسيطرة على الأصول.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'مسح جميع المحافظات',
                          description: 'هل أنت متأكد من مسح وتفريغ قائمة المحافظات المسجلة بالنظام؟',
                          actionType: 'clear',
                          onConfirm: () => {
                            onClearGovernorates();
                            triggerSaveToast('تم مسح كافة المحافظات بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل (تفريغ)</span>
                    </button>
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'إعادة تعيين المحافظات للوضع الافتراضي',
                          description: 'هل ترغب باستعادة المحافظات العراقية الأساسية المفعلة بالنظام؟',
                          actionType: 'resetDefault',
                          onConfirm: () => {
                            onResetGovernoratesToDefault();
                            triggerSaveToast('تمت استعادة المحافظات الافتراضية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الافتراضي</span>
                    </button>
                  </div>
                </div>

                {/* 5. Sites & Installations */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">مسح/إعادة تعيين المواقع والمنشآت</h4>
                          <span className="text-[11px] text-indigo-400 font-mono font-bold">
                            العدد الحالي: {sites.length} موقع
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      المواقع الميدانية ومحطات الكبس والعزل الرئيسية المسجلة بالمحافظات.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'مسح جميع المواقع والمنشآت',
                          description: 'هل ترغب بمسح كافة المواقع الميدانية والمنشآت من السجل؟',
                          actionType: 'clear',
                          onConfirm: () => {
                            onClearSites();
                            triggerSaveToast('تم مسح جميع المواقع الميدانية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل (تفريغ)</span>
                    </button>
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'إعادة تعيين المواقع للوضع الافتراضي',
                          description: 'هل ترغب باستعادة المواقع والمنشآت الميدانية الافتراضية؟',
                          actionType: 'resetDefault',
                          onConfirm: () => {
                            onResetSitesToDefault();
                            triggerSaveToast('تمت استعادة المواقع الافتراضية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الافتراضي</span>
                    </button>
                  </div>
                </div>

                {/* 6. System Users */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-xl">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">مسح/إعادة تعيين مستخدمي النظام</h4>
                          <span className="text-[11px] text-pink-400 font-mono font-bold">
                            العدد الحالي: {users.length} مستخدم
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      حسابات المهندسين والمفتشين والمشرفين الإداريين بالنظام.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'مسح جميع حسابات المستخدمين',
                          description: 'هل ترغب بمسح قائمة حسابات المستخدمين والمشرفين؟',
                          actionType: 'clear',
                          onConfirm: () => {
                            onClearUsers();
                            triggerSaveToast('تم مسح جميع المستخدمين بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل (تفريغ)</span>
                    </button>
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'إعادة تعيين حسابات المستخدمين للوضع الافتراضي',
                          description: 'هل ترغب بإعادة تحميل الحسابات الافتراضية لكادر التفتيش الهندسي؟',
                          actionType: 'resetDefault',
                          onConfirm: () => {
                            onResetUsersToDefault();
                            triggerSaveToast('تمت استعادة المستخدمين الافتراضيين بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الافتراضي</span>
                    </button>
                  </div>
                </div>

                {/* 7. Maintenance Requests */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">مسح/إعادة تعيين طلبات الصيانة</h4>
                          <span className="text-[11px] text-amber-400 font-mono font-bold">
                            العدد الحالي: {maintenanceRequests.length} طلب صيانة
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      بلاغات الأعطال وتكاليف وإحالات الصيانة الميدانية.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'مسح جميع طلبات الصيانة',
                          description: 'هل ترغب بمسح وتفريغ سجل طلبات الصيانة بالكامل؟',
                          actionType: 'clear',
                          onConfirm: () => {
                            if (onClearMaintenanceRequests) onClearMaintenanceRequests();
                            triggerSaveToast('تم مسح جميع طلبات الصيانة بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل (تفريغ)</span>
                    </button>
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'إعادة تعيين طلبات الصيانة للوضع الافتراضي',
                          description: 'هل ترغب باستعادة طلبات الصيانة الافتراضية للشركة؟',
                          actionType: 'resetDefault',
                          onConfirm: () => {
                            if (onResetMaintenanceRequestsToDefault) onResetMaintenanceRequestsToDefault();
                            triggerSaveToast('تمت استعادة طلبات الصيانة الافتراضية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الافتراضي</span>
                    </button>
                  </div>
                </div>

                {/* 8. Occupancy & Allocation Records */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-100 text-xs">مسح/إعادة تعيين أوامر التخصيص والإشغال</h4>
                          <span className="text-[11px] text-emerald-400 font-mono font-bold">
                            العدد الحالي: {occupancyRecords.length} أمر تخصيص
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      أوامر تخصيص القاعات والغرف وشواغر التشكيلات الإدارية والأقسام.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'مسح جميع أوامر التخصيص',
                          description: 'هل ترغب بتفريغ سجل أوامر الإشغال والتخصيص بالكامل؟',
                          actionType: 'clear',
                          onConfirm: () => {
                            if (onClearOccupancyRecords) onClearOccupancyRecords();
                            triggerSaveToast('تم مسح جميع أوامر التخصيص بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح الكل (تفريغ)</span>
                    </button>
                    <button
                      onClick={() =>
                        setCustomResetModal({
                          title: 'إعادة تعيين أوامر التخصيص للوضع الافتراضي',
                          description: 'هل ترغب باستعادة سجل الإشغال والتخصيص الافتراضي؟',
                          actionType: 'resetDefault',
                          onConfirm: () => {
                            if (onResetOccupancyRecordsToDefault) onResetOccupancyRecordsToDefault();
                            triggerSaveToast('تمت استعادة أوامر التخصيص الافتراضية بنجاح');
                          },
                        })
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>الوضع الافتراضي</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Full System Reset Callout */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-100 text-sm">استعادة ضبط المصنع الشاملة لكل النظام</h4>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      يقوم هذا الإجراء بإرجاع كافة أقسام النظام (الهوية البصرية، الأصول، الحقول، المحافظات، المستخدمين وسجلات النشاط) دفعة واحدة إلى الحالة الأولية.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-red-500/20 flex justify-end">
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="bg-red-500 hover:bg-red-400 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 text-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>تأكيد استعادة ضبط المصنع الكاملة</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MODAL: Universal Create / Edit ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">
                {editingItem ? 'تعديل بيانات العنصر' : 'إضافة عنصر جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3">
              {/* Governorates Inputs */}
              {activeTab === 'governorates' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم المحافظة (عربي):</label>
                    <input
                      type="text"
                      required
                      value={govNameAr}
                      onChange={(e) => setGovNameAr(e.target.value)}
                      placeholder="مثال: محافظة البصرة"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الاسم بالإنجليزي:</label>
                    <input
                      type="text"
                      value={govNameEn}
                      onChange={(e) => setGovNameEn(e.target.value)}
                      placeholder="Basra Governorate"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">رمز المحافظة (Code):</label>
                    <input
                      type="text"
                      value={govCode}
                      onChange={(e) => setGovCode(e.target.value)}
                      placeholder="BSR"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-400 font-bold"
                    />
                  </div>
                </>
              )}

              {/* Oilfield Inputs */}
              {activeTab === 'oilfields' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">المحافظة التابع لها:</label>
                    <select
                      required
                      value={fldGovId}
                      onChange={(e) => setFldGovId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    >
                      <option value="">-- اختر المحافظة --</option>
                      {governorates.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nameAr} ({g.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم الحقل النفطي:</label>
                    <input
                      type="text"
                      required
                      value={fldNameAr}
                      onChange={(e) => setFldNameAr(e.target.value)}
                      placeholder="مثال: حقل مجنون النفطي"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">رمز الحقل (Code):</label>
                    <input
                      type="text"
                      value={fldCode}
                      onChange={(e) => setFldCode(e.target.value)}
                      placeholder="MJN"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-400 font-bold"
                    />
                  </div>
                </>
              )}

              {/* Site Inputs */}
              {activeTab === 'sites' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الحقل النفطي التابع له:</label>
                    <select
                      required
                      value={siteFieldId}
                      onChange={(e) => setSiteFieldId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    >
                      <option value="">-- اختر الحقل النفطي --</option>
                      {oilfields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nameAr} ({f.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم الموقع أو المنشأة:</label>
                    <input
                      type="text"
                      required
                      value={siteNameAr}
                      onChange={(e) => setSiteNameAr(e.target.value)}
                      placeholder="محطة العزل الرئيسية الضفة الشمالية"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">خط العرض Lat:</label>
                      <input
                        type="text"
                        value={siteLat}
                        onChange={(e) => setSiteLat(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">خط الطول Lng:</label>
                      <input
                        type="text"
                        value={siteLng}
                        onChange={(e) => setSiteLng(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-slate-300"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Unit Type Inputs */}
              {activeTab === 'unit_types' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">رمز الفئة (Code):</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingItem}
                      value={utCode}
                      onChange={(e) => setUtCode(e.target.value)}
                      placeholder="CTRL / PMP / GRD"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الاسم بالعربية:</label>
                    <input
                      type="text"
                      required
                      value={utNameAr}
                      onChange={(e) => setUtNameAr(e.target.value)}
                      placeholder="مركز سيطرة وتحكم آبار"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      checked={utMultiStory}
                      onChange={(e) => setUtMultiStory(e.target.checked)}
                      id="utMulti"
                    />
                    <label htmlFor="utMulti" className="text-slate-300 font-semibold">
                      يسمح بعدة طوابق (Multi-story building)
                    </label>
                  </div>
                </>
              )}

              {/* Room Type Inputs */}
              {activeTab === 'rooms' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم تصنيف الغرفة:</label>
                    <input
                      type="text"
                      required
                      value={rtNameAr}
                      onChange={(e) => setRtNameAr(e.target.value)}
                      placeholder="مختبر فحص الجودة الميداني"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اللون بالعرض ثلاثي الأبعاد 3D:</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={rtColorHex}
                        onChange={(e) => setRtColorHex(e.target.value)}
                        className="w-12 h-10 rounded border border-slate-800 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={rtColorHex}
                        onChange={(e) => setRtColorHex(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 font-mono text-amber-400"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Equipment Type Inputs */}
              {activeTab === 'equipment' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم الملحق / المعدة الهندسيّة:</label>
                    <input
                      type="text"
                      required
                      value={eqNameAr}
                      onChange={(e) => setEqNameAr(e.target.value)}
                      placeholder="لوحة توزيع كهربائية رئيسية"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الشكل المجسّم بالمشهد 3D:</label>
                    <select
                      value={eqGeometry}
                      onChange={(e) => setEqGeometry(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    >
                      <option value="box">صندوق معدني (Box - مولدة/تكييف)</option>
                      <option value="cylinder">أسطوانة (Cylinder - خزان/طفاية حريق)</option>
                      <option value="wall_panel">لوحة جدارية (Wall Panel - لوحة كهرباء)</option>
                      <option value="camera">كاميرا مراقبة (Camera - أجهزة أمنية)</option>
                      <option value="pump">مضخة مياه / محرك (Booster Pump)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">السعة / المواصفة الافتراضية:</label>
                    <input
                      type="text"
                      value={eqCapacity}
                      onChange={(e) => setEqCapacity(e.target.value)}
                      placeholder="400V 3-Phase / 5000 Liters"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-slate-300"
                    />
                  </div>
                </>
              )}

              {/* Maintenance Department Inputs */}
              {activeTab === 'maintenance_depts' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">كود جهة الصيانة (Code):</label>
                    <input
                      type="text"
                      required
                      value={mdeptCode}
                      onChange={(e) => setMdeptCode(e.target.value)}
                      placeholder="ELEC-MAINT / MECH-MAINT"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم جهة / قسم الصيانة بالعربية:</label>
                    <input
                      type="text"
                      required
                      value={mdeptNameAr}
                      onChange={(e) => setMdeptNameAr(e.target.value)}
                      placeholder="الصيانة الكهربائية / الصيانة الميكانيكية / الصيانة الإنشائية"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الاسم بالإنجليزية (اختياري):</label>
                    <input
                      type="text"
                      value={mdeptNameEn}
                      onChange={(e) => setMdeptNameEn(e.target.value)}
                      placeholder="Electrical Maintenance Department"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الوصف والتخصص الهندسي:</label>
                    <textarea
                      value={mdeptDescription}
                      onChange={(e) => setMdeptDescription(e.target.value)}
                      placeholder="صيانة القواطع الكهربائية والمولدات ولوحات التوزيع والإنارة"
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 resize-none"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg hover:bg-amber-400 cursor-pointer"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Confirm Delete ==================== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl border ${
              isLight
                ? 'bg-white border-red-300 text-slate-900 shadow-slate-900/20'
                : 'bg-slate-900 border-red-500/40 text-slate-100'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                isLight
                  ? 'bg-red-100 text-red-600 border-red-200'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}
            >
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
              تأكيد حذف العنصر نهائياً
            </h3>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              هل أنت متأكد من رغبتك بحذف «<span className="font-bold text-amber-600">{deleteConfirm.name}</span>» من السجل المركزي؟
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`px-4 py-2 rounded-xl font-bold cursor-pointer text-xs transition border ${
                  isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-transparent'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg cursor-pointer text-xs transition"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Confirm Factory Reset ==================== */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h3 className="font-black text-slate-100 text-base">إعادة ضبط المصنع المكتملة</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              سيتم إعادة تعيين الهوية البصرية، وقائمة المستخدمين، والجداول المرجعية للأصول، وكذلك مسح جميع الوحدات المسجّلة وطلبات الصيانة وسجلات الإشغال الحالية وإرجاع النظام بالكامل إلى الضبط الأساسي. هذا الإجراء نهائي ولا يمكن التراجع عنه. هل ترغب بالمتابعة؟
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer hover:bg-slate-700 text-xs"
              >
                تراجع
              </button>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  onFactoryReset();
                  triggerSaveToast('تمت استعادة ضبط المصنع بنجاح!');
                }}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-400 text-slate-950 font-black rounded-xl shadow-xl cursor-pointer text-xs"
              >
                نعم، إعادة ضبط المصنع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Confirm Custom Granular Reset ==================== */}
      {customResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl max-w-md w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="font-black text-slate-100 text-base">{customResetModal.title}</h3>
            <p className="text-slate-300 text-xs leading-relaxed">{customResetModal.description}</p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCustomResetModal(null)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold cursor-pointer hover:bg-slate-700 text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  customResetModal.onConfirm();
                  setCustomResetModal(null);
                }}
                className={`px-6 py-2.5 font-black rounded-xl shadow-xl cursor-pointer text-xs ${
                  customResetModal.actionType === 'clear'
                    ? 'bg-red-500 hover:bg-red-400 text-slate-950'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                تأكيد التنفيذ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: Add Manual Audit Log ==================== */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">تسجيل حدث / نشاط إداري يدوي</h3>
              <button onClick={() => setShowAddLogModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualLog} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المسؤول / المستخدم:</label>
                <input
                  type="text"
                  required
                  value={newLogUser}
                  onChange={(e) => setNewLogUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">وصف الإجراء / النشاط:</label>
                <input
                  type="text"
                  required
                  value={newLogAction}
                  onChange={(e) => setNewLogAction(e.target.value)}
                  placeholder="مثال: إجراء فحص دوري للمنظومة التبريد"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">المجال / القسم المتأثر:</label>
                <input
                  type="text"
                  value={newLogField}
                  onChange={(e) => setNewLogField(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl shadow"
                >
                  تأكيد الإضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
