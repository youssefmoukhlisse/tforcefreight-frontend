ALTER TABLE notification_subscriptions
  ADD COLUMN event_options text[] NOT NULL DEFAULT ARRAY['delivery_exception', 'out_for_delivery', 'delivered']::text[],
  ADD COLUMN personal_message text NOT NULL DEFAULT '',
  ADD CONSTRAINT notification_subscriptions_event_options_check CHECK (
    cardinality(event_options) BETWEEN 1 AND 5
    AND array_position(event_options, NULL) IS NULL
    AND event_options <@ ARRAY['current_status', 'delivery_exception', 'out_for_delivery', 'delivered', 'delivery_appointment_scheduled']::text[]
  ),
  ADD CONSTRAINT notification_subscriptions_personal_message_check CHECK (char_length(personal_message) <= 150);

ALTER TABLE notification_logs
  DROP CONSTRAINT notification_logs_type_check,
  ADD CONSTRAINT notification_logs_type_check CHECK (type IN ('confirmation', 'current_status', 'status'));

CREATE UNIQUE INDEX notification_logs_current_status_idx
  ON notification_logs (subscription_id, generation) WHERE type = 'current_status';
