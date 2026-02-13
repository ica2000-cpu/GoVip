-- Rename columns to match requirements
ALTER TABLE public.comercios RENAME COLUMN nombre_comercio TO nombre;
ALTER TABLE public.comercios RENAME COLUMN cbu_pago TO cbu;
ALTER TABLE public.comercios RENAME COLUMN alias_pago TO alias;

-- Add new column
ALTER TABLE public.comercios ADD COLUMN IF NOT EXISTS nombre_titular TEXT;

-- Update the seed commerce data to match 'GoVip Original'
-- We update the one we created previously (govip-default)
UPDATE public.comercios 
SET 
    nombre = 'GoVip Original',
    slug = 'govip',
    nombre_titular = 'GoVip Titular',
    logo_url = 'https://coreva-normal.trae.ai/api/ide/v1/text_to_image?prompt=logo%20moderno%20para%20govip%20plataforma%20de%20eventos&image_size=square' -- Placeholder or keep existing
WHERE slug = 'govip-default';

-- Ensure it exists if previous step didn't happen (just in case)
INSERT INTO public.comercios (nombre, slug, nombre_titular)
SELECT 'GoVip Original', 'govip', 'GoVip Titular'
WHERE NOT EXISTS (SELECT 1 FROM public.comercios WHERE slug = 'govip');
