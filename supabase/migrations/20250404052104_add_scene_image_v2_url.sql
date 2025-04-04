-- Add scene_image_v2_url column to canvas_scenes table
ALTER TABLE public.canvas_scenes
ADD COLUMN IF NOT EXISTS scene_image_v2_url TEXT; -- Add IF NOT EXISTS