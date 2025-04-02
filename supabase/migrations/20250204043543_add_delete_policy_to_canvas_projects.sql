-- Enable Row Level Security if not already enabled
-- Note: Policies are only enforced if RLS is enabled.
-- If RLS is already enabled, this command does nothing.
ALTER TABLE public.canvas_projects ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated users to delete their own projects" ON public.canvas_projects;

-- Create policy: Allow users to delete their own canvas_projects
CREATE POLICY "Allow authenticated users to delete their own projects"
ON public.canvas_projects
FOR DELETE
TO authenticated -- Apply to logged-in users
USING ( auth.uid() = user_id ); -- Check if the user's ID matches the project's user_id