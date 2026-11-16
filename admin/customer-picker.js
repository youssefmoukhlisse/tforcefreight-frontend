import { api, field, html } from './ui.js';

export function customerPicker(prefix) {
  const label = prefix === 'shipFrom' ? 'sender' : 'recipient';
  return `<details class="customer-picker" data-customer-picker="${prefix}">
    <summary>Use a saved customer</summary>
    <div class="fields two">
      ${field(prefix + '-customer-search', 'Find a saved ' + label, '', { maxlength: 100, placeholder: 'Company, contact, email or city' })}
      <div class="field">
        <label for="${prefix}-customer-select">Matching customers</label>
        <select id="${prefix}-customer-select" data-customer-select disabled><option value="">Select a customer</option></select>
      </div>
    </div>
    <div class="form-actions"><button class="button secondary small-button" data-use-customer type="button" disabled>Use customer</button></div>
    <small data-customer-match role="status"></small>
  </details>`;
}

export function bindCustomerPickers(form) {
  for (const picker of form.querySelectorAll('[data-customer-picker]')) {
    const prefix = picker.dataset.customerPicker;
    const search = picker.querySelector('input');
    const select = picker.querySelector('[data-customer-select]');
    const button = picker.querySelector('[data-use-customer]');
    const result = picker.querySelector('[data-customer-match]');
    let customers = [];
    let requestId = 0;
    let searchTimer;

    async function searchCustomers(current) {
      if (!picker.isConnected || requestId !== current) return;
      result.textContent = 'Finding customers…';
      try {
        const params = new URLSearchParams({ q: search.value.trim(), limit: '20' });
        const response = await api('/api/admin/customers/imported?' + params);
        if (!picker.isConnected || requestId !== current) return;
        customers = response.customers;
        select.innerHTML = '<option value="">Select a customer</option>' + customers.map(customer => {
          const name = [customer.company, customer.contact].filter(Boolean).join(' / ');
          const place = [customer.city, customer.state].filter(Boolean).join(', ');
          const label = [name, place || customer.email].filter(Boolean).join(' — ');
          return `<option value="${html(customer.id)}">${html(label)}</option>`;
        }).join('');
        select.disabled = customers.length === 0;
        result.textContent = customers.length ? (response.total > customers.length ? 'Refine the search to see other matches.' : '')
          : search.value.trim() ? 'No saved customers match this search.' : 'Import customers from the Customers page.';
      } catch (error) {
        if (requestId === current) result.textContent = error.message;
      }
    }

    function queueSearch(delay) {
      select.disabled = true;
      button.disabled = true;
      const current = ++requestId;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => void searchCustomers(current), delay);
    }

    picker.addEventListener('toggle', () => {
      if (picker.open && !requestId) queueSearch(0);
    });
    search.addEventListener('input', () => queueSearch(200));
    search.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        queueSearch(0);
      }
    });
    select.addEventListener('change', () => { button.disabled = !select.value; });
    button.addEventListener('click', () => {
      const selected = customers.find(customer => customer.id === select.value);
      if (!selected) return;
      for (const key of ['company', 'contact', 'address', 'city', 'state', 'postalCode', 'country', 'phone', 'email']) {
        const input = form.elements.namedItem(prefix + '-' + key);
        input.value = (selected[key] || '').replace(/\s*[\r\n]+\s*/g, ', ');
      }
      form.elements.namedItem(prefix + '-country').dispatchEvent(new Event('input'));
      result.textContent = 'Customer information filled in. Review the address before saving.';
    });
  }
}
