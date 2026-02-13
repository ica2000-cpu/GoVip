-- Add payment_reference column to reservations table
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS payment_reference TEXT UNIQUE;

-- Update book_ticket function to generate payment reference
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
  v_payment_ref TEXT;
  v_ref_exists BOOLEAN;
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
  
  -- Generate unique payment reference (6 chars: Uppercase Letters + Numbers)
  LOOP
    -- Generate random string like 'A1B2C3'
    v_payment_ref := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM reservations WHERE payment_reference = v_payment_ref)
    INTO v_ref_exists;
    
    EXIT WHEN NOT v_ref_exists;
  END LOOP;
  
  -- Decrement stock
  UPDATE ticket_types 
  SET stock = stock - p_quantity 
  WHERE id = p_ticket_type_id;
  
  -- Create reservation including phone number and generated reference
  INSERT INTO reservations (ticket_type_id, customer_name, customer_email, customer_phone, quantity, payment_reference)
  VALUES (p_ticket_type_id, p_customer_name, p_customer_email, p_customer_phone, p_quantity, v_payment_ref)
  RETURNING id INTO v_reservation_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'payment_reference', v_payment_ref,
    'message', 'Reservation created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error response
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
