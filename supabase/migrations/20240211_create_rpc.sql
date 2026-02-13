CREATE OR REPLACE FUNCTION make_reservation(
  p_ticket_type_id BIGINT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_quantity INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock INTEGER;
  v_reservation_id BIGINT;
BEGIN
  -- Check stock with lock
  SELECT stock INTO v_stock FROM ticket_types WHERE id = p_ticket_type_id FOR UPDATE;
  
  IF v_stock IS NULL THEN
    RAISE EXCEPTION 'Ticket type not found';
  END IF;
  
  IF v_stock < p_quantity THEN
    RAISE EXCEPTION 'Not enough stock';
  END IF;
  
  -- Decrement stock
  UPDATE ticket_types SET stock = stock - p_quantity WHERE id = p_ticket_type_id;
  
  -- Create reservation
  INSERT INTO reservations (ticket_type_id, customer_name, customer_email, quantity)
  VALUES (p_ticket_type_id, p_customer_name, p_customer_email, p_quantity)
  RETURNING id INTO v_reservation_id;
  
  RETURN json_build_object('id', v_reservation_id, 'status', 'success');
END;
$$;
