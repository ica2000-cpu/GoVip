
-- Allow public read access to Commerces (so the page loads)
CREATE POLICY "Public can view commerces" 
ON comercios FOR SELECT 
USING (true);

-- Allow public read access to Events (so the billboard works)
CREATE POLICY "Public can view events" 
ON events FOR SELECT 
USING (true);

-- Allow public read access to Ticket Types (so they can buy)
CREATE POLICY "Public can view ticket types" 
ON ticket_types FOR SELECT 
USING (true);

-- Reservations remain private (Admin only or Owner only)
-- No public policy for reservations.
