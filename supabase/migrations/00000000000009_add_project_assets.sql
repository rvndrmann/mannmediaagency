-- Add project_assets column to store multiple asset URLs and types
ALTER TABLE public.canvas_projects
ADD COLUMN project_assets JSONB DEFAULT '[]'::jsonb;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.canvas_projects.project_assets IS 'Stores an array of project-level assets, e.g., [{ "url": "...", "type": "image", "name": "..." }, ...]';

-- Note: Ensure RLS policies allow users to update this column for their own projects.
-- If existing policies are insufficient, add a specific update policy. Example:
-- CREATE POLICY "Allow users to update their own project assets"
-- ON public.canvas_projects
-- FOR UPDATE USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);
-- Check your existing policies in 00000000000000_create_rls_policies.sql first.

-- Explicitly grant update permission on the new column for authenticated users
GRANT UPDATE (project_assets) ON public.canvas_projects TO authenticated;