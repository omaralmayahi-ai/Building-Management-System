/**
 * Midland Oil Company Asset & Facilities Management System
 * Database Schema Mappings & Column Declarations (PostgreSQL)
 */

import {
  UnitAsset,
  MaintenanceRequest,
  OccupancyRecord,
  PeriodicInspectionSchedule,
  AuditLogItem,
  OrgEntity,
  GovernorateRef,
  OilfieldRef,
  RoomTypeRef,
  EquipmentTypeRef,
  ReferenceUnitType,
  MaintenanceDepartmentRef,
  SystemUser,
  SystemBranding,
} from '../types';

export interface DbUnitRow {
  id: string;
  code: string;
  fixed_asset_code?: string;
  name: string;
  type: string;
  unit_type_code?: string;
  site_id?: string;
  site_name?: string;
  field: string;
  governorate: string;
  condition_grade: string;
  construction_year: number;
  department: string;
  departments: string; // JSON string or array in PG
  lat: number;
  lng: number;
  sector_address: string;
  total_area_sq_m: number;
  land_area_sq_m?: number;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  building_shape?: string;
  roof_type?: string;
  structure_type?: string;
  floors_count: number;
  rooms: any;
  equipment: any;
  attachments?: any;
  attachments_count: number;
  design_finishing?: any;
  status: 'active' | 'decommissioned';
  decommissioned_at?: string;
  decommission_reason?: string;
  last_updated: string;
}

export interface DbMaintenanceRequestRow {
  id: string;
  unit_code: string;
  unit_name?: string;
  field: string;
  issue: string;
  priority: string;
  sla_deadline?: string;
  days_overdue?: number;
  assigned_to: string;
  status: string;
  reported_by: string;
  details?: string;
  resolution_notes?: string;
  completed_by?: string;
  completed_at?: string;
  source_inspection_id?: string;
  attachment_name?: string;
  attachment_url?: string;
  attachments?: any;
  created_at: string;
}

export interface DbOccupancyRecordRow {
  id: string;
  unit_code: string;
  room_id: string;
  department: string;
  use_type: string;
  allocation_order_no: string;
  start_date: string;
  status: string;
  capacity_text?: string;
  created_at?: string;
}

export interface DbPeriodicInspectionRow {
  id: string;
  unit_code: string;
  unit_name?: string;
  field: string;
  governorate: string;
  inspection_type: string;
  title: string;
  frequency: string;
  custom_interval_days?: number;
  last_inspection_date: string;
  next_due_date: string;
  assigned_team: string;
  inspector_name: string;
  performed_by_name?: string;
  status: string;
  notes?: string;
  condition_grade_given?: string;
  completion_date?: string;
  findings?: string;
  recommendations?: string;
  report_file_name?: string;
  report_file_url?: string;
  attachments?: any;
  created_maintenance_request_id?: string;
  created_at: string;
}

export interface DbAuditLogRow {
  id: string;
  unit_code: string;
  timestamp: string;
  action: string;
  user_name: string;
  user_initials: string;
  affected_field: string;
  previous_value?: string;
  new_value?: string;
}

export interface DbOrgEntityRow {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  parent_id: string | null;
  level: string;
  employee_count: number;
  status: 'active' | 'disabled';
}

export interface DbUnitTypeRefRow {
  code: string;
  name_ar: string;
  name_en?: string;
  multi_story: boolean;
  default_roof?: string;
  status: 'active' | 'disabled';
}

export interface DbMaintenanceDepartmentRefRow {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  icon_name: string;
  specialty: string;
  status: 'active' | 'disabled';
}

export interface DbSystemUserRow {
  id: string;
  name: string;
  username: string;
  password_hash?: string;
  role: string;
  maintenance_department?: string;
  email?: string;
  phone?: string;
  governorate?: string;
  field?: string;
  status: 'active' | 'disabled';
  last_active: string;
  created_at: string;
}

export interface DbSystemBrandingRow {
  id: string;
  system_name: string;
  company_name: string;
  ministry_name: string;
  country_name: string;
  copyright_text: string;
  logo_subtext?: string;
  logo_url?: string;
  updated_at: string;
}

// Convert DB Row to UnitAsset Frontend Model
export function mapUnitRowToModel(row: DbUnitRow): UnitAsset {
  return {
    id: row.id,
    code: row.code,
    fixedAssetCode: row.fixed_asset_code,
    name: row.name,
    type: row.type as any,
    unitTypeCode: row.unit_type_code,
    siteId: row.site_id,
    siteName: row.site_name,
    field: row.field,
    governorate: row.governorate,
    conditionGrade: row.condition_grade as any,
    constructionYear: Number(row.construction_year),
    department: row.department,
    departments: typeof row.departments === 'string' ? JSON.parse(row.departments || '[]') : (row.departments || []),
    coordinates: {
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    sectorAddress: row.sector_address,
    totalAreaSqM: Number(row.total_area_sq_m),
    landAreaSqM: row.land_area_sq_m ? Number(row.land_area_sq_m) : undefined,
    lengthM: row.length_m ? Number(row.length_m) : undefined,
    widthM: row.width_m ? Number(row.width_m) : undefined,
    heightM: row.height_m ? Number(row.height_m) : undefined,
    buildingShape: row.building_shape,
    roofType: row.roof_type,
    structureType: row.structure_type,
    floorsCount: Number(row.floors_count) || 1,
    rooms: typeof row.rooms === 'string' ? JSON.parse(row.rooms || '[]') : (row.rooms || []),
    equipment: typeof row.equipment === 'string' ? JSON.parse(row.equipment || '[]') : (row.equipment || []),
    attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments || '[]') : (row.attachments || []),
    attachmentsCount: Number(row.attachments_count) || 0,
    designFinishing: typeof row.design_finishing === 'string' ? JSON.parse(row.design_finishing || '{}') : (row.design_finishing || {}),
    status: row.status || 'active',
    decommissionedAt: row.decommissioned_at,
    decommissionReason: row.decommission_reason,
    lastUpdated: row.last_updated,
  };
}

// Convert UnitAsset Frontend Model to DB Row for UPSERT
export function mapModelToUnitRow(model: UnitAsset): DbUnitRow {
  return {
    id: model.id || model.code,
    code: model.code,
    fixed_asset_code: model.fixedAssetCode,
    name: model.name,
    type: model.type,
    unit_type_code: model.unitTypeCode,
    site_id: model.siteId,
    site_name: model.siteName,
    field: model.field,
    governorate: model.governorate,
    condition_grade: model.conditionGrade,
    construction_year: model.constructionYear,
    department: model.department,
    departments: Array.isArray(model.departments) ? JSON.stringify(model.departments) : '[]',
    lat: model.coordinates?.lat || 32.6189,
    lng: model.coordinates?.lng || 45.7531,
    sector_address: model.sectorAddress || '',
    total_area_sq_m: model.totalAreaSqM || 0,
    land_area_sq_m: model.landAreaSqM,
    length_m: model.lengthM,
    width_m: model.widthM,
    height_m: model.heightM,
    building_shape: model.buildingShape,
    roof_type: model.roofType,
    structure_type: model.structureType,
    floors_count: model.floorsCount || 1,
    rooms: model.rooms || [],
    equipment: model.equipment || [],
    attachments: model.attachments || [],
    attachments_count: model.attachments?.length || model.attachmentsCount || 0,
    design_finishing: model.designFinishing || {},
    status: model.status || 'active',
    decommissioned_at: model.decommissionedAt,
    decommission_reason: model.decommissionReason,
    last_updated: model.lastUpdated || new Date().toISOString(),
  };
}
