-- Clean up existing data to re-seed
TRUNCATE TABLE events RESTART IDENTITY CASCADE;

-- Insert new Concert Events
INSERT INTO events (title, description, date, location, category, image_url)
VALUES 
  ('The Rolling Stones', 'La legendaria banda en vivo con su tour Hackney Diamonds.', '2024-06-15 21:00:00+00', 'Estadio Wembley', 'Rock', 'https://images.unsplash.com/photo-1501612780327-45045538702b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'),
  ('La Renga', 'El banquete se hace presente en el Estadio Único. Una noche a puro rock barrial.', '2024-05-25 20:00:00+00', 'Estadio Único de La Plata', 'Rock', 'https://images.unsplash.com/photo-1459749411177-287ce3288b71?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'),
  ('Duki - A.D.A Tour', 'El referente del trap argentino llega con su show más impactante.', '2024-07-20 21:00:00+00', 'Movistar Arena', 'Trap', 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80');

-- Insert Ticket Types for Rolling Stones (ID 1)
INSERT INTO ticket_types (name, price, stock, event_id)
VALUES
  ('Campo Delantero', 200.0, 50, 1),
  ('Campo General', 100.0, 2000, 1),
  ('Platea Preferencial', 150.0, 500, 1);

-- Insert Ticket Types for La Renga (ID 2)
INSERT INTO ticket_types (name, price, stock, event_id)
VALUES
  ('Campo', 35000.0, 5000, 2),
  ('Platea Techada', 28000.0, 1000, 2),
  ('Cabecera', 20000.0, 500, 2);

-- Insert Ticket Types for Duki (ID 3)
INSERT INTO ticket_types (name, price, stock, event_id)
VALUES
  ('Campo VIP', 60000.0, 300, 3),
  ('Platea Baja', 45000.0, 800, 3),
  ('Platea Alta', 30000.0, 1200, 3);
