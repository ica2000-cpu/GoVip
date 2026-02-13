-- Modify payment_settings table to match new requirements
ALTER TABLE payment_settings 
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS account_holder;
