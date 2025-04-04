-- Add a column to store the Bria V2 request ID for generated images
ALTER TABLE public.canvas_scenes
ADD COLUMN bria_v2_request_id TEXT NULL;

-- Optional: Add a comment describing the new column
COMMENT ON COLUMN public.canvas_scenes.bria_v2_request_id IS 'Stores the request ID returned by the Bria V2 API when generating sceneImageV2Url.';