CREATE OR REPLACE FUNCTION book_ticket(
  p_ticket_type_id BIGINT,
  p_quantity INTEGER,
  p_customer_name TEXT,
  p_customer_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock INTEGER;
  v_reservation_id BIGINT;
BEGIN
  -- Check stock with lock (atomic) to prevent race conditions
  SELECT stock INTO v_stock 
  FROM ticket_types 
  WHERE id = p_ticket_type_id 
  FOR UPDATE;
  
  -- Validation
  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Ticket type not found';
  END IF;
  
  IF v_stock < p_quantity THEN
    RAISE EXCEPTION 'Not enough stock available';
  END IF;
  
  -- Decrement stock
  UPDATE ticket_types 
  SET stock = stock - p_quantity 
  WHERE id = p_ticket_type_id;
  
  -- Create reservation
  INSERT INTO reservations (ticket_type_id, customer_name, customer_email, quantity)
  VALUES (p_ticket_type_id, p_customer_name, p_customer_email, p_quantity)
  RETURNING id INTO v_reservation_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'message', 'Reservation created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error response (handled by RPC caller usually, but explicit JSON is nice too)
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
