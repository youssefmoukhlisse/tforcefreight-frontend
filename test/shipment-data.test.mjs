import assert from 'node:assert/strict';
import crypto, { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';

import express from 'express';
import pg from 'pg';

import { audit } from '../server/auth.mjs';
import { createShipmentRouters, isTrackingPro, parseEventTime } from '../server/shipments.mjs';

test('event dates resolve real local times, including non-hour DST shifts', () => {
  assert.throws(() => parseEventTime('2024-02-30', '01:30', 'UTC'), /valid calendar date/);
  assert.throws(() => parseEventTime('2024-03-10', '02:30', 'America/New_York'), /does not exist/);
  assert.throws(() => parseEventTime('2024-11-03', '01:30', 'America/New_York'), /occurs twice/);
  assert.throws(() => parseEventTime('2024-11-03', '01:30', 'America/New_York', '-06:00'), /does not match/);
  assert.equal(parseEventTime('2024-11-03', '01:30', 'America/New_York', '-04:00').occurredAt.toISOString(), '2024-11-03T05:30:00.000Z');
  assert.equal(parseEventTime('2024-11-03', '01:30', 'America/New_York', '-05:00').occurredAt.toISOString(), '2024-11-03T06:30:00.000Z');
  assert.throws(() => parseEventTime('2024-04-07', '01:45', 'Australia/Lord_Howe'), /occurs twice/);
  assert.equal(parseEventTime('2024-04-07', '01:45', 'Australia/Lord_Howe', '+10:30').occurredAt.toISOString(), '2024-04-06T15:15:00.000Z');
  assert.equal(parseEventTime('2024-01-01', '00:15', 'Asia/Kathmandu').occurredAt.toISOString(), '2023-12-31T18:30:00.000Z');
});

test('lookup recognizes nine-digit and legacy tracking strings', () => {
  assert.equal(isTrackingPro('007001234'), true);
  assert.equal(isTrackingPro('INT-OLD-REFERENCE'), true);
  for (const invalid of [123456789, '12345678', '1234567890', '12345A789', 'INT-AB', '١٢٣٤٥٦٧٨٩']) {
    assert.equal(isTrackingPro(invalid), false);
  }
});

const dbUrl = process.env.TEST_SHIPMENT_DATABASE_URL;

test('PostgreSQL shipment routes preserve issued PROs, atomic updates, confirmed events, and public privacy', {
  skip: !dbUrl && 'Set TEST_SHIPMENT_DATABASE_URL to an isolated loopback PostgreSQL database.',
  timeout: 30_000,
}, async t => {
  assert.match(new URL(dbUrl).hostname, /^(?:127\.0\.0\.1|localhost|\[::1\])$/);
  const database = new pg.Pool({ connectionString: dbUrl });
  const schema = 'shipment_test_' + randomBytes(8).toString('hex');
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
  for (const name of ['001-auth.sql', '002-shipments.sql', '003-notifications.sql']) {
    await pool.query(await readFile(new URL('../server/migrations/' + name, import.meta.url), 'utf8'));
  }

  // Auth behavior has its own integration tests. This fixture tests permissions on each shipment route.
  const users = new Map();
  for (const role of ['admin', 'operator', 'viewer']) {
    const user = { id: randomUUID(), role };
    await pool.query('INSERT INTO users (id,email,role) VALUES ($1,$2,$3)', [user.id, `${role}@example.invalid`, role]);
    users.set(role, user);
  }

  const legacyPro = 'INT-EXAMPLE-LEGACY';
  const { rows: [legacy] } = await pool.query(`INSERT INTO shipments (service,pieces,weight,weight_unit,created_by)
    VALUES ('Legacy staging fixture',1,100,'lb',$1) RETURNING id`, [users.get('admin').id]);
  await pool.query("INSERT INTO tracking_numbers (pro_number,shipment_id,issuance) VALUES ($1,$2,'manual')", [legacyPro, legacy.id]);
  await pool.query(`INSERT INTO shipment_parties (shipment_id,kind,city,state,postal_code,country)
    VALUES ($1,'ship_from','Albany','NY','12207','US'), ($1,'ship_to','Boston','MA','02108','US')`, [legacy.id]);
  await pool.query(await readFile(new URL('../server/migrations/004-numeric-tracking-numbers.sql', import.meta.url), 'utf8'));
  await pool.query(await readFile(new URL('../server/migrations/007-pro-aliases.sql', import.meta.url), 'utf8'));
  await pool.query(await readFile(new URL('../server/migrations/009-bulk-shipment-imports.sql', import.meta.url), 'utf8'));
  function requireAuth(req, res, next) {
    const user = users.get(req.get('X-Fixture-Role'));
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    req.user = user;
    next();
  }
  const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden.' });
    next();
  };
  const confirmed = [];
  const { admin, publicTracking } = createShipmentRouters({
    pool, requireAuth, requireRole, audit, signDocumentKey: randomBytes(32),
    onConfirmedEvent: async (_client, event) => { confirmed.push(event); },
  });
  const app = express();
  app.use(express.json({ limit: '3mb' }));
  app.use('/api/admin', admin);
  app.use('/api/tracking', publicTracking);
  app.use((error, _req, res, _next) => res.status(error.status ?? 500).json({ error: error.message }));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = 'http://127.0.0.1:' + server.address().port;

  async function request(path, { method = 'GET', data, role, raw = false } = {}) {
    const headers = {};
    if (role) headers['X-Fixture-Role'] = role;
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(origin + path, {
      method, headers, body: data === undefined ? undefined : JSON.stringify(data),
    });
    return { status: response.status, headers: response.headers, body: raw ? await response.text() : await response.json() };
  }
  const dashboard = '/api/admin';
  const shipments = dashboard + '/shipments';
  const search = data => request('/api/tracking/search', { method: 'POST', data });
  const proSearch = (...numbers) => search({ mode: 'pro', numbers });
  const change = (path, data, method = 'POST', role = 'admin') => request(path, { role, method, data });
  const draft = {
    service: 'Staging sample freight', pieces: 2, weight: '125.5', weightUnit: 'lb',
    pickupDate: '2024-11-02', estimatedDeliveryDate: '2024-11-04',
    bol: 'QA-BOL-1000', po: 'QA-PO-1000', reference: 'QA-REFERENCE-1000',
    instructions: 'Private instructions fixture',
    shipFrom: { company: 'Test Sender', city: 'Buffalo', state: 'NY', postalCode: '14201', country: 'US',
      address: 'Private sender street', contact: 'Private sender contact', phone: '555-0101', email: 'sender@example.invalid' },
    shipTo: { company: 'Test Recipient', city: 'Toronto', state: 'ON', postalCode: 'M5V 1E3', country: 'CA',
      address: 'Private recipient street', contact: 'Private recipient contact', phone: '555-0102', email: 'recipient@example.invalid' },
  };

  assert.equal((await request(shipments)).status, 401);
  assert.equal((await change(shipments, draft, 'POST', 'viewer')).status, 403);
  assert.equal((await change(shipments, { ...draft, status: 'delivered' })).status, 400);
  assert.equal((await change(shipments, { ...draft, pickupDate: '2024-11-31' })).status, 400);
  assert.equal((await proSearch()).status, 400);
  assert.equal((await proSearch('95500000')).status, 400);
  assert.equal((await proSearch(...Array(26).fill('INT-ABCD'))).status, 400);
  for (const pro of [legacyPro, '01234567', '0000000012', '0000A1234']) {
    assert.equal((await change(shipments, { ...draft, pro })).status, 400);
  }

  const duplicate = await Promise.all([
    change(shipments, { ...draft, pro: '000012345' }),
    change(shipments, { ...draft, pro: '000012345' }),
  ]);
  assert.deepEqual(duplicate.map(result => result.status).sort(), [201, 409]);
  const created = duplicate.find(result => result.status === 201).body.shipment;
  assert.equal(created.pro, '000012345');
  assert.equal(created.version, 1);

  // Force the first automatic attempt to conflict once and verify that issuance retries.
  await pool.query(`CREATE SEQUENCE test_pro_attempts;
    CREATE FUNCTION force_first_pro_collision() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.issuance = 'automatic' AND nextval('test_pro_attempts') = 1 THEN
        NEW.pro_number := '000012345';
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER test_numeric_pro_collision BEFORE INSERT ON tracking_numbers
      FOR EACH ROW EXECUTE FUNCTION force_first_pro_collision();`);
  const automatic = await change(shipments, { ...draft, bol: 'QA-BOL-2000' });
  assert.equal(automatic.status, 201, automatic.body.error);
  assert.match(automatic.body.shipment.pro, /^[1-9][0-9]{8}$/);
  assert.equal((await pool.query('SELECT last_value::int FROM test_pro_attempts')).rows[0].last_value, 2);
  assert.equal((await request(shipments + '?q=000012345', { role: 'viewer' })).body.total, 1);
  assert.equal((await request(shipments + '?status=created&from=1900-01-01&to=2199-12-31', { role: 'viewer' })).body.total, 3);
  const legacyPatch = await change(`${shipments}/${legacy.id}`, { version: 1, pro: legacyPro, service: 'Updated legacy fixture' }, 'PATCH');
  assert.equal(legacyPatch.status, 200, legacyPatch.body.error);
  assert.equal(legacyPatch.body.shipment.pro, legacyPro);
  const legacyRepeat = await change(`${shipments}/${legacy.id}`, {
    version: legacyPatch.body.shipment.version, pro: legacyPro.slice(4).toLowerCase(),
  }, 'PATCH');
  assert.equal(legacyRepeat.status, 200, legacyRepeat.body.error);
  assert.equal(legacyRepeat.body.shipment.pro, legacyPro);

  const detail = `${shipments}/${created.id}`;
  const races = await Promise.all([
    change(detail, { version: 1, service: 'Staging freight service A' }, 'PATCH'),
    change(detail, { version: 1, service: 'Staging freight service B' }, 'PATCH'),
  ]);
  assert.deepEqual(races.map(result => result.status).sort(), [200, 409]);
  let version = races.find(result => result.status === 200).body.shipment.version;
  assert.equal((await change(detail, { version, pro: '00001234' }, 'PATCH')).status, 400);
  assert.equal((await change(detail, { version, pro: '000012346' }, 'PATCH', 'viewer')).status, 403);
  assert.equal((await change(detail, { version, pro: automatic.body.shipment.pro }, 'PATCH')).status, 409);
  const proRaces = await Promise.all([
    change(detail, { version, pro: '000012346' }, 'PATCH'),
    change(detail, { version, pro: '000012347' }, 'PATCH'),
  ]);
  assert.deepEqual(proRaces.map(result => result.status).sort(), [200, 409]);
  const replaced = proRaces.find(result => result.status === 200).body.shipment;
  version = replaced.version;
  assert.equal(replaced.id, created.id);
  assert.match(replaced.pro, /^00001234[67]$/);
  assert.equal(replaced.issuance, 'manual');
  assert.equal((await change(detail, { version, pro: created.pro }, 'PATCH')).status, 409);
  assert.equal((await change(shipments, { ...draft, pro: created.pro })).status, 409);
  for (const filter of ['?q=' + created.pro, '?pro=' + created.pro, '?pro=' + replaced.pro]) {
    const result = await request(shipments + filter, { role: 'viewer' });
    assert.equal(result.body.total, 1);
    assert.equal(result.body.shipments[0].pro, replaced.pro);
  }
  assert.equal((await request(shipments + '?pro=01234567', { role: 'viewer' })).status, 400);
  await assert.rejects(pool.query('DELETE FROM tracking_numbers WHERE pro_number=$1', [created.pro]), /permanent/);
  await assert.rejects(pool.query('UPDATE tracking_numbers SET is_current=false WHERE pro_number=$1', [replaced.pro]), /requires a current replacement/);

  const event = { city: 'Buffalo', state: 'NY', country: 'US', eventDate: '2024-11-03', eventTime: '01:30',
    timeZone: 'America/New_York', kind: 'confirmed', source: 'Synthetic fixture scan', location: 'Private site name',
    notes: 'Private note fixture', trailer: 'TRAILER-QA', status: 'picked_up' };
  const eventsPath = detail + '/events';
  assert.equal((await change(eventsPath, { ...event, version })).status, 400);
  const pickup = await change(eventsPath, { ...event, version, offset: '-04:00' }, 'POST', 'operator');
  assert.equal(pickup.status, 201, pickup.body.error);
  version = pickup.body.shipment.version;
  const inTransit = await change(eventsPath, { ...event, version, offset: '-05:00', status: 'in_transit' });
  assert.equal(inTransit.status, 201, inTransit.body.error);
  version = inTransit.body.shipment.version;
  const history = await change(eventsPath, { ...event, version, eventDate: '2024-11-02', status: 'pickup_scheduled' });
  assert.equal(history.status, 201, history.body.error);
  assert.equal(history.body.shipment.status, 'in_transit');
  version = history.body.shipment.version;
  const expected = await change(eventsPath, { ...event, version, eventDate: '2098-11-02', eventTime: '15:15',
    status: 'delivery_appointment_scheduled', kind: 'expected' });
  assert.equal(expected.status, 201, expected.body.error);
  assert.equal(expected.body.shipment.status, 'in_transit');
  version = expected.body.shipment.version;
  const delivery = { ...event, version, eventDate: '2024-11-05', eventTime: '13:15', status: 'delivered' };
  assert.equal((await change(eventsPath, delivery)).status, 400);
  assert.equal((await change(eventsPath, { ...delivery, kind: 'expected', signedBy: 'QA Signer' })).status, 400);
  const delivered = await change(eventsPath, { ...delivery, signedBy: 'QA Signer', deliveryNotes: 'Private delivery notes' });
  assert.equal(delivered.status, 201, delivered.body.error);
  version = delivered.body.shipment.version;
  assert.deepEqual(confirmed.map(item => item.status), ['picked_up', 'in_transit', 'delivered']);
  assert.equal((await change(`${eventsPath}/${delivered.body.event.id}`, { version, trailer: 'CHANGED' }, 'PATCH', 'operator')).status, 403);

  const searched = await proSearch(created.pro, automatic.body.shipment.pro, legacyPro.toLowerCase(), '000000000', replaced.pro);
  assert.equal(searched.status, 200, searched.body.error);
  assert.equal(searched.headers.get('cache-control'), 'no-store');
  assert.deepEqual(searched.body.results.map(result => result.shipments.length), [1, 1, 1, 0, 1]);
  assert.equal(searched.body.results[2].shipments[0].pro, legacyPro);
  const first = searched.body.results[0].shipments[0];
  assert.equal(first.pro, replaced.pro);
  assert.deepEqual(first, searched.body.results[4].shipments[0]);
  assert.equal(first.status, 'delivered');
  assert.equal(first.delivery.eventTime, '13:15');
  assert.equal(first.delivery.signedBy, null);
  assert.deepEqual(first.events.map(item => item.status), ['delivery_appointment_scheduled', 'delivered', 'in_transit', 'picked_up', 'pickup_scheduled']);
  assert.equal(first.events[0].kind, 'expected');
  assert.deepEqual(first.shipFrom, { company: null, city: 'Buffalo', state: 'NY', country: 'US' });
  assert.equal(first.bol, null);
  assert.doesNotMatch(JSON.stringify(searched.body), /Private|@example\.invalid|QA Signer|TRAILER-QA|14201|M5V 1E3/);

  const optIn = await change(detail, { version, shareNames: true, shareDetails: true }, 'PATCH');
  assert.equal(optIn.status, 200, optIn.body.error);
  version = optIn.body.shipment.version;
  const documents = detail + '/documents';
  const file = Buffer.from('%PDF-1.4\n% staging test redacted attachment\n%%EOF\n');
  const document = { version, kind: 'bol', name: 'redacted-test.pdf', shareable: true, contentBase64: file.toString('base64') };
  assert.equal((await change(documents, { ...document, kind: 'pod' })).status, 400);
  assert.equal((await change(documents, { ...document, contentBase64: 'SGVsbG8=' })).status, 400);
  assert.equal((await request(documents, { role: 'operator' })).status, 403);
  const upload = await change(documents, document);
  assert.equal(upload.status, 201, upload.body.error);
  version = upload.body.shipment.version;
  assert.equal(upload.body.document.shareable, true);
  assert.equal((await request(upload.body.document.downloadUrl)).status, 401);
  assert.equal((await request(upload.body.document.downloadUrl, { role: 'admin', raw: true })).body, file.toString());
  assert.equal((await proSearch(created.pro)).body.results[0].shipments[0].bolDocumentUrl, null);
  const ref = { mode: 'reference', kind: 'bol', number: 'qa-bol-1000', fromDate: '2024-11-01',
    toDate: '2024-11-03', originZip: '14201', destinationZip: 'M5V1E3' };
  assert.deepEqual((await search({ ...ref, destinationZip: 'WRONG' })).body.results[0].shipments, []);
  const verified = (await search(ref)).body.results[0].shipments[0];
  assert.equal(verified.delivery.signedBy, 'QA Signer');
  assert.equal(verified.shipTo.company, 'Test Recipient');
  assert.equal(verified.bol, draft.bol);
  assert.equal((await request(verified.bolDocumentUrl.split('?')[0])).status, 404);
  const download = await request(verified.bolDocumentUrl, { raw: true });
  assert.equal(download.status, 200);
  assert.match(download.headers.get('content-disposition'), /^attachment;/);
  assert.equal(download.body, file.toString());

  const changed = await change(`${eventsPath}/${delivered.body.event.id}`, { version, eventTime: '13:25' }, 'PATCH');
  assert.equal(changed.status, 200, changed.body.error);
  assert.equal(changed.body.event.eventTime, '13:25');
  version = changed.body.shipment.version;
  const deleted = await change(`${eventsPath}/${delivered.body.event.id}`, { version }, 'DELETE');
  assert.equal(deleted.status, 200, deleted.body.error);
  assert.equal(deleted.body.shipment.status, 'in_transit');
  assert.equal((await request(`${dashboard}/stats?status=in_transit`, { role: 'viewer' })).body.total, 1);
  assert.equal((await request(`${dashboard}/customers?q=toronto`, { role: 'viewer' })).body.total, 2);
  assert.equal((await request(`${dashboard}/audit`, { role: 'viewer' })).status, 403);
  const auditTrail = (await request(`${dashboard}/audit`, { role: 'admin' })).body.entries;
  assert.ok(auditTrail.some(entry => entry.action === 'event.deleted' && entry.targetId === delivered.body.event.id));
  assert.ok(auditTrail.some(entry => entry.action === 'document.created' && entry.targetId === upload.body.document.id));
  assert.ok(auditTrail.some(entry => entry.action === 'shipment.pro_changed' && entry.targetId === created.id &&
    entry.metadata.previousPro === created.pro && entry.metadata.pro === replaced.pro));
  assert.equal(auditTrail.filter(entry => entry.action === 'shipment.created').length, 2);
  const migratedLegacy = await change(shipments + '/' + legacy.id, {
    version: legacyRepeat.body.shipment.version, pro: '000012348',
  }, 'PATCH');
  assert.equal(migratedLegacy.status, 200, migratedLegacy.body.error);
  assert.equal((await proSearch(legacyPro.toLowerCase())).body.results[0].shipments[0].pro, '000012348');

  const { rows: [prefixed] } = await pool.query(
    "INSERT INTO shipments (service,pieces,weight,weight_unit,created_by) VALUES ('Legacy numeric fixture',1,1,'lb',$1) RETURNING id",
    [users.get('admin').id],
  );
  await pool.query("INSERT INTO tracking_numbers (pro_number,shipment_id,issuance) VALUES ('INT-001234567',$1,'manual')", [prefixed.id]);
  await pool.query(`INSERT INTO shipment_parties (shipment_id,kind,city,state,postal_code,country)
    SELECT $1,kind,city,state,postal_code,country FROM shipment_parties WHERE shipment_id=$2`, [prefixed.id, legacy.id]);
  const normalized = await change(shipments + '/' + prefixed.id, { version: 1, pro: '001234567' }, 'PATCH');
  assert.equal(normalized.status, 200, normalized.body.error);
  assert.equal(normalized.body.shipment.pro, '001234567');
  assert.equal((await proSearch('INT-001234567')).body.results[0].shipments[0].pro, '001234567');

  await t.test('create fills missing references without colliding or changing manual reuse', async subtest => {
    const legacyShipment = await request(`${shipments}/${legacy.id}`, { role: 'viewer' });
    assert.equal(legacyShipment.body.shipment.bol, '');
    assert.equal(legacyShipment.body.shipment.po, '');

    const occupied = await change(shipments, { ...draft, pro: '710002001', bol: '12345678901', po: 'ca0122600000a' });
    assert.equal(occupied.status, 201, occupied.body.error);
    assert.equal(occupied.body.shipment.bol, '12345678901');
    assert.equal(occupied.body.shipment.po, 'ca0122600000a');

    // Exercise a padded PO, then force concurrent requests to hit an occupied PO and share BOL candidates.
    const fallbackBol = [12_345_678_901, 12_345_678_902, 12_345_678_903];
    let draw = 0;
    let poCandidate = 42;
    const randomInt = crypto.randomInt;
    subtest.mock.method(crypto, 'randomInt', (min, max) => {
      if (max === 100_000_000_000) return fallbackBol[draw++ % fallbackBol.length];
      if (min === 100_000 && max === undefined) return poCandidate;
      return randomInt(min, max);
    });
    syncBuiltinESMExports();
    subtest.after(() => {
      subtest.mock.restoreAll();
      syncBuiltinESMExports();
    });

    const partial = await change(shipments, { ...draft, pro: '710002004', bol: '12345678901', po: '' });
    assert.equal(partial.status, 201, partial.body.error);
    assert.equal(partial.body.shipment.bol, '12345678901');
    assert.equal(partial.body.shipment.po, 'CA0122600042A');
    poCandidate = 0;
    const concurrent = await Promise.all([
      change(shipments, { ...draft, pro: '710002002', bol: undefined, po: undefined }),
      change(shipments, { ...draft, pro: '710002003', bol: '   ', po: '' }),
    ]);
    for (const response of concurrent) assert.equal(response.status, 201, response.body.error);
    const [first, second] = concurrent.map(response => response.body.shipment);
    assert.deepEqual([first.bol, second.bol].sort(), ['12345678902', '12345678903']);
    assert.notEqual(first.po, second.po);
    for (const po of [first.po, second.po]) {
      assert.match(po, /^CA01226[0-9]{5}A$/);
      assert.notEqual(po, 'CA0122600000A');
      assert.notEqual(po, partial.body.shipment.po);
    }

    const reuse = await change(shipments, { ...draft, pro: '710002005', bol: first.bol, po: first.po });
    assert.equal(reuse.status, 201, reuse.body.error);
    assert.equal(reuse.body.shipment.po, first.po);

    const verifiedAuto = await search({ ...ref, kind: 'po', number: second.po });
    assert.equal(verifiedAuto.status, 200, verifiedAuto.body.error);
    assert.equal(verifiedAuto.body.results[0].shipments[0].pro, second.pro);
    const retained = await request(`${shipments}/${second.id}`, { role: 'viewer' });
    assert.equal(retained.body.shipment.bol, second.bol);
    const edited = await change(`${shipments}/${first.id}`, { version: first.version, bol: '' }, 'PATCH');
    assert.equal(edited.status, 200, edited.body.error);
    assert.equal(edited.body.shipment.bol, '');
    assert.equal(edited.body.shipment.po, first.po);
  });

  await t.test('bulk imports validate everything, preserve row order, and retry without creating duplicates', async subtest => {
    const bulk = shipments + '/bulk';
    const importId = randomUUID();
    const rows = [
      { ...draft, reference: 'QA-BULK-FIRST', bol: '', po: '' },
      { ...draft, reference: 'QA-BULK-SECOND', bol: '12345555555', po: 'ca0122600073a' },
    ];
    const send = (value, role = 'operator') => change(bulk, value, 'POST', role);
    const importCount = async () => (await pool.query("SELECT count(*)::int AS count FROM shipments WHERE reference LIKE 'QA-BULK-%'")).rows[0].count;
    assert.equal((await request(bulk, { method: 'POST', data: { importId, shipments: rows } })).status, 401);
    assert.equal((await send({ importId, shipments: rows }, 'viewer')).status, 403);
    assert.equal((await send({ importId: 'invalid', shipments: rows })).status, 400);
    assert.equal((await send({ importId, shipments: Array(101).fill(rows[0]) })).status, 400);
    const invalidRows = await send({ importId, shipments: [rows[0], { ...rows[1], weight: 0 }, { ...rows[1], pro: '123456789' }] });
    assert.equal(invalidRows.status, 400);
    assert.deepEqual(invalidRows.body.errors.map(entry => entry.row), [2, 3]);
    assert.equal(await importCount(), 0);

    let draw = 0;
    const randomInt = crypto.randomInt;
    subtest.mock.method(crypto, 'randomInt', (min, max) => {
      if (max === 100_000_000_000) return 12_345_555_555 + (draw++ % 2);
      if (min === 100_000 && max === undefined) return 73;
      return randomInt(min, max);
    });
    syncBuiltinESMExports();
    subtest.after(() => {
      subtest.mock.restoreAll();
      syncBuiltinESMExports();
    });

    const payload = { importId, shipments: rows };
    const replies = await Promise.all([send(payload), send({ ...payload, importId: importId.toUpperCase() })]);
    assert.deepEqual(replies.map(result => result.status).sort(), [200, 201], JSON.stringify(replies.map(result => result.body)));
    const first = replies.find(result => result.status === 201).body;
    const replay = replies.find(result => result.status === 200).body;
    assert.equal(first.replayed, false);
    assert.equal(replay.replayed, true);
    assert.equal(first.total, 2);
    assert.equal(replay.importId, importId);
    assert.deepEqual(first.shipments, replay.shipments);
    assert.deepEqual(first.shipments.map(entry => entry.row), [1, 2]);
    assert.ok(first.shipments.every(entry => /^[1-9][0-9]{8}$/.test(entry.pro)));
    assert.notEqual(first.shipments[0].pro, first.shipments[1].pro);
    assert.equal(first.shipments[0].bol, '12345555556');
    assert.match(first.shipments[0].po, /^CA01226[0-9]{5}A$/);
    assert.notEqual(first.shipments[0].po, 'CA0122600073A');
    assert.equal(first.shipments[1].bol, rows[1].bol);
    assert.equal(first.shipments[1].po, rows[1].po);
    const lookup = await proSearch(...first.shipments.map(entry => entry.pro));
    assert.equal(lookup.status, 200, lookup.body.error);
    assert.deepEqual(lookup.body.results.map(result => result.shipments[0].pro), first.shipments.map(entry => entry.pro));
    assert.equal((await send({ importId, shipments: [...rows].reverse() })).status, 409);
    assert.equal(await importCount(), 2);

    subtest.mock.restoreAll();
    syncBuiltinESMExports();
    const scoped = await send(payload, 'admin');
    assert.equal(scoped.status, 201, scoped.body.error);
    assert.notEqual(scoped.body.shipments[0].id, first.shipments[0].id);
    assert.equal(await importCount(), 4);
    const counts = await pool.query('SELECT count(*)::int AS count FROM audit_logs WHERE action=$1 AND target_id=$2', ['shipments.imported', importId]);
    assert.equal(counts.rows[0].count, 2);
  });

  await t.test('an import receipt failure rolls back the shipment rows and leaves the import ID reusable', async () => {
    const importId = randomUUID();
    const payload = { importId, shipments: [{ ...draft, reference: 'QA-ROLLBACK-A' }, { ...draft, reference: 'QA-ROLLBACK-B' }] };
    await pool.query(`CREATE FUNCTION reject_test_import_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Isolated receipt failure fixture'; END;
      $$;
      CREATE TRIGGER reject_test_import_receipt BEFORE INSERT ON shipment_imports
      FOR EACH ROW EXECUTE FUNCTION reject_test_import_receipt()`);
    const count = async () => (await pool.query("SELECT count(*)::int AS count FROM shipments WHERE reference LIKE 'QA-ROLLBACK-%'")).rows[0].count;
    assert.equal((await change(shipments + '/bulk', payload)).status, 500);
    assert.equal(await count(), 0);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM shipment_imports WHERE import_id=$1', [importId])).rows[0].count, 0);
    await pool.query('DROP TRIGGER reject_test_import_receipt ON shipment_imports');
    assert.equal((await change(shipments + '/bulk', payload)).status, 201);
    assert.equal(await count(), 2);
  });
});
