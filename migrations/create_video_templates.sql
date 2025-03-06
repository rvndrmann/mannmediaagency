
-- Create video_templates table
CREATE TABLE IF NOT EXISTS public.video_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  credits_cost NUMERIC NOT NULL DEFAULT 1,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  duration TEXT NOT NULL DEFAULT '5',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert some example templates
INSERT INTO public.video_templates 
  (name, description, thumbnail_url, prompt_template, credits_cost, aspect_ratio, duration, is_active)
VALUES
  (
    'Product Showcase - Elegant', 
    'An elegant, smooth showcase of your product with a gentle rotation and zoom', 
    'https://lmdghxapxkufwsrxfvke.supabase.co/storage/v1/object/public/templates/elegant-showcase.jpg', 
    'Smooth, cinematic showcase of the product with elegant lighting, gentle camera movement, slow rotation, professional product photography style',
    1,
    '16:9',
    '5',
    true
  ),
  (
    'Product in Action', 
    'Show your product being used in a realistic environment', 
    'https://lmdghxapxkufwsrxfvke.supabase.co/storage/v1/object/public/templates/product-in-action.jpg', 
    'Realistic animation showing the product being used in a natural environment, with people interacting with it, smooth transitions, lifestyle product video',
    1,
    '16:9',
    '5',
    true
  ),
  (
    'Luxury Product Display', 
    'Luxury-style product display with dramatic lighting', 
    'https://lmdghxapxkufwsrxfvke.supabase.co/storage/v1/object/public/templates/luxury-display.jpg', 
    'Luxury product animation with dramatic lighting, slow motion, high contrast, elegant shadows, golden hour lighting, premium feel',
    1,
    '16:9',
    '5',
    true
  ),
  (
    'Tech Product Unboxing', 
    'Simulates unboxing experience for tech products', 
    'https://lmdghxapxkufwsrxfvke.supabase.co/storage/v1/object/public/templates/tech-unboxing.jpg', 
    'Technical product unboxing animation, clean white background, precision movements, detailed focus on product features, sleek and modern appearance',
    1,
    '16:9',
    '5',
    true
  ),
  (
    'Social Media Story', 
    'Vertical video perfect for Instagram/TikTok stories', 
    'https://lmdghxapxkufwsrxfvke.supabase.co/storage/v1/object/public/templates/social-media-story.jpg', 
    'Vibrant social media style animation, energetic camera movement, quick transitions, colorful atmosphere, trendy and eye-catching',
    1,
    '9:16',
    '5',
    true
  ),
  (
    'Nature Background', 
    'Display product in natural/outdoor setting', 
    'https://lmdghxapxkufwsrxfvke.supabase.co/storage/v1/object/public/templates/nature-background.jpg', 
    'Product showcased in a beautiful natural environment, gentle breeze, sunlight filtering through leaves, organic movements, relaxing atmosphere',
    1,
    '16:9',
    '5',
    true
  ),
  (
    'Square Product Showcase', 
    'Square format perfect for social media feeds', 
    'https://lmdghxapxkufwsrxfvke.supabase.co/storage/v1/object/public/templates/square-showcase.jpg', 
    'Clean, minimal product animation on a subtle background, gentle rotation, soft shadows, balanced composition, perfect for social media',
    1,
    '1:1',
    '5',
    true
  ),
  (
    'Futuristic Display', 
    'High-tech futuristic style with digital elements', 
    'https://lmdghxapxkufwsrxfvke.supabase.co/storage/v1/object/public/templates/futuristic-display.jpg', 
    'Futuristic product animation with digital interface elements, holographic effects, technical glows, sleek movements, high-tech atmosphere',
    1,
    '16:9',
    '5',
    true
  );

-- Add appropriate indexes
CREATE INDEX IF NOT EXISTS idx_video_templates_is_active ON public.video_templates (is_active);
