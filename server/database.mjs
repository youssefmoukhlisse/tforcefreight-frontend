import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export function databasePool(connectionString) {
  const pool = new pg.Pool({
    connectionString, max: 12, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000, statement_timeout: 12_000,
  });
  pool.on('error', () => console.error('An idle database connection closed.'));
  return pool;
}

export async function migrate(pool) {
  const dir = fileURLToPath(new URL('./migrations/', import.meta.url));
  const names = (await readdir(dir)).filter(name => /^\d{3}-[\w-]+\.sql$/.test(name)).sort();
  if (!names.length) throw new Error('Database migrations are missing.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(725464301)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, digest text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const existing = new Map((await client.query('SELECT name,digest FROM schema_migrations')).rows.map(row => [row.name, row.digest]));
    for (const name of names) {
      const sql = await readFile(dir + name, 'utf8');
      const digest = createHash('sha256').update(sql).digest('hex');
      if (existing.has(name)) {
        if (existing.get(name) !== digest) throw new Error(`Applied migration differs: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name,digest) VALUES($1,$2)', [name, digest]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function withTransaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
