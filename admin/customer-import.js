import { api, bindForm, feedback, formFeedback, html, section, table } from './ui.js';
import { readCsv } from './csv.js';

const maxBytes = 1024 * 1024;
const maxRows = 500;
const previewRows = 25;
const columns = {
  company: { label: 'Company', length: 160 },
  contact: { label: 'Contact', length: 160 },
  address: { label: 'Street address', length: 250 },
  city: { label: 'City', length: 100 },
  state: { label: 'State or province', length: 100 },
  postalCode: { label: 'Postal code', length: 16 },
  country: { label: 'Country', length: 2 },
  phone: { label: 'Phone', length: 48 },
  email: { label: 'Email', length: 254 },
};
const columnKeys = Object.keys(columns);
const headerAliases = new Map(Object.entries({
  company: 'company',
  companyname: 'company',
  business: 'company',
  contact: 'contact',
  contactname: 'contact',
  name: 'contact',
  fullname: 'contact',
  address: 'address',
  street: 'address',
  streetaddress: 'address',
  address1: 'address',
  city: 'city',
  state: 'state',
  province: 'state',
  stateprovince: 'state',
  postalcode: 'postalCode',
  zip: 'postalCode',
  zipcode: 'postalCode',
  country: 'country',
  countrycode: 'country',
  phone: 'phone',
  phonenumber: 'phone',
  email: 'email',
  emailaddress: 'email',
}));

function resolveColumns(header) {
  const keys = [];
  for (const label of header) {
    const name = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const key = headerAliases.get(name);
    if (!key) {
      if (!name) throw new Error('A CSV column has no heading. Delete the empty column or use the template.');
      throw new Error(`Unknown column "${label.slice(0, 80)}". Use the columns from the CSV template.`);
    }
    if (keys.includes(key)) throw new Error(`The "${columns[key].label}" column appears more than once.`);
    keys.push(key);
  }
  if (!keys.includes('company') && !keys.includes('contact')) {
    throw new Error('Include a company or contact column.');
  }
  return keys;
}

function customerErrors(customer) {
  const errors = [];
  if (!customer.company && !customer.contact) errors.push('Enter a company or contact name.');
  for (const key of columnKeys) {
    if (customer[key].length > columns[key].length) {
      errors.push(`${columns[key].label} must be ${columns[key].length} characters or fewer.`);
    }
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(customer[key])) {
      errors.push(`${columns[key].label} contains unsupported characters.`);
    }
  }
  if (customer.country && !/^[a-z]{2}$/i.test(customer.country)) errors.push('Use a two-letter country code, such as US or CA.');
  if (customer.email && !/^[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+$/.test(customer.email)) {
    errors.push('Enter a valid email address.');
  }
  if (customer.postalCode && !/^[A-Z\d][A-Z\d -]{0,14}[A-Z\d]$/i.test(customer.postalCode)) errors.push('Enter a valid postal code.');
  return errors;
}

export function parseCustomerCsv(raw) {
  const { records: [header, ...records] } = readCsv(raw, { maxRows, rowLabel: 'customer' });
  if (!header) throw new Error('The CSV is empty. Include the template headers and at least one customer.');
  const keys = resolveColumns(header.cells);
  if (!records.length) throw new Error('The CSV has column headings but no customer records.');
  return records.map(({ cells, line }, index) => {
    const defaults = Object.fromEntries(columnKeys.map(key => [key, '']));
    const customer = Object.assign(defaults, Object.fromEntries(keys.map((key, column) => [key, cells[column] ?? ''])));
    customer.country = customer.country.toUpperCase();
    customer.email = customer.email.toLowerCase();
    customer.postalCode = customer.postalCode.toUpperCase();
    const errors = customerErrors(customer);
    if (cells.length !== keys.length) errors.unshift(`Expected ${keys.length} fields and found ${cells.length}.`);
    return { row: index + 1, line, customer, errors };
  });
}

async function readCustomerFile(file) {
  if (!(file instanceof File) || !file.size) throw new Error('Choose a CSV file to preview.');
  if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Choose a file with a .csv extension.');
  if (file.size > maxBytes) throw new Error('Choose a CSV file no larger than 1 MB.');
  let contents;
  try {
    contents = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error('The file could not be read as UTF-8. Save it as CSV UTF-8 and try again.');
  }
  return parseCustomerCsv(contents);
}

