-- 1. Add JSONB to ticket_types (products) for extra flexibility
ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS detalles_extra JSONB DEFAULT '{}'::jsonb;

-- 2. Protect es_destacado (Advertising Control)
-- Only service_role (Super Admin backend) can update 'es_destacado'
CREATE OR REPLACE FUNCTION public.check_advertising_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if es_destacado is being changed
  IF (NEW.es_destacado IS DISTINCT FROM OLD.es_destacado) THEN
    -- Allow only if it's a service_role (Admin API)
    IF (auth.role() != 'service_role') THEN
       RAISE EXCEPTION 'Unauthorized: Only Super Admin can manage advertising';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_update_advertising ON comercios;
CREATE TRIGGER on_update_advertising
BEFORE UPDATE ON comercios
FOR EACH ROW
EXECUTE FUNCTION public.check_advertising_permissions();

-- 3. Ensure categoria_id is the only categorization method
-- Drop 'category' column from comercios if it accidentally exists (cleanup)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comercios' AND column_name = 'category') THEN
        ALTER TABLE comercios DROP COLUMN category;
    END IF;
END $$;
