DO $$
DECLARE
    v_event_id BIGINT;
BEGIN
    -- Find the Duki event (assuming ID is BIGINT)
    SELECT id INTO v_event_id FROM events WHERE title ILIKE '%Duki%' LIMIT 1;

    IF v_event_id IS NOT NULL THEN
        -- 1. Delete existing reservations for this event's ticket types
        -- We need to do this first because of FK constraints (if cascade isn't set on reservations)
        DELETE FROM reservations 
        WHERE ticket_type_id IN (
            SELECT id FROM ticket_types WHERE event_id = v_event_id
        );

        -- 2. Delete existing ticket types for this event
        DELETE FROM ticket_types WHERE event_id = v_event_id;

        -- 3. Update Event Details
        UPDATE events
        SET title = 'Bad Bunny - World Tour',
            image_url = 'https://i.ibb.co/LXDSrfdn/Whats-App-Image-2026-02-12-at-01-11-03.jpg',
            description = 'El conejo malo vuelve a Argentina. Estadio Monumental. Un show único e irrepetible.',
            location = 'Estadio River Plate',
            date = '2024-05-18T21:00:00+00', -- Future date
            category = 'Trap'
        WHERE id = v_event_id;

        -- 4. Insert new ticket types
        INSERT INTO ticket_types (event_id, name, price, stock)
        VALUES
            (v_event_id, 'Campo General', 250000, 15000),
            (v_event_id, 'Campo Delantero VIP', 400000, 5000),
            (v_event_id, 'Platea Sivori Alta', 150000, 8000);
            
        RAISE NOTICE 'Evento Duki actualizado a Bad Bunny correctamente.';
    ELSE
        RAISE NOTICE 'Evento Duki no encontrado.';
    END IF;
END $$;
