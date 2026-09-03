import {
  UnitAsset,
  SiteHierarchyItem,
  MaintenanceRequest,
  OccupancyRecord,
  PeriodicInspectionSchedule,
  AuditLogItem,
  ReferenceUnitType,
  SystemBranding,
  SystemUser,
  OrgEntity,
  MaintenanceDepartmentRef,
} from '../types';
import { MIDLAND_OIL_COMPANY_ORG_ENTITIES } from './midlandOrgStructure';

export const INITIAL_UNITS: UnitAsset[] = [];

export const INITIAL_GEOGRAPHY_TREE: SiteHierarchyItem[] = [];

export const INITIAL_MAINTENANCE_REQUESTS: MaintenanceRequest[] = [];

export const INITIAL_OCCUPANCY_RECORDS: OccupancyRecord[] = [];

export const INITIAL_PERIODIC_INSPECTIONS: PeriodicInspectionSchedule[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [];

export const INITIAL_REFERENCE_UNIT_TYPES: ReferenceUnitType[] = [
  { code: 'BLD', nameAr: 'مبنى خرساني / إداري', nameEn: 'Concrete Admin Building', multiStory: true, defaultRoof: 'خرسانة مسلحة', status: 'active' },
  { code: 'CRV', nameAr: 'كرفان حقلي ساندويتش بانل', nameEn: 'Sandwich Panel Caravan', multiStory: false, defaultRoof: 'ساندويتش بانل 10 سم', status: 'active' },
  { code: 'WHS', nameAr: 'مخزن جملون هيكل حديدي', nameEn: 'Steel Frame Warehouse', multiStory: false, defaultRoof: 'صفائح حديد مجلفن جملوني', status: 'active' },
  { code: 'LAB', nameAr: 'مختبر فحص ومراقبة جوية', nameEn: 'Field Laboratory', multiStory: true, defaultRoof: 'خرسانة مسلحة عازلة', status: 'active' },
  { code: 'CTRL', nameAr: 'مركز تحكم وسيطرة آبار', nameEn: 'Well Control Center', multiStory: true, defaultRoof: 'خرسانة مسلحة مضادة للانفجار', status: 'active' },
];

export const INITIAL_GOVERNORATES = [
  { id: 'GOV-WASIT', nameAr: 'محافظة واسط', nameEn: 'Wasit Governorate', code: 'WS', status: 'active' as const },
  { id: 'GOV-BAGHDAD', nameAr: 'محافظة بغداد', nameEn: 'Baghdad Governorate', code: 'EBD', status: 'active' as const },
  { id: 'GOV-DIYALA', nameAr: 'محافظة ديالى', nameEn: 'Diyala Governorate', code: 'DIY', status: 'active' as const },
  { id: 'GOV-BASRA', nameAr: 'محافظة البصرة', nameEn: 'Basra Governorate', code: 'BSR', status: 'active' as const },
  { id: 'GOV-MAYSAN', nameAr: 'محافظة ميسان', nameEn: 'Maysan Governorate', code: 'MYS', status: 'active' as const },
  { id: 'GOV-KIRKUK', nameAr: 'محافظة كركوك', nameEn: 'Kirkuk Governorate', code: 'KRK', status: 'active' as const },
];

export const INITIAL_OILFIELDS = [
  { id: 'FLD-AHDAB', governorateId: 'GOV-WASIT', nameAr: 'حقل الأحدب النفطي', nameEn: 'Al-Ahdab Oilfield', code: 'AHD', status: 'active' as const },
  { id: 'FLD-BADRA', governorateId: 'GOV-WASIT', nameAr: 'حقل بدرة النفطي', nameEn: 'Badra Oilfield', code: 'BDR', status: 'active' as const },
  { id: 'FLD-EAST-BAGHDAD', governorateId: 'GOV-BAGHDAD', nameAr: 'حقل شرق بغداد', nameEn: 'East Baghdad Field', code: 'EBD', status: 'active' as const },
  { id: 'FLD-NAFT-KHANA', governorateId: 'GOV-DIYALA', nameAr: 'حقل نفت خانة', nameEn: 'Naft Khana Field', code: 'NK', status: 'active' as const },
  { id: 'FLD-RUMAILA', governorateId: 'GOV-BASRA', nameAr: 'حقل الرميلة الشمالي والجنوبي', nameEn: 'Rumaila Oilfield', code: 'RML', status: 'active' as const },
  { id: 'FLD-MAYSAN', governorateId: 'GOV-MAYSAN', nameAr: 'حقول شركة نفط ميسان الموحدة', nameEn: 'Maysan Oilfields', code: 'MYS', status: 'active' as const },
];

export const INITIAL_SITES = [
  { id: 'WST-AHD-CPF-001', fieldId: 'FLD-AHDAB', nameAr: 'المحطة المركزية (CPF)', nameEn: 'Central Processing Facility', code: 'CPF-01', coordinates: { lat: 32.6189, lng: 45.7531 }, totalUnits: 1248, description: 'المعالج الرئيسي للنفط الخام المستخرج من حقل الأحدب.', status: 'active' as const },
  { id: 'WST-AHD-PAD-01', fieldId: 'FLD-AHDAB', nameAr: 'محطة ضخ الآبار (Well Pads)', nameEn: 'Well Pads Station', code: 'PAD-01', coordinates: { lat: 32.6250, lng: 45.7610 }, totalUnits: 84, description: 'منظومة ضخ الآبار الشمالية والشرقية.', status: 'active' as const },
  { id: 'WST-AHD-RES-01', fieldId: 'FLD-AHDAB', nameAr: 'المجمع السكني للموظفين', nameEn: 'Staff Housing Complex', code: 'RES-01', coordinates: { lat: 32.6100, lng: 45.7480 }, totalUnits: 320, description: 'مجمع السكن العائلي والفردي لكوادر الشركة.', status: 'active' as const },
  { id: 'BDR-GATE-01', fieldId: 'FLD-BADRA', nameAr: 'موقع بدرة الميداني والبوابة', nameEn: 'Badra Field Site', code: 'GATE-01', coordinates: { lat: 33.1121, lng: 45.9810 }, totalUnits: 290, description: 'محطة العزل والتكرير الأولى في بدرة.', status: 'active' as const },
  { id: 'EBD-SITE-01', fieldId: 'FLD-EAST-BAGHDAD', nameAr: 'المقر الرئيسي والمورش الفنية', nameEn: 'Main HQ & Technical Workshops', code: 'HQ-01', coordinates: { lat: 33.3152, lng: 44.3661 }, totalUnits: 420, description: 'مجمع الورش والتجهيز الفني والمكاتب الإدارية.', status: 'active' as const },
  { id: 'NK-SITE-01', fieldId: 'FLD-NAFT-KHANA', nameAr: 'محطة تجميع نفت خانة', nameEn: 'Naft Khana Gathering Station', code: 'GS-01', coordinates: { lat: 34.0120, lng: 45.4210 }, totalUnits: 220, description: 'محطة الضخ والتجميع التاريخية.', status: 'active' as const },
];

export const INITIAL_ROOM_TYPES = [
  { id: 'RT-01', code: 'office', nameAr: 'مكتب إداري', colorHex: '#38bdf8', iconName: 'Briefcase', status: 'active' as const },
  { id: 'RT-02', code: 'storage', nameAr: 'مخزن ومستودع', colorHex: '#f59e0b', iconName: 'Archive', status: 'active' as const },
  { id: 'RT-03', code: 'meeting', nameAr: 'قاعة اجتماعات', colorHex: '#8b5cf6', iconName: 'Users', status: 'active' as const },
  { id: 'RT-04', code: 'server', nameAr: 'غرفة سيرفرات وربط شبيكي', colorHex: '#6366f1', iconName: 'Server', status: 'active' as const },
  { id: 'RT-05', code: 'lab', nameAr: 'مختبر فحوصات وتحاليل', colorHex: '#10b981', iconName: 'FlaskConical', status: 'active' as const },
  { id: 'RT-06', code: 'bathroom', nameAr: 'دورة مياه وصحيات', colorHex: '#06b6d4', iconName: 'Bath', status: 'active' as const },
  { id: 'RT-07', code: 'security', nameAr: 'غرفة حراسة وتفتيش', colorHex: '#ef4444', iconName: 'ShieldAlert', status: 'active' as const },
  { id: 'RT-08', code: 'control', nameAr: 'غرفة سيطرة ومراقبة آبار', colorHex: '#f97316', iconName: 'Cpu', status: 'active' as const },
  { id: 'RT-09', code: 'living', nameAr: 'سكن واستراحة كوادر', colorHex: '#14b8a6', iconName: 'Bed', status: 'active' as const },
  { id: 'RT-10', code: 'kitchen', nameAr: 'مطبخ ومطعم ميداني', colorHex: '#f43f5e', iconName: 'Utensils', status: 'active' as const },
];

export const INITIAL_EQUIPMENT_TYPES = [
  { id: 'EQT-GEN', code: 'generator', nameAr: 'مولدة ديزل طوارئ', nameEn: 'Diesel Generator', iconName: 'Zap', renderGeometry: 'box' as const, defaultCapacity: '250 kVA', status: 'active' as const },
  { id: 'EQT-HVAC', code: 'ac_unit', nameAr: 'منظومة تكييف وتهوية HVAC', nameEn: 'HVAC Air Conditioner', iconName: 'Wind', renderGeometry: 'box' as const, defaultCapacity: '5 Ton', status: 'active' as const },
  { id: 'EQT-TANK', code: 'water_tank', nameAr: 'خزان ماء علوي / خرساني', nameEn: 'Water Storage Tank', iconName: 'Droplet', renderGeometry: 'cylinder' as const, defaultCapacity: '2000 L', status: 'active' as const },
  { id: 'EQT-FIRE', code: 'fire_extinguisher', nameAr: 'منظومة السلامة وطفايات حريق', nameEn: 'Fire Extinguisher System', iconName: 'Flame', renderGeometry: 'cylinder' as const, defaultCapacity: 'CO2 / Foam 12kg', status: 'active' as const },
  { id: 'EQT-PANEL', code: 'electrical_panel', nameAr: 'لوحة توزيع كهرباء رئيسية (Main MDB)', nameEn: 'Electrical Panel', iconName: 'Sliders', renderGeometry: 'wall_panel' as const, defaultCapacity: '400V 3-Phase', status: 'active' as const },
  { id: 'EQT-CCTV', code: 'cctv_camera', nameAr: 'كاميرات مراقبة وحساسات أمنية', nameEn: 'CCTV Surveillance Camera', iconName: 'Camera', renderGeometry: 'camera' as const, defaultCapacity: 'Hikvision 4K IP', status: 'active' as const },
  { id: 'EQT-PUMP', code: 'water_pump', nameAr: 'مضخة مياه ضغط وتغذية', nameEn: 'Water Booster Pump', iconName: 'Activity', renderGeometry: 'pump' as const, defaultCapacity: '7.5 HP', status: 'active' as const },
  { id: 'EQT-FUEL', code: 'fuel_tank', nameAr: 'خزان وقود ديزل أرضي', nameEn: 'Diesel Fuel Tank', iconName: 'Database', renderGeometry: 'cylinder' as const, defaultCapacity: '5000 Liters', status: 'active' as const },
];

export const INITIAL_ORG_ENTITIES: OrgEntity[] = MIDLAND_OIL_COMPANY_ORG_ENTITIES.map((e, idx) => ({
  ...e,
  sortOrder: e.sortOrder !== undefined ? e.sortOrder : idx,
}));

export const DEFAULT_SYSTEM_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><g fill="%23248d9c"><rect x="36" y="412" width="440" height="44" rx="4"/><path d="M 152 412 L 152 260 L 194 260 L 194 68 L 366 138 L 366 412 Z"/></g><g fill="%23ffffff"><rect x="222" y="110" width="24" height="24" rx="2"/><rect x="222" y="154" width="24" height="24" rx="2"/><rect x="222" y="198" width="24" height="24" rx="2"/><rect x="260" y="126" width="24" height="24" rx="2"/><rect x="260" y="170" width="24" height="24" rx="2"/><rect x="260" y="214" width="24" height="24" rx="2"/><rect x="170" y="286" width="22" height="22" rx="2"/><rect x="202" y="286" width="22" height="22" rx="2"/><rect x="234" y="286" width="22" height="22" rx="2"/><rect x="266" y="286" width="22" height="22" rx="2"/><rect x="170" y="326" width="22" height="22" rx="2"/><rect x="202" y="326" width="22" height="22" rx="2"/><rect x="234" y="326" width="22" height="22" rx="2"/><rect x="266" y="326" width="22" height="22" rx="2"/><rect x="170" y="366" width="22" height="22" rx="2"/><rect x="202" y="366" width="22" height="22" rx="2"/><rect x="234" y="366" width="22" height="22" rx="2"/><rect x="266" y="366" width="22" height="22" rx="2"/><rect x="304" y="176" width="50" height="16" rx="2"/><rect x="304" y="214" width="50" height="16" rx="2"/><rect x="304" y="252" width="50" height="16" rx="2"/><rect x="304" y="290" width="50" height="16" rx="2"/><rect x="304" y="328" width="50" height="16" rx="2"/><rect x="304" y="366" width="50" height="16" rx="2"/></g></svg>`;

export const OFFICIAL_MOC_LOGO_SVG = DEFAULT_SYSTEM_LOGO_SVG;

export const INITIAL_BRANDING: SystemBranding = {
  systemName: 'السجل الرقمي الموحد للأصول الهندسية والإنشائية',
  companyName: 'شركة نفط الوسط',
  ministryName: 'وزارة النفط العراقية',
  countryName: 'جمهورية العراق',
  copyrightText: 'جميع الحقوق محفوظة © 2026 - شركة نفط الوسط • وزارة النفط العراقية',
  logoSubtext: 'عراق',
  logoUrl: DEFAULT_SYSTEM_LOGO_SVG,
};

export const INITIAL_MAINTENANCE_DEPARTMENTS: MaintenanceDepartmentRef[] = [
  { id: 'MDEPT-01', code: 'ELEC', nameAr: 'الصيانة الكهربائية', nameEn: 'Electrical Maintenance', description: 'مسؤولة عن التغذية ولوحات التوزيع والمولدات والإنارة', status: 'active' },
  { id: 'MDEPT-02', code: 'MECH', nameAr: 'الصيانة الميكانيكية', nameEn: 'Mechanical Maintenance', description: 'مسؤولة عن المضخات ومنظومات التكييف والمحركات', status: 'active' },
  { id: 'MDEPT-03', code: 'CIVIL', nameAr: 'الصيانة الإنشائية', nameEn: 'Civil & Structural Maintenance', description: 'مسؤولة عن الهياكل والجدران والأسقف والترميم المدني', status: 'active' },
  { id: 'MDEPT-04', code: 'HSE', nameAr: 'صيانة السلامة والإطفاء', nameEn: 'HSE & Fire Fighting', description: 'مسؤولة عن كواشف الحريق وطفايات ومخارج الطوارئ', status: 'active' },
];

export const INITIAL_USERS: SystemUser[] = [
  {
    id: 'USR-101',
    name: 'عمر المياحي',
    username: 'admin',
    password: 'admin123',
    role: 'مدير النظام',
    email: 'admin@mdoc.gov.iq',
    phone: '07701784629',
    governorate: 'واسط',
    field: 'الأحدب',
    status: 'active',
    lastActive: 'الآن',
  },
  {
    id: 'USR-102',
    name: 'م. حيدر الكهربائي',
    username: 'maint_elec',
    password: '123',
    role: 'موظف الصيانة',
    maintenanceDepartment: 'الصيانة الكهربائية',
    email: 'elec@mdoc.gov.iq',
    phone: '07712345678',
    governorate: 'واسط',
    field: 'الأحدب',
    status: 'active',
    lastActive: 'الآن',
  },
  {
    id: 'USR-103',
    name: 'م. علي الميكانيكي',
    username: 'maint_mech',
    password: '123',
    role: 'موظف الصيانة',
    maintenanceDepartment: 'الصيانة الميكانيكية',
    email: 'mech@mdoc.gov.iq',
    phone: '07723456789',
    governorate: 'واسط',
    field: 'الأحدب',
    status: 'active',
    lastActive: 'الآن',
  },
  {
    id: 'USR-104',
    name: 'م. سيف الإنشائي',
    username: 'maint_civil',
    password: '123',
    role: 'موظف الصيانة',
    maintenanceDepartment: 'الصيانة الإنشائية',
    email: 'civil@mdoc.gov.iq',
    phone: '07734567890',
    governorate: 'واسط',
    field: 'الأحدب',
    status: 'active',
    lastActive: 'الآن',
  },
];


