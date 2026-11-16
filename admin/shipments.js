import {
  api, badge, bindForm, checkbox, day, feedback, field, formFeedback, heading, html,
  instant, labelFor, section, statusOptions, table, textarea,
} from './ui.js';
import { customerImportPanel, mountCustomerImport } from './customer-import.js';
import { bindCustomerPickers, customerPicker } from './customer-picker.js';

const apiBase = '/api/admin';
const shipmentEditRoles = new Set(['admin', 'operator']);
const pageSize = 25;
const phaseTabs = [['summary', 'Overview'], ['events', 'Tracking Events'], ['documents', 'Documents']];

export function canEditShipment(user) {
  return shipmentEditRoles.has(user.role);
}

function shipmentHash(id, tab = 'summary', preset = '') {
  return `#shipment/${encodeURIComponent(id)}/${tab}${preset ? '/' + preset : ''}`;
}

function dataPath(id) {
  return `${apiBase}/shipments/${encodeURIComponent(id)}`;
}

function detailLink(shipment, tab = 'summary', label = shipment.pro) {
  return `<a href="${html(shipmentHash(shipment.id, tab))}">${html(label)}</a>`;
}

function queryParams(formData = {}, offset = 0) {
  const params = new URLSearchParams({ limit: pageSize, offset });
  for (const key of ['q', 'pro', 'status', 'from', 'to']) {
    if (formData[key]?.trim()) params.set(key, formData[key].trim());
  }
  return params;
}

function filterFields(values = {}) {
  return `<form class="filter">
    ${field('q', 'Search', values.q, { placeholder: 'PRO, BOL, PO or reference', maxlength: 100 })}
    <div class="field"><label for="filter-status">Status</label><select id="filter-status" name="status">${statusOptions(values.status, true)}</select></div>
    ${field('from', 'Created from (UTC)', values.from, { type: 'date' })}
    ${field('to', 'Created through (UTC)', values.to, { type: 'date' })}
    <button class="button secondary" type="submit">Filter</button>
    ${feedback}
  </form>`;
}

function trackingNumberSearch() {
  return `<form>
    <div class="filter compact-filter">
      ${field('pro', 'Tracking number (PRO)', '', { maxlength: 36, autocomplete: 'off', placeholder: 'Enter the full tracking number' })}
      <button class="button secondary" type="submit">Find Tracking Number</button>
    </div>
    <details class="form-options"><summary>More search filters</summary>
      <div class="fields two">
        ${field('q', 'Search by reference', '', { placeholder: 'PRO, BOL, PO or reference', maxlength: 100 })}
        <div class="field"><label for="filter-status">Status</label><select id="filter-status" name="status">${statusOptions('', true)}</select></div>
        ${field('from', 'Created from (UTC)', '', { type: 'date' })}
        ${field('to', 'Created through (UTC)', '', { type: 'date' })}
      </div>
    </details>
    ${feedback}
  </form>`;
}

function shipmentTable(shipments, tab = 'summary') {
  return table(['PRO Number', 'Status', 'Origin', 'Destination', 'Expected delivery', 'Updated'], shipments.map(shipment => [
    `<span class="chip">${detailLink(shipment, tab)}</span>`,
    badge(shipment.status),
    html([shipment.shipFrom?.city, shipment.shipFrom?.state].filter(Boolean).join(', ') || '—'),
    html([shipment.shipTo?.city, shipment.shipTo?.state].filter(Boolean).join(', ') || '—'),
    html(day(shipment.estimatedDeliveryDate)),
    html(instant(shipment.updatedAt)),
  ]), 'No shipments found.');
}

function trackingNumberTable(shipments, context) {
  const canEdit = canEditShipment(context.user);
  const headers = ['Internal PRO', 'Shipment status', 'Issued', 'Method'];
  if (canEdit) headers.push('Actions');
  return table(headers, shipments.map(shipment => [
    `<span class="chip">${detailLink(shipment)}</span>`,
    badge(shipment.status),
    html(instant(shipment.issuedAt)),
    html(labelFor(shipment.issuance)),
    ...(canEdit ? [`<div class="actions">
      <a class="button secondary small-button" href="${html(shipmentHash(shipment.id, 'number'))}" aria-label="Edit PRO ${html(shipment.pro)}">Edit PRO</a>
      <a class="button secondary small-button" href="${html(shipmentHash(shipment.id, 'events', 'new'))}" aria-label="Update progress for ${html(shipment.pro)}">Update Progress</a>
    </div>`] : []),
  ]), 'No tracking numbers found.');
}

function pageControls(total, offset, records) {
  const start = offset + 1;
  const end = Math.min(total, offset + pageSize);
  return total > pageSize ? `<div class="pagination">
    <span>Showing ${start}–${end} of ${total} ${records}</span>
    <div class="actions">
      <button type="button" class="button secondary small-button" data-page="${offset - pageSize}"${offset <= 0 ? ' disabled aria-disabled="true"' : ''}>Previous</button>
      <button type="button" class="button secondary small-button" data-page="${offset + pageSize}"${end >= total ? ' disabled aria-disabled="true"' : ''}>Next</button>
    </div>
  </div>` : '';
}

