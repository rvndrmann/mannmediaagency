-- Add image_guidance_settings column to canvas_scenes table
ALTER TABLE public.canvas_scenes
ADD COLUMN image_guidance_settings JSONB;

-- Optional: Add a comment to the column for clarity
COMMENT ON COLUMN public.canvas_scenes.image_guidance_settings IS 'Stores Leonardo.ai Image Guidance settings (ControlNets, init_strength, etc.) as JSON';