export function customerImportPanel() {
  return section('Import Customers', `<div class="actions">
    <a class="button secondary small-button" href="/admin/customer-import-template.csv" download>Download CSV Template</a>
    <a class="button subtle small-button" href="/admin/customer-import-example.csv" download>Download Example</a>
  </div>
  <form id="customer-import-form" class="form-actions">
    <div class="field">
      <label for="customer-import-file">Customer CSV</label>
      <input id="customer-import-file" name="csv" type="file" accept=".csv,text/csv" aria-describedby="customer-import-hint" required>
      <small id="customer-import-hint">Use a UTF-8 CSV with up to 500 customers and a file size of 1 MB or less.</small>
    </div>
    <button type="submit" class="button secondary">Preview CSV</button>
    ${feedback}
  </form>
  <div id="customer-import-preview" aria-live="polite"></div>`, {
    note: 'Review the rows before saving customers to your directory.',
  });
}

function issueTable(records) {
  return table(['CSV line', 'Issues to fix'], records.map(record => [
    html(record.line),
    record.errors.map(html).join('<br>'),
  ]));
}

function previewMarkup(records) {
  const invalid = records.filter(record => record.errors.length);
  const valid = records.length - invalid.length;
  const rows = records.slice(0, previewRows).map(({ line, customer, errors }) => [
    html(line), html(customer.company || '—'), html(customer.contact || '—'),
    [customer.email, customer.phone].filter(Boolean).map(html).join('<br>') || '—',
    [customer.address, [customer.city, customer.state, customer.postalCode, customer.country].filter(Boolean).join(', ')]
      .filter(Boolean).map(html).join('<br>') || '—',
    errors.length ? '<span class="badge danger">Needs a fix</span>' : '<span class="badge success">Ready</span>',
  ]);
  return `<div class="form-actions"><h3>Import Preview</h3></div>
  <p class="muted-text">${valid} ready · ${invalid.length} with issues${records.length > previewRows ? ` · showing the first ${previewRows} rows` : ''}</p>
  ${table(['CSV line', 'Company', 'Contact', 'Email and phone', 'Address', 'Validation'], rows)}
  ${invalid.length ? `<p class="feedback error">Correct the listed fields in your CSV, then preview the new file.</p>
    ${issueTable(invalid)}` : `<form id="customer-import-confirm">
    <p class="muted-text">Matching customers are skipped. Existing contact details are preserved.</p>
    <div class="form-actions"><button type="submit" class="button">Import ${records.length} ${records.length === 1 ? 'Customer' : 'Customers'}</button></div>
    ${feedback}
  </form>`}`;
}

export function mountCustomerImport(container, context, onImported) {
  const form = container.querySelector('#customer-import-form');
  const output = container.querySelector('#customer-import-preview');
  const input = form.elements.namedItem('csv');
  let fileVersion = 0;
  let saving = false;

  input.addEventListener('change', () => {
    fileVersion += 1;
    output.replaceChildren();
    formFeedback(form);
  });
  bindForm(form, async values => {
    if (saving) return;
    const version = fileVersion;
    output.replaceChildren();
    const records = await readCustomerFile(values.get('csv'));
    if (!context.active() || version !== fileVersion) return;
    output.innerHTML = previewMarkup(records);
    const confirm = output.querySelector('#customer-import-confirm');
    if (!confirm) return;
    bindForm(confirm, async () => {
      if (saving || version !== fileVersion || !context.active()) return;
      input.disabled = true;
      saving = true;
      try {
        const result = await api('/api/admin/customers/import', {
          method: 'POST',
          body: { customers: records.map(({ customer }) => customer) },
        });
        if (!context.active()) return;
        const message = `Imported ${result.imported} of ${result.total} customers. ${result.skipped} duplicates skipped.`;
        output.innerHTML = `<p class="feedback success" role="status">${html(message)}</p>`;
        form.reset();
        try {
          await onImported();
        } catch {
          output.insertAdjacentHTML('beforeend', '<p class="muted-text">Refresh the directory to see the imported customers.</p>');
        }
      } catch (error) {
        if (context.active() && error.errors?.length) {
          const issues = error.errors.map(issue => ({
            line: records[Number(issue.row) - 1]?.line ?? issue.row,
            errors: [issue.message],
          }));
          output.innerHTML = `<p class="feedback error" role="status">${html(error.message)}</p>${issueTable(issues)}`;
        } else if (context.active()) {
          throw error;
        }
      } finally {
        input.disabled = false;
        saving = false;
      }
    });
  });
}