function bindPagination(container, load, onError) {
  container.querySelectorAll('[data-page]:enabled').forEach(button => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await load(Number(button.dataset.page));
      } catch (error) {
        onError(error);
      } finally {
        button.disabled = false;
      }
    });
  });
}

function statistics(stats) {
  const count = (...statuses) => statuses.reduce((sum, status) => sum + Number(stats.byStatus?.[status] || 0), 0);
  const cards = [
    ['Total Shipments', Number(stats.total || 0)],
    ['Pending', count('created', 'pickup_scheduled')],
    ['Picked Up', count('picked_up')],
    ['In Transit', count('in_transit', 'departed_service_center', 'delivery_appointment_scheduled')],
    ['At Service Center', count('arrived_at_service_center')],
    ['Out for Delivery', count('out_for_delivery'), 'delivery-alert'],
    ['Delivered', count('delivered'), 'delivered'],
    ['Exceptions', count('delivery_attempt_failed', 'delivery_exception', 'delayed'), 'exception'],
    ['Cancelled', count('cancelled')],
  ];
  return `<div class="summary-grid">${cards.map(([name, number, style = '']) => `<div class="stat ${style}">
    <small>${name}</small><strong>${number.toLocaleString('en-US')}</strong>
  </div>`).join('')}</div>`;
}

const listPages = {
  overview: ['Dashboard Overview', 'Shipment counts, delivery status and recent activity.', 'summary'],
  shipments: ['Shipments', 'Search, create and update shipments.', 'summary'],
  numbers: ['Tracking Numbers', 'Create a shipment or import a CSV to assign tracking numbers.', 'summary'],
  events: ['Tracking Events', 'Choose a shipment to see its movement history.', 'events'],
  documents: ['Shipment Documents', 'Choose a shipment to manage its BOL or delivery documents.', 'documents'],
};

export async function renderShipmentList(container, context, kind) {
  const [title, description, detailTab] = listPages[kind];
  let filterValues = {};
  let requestNumber = 0;
  const isOverview = kind === 'overview';
  const isNumbers = kind === 'numbers';
  const importLink = isNumbers || kind === 'shipments' ? '<a class="button secondary" href="#bulk">Import Shipment CSV</a>' : '';
  const actions = canEditShipment(context.user)
    ? `<a class="button" href="#new">${isNumbers ? 'Create Tracking Number' : 'Create Shipment'}</a>${importLink}` : '';
  container.innerHTML = heading(title, description, actions) +
    (isNumbers ? section('Find a Tracking Number', trackingNumberSearch()) : section('Filter Shipments', filterFields())) +
    '<div data-results role="status">Loading shipments…</div>';
  const results = container.querySelector('[data-results]');
  const filters = container.querySelector('form');

  async function load(offset = 0) {
    const thisRequest = ++requestNumber;
    const params = queryParams(filterValues, offset);
    const [list, stats] = await Promise.all([
      api(`${apiBase}/shipments?${params}`),
      isOverview ? api(`${apiBase}/stats?${params}`) : null,
    ]);
    if (thisRequest !== requestNumber || !context.active()) return;
    results.removeAttribute('role');
    const resultsTable = isNumbers ? trackingNumberTable(list.shipments, context) : shipmentTable(list.shipments, detailTab);
    const title = isOverview ? 'Recent Shipments' : isNumbers ? 'Issued Tracking Numbers' : 'Shipment Results';
    results.innerHTML = (stats ? statistics(stats) : '') + section(title,
      resultsTable + pageControls(Number(list.total), offset, isNumbers ? 'tracking numbers' : 'shipments'));
    bindPagination(results, load, error => formFeedback(filters, error.message));
  }

  bindForm(filters, async values => {
    filterValues = Object.fromEntries(values);
    if (filterValues.from && filterValues.to && filterValues.from > filterValues.to) {
      return formFeedback(filters, 'The end date must be on or after the start date.');
    }
    await load();
  });
  await load();
}

const partyFields = [
  ['company', 'Company name', { maxlength: 160 }],
  ['contact', 'Contact name', { maxlength: 160 }],
  ['address', 'Street address', { maxlength: 250 }],
  ['city', 'City', { required: true, maxlength: 100 }],
  ['state', 'State or province', { maxlength: 100, hint: 'Required for US and Canadian addresses.' }],
  ['postalCode', 'ZIP or postal code', { required: true, maxlength: 16 }],
  ['country', 'Country code', { required: true, maxlength: 2, hint: 'Two-letter ISO code, such as US or CA.' }],
  ['phone', 'Phone', { type: 'tel', maxlength: 48 }],
  ['email', 'Email', { type: 'email', maxlength: 254 }],
];
const serviceTypes = [
  ['LTL', 'Less than truckload (LTL)'],
  ['FTL', 'Full truckload (FTL)'],
  ['Expedited', 'Expedited'],
  ['Parcel', 'Parcel'],
];

