CREATE TABLE shipment_event_imports (
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  import_id uuid NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  receipts jsonb NOT NULL CHECK (
    CASE WHEN jsonb_typeof(receipts) = 'array' THEN jsonb_array_length(receipts) BETWEEN 1 AND 100 ELSE false END
  ),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (actor_id, import_id)
);
