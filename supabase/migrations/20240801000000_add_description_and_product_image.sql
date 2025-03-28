
-- Add description and product_image_url fields to canvas_scenes table
ALTER TABLE canvas_scenes 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS product_image_url TEXT;