function partyForm(prefix, values) {
  const party = values || {};
  return `${customerPicker(prefix)}<div class="fields two">${partyFields.map(([key, label, constraints]) => (
    field(prefix + '-' + key, label, party[key] ?? (key === 'country' ? 'US' : ''), constraints)
  )).join('')}</div>`;
}

function requireProvince(form, countryName, provinceName) {
  const country = form.elements.namedItem(countryName);
  const province = form.elements.namedItem(provinceName);
  function update() {
    province.required = ['US', 'CA'].includes(country.value.trim().toUpperCase());
  }
  country.addEventListener('input', update);
  update();
}

function partyValues(values, prefix) {
  const party = Object.fromEntries(partyFields.map(([key]) => [key, String(values.get(prefix + '-' + key) || '').trim()]));
  party.country = party.country.toUpperCase();
  return party;
}

function serviceTypeField(selected) {
  const options = [...serviceTypes];
  if (selected && !options.some(([value]) => value === selected)) options.unshift([selected, selected]);
  return `<div class="field">
    <label for="service">Service type <span aria-hidden="true">*</span></label>
    <select id="service" name="service" required>
      <option value="" disabled${selected ? '' : ' selected'}>Select a service type</option>
      ${options.map(([value, label]) => `<option value="${html(value)}"${selected === value ? ' selected' : ''}>${html(label)}</option>`).join('')}
    </select>
  </div>`;
}

function shipmentForm(shipment) {
  const item = shipment || {};
  const sharedNotes = [
    checkbox('shareNames', 'Show company names in public tracking', item.shareNames, 'Origin and destination city, state and country can appear on tracking results. Street addresses, individual contacts, email and phone are private.'),
    checkbox('shareDetails', 'Show selected shipment details in public tracking', item.shareDetails, 'Enable only for references and delivery details approved for sharing. Signature names are restricted to verified reference searches.'),
  ];
  const optional = `<div class="fields">
      ${shipment ? '' : field('pro', 'Internal PRO number', '', {
        inputmode: 'numeric', pattern: '[0-9]{9}', maxlength: 9, autocomplete: 'off',
        hint: 'Leave blank to assign a unique nine-digit number on save.',
      })}
      ${field('bol', 'Bill of lading number', item.bol, {
        maxlength: 100, hint: shipment ? '' : 'Leave blank to generate an 11-digit number on save.',
      })}
      ${field('po', 'PO number', item.po, {
        maxlength: 100, hint: shipment ? '' : 'Leave blank to generate a number like CA0122612345A on save.',
      })}
      ${field('reference', 'Reference number', item.reference, { maxlength: 100 })}
      ${field('trailer', 'Trailer number', item.trailer, { maxlength: 48 })}
      ${field('pickupDate', 'Pickup date', item.pickupDate?.slice(0, 10), { type: 'date' })}
      ${field('estimatedDeliveryDate', 'Estimated delivery date', item.estimatedDeliveryDate?.slice(0, 10), { type: 'date' })}
      ${textarea('instructions', 'Special instructions', item.instructions, 3, 3000)}
    </div>`;
  return `<form id="shipment-form">
    ${section('Shipment Information', `<div class="fields ${shipment ? '' : 'creation-fields'}">
      ${serviceTypeField(item.service || 'LTL')}
      ${field('pieces', 'Pieces', item.pieces, { required: true, type: 'number', min: 1, max: 1000000, step: 1 })}
      ${field('weight', 'Weight', item.weight, { required: true, type: 'number', min: .001, max: 999999999.999, step: .001 })}
      <div class="field"><label for="weightUnit">Weight unit</label><select id="weightUnit" name="weightUnit">
        <option value="lb"${item.weightUnit === 'lb' ? ' selected' : ''}>lb</option>
        <option value="kg"${item.weightUnit === 'kg' ? ' selected' : ''}>kg</option>
      </select></div>
    </div>${shipment ? `<div class="form-options">${optional}</div>`
      : `<details class="form-options"><summary>Custom PRO, references and dates</summary>${optional}</details>`}`)}
    <div class="panels-two">
      ${section('Ship From', partyForm('shipFrom', item.shipFrom))}
      ${section('Ship To', partyForm('shipTo', item.shipTo))}
    </div>
    ${section('Public Tracking', sharedNotes.join(''))}
    ${feedback}
    <div class="form-actions">
      <button class="button" type="submit">${shipment ? 'Save Shipment' : 'Create Shipment'}</button>
      <a class="button secondary" href="${shipment ? html(shipmentHash(shipment.id)) : '#shipments'}">Cancel</a>
    </div>
  </form>`;
}

function shipmentPayload(values, shipment) {
  const payload = {};
  for (const key of ['bol', 'po', 'reference', 'service', 'pickupDate', 'estimatedDeliveryDate', 'weightUnit', 'trailer', 'instructions']) {
    payload[key] = String(values.get(key) || '').trim();
  }
  if (!payload.pickupDate) payload.pickupDate = null;
  if (!payload.estimatedDeliveryDate) payload.estimatedDeliveryDate = null;
  payload.shipFrom = partyValues(values, 'shipFrom');
  payload.shipTo = partyValues(values, 'shipTo');
  payload.pieces = Number(values.get('pieces'));
  payload.weight = Number(values.get('weight'));
  payload.shareNames = values.has('shareNames');
  payload.shareDetails = values.has('shareDetails');
  if (shipment) payload.version = shipment.version;
  else if (values.get('pro')?.trim()) payload.pro = values.get('pro').trim();
  return payload;
}

