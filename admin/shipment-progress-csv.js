import { readCsv } from './csv.js';
import { maxShipmentRows } from './shipment-csv.js';
import { statuses } from './ui.js';

const normalized = value => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const proColumns = new Set(['pro', 'pronumber', 'internalpro', 'internalpronumber', 'trackingnumber']);
const proPattern = /^(?:[0-9]{9}|INT-[A-Z0-9][A-Z0-9-]{3,31})$/;
const fields = [
  'status', 'eventDate', 'eventTime', 'timeZone', 'offset', 'source', 'location', 'city',
  'state', 'country', 'trailer', 'notes', 'signedBy', 'deliveryNotes',
];
const rowColumns = new Map([
  ['eventstatus', 'status'], ['eventdate', 'eventDate'], ['eventtime', 'eventTime'],
  ['eventtimezone', 'timeZone'], ['eventutcoffset', 'offset'], ['eventoffset', 'offset'],
  ['eventsource', 'source'], ['eventlocation', 'location'], ['eventcity', 'city'],
  ['eventstate', 'state'], ['eventprovince', 'state'], ['eventcountry', 'country'],
  ['eventtrailer', 'trailer'], ['eventnotes', 'notes'], ['eventsignedby', 'signedBy'],
  ['eventdeliverynotes', 'deliveryNotes'],
]);
const progressStatuses = new Map(Object.entries(statuses)
  .filter(([status]) => status !== 'created')
  .flatMap(([status, label]) => [[normalized(status), status], [normalized(label), status]]));

export function parseShipmentProgressCsv(raw) {
  const { records: [header, ...data] } = readCsv(raw, { maxRows: maxShipmentRows, rowLabel: 'tracking update' });
  if (!header || !data.length) throw new Error('Include the CSV headings and at least one PRO number.');
  const seen = new Set();
  const keys = header.cells.map(column => {
    const name = normalized(column);
    const key = proColumns.has(name) ? 'pro' : rowColumns.get(name);
    if (!key) return null;
    if (seen.has(key)) throw new Error(`The "${column}" column appears more than once.`);
    seen.add(key);
    return key;
  });
  if (!seen.has('pro')) throw new Error('Include a pro_number column. It is already in the exported shipment CSV.');

  const previous = new Map();
  const rows = data.map(({ cells, line }) => {
    const errors = [];
    if (cells.length !== keys.length) errors.push(`Expected ${keys.length} columns and found ${cells.length}.`);
    const { pro: input = '', ...overrides } = Object.fromEntries(
      keys.flatMap((key, index) => key && cells[index] ? [[key, cells[index]]] : []),
    );
    const pro = input.toUpperCase();
    if (!proPattern.test(pro)) errors.push('Enter a nine-digit PRO number or a previously issued INT- number.');
    else if (previous.has(pro)) errors.push(`This PRO already appears on CSV line ${previous.get(pro)}.`);
    else previous.set(pro, line);
    return { line, pro, overrides, errors };
  });
  return { rows };
}

function validateTiming(event, errors) {
  const date = new Date(event.eventDate + 'T00:00:00Z');
  if (!/^(?:19\d{2}|20\d{2}|21\d{2})-\d{2}-\d{2}$/.test(event.eventDate)
      || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== event.eventDate) {
    errors.push('Enter the event date in YYYY-MM-DD format.');
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(event.eventTime)) errors.push('Enter the event time in 24-hour HH:MM format.');
  try {
    if (!/^(?:UTC|[A-Za-z][A-Za-z_+\-\d]+(?:\/[A-Za-z_+\-\d]+)+)$/.test(event.timeZone)) throw new RangeError();
    new Intl.DateTimeFormat('en-US', { timeZone: event.timeZone });
  } catch {
    errors.push('Enter an IANA time zone, such as America/New_York or UTC.');
  }
  if (event.offset && !/^[+-]\d{2}:[0-5]\d$/.test(event.offset)) errors.push('Use a UTC offset such as -04:00.');
}

export function prepareShipmentProgress(parsed, defaults = {}) {
  const rows = parsed.rows.map(({ line, pro, overrides, errors: sourceErrors }) => {
    const errors = [...sourceErrors];
    const event = {
      pro, kind: 'confirmed',
      ...Object.fromEntries(fields.map(key => [key, String(overrides[key] || defaults[key] || '').trim()])),
    };
    event.status = progressStatuses.get(normalized(event.status)) || '';
    event.country = event.country.toUpperCase();
    event.offset = event.offset.replace(/^'(?=[+-]\d{2}:\d{2}$)/, '');
    if (!event.status) errors.push('Choose a tracking status.');
    if (!event.source) errors.push('Enter the event source.');
    if (!event.city) errors.push('Enter the event city.');
    if (!/^[A-Z]{2}$/.test(event.country)) errors.push('Enter a two-letter event country code.');
    if (['US', 'CA'].includes(event.country) && !event.state) errors.push('Enter the event state or province.');
    if (event.status === 'delivered' && !event.signedBy) errors.push('Enter the signer for a Delivered event.');
    if (event.status !== 'delivered') {
      delete event.signedBy;
      delete event.deliveryNotes;
    }
    validateTiming(event, errors);
    return { line, event, errors };
  });
  return { rows };
}
