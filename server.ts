import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import rateLimit from 'express-rate-limit';
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
import {
  INITIAL_UNITS,
  INITIAL_MAINTENANCE_REQUESTS,
  INITIAL_OCCUPANCY_RECORDS,
  INITIAL_PERIODIC_INSPECTIONS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ORG_ENTITIES,
} from './src/data/mockData';

async function startServer() {
  const app = express();
  // Trust first proxy (Cloud Run / Nginx reverse proxy)
  app.set('trust proxy', 1);

  const PORT = 3000;
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

  const OFFICIAL_MOC_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><g fill="%23248d9c"><rect x="36" y="412" width="440" height="44" rx="4"/><path d="M 152 412 L 152 260 L 194 260 L 194 68 L 366 138 L 366 412 Z"/></g><g fill="%23ffffff"><rect x="222" y="110" width="24" height="24" rx="2"/><rect x="222" y="154" width="24" height="24" rx="2"/><rect x="222" y="198" width="24" height="24" rx="2"/><rect x="260" y="126" width="24" height="24" rx="2"/><rect x="260" y="170" width="24" height="24" rx="2"/><rect x="260" y="214" width="24" height="24" rx="2"/><rect x="170" y="286" width="22" height="22" rx="2"/><rect x="202" y="286" width="22" height="22" rx="2"/><rect x="234" y="286" width="22" height="22" rx="2"/><rect x="266" y="286" width="22" height="22" rx="2"/><rect x="170" y="326" width="22" height="22" rx="2"/><rect x="202" y="326" width="22" height="22" rx="2"/><rect x="234" y="326" width="22" height="22" rx="2"/><rect x="266" y="326" width="22" height="22" rx="2"/><rect x="170" y="366" width="22" height="22" rx="2"/><rect x="202" y="366" width="22" height="22" rx="2"/><rect x="234" y="366" width="22" height="22" rx="2"/><rect x="266" y="366" width="22" height="22" rx="2"/><rect x="304" y="176" width="50" height="16" rx="2"/><rect x="304" y="214" width="50" height="16" rx="2"/><rect x="304" y="252" width="50" height="16" rx="2"/><rect x="304" y="290" width="50" height="16" rx="2"/><rect x="304" y="328" width="50" height="16" rx="2"/><rect x="304" y="366" width="50" height="16" rx="2"/></g></svg>`;

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
    ] as any[],
    referenceData: null as any,
  };

  const PERSISTENCE_FILE_PATH = path.join(process.cwd(), 'data_store_backup.json');

  // Load from disk if present to survive dev reboots and sync across all sessions
  try {
    if (fs.existsSync(PERSISTENCE_FILE_PATH)) {
      const diskRaw = fs.readFileSync(PERSISTENCE_FILE_PATH, 'utf-8');
      const diskData = JSON.parse(diskRaw);
      if (diskData.units && Array.isArray(diskData.units)) memStore.units = diskData.units;
      if (diskData.maintenance && Array.isArray(diskData.maintenance)) memStore.maintenance = diskData.maintenance;
      if (diskData.occupancy && Array.isArray(diskData.occupancy)) memStore.occupancy = diskData.occupancy;
      if (diskData.inspections && Array.isArray(diskData.inspections)) memStore.inspections = diskData.inspections;
      if (diskData.auditLogs && Array.isArray(diskData.auditLogs)) memStore.auditLogs = diskData.auditLogs;
      if (diskData.orgEntities && Array.isArray(diskData.orgEntities)) memStore.orgEntities = diskData.orgEntities;
      if (diskData.branding && diskData.branding.systemName) {
        memStore.branding = {
          ...memStore.branding,
          ...diskData.branding,
          logoUrl: diskData.branding.logoUrl || OFFICIAL_MOC_LOGO_SVG,
        };
      }
      if (diskData.users && Array.isArray(diskData.users) && diskData.users.length > 0) {
        memStore.users = diskData.users.map((u: any) => {
          if (u.username === 'admin') {
            return {
              ...u,
              id: 'USR-101',
              name: u.name || 'عمر المياحي',
              phone: u.phone || '07701784629',
              role: 'مدير النظام',
              status: 'active',
              password: u.password || 'admin123',
            };
          }
          return u;
        });
      }
      if (diskData.referenceData) memStore.referenceData = diskData.referenceData;
    }
  } catch (err) {
    console.warn('Note: Could not load persistence file on startup:', err);
  }

  // Seed default official Midland Oil Company organizational entities if empty
  if (!memStore.orgEntities || memStore.orgEntities.length === 0) {
    memStore.orgEntities = INITIAL_ORG_ENTITIES;
    try {
      fs.writeFileSync(PERSISTENCE_FILE_PATH, JSON.stringify(memStore, null, 2), 'utf-8');
    } catch (e) {}
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

  // Attach server time header to all API responses for client synchronization
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Server-Time', Date.now().toString());
    next();
  });

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
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    res.json({
      status: 'ok',
      database: dbStatus,
      timestamp: now.toISOString(),
      serverTimeMs: now.getTime(),
      serverDateFormatted: `${d}-${m}-${y}`,
    });
  });

  // Dedicated Server Time & Date Endpoint (public, for client synchronization)
  app.get('/api/server-time', (req, res) => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    res.json({
      serverTimeMs: now.getTime(),
      serverIso: now.toISOString(),
      serverDateFormatted: `${d}-${m}-${y}`,
      serverTimeFormatted: `${hh}:${mm}:${ss}`,
      serverDateTimeFormatted: `${d}-${m}-${y} ${hh}:${mm}:${ss}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Baghdad',
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
  // Rate Limiting Middleware (Protected Routes under /api, excluding /health)
  // ==========================================================================
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false,
      trustProxy: false,
    },
    skip: (req) => req.path === '/health' || req.path === '/health/' || req.path === '/server-time',
    message: { error: 'عدد الطلبات كبير جداً، الرجاء المحاولة بعد قليل' },
    statusCode: 429,
  });
  app.use('/api', apiLimiter);

  // ==========================================================================
  // API Authentication Middleware (Protected Routes under /api)
  // ==========================================================================
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path === '/health/' || req.path === '/server-time' || req.path.startsWith('/sync')) {
      return next();
    }
    const clientKey = req.headers['x-api-key'] as string | undefined;
    const host = req.headers.host;
    const referer = req.headers.referer;
    const origin = req.headers.origin;
    const isRefererSameHost = Boolean(referer && host && referer.includes(host));
    const isOriginSameHost = Boolean(origin && host && origin.includes(host));
    const isSameOrigin =
      req.headers['sec-fetch-site'] === 'same-origin' ||
      req.headers['sec-fetch-site'] === 'none' ||
      isRefererSameHost ||
      isOriginSameHost;
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
            id, code, fixed_asset_code, name, type, site_id, site_name, field, governorate,
            condition_grade, construction_year, department, departments,
            lat, lng, sector_address, total_area_sq_m, length_m, width_m, height_m,
            building_shape, floors_count, rooms, equipment, attachments, attachments_count,
            design_finishing, status, decommissioned_at, decommission_reason, last_updated
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26,
            $27, $28, $29, $30, $31
          ) ON CONFLICT (code) DO UPDATE SET
            fixed_asset_code = EXCLUDED.fixed_asset_code,
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
            row.id, row.code, row.fixed_asset_code || null, row.name, row.type, row.site_id, row.site_name, row.field, row.governorate,
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
            fixed_asset_code = $1, name = $2, type = $3, site_id = $4, site_name = $5, field = $6, governorate = $7,
            condition_grade = $8, construction_year = $9, department = $10, departments = $11,
            lat = $12, lng = $13, sector_address = $14, total_area_sq_m = $15, length_m = $16,
            width_m = $17, height_m = $18, building_shape = $19, floors_count = $20,
            rooms = $21, equipment = $22, attachments = $23, attachments_count = $24,
            design_finishing = $25, status = $26, decommissioned_at = $27,
            decommission_reason = $28, last_updated = $29
          WHERE code = $30`,
          [
            row.fixed_asset_code || null, row.name, row.type, row.site_id, row.site_name, row.field, row.governorate,
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
                  id, code, fixed_asset_code, name, type, site_id, site_name, field, governorate,
                  condition_grade, construction_year, department, departments,
                  lat, lng, sector_address, total_area_sq_m, length_m, width_m, height_m,
                  building_shape, floors_count, rooms, equipment, attachments, attachments_count,
                  design_finishing, status, decommissioned_at, decommission_reason, last_updated
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9,
                  $10, $11, $12, $13,
                  $14, $15, $16, $17, $18, $19, $20,
                  $21, $22, $23, $24, $25, $26,
                  $27, $28, $29, $30, $31
                ) ON CONFLICT (code) DO UPDATE SET
                  fixed_asset_code = EXCLUDED.fixed_asset_code,
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
                  row.id, row.code, row.fixed_asset_code || null, row.name, row.type, row.site_id, row.site_name, row.field, row.governorate,
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
          attachmentName: r.attachment_name,
          attachmentUrl: r.attachment_url,
          attachments: r.attachments || [],
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
            assigned_to, status, reported_by, details, source_inspection_id,
            attachment_name, attachment_url, attachments
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            assigned_to = EXCLUDED.assigned_to,
            issue = EXCLUDED.issue,
            priority = EXCLUDED.priority,
            resolution_notes = EXCLUDED.resolution_notes,
            attachment_name = EXCLUDED.attachment_name,
            attachment_url = EXCLUDED.attachment_url,
            attachments = EXCLUDED.attachments`,
          [
            r.id, r.unitCode, r.unitName || null, r.field, r.issue, r.priority || 'normal',
            r.slaDeadline || null, r.assignedTo, r.status || 'open', r.reportedBy,
            r.details || null, r.sourceInspectionId || null,
            r.attachmentName || null, r.attachmentUrl || null, JSON.stringify(r.attachments || [])
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
            resolution_notes = $5, completed_by = $6, completed_at = $7,
            attachment_name = $8, attachment_url = $9, attachments = $10
          WHERE id = $11`,
          [
            r.status, r.assignedTo, r.issue, r.priority,
            r.resolutionNotes || null, r.completedBy || null, r.completedAt || null,
            r.attachmentName || null, r.attachmentUrl || null, JSON.stringify(r.attachments || []),
            req.params.id
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
                  resolution_notes, completed_by, completed_at,
                  attachment_name, attachment_url, attachments
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
                  completed_at = EXCLUDED.completed_at,
                  attachment_name = EXCLUDED.attachment_name,
                  attachment_url = EXCLUDED.attachment_url,
                  attachments = EXCLUDED.attachments`,
                [
                  r.id, r.unitCode, r.unitName || null, r.field, r.issue, r.priority || 'normal',
                  r.slaDeadline || null, r.assignedTo, r.status || 'open', r.reportedBy,
                  r.details || null, r.sourceInspectionId || null,
                  r.resolutionNotes || null, r.completedBy || null, r.completedAt || null,
                  r.attachmentName || null, r.attachmentUrl || null, JSON.stringify(r.attachments || [])
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
          attachments: r.attachments || [],
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
            attachments, created_maintenance_request_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17,
            $18, $19, $20, $21, $22,
            $23, $24
          ) ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            performed_by_name = EXCLUDED.performed_by_name,
            completion_date = EXCLUDED.completion_date,
            condition_grade_given = EXCLUDED.condition_grade_given,
            findings = EXCLUDED.findings,
            recommendations = EXCLUDED.recommendations,
            next_due_date = EXCLUDED.next_due_date,
            report_file_name = EXCLUDED.report_file_name,
            report_file_url = EXCLUDED.report_file_url,
            attachments = EXCLUDED.attachments`,
          [
            s.id, s.unitCode, s.unitName || null, s.field, s.governorate, s.inspectionType, s.title,
            s.frequency || 'quarterly', s.customIntervalDays || null, s.lastInspectionDate, s.nextDueDate,
            s.assignedTeam, s.inspectorName, s.performedByName || null, s.status || 'scheduled', s.notes || null, s.conditionGradeGiven || null,
            s.completionDate || null, s.findings || null, s.recommendations || null, s.reportFileName || null, s.reportFileUrl || null,
            JSON.stringify(s.attachments || []), s.createdMaintenanceRequestId || null
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
            attachments = $17, created_maintenance_request_id = $18
          WHERE id = $19`,
          [
            s.status, s.completionDate || null, s.conditionGradeGiven || null,
            s.findings || null, s.recommendations || null, s.nextDueDate,
            s.performedByName || null, s.notes || null, s.inspectorName || 'مهندس الموقع',
            s.assignedTeam || 'فريق الفحص', s.title || 'كشف دوري', s.frequency || 'quarterly',
            s.customIntervalDays || null, s.lastInspectionDate,
            s.reportFileName || null, s.reportFileUrl || null,
            JSON.stringify(s.attachments || []), s.createdMaintenanceRequestId || null,
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
                  attachments, created_maintenance_request_id
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7,
                  $8, $9, $10, $11,
                  $12, $13, $14, $15, $16, $17,
                  $18, $19, $20, $21, $22,
                  $23, $24
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
                  attachments = EXCLUDED.attachments,
                  created_maintenance_request_id = EXCLUDED.created_maintenance_request_id`,
                [
                  s.id, s.unitCode, s.unitName || null, s.field, s.governorate, s.inspectionType, s.title,
                  s.frequency || 'quarterly', s.customIntervalDays || null, s.lastInspectionDate, s.nextDueDate,
                  s.assignedTeam, s.inspectorName, s.performedByName || null, s.status || 'scheduled', s.notes || null, s.conditionGradeGiven || null,
                  s.completionDate || null, s.findings || null, s.recommendations || null, s.reportFileName || null, s.reportFileUrl || null,
                  JSON.stringify(s.attachments || []), s.createdMaintenanceRequestId || null
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
        const result = await query<DbOrgEntityRow>('SELECT * FROM org_entities');
        if (result.rows && result.rows.length > 0) {
          const list = result.rows.map((r: any) => ({
            id: r.id,
            code: r.code,
            nameAr: r.name_ar,
            nameEn: r.name_en,
            parentId: r.parent_id,
            level: r.level as any,
            employeeCount: r.employee_count,
            status: r.status,
            sortOrder: r.sort_order !== undefined && r.sort_order !== null ? Number(r.sort_order) : 0,
          }));
          list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          return res.json(list);
        }
      }
    } catch (err) {
      console.warn('DB query failed for /api/org-entities:', err);
    }
    const memList = [...(memStore.orgEntities || [])];
    memList.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    res.json(memList);
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
    const rawEntities = req.body.entities || [];
    const entities = rawEntities.map((e: any, idx: number) => ({
      ...e,
      sortOrder: e.sortOrder !== undefined && e.sortOrder !== null ? e.sortOrder : idx,
    }));
    try {
      const pool = getDbPool();
      if (pool) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('ALTER TABLE org_entities ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0').catch(() => {});
          if (entities.length === 0) {
            await client.query('DELETE FROM org_entities');
          } else {
            const ids = entities.map((e: any) => e.id);
            await client.query('DELETE FROM org_entities WHERE id != ALL($1::text[])', [ids]);
            for (let i = 0; i < entities.length; i++) {
              const e = entities[i];
              try {
                await client.query(
                  `INSERT INTO org_entities (id, code, name_ar, name_en, parent_id, level, employee_count, status, sort_order)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                   ON CONFLICT (id) DO UPDATE SET
                     code = EXCLUDED.code,
                     name_ar = EXCLUDED.name_ar,
                     name_en = EXCLUDED.name_en,
                     parent_id = EXCLUDED.parent_id,
                     level = EXCLUDED.level,
                     employee_count = EXCLUDED.employee_count,
                     status = EXCLUDED.status,
                     sort_order = EXCLUDED.sort_order`,
                  [e.id, e.code, e.nameAr, e.nameEn || null, e.parentId || null, e.level, e.employeeCount || 0, e.status || 'active', e.sortOrder ?? i]
                );
              } catch {
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
    let users = req.body.users || [];
    // Ensure default primary admin USR-101 is always present in users array
    const hasAdmin = users.some((u: any) => u.id === 'USR-101' || u.username === 'admin');
    if (!hasAdmin) {
      const defaultAdmin = memStore.users.find((u) => u.id === 'USR-101') || {
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
      };
      users = [defaultAdmin, ...users];
    }
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
    // Primary Admin USR-101 structural protection
    if (req.params.id === 'USR-101' || user.id === 'USR-101' || user.username === 'admin') {
      user.id = 'USR-101';
      user.username = 'admin';
      user.role = 'مدير النظام';
      user.status = 'active';
    }
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
    // Primary Admin USR-101 cannot be deleted
    if (req.params.id === 'USR-101' || req.params.id === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'لا يمكن حذف حساب مدير النظام الأساسي (admin) أبداً',
      });
    }
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
  // 10. System Factory Reset & Module Reset Endpoints
  // ==========================================================================
  app.post('/api/system/factory-reset', async (req, res) => {
    const { mode } = req.body;
    try {
      const adminUser = {
        id: 'USR-101',
        name: 'عمر المياحي',
        username: 'admin',
        phone: '07701784629',
        role: 'مدير النظام',
        department: 'قسم إدارة وتقييم الأصول الهندسية',
        governorate: 'واسط',
        field: 'الأحدب',
        status: 'active',
        lastActive: 'الآن',
        password: 'admin123',
      };

      if (mode === 'full_default') {
        memStore.units = INITIAL_UNITS;
        memStore.maintenance = INITIAL_MAINTENANCE_REQUESTS;
        memStore.occupancy = INITIAL_OCCUPANCY_RECORDS;
        memStore.inspections = INITIAL_PERIODIC_INSPECTIONS;
        memStore.users = INITIAL_USERS;
        memStore.auditLogs = INITIAL_AUDIT_LOGS;
        memStore.orgEntities = INITIAL_ORG_ENTITIES;
      } else {
        // 'wipe_all_except_admin' (Default requested by user)
        memStore.units = [];
        memStore.maintenance = [];
        memStore.occupancy = [];
        memStore.inspections = [];
        memStore.orgEntities = [];
        memStore.users = [adminUser];
        memStore.auditLogs = [
          {
            id: `LOG-RESET-${Date.now()}`,
            userId: 'USR-101',
            userName: 'عمر المياحي',
            userRole: 'مدير النظام',
            action: 'factory_reset',
            entityType: 'system',
            entityId: 'SYSTEM',
            entityName: 'النظام بالكامل',
            details: 'تم تنفيذ استعادة ضبط المصنع الشامل للنظام وتفريغ كافة البيانات مع الإبقاء على حساب مدير النظام عمر المياحي',
            timestamp: new Date().toISOString(),
            ipAddress: '127.0.0.1',
            governorate: 'واسط',
            field: 'الأحدب',
            status: 'success',
          },
        ];
      }

      saveMemStoreToDisk();

      if (getDbPool()) {
        try {
          if (mode !== 'full_default') {
            await query('DELETE FROM units');
            await query('DELETE FROM maintenance_requests');
            await query('DELETE FROM occupancy_records');
            await query('DELETE FROM periodic_inspections');
            await query('DELETE FROM audit_logs');
            await query('DELETE FROM org_entities');
            await query(
              `INSERT INTO system_settings (key, value, updated_at)
               VALUES ('app_users', $1, CURRENT_TIMESTAMP)
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
              [JSON.stringify(memStore.users)]
            );
          }
        } catch (dbErr) {
          console.warn('DB wipe on factory reset note:', dbErr);
        }
      }

      notifySyncChange('all_updated', { mode });
      return res.json({ success: true, message: 'تمت استعادة ضبط المصنع الشامل بنجاح' });
    } catch (err) {
      console.error('Factory reset error:', err);
      return res.status(500).json({ success: false, error: 'فشل تنفيذ استعادة ضبط المصنع' });
    }
  });

  app.post('/api/system/reset-module', async (req, res) => {
    const { moduleName, actionType } = req.body;
    try {
      switch (moduleName) {
        case 'units':
          memStore.units = actionType === 'clear' ? [] : INITIAL_UNITS;
          if (getDbPool() && actionType === 'clear') await query('DELETE FROM units').catch(() => {});
          notifySyncChange('units_updated', { action: 'bulk' });
          break;
        case 'maintenance':
          memStore.maintenance = actionType === 'clear' ? [] : INITIAL_MAINTENANCE_REQUESTS;
          if (getDbPool() && actionType === 'clear') await query('DELETE FROM maintenance_requests').catch(() => {});
          notifySyncChange('maintenance_updated', { action: 'bulk' });
          break;
        case 'inspections':
          memStore.inspections = actionType === 'clear' ? [] : INITIAL_PERIODIC_INSPECTIONS;
          if (getDbPool() && actionType === 'clear') await query('DELETE FROM periodic_inspections').catch(() => {});
          notifySyncChange('inspections_updated', { action: 'bulk' });
          break;
        case 'occupancy':
          memStore.occupancy = actionType === 'clear' ? [] : INITIAL_OCCUPANCY_RECORDS;
          if (getDbPool() && actionType === 'clear') await query('DELETE FROM occupancy_records').catch(() => {});
          notifySyncChange('occupancy_updated', { action: 'bulk' });
          break;
        case 'users':
          if (actionType === 'clear') {
            const adminUser = memStore.users.find((u) => u.id === 'USR-101' || u.username === 'admin') || {
              id: 'USR-101',
              name: 'عمر المياحي',
              username: 'admin',
              phone: '07701784629',
              role: 'مدير النظام',
              status: 'active',
              password: 'admin123',
            };
            memStore.users = [adminUser];
          } else {
            memStore.users = INITIAL_USERS;
          }
          notifySyncChange('users_updated', { action: 'bulk' });
          break;
        case 'audit_logs':
          memStore.auditLogs = actionType === 'clear' ? [] : INITIAL_AUDIT_LOGS;
          if (getDbPool() && actionType === 'clear') await query('DELETE FROM audit_logs').catch(() => {});
          notifySyncChange('audit_logs_updated', { action: 'bulk' });
          break;
        case 'org_entities':
          if (actionType === 'clear') {
            memStore.orgEntities = [];
            if (getDbPool()) await query('DELETE FROM org_entities').catch(() => {});
          } else {
            memStore.orgEntities = INITIAL_ORG_ENTITIES;
            if (getDbPool()) {
              await query('DELETE FROM org_entities').catch(() => {});
              for (const e of INITIAL_ORG_ENTITIES) {
                await query(
                  `INSERT INTO org_entities (id, code, name_ar, name_en, parent_id, level, employee_count, status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                   ON CONFLICT (id) DO NOTHING`,
                  [e.id, e.code, e.nameAr, e.nameEn || null, e.parentId || null, e.level, e.employeeCount || 0, e.status || 'active']
                ).catch(() => {});
              }
            }
          }
          notifySyncChange('org_entities_updated', { action: 'bulk' });
          break;
      }
      saveMemStoreToDisk();
      return res.json({ success: true });
    } catch (err) {
      console.error('Reset module failed:', err);
      return res.status(500).json({ success: false, error: 'فشل إعادة ضبط القسم' });
    }
  });

  // ==========================================================================
  // Dynamic Web App Manifest (Reflects System Branding in Real-Time for PWA/Mobile/PC)
  // ==========================================================================
  app.get('/manifest.json', (req, res) => {
    const branding = memStore.branding || {};
    const systemName = (branding.systemName || '').trim() || 'السجل الرقمي الموحد للأصول الهندسية والإنشائية';
    const companyName = (branding.companyName || '').trim() || 'شركة نفط الوسط';
    const ministryName = (branding.ministryName || '').trim() || 'وزارة النفط العراقية';
    const logoUrl = branding.logoUrl || '/icons/icon-512.png';
    const shortName = systemName.length > 30 ? systemName.slice(0, 30) : systemName;
    const isSvg = logoUrl.startsWith('data:image/svg') || logoUrl.endsWith('.svg');
    const mimeType = isSvg ? 'image/svg+xml' : 'image/png';

    const manifestData = {
      id: '/',
      name: `${companyName} - ${systemName}`,
      short_name: shortName,
      description: `${systemName} - ${companyName} - ${ministryName}`,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#0f172a',
      orientation: 'any',
      dir: 'rtl',
      lang: 'ar',
      categories: ['business', 'productivity', 'utilities'],
      icons: [
        {
          src: logoUrl,
          sizes: '192x192 512x512 any',
          type: mimeType,
          purpose: 'any maskable',
        },
        {
          src: logoUrl,
          sizes: '192x192',
          type: mimeType,
          purpose: 'any',
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: mimeType,
          purpose: 'any',
        },
      ],
    };

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json(manifestData);
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

  // ==========================================================================
  // HTTPS & HTTP Server Initialization (Native Node.js SSL / Standalone Deployment)
  // ==========================================================================
  const certPath = process.env.HTTPS_CERT_PATH;
  const keyPath = process.env.HTTPS_KEY_PATH;

  let isHttpsStarted = false;
  if (certPath && keyPath) {
    try {
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const cert = fs.readFileSync(certPath);
        const key = fs.readFileSync(keyPath);
        https.createServer({ cert, key }, app).listen(PORT, '0.0.0.0', () => {
          console.log(`🔒 Midland Oil Assets Backend & UI Server running SECURELY via HTTPS on https://0.0.0.0:${PORT}`);
        });
        isHttpsStarted = true;
      } else {
        console.warn('⚠️ [HTTPS] Specified certificate or key file not found on disk. Falling back to HTTP...');
      }
    } catch (err: any) {
      console.warn(`⚠️ [HTTPS] Failed to initialize SSL/TLS server (${err.message}). Falling back to HTTP...`);
    }
  } else {
    console.warn('⚠️ HTTPS not configured — running over insecure HTTP. Set HTTPS_CERT_PATH and HTTPS_KEY_PATH environment variables to enable HTTPS.');
  }

  if (!isHttpsStarted) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Midland Oil Assets Backend & UI Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