function recordForm(container, context, shipment) {
  const form = container.querySelector('#shipment-form');
  for (const party of ['shipFrom', 'shipTo']) {
    requireProvince(form, party + '-country', party + '-state');
  }
  bindCustomerPickers(form);
  form.addEventListener('invalid', event => {
    const options = event.target.closest('details');
    if (options) options.open = true;
  }, true);
  bindForm(form, async values => {
    const body = shipmentPayload(values, shipment);
    if (body.pickupDate && body.estimatedDeliveryDate && body.estimatedDeliveryDate < body.pickupDate) {
      return formFeedback(form, 'Estimated delivery cannot be before pickup.');
    }
    const response = await api(shipment ? dataPath(shipment.id) : `${apiBase}/shipments`, {
      method: shipment ? 'PATCH' : 'POST',
      body,
    });
    if (!context.active()) return;
    context.notice(shipment ? 'Shipment saved.' : `Shipment created. PRO ${response.shipment.pro} is ready to share.`);
    context.go(shipmentHash(response.shipment.id));
  });
}

export function renderNewShipment(container, context) {
  container.innerHTML = heading('Create Shipment', 'A unique nine-digit PRO is assigned when you save. Choose saved customers to fill in sender and recipient details.') + shipmentForm();
  recordForm(container, context);
}

function facts(entries, className = '') {
  return `<dl class="description-list ${className}">${entries.map(([name, value]) => `<div><dt>${html(name)}</dt><dd>${html(value === '' || value === null || value === undefined ? '—' : value)}</dd></div>`).join('')}</dl>`;
}

function partyFacts(party) {
  const { company, contact, address, city, state, postalCode, country, phone, email } = party || {};
  return facts([
    ['Company', company], ['Contact', contact], ['Street address', address],
    ['City / State', [city, state].filter(Boolean).join(', ')], ['ZIP or postal code', postalCode],
    ['Country', country], ['Phone', phone], ['Email', email],
  ], 'address-list');
}

function summary(container, shipment, events, context) {
  const delivered = events.find(event => event.kind === 'confirmed' && event.status === 'delivered');
  const info = [
    ['Service type', shipment.service], ['Bill of lading number', shipment.bol], ['PO number', shipment.po],
    ['Reference', shipment.reference], ['Pieces', shipment.pieces], ['Weight', `${shipment.weight} ${shipment.weightUnit}`],
    ['Pickup date', day(shipment.pickupDate)], ['Estimated delivery', day(shipment.estimatedDeliveryDate)], ['Trailer', shipment.trailer],
    ['Special instructions', shipment.instructions], ['Public company names', shipment.shareNames ? 'Visible' : 'Hidden'],
    ['Public shipment details', shipment.shareDetails ? 'Visible' : 'Hidden'],
  ];
  const delivery = [
    ['Delivered on', day(delivered?.eventDate)],
    ['Delivered at', delivered ? `${delivered.eventTime} ${delivered.timeZone}` : '—'],
    ['Signed by', delivered?.signedBy], ['Delivery notes', delivered?.deliveryNotes],
  ];
  container.innerHTML = section('Shipment Information', facts(info)) + `<div class="panels-two">
    ${section('Ship From', partyFacts(shipment.shipFrom))}
    ${section('Ship To', partyFacts(shipment.shipTo))}
  </div>` + section('Delivery Information', facts(delivery), {
    note: 'Delivery details come from the latest confirmed delivery event.',
    actions: canEditShipment(context.user) ? `<a class="button secondary small-button" href="${html(shipmentHash(shipment.id, 'events'))}">Tracking Events</a>` : '',
  });
}

function eventActions(event, context) {
  if (context.user.role !== 'admin') return [];
  return [`<div class="actions">
    <button type="button" class="button secondary small-button" data-edit-event="${html(event.id)}">Edit</button>
    <button type="button" class="button danger small-button" data-delete-event="${html(event.id)}">Remove</button>
  </div>`];
}

function eventTable(events, context) {
  const headers = ['Status', 'When', 'Location', 'Source and notes', 'Trailer'];
  if (context.user.role === 'admin') headers.push('Actions');
  return table(headers, events.map(event => [
    badge(event.status) + (event.kind === 'expected' ? '<small>Expected</small>' : '<small>Confirmed</small>'),
    `${html(day(event.eventDate))}<small>${html(event.eventTime)} ${html(event.timeZone)} ${html(event.offset)}</small>`,
    html([event.location, event.city, event.state, event.country].filter(Boolean).join(', ') || '—'),
    `${html(event.source || '—')}${event.notes ? `<small>${html(event.notes)}</small>` : ''}${event.createdAt ?
      `<details class="metadata"><summary>Record information</summary><small>Recorded ${html(instant(event.createdAt))}</small>${event.createdBy ?
        `<small>Account <code>${html(event.createdBy)}</code></small>` : ''}</details>` : ''}`,
    html(event.trailer || '—'),
    ...eventActions(event, context),
  ]), 'No tracking events have been recorded.');
}

