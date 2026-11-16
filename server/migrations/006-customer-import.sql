CREATE TABLE imported_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE CHECK (dedupe_key ~ '^[a-f0-9]{64}$'),
  company text NOT NULL CHECK (char_length(company) <= 160),
  contact text NOT NULL CHECK (char_length(contact) <= 160),
  address text NOT NULL CHECK (char_length(address) <= 250),
  city text NOT NULL CHECK (char_length(city) <= 100),
  state text NOT NULL CHECK (char_length(state) <= 100),
  postal_code text NOT NULL CHECK (char_length(postal_code) <= 16),
  country text NOT NULL CHECK (country = '' OR country ~ '^[A-Z]{2}$'),
  phone text NOT NULL CHECK (char_length(phone) <= 48),
  email text NOT NULL CHECK (char_length(email) <= 254 AND email = lower(email)),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (company <> '' OR contact <> '')
);

CREATE INDEX imported_customers_name_idx ON imported_customers (lower(company), lower(contact), id);
