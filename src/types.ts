export type ConditionGrade = 'A' | 'B' | 'C' | 'D';

export type UnitType = 'building' | 'caravan' | 'warehouse' | 'equipment' | 'safety_system' | 'storage_tank';

export type MaintenancePriority = 'critical' | 'normal' | 'low';

export type MaintenanceStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled' | 'rejected';

export type OccupancyStatus = 'full' | 'partial' | 'vacant';

export interface Room {
  id: string;
  code?: string; // رمز الغرفة الموحد (مثال: ABCD-F1-OFF-101)
  name: string;
  type: string;
  roomTypeCode?: string; // اختصار نوع الغرفة (OFF, MTG, TRN, WRK, STR, WSH, BED, DIN, KTN, EQP, SRV, GEN)
  sequenceNumber?: number; // رقم تسلسل الغرفة في الطابق (101, 102, 201...)
  areaSqM: number;
  floor: string;
  status: 'Active' | 'Stopped' | 'Review' | 'Maintenance' | string;
  occupiedBy?: string;
  occupantsCount?: number; // عدد شاغلي الغرفة (للمكاتب، الورش الفنية، غرف النوم السكنية)
  capacity?: number; // الطاقة الاستيعابية القصوى (لقاعات الاجتماعات، قاعات التدريب، قاعات الطعام، دورات المياه)
  notes?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  capacity?: string;
  location: string;
  status: 'Active' | 'Maintenance' | 'Critical';
  lastServiceDate?: string;
}

export interface UnitAttachment {
  id: string;
  name: string;
  type: string; // e.g. 'pdf' | 'dwg' | 'image' | 'doc' | 'archive' | string
  sizeMB?: number;
  uploadDate: string;
  category: string; // e.g. 'مخططات هندسية' | 'محاضر استلام' | 'شهادات فحص وسلامة' | 'وثائق ملكية وتخصيص' | 'أخرى'
  fileUrl?: string;
  url?: string;
  notes?: string;
}

export interface UnitDesignFinishing {
  archStyle?: 'modern' | 'classic' | 'industrial' | 'minimalist';
  roofType?: 'flat' | 'flat_parapet' | 'gabled' | 'pitched_tile' | 'garden' | 'pitched';
  facadeColor?: string;
  showFurniture?: boolean;
  showWindows?: boolean;
  showTrees?: boolean;
  interiorLightIntensity?: number;
  exteriorLightIntensity?: number;
}

export interface UnitAsset {
  id: string; // e.g. "WS-AHD-BLD-014"
  code: string;
  fixedAssetCode?: string; // رمز الأصل في سجلات أصول الشركة (0123456789 للأبنية / 123.1234.123 للكرفانات)
  name: string; // Local name, e.g. "إدارة حقل الأحدب الرئيسي"
  type: UnitType;
  siteId: string;
  siteName: string; // e.g. "Al-Ahdab HQ" / "المحطة المركزية CPF"
  field: string; // e.g. "Ahdab", "East Baghdad", "Badra", "Maysan", "Naft Khana", "Rumaila"
  governorate: string; // e.g. "Wasit", "Baghdad", "Diyala", "Basra"
  conditionGrade: ConditionGrade;
  constructionYear: number;
  department: string;
  departments?: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  sectorAddress: string;
  totalAreaSqM: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  buildingShape?: string;
  floorsCount: number;
  rooms: Room[];
  equipment: EquipmentItem[];
  attachments?: UnitAttachment[];
  attachmentsCount: number;
  lastUpdated: string;
  designFinishing?: UnitDesignFinishing;
  status?: 'active' | 'decommissioned';
  decommissionedAt?: string;
  decommissionReason?: string;
}

export interface SiteHierarchyItem {
  id: string;
  nameAr: string;
  nameEn?: string;
  type: 'governorate' | 'field' | 'site';
  parentId?: string;
  children?: SiteHierarchyItem[];
  totalUnits?: number;
  coordinates?: { lat: number; lng: number };
  description?: string;
}

