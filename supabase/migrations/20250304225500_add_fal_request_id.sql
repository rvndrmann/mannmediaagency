-- Add fal_request_id column to track fal.ai queue jobs

ALTER TABLE public.agent_image_generation_jobs
ADD COLUMN fal_request_id TEXT NULL;

COMMENT ON COLUMN public.agent_image_generation_jobs.fal_request_id IS 'Request ID returned by fal.ai queue submission';

-- Optional: Add index if you plan to query by this ID frequently
-- CREATE INDEX idx_image_generation_jobs_fal_request_id ON public.image_generation_jobs(fal_request_id);