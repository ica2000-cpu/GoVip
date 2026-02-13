CREATE OR REPLACE FUNCTION book_ticket(
  p_ticket_type_id BIGINT,
  p_quantity INTEGER,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock INTEGER;
  v_reservation_id BIGINT;
  v_reservation_code TEXT;
  v_payment_ref TEXT;
  v_code_exists BOOLEAN;
  v_event_id BIGINT;
  v_comercio_id UUID;
BEGIN
  -- Check stock with lock
  SELECT stock, event_id INTO v_stock, v_event_id
  FROM ticket_types 
  WHERE id = p_ticket_type_id 
  FOR UPDATE;
  
  IF v_stock IS NULL THEN RAISE EXCEPTION 'Ticket type not found'; END IF;
  IF v_stock < p_quantity THEN RAISE EXCEPTION 'Not enough stock available'; END IF;

  -- Get Comercio ID from Event
  SELECT comercio_id INTO v_comercio_id FROM events WHERE id = v_event_id;
  IF v_comercio_id IS NULL THEN RAISE EXCEPTION 'Event commerce not found'; END IF;
  
  -- Generate unique reservation code (e.g. GV-A1B2C3)
  LOOP
    -- Prefix GV- + 6 random chars
    v_reservation_code := 'GV-' || upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM reservations WHERE reservation_code = v_reservation_code)
    INTO v_code_exists;
    
    EXIT WHEN NOT v_code_exists;
  END LOOP;

  -- Generate payment reference (legacy/bank ref)
  v_payment_ref := upper(substring(md5(random()::text) from 1 for 6));

  -- Decrement stock
  UPDATE ticket_types SET stock = stock - p_quantity WHERE id = p_ticket_type_id;
  
  -- Insert
  INSERT INTO reservations (
      ticket_type_id, customer_name, customer_email, customer_phone, quantity, 
      payment_reference, reservation_code, comercio_id
  )
  VALUES (
      p_ticket_type_id, p_customer_name, p_customer_email, p_customer_phone, p_quantity, 
      v_payment_ref, v_reservation_code, v_comercio_id
  )
  RETURNING id INTO v_reservation_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'reservation_code', v_reservation_code,
    'payment_reference', v_payment_ref,
    'message', 'Reservation created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
