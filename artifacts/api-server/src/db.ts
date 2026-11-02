import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@workspace/db/schema';

const { Pool } = pg;

function normalizeConnectionString(rawUrl: string): string {
  // Strip channel_binding — node-postgres does not support it and it causes
  // queries to fail with a "Failed query" error at runtime.
  return rawUrl.replace(/[?&]channel_binding=[^&]*/g, (match) =>
    match.startsWith('?') ? '?' : ''
  ).replace(/\?$/, '');
}

function createPool(rawUrl: string) {
  return new Pool({
    connectionString: normalizeConnectionString(rawUrl),
    ssl: { rejectUnauthorized: true },
    min: 1,           // keep at least one connection alive
    max: 10,
    idleTimeoutMillis: 600_000,   // 10 min — well beyond Neon idle timeout
    connectionTimeoutMillis: 8000,
  });
}

const neonUrl = process.env.NEON_DATABASE_URL;
if (!neonUrl) {
  throw new Error('NEON_DATABASE_URL is required. Refusing to connect to a different database.');
}

const activePool = createPool(neonUrl);
activePool.on('error', (error) => {
  console.error(`[DB] Idle PostgreSQL client error: ${error.message}`);
});
try {
  await activePool.query('SELECT 1');
  console.log('[DB] Using Neon PostgreSQL');
} catch (error: any) {
  await activePool.end().catch(() => {});
  throw new Error(`Neon PostgreSQL is unavailable: ${error?.message || 'connection failed'}`);
}

const isVercel = Boolean(process.env.VERCEL);
export const pool = activePool;

// Keep-warm only on long-lived servers. Timers are unreliable and waste
// resources in Vercel/Firebase request-scoped runtimes.
if (!isVercel && !process.env.FIREBASE_CONFIG && !process.env.FUNCTION_TARGET) {
  setInterval(() => pool.query('SELECT 1').catch(() => {}), 4 * 60 * 1000);
}

export const db = drizzle(pool, { schema });
