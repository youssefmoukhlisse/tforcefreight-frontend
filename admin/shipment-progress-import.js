import {
  api, badge, bindForm, day, feedback, field, formFeedback, heading, html,
  section, statuses, table, textarea,
} from './ui.js';
import { maxShipmentCsvBytes, maxShipmentRows } from './shipment-csv.js';
import { parseShipmentProgressCsv, prepareShipmentProgress } from './shipment-progress-csv.js';
import { csvImportRetryId, decodeCsvFile } from './import-utils.js';

const progressStatuses = Object.entries(statuses).filter(([status]) => status !== 'created');
const payloadFields = [
  'pro', 'status', 'kind', 'eventDate', 'eventTime', 'timeZone', 'source', 'city', 'state',
  'country', 'location', 'offset', 'trailer', 'notes', 'signedBy', 'deliveryNotes',
];

function defaultStatus() {
  return `<div class="field">
    <label for="progress-status">Status</label>
    <select name="status" id="progress-status">
      <option value="">Use the status from the CSV</option>
      ${progressStatuses.map(([key, label]) => `<option value="${key}">${html(label)}</option>`).join('')}
    </select>
  </div>`;
}

function timeZoneField() {
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return field('timeZone', 'Event time zone', '', { placeholder: 'America/New_York', datalist: 'progress-time-zones', maxlength: 64 }) +
    `<datalist id="progress-time-zones"><option value="UTC"></option>${
      zones.map(zone => `<option value="${html(zone)}"></option>`).join('')
    }</datalist>`;
}

function uploadForm() {
  return `<form id="shipment-progress-form">
    ${section('Shipment CSV', `
      <div class="field progress-import-file">
        <label for="shipment-progress-file">Choose Shipment CSV</label>
        <input id="shipment-progress-file" name="csv" type="file" accept=".csv,text/csv" aria-describedby="shipment-progress-hint" required>
        <small id="shipment-progress-hint">Choose a UTF-8 CSV with up to ${maxShipmentRows} rows and a maximum size of 1 MB.</small>
      </div>`, {
      actions: '<a class="button secondary small-button" href="/admin/shipment-progress-template.csv" download>Download Update Template</a>',
      note: 'Upload the CSV you downloaded after creating shipments, or start with the update template.',
    })}
    ${section('Batch Event Details', `
      <div class="event-shortcuts actions" aria-label="Common tracking statuses">
        <button class="button danger small-button" type="button" data-progress-status="out_for_delivery" aria-pressed="false">Out for Delivery</button>
        <button class="button danger small-button" type="button" data-progress-status="delivery_attempt_failed" aria-pressed="false">Delivery Attempt Failed</button>
      </div>
      <div class="fields">
        ${defaultStatus()}
        ${field('eventDate', 'Event date', '', { type: 'date' })}
        ${field('eventTime', 'Local event time', '', { type: 'time' })}
        ${timeZoneField()}
        ${field('source', 'Event source', '', { maxlength: 160, placeholder: 'Dispatch, driver or service center' })}
        ${field('city', 'Event city', '', { maxlength: 100 })}
        ${field('state', 'Event state or province', '', { maxlength: 100, hint: 'Required for US or Canadian events.' })}
        ${field('country', 'Event country code', '', { maxlength: 2, placeholder: 'US or CA' })}
      </div>
      <details class="form-options">
        <summary>More event fields</summary>
        <div class="fields">
          ${field('location', 'Location name', '', { maxlength: 160 })}
          ${field('offset', 'UTC offset', '', { maxlength: 6, placeholder: '-04:00', hint: 'Use when the local clock repeats an event time.' })}
          ${field('trailer', 'Trailer number', '', { maxlength: 48 })}
          ${field('signedBy', 'Signed by', '', { maxlength: 160, hint: 'Required for Delivered events.' })}
          ${textarea('notes', 'Event notes')}
          ${textarea('deliveryNotes', 'Delivery notes')}
        </div>
      </details>`, {
      note: 'Fill values shared by the batch. Each populated event column in the CSV takes priority for its row.',
    })}
    <div class="form-actions">
      <button type="submit" class="button secondary">Preview Updates</button>
      <a class="button subtle" href="#events">All Tracking Events</a>
    </div>
    ${feedback}
  </form>`;
}

function issuesTable(rows) {
  return table(['CSV line', 'Issues to fix'], rows.map(row => [
    html(row.line), row.errors.map(html).join('<br>'),
  ]));
}

function previewMarkup(rows) {
  const invalid = rows.filter(row => row.errors.length);
  const cells = rows.map(({ line, event, errors }) => {
    const { eventDate, eventTime, timeZone, offset, location, city, state, country } = event || {};
    const eventTimeText = [eventTime, timeZone, offset].filter(Boolean).join(' ');
    const eventPlace = [city, state, country].filter(Boolean).join(', ');
    return [
      html(line),
      event?.pro ? `<span class="chip">${html(event.pro)}</span>` : '—',
      event?.status ? badge(event.status) : '—',
      html(day(eventDate)) + (eventTimeText ? `<small>${html(eventTimeText)}</small>` : ''),
      [location, eventPlace].filter(Boolean).map(html).join('<br>') || '—',
      html(event?.source || '—'),
      errors.length ? '<span class="badge danger">Needs a fix</span>' : '<span class="badge success">Ready</span>',
    ];
  });
  return section('Progress Preview', table(['CSV line', 'PRO number', 'Status', 'Event time', 'Location', 'Source', 'Validation'], cells) +
    (invalid.length ? `<p class="feedback error">Fix the listed rows in the CSV or change the batch values, then preview again.</p>${issuesTable(invalid)}` :
    `<form id="shipment-progress-confirm" class="shipment-import-confirm">
      <p class="muted-text">Save these confirmed events to the tracking history for the listed shipments.</p>
      <div class="form-actions"><button type="submit" class="button">Record ${rows.length} Tracking ${rows.length === 1 ? 'Event' : 'Events'}</button></div>
      ${feedback}
    </form>`), {
    note: `${rows.length - invalid.length} ready · ${invalid.length} with issues`,
  });
}

