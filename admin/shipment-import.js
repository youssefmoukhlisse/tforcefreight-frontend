import { api, bindForm, feedback, formFeedback, heading, html, section, table } from './ui.js';
import { exportShipmentCsv, maxShipmentCsvBytes, maxShipmentRows, parseShipmentCsv } from './shipment-csv.js';
import { csvImportRetryId, decodeCsvFile, downloadCsv } from './import-utils.js';

const numberFormat = new Intl.NumberFormat('en-US');

function nameFor(count) {
  return count === 1 ? 'shipment' : 'shipments';
}

function partyLabel(party) {
  if (!party) return '—';
  const locality = [party.city, party.state, party.postalCode].filter(Boolean).join(', ');
  return [party.company || party.contact, locality].filter(Boolean).map(html).join('<br>') || '—';
}

function issuesTable(issues) {
  return table(['CSV line', 'Issues to fix'], issues.map(issue => [
    html(issue.line),
    issue.errors.map(html).join('<br>'),
  ]));
}

function rowPreview(parsed) {
  const { rows } = parsed;
  const invalid = rows.filter(row => row.errors.length);
  const ready = rows.length - invalid.length;
  const previewCells = rows.map(({ line, shipment, errors }) => [
    html(line),
    partyLabel(shipment?.shipFrom),
    partyLabel(shipment?.shipTo),
    html(shipment?.service || '—'),
    [shipment?.bol, shipment?.po, shipment?.reference].filter(Boolean).map(html).join('<br>') || '—',
    errors.length ? '<span class="badge danger">Needs a fix</span>' : '<span class="badge success">Ready</span>',
  ]);
  const rowsTable = table(['CSV line', 'Ship from', 'Ship to', 'Service', 'References', 'Validation'], previewCells);
  const cannotSubmit = `<p class="feedback error">Correct these rows and choose the updated file. No shipments have been created.</p>${issuesTable(invalid)}`;
  const confirm = `<form id="shipment-import-confirm" class="shipment-import-confirm">
    <button class="button" type="submit">Create ${rows.length} ${rows.length === 1 ? 'Shipment' : 'Shipments'}</button>
    ${feedback}
  </form>`;
  return section('Import Preview', rowsTable + (invalid.length ? cannotSubmit : confirm), {
    note: `${numberFormat.format(ready)} ready · ${numberFormat.format(invalid.length)} with issues`,
  });
}

function reportCreated(container, { parsed, filename, result, contents }) {
  const count = result.shipments.length;
  const summary = result.replayed
    ? `Recovered the results for ${count} previously created ${nameFor(count)}.`
    : `Created ${count} ${nameFor(count)} and assigned their PRO numbers.`;
  const rows = result.shipments.map(({ id, pro }, index) => [
    html(parsed.rows[index].line),
    `<a href="#shipment/${encodeURIComponent(id)}/summary"><span class="chip">${html(pro)}</span></a>`,
  ]);
  container.innerHTML = section('Shipments Created', `
    <p class="feedback success" role="status">${summary}</p>
    <div class="form-actions">
      <button type="button" id="shipment-import-download" class="button">Download CSV with Tracking</button>
      <a class="button secondary" href="#shipments">View Shipments</a>
    </div>
    <div id="shipment-import-download-error" class="feedback error" role="status" hidden></div>
    ${table(['CSV line', 'PRO number'], rows)}
  `, { note: 'The download contains the source columns, PRO numbers and tracking links.' });
  container.querySelector('#shipment-import-download').addEventListener('click', () => {
    const error = container.querySelector('#shipment-import-download-error');
    error.hidden = true;
    try {
      downloadCsv(contents, filename.replace(/\.csv$/i, '') + '-with-tracking.csv');
    } catch {
      error.textContent = 'The CSV download could not be prepared. The shipments are saved. Retry the download.';
      error.hidden = false;
    }
  });
  container.querySelector('#shipment-import-download').focus();
}

