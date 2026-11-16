'use strict';

const get = (id) => document.getElementById(id);
const form = get('track-form');
const results = get('tracking-results');
const notice = get('search-status');
const output = get('track-output');
const loading = get('track-loading');
const trackButton = get('track-submit');
const dialog = get('update-dialog');
const updateForm = get('update-form');
const updateRecipients = get('update-recipients');
const addRecipientButton = get('add-update-recipient');
const sendUpdatesButton = get('send-updates');
const maxUpdateRecipients = 6;
let config = { notificationsEnabled: false };
let currentRequest;
let subscribePro;
let recipientSequence = 0;
let updatesRequest;

const steps = {
  created: ['Shipment Created', 'A shipment record has been created.', 10, 'pending'],
  pickup_scheduled: ['Pickup Scheduled', 'A pickup has been scheduled.', 15, 'pending'],
  picked_up: ['Picked Up', 'The shipment has been picked up.', 25],
  arrived_at_service_center: ['At Service Center', 'The shipment has arrived at a service center.', 45],
  departed_service_center: ['Departed Service Center', 'The shipment has left a service center.', 55],
  in_transit: ['In Transit', 'The shipment is in transit.', 60],
  delivery_appointment_scheduled: ['Delivery Appointment Scheduled', 'A delivery appointment has been scheduled.', 70],
  out_for_delivery: ['Out for Delivery', 'The shipment is out for delivery.', 87],
  delivered: ['Delivered', 'Shipment has been delivered to the consignee.', 100, 'delivered'],
  delivery_exception: ['Delivery Exception', 'An issue is affecting delivery.', 55, 'exception'],
  delayed: ['Delayed', 'The shipment has been delayed.', 55, 'exception'],
  cancelled: ['Cancelled', 'The shipment has been cancelled.', 0, 'cancelled'],
};
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusInfo = (status) => steps[String(status).toLowerCase()] || ['Pending', 'No confirmed movement has been recorded.', 0, 'pending'];
const visible = (value) => value == null || value === '' ? '—' : escapeHtml(value);
const date = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return match ? `${Number(match[2])}/${Number(match[3])}/${match[1]}` : '—';
};
const time = (value) => {
  const match = /^(\d{2}):(\d{2})/.exec(value || '');
  if (!match) return '—';
  const hour = Number(match[1]);
  return `${String(hour % 12 || 12).padStart(2, '0')}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
};
const locationText = (location) => [location?.city, location?.state, location?.country].filter(Boolean).join(', ');
const eventActivities = {
  picked_up: 'Shipment has been picked up.',
  arrived_at_service_center: 'Shipment has arrived at a service center.',
  departed_service_center: 'Departure',
  delivered: 'Shipment has been delivered to the consignee.',
};
function eventLocalTime(event) {
  const [clock, meridiem] = time(event.eventTime).split(' ');
  const localTime = `<span class="event-clock">${clock}</span>${meridiem ? ` ${meridiem}` : ''}`;
  const timezone = escapeHtml(event.timeZone);
  return timezone
    ? `<span title="${timezone}">${localTime}<span class="sr-only"> ${timezone}</span></span>`
    : localTime;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.body ? 'POST' : 'GET',
    credentials: 'same-origin', cache: 'no-store', signal: options.signal,
    headers: options.body ? { 'Content-Type': 'application/json', 'Accept': 'application/json' } : { 'Accept': 'application/json' },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Tracking is temporarily unavailable. Please try again.');
  return data;
}

function shipParty(label, party) {
  const company = party?.company || party?.companyName;
  const location = [party?.city, party?.state, party?.country].filter(Boolean).join(' ').toUpperCase();
  return `<section class="party"><h3>${label}</h3>${company ? `<p>${escapeHtml(company)}</p>` : ''}<p>${location ? escapeHtml(location) : 'Not shared'}</p></section>`;
}

function historyTable(events = []) {
  if (!events.length) return '<p class="empty-events">No shipment events have been recorded.</p>';
  return `<div class="progress-table" role="region" aria-label="Shipment progress table" tabindex="0">
    <table><caption class="sr-only">Shipment progress</caption><colgroup><col><col><col><col><col></colgroup>
      <thead><tr><th scope="col">Location</th><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Activity</th><th scope="col">Trailer</th></tr></thead>
      <tbody>${events.map(event => {
        const [label] = statusInfo(event.status);
        return `<tr><td>${visible(event.location || locationText(event))}</td><td>${date(event.eventDate)}</td><td>${eventLocalTime(event)}</td>
          <td>${event.kind === 'expected' ? '<strong>Expected: </strong>' : ''}${escapeHtml((eventActivities[event.status] || label).toUpperCase())}</td><td>${visible(event.trailer)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function renderShipment(shipment, id) {
  const [label, description, step, statusClass = ''] = statusInfo(shipment.status);
  const delivery = shipment.delivery || {};
  const isDelivered = statusClass === 'delivered';
  const pair = (name, value) => `<div><dt>${name}</dt><dd>${value}</dd></div>`;
  let bol = visible(shipment.bol);
  if (typeof shipment.bolDocumentUrl === 'string' && /^\/api\/tracking\/(?:documents?|bol)\//.test(shipment.bolDocumentUrl)) {
    bol = `<a referrerpolicy="no-referrer" href="${escapeHtml(shipment.bolDocumentUrl)}">${shipment.bol ? escapeHtml(shipment.bol) : 'Download BOL'}</a>`;
  }
  const weight = shipment.weight != null ? `${escapeHtml(shipment.weight)} ${escapeHtml(shipment.weightUnit || '')}` : '—';
  return `<details class="shipment" open>
    <summary><span>${visible(shipment.pro)}</span><span class="headline-status ${statusClass}">${label}</span></summary>
    <div class="shipment-body">
      <section class="summary-panel" aria-labelledby="status-${id}">
        <div class="status-line">
          <div class="status-title"><h3 id="status-${id}">${label}</h3><details class="status-help">
            <summary aria-label="About ${label}">?</summary>
            <p>${description}</p>
          </details></div>
          <p>${description}</p>
        </div>
        <div class="progress-rail"><progress class="progress-bar" max="100" value="${step}" aria-label="Shipment progress"></progress>${isDelivered ? '<span class="progress-check" aria-hidden="true"></span>' : ''}</div>
        <dl class="summary-data">
          ${isDelivered ? pair('Delivered On', date(delivery.eventDate)) + pair('Delivered At', eventLocalTime(delivery)) + pair('Signed By', visible(delivery.signedBy)) : pair('Pickup Date', date(shipment.pickupDate)) + pair('Expected Delivery', date(shipment.estimatedDeliveryDate)) + pair('Current Status', label)}
          ${pair('Service', visible(shipment.service))}
        </dl>
        <div class="summary-actions">
          <button class="primary" type="button" data-updates="${escapeHtml(shipment.pro)}" data-eligible="${Boolean(shipment.canSubscribe)}" data-delivered="${isDelivered}">Send Updates</button>
          <button class="text-link" type="button" data-details-toggle="${id}" aria-controls="details-${id}" aria-expanded="false">Show Details +</button>
        </div>
      </section>
      <aside class="parties" aria-label="Shipment parties">${shipParty('Ship To', shipment.shipTo)}${shipParty('Ship From', shipment.shipFrom)}</aside>
      <div class="shipment-details" id="details-${id}" hidden>
        <section class="progress-panel" aria-labelledby="progress-${id}"><h3 class="panel-title" id="progress-${id}" tabindex="-1">Shipment Progress</h3>
          ${historyTable(shipment.events)}
          <div class="hide-row"><button class="text-link" type="button" data-hide-details="${id}" aria-controls="details-${id}">Hide Details −</button></div>
        </section>
        <section class="details-panel" aria-labelledby="fields-${id}"><h3 class="panel-title" id="fields-${id}">Shipment Details</h3><dl>
          ${pair('Bill of Lading', bol)}${pair('PO Number', visible(shipment.po))}
          ${pair('Pieces', visible(shipment.pieces))}${pair('Weight', weight)}
          ${shipment.reference ? pair('Reference Number', visible(shipment.reference)) : ''}
        </dl></section>
      </div>
    </div>
  </details>`;
}

function renderGroups(groups) {
  results.innerHTML = groups.map(({query, shipments = []}, groupIndex) => shipments.length
    ? `<details class="result-group" open><summary>PRO(S) RELATED TO ${escapeHtml(query)}</summary><div class="result-list">${shipments.map((ship, index) => renderShipment(ship, `${groupIndex}-${index}`)).join('')}</div></details>`
    : `<p class="result-message">No shipment records found for <strong>${escapeHtml(query)}</strong>. Check the number and search details.</p>`).join('');
  if (groups.some(group => group.shipments?.length)) {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    results.insertAdjacentHTML('beforeend', `<p class="results-timestamp">Tracking results displayed <time datetime="${now.toISOString()}">${escapeHtml(timestamp)}</time></p>`);
  }
}

function showError(message) {
  get('search-error').textContent = message;
  get('search-error').hidden = !message;
}

function setSearching(searching) {
  loading.hidden = !searching;
  trackButton.disabled = searching;
  output.setAttribute('aria-busy', String(searching));
}

function searchPayload() {
  const fields = new FormData(form);
  if (fields.get('mode') === 'pro') {
    const numbers = get('track-numbers').value.split(/\r?\n/).map(line => line.trim().toUpperCase()).filter(Boolean);
    if (!numbers.length) throw new Error('Enter at least one internal PRO number.');
    if (numbers.length > 25) throw new Error('Enter up to 25 PRO numbers, one per line.');
    if (numbers.some(number => !/^(?:[0-9]{9}|INT-[A-Z0-9][A-Z0-9-]{3,31})$/.test(number))) {
      throw new Error('Enter a 9-digit internal PRO number or a previously issued INT- number.');
    }
    return { mode: 'pro', numbers: [...new Set(numbers)] };
  }
  const input = Object.fromEntries(['kind','number','fromDate','toDate','originZip','destinationZip'].map(key => [key, fields.get(key).trim()]));
  if (!Object.values(input).every(Boolean)) throw new Error('Enter the reference number, both dates, and both postal codes.');
  if (input.fromDate > input.toDate) throw new Error('The ship from date must be on or before the ship to date.');
  return { mode: 'reference', ...input };
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (currentRequest) return;
  showError('');
  results.replaceChildren();
  notice.textContent = '';
  let body;
  try { body = searchPayload(); }
  catch (error) { showError(error.message); return; }
  const request = currentRequest = new AbortController();
  setSearching(true);
  notice.textContent = 'Searching shipment records.';
  try {
    // Let the loading state stay visible even when the lookup responds quickly.
    const [response] = await Promise.allSettled([
      api('/api/tracking/search', { body, signal: request.signal }),
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
    if (currentRequest !== request) return;
    if (response.status === 'rejected') throw response.reason;
    const data = response.value;
    renderGroups(data.results || []);
    const count = (data.results || []).reduce((sum, group) => sum + group.shipments.length, 0);
    notice.textContent = count ? `${count} shipment record${count === 1 ? '' : 's'} found.` : 'No shipment records found.';
  } catch (error) {
    if (error.name !== 'AbortError' && currentRequest === request) { showError(error.message); notice.textContent = ''; }
  } finally {
    if (currentRequest === request) {
      currentRequest = null;
      setSearching(false);
    }
  }
});

function syncMode() {
  get('pro-fields').hidden = !get('mode-pro').checked;
  get('reference-fields').hidden = get('mode-pro').checked;
  showError('');
}

function clearResults() {
  currentRequest?.abort();
  currentRequest = null;
  setSearching(false);
  results.replaceChildren();
  notice.textContent = '';
}

form.querySelector('.track-switch').addEventListener('change', () => { syncMode(); clearResults(); });
form.addEventListener('reset', () => {
  clearResults();
  // The native reset applies its default values after dispatching the reset event.
  setTimeout(syncMode, 0);
});

results.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const id = button.dataset.detailsToggle || button.dataset.hideDetails;
  if (id) {
    const details = get('details-' + id);
    const open = !('hideDetails' in button.dataset) && details.hidden;
    const show = results.querySelector(`[data-details-toggle="${id}"]`);
    details.hidden = !open;
    show.setAttribute('aria-expanded', String(open));
    show.hidden = open;
    if (open) get('progress-' + id).focus({ preventScroll: true });
    else show.focus();
  }
  if ('updates' in button.dataset) openUpdates(button);
});

function addUpdateRecipient() {
  const count = updateRecipients.children.length;
  if (count >= maxUpdateRecipients) return;
  const row = get('update-recipient-template').content.firstElementChild.cloneNode(true);
  const input = row.querySelector('input');
  input.id = 'update-recipient-' + ++recipientSequence;
  row.querySelector('label').htmlFor = input.id;
  row.querySelector('[data-remove-recipient]').hidden = count === 0;
  updateRecipients.append(row);
  addRecipientButton.disabled = count + 1 >= maxUpdateRecipients;
  if (count) input.focus();
}

function updateFeedback(message) {
  const feedback = get('update-message');
  feedback.textContent = message;
  feedback.hidden = !message;
}

function openUpdates(button) {
  updatesRequest?.abort();
  updatesRequest = undefined;
  subscribePro = button.dataset.updates;
  updateForm.reset();
  updateRecipients.replaceChildren();
  recipientSequence = 0;
  addUpdateRecipient();
  const delivered = button.dataset.delivered === 'true';
  for (const option of updateForm.querySelectorAll('[data-future-event]')) option.hidden = delivered;
  updateForm.querySelector('[value="current_status"]').disabled = delivered;
  get('update-pro').textContent = subscribePro;
  get('update-characters').textContent = '(Up to 150 characters)';
  get('update-complete').hidden = true;
  updateForm.hidden = false;
  const available = config.notificationsEnabled && button.dataset.eligible === 'true';
  sendUpdatesButton.disabled = !available;
  updateFeedback(available ? '' : 'Email updates are currently unavailable for this shipment.');
  dialog.showModal();
  get('close-updates').focus({ preventScroll: true });
  dialog.scrollTop = 0;
}

addRecipientButton.addEventListener('click', addUpdateRecipient);
updateRecipients.addEventListener('click', event => {
  const action = event.target.closest('[data-reset-recipient], [data-remove-recipient]');
  if (!action) return;
  const row = action.closest('.update-recipient');
  if ('removeRecipient' in action.dataset) {
    row.remove();
    addRecipientButton.disabled = false;
    addRecipientButton.focus();
  } else {
    const input = row.querySelector('input');
    input.value = '';
    input.focus();
  }
});
get('update-personal').addEventListener('input', event => {
  get('update-characters').textContent = `(${event.target.maxLength - event.target.value.length} characters left)`;
});
for (const id of ['close-updates', 'cancel-updates', 'done-updates']) {
  get(id).addEventListener('click', () => dialog.close());
}
dialog.addEventListener('close', () => {
  if (!dialog.open) updatesRequest?.abort();
});
updateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (sendUpdatesButton.disabled || !subscribePro) return;
  const events = [...updateForm.querySelectorAll('[name="event"]:checked')].map(option => option.value);
  if (!events.length) {
    updateFeedback('Please select an option to send updates.');
    return;
  }
  const fields = new FormData(updateForm);
  const emails = fields.getAll('recipient').map(email => email.trim());
  if (new Set(emails.map(email => email.toLowerCase())).size !== emails.length) {
    updateFeedback('Enter each recipient email address once.');
    return;
  }
  const request = new AbortController();
  updatesRequest = request;
  sendUpdatesButton.disabled = true;
  updateFeedback('');
  try {
    const data = await api('/api/tracking/subscriptions', { signal: request.signal, body: {
      pro: subscribePro, emails, events, personalMessage: fields.get('personalMessage').trim(),
      senderEmail: fields.get('senderEmail').trim(),
    } });
    if (!dialog.open || updatesRequest !== request) return;
    updateForm.hidden = true;
    get('update-complete').hidden = false;
    get('update-complete-message').textContent = data.message;
    get('done-updates').focus();
  } catch (error) {
    if (error.name !== 'AbortError' && dialog.open && updatesRequest === request) updateFeedback(error.message);
  } finally {
    if (updatesRequest === request) {
      updatesRequest = undefined;
      sendUpdatesButton.disabled = false;
    }
  }
});

api('/api/config').then(data => {
  config = data;
  get('environment-badge').hidden = data.environment !== 'staging';
}).catch(() => {});

try {
  const previousNumber = sessionStorage.getItem('independent-tracking-search');
  sessionStorage.removeItem('independent-tracking-search');
  if (previousNumber) { get('track-numbers').value = previousNumber; form.requestSubmit(); }
} catch {}
