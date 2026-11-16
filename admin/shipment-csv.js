import { readCsv, writeCsv } from './csv.js';

export const maxShipmentRows = 100;
export const maxShipmentCsvBytes = 1024 * 1024;

const normalized = value => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const columns = new Map();
for (const key of ['service', 'pieces', 'weight', 'weightUnit', 'reference', 'bol', 'po', 'trailer',
  'pickupDate', 'estimatedDeliveryDate', 'instructions']) {
  columns.set(normalized(key), key);
}
for (const [alias, key] of [
  ['serviceType', 'service'], ['pieceCount', 'pieces'], ['referenceNumber', 'reference'],
  ['bolNumber', 'bol'], ['billOfLading', 'bol'], ['poNumber', 'po'], ['trailerNumber', 'trailer'],
]) columns.set(normalized(alias), key);

const partyKeys = ['company', 'contact', 'address', 'city', 'state', 'postalCode', 'country', 'phone', 'email'];
for (const [side, prefixes] of [
  ['shipFrom', ['shipFrom', 'sender', 'origin', 'from']],
  ['shipTo', ['shipTo', 'recipient', 'destination', 'to']],
]) {
  for (const prefix of prefixes) {
    for (const key of partyKeys) columns.set(normalized(prefix + key), side + '.' + key);
    for (const alias of ['zip', 'zipCode', 'postal']) columns.set(normalized(prefix + alias), side + '.postalCode');
    columns.set(normalized(prefix + 'province'), side + '.state');
  }
}

const outputColumns = new Set(['pro', 'pronumber', 'internalpro', 'internalpronumber', 'trackingnumber', 'trackingurl', 'trackinglink']);
const requiredColumns = [
  ['pieces', 'pieces'], ['weight', 'weight'],
  ['shipFrom.city', 'ship_from_city'], ['shipFrom.postalCode', 'ship_from_postal_code'],
  ['shipTo.city', 'ship_to_city'], ['shipTo.postalCode', 'ship_to_postal_code'],
];

function resolveHeaders(headers) {
  const seen = new Set();
  const keys = headers.map(header => {
    if (!header.trim()) throw new Error('Every CSV column needs a heading.');
    const name = normalized(header);
    if (outputColumns.has(name)) {
      throw new Error('Use the original shipment CSV without PRO or tracking-link columns. These are added after import.');
    }
    const key = columns.get(name);
    const unique = key || header.trim().toLowerCase();
    if (seen.has(unique)) throw new Error(`The "${header}" column appears more than once.`);
    seen.add(unique);
    return key;
  });
  const missing = requiredColumns.filter(([key]) => !seen.has(key));
  if (missing.length) throw new Error(`Required columns are missing: ${missing.map(([, label]) => label).join(', ')}.`);
  return keys;
}

function dateError(value, label, errors) {
  if (!value) return;
  const date = new Date(value + 'T00:00:00Z');
  if (!/^(?:19\d{2}|20\d{2}|21\d{2})-\d{2}-\d{2}$/.test(value)
      || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value) {
    errors.push(`${label} must be a valid date in YYYY-MM-DD format.`);
  }
}

function shipmentParty(values, side, label, errors) {
  const party = Object.fromEntries(partyKeys.map(key => [key, values[side + '.' + key] || '']));
  party.country = (party.country || 'US').toUpperCase();
  party.postalCode = party.postalCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(party.country)) errors.push(`${label} country must be a two-letter code.`);
  if (!party.city) errors.push(`${label} city is required.`);
  if (['US', 'CA'].includes(party.country) && !party.state) errors.push(`${label} state or province is required.`);
  if (!/^[A-Z0-9][A-Z0-9 -]{0,14}[A-Z0-9]$/.test(party.postalCode)) errors.push(`${label} postal code is required and must be valid.`);
  if (party.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(party.email)) errors.push(`${label} email is invalid.`);
  return party;
}

function parseShipment(values, errors) {
  const { pieces = '', weight = '', pickupDate = '', estimatedDeliveryDate = '' } = values;
  const weightUnit = (values.weightUnit || 'lb').toLowerCase();
  if (!/^\d+$/.test(pieces) || Number(pieces) < 1 || Number(pieces) > 1000000) {
    errors.push('Pieces must be a whole number between 1 and 1,000,000.');
  }
  if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(weight) || Number(weight) <= 0) {
    errors.push('Weight must be positive with up to three decimal places.');
  }
  if (!['lb', 'kg'].includes(weightUnit)) errors.push('Weight unit must be lb or kg.');
  dateError(pickupDate, 'Pickup date', errors);
  dateError(estimatedDeliveryDate, 'Estimated delivery date', errors);
  if (pickupDate && estimatedDeliveryDate && pickupDate > estimatedDeliveryDate) {
    errors.push('Estimated delivery must be on or after pickup.');
  }
  return {
    service: values.service || 'LTL',
    pieces: Number(pieces), weight, weightUnit,
    reference: values.reference || '', bol: values.bol || '', po: values.po || '',
    pickupDate: pickupDate || null, estimatedDeliveryDate: estimatedDeliveryDate || null,
    trailer: values.trailer || '', instructions: values.instructions || '',
    shipFrom: shipmentParty(values, 'shipFrom', 'Sender', errors),
    shipTo: shipmentParty(values, 'shipTo', 'Recipient', errors),
  };
}

export function parseShipmentCsv(text) {
  const { delimiter, records: [header, ...data] } = readCsv(text, {
    maxRows: maxShipmentRows, rowLabel: 'shipment', trimFields: false,
  });
  if (!header || !data.length) throw new Error('Include the CSV headings and at least one shipment row.');
  const headers = header.cells;
  const keys = resolveHeaders(headers);
  const rows = data.map(({ cells: values, line }) => {
    const errors = [];
    if (values.length !== keys.length) errors.push(`Expected ${keys.length} columns and found ${values.length}.`);
    const fields = Object.fromEntries(keys.flatMap((key, index) => key ? [[key, values[index]?.trim() || '']] : []));
    return { line, values, shipment: parseShipment(fields, errors), errors };
  });
  return { headers, delimiter, rows };
}

export function shipmentTrackingLink(pro, origin = location.origin) {
  if (!/^[0-9]{9}$/.test(pro)) throw new Error('The server returned an invalid PRO number.');
  const link = new URL('/ltl/apps/Tracking', origin);
  link.hash = new URLSearchParams({ pro }).toString();
  return link.href;
}

export function exportShipmentCsv(parsed, shipments, origin = location.origin) {
  if (parsed.rows.length !== shipments.length || shipments.some((shipment, index) => shipment.row !== index + 1)) {
    throw new Error('The shipment results do not match the CSV. Retry the same import before downloading.');
  }
  return writeCsv([
    [...parsed.headers, 'pro_number', 'tracking_url'],
    ...parsed.rows.map(({ values }, index) => {
      const { pro } = shipments[index];
      return [...values, pro, shipmentTrackingLink(pro, origin)];
    }),
  ], parsed.delimiter);
}
