
-- Function to check if an order link is valid by its access code
CREATE OR REPLACE FUNCTION check_order_link_valid(access_code_param TEXT)
RETURNS custom_order_links
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  link_record custom_order_links;
BEGIN
  -- Get the order link if it exists and is active
  SELECT * INTO link_record 
  FROM custom_order_links 
  WHERE 
    access_code = access_code_param 
    AND is_active = true
    AND (expiry_date IS NULL OR expiry_date > NOW());
  
  -- Return the link data if found, NULL otherwise
  RETURN link_record;
END;
$$;

-- Function to create a guest order
CREATE OR REPLACE FUNCTION create_guest_order(
  phone_number_param TEXT,
  email_param TEXT,
  name_param TEXT,
  remark_text TEXT,
  order_link_id_param UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_guest_id UUID;
  new_order_id UUID;
  link_record custom_order_links;
BEGIN
  -- Get the order link to check if it's valid
  SELECT * INTO link_record 
  FROM custom_order_links 
  WHERE id = order_link_id_param 
  AND is_active = true;
  
  IF link_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive order link';
  END IF;
  
  -- Insert the guest user
  INSERT INTO custom_order_guests (
    phone_number,
    email,
    name
  ) VALUES (
    phone_number_param,
    email_param,
    name_param
  )
  RETURNING id INTO new_guest_id;
  
  -- Insert the custom order
  INSERT INTO custom_orders (
    guest_id,
    order_link_id,
    remark,
    credits_used,
    status
  ) VALUES (
    new_guest_id,
    order_link_id_param,
    remark_text,
    link_record.credits_amount,
    CASE 
      WHEN link_record.custom_rate > 0 THEN 'payment_pending'
      ELSE 'pending'
    END
  )
  RETURNING id INTO new_order_id;
  
  -- Return the newly created order id
  RETURN new_order_id;
END;
$$;
