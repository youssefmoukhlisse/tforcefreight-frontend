import { createHash } from 'node:crypto';
import { Router } from 'express';
import { withTransaction } from './database.mjs';

const maxImportRows = 500;
const fields = {
  company: ['Company', 160], contact: ['Contact', 160], address: ['Address', 250],
  city: ['City', 100], state: ['State', 100], postalCode: ['Postal code', 16],
  country: ['Country', 2], phone: ['Phone', 48], email: ['Email', 254],
};
const emailPattern = /^[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+$/;
const controlCharacters = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function normalizationKey(value) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
}

function dedupeKey(customer) {
  const identity = customer.email
    ? ['email', normalizationKey(customer.email)]
    : ['contact', ...Object.values(customer).map(normalizationKey)];
  return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

function importRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'Expected a customer record.' };
  }
  if (Object.keys(value).some(field => !Object.hasOwn(fields, field))) {
    return { error: 'The row contains an unsupported customer field.' };
  }
  const customer = {};
  for (const [name, [label, maxLength]] of Object.entries(fields)) {
    const raw = value[name] ?? '';
    if (typeof raw !== 'string') return { error: `${label} must be text.` };
    const text = raw.trim();
    if (text.length > maxLength || controlCharacters.test(text)) {
      return { error: `${label} must be valid text with at most ${maxLength} characters.` };
    }
    customer[name] = text;
  }
  if (!customer.company && !customer.contact) return { error: 'Enter a company or contact name.' };

  customer.email = customer.email.toLowerCase();
  if (customer.email && (customer.email.length > fields.email[1] || !emailPattern.test(customer.email))) {
    return { error: 'Enter a valid email address.' };
  }
  if (customer.country && !/^[A-Z]{2}$/i.test(customer.country)) return { error: 'Use a two-letter country code such as US or CA.' };
  customer.country = customer.country.toUpperCase();
  customer.postalCode = customer.postalCode.toUpperCase();
  if (customer.postalCode && !/^[A-Z0-9][A-Z0-9 -]{0,14}[A-Z0-9]$/.test(customer.postalCode)) {
    return { error: 'Enter a valid postal code.' };
  }
  return { customer: { ...customer, dedupeKey: dedupeKey(customer) } };
}

function pageValue(value, fallback, min, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function createCustomerImportRouter({ pool, requireAuth, requireRole, audit }) {
  const router = Router();

  router.get('/imported', requireAuth, async (req, res) => {
    const q = req.query.q ?? '';
    const limit = pageValue(req.query.limit, 50, 1, 100);
    const offset = pageValue(req.query.offset, 0, 0, 100000);
    if (typeof q !== 'string' || q.length > 100 || controlCharacters.test(q) || limit === null || offset === null) {
      return res.status(400).json({ error: 'Enter a valid search and page range.' });
    }
    const result = await withTransaction(pool, async client => {
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      const search = q.trim();
      const filter = `WHERE $1 = '' OR strpos(lower(concat_ws(' ', company, contact, address, city, state,
        postal_code, country, phone, email)), lower($1)) > 0`;
      const { rows: [count] } = await client.query(`SELECT count(*)::int AS total FROM imported_customers ${filter}`, [search]);
      const { rows: customers } = await client.query(`SELECT id, company, contact, address, city, state, country,
        postal_code AS "postalCode", phone, email, created_at AS "createdAt"
        FROM imported_customers ${filter} ORDER BY lower(company), lower(contact), id LIMIT $2 OFFSET $3`, [search, limit, offset]);
      return { customers, total: count.total };
    });
    res.json(result);
  });

  router.post('/import', requireRole('admin', 'operator'), async (req, res) => {
    const input = req.body?.customers;
    if (!Array.isArray(input) || !input.length || input.length > maxImportRows) {
      return res.status(400).json({ error: `Include between 1 and ${maxImportRows} customer records.` });
    }

    const unique = new Map();
    const errors = [];
    for (const [index, value] of input.entries()) {
      const { customer, error } = importRecord(value);
      if (error) errors.push({ row: index + 1, message: error });
      else if (!unique.has(customer.dedupeKey)) unique.set(customer.dedupeKey, customer);
    }
    if (errors.length) {
      return res.status(400).json({ error: 'Correct the invalid customer rows before importing.', errors });
    }

    const result = await withTransaction(pool, async client => {
      // Order overlapping batches consistently and keep each customer's first submitted record.
      const insert = await client.query(`INSERT INTO imported_customers
        (dedupe_key, company, contact, address, city, state, postal_code, country, phone, email, created_by)
        SELECT "dedupeKey", company, contact, address, city, state, "postalCode", country, phone, email, $2
        FROM jsonb_to_recordset($1::jsonb) AS records("dedupeKey" text, company text, contact text, address text,
          city text, state text, "postalCode" text, country text, phone text, email text)
        ORDER BY "dedupeKey" ON CONFLICT (dedupe_key) DO NOTHING`, [JSON.stringify([...unique.values()]), req.user.id]);
      const summary = { total: input.length, imported: insert.rowCount, skipped: input.length - insert.rowCount };
      await audit(client, { actorId: req.user.id, action: 'customers.imported', targetType: 'customer_import', metadata: summary });
      return summary;
    });
    res.json(result);
  });

  return router;
}
