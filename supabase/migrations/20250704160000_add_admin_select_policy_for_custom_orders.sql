-- Migration: Ensure admins have SELECT access to all custom orders

-- Enable RLS on custom_orders if not already enabled
-- It's safe to run this even if RLS is already enabled.
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing admin select policy if it exists, to avoid conflicts
DROP POLICY IF EXISTS "Allow admins full access to custom orders" ON public.custom_orders;
DROP POLICY IF EXISTS "Allow admins select access to custom orders" ON public.custom_orders; -- Check common variations

-- Create policy granting SELECT access to admins
-- Assumes the check_is_admin() function exists and works correctly.
CREATE POLICY "Allow admins select access to custom orders"
ON public.custom_orders
FOR SELECT
USING (public.check_is_admin());

-- Note: This only grants SELECT access. Admins might need separate policies
-- for INSERT, UPDATE, DELETE if they perform those actions directly on the table.
-- Also ensure regular users have appropriate policies (e.g., select their own orders).