/**
 * Midland Oil Company - Central PostgreSQL Connection Pool & Query Helper
 */

import pg from 'pg';
const { Pool } = pg;

// Connection Pool Configuration
let pool: pg.Pool | null = null;

/** عنوان القاعدة من DATABASE_URL؛ القيمة النموذجية (CHANGE_ME) تُعدّ غير مضبوطة */
export function configuredDatabaseUrl(): string {
  const url = (process.env.DATABASE_URL || '').trim();
  return url && !/CHANGE_ME/.test(url) ? url : '';
}

export function getDbPool(): pg.Pool | null {
  if (pool) return pool;

  const connectionString = configuredDatabaseUrl();
  if (!connectionString) {
    return null;
  }

  try {
    pool = new Pool({
      connectionString,
      // التشفير يُفعَّل صراحةً فقط (قاعدة سحابية): DATABASE_SSL=true أو sslmode=require في العنوان
      ssl:
        process.env.DATABASE_SSL === 'true' || /sslmode=require/.test(connectionString)
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });

    return pool;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
    return null;
  }
}

/**
 * Execute a query safely with automatic fallback logging
 */
export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const p = getDbPool();
  if (!p) {
    throw new Error('DATABASE_URL is not configured or PostgreSQL is offline');
  }
  return p.query<T>(text, params);
}
