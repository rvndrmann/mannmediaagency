-- Drop the existing foreign key constraint if it exists
-- Ensures idempotency if the migration is run multiple times
ALTER TABLE public.canvas_scenes
DROP CONSTRAINT IF EXISTS canvas_scenes_project_id_fkey;

-- Add the new foreign key constraint with ON DELETE CASCADE
-- This ensures that when a project is deleted, all its associated scenes are also deleted.
ALTER TABLE public.canvas_scenes
ADD CONSTRAINT canvas_scenes_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES public.canvas_projects (id)
ON DELETE CASCADE;