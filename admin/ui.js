export const statuses = {
  created: 'Shipment Created',
  pickup_scheduled: 'Pickup Scheduled',
  picked_up: 'Picked Up',
  arrived_at_service_center: 'Arrived at Service Center',
  departed_service_center: 'Departed Service Center',
  in_transit: 'In Transit',
  delivery_appointment_scheduled: 'Delivery Appointment Scheduled',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_exception: 'Delivery Exception',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
};

const htmlCharacters = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const formatDay = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
const formatInstant = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function html(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, character => htmlCharacters[character]);
}

export function labelFor(key = '') {
  return String(key).replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());
}

export function day(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(+date) ? '—' : formatDay.format(date);
}

export function instant(value) {
  const date = new Date(value || Number.NaN);
  return Number.isNaN(+date) ? '—' : formatInstant.format(date);
}

export function badge(status) {
  const states = {
    delivered: 'success',
    cancelled: 'muted',
    delivery_exception: 'danger',
    delayed: 'warning',
    out_for_delivery: 'info',
    arrived_at_service_center: 'info',
    in_transit: 'info',
    picked_up: 'info',
  };
  return `<span class="badge ${states[status] || ''}">${html(statuses[status] || labelFor(status) || 'Unknown')}</span>`;
}

export function statusOptions(selected = '', includeAll = false) {
  return `${includeAll ? '<option value="">All statuses</option>' : ''}${Object.entries(statuses).map(([value, label]) => `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`).join('')}`;
}

export function field(name, label, value = '', settings = {}) {
  const { type = 'text', required = false, maxlength, autocomplete, placeholder, pattern, inputmode, min, max, step, hint, wide = false, datalist } = settings;
  const attributes = { type, name, id: name, maxlength, autocomplete, placeholder, pattern, inputmode, min, max, step, list: datalist, value };
  const attrs = Object.entries(attributes).filter(([, item]) => item !== undefined && item !== null)
    .map(([key, item]) => ` ${key}="${html(item)}"`).join('');
  return `<div class="field${wide ? ' field-wide' : ''}">
    <label for="${name}">${html(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>
    <input${attrs}${required ? ' required' : ''}${hint ? ` aria-describedby="${name}-hint"` : ''}>
    ${hint ? `<small id="${name}-hint">${html(hint)}</small>` : ''}
  </div>`;
}

export function textarea(name, label, value = '', rows = 3, maxlength = 2000) {
  return `<div class="field field-wide">
    <label for="${name}">${html(label)}</label>
    <textarea id="${name}" name="${name}" rows="${rows}" maxlength="${maxlength}">${html(value)}</textarea>
  </div>`;
}

export function checkbox(name, label, checked = false, hint = '') {
  return `<label class="checkbox"><input type="checkbox" name="${name}"${checked ? ' checked' : ''}><span>${html(label)}${hint ? `<small>${html(hint)}</small>` : ''}</span></label>`;
}

export function section(title, content, { note = '', id = '', actions = '' } = {}) {
  return `<section class="panel"${id ? ` id="${id}"` : ''}>
    <div class="panel-heading"><div><h2>${html(title)}</h2>${note ? `<p>${html(note)}</p>` : ''}</div>${actions}</div>
    <div class="panel-body">${content}</div>
  </section>`;
}

export function heading(title, description = '', actions = '') {
  return `<header class="page-heading"><div><h1>${html(title)}</h1>${description ? `<p>${html(description)}</p>` : ''}</div>${actions && `<div class="page-actions">${actions}</div>`}</header>`;
}

export function table(headers, rows, empty = 'No records found.') {
  if (!rows.length) return `<p class="empty">${html(empty)}</p>`;
  return `<div class="table-wrap" tabindex="0" role="region" aria-label="Table results"><table>
    <thead><tr>${headers.map(header => `<th scope="col">${html(header)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

export function formFeedback(form, message = '', isError = true) {
  const feedback = form.querySelector('[data-feedback]');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = message ? `feedback ${isError ? 'error' : 'success'}` : '';
  feedback.hidden = !message;
}

export function bindForm(form, action) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.busy) return;
    form.dataset.busy = 'true';
    const values = new FormData(form);
    const buttons = Array.from(form.querySelectorAll('button[type="submit"]')).filter(button => !button.disabled);
    buttons.forEach(button => { button.disabled = true; });
    formFeedback(form);
    try {
      await action(values, form);
    } catch (error) {
      formFeedback(form, error.message || 'The operation could not be completed.');
    } finally {
      delete form.dataset.busy;
      buttons.forEach(button => { button.disabled = false; });
    }
  });
}

export function reveal(input, value) {
  input.value = value;
  input.focus();
  input.select();
  return navigator.clipboard?.writeText(value).catch(() => undefined);
}

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: options.signal || AbortSignal.timeout(15000),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('The server could not be reached. Try again.');
  }
  if (response.status === 204) return null;
  const type = response.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) {
    throw new Error('Shipment administration is unavailable on this deployment.');
  }
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(typeof payload.error === 'string' ? payload.error : payload.message || 'The server could not complete this request.');
    error.status = response.status;
    error.code = payload.code;
    if (response.status === 401 && (path.startsWith('/api/admin/') || path.startsWith('/api/auth/users'))) {
      document.dispatchEvent(new Event('admin-session-expired'));
    }
    throw error;
  }
  return payload;
}

export const feedback = '<p data-feedback role="status" hidden></p>';