function eventForm(event = {}) {
  const timeZone = event.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const timeZones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return `<form id="event-form">
    <div class="fields">
      <div class="field"><label for="event-status">Status <span aria-hidden="true">*</span></label><select id="event-status" name="status">${statusOptions(event.status || 'picked_up')}</select></div>
      <div class="field"><label for="event-kind">Event certainty <span aria-hidden="true">*</span></label><select id="event-kind" name="kind">
        <option value="confirmed"${event.kind === 'confirmed' ? ' selected' : ''}>Confirmed</option>
        <option value="expected"${event.kind === 'expected' ? ' selected' : ''}>Expected</option>
      </select></div>
      ${field('source', 'Event source', event.source, { required: true, maxlength: 160, placeholder: 'Dispatch, driver, service center…' })}
      ${field('eventDate', 'Event date', event.eventDate?.slice(0, 10), { required: true, type: 'date' })}
      ${field('eventTime', 'Event time', event.eventTime?.slice(0, 5), { required: true, type: 'time' })}
      ${field('timeZone', 'Time zone', timeZone, { required: true, datalist: 'time-zones', placeholder: 'America/New_York', maxlength: 64 })}
      <datalist id="time-zones"><option value="UTC"></option>${timeZones.map(zone => `<option value="${html(zone)}"></option>`).join('')}</datalist>
      ${field('offset', 'UTC offset if ambiguous', event.offset, { maxlength: 6, placeholder: '-04:00', hint: 'Supply an offset if the local clock repeated this time.' })}
      ${field('location', 'Location name', event.location, { maxlength: 160 })}
      ${field('city', 'City', event.city, { required: true, maxlength: 100 })}
      ${field('state', 'State or province', event.state, { maxlength: 100, hint: 'Required for US and Canadian locations.' })}
      ${field('country', 'Country code', event.country || 'US', { required: true, maxlength: 2 })}
      ${field('trailer', 'Trailer number', event.trailer, { maxlength: 48 })}
      ${textarea('notes', 'Event notes', event.notes)}
      <div id="delivered-fields" class="fields field-wide two" hidden>
        ${field('signedBy', 'Signed by', event.signedBy, { required: true, maxlength: 160 })}
        ${textarea('deliveryNotes', 'Delivery notes', event.deliveryNotes)}
      </div>
    </div>
    ${feedback}
    <div class="form-actions">
      <button type="submit" class="button">${event.id ? 'Save Event' : 'Record Event'}</button>
      ${event.id ? '<button type="button" id="cancel-event-edit" class="button secondary">Cancel</button>' : ''}
    </div>
  </form>`;
}

function currentEventDraft() {
  const now = new Date();
  const part = number => String(number).padStart(2, '0');
  return {
    eventDate: `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())}`,
    eventTime: `${part(now.getHours())}:${part(now.getMinutes())}`,
  };
}

