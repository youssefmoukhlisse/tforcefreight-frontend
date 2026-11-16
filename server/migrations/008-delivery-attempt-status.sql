ALTER TABLE shipments
  DROP CONSTRAINT shipments_status_check,
  ADD CONSTRAINT shipments_status_check CHECK (status IN (
    'created', 'pickup_scheduled', 'picked_up', 'arrived_at_service_center',
    'departed_service_center', 'in_transit', 'delivery_appointment_scheduled',
    'out_for_delivery', 'delivered', 'delivery_attempt_failed', 'delivery_exception', 'delayed', 'cancelled'
  ));

ALTER TABLE tracking_events
  DROP CONSTRAINT tracking_events_status_check,
  ADD CONSTRAINT tracking_events_status_check CHECK (status IN (
    'created', 'pickup_scheduled', 'picked_up', 'arrived_at_service_center',
    'departed_service_center', 'in_transit', 'delivery_appointment_scheduled',
    'out_for_delivery', 'delivered', 'delivery_attempt_failed', 'delivery_exception', 'delayed', 'cancelled'
  ));
