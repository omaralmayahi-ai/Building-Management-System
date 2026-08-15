export type ConditionGrade = 'A' | 'B' | 'C' | 'D';

export type UnitType = 'building' | 'caravan' | 'warehouse' | 'equipment' | 'safety_system' | 'storage_tank';

export type MaintenancePriority = 'critical' | 'normal' | 'low';

export type MaintenanceStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export type OccupancyStatus = 'full' | 'partial' | 'vacant';

export interface Room {
  id: string;
  name: string;
  type: string;
  areaSqM: number;
  floor: string;
  status: 'Active' | 'Stopped' | 'Review' | 'Maintenance' | string;
  occupiedBy?: string;
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

export interface MaintenanceRequest {
  id: string; // e.g. "MR-2024-001" or "REQ-9921"
  unitCode: string;
  unitName?: string;
  field: string;
  issue: string; // e.g. "HVAC Failure" / "فشل نظام التبريد"
  priority: MaintenancePriority;
  slaDeadline?: string; // e.g. "2026-08-09T10:00:00"
  daysOverdue?: number;
  assignedTo: string; // e.g. "فريق ميكانيك الأحدب" / "شركة الصيانة السريعة"
  status: MaintenanceStatus;
  createdAt: string;
  reportedBy: string;
  details?: string;
  resolutionNotes?: string;
  completedBy?: string;
  completedAt?: string;
  sourceInspectionId?: string;
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
  status: InspectionStatus;
  notes?: string;
  conditionGradeGiven?: ConditionGrade;
  createdAt: string;
  completionDate?: string;
  findings?: string;
  recommendations?: string;
  reportFileName?: string;
  reportFileUrl?: string;
  createdMaintenanceRequestId?: string;
}

export interface AuditLogItem {
  id: string;
  unitCode: string;
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
}

export interface DepartmentRef {
  id: string;
  code: string;
  nameAr: string;
  parentDepartment?: string;
  status: 'active' | 'disabled';
}

export interface SystemBranding {
  systemName: string;
  companyName: string;
  ministryName: string;
  countryName: string;
  copyrightText: string;
  logoSubtext?: string;
  logoUrl?: string;
}

export type UserAccountRole = 'مدير النظام' | 'مشغل النظام' | 'مستخدم' | string;

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserAccountRole;
  email?: string;
  phone?: string;
  governorate?: string;
  field?: string;
  status: 'active' | 'disabled';
  lastActive: string;
}

