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
  timeout: 45_000,
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
  for (const file of ['001-auth.sql', '002-shipments.sql', '003-notifications.sql', '004-numeric-tracking-numbers.sql',
    '005-notification-preferences.sql', '007-pro-aliases.sql', '008-delivery-attempt-status.sql']) {
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
    pro: '000000123', service, pieces: 1, weight: 100, weightUnit: 'lb', pickupDate: '2024-04-12',
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
    subscribe(recipient), subscribe(recipient.toUpperCase()), subscribe('unrelated@example.invalid'),
    subscribe(recipient, '000000124'), subscribe(recipient, 'INT-UNKNOWN'),
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
  const reissued = await request('/api/admin/shipments/' + shipmentId, { version, pro: '000000125' },
    { role: 'admin', method: 'PATCH' });
  assert.equal(reissued.status, 200, reissued.body.error);
  version = reissued.body.shipment.version;
  const tampered = confirmToken.slice(0, -1) + (confirmToken.endsWith('A') ? 'B' : 'A');
  assert.equal((await confirmation(tampered)).status, 404);
  assert.equal((await unsubscribe(confirmToken)).status, 404);
  assert.equal((await confirmation(confirmToken)).status, 200);
  assert.equal((await confirmation(confirmToken)).status, 200);
  assert.equal((await subscribe(recipient)).status, 202);

  await event('delivery_exception', '10:00', { kind: 'expected' });
  const attempt = await event('delivery_attempt_failed', '10:30');
  await notifications.onConfirmedEvent(pool, { shipmentId, eventId: attempt.id, status: attempt.status });
  await event('out_for_delivery', '09:10');
  const statusMessage = await waitFor(() => sent[1]);
  assert.equal(statusMessage.to, recipient);
  assert.equal(statusMessage.subject, 'Shipment update: Delivery attempt failed');
  assert.match(statusMessage.text, /000000125/);
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
  assert.equal(history.body.subscriptions.length, 1);
  assert.equal(history.body.subscriptions[0].state, 'revoked');
  assert.equal(history.body.subscriptions[0].trackingNumber, '000000125');
  assert.deepEqual(history.body.logs.map(log => log.status).sort(), ['canceled', 'sent', 'sent']);

  await t.test('multiple recipients confirm selected options independently before receiving personalized updates', async () => {
    const originAddress = 'qa-origin@example.invalid';
    const destinationAddress = 'qa-destination@example.invalid';
    const outsider = 'qa-unrelated@example.invalid';
    const note = 'Check the appointment at the receiving desk.';
    const reply = await request('/api/admin/shipments', {
      pro: '000000444', service, pieces: 1, weight: 100, weightUnit: 'lb',
      shipFrom: { city: 'Albany', state: 'NY', postalCode: '12207', country: 'US', email: originAddress },
      shipTo: { city: 'Boston', state: 'MA', postalCode: '02108', country: 'US', email: destinationAddress },
    }, { role: 'admin' });
    assert.equal(reply.status, 201, reply.body.error);
    const shipment = reply.body.shipment;
    const replaced = await request('/api/admin/shipments/' + shipment.id, { version: shipment.version, pro: '000000445' },
      { role: 'admin', method: 'PATCH' });
    assert.equal(replaced.status, 200, replaced.body.error);
    shipment.version = replaced.body.shipment.version;
    const input = {
      pro: shipment.pro,
      emails: [destinationAddress, ` ${destinationAddress.toUpperCase()} `, originAddress, outsider],
      events: ['current_status', 'delivery_appointment_scheduled', 'current_status'],
      personalMessage: ` ${note} `,
      senderEmail: originAddress.toUpperCase(),
    };
    const update = body => request(subscriptionsPath, body);
    for (const invalidInput of [
      { ...input, emails: Array(7).fill(destinationAddress) }, { ...input, emails: ['invalid'] },
      { ...input, events: [] }, { ...input, events: ['unknown_status'] },
      { ...input, senderEmail: '' }, { ...input, personalMessage: 'x'.repeat(151) },
    ]) assert.equal((await update(invalidInput)).status, 400);

    const wrongSender = await update({ ...input, senderEmail: outsider });
    assert.equal(wrongSender.status, 202);
    const listSubscriptions = async () => (await pool.query(`SELECT email,state,event_options,personal_message
      FROM notification_subscriptions WHERE shipment_id=$1 ORDER BY email`, [shipment.id])).rows;
    assert.deepEqual(await listSubscriptions(), []);
    const [requested, duplicate] = await Promise.all([update(input), update({ ...input, emails: [...input.emails].reverse() })]);
    for (const generic of [requested, duplicate]) {
      assert.equal(generic.status, 202, generic.body.error);
      assert.deepEqual(generic.body, wrongSender.body);
    }
    assert.deepEqual(await listSubscriptions(), [destinationAddress, originAddress].map(address => ({
      email: address, state: 'pending', event_options: ['current_status', 'delivery_appointment_scheduled'], personal_message: note,
    })));

    const beforeConsent = await waitFor(() => sent.length >= 4 && sent.slice(2));
    assert.deepEqual(beforeConsent.map(message => message.to).sort(), [destinationAddress, originAddress]);
    for (const message of beforeConsent) {
      assert.equal(message.subject, 'Confirm shipment updates');
      assert.ok(!message.text.includes(note));
      assert.equal(message.replyTo, undefined);
    }
    const chosen = beforeConsent.find(message => message.to === destinationAddress);
    const chosenToken = token(chosen, 'confirm');
    const confirms = await Promise.all([confirmation(chosenToken), confirmation(chosenToken)]);
    assert.deepEqual(confirms.map(result => result.status), [200, 200]);
    assert.deepEqual((await listSubscriptions()).map(row => row.state), ['active', 'pending']);
    const snapshot = await waitFor(() => sent[4]);
    assert.equal(snapshot.to, destinationAddress);
    assert.equal(snapshot.subject, 'Current shipment status: Shipment created');
    assert.ok(snapshot.text.includes(note));
    assert.ok(!snapshot.text.includes(originAddress));
    assert.equal(snapshot.replyTo, undefined);

    let shipmentVersion = shipment.version;
    async function recordOption(status, kind, eventTime) {
      const result = await request(`/api/admin/shipments/${shipment.id}/events`, {
        version: shipmentVersion, status, eventTime, eventDate: '2024-04-12', kind, timeZone: 'America/New_York',
        city: 'Boston', state: 'MA', country: 'US', source: 'Staging fixture',
      }, { role: 'admin' });
      assert.equal(result.status, 201, result.body.error);
      shipmentVersion = result.body.shipment.version;
    }
    await recordOption('out_for_delivery', 'confirmed', '10:00');
    await recordOption('delivery_appointment_scheduled', 'expected', '12:00');
    const logTypes = async () => (await pool.query(`SELECT n.type FROM notification_logs n
      JOIN notification_subscriptions s ON s.id=n.subscription_id WHERE s.shipment_id=$1 ORDER BY n.type`, [shipment.id])).rows.map(row => row.type);
    assert.deepEqual(await logTypes(), ['confirmation', 'confirmation', 'current_status']);
    await recordOption('delivery_appointment_scheduled', 'confirmed', '13:00');
    const appointment = await waitFor(() => sent[5]);
    assert.equal(appointment.to, destinationAddress);
    assert.equal(appointment.subject, 'Shipment update: Delivery appointment scheduled');
    assert.ok(appointment.text.includes(note));
    assert.equal(appointment.replyTo, undefined);
    assert.equal((await unsubscribe(token(appointment, 'unsubscribe'))).status, 200);
    assert.deepEqual(await logTypes(), ['confirmation', 'confirmation', 'current_status', 'status']);
    assert.deepEqual((await listSubscriptions()).map(row => row.state), ['revoked', 'pending']);
  });
});
