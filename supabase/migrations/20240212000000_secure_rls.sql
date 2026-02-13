
-- Enable RLS on all critical tables
ALTER TABLE comercios ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 1. Policies for 'comercios'
-- Users can view their own commerce
CREATE POLICY "Users can view own commerce" 
ON comercios FOR SELECT 
USING (auth.uid() = owner_id);

-- Users can update their own commerce
CREATE POLICY "Users can update own commerce" 
ON comercios FOR UPDATE 
USING (auth.uid() = owner_id);

-- 2. Policies for 'events'
-- Users can view events belonging to their commerce
CREATE POLICY "Users can view own events" 
ON events FOR SELECT 
USING (
  comercio_id IN (
    SELECT id FROM comercios WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own events" 
ON events FOR INSERT 
WITH CHECK (
  comercio_id IN (
    SELECT id FROM comercios WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update own events" 
ON events FOR UPDATE 
USING (
  comercio_id IN (
    SELECT id FROM comercios WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own events" 
ON events FOR DELETE 
USING (
  comercio_id IN (
    SELECT id FROM comercios WHERE owner_id = auth.uid()
  )
);

-- 3. Policies for 'ticket_types'
-- Linked via event_id -> comercio_id (Corrected column name)
CREATE POLICY "Users can manage own ticket types" 
ON ticket_types FOR ALL 
USING (
  event_id IN (
    SELECT id FROM events WHERE comercio_id IN (
      SELECT id FROM comercios WHERE owner_id = auth.uid()
    )
  )
);

-- 4. Policies for 'reservations'
-- Users can manage own reservations
CREATE POLICY "Users can manage own reservations" 
ON reservations FOR ALL 
USING (
  comercio_id IN (
    SELECT id FROM comercios WHERE owner_id = auth.uid()
  )
);
