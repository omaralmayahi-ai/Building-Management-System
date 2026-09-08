-- ====================================================================
-- Midland Oil Company - Fixed Assets & Facilities Management System
-- PostgreSQL Database Initialization & DDL Schema
-- Compatible with PostgreSQL 14 / 15 / 16 / 17
-- ====================================================================

-- 1. Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Organizations & Administrative Hierarchy
CREATE TABLE IF NOT EXISTS org_entities (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    parent_id VARCHAR(64) REFERENCES org_entities(id) ON DELETE SET NULL,
    level VARCHAR(64) NOT NULL CHECK (level IN ('company', 'director_general', 'deputy_director', 'central_dept', 'department', 'section', 'unit')),
    employee_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_entities_parent ON org_entities(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_entities_code ON org_entities(code);

-- 3. Core Units & Fixed Assets (الوحدات والأصول الثابتة)
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(64) UNIQUE NOT NULL,
    code VARCHAR(64) PRIMARY KEY,
    fixed_asset_code VARCHAR(128),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL CHECK (type IN ('building', 'caravan', 'warehouse', 'equipment', 'safety_system', 'storage_tank')),
    unit_type_code VARCHAR(64),
    field VARCHAR(128) NOT NULL,
    governorate VARCHAR(128) NOT NULL,
    site_id VARCHAR(64),
    site_name VARCHAR(255),
    condition_grade CHAR(1) NOT NULL DEFAULT 'B' CHECK (condition_grade IN ('A', 'B', 'C', 'D')),
    construction_year INTEGER NOT NULL,
    department VARCHAR(255) NOT NULL,
    departments JSONB NOT NULL DEFAULT '[]'::jsonb,
    lat NUMERIC(10, 6) NOT NULL,
    lng NUMERIC(10, 6) NOT NULL,
    sector_address TEXT NOT NULL,
    total_area_sq_m NUMERIC(12, 2) NOT NULL,
    land_area_sq_m NUMERIC(12, 2),
    length_m NUMERIC(10, 2),
    width_m NUMERIC(10, 2),
    height_m NUMERIC(10, 2),
    building_shape VARCHAR(64) DEFAULT 'rectangular',
    roof_type VARCHAR(128),
    structure_type VARCHAR(128),
    floors_count INTEGER NOT NULL DEFAULT 1,
    rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
    equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachments_count INTEGER NOT NULL DEFAULT 0,
    design_finishing JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'decommissioned')),
    decommissioned_at TIMESTAMPTZ,
    decommission_reason TEXT,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_units_field ON units(field);
CREATE INDEX IF NOT EXISTS idx_units_governorate ON units(governorate);
CREATE INDEX IF NOT EXISTS idx_units_unit_type_code ON units(unit_type_code);
CREATE INDEX IF NOT EXISTS idx_units_fixed_asset_code ON units(fixed_asset_code);
CREATE INDEX IF NOT EXISTS idx_units_condition ON units(condition_grade);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_type ON units(type);

-- 4. Maintenance Requests (طلبات وأوامر الصيانة)
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id VARCHAR(64) PRIMARY KEY,
    unit_code VARCHAR(64) NOT NULL REFERENCES units(code) ON DELETE CASCADE ON UPDATE CASCADE,
    unit_name VARCHAR(255),
    field VARCHAR(128) NOT NULL,
    issue TEXT NOT NULL,
    priority VARCHAR(32) NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'normal', 'low')),
    sla_deadline TIMESTAMPTZ,
    days_overdue INTEGER DEFAULT 0,
    assigned_to VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'overdue', 'cancelled')),
    reported_by VARCHAR(255) NOT NULL,
    details TEXT,
    resolution_notes TEXT,
    completed_by VARCHAR(255),
    completed_at TIMESTAMPTZ,
    source_inspection_id VARCHAR(64),
    attachment_name VARCHAR(255),
    attachment_url TEXT,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_unit_code ON maintenance_requests(unit_code);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_field ON maintenance_requests(field);

