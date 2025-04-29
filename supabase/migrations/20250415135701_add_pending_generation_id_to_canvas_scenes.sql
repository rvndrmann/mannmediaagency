-- Add a column to store the pending Leonardo.ai generation ID
ALTER TABLE public.canvas_scenes
ADD COLUMN pending_generation_id TEXT NULL;

-- Optional: Add an index if you anticipate querying by this ID frequently
-- CREATE INDEX idx_canvas_scenes_pending_generation_id ON public.canvas_scenes (pending_generation_id);