-- Add fullScript column to canvas_projects table
ALTER TABLE public.canvas_projects 
ADD COLUMN IF NOT EXISTS "fullScript" TEXT; 
-- Note: Using quotes around "fullScript" to preserve camelCase, matching the frontend code.