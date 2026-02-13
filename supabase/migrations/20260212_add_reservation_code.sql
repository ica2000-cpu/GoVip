-- Add reservation_code column to reservations table
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reservation_code TEXT UNIQUE;

-- Update book_ticket function to generate reservation code instead of payment reference
-- Or keep payment_reference for payment specific use, and use reservation_code for identification
-- Based on prompt: "Generador de Código de Reserva... como 'Número de Reserva'"
-- It seems this replaces the public-facing ID.

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
BEGIN
  -- Check stock with lock
  SELECT stock INTO v_stock 
  FROM ticket_types 
  WHERE id = p_ticket_type_id 
  FOR UPDATE;
  
  IF v_stock IS NULL THEN RAISE EXCEPTION 'Ticket type not found'; END IF;
  IF v_stock < p_quantity THEN RAISE EXCEPTION 'Not enough stock available'; END IF;
  
  -- Generate unique reservation code (e.g. GV-A1B2C3)
  LOOP
    -- Prefix GV- + 6 random chars
    v_reservation_code := 'GV-' || upper(substring(md5(random()::text) from 1 for 6));
    
    -- Also generate payment ref (shorter, just chars) if we still want it separately, 
    -- BUT prompt implies this NEW code is the main identifier.
    -- Let's reuse the logic for payment_reference or just use this code for everything?
    -- Prompt says: "mostrar al público... como Número de Reserva" and "buscar una reserva... por su ID aleatorio".
    -- Previous step added `payment_reference`. Let's keep `payment_reference` for banking reconciliation 
    -- and `reservation_code` for the User/Admin UI identifier.
    
    -- Let's stick to generating a reservation_code.
    SELECT EXISTS(SELECT 1 FROM reservations WHERE reservation_code = v_reservation_code)
    INTO v_code_exists;
    
    EXIT WHEN NOT v_code_exists;
  END LOOP;

  -- Re-using previous payment_reference logic if needed, or just using the same code?
  -- To keep it simple and robust, let's say payment_reference = reservation_code for now 
  -- unless specified otherwise, but the previous prompt asked for a 6 char payment ref.
  -- This new prompt asks for "GV-B728X". Let's generate both if they serve different purposes (Bank vs UI).
  -- Bank usually needs short codes. UI can be friendlier.
  -- Let's assume this new "Reservation Code" replaces the "ID #123" display.
  
  -- We also need to generate payment_reference if it's NOT NULL constraint (it's not).
  -- But to be safe, let's generate payment_reference as the SHORT version (6 chars)
  -- and reservation_code as the PREFIXED version.
  
  v_payment_ref := split_part(v_reservation_code, '-', 2); -- Extract the random part for payment ref

  -- Decrement stock
  UPDATE ticket_types SET stock = stock - p_quantity WHERE id = p_ticket_type_id;
  
  -- Insert
  INSERT INTO reservations (
      ticket_type_id, customer_name, customer_email, customer_phone, quantity, 
      payment_reference, reservation_code
  )
  VALUES (
      p_ticket_type_id, p_customer_name, p_customer_email, p_customer_phone, p_quantity, 
      v_payment_ref, v_reservation_code
  )
  RETURNING id INTO v_reservation_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'reservation_id', v_reservation_id, -- Still returning DB ID for internal use if needed
    'reservation_code', v_reservation_code, -- The public ID
    'payment_reference', v_payment_ref, -- The bank ref
    'message', 'Reservation created successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
