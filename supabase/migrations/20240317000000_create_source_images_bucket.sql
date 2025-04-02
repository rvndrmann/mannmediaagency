

-- Allow authenticated users to upload files to the bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'source-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read files from the bucket
DROP POLICY IF EXISTS "Allow authenticated users to read files" ON storage.objects;
CREATE POLICY "Allow authenticated users to read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'source-images' 
  AND auth.role() = 'authenticated'
);

