-- Create comercios table
CREATE TABLE IF NOT EXISTS public.comercios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercio TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    cbu_pago TEXT,
    alias_pago TEXT,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on comercios (good practice, though not explicitly asked, it's safer)
ALTER TABLE public.comercios ENABLE ROW LEVEL SECURITY;

-- Create policy for reading (public for now, or maybe just for tenants? 
-- For now let's make it public read so the app doesn't break)
CREATE POLICY "Comercios are viewable by everyone" 
ON public.comercios FOR SELECT 
USING (true);

-- Create seed commerce and migrate data
DO $$
DECLARE
    seed_comercio_id UUID;
BEGIN
    -- Insert seed commerce if not exists
    -- We use a fixed UUID or just let it generate. 
    -- Let's check if it exists by slug.
    SELECT id INTO seed_comercio_id FROM public.comercios WHERE slug = 'govip-default';

    IF seed_comercio_id IS NULL THEN
        INSERT INTO public.comercios (nombre_comercio, slug)
        VALUES ('GoVip Default', 'govip-default')
        RETURNING id INTO seed_comercio_id;
    END IF;

    -- Add column to events if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'comercio_id') THEN
        ALTER TABLE public.events ADD COLUMN comercio_id UUID REFERENCES public.comercios(id);
    END IF;

    -- Add column to reservations if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'comercio_id') THEN
        ALTER TABLE public.reservations ADD COLUMN comercio_id UUID REFERENCES public.comercios(id);
    END IF;

    -- Migrate data: Update events to have seed_comercio_id where NULL
    UPDATE public.events SET comercio_id = seed_comercio_id WHERE comercio_id IS NULL;

    -- Migrate data: Update reservations to have seed_comercio_id where NULL
    UPDATE public.reservations SET comercio_id = seed_comercio_id WHERE comercio_id IS NULL;

    -- Apply NOT NULL constraints
    ALTER TABLE public.events ALTER COLUMN comercio_id SET NOT NULL;
    ALTER TABLE public.reservations ALTER COLUMN comercio_id SET NOT NULL;

END $$;