-- 5. Occupancy & Housing Records (سجلات الإشغال والتسكين)
CREATE TABLE IF NOT EXISTS occupancy_records (
    id VARCHAR(64) PRIMARY KEY,
    unit_code VARCHAR(64) NOT NULL REFERENCES units(code) ON DELETE CASCADE ON UPDATE CASCADE,
    room_id VARCHAR(64) NOT NULL,
    department VARCHAR(255) NOT NULL,
    use_type VARCHAR(128) NOT NULL,
    allocation_order_no VARCHAR(128) NOT NULL,
    start_date VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'vacant' CHECK (status IN ('full', 'partial', 'vacant')),
    capacity_text VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_occupancy_unit_code ON occupancy_records(unit_code);
CREATE INDEX IF NOT EXISTS idx_occupancy_status ON occupancy_records(status);
CREATE INDEX IF NOT EXISTS idx_occupancy_department ON occupancy_records(department);

-- 6. Periodic Safety & Technical Inspections (الكشوفات الدورية والسلامة)
CREATE TABLE IF NOT EXISTS periodic_inspections (
    id VARCHAR(64) PRIMARY KEY,
    unit_code VARCHAR(64) NOT NULL REFERENCES units(code) ON DELETE CASCADE ON UPDATE CASCADE,
    unit_name VARCHAR(255),
    field VARCHAR(128) NOT NULL,
    governorate VARCHAR(128) NOT NULL,
    inspection_type VARCHAR(64) NOT NULL CHECK (inspection_type IN ('structural', 'safety_hse', 'mechanical_electrical', 'comprehensive')),
    title VARCHAR(255) NOT NULL,
    frequency VARCHAR(32) NOT NULL DEFAULT 'quarterly' CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual', 'custom')),
    custom_interval_days INTEGER,
    last_inspection_date VARCHAR(64) NOT NULL,
    next_due_date VARCHAR(64) NOT NULL,
    assigned_team VARCHAR(255) NOT NULL,
    inspector_name VARCHAR(255) NOT NULL,
    performed_by_name VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
    notes TEXT,
    condition_grade_given CHAR(1) CHECK (condition_grade_given IN ('A', 'B', 'C', 'D')),
    completion_date VARCHAR(64),
    findings TEXT,
    recommendations TEXT,
    report_file_name VARCHAR(255),
    report_file_url TEXT,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_maintenance_request_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspections_unit_code ON periodic_inspections(unit_code);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON periodic_inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_next_due ON periodic_inspections(next_due_date);

-- 7. Audit Trail & Activity Logs (سجل التدقيق والعمليات)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    unit_code VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_initials VARCHAR(32) NOT NULL,
    affected_field VARCHAR(128) NOT NULL,
    previous_value TEXT,
    new_value TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_unit_code ON audit_logs(unit_code);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);

-- 8. Reference Tables (الجداول المرجعية وإعدادات النظام)
CREATE TABLE IF NOT EXISTS governorates_ref (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name_ar VARCHAR(128) NOT NULL,
    name_en VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS oilfields_ref (
    id VARCHAR(64) PRIMARY KEY,
    governorate_id VARCHAR(64) REFERENCES governorates_ref(id) ON DELETE CASCADE,
    code VARCHAR(64) UNIQUE NOT NULL,
    name_ar VARCHAR(128) NOT NULL,
    name_en VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'active'
);

-- Note: sites_ref table removed as requested to simplify settings and rely strictly on governorates and oilfields.
DROP TABLE IF EXISTS sites_ref CASCADE;

CREATE TABLE IF NOT EXISTS unit_types_ref (
    code VARCHAR(64) PRIMARY KEY,
    name_ar VARCHAR(128) NOT NULL,
    name_en VARCHAR(128),
    multi_story BOOLEAN NOT NULL DEFAULT false,
    default_roof VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE IF NOT EXISTS room_types_ref (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name_ar VARCHAR(128) NOT NULL,
    color_hex VARCHAR(32) NOT NULL,
    icon_name VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS equipment_types_ref (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name_ar VARCHAR(128) NOT NULL,
    name_en VARCHAR(128),
    icon_name VARCHAR(64) NOT NULL,
    render_geometry VARCHAR(64) NOT NULL DEFAULT 'box',
    default_capacity VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS maintenance_departments_ref (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    name_ar VARCHAR(128) NOT NULL,
    name_en VARCHAR(128),
    icon_name VARCHAR(64) NOT NULL DEFAULT 'Wrench',
    specialty VARCHAR(128) NOT NULL DEFAULT 'general',
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(64) NOT NULL,
    maintenance_department VARCHAR(128),
    email VARCHAR(255),
    phone VARCHAR(64),
    governorate VARCHAR(128),
    field VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    last_active TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_users_username ON system_users(username);
CREATE INDEX IF NOT EXISTS idx_system_users_role ON system_users(role);

-- 9. Key-Value Dynamic System Settings & JSON Caches (إعدادات النظام العامة)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

CREATE TABLE IF NOT EXISTS system_branding (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    system_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    ministry_name VARCHAR(255) NOT NULL,
    country_name VARCHAR(255) NOT NULL,
    copyright_text VARCHAR(255) NOT NULL,
    logo_subtext VARCHAR(255),
    logo_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Additional Performance Indexes for High-Traffic Queries
CREATE INDEX IF NOT EXISTS idx_oilfields_gov_id ON oilfields_ref(governorate_id);
CREATE INDEX IF NOT EXISTS idx_occupancy_room_id ON occupancy_records(room_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to ON maintenance_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inspections_type ON periodic_inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_units_name_trgm ON units USING gin (name gin_trgm_ops);
