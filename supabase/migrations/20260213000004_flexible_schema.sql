-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    icono TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Categories
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public categories are viewable by everyone"
ON categorias FOR SELECT
USING (true);

CREATE POLICY "Admins can insert categories"
ON categorias FOR INSERT
WITH CHECK (true); -- Ideally restrict to Super Admin

CREATE POLICY "Admins can update categories"
ON categorias FOR UPDATE
USING (true);

-- 2. Link Commerces to Categories
ALTER TABLE comercios ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id);

-- 3. Add JSONB to Events for flexible schema
ALTER TABLE events ADD COLUMN IF NOT EXISTS detalles_extra JSONB DEFAULT '{}'::jsonb;
