CREATE TABLE shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL CHECK (length(service) BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'created' CHECK (status IN (
    'created', 'pickup_scheduled', 'picked_up', 'arrived_at_service_center',
    'departed_service_center', 'in_transit', 'delivery_appointment_scheduled',
    'out_for_delivery', 'delivered', 'delivery_exception', 'delayed', 'cancelled'
  )),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  bol text NOT NULL DEFAULT '',
  po text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  pickup_date date,
  estimated_delivery_date date,
  pieces integer NOT NULL CHECK (pieces BETWEEN 1 AND 1000000),
  weight numeric(12,3) NOT NULL CHECK (weight > 0),
  weight_unit text NOT NULL CHECK (weight_unit IN ('lb', 'kg')),
  trailer text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  share_names boolean NOT NULL DEFAULT false,
  share_details boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (estimated_delivery_date >= pickup_date)
);

CREATE INDEX shipments_created_idx ON shipments (created_at DESC, id);
CREATE INDEX shipments_status_created_idx ON shipments (status, created_at DESC);
CREATE INDEX shipments_pickup_idx ON shipments (pickup_date);
CREATE INDEX shipments_bol_idx ON shipments (upper(bol)) WHERE bol <> '';
CREATE INDEX shipments_po_idx ON shipments (upper(po)) WHERE po <> '';
CREATE INDEX shipments_reference_idx ON shipments (upper(reference)) WHERE reference <> '';

CREATE TABLE tracking_numbers (
  pro_number text PRIMARY KEY CHECK (pro_number ~ '^INT-[A-Z0-9][A-Z0-9-]{3,31}$'),
  shipment_id uuid NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE RESTRICT,
  issuance text NOT NULL CHECK (issuance IN ('automatic', 'manual')),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE FUNCTION guard_issued_tracking_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Issued tracking numbers are permanent' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER tracking_numbers_permanent BEFORE UPDATE OR DELETE ON tracking_numbers
  FOR EACH ROW EXECUTE FUNCTION guard_issued_tracking_number();

CREATE TABLE shipment_parties (
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('ship_from', 'ship_to')),
  company text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL CHECK (length(city) BETWEEN 1 AND 100),
  state text NOT NULL DEFAULT '',
  postal_code text NOT NULL CHECK (length(postal_code) BETWEEN 2 AND 16),
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  PRIMARY KEY (shipment_id, kind)
);

CREATE TABLE tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN (
    'created', 'pickup_scheduled', 'picked_up', 'arrived_at_service_center',
    'departed_service_center', 'in_transit', 'delivery_appointment_scheduled',
    'out_for_delivery', 'delivered', 'delivery_exception', 'delayed', 'cancelled'
  )),
  kind text NOT NULL CHECK (kind IN ('confirmed', 'expected')),
  location text NOT NULL DEFAULT '',
  city text NOT NULL CHECK (length(city) BETWEEN 1 AND 100),
  state text NOT NULL DEFAULT '',
  country text NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  occurred_at timestamptz NOT NULL,
  event_date date NOT NULL,
  event_time time(0) NOT NULL,
  time_zone text NOT NULL,
  utc_offset text NOT NULL CHECK (utc_offset ~ '^[+-][0-9]{2}:[0-9]{2}$'),
  source text NOT NULL CHECK (length(source) BETWEEN 1 AND 160),
  trailer text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  signed_by text NOT NULL DEFAULT '',
  delivery_notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  CHECK (status <> 'delivered' OR (kind = 'confirmed' AND length(signed_by) > 0)),
  CHECK (status = 'delivered' OR (signed_by = '' AND delivery_notes = ''))
);

CREATE INDEX tracking_events_timeline_idx ON tracking_events
  (shipment_id, occurred_at DESC, created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX tracking_events_status_idx ON tracking_events
  (shipment_id, occurred_at DESC, created_at DESC, id DESC) WHERE deleted_at IS NULL AND kind = 'confirmed';

CREATE TABLE shipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('bol', 'pod', 'other')),
  name text NOT NULL CHECK (length(name) BETWEEN 5 AND 160),
  content bytea NOT NULL CHECK (octet_length(content) BETWEEN 8 AND 2097152),
  shareable boolean NOT NULL DEFAULT false CHECK (NOT shareable OR kind = 'bol'),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX shipment_documents_shipment_idx ON shipment_documents (shipment_id, created_at DESC, id);
