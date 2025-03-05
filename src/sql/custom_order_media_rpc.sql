
-- Function to add a custom order media (image or video)
CREATE OR REPLACE FUNCTION add_custom_order_media(
  order_id_param uuid, 
  media_url_param text, 
  media_type_param text,
  thumbnail_url_param text DEFAULT NULL,
  original_filename_param text DEFAULT NULL
)
RETURNS custom_order_media
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_media custom_order_media;
BEGIN
  -- Insert the media
  INSERT INTO custom_order_media (
    order_id,
    media_url,
    media_type,
    thumbnail_url,
    original_filename
  ) VALUES (
    order_id_param,
    media_url_param,
    media_type_param,
    thumbnail_url_param,
    original_filename_param
  )
  RETURNING * INTO new_media;
  
  -- Return the newly created media record
  RETURN new_media;
END;
$$;

-- Update the deliver_custom_order function to include media count in notification
CREATE OR REPLACE FUNCTION deliver_custom_order(
  order_id_param uuid, 
  delivery_url_param text, 
  delivery_message_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record custom_orders;
  media_count integer;
  notification_message text;
BEGIN
  -- Get the order to verify it exists and get user_id
  SELECT * INTO order_record FROM public.custom_orders WHERE id = order_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Count media items
  SELECT COUNT(*) INTO media_count FROM public.custom_order_media WHERE order_id = order_id_param;
  
  -- Update the order with delivery information
  UPDATE public.custom_orders
  SET 
    status = 'completed',
    delivery_url = delivery_url_param,
    delivery_message = delivery_message_param,
    delivered_at = NOW(),
    updated_at = NOW()
  WHERE id = order_id_param;
  
  -- Create notification message with media info if available
  IF media_count > 0 THEN
    notification_message := COALESCE(delivery_message_param, 'Your custom order has been delivered with ' || media_count || ' media files. Check your dashboard to view it.');
  ELSE
    notification_message := COALESCE(delivery_message_param, 'Your custom order has been delivered. Check your dashboard to view it.');
  END IF;
  
  -- Create a notification for the user
  INSERT INTO public.user_notifications (
    user_id,
    title,
    message,
    type,
    related_id
  ) VALUES (
    order_record.user_id,
    'Your custom order is complete!',
    notification_message,
    'order_delivered',
    order_id_param
  );
END;
$$;
