import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import express from 'express';
import pg from 'pg';
import { audit, createAuth } from '../server/auth.mjs';
import { createCustomerImportRouter } from '../server/customers.mjs';

const dbUrl = process.env.TEST_CUSTOMER_DATABASE_URL || process.env.TEST_SHIPMENT_DATABASE_URL;

test('customer imports validate atomically, protect the directory and never overwrite repeated contacts', {
  skip: !dbUrl && 'Set TEST_CUSTOMER_DATABASE_URL to an isolated loopback PostgreSQL database.',
  timeout: 20_000,
}, async t => {
  assert.match(new URL(dbUrl).hostname, /^(?:127\.0\.0\.1|localhost|\[::1\])$/);
  const database = new pg.Pool({ connectionString: dbUrl });
  const schema = 'customer_import_test_' + randomBytes(8).toString('hex');
  let pool;
  let server;
  t.after(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    await database.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE');
    await database.end();
  });
  await database.query('CREATE SCHEMA ' + schema);
  pool = new pg.Pool({ connectionString: dbUrl, options: '-c search_path=' + schema });
  for (const name of ['001-auth.sql', '006-customer-import.sql']) {
    await pool.query(await readFile(new URL('../server/migrations/' + name, import.meta.url), 'utf8'));
  }

  const sessions = {};
  for (const role of ['operator', 'viewer']) {
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    sessions[role] = { id, cookie: 'records_session=' + token };
    await pool.query(`INSERT INTO users (id,email,role,password_hash,totp_secret,totp_enabled)
      VALUES ($1,$2,$3,'fixture only','fixture only',true)`, [id, `${role}@example.invalid`, role]);
    await pool.query(`INSERT INTO auth_sessions (token_hash,user_id,expires_at)
      VALUES ($1,$2,now()+interval '5 minutes')`, [createHash('sha256').update(token).digest(), id]);
  }

  const app = express();
  app.use(express.json({ limit: '3mb' }));
  const { requireAuth, requireRole } = createAuth({ pool, secureCookies: false, encryptionKey: randomBytes(32) });
  app.use('/api/admin/customers', createCustomerImportRouter({ pool, requireAuth, requireRole, audit }));
  app.use((error, _req, res, _next) => res.status(error.status ?? 500).json({ error: error.message }));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;

  async function request(path, role, { customers, senderOrigin = origin } = {}) {
    const headers = {};
    if (role) headers.Cookie = sessions[role].cookie;
    if (customers !== undefined) Object.assign(headers, { 'Content-Type': 'application/json', Origin: senderOrigin });
    const response = await fetch(origin + '/api/admin/customers' + path, {
      method: customers === undefined ? 'GET' : 'POST', headers,
      body: customers === undefined ? undefined : JSON.stringify({ customers }),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }

  const primary = { company: ' Dock Office ', contact: 'QA Clerk', address: '1 Test Ave.\nSuite 2', city: 'Holtsville',
    state: 'NY', postalCode: '00501', country: 'us', phone: '+1 555 0100', email: ' Shipping@Example.Invalid ' };
  const secondary = { company: 'River  Warehouse', contact: 'QA Receiving', city: 'Boston', postalCode: '02108', country: 'US' };
  assert.equal((await request('/imported')).status, 401);
  assert.equal((await request('/import', 'viewer', { customers: [primary] })).status, 403);
  assert.equal((await request('/import', 'operator', { customers: [primary], senderOrigin: 'https://unrelated.example.invalid' })).status, 403);
  const invalid = await request('/import', 'operator', { customers: [primary, { company: 'Invalid', postalCode: 501 }, { company: '', email: 'a@example.invalid' }] });
  assert.equal(invalid.status, 400);
  assert.deepEqual(invalid.body.errors.map(row => row.row), [2, 3]);
  assert.equal((await request('/imported', 'viewer')).body.total, 0);
  assert.equal((await request('/import', 'operator', { customers: Array(501).fill(primary) })).status, 400);

  const importOnce = customers => request('/import', 'operator', { customers });
  const repeated = { ...primary, company: 'Other company omitted by dedupe', email: 'shipping@example.invalid' };
  const concurrent = await Promise.all([importOnce([primary, repeated, secondary]), importOnce([secondary, primary])]);
  assert.ok(concurrent.every(result => result.status === 200), JSON.stringify(concurrent.map(result => result.body)));
  assert.equal(concurrent.reduce((sum, result) => sum + result.body.imported, 0), 2);
  assert.equal(concurrent.reduce((sum, result) => sum + result.body.skipped, 0), 3);
  const importAgain = await importOnce([repeated, { ...secondary, company: 'river warehouse' }]);
  assert.deepEqual(importAgain.body, { total: 2, imported: 0, skipped: 2 });

  const directory = await request('/imported?q=SHIPping&limit=10', 'viewer');
  assert.equal(directory.status, 200, directory.body.error);
  assert.equal(directory.headers.get('cache-control'), 'no-store');
  assert.equal(directory.body.total, 1);
  const [customer] = directory.body.customers;
  assert.equal(customer.company, 'Dock Office');
  assert.equal(customer.postalCode, '00501');
  assert.equal(customer.address, '1 Test Ave.\nSuite 2');
  assert.equal(customer.country, 'US');
  assert.equal(customer.email, 'shipping@example.invalid');
  assert.equal(customer.dedupeKey, undefined);
  assert.deepEqual((await request('/imported?limit=1&offset=2', 'viewer')).body, { customers: [], total: 2 });
  assert.equal((await request('/imported?limit=999', 'viewer')).status, 400);
  const { rows: logs } = await pool.query('SELECT actor_id,action,metadata FROM audit_logs ORDER BY id');
  assert.equal(logs.length, 3);
  assert.ok(logs.every(entry => entry.actor_id === sessions.operator.id && entry.action === 'customers.imported'));
  assert.doesNotMatch(JSON.stringify(logs), /Dock|Warehouse|example\.invalid|Test Ave/);
});
