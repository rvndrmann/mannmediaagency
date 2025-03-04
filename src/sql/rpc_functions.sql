
-- Function to get count of records in any table
CREATE OR REPLACE FUNCTION get_table_count(table_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_value integer;
BEGIN
  EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO count_value;
  RETURN count_value;
END;
$$;

-- Function to get count of pending custom orders
CREATE OR REPLACE FUNCTION get_pending_custom_orders_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_value integer;
BEGIN
  SELECT COUNT(*) 
  FROM custom_orders 
  WHERE status = 'pending'
  INTO count_value;
  
  RETURN count_value;
END;
$$;
