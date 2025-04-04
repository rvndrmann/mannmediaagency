-- Define the check_is_admin function
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER -- Important for accessing admin_users table within RLS
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$;

-- Grant execute permission to authenticated users so RLS policies can use it
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;