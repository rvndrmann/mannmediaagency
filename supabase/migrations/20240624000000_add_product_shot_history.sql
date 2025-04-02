
-- Create product_shot_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.product_shot_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source_image_url TEXT NOT NULL,
  result_image_url TEXT NOT NULL,
  prompt TEXT,
  settings JSONB,
  visibility TEXT DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_product_shot_history_user_id ON public.product_shot_history(user_id);
CREATE INDEX IF NOT EXISTS idx_product_shot_history_visibility ON public.product_shot_history(visibility);

-- Create RLS policies for product_shot_history table

-- Allow users to view their own shots
DROP POLICY IF EXISTS "Users can view their own product shots" ON public.product_shot_history;
CREATE POLICY "Users can view their own product shots"
ON public.product_shot_history 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Allow users to create their own shots
DROP POLICY IF EXISTS "Users can create their own product shots" ON public.product_shot_history;
CREATE POLICY "Users can create their own product shots"
ON public.product_shot_history 
FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own shots
DROP POLICY IF EXISTS "Users can update their own product shots" ON public.product_shot_history;
CREATE POLICY "Users can update their own product shots"
ON public.product_shot_history 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own shots
DROP POLICY IF EXISTS "Users can delete their own product shots" ON public.product_shot_history;
CREATE POLICY "Users can delete their own product shots"
ON public.product_shot_history 
FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

-- Enable RLS on the table
ALTER TABLE public.product_shot_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to see public shots
DROP POLICY IF EXISTS "Anyone can view public product shots" ON public.product_shot_history;
CREATE POLICY "Anyone can view public product shots"
ON public.product_shot_history 
FOR SELECT 
TO authenticated 
USING (visibility = 'public');
