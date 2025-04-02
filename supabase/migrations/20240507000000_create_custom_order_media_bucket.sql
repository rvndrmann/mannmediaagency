
-- Create custom-order-media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-order-media', 'custom-order-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to the custom-order-media bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload custom order media" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload custom order media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'custom-order-media'
);

-- Allow authenticated users to read files from the custom-order-media bucket
DROP POLICY IF EXISTS "Allow authenticated users to read custom order media" ON storage.objects;
CREATE POLICY "Allow authenticated users to read custom order media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'custom-order-media'
);

-- Allow authenticated users to update files in the custom-order-media bucket
DROP POLICY IF EXISTS "Allow authenticated users to update custom order media" ON storage.objects;
CREATE POLICY "Allow authenticated users to update custom order media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'custom-order-media'
);

-- Allow authenticated users to delete files from the custom-order-media bucket
DROP POLICY IF EXISTS "Allow authenticated users to delete custom order media" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete custom order media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'custom-order-media'
);
