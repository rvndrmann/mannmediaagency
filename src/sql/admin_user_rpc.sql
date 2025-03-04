
-- Function to get all admin users
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS SETOF admin_users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM admin_users;
END;
$$;

-- Function to add an admin user
CREATE OR REPLACE FUNCTION add_admin_user(admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_users (user_id)
  VALUES (admin_user_id);
END;
$$;

-- Function to remove an admin user
CREATE OR REPLACE FUNCTION remove_admin_user(admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM admin_users
  WHERE user_id = admin_user_id;
END;
$$;
