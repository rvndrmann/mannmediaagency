
-- Add row level security policies to default_product_images table
ALTER TABLE default_product_images ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their own default images
CREATE POLICY "Users can view their own default images"
ON default_product_images FOR SELECT
USING (auth.uid() = user_id);

-- Policy for users to create their own default images
CREATE POLICY "Users can create their own default images"
ON default_product_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own default images
CREATE POLICY "Users can update their own default images"
ON default_product_images FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for users to delete their own default images
CREATE POLICY "Users can delete their own default images"
ON default_product_images FOR DELETE
USING (auth.uid() = user_id);
