import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';

export const shipmentStatuses = Object.freeze([
  'created', 'pickup_scheduled', 'picked_up', 'arrived_at_service_center',
  'departed_service_center', 'in_transit', 'delivery_appointment_scheduled',
  'out_for_delivery', 'delivered', 'delivery_attempt_failed', 'delivery_exception', 'delayed', 'cancelled',
]);

const uuidPattern = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const numericProPattern = /^[0-9]{9}$/;
const legacyProPattern = /^INT-[A-Z0-9][A-Z0-9-]{3,31}$/;
const referenceColumns = Object.freeze({ bol: 'bol', po: 'po', reference: 'reference' });
const poPrefix = 'CA01226';
const maxBulkShipments = 100;
const maxBulkEvents = 100;
const maxDocumentBytes = 2 * 1024 * 1024;
const timelineOrder = 'occurred_at DESC, created_at DESC, id DESC';

function fail(status, message) {
  throw Object.assign(new Error(message), { status, expose: true });
}

function text(value, label, limit, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') fail(400, `${label} must be text.`);
  const result = value.trim();
  if (result.length > limit || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(result)) {
    fail(400, `${label} must use at most ${limit} characters.`);
  }
  if (required && !result) fail(400, `${label} is required.`);
  return result;
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, `${label} is required.`);
  return value;
}

function selection(value, choices, label) {
  if (!choices.includes(value)) fail(400, `Select a valid ${label}.`);
  return value;
}

