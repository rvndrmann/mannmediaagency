
-- Add voice_over_text column to canvas_scenes table
ALTER TABLE canvas_scenes 
ADD COLUMN IF NOT EXISTS voice_over_text TEXT;