export interface ReportAttachment {
  id?: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface MaintenanceDepartmentRef {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  status: 'active' | 'disabled';
}

export interface MaintenanceRequest {
  id: string; // e.g. "MR-2024-001" or "REQ-9921"
  unitCode: string;
  unitName?: string;
  roomCode?: string; // رمز الغرفة الموحد (مثال: A398-F1-OFF-101)
  roomName?: string; // اسم الغرفة أو القاعة
  roomFloor?: string; // الطابق
  occupyingEntity?: string; // الجهة الشاغلة للغرفة / الوحدة
  field: string;
  issue: string; // e.g. "HVAC Failure" / "فشل نظام التبريد"
  priority: MaintenancePriority;
  slaDeadline?: string; // e.g. "2026-08-09T10:00:00"
  daysOverdue?: number;
  assignedTo?: string; // Deprecated / Removed from UI
  maintenanceDepartment?: string; // e.g. "الصيانة الكهربائية" / "الصيانة الميكانيكية" / "الصيانة الإنشائية"
  status: MaintenanceStatus;
  createdAt: string;
  reportedBy: string;
  details?: string;
  resolutionNotes?: string;
  rejectionReason?: string;
  completedBy?: string;
  completedAt?: string;
  sourceInspectionId?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachments?: ReportAttachment[];
}

export interface OccupancyRecord {
  id: string;
  unitCode: string;
  roomId: string;
  department: string; // e.g. "قسم المالية"
  useType: string; // e.g. "إداري - مكتب مزدوج"
  allocationOrderNo: string; // e.g. "ORD-2023-041"
  startDate: string;
  status: OccupancyStatus;
  capacityText?: string; // e.g. "(1/2)"
}

export type InspectionFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom';
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type InspectionType = 'structural' | 'safety_hse' | 'mechanical_electrical' | 'comprehensive';

export interface PeriodicInspectionSchedule {
  id: string; // e.g. "INS-2026-001"
  unitCode: string;
  unitName?: string;
  field: string;
  governorate: string;
  inspectionType: InspectionType;
  title: string;
  frequency: InspectionFrequency;
  customIntervalDays?: number;
  lastInspectionDate: string;
  nextDueDate: string;
  assignedTeam: string;
  inspectorName: string;
  performedByName?: string;
  status: InspectionStatus;
  notes?: string;
  conditionGradeGiven?: ConditionGrade;
  createdAt: string;
  completionDate?: string;
  findings?: string;
  recommendations?: string;
  reportFileName?: string;
  reportFileUrl?: string;
  attachments?: ReportAttachment[];
  createdMaintenanceRequestId?: string;
}

export interface AuditLogItem {
  id: string;
  unitCode?: string;
  timestamp: string;
  action: string;
  user: string;
  userInitials: string;
  affectedField: string;
  previousValue: string;
  newValue: string;
}

export interface ReferenceUnitType {
  code: string;
  nameAr: string;
  nameEn?: string;
  multiStory: boolean;
  defaultRoof: string;
  status: 'active' | 'disabled';
}

export interface GovernorateRef {
  id: string;
  nameAr: string;
  nameEn?: string;
  code: string;
  status: 'active' | 'disabled';
}

export interface OilfieldRef {
  id: string;
  governorateId: string;
  nameAr: string;
  nameEn?: string;
  code: string;
  status: 'active' | 'disabled';
}

export interface SiteRef {
  id: string;
  fieldId: string;
  nameAr: string;
  nameEn?: string;
  code: string;
  coordinates: { lat: number; lng: number };
  totalUnits?: number;
  description?: string;
  status: 'active' | 'disabled';
}

export interface RoomTypeRef {
  id: string;
  code: string;
  nameAr: string;
  colorHex: string;
  iconName: string;
  status: 'active' | 'disabled';
}

export interface EquipmentTypeRef {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  iconName: string;
  renderGeometry: 'box' | 'cylinder' | 'wall_panel' | 'camera' | 'pump';
  defaultCapacity?: string;
  status: 'active' | 'disabled';
}

export type OrgLevel =
  | 'company'
  | 'director_general'
  | 'deputy_director'
  | 'commission'
  | 'central_dept'
  | 'department'
  | 'section'
  | 'unit';

export interface OrgEntity {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  parentId: string | null;
  level: OrgLevel;
  employeeCount: number;
  status: 'active' | 'disabled';
  sortOrder?: number;
}

export interface DepartmentRef {
  id: string;
  code: string;
  nameAr: string;
  parentDepartment?: string;
  status: 'active' | 'disabled';
}

export interface MaintenanceDepartmentRef {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  status: 'active' | 'disabled';
}

export const INITIAL_MAINTENANCE_DEPARTMENTS: MaintenanceDepartmentRef[] = [
  {
    id: 'MDEPT-ELEC',
    code: 'ELEC-MAINT',
    nameAr: 'الصيانة الكهربائية',
    nameEn: 'Electrical Maintenance',
    description: 'صيانة القواطع الكهربائية، المولدات، التغذية، ولوحات التوزيع الرئيسية والفرعية',
    status: 'active',
  },
  {
    id: 'MDEPT-MECH',
    code: 'MECH-MAINT',
    nameAr: 'الصيانة الميكانيكية',
    nameEn: 'Mechanical Maintenance',
    description: 'صيانة المضخات، الصمامات، المحركات، والمعدات الميكانيكية الثقيلة والخفيفة',
    status: 'active',
  },
  {
    id: 'MDEPT-CIVIL',
    code: 'CIVIL-MAINT',
    nameAr: 'الصيانة الإنشائية',
    nameEn: 'Civil & Structural Maintenance',
    description: 'أعمال الترميم، الهياكل الإنشائية، الصبغ، العزل، والواجهات والأبواب',
    status: 'active',
  },
  {
    id: 'MDEPT-HVAC',
    code: 'HVAC-MAINT',
    nameAr: 'صيانة التكييف والتبريد',
    nameEn: 'HVAC Maintenance',
    description: 'صيانة منظومات التكييف المركزي، الوحدات المنفصلة Split، والتثليج',
    status: 'active',
  },
  {
    id: 'MDEPT-SAFETY',
    code: 'SAFETY-MAINT',
    nameAr: 'السلامة والإطفاء',
    nameEn: 'Safety & Firefighting',
    description: 'صيانة شبكات إطفاء الحريق، كواشف الدخان، ومنظومات الإنذار والسلامة المهنية',
    status: 'active',
  },
];

export interface SystemBranding {
  systemName: string;
  companyName: string;
  ministryName: string;
  countryName: string;
  copyrightText: string;
  logoSubtext?: string;
  logoUrl?: string;
}

export type UserAccountRole =
  | 'مدير النظام'
  | 'مشغل النظام'
  | 'مستخدم'
  | 'موظف الكشف والصيانة'
  | 'موظف الصيانة'
  | string;

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserAccountRole;
  maintenanceDepartment?: string;
  email?: string;
  phone?: string;
  governorate?: string;
  field?: string;
  status: 'active' | 'disabled';
  lastActive: string;
}