export function renderShipmentImport(container, context) {
  container.innerHTML = `<div class="shipment-import">
    ${heading('Import Shipments', 'Create shipments in a batch and download a PRO number and tracking link for every row.',
      '<a class="button secondary" href="#shipments">All Shipments</a>')}
    ${section('Upload Shipment CSV', `
      <form id="shipment-import-form" class="shipment-import-picker">
        <div class="field">
          <label for="shipment-import-file">Shipment CSV</label>
          <input id="shipment-import-file" type="file" name="csv" accept=".csv,text/csv" aria-describedby="shipment-import-hint" required>
          <small id="shipment-import-hint">Choose a UTF-8 file with up to ${maxShipmentRows} shipments. Maximum file size is 1 MB.</small>
        </div>
        <button type="submit" class="button secondary">Preview CSV</button>
        ${feedback}
      </form>
      <p class="muted-text">Each row receives a unique PRO number. Extra columns are kept in the download.</p>`, {
      actions: '<a class="button secondary small-button" href="/admin/shipment-import-template.csv" download>Download CSV Template</a>',
    })}
    <div id="shipment-import-output" aria-live="polite"></div>
  </div>`;

  const form = container.querySelector('#shipment-import-form');
  const output = container.querySelector('#shipment-import-output');
  const input = form.elements.namedItem('csv');
  const preview = form.querySelector('button[type="submit"]');
  let selectionVersion = 0;

  input.addEventListener('change', () => {
    selectionVersion += 1;
    output.replaceChildren();
    formFeedback(form);
  });

  bindForm(form, async values => {
    const version = selectionVersion;
    output.replaceChildren();
    const file = values.get('csv');
    let source;
    try {
      source = await decodeCsvFile(file, {
        maxBytes: maxShipmentCsvBytes,
        emptyMessage: 'Choose a CSV file with at least one shipment.',
      });
    } catch (error) {
      if (context.active() && version === selectionVersion) throw error;
      return;
    }
    if (!context.active() || version !== selectionVersion) return;
    const parsed = parseShipmentCsv(source.text);
    if (!parsed.rows.length) throw new Error('The CSV must contain at least one shipment.');
    output.innerHTML = rowPreview(parsed);
    const confirm = output.querySelector('#shipment-import-confirm');
    if (!confirm) return;

    bindForm(confirm, async () => {
      if (!context.active() || version !== selectionVersion) return;
      const button = confirm.querySelector('button[type="submit"]');
      const buttonText = button.textContent;
      input.disabled = true;
      preview.disabled = true;
      button.textContent = 'Creating shipments…';
      confirm.setAttribute('aria-busy', 'true');
      try {
        const importId = await csvImportRetryId('shipment-csv-import-v1', context.user.id, source.bytes);
        const result = await api('/api/admin/shipments/bulk', {
          method: 'POST',
          signal: AbortSignal.timeout(120_000),
          body: { importId, shipments: parsed.rows.map(row => row.shipment) },
        });
        if (!context.active()) return;
        if (!Array.isArray(result?.shipments) || result.shipments.length !== parsed.rows.length ||
            result.shipments.some(shipment => !shipment?.id || !shipment?.pro)) {
          throw new Error('The server returned incomplete import results. Submit the same file again to recover them.');
        }
        const contents = exportShipmentCsv(parsed, result.shipments, location.origin);
        reportCreated(output, { parsed, filename: file.name, result, contents });
        form.reset();
      } catch (error) {
        if (!context.active()) return;
        if (!error.errors?.length) throw error;
        const issues = error.errors.map(issue => ({
          line: parsed.rows[Number(issue.row) - 1]?.line ?? issue.row,
          errors: [issue.message],
        }));
        output.innerHTML = section('Import Errors', `
          <p class="feedback error" role="status">${html(error.message)}</p>
          ${issuesTable(issues)}
        `, { note: 'Fix the listed rows in your CSV, then preview the updated file.' });
      } finally {
        input.disabled = false;
        preview.disabled = false;
        button.textContent = buttonText;
        confirm.removeAttribute('aria-busy');
      }
    });
  });
}
