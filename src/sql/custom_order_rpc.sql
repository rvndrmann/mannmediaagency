
-- Function to create a custom order
CREATE OR REPLACE FUNCTION create_custom_order(remark_text text, credits_amount numeric)
RETURNS custom_orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_order custom_orders;
BEGIN
  -- Insert the custom order
  INSERT INTO custom_orders (
    user_id,
    remark,
    credits_used
  ) VALUES (
    auth.uid(),
    remark_text,
    credits_amount
  )
  RETURNING * INTO new_order;
  
  -- Return the newly created order
  RETURN new_order;
END;
$$;

-- Function to add a custom order image
CREATE OR REPLACE FUNCTION add_custom_order_image(order_id_param uuid, image_url_param text)
RETURNS custom_order_images
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_image custom_order_images;
BEGIN
  -- Insert the image
  INSERT INTO custom_order_images (
    order_id,
    image_url
  ) VALUES (
    order_id_param,
    image_url_param
  )
  RETURNING * INTO new_image;
  
  -- Return the newly created image record
  RETURN new_image;
END;
$$;
