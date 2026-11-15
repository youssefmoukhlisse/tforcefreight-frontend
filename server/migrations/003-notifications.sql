CREATE TABLE public_request_limits (
  subject text NOT NULL,
  bucket bigint NOT NULL,
  hits integer NOT NULL CHECK (hits > 0),
  PRIMARY KEY (subject, bucket)
);
CREATE INDEX public_request_limits_age_idx ON public_request_limits (bucket);

CREATE TABLE notification_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254 AND email = lower(email)),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','active','revoked')),
  generation integer NOT NULL DEFAULT 1 CHECK (generation > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  revoked_at timestamptz,
  UNIQUE (shipment_id, email)
);
CREATE INDEX notification_subscriptions_active_idx ON notification_subscriptions (shipment_id) WHERE state = 'active';

CREATE TABLE notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES notification_subscriptions(id) ON DELETE RESTRICT,
  event_id uuid REFERENCES tracking_events(id) ON DELETE RESTRICT,
  generation integer NOT NULL CHECK (generation > 0),
  type text NOT NULL CHECK (type IN ('confirmation','status')),
  event_status text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','canceled','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  failure_code text,
  CHECK ((type = 'status') = (event_id IS NOT NULL AND event_status IS NOT NULL))
);
CREATE UNIQUE INDEX notification_logs_confirmation_idx ON notification_logs (subscription_id,generation) WHERE type = 'confirmation';
CREATE UNIQUE INDEX notification_logs_status_idx ON notification_logs (subscription_id,event_id) WHERE type = 'status';
CREATE INDEX notification_logs_dispatch_idx ON notification_logs (available_at,created_at) WHERE status IN ('queued','sending');
