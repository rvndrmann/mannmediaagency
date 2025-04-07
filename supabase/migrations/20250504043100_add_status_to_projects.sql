-- Add status column to canvas_projects table
ALTER TABLE public.canvas_projects
ADD COLUMN status TEXT DEFAULT 'draft';

-- Optional: Add a comment to the column
COMMENT ON COLUMN public.canvas_projects.status IS 'Tracks the current status of the project (e.g., draft, in_progress, completed)';