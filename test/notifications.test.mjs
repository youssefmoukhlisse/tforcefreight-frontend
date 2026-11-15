import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

import express from 'express';
import pg from 'pg';

import { audit } from '../server/auth.mjs';
import { createNotifications } from '../server/notifications.mjs';
import { createShipmentRouters } from '../server/shipments.mjs';

const dbUrl = process.env.TEST_NOTIFICATION_DATABASE_URL || process.env.TEST_SHIPMENT_DATABASE_URL;

test('shipment notifications require opt-in, protect addresses, and dispatch confirmed status once', {
  skip: !dbUrl && 'Set TEST_NOTIFICATION_DATABASE_URL to an isolated loopback PostgreSQL database.',
  timeout: 28_000,
}, async t => {
  assert.match(new URL(dbUrl).hostname, /^(?:127\.0\.0\.1|localhost|\[::1\])$/);
  const database = new pg.Pool({ connectionString: dbUrl });
  const schema = 'notification_test_' + randomBytes(8).toString('hex');
  const workers = [];
  let pool;
  let server;
  t.after(async () => {
    await Promise.all(workers.map(worker => worker.stop()));
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    await database.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE');
    await database.end();
  });
  await database.query('CREATE SCHEMA ' + schema);
  pool = new pg.Pool({ connectionString: dbUrl, options: '-c search_path=' + schema });
  for (const file of ['001-auth.sql', '002-shipments.sql', '003-notifications.sql']) {
    await pool.query(await readFile(new URL('../server/migrations/' + file, import.meta.url), 'utf8'));
  }

  const owner = { id: randomUUID(), role: 'admin' };
  const viewer = { id: randomUUID(), role: 'viewer' };
  await pool.query("INSERT INTO users(id,email,role) VALUES ($1, 'ops@example.invalid', 'admin'), ($2, 'viewer@example.invalid', 'viewer')",
    [owner.id, viewer.id]);
  function requireAuth(req, res, next) {
    const role = req.get('X-Fixture-Role');
    req.user = role === 'admin' ? owner : role === 'viewer' ? viewer : null;
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    next();
  }
  function requireRole(...roles) {
    return (req, res, next) => requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
      next();
    });
  }
  const sent = [];
  const testTransport = { async send(message) { sent.push(message); } };
  const appOrigin = 'https://tracking.example.invalid';
  const options = { pool, requireAuth, requireRole, audit, appOrigin, environment: 'staging', signingKey: randomBytes(32) };
  function worker(transport) {
    const instance = createNotifications({ ...options, testTransport: transport });
    workers.push(instance);
    return instance;
  }
  const notifications = worker(testTransport);
  const disabled = worker(null);
  assert.equal(notifications.enabled, true);
  assert.equal(disabled.enabled, false);
  const routes = createShipmentRouters({ ...options, onConfirmedEvent: notifications.onConfirmedEvent });

  const app = express();
  app.use(express.json());
  app.use('/api/admin', notifications.admin, routes.admin);
  app.use('/api/tracking', notifications.publicTracking, routes.publicTracking);
  app.use('/email-disabled', disabled.publicTracking);
  app.use((error, _req, res, _next) => res.status(error.status ?? 500).json({ error: error.message }));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = 'http://127.0.0.1:' + server.address().port;
  async function request(path, data, { role, method = data === undefined ? 'GET' : 'POST' } = {}) {
    const headers = {};
    if (role) headers['X-Fixture-Role'] = role;
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(baseUrl + path, { headers, method, body: data === undefined ? undefined : JSON.stringify(data) });
    return { status: response.status, body: await response.json() };
  }
  async function waitFor(predicate) {
    const deadline = Date.now() + 7_500;
    while (Date.now() < deadline) {
      const result = await predicate();
      if (result) return result;
      await delay(30);
    }
    assert.fail('Timed out waiting for a notification worker to dispatch its SQL outbox.');
  }
  function token(message, action) {
    const link = message.text.split('\n').map(line => line.match(/https:\/\/\S+/)?.[0])
      .filter(Boolean).map(url => new URL(url)).find(url => url.hash.startsWith(`#action=${action}&`));
    assert.equal(link?.origin, appOrigin);
    assert.equal(link.pathname, '/shipment-updates');
    assert.equal(link.search, '');
    return new URLSearchParams(link.hash.slice(1)).get('token');
  }

  const recipient = 'recipient@example.invalid';
  const sender = 'sender@example.invalid';
  const service = 'Staging test freight';
  const created = await request('/api/admin/shipments', {
    pro: 'NOTIFY-QA', service, pieces: 1, weight: 100, weightUnit: 'lb', pickupDate: '2024-04-12',
    bol: 'PRIVATE-BILL-TEST', instructions: 'Private instructions',
    shipFrom: { company: 'Private sender company', city: 'Albany', state: 'NY', postalCode: '12207', country: 'US', email: sender },
    shipTo: { company: 'Private recipient company', address: 'Private recipient street', city: 'Boston', state: 'MA',
      postalCode: '02108', country: 'US', email: recipient, phone: '555-0100' },
  }, { role: 'admin' });
  assert.equal(created.status, 201, created.body.error);
  const { id: shipmentId, pro } = created.body.shipment;
  let version = created.body.shipment.version;
  const subscriptionsPath = '/api/tracking/subscriptions';
  const subscribe = (email, number = pro) => request(subscriptionsPath, { pro: number, email });
  const confirmation = code => request(`${subscriptionsPath}/confirm`, { token: code });
  const unsubscribe = code => request(`${subscriptionsPath}/unsubscribe`, { token: code });
  const matching = await Promise.all([
    subscribe(recipient), subscribe(recipient.toUpperCase()), subscribe('unrelated@example.invalid'), subscribe(recipient, 'INT-UNKNOWN'),
  ]);
  assert.ok(matching.every(reply => reply.status === 202));
  for (const reply of matching) assert.deepEqual(reply.body, matching[0].body);
  const state = await pool.query('SELECT email,state FROM notification_subscriptions');
  assert.deepEqual(state.rows, [{ email: recipient, state: 'pending' }]);
  assert.equal((await request('/email-disabled/subscriptions', { pro, email: sender })).status, 503);

  async function event(status, eventTime, fields = {}) {
    const result = await request(`/api/admin/shipments/${shipmentId}/events`, {
      version, status, eventTime, eventDate: '2024-04-12', timeZone: 'America/New_York', kind: 'confirmed',
      location: 'Private pickup location', city: 'Boston', state: 'MA', country: 'US',
      source: 'Staging fixture', notes: 'Private event note', trailer: 'Private trailer ID', ...fields,
    }, { role: 'admin' });
    assert.equal(result.status, 201, result.body.error);
    version = result.body.shipment.version;
    return result.body.event;
  }
  await event('out_for_delivery', '09:00');
  assert.equal((await pool.query("SELECT count(*)::int AS total FROM notification_logs WHERE type='status'")).rows[0].total, 0);
  const confirmMessage = await waitFor(() => sent[0]);
  assert.equal(confirmMessage.to, recipient);
  assert.equal(confirmMessage.subject, 'Confirm shipment updates');
  const confirmToken = token(confirmMessage, 'confirm');
  assert.ok(confirmToken);
  const tampered = confirmToken.slice(0, -1) + (confirmToken.endsWith('A') ? 'B' : 'A');
  assert.equal((await confirmation(tampered)).status, 404);
  assert.equal((await unsubscribe(confirmToken)).status, 404);
  assert.equal((await confirmation(confirmToken)).status, 200);
  assert.equal((await confirmation(confirmToken)).status, 200);
  assert.equal((await subscribe(recipient)).status, 202);

  await event('delivery_exception', '10:00', { kind: 'expected' });
  const exception = await event('delivery_exception', '10:30');
  await notifications.onConfirmedEvent(pool, { shipmentId, eventId: exception.id, status: exception.status });
  await event('out_for_delivery', '09:10');
  const statusMessage = await waitFor(() => sent[1]);
  assert.equal(statusMessage.to, recipient);
  assert.equal(statusMessage.subject, 'Shipment update: Delivery exception');
  assert.match(statusMessage.text, /INT-NOTIFY-QA/);
  assert.doesNotMatch(statusMessage.text, /private|example\.invalid@|555-0100|02108|12207|recipient@|sender@/i);
  assert.equal((await pool.query('SELECT count(*)::int AS total FROM notification_logs')).rows[0].total, 2);
  const unsubscribeToken = token(statusMessage, 'unsubscribe');
  assert.equal((await confirmation(unsubscribeToken)).status, 404);

  await notifications.stop();
  const delivered = await event('delivered', '13:15', { signedBy: 'Private test signer' });
  assert.equal((await pool.query("SELECT status FROM notification_logs WHERE event_id=$1", [delivered.id])).rows[0].status, 'queued');
  const changed = await request(`/api/admin/shipments/${shipmentId}`, {
    version, shipTo: { email: 'reassigned@example.invalid' },
  }, { role: 'admin', method: 'PATCH' });
  assert.equal(changed.status, 200, changed.body.error);
  version = changed.body.shipment.version;
  worker(testTransport);
  await waitFor(async () => {
    const result = await pool.query('SELECT status FROM notification_logs WHERE event_id=$1', [delivered.id]);
    return result.rows[0]?.status === 'canceled';
  });
  assert.equal(sent.length, 2);
  assert.equal((await unsubscribe(unsubscribeToken)).status, 200);
  assert.equal((await unsubscribe(unsubscribeToken)).status, 200);
  assert.equal((await confirmation(confirmToken)).status, 404);
  await event('delivery_exception', '14:00');
  assert.equal((await pool.query("SELECT count(*)::int AS total FROM notification_logs WHERE type='status'")).rows[0].total, 2);

  assert.equal((await request('/api/admin/notifications')).status, 401);
  assert.equal((await request('/api/admin/notifications', undefined, { role: 'viewer' })).status, 403);
  const history = await request('/api/admin/notifications', undefined, { role: 'admin' });
  assert.equal(history.status, 200, history.body.error);
  assert.equal(history.body.subscriptions[0].state, 'revoked');
  assert.deepEqual(history.body.logs.map(log => log.status).sort(), ['canceled', 'sent', 'sent']);
});
