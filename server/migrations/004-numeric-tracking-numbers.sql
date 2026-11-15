ALTER TABLE tracking_numbers
  DROP CONSTRAINT tracking_numbers_pro_number_check,
  ADD CONSTRAINT tracking_numbers_pro_number_check
    CHECK (pro_number ~ '^([0-9]{9}|INT-[A-Z0-9][A-Z0-9-]{3,31})$');
