-- Add duration and reservation_fee columns to events table
ALTER TABLE events ADD COLUMN duration TEXT;
ALTER TABLE events ADD COLUMN reservation_fee NUMERIC;
