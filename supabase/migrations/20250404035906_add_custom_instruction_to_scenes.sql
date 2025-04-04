-- Add a new text column to store custom instructions for image prompt generation
ALTER TABLE public.canvas_scenes
ADD COLUMN custom_instruction TEXT;

-- Optional: Add a comment to the column for clarity
COMMENT ON COLUMN public.canvas_scenes.custom_instruction IS 'Stores user-provided custom instructions for AI image prompt generation for this specific scene.';