function eventsView(container, state, context, focusEditor) {
  const { shipment, events } = state;
  const formSection = (event = null) => section(event ? 'Edit Tracking Event' : 'Record a Tracking Event',
    (event ? '' : `<div class="event-shortcuts actions">
      <button type="button" class="button danger small-button" data-event-status="out_for_delivery">Out for Delivery</button>
      <button type="button" class="button danger small-button" data-event-status="delivery_attempt_failed">Delivery Attempt Failed</button>
    </div>`) + eventForm(event || currentEventDraft()), {
      note: 'Record a confirmed event to update public tracking, or choose Expected to plan a future event.',
    });
  container.innerHTML = (canEditShipment(context.user) ? `<div id="event-editor">${formSection()}</div>` : '') +
    section('Shipment Progress', eventTable(events, context) + '<div data-action-feedback class="feedback error" role="status" hidden></div>');
  if (!canEditShipment(context.user)) return;

  const editor = container.querySelector('#event-editor');
  function bindEditor(event = null) {
    const form = editor.querySelector('form');
    const status = form.elements.namedItem('status');
    const kind = form.elements.namedItem('kind');
    const deliveryFields = form.querySelector('#delivered-fields');
    const signer = form.elements.namedItem('signedBy');
    function updateDeliveredFields() {
      const delivered = status.value === 'delivered' && kind.value === 'confirmed';
      deliveryFields.hidden = !delivered;
      signer.disabled = !delivered;
    }
    editor.querySelectorAll('[data-event-status]').forEach(button => button.addEventListener('click', () => {
      status.value = button.dataset.eventStatus;
      kind.value = 'confirmed';
      updateDeliveredFields();
      status.focus();
    }));
    status.addEventListener('change', updateDeliveredFields);
    kind.addEventListener('change', updateDeliveredFields);
    updateDeliveredFields();
    requireProvince(form, 'country', 'state');
    if (event) {
      for (const key of ['eventDate', 'eventTime', 'timeZone']) {
        form.elements.namedItem(key).addEventListener('change', () => { form.elements.namedItem('offset').value = ''; });
      }
    }

    form.querySelector('#cancel-event-edit')?.addEventListener('click', () => {
      editor.innerHTML = formSection();
      bindEditor();
    });
    bindForm(form, async values => {
      const body = Object.fromEntries(values);
      body.version = shipment.version;
      body.country = body.country.trim().toUpperCase();
      if (body.status === 'delivered' && body.kind === 'expected') {
        return formFeedback(form, 'A Delivered event must be confirmed and include a signature name.');
      }
      if (body.status !== 'delivered' || body.kind !== 'confirmed') {
        delete body.signedBy;
        delete body.deliveryNotes;
      }
      const endpoint = `${dataPath(shipment.id)}/events${event ? '/' + encodeURIComponent(event.id) : ''}`;
      await api(endpoint, { method: event ? 'PATCH' : 'POST', body });
      if (!context.active()) return;
      context.notice(event ? 'Tracking event updated.' : 'Tracking event recorded.');
      await context.refresh();
    });
  }

  bindEditor();
  if (focusEditor) editor.querySelector('#event-status').focus();
  container.querySelectorAll('[data-edit-event]').forEach(button => {
    button.addEventListener('click', () => {
      const event = events.find(item => item.id === button.dataset.editEvent);
      if (!event) return;
      editor.innerHTML = formSection(event);
      bindEditor(event);
      editor.querySelector('select').focus();
    });
  });
  container.querySelectorAll('[data-delete-event]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Remove this tracking event? The audit log will retain the change.')) return;
      button.disabled = true;
      try {
        await api(`${dataPath(shipment.id)}/events/${encodeURIComponent(button.dataset.deleteEvent)}`, {
          method: 'DELETE', body: { version: shipment.version },
        });
        if (!context.active()) return;
        context.notice('Tracking event removed.');
        await context.refresh();
      } catch (error) {
        const feedback = container.querySelector('[data-action-feedback]');
        feedback.hidden = false;
        feedback.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  });
}

const documentKinds = { bol: 'Bill of Lading', pod: 'Proof of Delivery', other: 'Other' };

async function pdfBase64(file) {
  if (!file || file.size === 0) throw new Error('Select a PDF to upload.');
  if (file.size > 2 * 1024 * 1024) throw new Error('The PDF must be 2 MB or smaller.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new Error('The selected file is not a PDF.');
  const pieces = [];
  for (let offset = 0; offset < bytes.length; offset += 16 * 1024) {
    pieces.push(String.fromCharCode(...bytes.subarray(offset, offset + 16 * 1024)));
  }
  return btoa(pieces.join(''));
}

function documentsView(container, shipment, documents, context) {
  const base = `${dataPath(shipment.id)}/documents`;
  const rows = documents.map(document => [
    `<a href="${html(base + '/' + encodeURIComponent(document.id))}" download>${html(document.name)}</a>`,
    html(documentKinds[document.kind] || document.kind), document.shareable ? 'Redacted public BOL' : 'Private',
    html(instant(document.createdAt)),
    `<button type="button" class="button danger small-button" data-delete-document="${html(document.id)}">Remove</button>`,
  ]);
  container.innerHTML = section('Shipment Documents', table(['Document', 'Type', 'Visibility', 'Added', 'Actions'], rows, 'No documents have been attached.') +
    '<div data-action-feedback class="feedback error" role="status" hidden></div>') +
    section('Upload a PDF', `<form id="document-form">
      <div class="fields">
        <div class="field"><label for="kind">Document type</label><select id="kind" name="kind">
          ${Object.entries(documentKinds).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
        </select></div>
        ${field('name', 'Document title', '', { maxlength: 156, placeholder: 'Defaults to the PDF filename' })}
        <div class="field"><label for="pdf-file">PDF file <span aria-hidden="true">*</span></label><input type="file" name="pdf" id="pdf-file" accept="application/pdf,.pdf" required><small>Up to 2 MB.</small></div>
        ${checkbox('shareable', 'Share this redacted BOL with verified reference searches', false, 'Remove addresses, phone numbers, email addresses and signatures from the PDF first.')}
      </div>
      ${feedback}
      <div class="form-actions"><button type="submit" class="button">Upload Document</button></div>
    </form>`);
  const form = container.querySelector('#document-form');
  const kind = form.elements.namedItem('kind');
  const shareable = form.elements.namedItem('shareable');
  function syncShareable() {
    shareable.disabled = kind.value !== 'bol';
    if (shareable.disabled) shareable.checked = false;
  }
  kind.addEventListener('change', syncShareable);
  syncShareable();
  bindForm(form, async values => {
    const file = values.get('pdf');
    const contentBase64 = await pdfBase64(file);
    const title = values.get('name')?.trim() || file.name;
    const name = title.toLowerCase().endsWith('.pdf') ? title : title + '.pdf';
    await api(base, {
      method: 'POST',
      body: {
        kind: values.get('kind'), name,
        contentBase64, shareable: values.has('shareable'), version: shipment.version,
      },
    });
    if (!context.active()) return;
    context.notice('Document uploaded.');
    await context.refresh();
  });
  container.querySelectorAll('[data-delete-document]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Remove this PDF from the shipment?')) return;
      button.disabled = true;
      try {
        await api(base + '/' + encodeURIComponent(button.dataset.deleteDocument), {
          method: 'DELETE', body: { version: shipment.version },
        });
        if (!context.active()) return;
        context.notice('Document removed.');
        await context.refresh();
      } catch (error) {
        const result = container.querySelector('[data-action-feedback]');
        result.textContent = error.message;
        result.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  });
}

