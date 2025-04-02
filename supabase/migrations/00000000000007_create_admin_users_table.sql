-- Migration to create the admin_users table

-- Create the table to store admin user IDs
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.admin_users IS 'Stores the user IDs of administrators.';
COMMENT ON COLUMN public.admin_users.user_id IS 'Foreign key referencing the user in auth.users.';
COMMENT ON COLUMN public.admin_users.created_at IS 'Timestamp when the user was designated as an admin.';

-- Optional: Enable RLS on the admin_users table itself
-- Although check_is_admin uses SECURITY DEFINER, it's good practice.
-- Admins should be able to see who else is an admin.
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admins to see the list of admins
DROP POLICY IF EXISTS "Allow admins to view admin users" ON public.admin_users;
CREATE POLICY "Allow admins to view admin users"
ON public.admin_users
FOR SELECT
USING (check_is_admin()); -- Reuse the same function

-- Note: Inserting users into this table currently requires bypassing RLS
-- (e.g., using the service_role key) or creating a specific INSERT policy
-- or a SECURITY DEFINER function for adding admins.