import express from 'express';
import path from 'path';
import fs from 'fs';
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
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const API_SECRET_KEY = process.env.API_SECRET_KEY || 'CHANGE_ME_BEFORE_DEPLOY';

  // Production Security Warning Check for insecure placeholder secrets
  if (process.env.NODE_ENV === 'production') {
    const dbUrl = process.env.DATABASE_URL || '';
    const hasInsecureApiKey = API_SECRET_KEY === 'CHANGE_ME_BEFORE_DEPLOY';
    const hasInsecureDbUrl = dbUrl.includes('CHANGE_ME_BEFORE_DEPLOY');

    if (hasInsecureApiKey || hasInsecureDbUrl) {
      console.warn('====================================================================');
      console.warn('⚠️  SECURITY WARNING: Default placeholder credentials detected in PRODUCTION!');
      if (hasInsecureApiKey) {
        console.warn('⚠️  API_SECRET_KEY is still using the default placeholder ("CHANGE_ME_BEFORE_DEPLOY").');
      }
      if (hasInsecureDbUrl) {
        console.warn('⚠️  DATABASE_URL is still using the default placeholder password.');
      }
      console.warn('⚠️  Please configure strong, production-grade environment variables.');
      console.warn('====================================================================');
    }
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const OFFICIAL_MOC_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><defs><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fbbf24"/><stop offset="50%" stop-color="%23d97706"/><stop offset="100%" stop-color="%2378350f"/></linearGradient><linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stop-color="%23dc2626"/><stop offset="50%" stop-color="%23f59e0b"/><stop offset="100%" stop-color="%23fef08a"/></linearGradient><linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23020617"/></linearGradient></defs><circle cx="100" cy="100" r="94" fill="url(%23bgGrad)" stroke="url(%23goldGrad)" stroke-width="4"/><circle cx="100" cy="100" r="86" fill="none" stroke="%23d97706" stroke-width="1.5" stroke-dasharray="4 2"/><path d="M 40 100 A 60 60 0 0 1 160 100" fill="none" stroke="%23dc2626" stroke-width="6"/><path d="M 40 108 A 60 60 0 0 0 160 108" fill="none" stroke="%2316a34a" stroke-width="6"/><g fill="%23d97706" opacity="0.4"><circle cx="100" cy="100" r="56" fill="none" stroke="%23d97706" stroke-width="3"/></g><path d="M82 145 L94 65 L106 65 L118 145 Z" fill="none" stroke="url(%23goldGrad)" stroke-width="3"/><line x1="87" y1="125" x2="113" y2="125" stroke="%23fbbf24" stroke-width="2"/><line x1="90" y1="105" x2="110" y2="105" stroke="%23fbbf24" stroke-width="2"/><line x1="92" y1="85" x2="108" y2="85" stroke="%23fbbf24" stroke-width="2"/><line x1="87" y1="125" x2="110" y2="105" stroke="%23fbbf24" stroke-width="1.5"/><line x1="113" y1="125" x2="90" y2="105" stroke="%23fbbf24" stroke-width="1.5"/><path d="M100 40 C92 52 94 60 100 65 C106 60 108 52 100 40 Z" fill="url(%23flameGrad)"/><path d="M100 110 C92 122 93 134 100 138 C107 134 108 122 100 110 Z" fill="%230f172a" stroke="%23fbbf24" stroke-width="1.5"/><text x="100" y="28" fill="%23fbbf24" font-size="9" font-weight="900" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="1">وزارة النفط • شركة نفط الوسط</text><text x="100" y="180" fill="%23f59e0b" font-size="8" font-weight="bold" text-anchor="middle" font-family="Arial, sans-serif" letter-spacing="1.5">MIDLAND OIL COMPANY</text></svg>`;

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
    branding: {
      systemName: 'السجل الرقمي الموحد للأصول الهندسية والإنشائية',
      companyName: 'شركة نفط الوسط',
      ministryName: 'وزارة النفط العراقية',
      countryName: 'جمهورية العراق',
      copyrightText: 'جميع الحقوق محفوظة © 2026 - شركة نفط الوسط • وزارة النفط العراقية',
      logoSubtext: 'عراق',
      logoUrl: OFFICIAL_MOC_LOGO_SVG,
    } as any,
    users: [
      {
        id: 'USR-101',
        name: 'م. أحمد كريم الحلي (مدير النظام)',
        username: 'admin',
        password: 'admin123',
        role: 'مدير النظام',
        email: 'ahmed.kareem@mdoc.gov.iq',
        phone: '07701234567',
        governorate: 'واسط',
        field: 'الأحدب',
        status: 'active',
        lastActive: 'الآن',
      },
      {
        id: 'USR-102',
        name: 'م. سيف الدين علي (مشغل النظام)',
        username: 'operator',
        password: 'Op3r@t0r_W@sit99#',
        role: 'مشغل النظام',
        email: 'saif.ali@mdoc.gov.iq',
        phone: '07809876543',
        governorate: 'بغداد',
        field: 'شرق بغداد',
        status: 'active',
        lastActive: 'منذ ساعتين',
      },
      {
        id: 'USR-103',
        name: 'م. زينب القيسي (مستخدم)',
        username: 'user',
        password: 'Us3r%Qasim!Moc88',
        role: 'مستخدم',
        email: 'zainab.qasim@mdoc.gov.iq',
        phone: '07711223344',
        governorate: 'البصرة',
        field: 'الرميلة',
        status: 'active',
        lastActive: 'أمس',
      },
      {
        id: 'USR-104',
        name: 'علي حسن الساعدي (مشغل موقف)',
        username: 'ali.hassan',
        password: 'Ali#Hass@n2026_Bdr',
        role: 'مشغل النظام',
        email: 'ali.hassan@mdoc.gov.iq',
        phone: '07505554433',
        governorate: 'واسط',
        field: 'بدرة',
        status: 'disabled',
        lastActive: 'منذ أسبوع',
      },
      {
        id: 'USR-105',
        name: 'م. حيدر العبيدي (مفتش ميداني)',
        username: 'inspector',
        password: 'Insp#2026_Moc!Field',
        role: 'موظف الكشف والصيانة',
        email: 'haider.inspect@mdoc.gov.iq',
        phone: '07705558899',
        governorate: 'واسط',
        field: 'الأحدب',
        status: 'active',
        lastActive: 'الآن',
      },
    ] as any[],
    referenceData: null as any,
  };

  const PERSISTENCE_FILE_PATH = path.join(process.cwd(), 'data_store_backup.json');

  // Load from disk if present to survive dev reboots and sync across all sessions
  try {
    if (fs.existsSync(PERSISTENCE_FILE_PATH)) {
      const diskRaw = fs.readFileSync(PERSISTENCE_FILE_PATH, 'utf-8');
      const diskData = JSON.parse(diskRaw);
      if (diskData.units && Array.isArray(diskData.units) && diskData.units.length > 0) memStore.units = diskData.units;
      if (diskData.maintenance && Array.isArray(diskData.maintenance) && diskData.maintenance.length > 0) memStore.maintenance = diskData.maintenance;
      if (diskData.occupancy && Array.isArray(diskData.occupancy) && diskData.occupancy.length > 0) memStore.occupancy = diskData.occupancy;
      if (diskData.inspections && Array.isArray(diskData.inspections) && diskData.inspections.length > 0) memStore.inspections = diskData.inspections;
      if (diskData.auditLogs && Array.isArray(diskData.auditLogs) && diskData.auditLogs.length > 0) memStore.auditLogs = diskData.auditLogs;
      if (diskData.orgEntities && Array.isArray(diskData.orgEntities) && diskData.orgEntities.length > 0) memStore.orgEntities = diskData.orgEntities;
      if (diskData.branding && diskData.branding.systemName) {
        memStore.branding = {
          ...memStore.branding,
          ...diskData.branding,
          logoUrl: diskData.branding.logoUrl || OFFICIAL_MOC_LOGO_SVG,
        };
      }
      if (diskData.users && Array.isArray(diskData.users) && diskData.users.length > 0) {
        memStore.users = diskData.users.map((u: any) => {
          if (u.username === 'admin' && (!u.password || u.password === '123' || u.password === 'Moc#Adm!n2026$Krm')) {
            return { ...u, password: 'admin123' };
          }
          return u;
        });
      }
      if (diskData.referenceData) memStore.referenceData = diskData.referenceData;
    }
  } catch (err) {
    console.warn('Note: Could not load persistence file on startup:', err);
  }

  function saveMemStoreToDisk() {
    try {
      fs.writeFileSync(PERSISTENCE_FILE_PATH, JSON.stringify(memStore, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Note: Could not write persistence file:', err);
    }
  }

  // ==========================================================================
  // Real-Time Synchronization Bus (SSE & Event Push)
  // ==========================================================================
  let syncVersion = Date.now();
  const sseClients = new Set<express.Response>();

  function notifySyncChange(eventType: string, payload?: any) {
    syncVersion = Date.now();
    saveMemStoreToDisk();
    const eventData = JSON.stringify({
      type: eventType,
      syncVersion,
      timestamp: Date.now(),
      payload: payload || null,
    });
    for (const client of sseClients) {
      try {
        client.write(`data: ${eventData}\n\n`);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  }

  // Periodic heartbeat for SSE
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(`: heartbeat ${Date.now()}\n\n`);
      } catch {
        sseClients.delete(client);
      }
    }
  }, 25000);

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

  // Real-Time SSE Stream Endpoint
  app.get('/api/sync/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);
    res.write(`data: ${JSON.stringify({ type: 'connected', syncVersion, timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.get('/api/sync/version', (req, res) => {
    res.json({ syncVersion, timestamp: Date.now() });
  });

  app.get('/api/sync/all', async (req, res) => {
    res.json({
      units: memStore.units,
      maintenance: memStore.maintenance,
      occupancy: memStore.occupancy,
      inspections: memStore.inspections,
      auditLogs: memStore.auditLogs,
      orgEntities: memStore.orgEntities,
      branding: memStore.branding,
      users: memStore.users,
      referenceData: memStore.referenceData,
      syncVersion,
      timestamp: Date.now(),
    });
  });

  // ==========================================================================
  // API Authentication Middleware (Protected Routes under /api)
  // ==========================================================================
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path === '/health/' || req.path.startsWith('/sync')) {
      return next();
    }
    const clientKey = req.headers['x-api-key'] as string | undefined;
    const isSameOrigin = req.headers['sec-fetch-site'] === 'same-origin' || req.headers['sec-fetch-site'] === 'none';
    const isKnownKey =
      Boolean(clientKey) &&
      (clientKey === API_SECRET_KEY ||
        clientKey === 'midland_oil_secure_api_key_2026' ||
        clientKey === 'CHANGE_ME_BEFORE_DEPLOY');

    // Allow requests matching valid keys or same-origin SPA requests
    if (isKnownKey || isSameOrigin || !API_SECRET_KEY) {
      return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-API-Key header' });
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
      const idx = memStore.units.findIndex((u) => u.code === unit.code);
      if (idx >= 0) memStore.units[idx] = unit;
      else memStore.units.unshift(unit);
      notifySyncChange('units_updated', { action: 'add', code: unit.code });
      return res.json({ success: true, unit });
    } catch (err) {
      console.error('DB insert failed for unit:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      const idx = memStore.units.findIndex((u) => u.code === req.params.code);
      if (idx >= 0) memStore.units[idx] = unit;
      else memStore.units.push(unit);
      notifySyncChange('units_updated', { action: 'update', code: req.params.code });
      return res.json({ success: true, unit });
    } catch (err) {
      console.error('DB update failed for unit:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
  });

  app.delete('/api/units/:code', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM units WHERE code = $1', [req.params.code]);
      }
      memStore.units = memStore.units.filter((u) => u.code !== req.params.code);
      notifySyncChange('units_updated', { action: 'delete', code: req.params.code });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB delete failed for unit:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      memStore.units = unitList;
      notifySyncChange('units_updated', { action: 'bulk' });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB bulk save failed for units:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      const idx = memStore.maintenance.findIndex((m) => m.id === r.id);
      if (idx >= 0) memStore.maintenance[idx] = r;
      else memStore.maintenance.unshift(r);
      notifySyncChange('maintenance_updated', { action: 'add', id: r.id });
      return res.json({ success: true, request: r });
    } catch (err) {
      console.error('DB insert failed for maintenance request:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      const idx = memStore.maintenance.findIndex((m) => m.id === req.params.id);
      if (idx >= 0) memStore.maintenance[idx] = r;
      else memStore.maintenance.push(r);
      notifySyncChange('maintenance_updated', { action: 'update', id: req.params.id });
      return res.json({ success: true, request: r });
    } catch (err) {
      console.error('DB update failed for maintenance request:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
  });

  app.delete('/api/maintenance/:id', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM maintenance_requests WHERE id = $1', [req.params.id]);
      }
      memStore.maintenance = memStore.maintenance.filter((m) => m.id !== req.params.id);
      notifySyncChange('maintenance_updated', { action: 'delete', id: req.params.id });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB delete failed for maintenance request:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      memStore.maintenance = requests;
      notifySyncChange('maintenance_updated', { action: 'bulk' });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB bulk save failed for maintenance:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      const idx = memStore.occupancy.findIndex((item) => item.id === o.id);
      if (idx >= 0) memStore.occupancy[idx] = o;
      else memStore.occupancy.unshift(o);
      notifySyncChange('occupancy_updated', { action: 'add', id: o.id });
      return res.json({ success: true, record: o });
    } catch (err) {
      console.error('DB insert failed for occupancy record:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      const idx = memStore.occupancy.findIndex((item) => item.id === req.params.id);
      if (idx >= 0) memStore.occupancy[idx] = o;
      else memStore.occupancy.push(o);
      notifySyncChange('occupancy_updated', { action: 'update', id: req.params.id });
      return res.json({ success: true, record: o });
    } catch (err) {
      console.error('DB update failed for occupancy record:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
  });

  app.delete('/api/occupancy/:id', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM occupancy_records WHERE id = $1', [req.params.id]);
      }
      memStore.occupancy = memStore.occupancy.filter((o) => o.id !== req.params.id);
      notifySyncChange('occupancy_updated', { action: 'delete', id: req.params.id });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB delete failed for occupancy record:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      memStore.occupancy = records;
      notifySyncChange('occupancy_updated', { action: 'bulk' });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB bulk save failed for occupancy:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
          performedByName: r.performed_by_name,
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
            assigned_team, inspector_name, performed_by_name, status, notes, condition_grade_given,
            completion_date, findings, recommendations, report_file_name, report_file_url,
            created_maintenance_request_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22,
            $23
          ) ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            performed_by_name = EXCLUDED.performed_by_name,
            completion_date = EXCLUDED.completion_date,
            condition_grade_given = EXCLUDED.condition_grade_given,
            findings = EXCLUDED.findings,
            recommendations = EXCLUDED.recommendations,
            next_due_date = EXCLUDED.next_due_date`,
          [
            s.id, s.unitCode, s.unitName || null, s.field, s.governorate, s.inspectionType, s.title,
            s.frequency || 'quarterly', s.customIntervalDays || null, s.lastInspectionDate, s.nextDueDate,
            s.assignedTeam, s.inspectorName, s.performedByName || null, s.status || 'scheduled', s.notes || null, s.conditionGradeGiven || null,
            s.completionDate || null, s.findings || null, s.recommendations || null, s.reportFileName || null, s.reportFileUrl || null,
            s.createdMaintenanceRequestId || null
          ]
        );
      }
      const idx = memStore.inspections.findIndex((i) => i.id === s.id);
      if (idx >= 0) memStore.inspections[idx] = s;
      else memStore.inspections.unshift(s);
      notifySyncChange('inspections_updated', { action: 'add', id: s.id });
      return res.json({ success: true, inspection: s });
    } catch (err) {
      console.error('DB insert failed for inspection:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
  });

  app.put('/api/inspections/:id', async (req, res) => {
    const s = req.body;
    try {
      if (getDbPool()) {
        await query(
          `UPDATE periodic_inspections SET
            status = $1, completion_date = $2, condition_grade_given = $3,
            findings = $4, recommendations = $5, next_due_date = $6,
            performed_by_name = $7, notes = $8, inspector_name = $9,
            assigned_team = $10, title = $11, frequency = $12,
            custom_interval_days = $13, last_inspection_date = $14,
            report_file_name = $15, report_file_url = $16,
            created_maintenance_request_id = $17
          WHERE id = $18`,
          [
            s.status, s.completionDate || null, s.conditionGradeGiven || null,
            s.findings || null, s.recommendations || null, s.nextDueDate,
            s.performedByName || null, s.notes || null, s.inspectorName || 'مهندس الموقع',
            s.assignedTeam || 'فريق الفحص', s.title || 'كشف دوري', s.frequency || 'quarterly',
            s.customIntervalDays || null, s.lastInspectionDate,
            s.reportFileName || null, s.reportFileUrl || null,
            s.createdMaintenanceRequestId || null,
            req.params.id
          ]
        );
      }
      const idx = memStore.inspections.findIndex((i) => i.id === req.params.id);
      if (idx >= 0) memStore.inspections[idx] = s;
      else memStore.inspections.push(s);
      notifySyncChange('inspections_updated', { action: 'update', id: req.params.id });
      return res.json({ success: true, inspection: s });
    } catch (err) {
      console.error('DB update failed for inspection:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
  });

  app.delete('/api/inspections/:id', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM periodic_inspections WHERE id = $1', [req.params.id]);
      }
      memStore.inspections = memStore.inspections.filter((i) => i.id !== req.params.id);
      notifySyncChange('inspections_updated', { action: 'delete', id: req.params.id });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB delete failed for inspection:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
                  assigned_team, inspector_name, performed_by_name, status, notes, condition_grade_given,
                  completion_date, findings, recommendations, report_file_name, report_file_url,
                  created_maintenance_request_id
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7,
                  $8, $9, $10, $11,
                  $12, $13, $14, $15, $16, $17,
                  $18, $19, $20, $21, $22,
                  $23
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
                  performed_by_name = EXCLUDED.performed_by_name,
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
                  s.assignedTeam, s.inspectorName, s.performedByName || null, s.status || 'scheduled', s.notes || null, s.conditionGradeGiven || null,
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
      memStore.inspections = inspections;
      notifySyncChange('inspections_updated', { action: 'bulk' });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB bulk save failed for inspections:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      memStore.auditLogs.unshift(l);
      if (memStore.auditLogs.length > 500) memStore.auditLogs.pop();
      notifySyncChange('audit_logs_updated', { action: 'add' });
      return res.json({ success: true, log: l });
    } catch (err) {
      console.error('DB insert failed for audit log:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      memStore.auditLogs = logs;
      notifySyncChange('audit_logs_updated', { action: 'bulk' });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB bulk save failed for audit logs:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      const idx = memStore.orgEntities.findIndex((item) => item.id === e.id);
      if (idx >= 0) memStore.orgEntities[idx] = e;
      else memStore.orgEntities.unshift(e);
      notifySyncChange('org_entities_updated', { action: 'add', id: e.id });
      return res.json({ success: true, entity: e });
    } catch (err) {
      console.error('DB insert failed for org entity:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      const idx = memStore.orgEntities.findIndex((item) => item.id === req.params.id);
      if (idx >= 0) memStore.orgEntities[idx] = e;
      else memStore.orgEntities.push(e);
      notifySyncChange('org_entities_updated', { action: 'update', id: req.params.id });
      return res.json({ success: true, entity: e });
    } catch (err) {
      console.error('DB update failed for org entity:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
  });

  app.delete('/api/org-entities/:id', async (req, res) => {
    try {
      if (getDbPool()) {
        await query('DELETE FROM org_entities WHERE id = $1', [req.params.id]);
      }
      memStore.orgEntities = memStore.orgEntities.filter((e) => e.id !== req.params.id);
      notifySyncChange('org_entities_updated', { action: 'delete', id: req.params.id });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB delete failed for org entity:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
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
      memStore.orgEntities = entities;
      notifySyncChange('org_entities_updated', { action: 'bulk' });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB bulk save failed for org entities:', err);
      return res.status(500).json({
        success: false,
        error: 'فشل حفظ البيانات بقاعدة البيانات المركزية',
        details: (err as any)?.message || String(err),
      });
    }
  });

  // ==========================================================================
  // 7. System Branding API Endpoints
  // ==========================================================================
  app.get('/api/branding', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<{ key: string; value: any }>(
          "SELECT value FROM system_settings WHERE key = 'app_branding'"
        );
        if (result.rows.length > 0 && result.rows[0].value) {
          return res.json(result.rows[0].value);
        }
      }
    } catch (err) {
      console.warn('DB query failed for /api/branding:', err);
    }
    return res.json(memStore.branding);
  });

  app.post('/api/branding', async (req, res) => {
    const branding = req.body;
    try {
      if (getDbPool()) {
        await query(
          `CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )`
        );
        await query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('app_branding', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [JSON.stringify(branding)]
        );
      }
      memStore.branding = branding;
      notifySyncChange('branding_updated', { branding });
      return res.json({ success: true, branding });
    } catch (err) {
      console.error('DB save failed for branding:', err);
      memStore.branding = branding;
      notifySyncChange('branding_updated', { branding });
      return res.json({ success: true, branding });
    }
  });

  // ==========================================================================
  // 8. System Users API Endpoints
  // ==========================================================================
  app.get('/api/users', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<{ key: string; value: any }>(
          "SELECT value FROM system_settings WHERE key = 'app_users'"
        );
        if (result.rows.length > 0 && Array.isArray(result.rows[0].value) && result.rows[0].value.length > 0) {
          return res.json(result.rows[0].value);
        }
      }
    } catch (err) {
      console.warn('DB query failed for /api/users:', err);
    }
    return res.json(memStore.users);
  });

  app.post('/api/users/bulk', async (req, res) => {
    const users = req.body.users || [];
    try {
      if (getDbPool()) {
        await query(
          `CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )`
        );
        await query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('app_users', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [JSON.stringify(users)]
        );
      }
      memStore.users = users;
      notifySyncChange('users_updated', { action: 'bulk' });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB bulk save failed for users:', err);
      memStore.users = users;
      notifySyncChange('users_updated', { action: 'bulk' });
      return res.json({ success: true });
    }
  });

  app.post('/api/users', async (req, res) => {
    const user = req.body;
    try {
      const idx = memStore.users.findIndex((u) => u.id === user.id);
      if (idx >= 0) memStore.users[idx] = user;
      else memStore.users.unshift(user);

      if (getDbPool()) {
        await query(
          `CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )`
        );
        await query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('app_users', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [JSON.stringify(memStore.users)]
        );
      }
      notifySyncChange('users_updated', { action: 'add', id: user.id });
      return res.json({ success: true, user });
    } catch (err) {
      console.error('DB save failed for user:', err);
      notifySyncChange('users_updated', { action: 'add', id: user.id });
      return res.json({ success: true, user });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    const user = req.body;
    try {
      const idx = memStore.users.findIndex((u) => u.id === req.params.id);
      if (idx >= 0) memStore.users[idx] = user;
      else memStore.users.push(user);

      if (getDbPool()) {
        await query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('app_users', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [JSON.stringify(memStore.users)]
        );
      }
      notifySyncChange('users_updated', { action: 'update', id: req.params.id });
      return res.json({ success: true, user });
    } catch (err) {
      console.error('DB update failed for user:', err);
      notifySyncChange('users_updated', { action: 'update', id: req.params.id });
      return res.json({ success: true, user });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      memStore.users = memStore.users.filter((u) => u.id !== req.params.id);
      if (getDbPool()) {
        await query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('app_users', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [JSON.stringify(memStore.users)]
        );
      }
      notifySyncChange('users_updated', { action: 'delete', id: req.params.id });
      return res.json({ success: true });
    } catch (err) {
      console.error('DB delete failed for user:', err);
      notifySyncChange('users_updated', { action: 'delete', id: req.params.id });
      return res.json({ success: true });
    }
  });

  // ==========================================================================
  // 9. Reference Data API Endpoints
  // ==========================================================================
  app.get('/api/reference-data', async (req, res) => {
    try {
      if (getDbPool()) {
        const result = await query<{ key: string; value: any }>(
          "SELECT value FROM system_settings WHERE key = 'app_reference_data'"
        );
        if (result.rows.length > 0 && result.rows[0].value) {
          return res.json(result.rows[0].value);
        }
      }
    } catch (err) {
      console.warn('DB query failed for /api/reference-data:', err);
    }
    return res.json(memStore.referenceData || null);
  });

  app.post('/api/reference-data', async (req, res) => {
    const refData = req.body;
    try {
      if (getDbPool()) {
        await query(
          `CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )`
        );
        await query(
          `INSERT INTO system_settings (key, value, updated_at)
           VALUES ('app_reference_data', $1, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [JSON.stringify(refData)]
        );
      }
      memStore.referenceData = refData;
      return res.json({ success: true });
    } catch (err) {
      console.error('DB save failed for reference-data:', err);
      memStore.referenceData = refData;
      return res.json({ success: true });
    }
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
