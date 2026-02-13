DO $$
DECLARE
    v_event_id BIGINT;
BEGIN
    -- Check if event "Futura" already exists to avoid duplicates
    IF NOT EXISTS (SELECT 1 FROM events WHERE title = 'Futura') THEN
        
        -- Insert Event (assuming location, date, category defaults for now)
        INSERT INTO events (title, description, date, location, category, image_url)
        VALUES (
            'Futura', 
            'Nuevo recital en vivo. No te pierdas la experiencia Futura.', 
            '2024-09-21 21:00:00+00', -- Future date
            'Estadio Único', 
            'Recital', 
            'https://i.ibb.co/PszCGjkt/Whats-App-Image-2026-02-12-at-01-41-00.jpg'
        )
        RETURNING id INTO v_event_id;

        -- Insert Ticket Types (using "stock" column, not "stock_available")
        INSERT INTO ticket_types (event_id, name, price, stock)
        VALUES
            (v_event_id, 'Campo', 200000, 10000),
            (v_event_id, 'Platea', 250000, 5000);

        RAISE NOTICE 'Evento Futura agregado exitosamente.';
    ELSE
        RAISE NOTICE 'El evento Futura ya existe. No se realizaron cambios.';
    END IF;
END $$;
