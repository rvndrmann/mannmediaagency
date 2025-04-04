-- Add a column to store optional text results/reports submitted by the admin

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS result_text TEXT;

COMMENT ON COLUMN public.tasks.result_text IS 'Optional text report or notes added by the admin when updating the task, often alongside the result image.';