function showResults(output, rows, result) {
  const count = result.events.length;
  const noun = count === 1 ? 'tracking event' : 'tracking events';
  const message = result.replayed
    ? `Recovered the results for ${count} previously recorded ${noun}.`
    : `Recorded ${count} ${noun}.`;
  const results = result.events.map(({ pro, status, shipmentId }, index) => [
    html(rows[index].line),
    `<a href="#shipment/${encodeURIComponent(shipmentId)}/events"><span class="chip">${html(pro)}</span></a>`,
    badge(status),
  ]);
  output.innerHTML = section('Progress Updated', `
    <p class="feedback success" role="status">${message}</p>
    ${table(['CSV line', 'PRO number', 'Event recorded'], results)}
    <div class="form-actions"><a class="button secondary" href="#events">All Tracking Events</a></div>
  `);
}

function normalizedPayload(rows) {
  // Use a consistent key order while keeping CSV row order for matching receipts.
  return rows.map(({ event }) => Object.fromEntries(
    payloadFields.filter(key => event[key] !== undefined).map(key => [key, event[key]]),
  ));
}

export function renderShipmentProgressImport(container, context) {
  container.innerHTML = `<div class="shipment-import shipment-progress-import">
    ${heading('Update Shipment Progress by CSV', 'Record confirmed tracking events for several shipments in one batch.')}
    ${uploadForm()}
    <div id="shipment-progress-output" aria-live="polite"></div>
  </div>`;

  const form = container.querySelector('#shipment-progress-form');
  const output = container.querySelector('#shipment-progress-output');
  const status = form.elements.namedItem('status');
  let version = 0;

  function invalidatePreview() {
    version += 1;
    output.replaceChildren();
    formFeedback(form);
    form.querySelectorAll('[data-progress-status]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.progressStatus === status.value));
    });
  }
  form.addEventListener('input', invalidatePreview);
  form.addEventListener('change', invalidatePreview);
  form.querySelectorAll('[data-progress-status]').forEach(button => {
    button.addEventListener('click', () => {
      status.value = button.dataset.progressStatus;
      invalidatePreview();
      status.focus();
    });
  });

  bindForm(form, async values => {
    const revision = version;
    output.replaceChildren();
    let decoded;
    try {
      decoded = await decodeCsvFile(values.get('csv'), {
        maxBytes: maxShipmentCsvBytes,
        emptyMessage: 'Choose a CSV file with at least one PRO number.',
      });
    } catch (error) {
      if (context.active() && revision === version) throw error;
      return;
    }
    if (!context.active() || revision !== version) return;
    const defaults = Object.fromEntries(payloadFields.filter(key => values.has(key)).map(key => [key, values.get(key)]));
    const { rows } = prepareShipmentProgress(parseShipmentProgressCsv(decoded.text), defaults);
    if (!rows.length) throw new Error('The CSV must include at least one event row.');
    output.innerHTML = previewMarkup(rows);
    const confirm = output.querySelector('#shipment-progress-confirm');
    if (!confirm) return;

    const events = normalizedPayload(rows);
    bindForm(confirm, async () => {
      if (!context.active() || revision !== version) return;
      const button = confirm.querySelector('button[type="submit"]');
      const buttonText = button.textContent;
      const lockedControls = Array.from(form.elements).filter(element => 'disabled' in element && !element.disabled);
      lockedControls.forEach(element => { element.disabled = true; });
      button.textContent = 'Recording events…';
      confirm.setAttribute('aria-busy', 'true');
      try {
        const payload = new TextEncoder().encode(JSON.stringify(events));
        const importId = await csvImportRetryId('shipment-progress-csv-v1', context.user.id, payload);
        const result = await api('/api/admin/shipments/events/bulk', {
          method: 'POST', signal: AbortSignal.timeout(120_000), body: { importId, events },
        });
        if (!context.active()) return;
        if (!Array.isArray(result?.events) || result.events.length !== rows.length ||
            result.events.some((receipt, index) => receipt?.row !== index + 1 || !receipt.pro || !receipt.shipmentId || !receipt.status)) {
          throw new Error('The server returned incomplete event results. Submit the same event details again to recover them.');
        }
        showResults(output, rows, result);
      } catch (error) {
        if (!context.active()) return;
        if (!error.errors?.length) throw error;
        const issues = error.errors.map(issue => ({
          line: rows[Number(issue.row) - 1]?.line ?? issue.row,
          errors: [issue.message],
        }));
        output.innerHTML = section('Update Errors', `
          <p class="feedback error" role="status">${html(error.message)}</p>${issuesTable(issues)}
        `, { note: 'Fix the listed rows or batch values, then preview again.' });
      } finally {
        lockedControls.forEach(element => { element.disabled = false; });
        button.textContent = buttonText;
        confirm.removeAttribute('aria-busy');
      }
    });
  });
}
