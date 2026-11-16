ALTER TABLE tracking_numbers
  DROP CONSTRAINT tracking_numbers_shipment_id_key,
  ADD COLUMN is_current boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX tracking_numbers_one_current
  ON tracking_numbers (shipment_id) WHERE is_current;
CREATE INDEX tracking_numbers_by_shipment ON tracking_numbers (shipment_id);

CREATE OR REPLACE FUNCTION guard_issued_tracking_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_current AND NOT NEW.is_current
      AND NEW.pro_number = OLD.pro_number
      AND NEW.shipment_id = OLD.shipment_id
      AND NEW.issuance = OLD.issuance
      AND NEW.issued_at = OLD.issued_at
    THEN
      RETURN NEW;
    END IF;
  END IF;
  RAISE EXCEPTION 'Issued tracking numbers are permanent' USING ERRCODE = '23514';
END;
$$;

CREATE FUNCTION require_replacement_tracking_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tracking_numbers WHERE shipment_id = OLD.shipment_id AND is_current
  ) THEN
    RAISE EXCEPTION 'A retired tracking number requires a current replacement' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER tracking_numbers_require_replacement
  AFTER UPDATE ON tracking_numbers
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW WHEN (OLD.is_current AND NOT NEW.is_current)
  EXECUTE FUNCTION require_replacement_tracking_number();