function editTrackingNumber(container, shipment, context) {
  container.innerHTML = section('Edit Tracking Number', `<form id="edit-pro-form">
    ${field('replacement-pro', 'New PRO number', /^[0-9]{9}$/.test(shipment.pro) ? shipment.pro : '', {
      required: true, maxlength: 9, inputmode: 'numeric', pattern: '[0-9]{9}', autocomplete: 'off',
      hint: 'Enter exactly nine digits. The previous number will still find this shipment.',
    })}
    ${feedback}
    <div class="form-actions">
      <button type="submit" class="button">Save PRO</button>
      <a class="button secondary" href="${html(shipmentHash(shipment.id))}">Cancel</a>
    </div>
  </form>`);
  const form = container.querySelector('form');
  bindForm(form, async values => {
    const pro = values.get('replacement-pro').trim();
    if (pro === shipment.pro) return formFeedback(form, 'This shipment already uses that PRO number.', false);
    const response = await api(dataPath(shipment.id), { method: 'PATCH', body: { version: shipment.version, pro } });
    if (!context.active()) return;
    context.notice(`Tracking number updated to ${response.shipment.pro}.`);
    context.go(shipmentHash(shipment.id));
  });
}

export async function renderShipment(container, context, id, tab, action) {
  const canViewDocuments = context.user.role === 'admin';
  const canEdit = canEditShipment(context.user);
  if (!['summary', 'events', 'documents', 'edit', 'number'].includes(tab)) tab = 'summary';
  if ((tab === 'documents' && !canViewDocuments) || (['edit', 'number'].includes(tab) && !canEdit)) tab = 'summary';
  const base = dataPath(id);
  const [shipmentResponse, eventResponse, documentResponse] = await Promise.all([
    api(base),
    ['summary', 'events'].includes(tab) ? api(base + '/events') : null,
    tab === 'documents' ? api(base + '/documents') : null,
  ]);
  if (!context.active()) return;
  const { shipment } = shipmentResponse;
  const tabs = phaseTabs.filter(([key]) => key !== 'documents' || canViewDocuments);
  const details = `<nav class="detail-nav" aria-label="Shipment sections">
    ${tabs.map(([key, label]) => `<a href="${html(shipmentHash(shipment.id, key))}"${tab === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
  </nav>`;
  const actions = `${badge(shipment.status)}${tab === 'summary' ? `<button type="button" class="button secondary" data-copy-pro>Copy PRO</button>
    ${canEdit ? `<a class="button secondary" href="${html(shipmentHash(shipment.id, 'number'))}">Edit PRO</a>
      <a class="button" href="${html(shipmentHash(shipment.id, 'events', 'new'))}">Update Progress</a>` : ''}` : ''}
    ${canEdit && tab !== 'edit' && tab !== 'number'
    ? `<a class="button secondary" href="${html(shipmentHash(shipment.id, 'edit'))}">Edit Shipment</a>` : ''}`;
  const back = tab === 'number' ? '<a href="#numbers" class="back">← Tracking Numbers</a>' : '<a href="#shipments" class="back">← All Shipments</a>';
  container.innerHTML = back + heading(tab === 'edit' ? `Edit ${shipment.pro}` : shipment.pro, 'Internal PRO number', actions) +
    (tab === 'summary' ? '<p data-copy-result role="status" hidden></p>' : '') + details + '<div data-phase></div>';
  container.querySelector('[data-copy-pro]')?.addEventListener('click', async () => {
    const result = container.querySelector('[data-copy-result]');
    const title = container.querySelector('h1');
    try {
      await navigator.clipboard.writeText(shipment.pro);
      result.textContent = 'PRO copied.';
    } catch {
      if (!title.isConnected) return;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(title);
      selection.removeAllRanges();
      selection.addRange(range);
      result.textContent = 'PRO selected. Copy it using your device’s Copy command.';
    }
    result.hidden = false;
  });
  const phase = container.querySelector('[data-phase]');
  if (tab === 'summary') summary(phase, shipment, eventResponse.events, context);
  if (tab === 'events') eventsView(phase, { shipment, events: eventResponse.events }, context, action === 'new');
  if (tab === 'documents') documentsView(phase, shipment, documentResponse.documents, context);
  if (tab === 'number') editTrackingNumber(phase, shipment, context);
  if (tab === 'edit') {
    phase.innerHTML = shipmentForm(shipment);
    recordForm(phase, context, shipment);
  }
}

export async function renderCustomers(container, context) {
  function contactsPanel({ title, id, label, placeholder }) {
    return section(title, `<form class="filter compact-filter">
      ${field(id + '-query', label, '', { placeholder, maxlength: 100 })}
      <button type="submit" class="button secondary">Search</button>${feedback}
    </form><div data-customer-results role="status">Loading contacts…</div>`, { id });
  }
  const directory = { title: 'Customer Directory', id: 'directory', label: 'Search directory', placeholder: 'Company, contact, email or city' };
  const shipmentContacts = { title: 'Shipment Contacts', id: 'shipment-contacts', label: 'Search contacts', placeholder: 'Company, contact, email, city or PRO' };
  container.innerHTML = heading('Customers', 'Manage your customer directory and find sender or recipient details from saved shipments.') +
    (canEditShipment(context.user) ? customerImportPanel() : '') + contactsPanel(directory) + contactsPanel(shipmentContacts);

  function bindContactList({ id }, imported) {
    const panel = container.querySelector('#' + id);
    const form = panel.querySelector('form');
    const results = panel.querySelector('[data-customer-results]');
    const path = apiBase + (imported ? '/customers/imported' : '/customers');
    let query = '';
    let requestNumber = 0;

    async function load(offset = 0) {
      const thisRequest = ++requestNumber;
      const params = new URLSearchParams({ q: query, limit: pageSize, offset });
      const { customers, total } = await api(`${path}?${params}`);
      if (!context.active() || thisRequest !== requestNumber) return;
      results.removeAttribute('role');
      results.classList.remove('feedback', 'error');
      const headers = imported
        ? ['Company', 'Contact', 'Address', 'Contact information']
        : ['Company', 'Contact', 'Role', 'Location', 'Contact information', 'Shipment'];
      const rows = customers.map(customer => {
        const company = html(customer.company || '—');
        const contact = html(customer.contact || '—');
        const location = [customer.city, customer.state, customer.postalCode, customer.country].filter(Boolean).join(', ');
        const information = [customer.email, customer.phone].filter(Boolean).map(html).join('<br>') || '—';
        if (imported) {
          const address = [customer.address, location].filter(Boolean).map(html).join('<br>') || '—';
          return [company, contact, address, information];
        }
        const role = customer.kind === 'ship_from' ? 'Sender' : 'Recipient';
        return [company, contact, role, html(location), information, detailLink({ id: customer.shipmentId, pro: customer.pro })];
      });
      const empty = imported ? 'No directory customers found.' : 'No shipment contacts found.';
      results.innerHTML = table(headers, rows, empty) + pageControls(Number(total), offset, 'contacts');
      bindPagination(results, load, error => formFeedback(form, error.message));
    }
    bindForm(form, async values => {
      query = String(values.get(id + '-query') || '').trim();
      await load();
    });
    return load;
  }

  const loadDirectory = bindContactList(directory, true);
  const loadShipmentContacts = bindContactList(shipmentContacts, false);
  if (canEditShipment(context.user)) mountCustomerImport(container, context, loadDirectory);
  const results = await Promise.allSettled([loadDirectory(), loadShipmentContacts()]);
  if (!context.active()) return;
  for (const [index, result] of results.entries()) {
    if (result.status !== 'rejected') continue;
    const id = index === 0 ? directory.id : shipmentContacts.id;
    const region = container.querySelector('#' + id + ' [data-customer-results]');
    region.textContent = result.reason.message || 'Could not load contacts. Use Search to retry.';
    region.className = 'feedback error';
  }
}

export async function renderAudit(container, context) {
  container.innerHTML = heading('Activity Logs', 'Recorded changes to shipments, events and administrative accounts.') +
    section('Audit History', '<div data-audit-feedback class="feedback error" role="status" hidden></div><div data-audit-results role="status">Loading activity…</div>');
  const results = container.querySelector('[data-audit-results]');
  const resultMessage = container.querySelector('[data-audit-feedback]');
  let requestNumber = 0;
  async function load(offset = 0) {
    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({ limit: pageSize, offset });
    const { entries, total } = await api(`${apiBase}/audit?${params}`);
    if (!context.active() || thisRequest !== requestNumber) return;
    const rows = entries.map(entry => {
      const metadata = entry.metadata && Object.keys(entry.metadata).length
        ? `<details class="metadata"><summary>View details</summary><pre>${html(JSON.stringify(entry.metadata, null, 2))}</pre></details>`
        : '—';
      return [
        html(instant(entry.createdAt)), html(entry.actorEmail || '—'), html(labelFor(entry.action)),
        `${html(labelFor(entry.targetType))}${entry.targetId ? `<small><code>${html(entry.targetId)}</code></small>` : ''}`, metadata,
      ];
    });
    resultMessage.hidden = true;
    results.removeAttribute('role');
    results.innerHTML = table(['Date and time', 'Actor', 'Action', 'Record', 'Details'], rows, 'No activity has been logged.') +
      pageControls(Number(total), offset, 'log entries');
    bindPagination(results, load, error => {
      resultMessage.textContent = error.message;
      resultMessage.hidden = false;
    });
  }
  await load();
}