function integer(value, label, min, max) {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    fail(400, `${label} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function boolean(value, label) {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') fail(400, `${label} must be true or false.`);
  return value;
}

function id(value) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) fail(404, 'Record not found.');
  return value;
}

function date(value, label, required = false) {
  if ((value == null || value === '') && !required) return null;
  if (typeof value !== 'string' || !/^(?:19\d{2}|20\d{2}|21\d{2})-\d{2}-\d{2}$/.test(value)) {
    fail(400, `${label} must be a valid calendar date (YYYY-MM-DD).`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(400, `${label} must be a valid calendar date (YYYY-MM-DD).`);
  }
  return value;
}

function dateRange(from, to) {
  if (from && to && from > to) fail(400, 'The start date must be on or before the end date.');
}

function country(value, label) {
  const code = text(value, label, 2, true).toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) fail(400, `${label} must be a two-letter country code.`);
  return code;
}

function postal(value, label) {
  const code = text(value, label, 16, true).toUpperCase();
  if (!/^[A-Z\d][A-Z\d -]{0,14}[A-Z\d]$/.test(code)) fail(400, `${label} must be a valid postal code.`);
  return code;
}

function email(value, label) {
  const address = text(value, label, 254);
  if (address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) fail(400, `${label} must be a valid email address.`);
  return address.toLowerCase();
}

function shipmentParty(value, name) {
  const party = object(value, name);
  const countryCode = country(party.country, `${name} country`);
  return {
    company: text(party.company, `${name} company`, 160),
    contact: text(party.contact, `${name} contact`, 160),
    address: text(party.address, `${name} address`, 250),
    city: text(party.city, `${name} city`, 100, true),
    state: text(party.state, `${name} state`, 100, ['US', 'CA'].includes(countryCode)),
    postalCode: postal(party.postalCode, `${name} postal code`),
    country: countryCode,
    phone: text(party.phone, `${name} phone`, 48),
    email: email(party.email, `${name} email`),
  };
}

function shipmentDraft(value) {
  const body = object(value, 'Shipment');
  const pickupDate = date(body.pickupDate, 'Pickup date');
  const estimatedDeliveryDate = date(body.estimatedDeliveryDate, 'Estimated delivery date');
  dateRange(pickupDate, estimatedDeliveryDate);
  const weightInput = (typeof body.weight === 'number' || typeof body.weight === 'string') ? String(body.weight) : '';
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(weightInput) || Number(weightInput) <= 0) {
    fail(400, 'Weight must be positive, with at most three decimal places.');
  }
  return {
    service: text(body.service, 'Service', 100, true),
    bol: text(body.bol, 'Bill of lading', 100),
    po: text(body.po, 'PO number', 100),
    reference: text(body.reference, 'Reference number', 100),
    pickupDate,
    estimatedDeliveryDate,
    pieces: integer(body.pieces, 'Pieces', 1, 1000000),
    weight: weightInput,
    weightUnit: selection(body.weightUnit, ['lb', 'kg'], 'weight unit'),
    trailer: text(body.trailer, 'Trailer number', 48),
    instructions: text(body.instructions, 'Special instructions', 3000),
    shareNames: boolean(body.shareNames, 'Share company names'),
    shareDetails: boolean(body.shareDetails, 'Share shipment details'),
    shipFrom: shipmentParty(body.shipFrom, 'Ship from'),
    shipTo: shipmentParty(body.shipTo, 'Ship to'),
  };
}

function manualPro(value) {
  const input = text(value, 'PRO number', 36);
  if (!input) return null;
  if (!numericProPattern.test(input)) fail(400, 'A new PRO number must contain exactly 9 digits.');
  return input;
}

function prepareShipmentCreation(body, bulk = false) {
  const draft = shipmentDraft(body);
  if (bulk && text(body.pro, 'PRO number', 36)) fail(400, 'Bulk imports generate PRO numbers automatically. Leave the PRO number blank.');
  const requested = manualPro(body.pro);
  if (body.status != null && body.status !== 'created') {
    fail(400, 'Record a confirmed tracking event to change a shipment status.');
  }
  return { draft, requested };
}

export function isTrackingPro(value) {
  return typeof value === 'string' && (numericProPattern.test(value) || legacyProPattern.test(value));
}

function searchPro(value) {
  const number = text(value, 'PRO number', 36, true).toUpperCase();
  if (!isTrackingPro(number)) fail(400, 'Enter a 9-digit internal PRO number or an existing number beginning with INT-.');
  return number;
}

function matchesIssuedPro(value, issued) {
  const number = text(value, 'PRO number', 36).toUpperCase();
  return number === issued ||
    (!numericProPattern.test(number) && legacyProPattern.test(issued) && 'INT-' + number === issued);
}

function utcOffset(minutes) {
  const hours = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0');
  const remainder = String(Math.abs(minutes) % 60).padStart(2, '0');
  return `${minutes < 0 ? '-' : '+'}${hours}:${remainder}`;
}

export function parseEventTime(eventDate, eventTime, timeZone, suppliedOffset) {
  const day = date(eventDate, 'Event date', true);
  const time = text(eventTime, 'Event time', 5, true);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) fail(400, 'Enter event time in 24-hour HH:MM format.');
  const zone = text(timeZone, 'Time zone', 64, true);
  let formatter;
  try {
    if (!/^(?:UTC|[A-Za-z][A-Za-z_+\-\d]+(?:\/[A-Za-z_+\-\d]+)+)$/.test(zone)) throw new RangeError();
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
  } catch {
    fail(400, 'Use an IANA time zone such as America/New_York or UTC.');
  }

  function wallClock(timestamp) {
    const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }

  const wallTime = `${day}T${time}`;
  const target = Date.parse(`${wallTime}:00Z`);
  const offsets = new Set();
  // Sampling each side of a transition makes both instances of a repeated local time visible.
  for (const hours of [-36, -12, 0, 12, 36]) {
    const sample = target + hours * 3600000;
    offsets.add((Date.parse(`${wallClock(sample)}:00Z`) - sample) / 60000);
  }
  const matches = [...offsets].map(minutes => ({ offset: utcOffset(minutes), timestamp: target - minutes * 60000 }))
    .filter(candidate => wallClock(candidate.timestamp) === wallTime);

  if (!matches.length) fail(400, 'This local time does not exist in the selected time zone.');
  const requestedOffset = text(suppliedOffset, 'UTC offset', 6);
  if (!requestedOffset && matches.length > 1) {
    fail(400, `This local time occurs twice. Specify the UTC offset (${matches.map(match => match.offset).join(' or ')}).`);
  }
  const selected = requestedOffset ? matches.find(candidate => candidate.offset === requestedOffset) : matches[0];
  if (!selected) fail(400, 'The UTC offset does not match the event date, time and time zone.');
  return { eventDate: day, eventTime: time, timeZone: zone, offset: selected.offset, occurredAt: new Date(selected.timestamp) };
}

function eventDraft(value) {
  const body = object(value, 'Tracking event');
  const status = selection(body.status, shipmentStatuses, 'tracking status');
  const kind = selection(body.kind, ['confirmed', 'expected'], 'event type');
  const timing = parseEventTime(body.eventDate, body.eventTime, body.timeZone, body.offset);
  if (kind === 'confirmed' && timing.occurredAt.getTime() > Date.now()) {
    fail(400, 'Confirmed events cannot be in the future.');
  }
  if (kind !== 'confirmed' && status === 'delivered') fail(400, 'Delivery requires a confirmed event.');
  const countryCode = country(body.country, 'Event country');
  return {
    status, kind,
    location: text(body.location, 'Location', 160),
    city: text(body.city, 'City', 100, true),
    state: text(body.state, 'State', 100, ['US', 'CA'].includes(countryCode)),
    country: countryCode,
    ...timing,
    source: text(body.source, 'Event source', 160, true),
    trailer: text(body.trailer, 'Trailer number', 48),
    notes: text(body.notes, 'Event notes', 2000),
    signedBy: status === 'delivered' ? text(body.signedBy, 'Signed by', 160, true) : '',
    deliveryNotes: status === 'delivered' ? text(body.deliveryNotes, 'Delivery notes', 2000) : '',
  };
}

function bulkEventDraft(value) {
  const body = object(value, 'Tracking event');
  const pro = searchPro(body.pro);
  const kind = body.kind ?? 'confirmed';
  if (kind !== 'confirmed') fail(400, 'Progress imports require a confirmed event.');
  if (body.status === 'created') fail(400, 'Choose a progress status other than Shipment created.');
  return { pro, draft: eventDraft({ ...body, kind }) };
}

function validateImportRows(input, prepare) {
  const rows = [];
  const errors = [];
  for (const [index, value] of input.entries()) {
    try {
      rows.push(prepare(value));
    } catch (error) {
      if (!error.expose || error.status !== 400) throw error;
      errors.push({ row: index + 1, message: error.message });
    }
  }
  return { rows, errors };
}

async function resolveBulkEventTargets(client, input) {
  const { rows } = await client.query(`SELECT pro_number, shipment_id FROM tracking_numbers
    WHERE pro_number=ANY($1::text[])`, [input.map(item => item.pro)]);
  const byPro = new Map(rows.map(row => [row.pro_number, row.shipment_id]));
  const firstRow = new Map();
  const errors = [];
  const events = input.map((item, index) => {
    const row = index + 1;
    const shipmentId = byPro.get(item.pro);
    if (!shipmentId) errors.push({ row, message: 'No shipment has this PRO number.' });
    else if (firstRow.has(shipmentId)) {
      errors.push({ row, message: `This shipment already has an update on row ${firstRow.get(shipmentId)}. Use one update per shipment.` });
    } else firstRow.set(shipmentId, row);
    return { row, ...item, shipmentId };
  });
  return { events, errors };
}

async function transaction(pool, task, readOnly = false) {
  const client = await pool.connect();
  try {
    await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN ISOLATION LEVEL READ COMMITTED');
    const result = await task(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

const shipmentSelect = `SELECT s.*, t.pro_number, t.issuance, t.issued_at,
    to_char(s.pickup_date, 'YYYY-MM-DD') AS pickup_day,
    to_char(s.estimated_delivery_date, 'YYYY-MM-DD') AS delivery_day,
    row_to_json(sender) AS ship_from, row_to_json(recipient) AS ship_to
  FROM shipments s JOIN tracking_numbers t ON t.shipment_id = s.id AND t.is_current
  LEFT JOIN shipment_parties sender ON sender.shipment_id = s.id AND sender.kind = 'ship_from'
  LEFT JOIN shipment_parties recipient ON recipient.shipment_id = s.id AND recipient.kind = 'ship_to'`;

function mapParty(row) {
  if (!row) return null;
  return {
    company: row.company, contact: row.contact, address: row.address, city: row.city,
    state: row.state, postalCode: row.postal_code, country: row.country, phone: row.phone, email: row.email,
  };
}

function mapShipment(row) {
  return {
    id: row.id, pro: row.pro_number, issuance: row.issuance, issuedAt: row.issued_at,
    status: row.status, service: row.service, version: row.version, bol: row.bol, po: row.po,
    reference: row.reference, pickupDate: row.pickup_day, estimatedDeliveryDate: row.delivery_day,
    pieces: row.pieces, weight: Number(row.weight), weightUnit: row.weight_unit, trailer: row.trailer,
    instructions: row.instructions, shipFrom: mapParty(row.ship_from), shipTo: mapParty(row.ship_to),
    shareNames: row.share_names, shareDetails: row.share_details,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function getShipment(client, shipmentId) {
  const { rows } = await client.query(`${shipmentSelect} WHERE s.id = $1`, [shipmentId]);
  if (!rows.length) fail(404, 'Shipment not found.');
  return mapShipment(rows[0]);
}

function shipmentFilter(query) {
  const clauses = [];
  const parameters = [];
  const parameter = value => `$${parameters.push(value)}`;
  const q = text(query.q, 'Search', 100);
  const pro = text(query.pro, 'PRO number', 36);
  const status = text(query.status, 'Status', 48);
  const from = date(query.from, 'From date');
  const to = date(query.to, 'To date');
  dateRange(from, to);
  if (q) {
    const needle = parameter(q.toUpperCase());
    clauses.push(`(EXISTS (SELECT 1 FROM tracking_numbers n WHERE n.shipment_id=s.id AND strpos(n.pro_number, ${needle}) > 0)
      OR strpos(upper(s.bol), ${needle}) > 0
      OR strpos(upper(s.po), ${needle}) > 0 OR strpos(upper(s.reference), ${needle}) > 0)`);
  }
  if (pro) clauses.push(`EXISTS (SELECT 1 FROM tracking_numbers n WHERE n.shipment_id=s.id AND n.pro_number=${parameter(searchPro(pro))})`);
  if (status) clauses.push(`s.status = ${parameter(selection(status, shipmentStatuses, 'shipment status'))}`);
  if (from) clauses.push(`s.created_at >= ${parameter(from)}::date::timestamp AT TIME ZONE 'UTC'`);
  if (to) clauses.push(`s.created_at < (${parameter(to)}::date + 1)::timestamp AT TIME ZONE 'UTC'`);
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', parameters };
}

function page(query) {
  return {
    limit: integer(query.limit ?? 50, 'Limit', 1, 100),
    offset: integer(query.offset ?? 0, 'Offset', 0, 100000),
  };
}

async function lockShipment(client, shipmentId, version) {
  const expected = integer(version, 'Version', 1, 2147483646);
  const { rows } = await client.query('SELECT id, status, version FROM shipments WHERE id = $1 FOR UPDATE', [shipmentId]);
  if (!rows.length) fail(404, 'Shipment not found.');
  if (rows[0].version !== expected) fail(409, 'This shipment changed. Reload it and apply your changes again.');
  return rows[0];
}

async function issuePro(client, shipmentId, requested) {
  const attempts = requested ? 1 : 16;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const number = requested || String(randomInt(100_000_000, 1_000_000_000));
    const result = await client.query(`INSERT INTO tracking_numbers (pro_number, shipment_id, issuance)
      VALUES ($1,$2,$3) ON CONFLICT (pro_number) DO NOTHING`, [number, shipmentId, requested ? 'manual' : 'automatic']);
    if (result.rowCount) return number;
  }
  if (requested) fail(409, 'That PRO number has already been issued.');
  fail(503, 'A unique PRO number could not be issued. Try again.');
}

async function replacePro(client, shipment, value) {
  if (matchesIssuedPro(value, shipment.pro)) return null;
  const requested = manualPro(value);
  if (!requested) fail(400, 'A replacement PRO number must contain exactly 9 digits.');
  const existing = await client.query('SELECT 1 FROM tracking_numbers WHERE pro_number=$1', [requested]);
  if (existing.rowCount) fail(409, 'That PRO number has already been issued.');
  const retired = await client.query(
    'UPDATE tracking_numbers SET is_current=false WHERE pro_number=$1 AND shipment_id=$2 AND is_current',
    [shipment.pro, shipment.id],
  );
  if (retired.rowCount !== 1) throw new Error('Shipment has no current PRO to replace.');
  return issuePro(client, shipment.id, requested);
}

async function lockShipmentReferences(client) {
  // Manual reference reuse remains allowed. Serialize all app reference writes with automatic allocation.
  await client.query('SELECT pg_advisory_xact_lock(725464302)');
}

async function availableReference(client, kind, candidates) {
  const column = referenceColumns[kind];
  const { rows } = await client.query(`SELECT candidate FROM unnest($1::text[]) AS choices(candidate)
    WHERE NOT EXISTS (SELECT 1 FROM shipments WHERE ${column} <> '' AND upper(${column}) = choices.candidate)
    LIMIT 1`, [candidates]);
  return rows[0]?.candidate;
}

async function automaticBol(client, reserved) {
  const candidates = Array.from({ length: 16 }, () => String(randomInt(10_000_000_000, 100_000_000_000)))
    .filter(candidate => !reserved?.has(candidate));
  const number = await availableReference(client, 'bol', candidates);
  if (!number) fail(409, 'Could not allocate a bill of lading number. Try again or enter one manually.');
  return number;
}

async function automaticPo(client, reserved) {
  const candidates = Array.from({ length: 16 }, () => `${poPrefix}${String(randomInt(100_000)).padStart(5, '0')}A`)
    .filter(candidate => !reserved?.has(candidate));
  const proposed = await availableReference(client, 'po', candidates);
  if (proposed) return proposed;

  // The five-digit namespace is finite. Search it before reporting exhaustion.
  const { rows } = await client.query(`SELECT candidate FROM (
      SELECT $1 || lpad(number::text, 5, '0') || 'A' AS candidate
      FROM generate_series(0, 99999) AS choices(number)
    ) AS supported
    WHERE candidate <> ALL($2::text[])
      AND NOT EXISTS (SELECT 1 FROM shipments WHERE po <> '' AND upper(po) = supported.candidate)
    LIMIT 1`, [poPrefix, reserved ? [...reserved] : []]);
  if (!rows.length) fail(409, 'All automatic purchase order numbers are in use. Enter a PO number manually.');
  return rows[0].candidate;
}

async function writeParty(client, shipmentId, kind, party) {
  await client.query(`INSERT INTO shipment_parties (shipment_id, kind, company, contact, address, city, state,
      postal_code, country, phone, email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (shipment_id, kind) DO UPDATE SET company=excluded.company, contact=excluded.contact,
      address=excluded.address, city=excluded.city, state=excluded.state, postal_code=excluded.postal_code,
      country=excluded.country, phone=excluded.phone, email=excluded.email`, [shipmentId, kind,
    party.company, party.contact, party.address, party.city, party.state, party.postalCode, party.country, party.phone, party.email]);
}

function shipmentValues(draft) {
  return [draft.service, draft.bol, draft.po, draft.reference, draft.pickupDate, draft.estimatedDeliveryDate,
    draft.pieces, draft.weight, draft.weightUnit, draft.trailer, draft.instructions, draft.shareNames, draft.shareDetails];
}

// The caller holds the transaction-level reference lock while allocating and inserting.
async function insertShipment(client, { draft: prepared, requested }, actorId, audit, reserved) {
  const draft = { ...prepared };
  if (!draft.bol) draft.bol = await automaticBol(client, reserved?.bol);
  if (!draft.po) draft.po = await automaticPo(client, reserved?.po);
  const { rows: [row] } = await client.query(`INSERT INTO shipments
    (service, bol, po, reference, pickup_date, estimated_delivery_date, pieces, weight, weight_unit,
      trailer, instructions, share_names, share_details, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`, [...shipmentValues(draft), actorId]);
  const pro = await issuePro(client, row.id, requested);
  await writeParty(client, row.id, 'ship_from', draft.shipFrom);
  await writeParty(client, row.id, 'ship_to', draft.shipTo);
  await audit(client, { actorId, action: 'shipment.created', targetType: 'shipment', targetId: row.id,
    metadata: { pro, issuance: requested ? 'manual' : 'automatic' } });
  return { id: row.id, pro, bol: draft.bol, po: draft.po };
}

function reserveBatchReferences(rows) {
  return {
    bol: new Set(rows.map(row => row.draft.bol.toUpperCase()).filter(Boolean)),
    po: new Set(rows.map(row => row.draft.po.toUpperCase()).filter(Boolean)),
  };
}

async function bumpShipment(client, shipmentId, status = null) {
  await client.query(`UPDATE shipments SET version = version + 1, updated_at = clock_timestamp(),
    status = COALESCE($2, status) WHERE id = $1`, [shipmentId, status]);
}

async function shipmentEvents(client, shipmentIds, publicOnly = false) {
  const { rows } = await client.query(`SELECT *, to_char(event_date, 'YYYY-MM-DD') AS event_day,
      substring(event_time::text, 1, 5) AS event_hour
    FROM tracking_events WHERE shipment_id = ANY($1::uuid[]) AND deleted_at IS NULL
    ${publicOnly ? "AND (kind = 'confirmed' OR status IN ('pickup_scheduled', 'delivery_appointment_scheduled'))" : ''}
    ORDER BY ${timelineOrder}`, [shipmentIds]);
  return rows;
}

function mapEvent(row) {
  return {
    id: row.id, status: row.status, kind: row.kind, location: row.location, city: row.city,
    state: row.state, country: row.country, eventDate: row.event_day, eventTime: row.event_hour,
    timeZone: row.time_zone, offset: row.utc_offset, source: row.source, trailer: row.trailer,
    notes: row.notes, signedBy: row.signed_by, deliveryNotes: row.delivery_notes, occurredAt: row.occurred_at,
    createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

const eventDateSelection = "*, to_char(event_date, 'YYYY-MM-DD') AS event_day, substring(event_time::text, 1, 5) AS event_hour";

function eventValues(draft) {
  return [draft.status, draft.kind, draft.location, draft.city, draft.state, draft.country, draft.occurredAt,
    draft.eventDate, draft.eventTime, draft.timeZone, draft.offset, draft.source, draft.trailer, draft.notes,
    draft.signedBy, draft.deliveryNotes];
}

async function currentEvent(client, shipmentId) {
  const { rows } = await client.query(`SELECT id, status FROM tracking_events WHERE shipment_id=$1
    AND kind='confirmed' AND deleted_at IS NULL ORDER BY ${timelineOrder} LIMIT 1`, [shipmentId]);
  return rows[0] || null;
}

async function progressReceiptsWithCurrentTracking(client, receipts) {
  const { rows } = await client.query(`SELECT s.id, s.status, t.pro_number,
      to_char(latest.event_date, 'YYYY-MM-DD') AS event_day,
      substring(latest.event_time::text, 1, 5) AS event_hour, latest.time_zone, latest.utc_offset
    FROM shipments s
    JOIN tracking_numbers t ON t.shipment_id=s.id AND t.is_current
    LEFT JOIN LATERAL (
      SELECT status, event_date, event_time, time_zone, utc_offset FROM tracking_events
      WHERE shipment_id=s.id AND kind='confirmed' AND deleted_at IS NULL
      ORDER BY ${timelineOrder} LIMIT 1
    ) latest ON latest.status=s.status
    WHERE s.id=ANY($1::uuid[])`, [receipts.map(receipt => receipt.shipmentId)]);
  const currentById = new Map(rows.map(row => [row.id, row]));
  return receipts.map(receipt => {
    const current = currentById.get(receipt.shipmentId);
    return {
      ...receipt,
      canonicalPro: current?.pro_number ?? null,
      currentStatus: current?.status ?? null,
      currentEventDate: current?.event_day ?? null,
      currentEventTime: current?.event_hour ?? null,
      currentTimeZone: current?.time_zone ?? null,
      currentUtcOffset: current?.utc_offset ?? null,
    };
  });
}

async function insertTrackingEvent(client, shipment, draft, { actorId, audit, onConfirmedEvent }) {
  const { rows: [row] } = await client.query(`INSERT INTO tracking_events (status, kind, location, city, state,
    country, occurred_at, event_date, event_time, time_zone, utc_offset, source, trailer, notes,
    signed_by, delivery_notes, shipment_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
    $13,$14,$15,$16,$17,$18) RETURNING ${eventDateSelection}`, [...eventValues(draft), shipment.id, actorId]);
  const event = mapEvent(row);
  const latest = await currentEvent(client, shipment.id);
  const nextStatus = latest?.status ?? 'created';
  await bumpShipment(client, shipment.id, nextStatus);
  await audit(client, { actorId, action: 'event.created', targetType: 'tracking_event', targetId: event.id,
    metadata: { shipmentId: shipment.id, status: event.status, kind: event.kind, occurredAt: event.occurredAt } });
  if (latest?.id === event.id && nextStatus !== shipment.status) {
    await onConfirmedEvent?.(client, { shipmentId: shipment.id, eventId: event.id, status: nextStatus });
  }
  return event;
}

async function fetchEvent(client, shipmentId, eventId) {
  const { rows } = await client.query(`SELECT ${eventDateSelection} FROM tracking_events
    WHERE shipment_id=$1 AND id=$2 AND deleted_at IS NULL`, [shipmentId, eventId]);
  if (!rows.length) fail(404, 'Tracking event not found.');
  return mapEvent(rows[0]);
}

function documentPath(shipmentId, documentId) {
  return `/api/admin/shipments/${shipmentId}/documents/${documentId}`;
}

function mapDocument(row) {
  return {
    id: row.id, kind: row.kind, name: row.name, size: row.size, shareable: row.shareable,
    createdAt: row.created_at, createdBy: row.created_by, downloadUrl: documentPath(row.shipment_id, row.id),
  };
}

function documentDraft(value) {
  const body = object(value, 'Document');
  const kind = selection(body.kind, ['bol', 'pod', 'other'], 'document type');
  const name = text(body.name, 'File name', 160, true);
  if (!/^[^/\\\r\n]+\.pdf$/i.test(name)) fail(400, 'Use a PDF file with a .pdf extension.');
  const shareable = boolean(body.shareable, 'Share BOL');
  if (shareable && kind !== 'bol') fail(400, 'Only a redacted bill of lading may be shared.');
  if (typeof body.contentBase64 !== 'string' || body.contentBase64.length > Math.ceil(maxDocumentBytes / 3) * 4) {
    fail(400, 'Upload a PDF of no more than 2 MB.');
  }
  const content = Buffer.from(body.contentBase64, 'base64');
  if (content.length < 8 || content.length > maxDocumentBytes || content.toString('base64') !== body.contentBase64 ||
      !/^%PDF-[12]\.\d\r?\n/.test(content.subarray(0, 12).toString('latin1')) ||
      !/%%EOF\s*$/.test(content.subarray(-1024).toString('latin1'))) {
    fail(400, 'Upload a valid PDF of no more than 2 MB.');
  }
  return { kind, name, shareable, content };
}

function sendPdf(res, row) {
  // The browser receives an attachment instead of interpreting uploaded bytes as an inline document.
  res.set({ 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
    'Content-Disposition': `attachment; filename="shipment-document.pdf"; filename*=UTF-8''${encodeURIComponent(row.name).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`)}`,
  });
  res.send(row.content);
}

function mountAdmin(router, { pool, requireAuth, requireRole, audit, onConfirmedEvent }) {
  router.use(requireAuth);
  const editShipment = requireRole('admin', 'operator');
  const adminOnly = requireRole('admin');

  router.get('/stats', async (req, res) => {
    const { where, parameters } = shipmentFilter(req.query);
    const { rows } = await pool.query(`SELECT s.status, count(*)::int AS count FROM shipments s
      JOIN tracking_numbers t ON t.shipment_id = s.id AND t.is_current ${where} GROUP BY s.status`, parameters);
    const byStatus = Object.fromEntries(shipmentStatuses.map(status => [status, 0]));
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = row.count;
      total += row.count;
    }
    res.json({ total, byStatus });
  });

  router.get('/shipments', async (req, res) => {
    const { where, parameters } = shipmentFilter(req.query);
    const { limit, offset } = page(req.query);
    const result = await transaction(pool, async client => {
      const count = await client.query(`SELECT count(*)::int AS total FROM shipments s
        JOIN tracking_numbers t ON t.shipment_id = s.id AND t.is_current ${where}`, parameters);
      const { rows } = await client.query(`${shipmentSelect} ${where} ORDER BY s.created_at DESC, s.id
        LIMIT $${parameters.length + 1} OFFSET $${parameters.length + 2}`, [...parameters, limit, offset]);
      return { shipments: rows.map(mapShipment), total: count.rows[0].total };
    }, true);
    res.json(result);
  });

  router.post('/shipments', editShipment, async (req, res) => {
    const prepared = prepareShipmentCreation(req.body);
    const shipment = await transaction(pool, async client => {
      await lockShipmentReferences(client);
      const created = await insertShipment(client, prepared, req.user.id, audit);
      return getShipment(client, created.id);
    });
    res.status(201).json({ shipment });
  });

  router.post('/shipments/bulk', editShipment, async (req, res) => {
    const importId = req.body?.importId;
    const rows = req.body?.shipments;
    if (typeof importId !== 'string' || !uuidPattern.test(importId)) {
      return res.status(400).json({ error: 'Provide a valid shipment import ID.' });
    }
    if (!Array.isArray(rows) || !rows.length || rows.length > maxBulkShipments) {
      return res.status(400).json({ error: `Include between 1 and ${maxBulkShipments} shipments.` });
    }

    const { rows: prepared, errors } = validateImportRows(rows, body => prepareShipmentCreation(body, true));
    if (errors.length) return res.status(400).json({ error: 'Correct the invalid shipment rows before importing.', errors });

    const actorId = req.user.id;
    const canonicalId = importId.toLowerCase();
    const hash = createHash('sha256').update(JSON.stringify(prepared)).digest('hex');
    const reserved = reserveBatchReferences(prepared);
    try {
      const result = await transaction(pool, async client => {
        // This lock also serializes retries against the original import, including across app instances.
        await lockShipmentReferences(client);
        const { rows: [previous] } = await client.query(`SELECT request_hash, receipts FROM shipment_imports
          WHERE actor_id=$1 AND import_id=$2`, [actorId, canonicalId]);
        if (previous) {
          if (previous.request_hash !== hash) fail(409, 'This import ID was already used for different shipment rows.');
          return { replayed: true, shipments: previous.receipts };
        }

        const shipments = [];
        for (const [index, record] of prepared.entries()) {
          try {
            const shipment = await insertShipment(client, record, actorId, audit, reserved);
            shipments.push({ row: index + 1, ...shipment });
          } catch (error) {
            if (error.expose) error.importRow = index + 1;
            throw error;
          }
        }
        await client.query(`INSERT INTO shipment_imports (actor_id, import_id, request_hash, receipts)
          VALUES ($1, $2, $3, $4::jsonb)`, [actorId, canonicalId, hash, JSON.stringify(shipments)]);
        await audit(client, { actorId, action: 'shipments.imported', targetType: 'shipment_import', targetId: canonicalId,
          metadata: { total: shipments.length } });
        return { replayed: false, shipments };
      });
      res.status(result.replayed ? 200 : 201).json({ importId: canonicalId, total: result.shipments.length, ...result });
    } catch (error) {
      if (!error.expose || !error.importRow) throw error;
      res.status(error.status).json({ error: 'The shipment import could not be saved.',
        errors: [{ row: error.importRow, message: error.message }] });
    }
  });

  router.get('/shipments/:id', async (req, res) => {
    res.json({ shipment: await getShipment(pool, id(req.params.id)) });
  });

  router.patch('/shipments/:id', editShipment, async (req, res) => {
    const shipmentId = id(req.params.id);
    const body = object(req.body, 'Shipment');
    const shipment = await transaction(pool, async client => {
      await lockShipment(client, shipmentId, body.version);
      const previous = await getShipment(client, shipmentId);
      if (Object.hasOwn(body, 'status') && body.status !== previous.status) {
        fail(400, 'Record a confirmed tracking event to change a shipment status.');
      }
      const draft = shipmentDraft({ ...previous, ...body,
        shipFrom: body.shipFrom === undefined ? previous.shipFrom : { ...previous.shipFrom, ...object(body.shipFrom, 'Ship from') },
        shipTo: body.shipTo === undefined ? previous.shipTo : { ...previous.shipTo, ...object(body.shipTo, 'Ship to') },
      });
      if (draft.bol !== previous.bol || draft.po !== previous.po) await lockShipmentReferences(client);
      const replacement = Object.hasOwn(body, 'pro') ? await replacePro(client, previous, body.pro) : null;
      await client.query(`UPDATE shipments SET service=$1, bol=$2, po=$3, reference=$4, pickup_date=$5,
        estimated_delivery_date=$6, pieces=$7, weight=$8, weight_unit=$9, trailer=$10, instructions=$11,
        share_names=$12, share_details=$13, version=version+1, updated_at=clock_timestamp() WHERE id=$14`,
      [...shipmentValues(draft), shipmentId]);
      await writeParty(client, shipmentId, 'ship_from', draft.shipFrom);
      await writeParty(client, shipmentId, 'ship_to', draft.shipTo);
      await audit(client, { actorId: req.user.id, action: 'shipment.updated', targetType: 'shipment', targetId: shipmentId,
        metadata: { fields: Object.keys(draft).filter(field => Object.hasOwn(body, field)), version: previous.version + 1 } });
      if (replacement) {
        await audit(client, { actorId: req.user.id, action: 'shipment.pro_changed', targetType: 'shipment', targetId: shipmentId,
          metadata: { previousPro: previous.pro, pro: replacement } });
      }
      return getShipment(client, shipmentId);
    });
    res.json({ shipment });
  });

  router.get('/shipments/:id/events', async (req, res) => {
    const shipmentId = id(req.params.id);
    const events = await transaction(pool, async client => {
      await getShipment(client, shipmentId);
      return (await shipmentEvents(client, [shipmentId])).map(mapEvent);
    }, true);
    res.json({ events });
  });

  router.post('/shipments/events/bulk', editShipment, async (req, res) => {
    const importId = req.body?.importId;
    const input = req.body?.events;
    if (typeof importId !== 'string' || !uuidPattern.test(importId)) {
      return res.status(400).json({ error: 'Provide a valid progress import ID.' });
    }
    if (!Array.isArray(input) || !input.length || input.length > maxBulkEvents) {
      return res.status(400).json({ error: `Include between 1 and ${maxBulkEvents} progress updates.` });
    }
    const { rows: prepared, errors } = validateImportRows(input, bulkEventDraft);
    if (errors.length) return res.status(400).json({ error: 'Correct the invalid progress rows before importing.', errors });

    const actorId = req.user.id;
    const canonicalId = importId.toLowerCase();
    const hash = createHash('sha256').update(JSON.stringify(prepared)).digest('hex');
    const result = await transaction(pool, async client => {
      await client.query('SELECT pg_advisory_xact_lock(725464303, hashtext($1))', [`${actorId}:${canonicalId}`]);
      const { rows: [previous] } = await client.query(`SELECT request_hash, receipts FROM shipment_event_imports
        WHERE actor_id=$1 AND import_id=$2`, [actorId, canonicalId]);
      if (previous) {
        if (previous.request_hash !== hash) fail(409, 'This import ID was already used for different progress rows.');
        return { replayed: true, events: await progressReceiptsWithCurrentTracking(client, previous.receipts) };
      }

      const matched = await resolveBulkEventTargets(client, prepared);
      if (matched.errors.length) return { errors: matched.errors };
      // Concurrent imports take overlapping shipment locks in one order, regardless of CSV row order.
      const { rows: locked } = await client.query(`SELECT id,status FROM shipments
        WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`, [matched.events.map(item => item.shipmentId)]);
      const shipments = new Map(locked.map(shipment => [shipment.id, shipment]));
      const events = [];
      for (const { row, pro, shipmentId, draft } of matched.events) {
        const shipment = shipments.get(shipmentId);
        if (!shipment) fail(409, 'A shipment changed. Review the progress updates before importing again.');
        const event = await insertTrackingEvent(client, shipment, draft, { actorId, audit, onConfirmedEvent });
        events.push({ row, pro, shipmentId, eventId: event.id, status: event.status });
      }

      await client.query(`INSERT INTO shipment_event_imports (actor_id, import_id, request_hash, receipts)
        VALUES ($1, $2, $3, $4::jsonb)`, [actorId, canonicalId, hash, JSON.stringify(events)]);
      await audit(client, { actorId, action: 'events.imported', targetType: 'shipment_event_import', targetId: canonicalId,
        metadata: { total: events.length } });
      return { replayed: false, events: await progressReceiptsWithCurrentTracking(client, events) };
    });
    if (result.errors) return res.status(400).json({ error: 'Correct the invalid progress rows before importing.', errors: result.errors });
    res.status(result.replayed ? 200 : 201).json({ importId: canonicalId, total: result.events.length, ...result });
  });

  function eventMutation(action) {
    return async (req, res) => {
      const shipmentId = id(req.params.id);
      const body = object(req.body, 'Tracking event');
      const eventId = action === 'created' ? null : id(req.params.eventId);
      const result = await transaction(pool, async client => {
        const shipment = await lockShipment(client, shipmentId, body.version);
        if (action === 'created') {
          const event = await insertTrackingEvent(client, shipment, eventDraft(body), { actorId: req.user.id, audit, onConfirmedEvent });
          return { event, shipment: await getShipment(client, shipmentId) };
        }
        const previous = await fetchEvent(client, shipmentId, eventId);
        let changed;
        if (action === 'deleted') {
          await client.query(`UPDATE tracking_events SET deleted_at=clock_timestamp(), updated_at=clock_timestamp()
            WHERE shipment_id=$1 AND id=$2`, [shipmentId, eventId]);
        } else {
          const merged = { ...previous, ...body };
          if (!Object.hasOwn(body, 'offset') && ['eventDate', 'eventTime', 'timeZone'].some(field => Object.hasOwn(body, field))) {
            delete merged.offset;
          }
          const draft = eventDraft(merged);
          const { rows } = await client.query(`UPDATE tracking_events SET status=$1, kind=$2, location=$3, city=$4,
            state=$5, country=$6, occurred_at=$7, event_date=$8, event_time=$9, time_zone=$10, utc_offset=$11,
            source=$12, trailer=$13, notes=$14, signed_by=$15, delivery_notes=$16, updated_at=clock_timestamp()
            WHERE shipment_id=$17 AND id=$18 RETURNING ${eventDateSelection}`, [...eventValues(draft), shipmentId, eventId]);
          changed = mapEvent(rows[0]);
        }
        const latest = await currentEvent(client, shipmentId);
        const nextStatus = latest?.status ?? 'created';
        await bumpShipment(client, shipmentId, nextStatus);
        const touched = changed ?? previous;
        await audit(client, { actorId: req.user.id, action: `event.${action}`, targetType: 'tracking_event', targetId: touched.id,
          metadata: { shipmentId, status: touched.status, kind: touched.kind, occurredAt: touched.occurredAt,
            previousStatus: previous?.status, previousKind: previous?.kind, previousOccurredAt: previous?.occurredAt } });
        return { event: changed ?? null, shipment: await getShipment(client, shipmentId) };
      });
      res.status(action === 'created' ? 201 : 200).json(result);
    };
  }

  router.post('/shipments/:id/events', editShipment, eventMutation('created'));
  router.patch('/shipments/:id/events/:eventId', adminOnly, eventMutation('updated'));
  router.delete('/shipments/:id/events/:eventId', adminOnly, eventMutation('deleted'));

  router.get('/customers', async (req, res) => {
    const query = text(req.query.q, 'Customer search', 100).toUpperCase();
    const { limit, offset } = page(req.query);
    const { rows, total } = await transaction(pool, async client => {
      const where = `(strpos(upper(concat_ws(' ', p.company, p.contact, p.city, p.email, t.pro_number)), $1) > 0 OR $1 = '')`;
      const count = await client.query(`SELECT count(*)::int AS total FROM shipment_parties p
        JOIN tracking_numbers t ON t.shipment_id = p.shipment_id AND t.is_current WHERE ${where}`, [query]);
      const result = await client.query(`SELECT p.*, t.pro_number FROM shipment_parties p
        JOIN tracking_numbers t ON t.shipment_id = p.shipment_id AND t.is_current WHERE ${where} ORDER BY p.company, p.shipment_id, p.kind
        LIMIT $2 OFFSET $3`, [query, limit, offset]);
      return { rows: result.rows, total: count.rows[0].total };
    }, true);
    const customers = rows.map(row => ({ shipmentId: row.shipment_id, pro: row.pro_number, kind: row.kind, ...mapParty(row) }));
    res.json({ customers, total });
  });

  router.get('/audit', adminOnly, async (req, res) => {
    const { limit, offset } = page(req.query);
    const { rows, total } = await transaction(pool, async client => {
      const count = await client.query('SELECT count(*)::int AS total FROM audit_logs');
      const result = await client.query(`SELECT log.*, u.email AS actor_email FROM audit_logs log
        LEFT JOIN users u ON u.id = log.actor_id ORDER BY log.created_at DESC, log.id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      return { rows: result.rows, total: count.rows[0].total };
    }, true);
    const entries = rows.map(row => ({ id: String(row.id), actorId: row.actor_id, actorEmail: row.actor_email,
      action: row.action, targetType: row.target_type, targetId: row.target_id, metadata: row.metadata, createdAt: row.created_at }));
    res.json({ entries, total });
  });

  router.get('/shipments/:id/documents', adminOnly, async (req, res) => {
    const shipmentId = id(req.params.id);
    const { rows } = await pool.query(`SELECT id, shipment_id, kind, name, octet_length(content) AS size, shareable,
      created_at, created_by FROM shipment_documents WHERE shipment_id=$1 ORDER BY created_at DESC, id`, [shipmentId]);
    if (!rows.length) await getShipment(pool, shipmentId);
    res.json({ documents: rows.map(mapDocument) });
  });

  router.post('/shipments/:id/documents', adminOnly, async (req, res) => {
    const shipmentId = id(req.params.id);
    const draft = documentDraft(req.body);
    const result = await transaction(pool, async client => {
      await lockShipment(client, shipmentId, req.body.version);
      const { rows: [row] } = await client.query(`INSERT INTO shipment_documents
        (shipment_id, kind, name, content, shareable, created_by) VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING id, shipment_id, kind, name, octet_length(content) AS size, shareable, created_at, created_by`,
      [shipmentId, draft.kind, draft.name, draft.content, draft.shareable, req.user.id]);
      await bumpShipment(client, shipmentId);
      await audit(client, { actorId: req.user.id, action: 'document.created', targetType: 'shipment_document',
        targetId: row.id, metadata: { shipmentId, kind: draft.kind, shareable: draft.shareable } });
      return { document: mapDocument(row), shipment: await getShipment(client, shipmentId) };
    });
    res.status(201).json(result);
  });

  router.get('/shipments/:id/documents/:documentId', adminOnly, async (req, res) => {
    const { rows: [row] } = await pool.query('SELECT name, content FROM shipment_documents WHERE shipment_id=$1 AND id=$2',
      [id(req.params.id), id(req.params.documentId)]);
    if (!row) fail(404, 'Document not found.');
    sendPdf(res, row);
  });

  router.delete('/shipments/:id/documents/:documentId', adminOnly, async (req, res) => {
    const shipmentId = id(req.params.id);
    const documentId = id(req.params.documentId);
    const body = object(req.body, 'Document');
    const shipment = await transaction(pool, async client => {
      await lockShipment(client, shipmentId, body.version);
      const removed = await client.query('DELETE FROM shipment_documents WHERE shipment_id=$1 AND id=$2 RETURNING kind, shareable',
        [shipmentId, documentId]);
      if (!removed.rowCount) fail(404, 'Document not found.');
      await bumpShipment(client, shipmentId);
      await audit(client, { actorId: req.user.id, action: 'document.deleted', targetType: 'shipment_document',
        targetId: documentId, metadata: { shipmentId, kind: removed.rows[0].kind, shareable: removed.rows[0].shareable } });
      return getShipment(client, shipmentId);
    });
    res.json({ document: null, shipment });
  });
}

function documentMac(key, documentId, expires) {
  return createHmac('sha256', key).update(`public-bol:${documentId}:${expires}`).digest('base64url');
}

function documentAccessUrl(key, documentId) {
  if (!key || !documentId) return null;
  const expires = Math.floor(Date.now() / 1000) + 300;
  return `/api/tracking/documents/${documentId}?ticket=${expires}.${documentMac(key, documentId, expires)}`;
}

function verifyDocumentAccess(key, documentId, ticket) {
  if (!key || typeof ticket !== 'string' || !/^\d{10}\.[A-Za-z0-9_-]{43}$/.test(ticket)) return false;
  const [expires, signature] = ticket.split('.');
  const remaining = Number(expires) - Math.floor(Date.now() / 1000);
  if (remaining <= 0 || remaining > 300) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(documentMac(key, documentId, expires)));
}

function publicParty(row, shareNames) {
  if (!row) return null;
  return { company: shareNames ? row.company : null, city: row.city, state: row.state, country: row.country };
}

function publicEvent(row, shareDetails) {
  return {
    status: row.status, kind: row.kind, location: [row.city, row.state].filter(Boolean).join(', '),
    city: row.city, state: row.state, country: row.country,
    eventDate: row.event_day, eventTime: row.event_hour, timeZone: row.time_zone,
    trailer: shareDetails ? row.trailer : null,
  };
}

function publicShipment(row, events, { verified, bolDocumentUrl }) {
  const confirmed = events.find(event => event.kind === 'confirmed');
  const delivery = confirmed?.status === 'delivered' ? {
    eventDate: confirmed.event_day, eventTime: confirmed.event_hour, timeZone: confirmed.time_zone,
    signedBy: verified && row.share_names && row.share_details ? confirmed.signed_by : null,
  } : null;
  return {
    pro: row.pro_number, status: row.status, service: row.service,
    pickupDate: row.pickup_day, estimatedDeliveryDate: row.delivery_day,
    pieces: row.pieces, weight: Number(row.weight), weightUnit: row.weight_unit,
    bol: row.share_details ? row.bol : null, po: row.share_details ? row.po : null,
    reference: row.share_details ? row.reference : null,
    shipFrom: publicParty(row.ship_from, row.share_names), shipTo: publicParty(row.ship_to, row.share_names),
    delivery, events: events.map(event => publicEvent(event, row.share_details)), bolDocumentUrl,
    canSubscribe: Boolean(row.ship_from?.email || row.ship_to?.email),
  };
}

async function referenceMatches(client, query) {
  if (typeof query.kind !== 'string' || !Object.hasOwn(referenceColumns, query.kind)) fail(400, 'Select a valid reference type.');
  const column = referenceColumns[query.kind];
  const number = text(query.number, 'Reference number', 100, true);
  const from = date(query.fromDate, 'Ship from date', true);
  const to = date(query.toDate, 'Ship to date', true);
  dateRange(from, to);
  const origin = postal(query.originZip, 'Origin postal code').replace(/[ -]/g, '');
  const destination = postal(query.destinationZip, 'Destination postal code').replace(/[ -]/g, '');
  const { rows } = await client.query(`${shipmentSelect}
    WHERE s.${column} <> '' AND upper(s.${column})=$1 AND s.pickup_date BETWEEN $2::date AND $3::date
    AND regexp_replace(upper(sender.postal_code), '[ -]', '', 'g')=$4
    AND regexp_replace(upper(recipient.postal_code), '[ -]', '', 'g')=$5
    ORDER BY s.pickup_date DESC, t.pro_number LIMIT 25`, [number.toUpperCase(), from, to, origin, destination]);
  return { rows, queries: [number] };
}

async function proMatches(client, query) {
  if (!Array.isArray(query.numbers) || !query.numbers.length || query.numbers.length > 25) {
    fail(400, 'Enter between 1 and 25 PRO numbers, one per line.');
  }
  const queries = [...new Set(query.numbers.map(searchPro))];
  const { rows: numbers } = await client.query(
    'SELECT pro_number, shipment_id FROM tracking_numbers WHERE pro_number=ANY($1::text[])',
    [queries],
  );
  const matches = new Map(numbers.map(number => [number.pro_number, number.shipment_id]));
  const shipmentIds = [...new Set(matches.values())];
  const { rows } = await client.query(`${shipmentSelect} WHERE s.id=ANY($1::uuid[])`, [shipmentIds]);
  return { rows, queries, matches };
}

async function publicResults(client, rows, verified, signDocumentKey) {
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const events = Map.groupBy(await shipmentEvents(client, ids, true), event => event.shipment_id);
  let documents = new Map();
  if (verified && signDocumentKey) {
    const result = await client.query(`SELECT DISTINCT ON (shipment_id) shipment_id, id FROM shipment_documents
      WHERE shipment_id=ANY($1::uuid[]) AND kind='bol' AND shareable
      ORDER BY shipment_id, created_at DESC, id DESC`, [ids]);
    documents = new Map(result.rows.map(document => [document.shipment_id, document.id]));
  }
  return rows.map(row => publicShipment(row, events.get(row.id) ?? [], { verified,
    bolDocumentUrl: documentAccessUrl(signDocumentKey, documents.get(row.id)) }));
}

function mountPublicTracking(router, { pool, signDocumentKey }) {
  router.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    next();
  });

  router.post('/search', async (req, res) => {
    const body = object(req.body, 'Tracking search');
    const mode = selection(body.mode, ['reference', 'pro'], 'tracking search type');
    const verified = mode === 'reference';
    const results = await transaction(pool, async client => {
      const { rows, queries, matches } = await (verified ? referenceMatches(client, body) : proMatches(client, body));
      const shipments = await publicResults(client, rows, verified, signDocumentKey);
      if (verified) return [{ query: queries[0], shipments }];
      const byId = new Map(rows.map((row, index) => [row.id, shipments[index]]));
      return queries.map(query => {
        const shipment = byId.get(matches.get(query));
        return { query, shipments: shipment ? [shipment] : [] };
      });
    }, true);
    res.json({ results });
  });

  router.get('/documents/:documentId', async (req, res) => {
    const documentId = id(req.params.documentId);
    if (!verifyDocumentAccess(signDocumentKey, documentId, req.query.ticket)) fail(404, 'Document not found.');
    const { rows: [row] } = await pool.query(`SELECT content FROM shipment_documents
      WHERE id=$1 AND kind='bol' AND shareable`, [documentId]);
    if (!row) fail(404, 'Document not found.');
    sendPdf(res, { ...row, name: 'bill-of-lading.pdf' });
  });
}

export function createShipmentRouters(options) {
  const admin = Router();
  const publicTracking = Router();
  mountAdmin(admin, options);
  mountPublicTracking(publicTracking, options);
  return { admin, publicTracking };
}
