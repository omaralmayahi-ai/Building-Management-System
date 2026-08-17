import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDbPool, query } from './src/db/dbClient';
import {
  mapUnitRowToModel,
  mapModelToUnitRow,
  DbUnitRow,
  DbMaintenanceRequestRow,
  DbOccupancyRecordRow,
  DbPeriodicInspectionRow,
  DbAuditLogRow,
  DbOrgEntityRow,
} from './src/db/schema';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const API_SECRET_KEY = process.env.API_SECRET_KEY || 'midland_oil_secure_api_key_2026';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================================================
  // In-Memory Fallback Stores (active when PostgreSQL is not configured / during dev)
  // ==========================================================================
  const memStore = {
    units: [] as any[],
    maintenance: [] as any[],
    occupancy: [] as any[],
    inspections: [] as any[],
    auditLogs: [] as any[],
    orgEntities: [] as any[],
  };

  // Health check endpoint (public, no auth required)
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    const pool = getDbPool();
    if (pool) {
      try {
        await query('SELECT 1');
        dbStatus = 'connected';
      } catch (err: any) {
        dbStatus = `error: ${err.message}`;
      }
    }
    res.json({
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // API Authentication Middleware (Protected Routes under /api)
  // ==========================================================================
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path === '/health/') {
      return next();
    }
    const clientKey = req.headers['x-api-key'];
    if (!clientKey || clientKey !== API_SECRET_KEY) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-API-Key header' });
    }
    next();
  });

  // ==========================================================================
  // 1. Units API Endpoints
  // ==========================================================================
  app.get('/api/units', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<DbUnitRow>('SELECT * FROM units ORDER BY last_updated DESC');
        const units = result.rows.map(mapUnitRowToModel);
        return res.json(units);
      }
    } catch (err) {
      console.warn('DB query failed for /api/units, falling back to memory store:', err);
    }
    res.json(memStore.units);
  });

  app.post('/api/units', async (req, res) => {
    const unit = req.body;
    try {
      if (getDbPool()) {
        const row = mapModelToUnitRow(unit);
        await query(
          `INSERT INTO units (
            id, code, name, type, site_id, site_name, field, governorate,
            condition_grade, construction_year, department, departments,
            lat, lng, sector_address, total_area_sq_m, length_m, width_m, height_m,
            building_shape, floors_count, rooms, equipment, attachments, attachments_count,
            design_finishing, status, decommissioned_at, decommission_reason, last_updated
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25,
            $26, $27, $28, $29, $30
          ) ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            site_id = EXCLUDED.site_id,
            site_name = EXCLUDED.site_name,
            field = EXCLUDED.field,
            governorate = EXCLUDED.governorate,
            condition_grade = EXCLUDED.condition_grade,
            construction_year = EXCLUDED.construction_year,
            department = EXCLUDED.department,
            departments = EXCLUDED.departments,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            sector_address = EXCLUDED.sector_address,
            total_area_sq_m = EXCLUDED.total_area_sq_m,
            length_m = EXCLUDED.length_m,
            width_m = EXCLUDED.width_m,
            height_m = EXCLUDED.height_m,
            building_shape = EXCLUDED.building_shape,
            floors_count = EXCLUDED.floors_count,
            rooms = EXCLUDED.rooms,
            equipment = EXCLUDED.equipment,
            attachments = EXCLUDED.attachments,
            attachments_count = EXCLUDED.attachments_count,
            design_finishing = EXCLUDED.design_finishing,
            status = EXCLUDED.status,
            decommissioned_at = EXCLUDED.decommissioned_at,
            decommission_reason = EXCLUDED.decommission_reason,
            last_updated = EXCLUDED.last_updated`,
          [
            row.id, row.code, row.name, row.type, row.site_id, row.site_name, row.field, row.governorate,
            row.condition_grade, row.construction_year, row.department, JSON.stringify(row.departments),
            row.lat, row.lng, row.sector_address, row.total_area_sq_m, row.length_m || null, row.width_m || null, row.height_m || null,
            row.building_shape || 'rectangular', row.floors_count, JSON.stringify(row.rooms), JSON.stringify(row.equipment),
            JSON.stringify(row.attachments), row.attachments_count, JSON.stringify(row.design_finishing),
            row.status, row.decommissioned_at || null, row.decommission_reason || null, new Date().toISOString()
          ]
        );
      }
    } catch (err) {
      console.warn('DB insert failed for unit, updating memory store:', err);
    }
    const idx = memStore.units.findIndex((u) => u.code === unit.code);
    if (idx >= 0) memStore.units[idx] = unit;
    else memStore.units.unshift(unit);
    res.json({ success: true, unit });
  });

  app.put('/api/units/:code', async (req, res) => {
    const unit = req.body;
    try {
      if (getDbPool()) {
        const row = mapModelToUnitRow(unit);
        await query(
          `UPDATE units SET
            name = $1, type = $2, site_id = $3, site_name = $4, field = $5, governorate = $6,
            condition_grade = $7, construction_year = $8, department = $9, departments = $10,
            lat = $11, lng = $12, sector_address = $13, total_area_sq_m = $14, length_m = $15,
            width_m = $16, height_m = $17, building_shape = $18, floors_count = $19,
            rooms = $20, equipment = $21, attachments = $22, attachments_count = $23,
            design_finishing = $24, status = $25, decommissioned_at = $26,
            decommission_reason = $27, last_updated = $28
          WHERE code = $29`,
          [
            row.name, row.type, row.site_id, row.site_name, row.field, row.governorate,
            row.condition_grade, row.construction_year, row.department, JSON.stringify(row.departments),
            row.lat, row.lng, row.sector_address, row.total_area_sq_m, row.length_m || null,
            row.width_m || null, row.height_m || null, row.building_shape || 'rectangular', row.floors_count,
            JSON.stringify(row.rooms), JSON.stringify(row.equipment), JSON.stringify(row.attachments),
            row.attachments_count, JSON.stringify(row.design_finishing), row.status, row.decommissioned_at || null,
            row.decommission_reason || null, new Date().toISOString(), req.params.code
          ]
        );
      }
    } catch (err) {
      console.warn('DB update failed for unit:', err);
    }
    const idx = memStore.units.findIndex((u) => u.code === req.params.code);
    if (idx >= 0) memStore.units[idx] = unit;
    else memStore.units.push(unit);
    res.json({ success: true, unit });
  });

  app.delete('/api/units/:code', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM units WHERE code = $1', [req.params.code]);
      }
    } catch (err) {
      console.warn('DB delete failed for unit:', err);
    }
    memStore.units = memStore.units.filter((u) => u.code !== req.params.code);
    res.json({ success: true });
  });

  app.post('/api/units/bulk', async (req, res) => {
    const { units } = req.body;
    const unitList = units || [];
    try {
      const pool = getDbPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          if (unitList.length === 0) {
            await client.query('DELETE FROM units');
          } else {
            const codes = unitList.map((u: any) => u.code);
            await client.query('DELETE FROM units WHERE code != ALL($1::text[])', [codes]);
            for (const u of unitList) {
              const row = mapModelToUnitRow(u);
              await client.query(
                `INSERT INTO units (
                  id, code, name, type, site_id, site_name, field, governorate,
                  condition_grade, construction_year, department, departments,
                  lat, lng, sector_address, total_area_sq_m, length_m, width_m, height_m,
                  building_shape, floors_count, rooms, equipment, attachments, attachments_count,
                  design_finishing, status, decommissioned_at, decommission_reason, last_updated
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8,
                  $9, $10, $11, $12,
                  $13, $14, $15, $16, $17, $18, $19,
                  $20, $21, $22, $23, $24, $25,
                  $26, $27, $28, $29, $30
                ) ON CONFLICT (code) DO UPDATE SET
                  name = EXCLUDED.name,
                  type = EXCLUDED.type,
                  site_id = EXCLUDED.site_id,
                  site_name = EXCLUDED.site_name,
                  field = EXCLUDED.field,
                  governorate = EXCLUDED.governorate,
                  condition_grade = EXCLUDED.condition_grade,
                  construction_year = EXCLUDED.construction_year,
                  department = EXCLUDED.department,
                  departments = EXCLUDED.departments,
                  lat = EXCLUDED.lat,
                  lng = EXCLUDED.lng,
                  sector_address = EXCLUDED.sector_address,
                  total_area_sq_m = EXCLUDED.total_area_sq_m,
                  length_m = EXCLUDED.length_m,
                  width_m = EXCLUDED.width_m,
                  height_m = EXCLUDED.height_m,
                  building_shape = EXCLUDED.building_shape,
                  floors_count = EXCLUDED.floors_count,
                  rooms = EXCLUDED.rooms,
                  equipment = EXCLUDED.equipment,
                  attachments = EXCLUDED.attachments,
                  attachments_count = EXCLUDED.attachments_count,
                  design_finishing = EXCLUDED.design_finishing,
                  status = EXCLUDED.status,
                  decommissioned_at = EXCLUDED.decommissioned_at,
                  decommission_reason = EXCLUDED.decommission_reason,
                  last_updated = EXCLUDED.last_updated`,
                [
                  row.id, row.code, row.name, row.type, row.site_id, row.site_name, row.field, row.governorate,
                  row.condition_grade, row.construction_year, row.department, JSON.stringify(row.departments),
                  row.lat, row.lng, row.sector_address, row.total_area_sq_m, row.length_m || null, row.width_m || null, row.height_m || null,
                  row.building_shape || 'rectangular', row.floors_count, JSON.stringify(row.rooms), JSON.stringify(row.equipment),
                  JSON.stringify(row.attachments), row.attachments_count, JSON.stringify(row.design_finishing),
                  row.status, row.decommissioned_at || null, row.decommission_reason || null, new Date().toISOString()
                ]
              );
            }
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.warn('DB bulk save failed for units, updating memory store:', err);
    }
    memStore.units = unitList;
    res.json({ success: true });
  });

  // ==========================================================================
  // 2. Maintenance Requests API Endpoints
  // ==========================================================================
  app.get('/api/maintenance', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<DbMaintenanceRequestRow>('SELECT * FROM maintenance_requests ORDER BY created_at DESC');
        return res.json(result.rows.map((r) => ({
          id: r.id,
          unitCode: r.unit_code,
          unitName: r.unit_name,
          field: r.field,
          issue: r.issue,
          priority: r.priority as any,
          slaDeadline: r.sla_deadline,
          daysOverdue: r.days_overdue,
          assignedTo: r.assigned_to,
          status: r.status as any,
          reportedBy: r.reported_by,
          details: r.details,
          resolutionNotes: r.resolution_notes,
          completedBy: r.completed_by,
          completedAt: r.completed_at,
          sourceInspectionId: r.source_inspection_id,
        })));
      }
    } catch (err) {
      console.warn('DB query failed for /api/maintenance:', err);
    }
    res.json(memStore.maintenance);
  });

  app.post('/api/maintenance', async (req, res) => {
    const r = req.body;
    try {
      if (getDbPool()) {
        await query(
          `INSERT INTO maintenance_requests (
            id, unit_code, unit_name, field, issue, priority, sla_deadline,
            assigned_to, status, reported_by, details, source_inspection_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            assigned_to = EXCLUDED.assigned_to,
            issue = EXCLUDED.issue,
            priority = EXCLUDED.priority,
            resolution_notes = EXCLUDED.resolution_notes`,
          [
            r.id, r.unitCode, r.unitName || null, r.field, r.issue, r.priority || 'normal',
            r.slaDeadline || null, r.assignedTo, r.status || 'open', r.reportedBy,
            r.details || null, r.sourceInspectionId || null
          ]
        );
      }
    } catch (err) {
      console.warn('DB insert failed for maintenance request:', err);
    }
    const idx = memStore.maintenance.findIndex((m) => m.id === r.id);
    if (idx >= 0) memStore.maintenance[idx] = r;
    else memStore.maintenance.unshift(r);
    res.json({ success: true, request: r });
  });

  app.put('/api/maintenance/:id', async (req, res) => {
    const r = req.body;
    try {
      if (getDbPool()) {
        await query(
          `UPDATE maintenance_requests SET
            status = $1, assigned_to = $2, issue = $3, priority = $4,
            resolution_notes = $5, completed_by = $6, completed_at = $7
          WHERE id = $8`,
          [
            r.status, r.assignedTo, r.issue, r.priority,
            r.resolutionNotes || null, r.completedBy || null, r.completedAt || null, req.params.id
          ]
        );
      }
    } catch (err) {
      console.warn('DB update failed for maintenance request:', err);
    }
    const idx = memStore.maintenance.findIndex((m) => m.id === req.params.id);
    if (idx >= 0) memStore.maintenance[idx] = r;
    else memStore.maintenance.push(r);
    res.json({ success: true, request: r });
  });

  app.delete('/api/maintenance/:id', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM maintenance_requests WHERE id = $1', [req.params.id]);
      }
    } catch (err) {
      console.warn('DB delete failed for maintenance request:', err);
    }
    memStore.maintenance = memStore.maintenance.filter((m) => m.id !== req.params.id);
    res.json({ success: true });
  });

  app.post('/api/maintenance/bulk', async (req, res) => {
    const requests = req.body.requests || [];
    try {
      const pool = getDbPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          if (requests.length === 0) {
            await client.query('DELETE FROM maintenance_requests');
          } else {
            const ids = requests.map((r: any) => r.id);
            await client.query('DELETE FROM maintenance_requests WHERE id != ALL($1::text[])', [ids]);
            for (const r of requests) {
              await client.query(
                `INSERT INTO maintenance_requests (
                  id, unit_code, unit_name, field, issue, priority, sla_deadline,
                  assigned_to, status, reported_by, details, source_inspection_id,
                  resolution_notes, completed_by, completed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (id) DO UPDATE SET
                  unit_code = EXCLUDED.unit_code,
                  unit_name = EXCLUDED.unit_name,
                  field = EXCLUDED.field,
                  issue = EXCLUDED.issue,
                  priority = EXCLUDED.priority,
                  sla_deadline = EXCLUDED.sla_deadline,
                  assigned_to = EXCLUDED.assigned_to,
                  status = EXCLUDED.status,
                  reported_by = EXCLUDED.reported_by,
                  details = EXCLUDED.details,
                  source_inspection_id = EXCLUDED.source_inspection_id,
                  resolution_notes = EXCLUDED.resolution_notes,
                  completed_by = EXCLUDED.completed_by,
                  completed_at = EXCLUDED.completed_at`,
                [
                  r.id, r.unitCode, r.unitName || null, r.field, r.issue, r.priority || 'normal',
                  r.slaDeadline || null, r.assignedTo, r.status || 'open', r.reportedBy,
                  r.details || null, r.sourceInspectionId || null,
                  r.resolutionNotes || null, r.completedBy || null, r.completedAt || null
                ]
              );
            }
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.warn('DB bulk save failed for maintenance:', err);
    }
    memStore.maintenance = requests;
    res.json({ success: true });
  });

  // ==========================================================================
  // 3. Occupancy API Endpoints
  // ==========================================================================
  app.get('/api/occupancy', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<DbOccupancyRecordRow>('SELECT * FROM occupancy_records ORDER BY created_at DESC');
        return res.json(result.rows.map((r) => ({
          id: r.id,
          unitCode: r.unit_code,
          roomId: r.room_id,
          department: r.department,
          useType: r.use_type,
          allocationOrderNo: r.allocation_order_no,
          startDate: r.start_date,
          status: r.status as any,
          capacityText: r.capacity_text,
        })));
      }
    } catch (err) {
      console.warn('DB query failed for /api/occupancy:', err);
    }
    res.json(memStore.occupancy);
  });

  app.post('/api/occupancy', async (req, res) => {
    const o = req.body;
    try {
      if (getDbPool()) {
        await query(
          `INSERT INTO occupancy_records (
            id, unit_code, room_id, department, use_type, allocation_order_no, start_date, status, capacity_text
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            department = EXCLUDED.department,
            use_type = EXCLUDED.use_type,
            status = EXCLUDED.status,
            capacity_text = EXCLUDED.capacity_text`,
          [o.id, o.unitCode, o.roomId, o.department, o.useType, o.allocationOrderNo, o.startDate, o.status, o.capacityText || null]
        );
      }
    } catch (err) {
      console.warn('DB insert failed for occupancy record:', err);
    }
    const idx = memStore.occupancy.findIndex((item) => item.id === o.id);
    if (idx >= 0) memStore.occupancy[idx] = o;
    else memStore.occupancy.unshift(o);
    res.json({ success: true, record: o });
  });

  app.put('/api/occupancy/:id', async (req, res) => {
    const o = req.body;
    try {
      if (getDbPool()) {
        await query(
          `UPDATE occupancy_records SET
            department = $1, use_type = $2, status = $3, capacity_text = $4
          WHERE id = $5`,
          [o.department, o.useType, o.status, o.capacityText || null, req.params.id]
        );
      }
    } catch (err) {
      console.warn('DB update failed for occupancy record:', err);
    }
    const idx = memStore.occupancy.findIndex((item) => item.id === req.params.id);
    if (idx >= 0) memStore.occupancy[idx] = o;
    else memStore.occupancy.push(o);
    res.json({ success: true, record: o });
  });

  app.delete('/api/occupancy/:id', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM occupancy_records WHERE id = $1', [req.params.id]);
      }
    } catch (err) {
      console.warn('DB delete failed for occupancy record:', err);
    }
    memStore.occupancy = memStore.occupancy.filter((o) => o.id !== req.params.id);
    res.json({ success: true });
  });

  app.post('/api/occupancy/bulk', async (req, res) => {
    const records = req.body.records || [];
    try {
      const pool = getDbPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          if (records.length === 0) {
            await client.query('DELETE FROM occupancy_records');
          } else {
            const ids = records.map((o: any) => o.id);
            await client.query('DELETE FROM occupancy_records WHERE id != ALL($1::text[])', [ids]);
            for (const o of records) {
              await client.query(
                `INSERT INTO occupancy_records (
                  id, unit_code, room_id, department, use_type, allocation_order_no, start_date, status, capacity_text
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO UPDATE SET
                  unit_code = EXCLUDED.unit_code,
                  room_id = EXCLUDED.room_id,
                  department = EXCLUDED.department,
                  use_type = EXCLUDED.use_type,
                  allocation_order_no = EXCLUDED.allocation_order_no,
                  start_date = EXCLUDED.start_date,
                  status = EXCLUDED.status,
                  capacity_text = EXCLUDED.capacity_text`,
                [o.id, o.unitCode, o.roomId, o.department, o.useType, o.allocationOrderNo, o.startDate, o.status, o.capacityText || null]
              );
            }
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.warn('DB bulk save failed for occupancy:', err);
    }
    memStore.occupancy = records;
    res.json({ success: true });
  });

  // ==========================================================================
  // 4. Periodic Inspections API Endpoints
  // ==========================================================================
  app.get('/api/inspections', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<DbPeriodicInspectionRow>('SELECT * FROM periodic_inspections ORDER BY next_due_date ASC');
        return res.json(result.rows.map((r) => ({
          id: r.id,
          unitCode: r.unit_code,
          unitName: r.unit_name,
          field: r.field,
          governorate: r.governorate,
          inspectionType: r.inspection_type as any,
          title: r.title,
          frequency: r.frequency as any,
          customIntervalDays: r.custom_interval_days,
          lastInspectionDate: r.last_inspection_date,
          nextDueDate: r.next_due_date,
          assignedTeam: r.assigned_team,
          inspectorName: r.inspector_name,
          status: r.status as any,
          notes: r.notes,
          conditionGradeGiven: r.condition_grade_given as any,
          completionDate: r.completion_date,
          findings: r.findings,
          recommendations: r.recommendations,
          reportFileName: r.report_file_name,
          reportFileUrl: r.report_file_url,
          createdMaintenanceRequestId: r.created_maintenance_request_id,
        })));
      }
    } catch (err) {
      console.warn('DB query failed for /api/inspections:', err);
    }
    res.json(memStore.inspections);
  });

  app.post('/api/inspections', async (req, res) => {
    const s = req.body;
    try {
      if (getDbPool()) {
        await query(
          `INSERT INTO periodic_inspections (
            id, unit_code, unit_name, field, governorate, inspection_type, title,
            frequency, custom_interval_days, last_inspection_date, next_due_date,
            assigned_team, inspector_name, status, notes, condition_grade_given,
            completion_date, findings, recommendations, report_file_name, report_file_url,
            created_maintenance_request_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21,
            $22
          ) ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            completion_date = EXCLUDED.completion_date,
            condition_grade_given = EXCLUDED.condition_grade_given,
            findings = EXCLUDED.findings,
            recommendations = EXCLUDED.recommendations,
            next_due_date = EXCLUDED.next_due_date`,
          [
            s.id, s.unitCode, s.unitName || null, s.field, s.governorate, s.inspectionType, s.title,
            s.frequency || 'quarterly', s.customIntervalDays || null, s.lastInspectionDate, s.nextDueDate,
            s.assignedTeam, s.inspectorName, s.status || 'scheduled', s.notes || null, s.conditionGradeGiven || null,
            s.completionDate || null, s.findings || null, s.recommendations || null, s.reportFileName || null, s.reportFileUrl || null,
            s.createdMaintenanceRequestId || null
          ]
        );
      }
    } catch (err) {
      console.warn('DB insert failed for inspection:', err);
    }
    const idx = memStore.inspections.findIndex((i) => i.id === s.id);
    if (idx >= 0) memStore.inspections[idx] = s;
    else memStore.inspections.unshift(s);
    res.json({ success: true, inspection: s });
  });

  app.put('/api/inspections/:id', async (req, res) => {
    const s = req.body;
    try {
      if (getDbPool()) {
        await query(
          `UPDATE periodic_inspections SET
            status = $1, completion_date = $2, condition_grade_given = $3,
            findings = $4, recommendations = $5, next_due_date = $6
          WHERE id = $7`,
          [
            s.status, s.completionDate || null, s.conditionGradeGiven || null,
            s.findings || null, s.recommendations || null, s.nextDueDate, req.params.id
          ]
        );
      }
    } catch (err) {
      console.warn('DB update failed for inspection:', err);
    }
    const idx = memStore.inspections.findIndex((i) => i.id === req.params.id);
    if (idx >= 0) memStore.inspections[idx] = s;
    else memStore.inspections.push(s);
    res.json({ success: true, inspection: s });
  });

  app.delete('/api/inspections/:id', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM periodic_inspections WHERE id = $1', [req.params.id]);
      }
    } catch (err) {
      console.warn('DB delete failed for inspection:', err);
    }
    memStore.inspections = memStore.inspections.filter((i) => i.id !== req.params.id);
    res.json({ success: true });
  });

  app.post('/api/inspections/bulk', async (req, res) => {
    const inspections = req.body.inspections || [];
    try {
      const pool = getDbPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          if (inspections.length === 0) {
            await client.query('DELETE FROM periodic_inspections');
          } else {
            const ids = inspections.map((s: any) => s.id);
            await client.query('DELETE FROM periodic_inspections WHERE id != ALL($1::text[])', [ids]);
            for (const s of inspections) {
              await client.query(
                `INSERT INTO periodic_inspections (
                  id, unit_code, unit_name, field, governorate, inspection_type, title,
                  frequency, custom_interval_days, last_inspection_date, next_due_date,
                  assigned_team, inspector_name, status, notes, condition_grade_given,
                  completion_date, findings, recommendations, report_file_name, report_file_url,
                  created_maintenance_request_id
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7,
                  $8, $9, $10, $11,
                  $12, $13, $14, $15, $16,
                  $17, $18, $19, $20, $21,
                  $22
                ) ON CONFLICT (id) DO UPDATE SET
                  unit_code = EXCLUDED.unit_code,
                  unit_name = EXCLUDED.unit_name,
                  field = EXCLUDED.field,
                  governorate = EXCLUDED.governorate,
                  inspection_type = EXCLUDED.inspection_type,
                  title = EXCLUDED.title,
                  frequency = EXCLUDED.frequency,
                  custom_interval_days = EXCLUDED.custom_interval_days,
                  last_inspection_date = EXCLUDED.last_inspection_date,
                  next_due_date = EXCLUDED.next_due_date,
                  assigned_team = EXCLUDED.assigned_team,
                  inspector_name = EXCLUDED.inspector_name,
                  status = EXCLUDED.status,
                  notes = EXCLUDED.notes,
                  condition_grade_given = EXCLUDED.condition_grade_given,
                  completion_date = EXCLUDED.completion_date,
                  findings = EXCLUDED.findings,
                  recommendations = EXCLUDED.recommendations,
                  report_file_name = EXCLUDED.report_file_name,
                  report_file_url = EXCLUDED.report_file_url,
                  created_maintenance_request_id = EXCLUDED.created_maintenance_request_id`,
                [
                  s.id, s.unitCode, s.unitName || null, s.field, s.governorate, s.inspectionType, s.title,
                  s.frequency || 'quarterly', s.customIntervalDays || null, s.lastInspectionDate, s.nextDueDate,
                  s.assignedTeam, s.inspectorName, s.status || 'scheduled', s.notes || null, s.conditionGradeGiven || null,
                  s.completionDate || null, s.findings || null, s.recommendations || null, s.reportFileName || null, s.reportFileUrl || null,
                  s.createdMaintenanceRequestId || null
                ]
              );
            }
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.warn('DB bulk save failed for inspections:', err);
    }
    memStore.inspections = inspections;
    res.json({ success: true });
  });

  // ==========================================================================
  // 5. Audit Logs API Endpoints
  // ==========================================================================
  app.get('/api/audit-logs', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<DbAuditLogRow>('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200');
        return res.json(result.rows.map((r) => ({
          id: r.id,
          unitCode: r.unit_code,
          timestamp: r.timestamp,
          action: r.action,
          user: r.user_name,
          userInitials: r.user_initials,
          affectedField: r.affected_field,
          previousValue: r.previous_value,
          newValue: r.new_value,
        })));
      }
    } catch (err) {
      console.warn('DB query failed for /api/audit-logs:', err);
    }
    res.json(memStore.auditLogs);
  });

  app.post('/api/audit-logs', async (req, res) => {
    const l = req.body;
    try {
      if (getDbPool()) {
        await query(
          `INSERT INTO audit_logs (id, unit_code, action, user_name, user_initials, affected_field, previous_value, new_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [l.id, l.unitCode || 'GLOBAL', l.action, l.user, l.userInitials || '—', l.affectedField, l.previousValue || null, l.newValue || null]
        );
      }
    } catch (err) {
      console.warn('DB insert failed for audit log:', err);
    }
    memStore.auditLogs.unshift(l);
    if (memStore.auditLogs.length > 500) memStore.auditLogs.pop();
    res.json({ success: true, log: l });
  });

  app.post('/api/audit-logs/bulk', async (req, res) => {
    const logs = req.body.logs || [];
    try {
      const pool = getDbPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          if (logs.length === 0) {
            await client.query('DELETE FROM audit_logs');
          } else {
            const ids = logs.map((l: any) => l.id);
            await client.query('DELETE FROM audit_logs WHERE id != ALL($1::text[])', [ids]);
            for (const l of logs) {
              await client.query(
                `INSERT INTO audit_logs (id, unit_code, action, user_name, user_initials, affected_field, previous_value, new_value)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET
                   unit_code = EXCLUDED.unit_code,
                   action = EXCLUDED.action,
                   user_name = EXCLUDED.user_name,
                   user_initials = EXCLUDED.user_initials,
                   affected_field = EXCLUDED.affected_field,
                   previous_value = EXCLUDED.previous_value,
                   new_value = EXCLUDED.new_value`,
                [l.id, l.unitCode || 'GLOBAL', l.action, l.user, l.userInitials || '—', l.affectedField, l.previousValue || null, l.newValue || null]
              );
            }
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.warn('DB bulk save failed for audit logs:', err);
    }
    memStore.auditLogs = logs;
    res.json({ success: true });
  });

  // ==========================================================================
  // 6. Organization Entities API Endpoints
  // ==========================================================================
  app.get('/api/org-entities', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<DbOrgEntityRow>('SELECT * FROM org_entities ORDER BY level ASC, name_ar ASC');
        return res.json(result.rows.map((r) => ({
          id: r.id,
          code: r.code,
          nameAr: r.name_ar,
          nameEn: r.name_en,
          parentId: r.parent_id,
          level: r.level as any,
          employeeCount: r.employee_count,
          status: r.status,
        })));
      }
    } catch (err) {
      console.warn('DB query failed for /api/org-entities:', err);
    }
    res.json(memStore.orgEntities);
  });

  app.post('/api/org-entities', async (req, res) => {
    const e = req.body;
    try {
      if (getDbPool()) {
        await query(
          `INSERT INTO org_entities (id, code, name_ar, name_en, parent_id, level, employee_count, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name_ar = EXCLUDED.name_ar,
             name_en = EXCLUDED.name_en,
             parent_id = EXCLUDED.parent_id,
             level = EXCLUDED.level,
             employee_count = EXCLUDED.employee_count,
             status = EXCLUDED.status`,
          [e.id, e.code, e.nameAr, e.nameEn || null, e.parentId || null, e.level, e.employeeCount || 0, e.status || 'active']
        );
      }
    } catch (err) {
      console.warn('DB insert failed for org entity:', err);
    }
    const idx = memStore.orgEntities.findIndex((item) => item.id === e.id);
    if (idx >= 0) memStore.orgEntities[idx] = e;
    else memStore.orgEntities.unshift(e);
    res.json({ success: true, entity: e });
  });

  app.put('/api/org-entities/:id', async (req, res) => {
    const e = req.body;
    try {
      if (getDbPool()) {
        await query(
          `UPDATE org_entities SET
            name_ar = $1, name_en = $2, parent_id = $3, level = $4, employee_count = $5, status = $6
          WHERE id = $7`,
          [e.nameAr, e.nameEn || null, e.parentId || null, e.level, e.employeeCount || 0, e.status || 'active', req.params.id]
        );
      }
    } catch (err) {
      console.warn('DB update failed for org entity:', err);
    }
    const idx = memStore.orgEntities.findIndex((item) => item.id === req.params.id);
    if (idx >= 0) memStore.orgEntities[idx] = e;
    else memStore.orgEntities.push(e);
    res.json({ success: true, entity: e });
  });

  app.delete('/api/org-entities/:id', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM org_entities WHERE id = $1', [req.params.id]);
      }
    } catch (err) {
      console.warn('DB delete failed for org entity:', err);
    }
    memStore.orgEntities = memStore.orgEntities.filter((e) => e.id !== req.params.id);
    res.json({ success: true });
  });

  app.post('/api/org-entities/bulk', async (req, res) => {
    const entities = req.body.entities || [];
    try {
      const pool = getDbPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          if (entities.length === 0) {
            await client.query('DELETE FROM org_entities');
          } else {
            const ids = entities.map((e: any) => e.id);
            await client.query('DELETE FROM org_entities WHERE id != ALL($1::text[])', [ids]);
            for (const e of entities) {
              await client.query(
                `INSERT INTO org_entities (id, code, name_ar, name_en, parent_id, level, employee_count, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET
                   code = EXCLUDED.code,
                   name_ar = EXCLUDED.name_ar,
                   name_en = EXCLUDED.name_en,
                   parent_id = EXCLUDED.parent_id,
                   level = EXCLUDED.level,
                   employee_count = EXCLUDED.employee_count,
                   status = EXCLUDED.status`,
                [e.id, e.code, e.nameAr, e.nameEn || null, e.parentId || null, e.level, e.employeeCount || 0, e.status || 'active']
              );
            }
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    } catch (err) {
      console.warn('DB bulk save failed for org entities:', err);
    }
    memStore.orgEntities = entities;
    res.json({ success: true });
  });

  // ==========================================================================
  // Vite Integration & Static Frontend Serving
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Midland Oil Assets Backend & UI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
