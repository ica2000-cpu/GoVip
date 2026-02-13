ALTER TABLE comercios ADD COLUMN IF NOT EXISTS payment_data JSONB DEFAULT '{}'::jsonb;
