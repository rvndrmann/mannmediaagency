-- Create default_product_images table
CREATE TABLE IF NOT EXISTS public.default_product_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
    -- Add other columns if necessary based on application logic
);

-- Optional: Add indexes
CREATE INDEX IF NOT EXISTS idx_default_product_images_user_id ON public.default_product_images(user_id);

-- Add comment for clarity
COMMENT ON TABLE public.default_product_images IS 'Stores default product images uploaded or selected by users.';