export interface DatabaseBackupCounts {
  units: number;
  maintenanceRequests: number;
  occupancyRecords: number;
  periodicInspections: number;
  users: number;
  orgEntities: number;
  governorates: number;
  oilfields: number;
  sites: number;
  unitTypes: number;
  roomTypes: number;
  equipmentTypes: number;
  maintenanceDepartments: number;
  auditLogs: number;
  totalRecords: number;
}

export interface DatabaseBackupPayload {
  version: string;
  systemTitle: string;
  companyName: string;
  exportedAt: string;
  exportedAtFormatted: string;
  exportedBy: string;
  checksum: string;
  counts: DatabaseBackupCounts;
  data: {
    units: UnitAsset[];
    maintenanceRequests: MaintenanceRequest[];
    occupancyRecords: OccupancyRecord[];
    periodicInspections: PeriodicInspectionSchedule[];
    users: SystemUser[];
    orgEntities: OrgEntity[];
    branding: SystemBranding;
    governorates: GovernorateRef[];
    oilfields: OilfieldRef[];
    sites: SiteRef[];
    unitTypes: ReferenceUnitType[];
    roomTypes: RoomTypeRef[];
    equipmentTypes: EquipmentTypeRef[];
    maintenanceDepartments: MaintenanceDepartmentRef[];
    auditLogs: AuditLogItem[];
  };
}

export interface AutoBackupScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom_hours';
  customHours?: number;
  timeOfDay: string; // e.g. "02:00"
  dayOfWeek?: number; // 0 for Sunday, 5 for Friday, 6 for Saturday
  dayOfMonth?: number; // 1-28
  storagePath: string; // Directory/path where backup should be stored e.g. "C:\Midland_Oil_Database_Backups"
  storageType: 'local_folder' | 'browser_download' | 'server_cloud';
  keepMaxBackups: number;
  lastBackupTimestamp?: string;
  lastBackupFormatted?: string;
  lastBackupSize?: string;
  lastBackupStatus?: 'success' | 'failed' | 'pending';
  nextScheduledBackup?: string;
}

export interface BackupHistoryItem {
  id: string;
  filename: string;
  timestamp: string;
  timestampFormatted: string;
  sizeBytes: number;
  sizeFormatted: string;
  totalRecords: number;
  unitsCount: number;
  storagePath: string;
  status: 'success' | 'failed';
  triggerType: 'manual' | 'scheduled';
  summary: string;
  payloadSnapshot?: DatabaseBackupPayload;
}

