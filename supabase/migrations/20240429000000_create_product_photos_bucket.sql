
-- Create product-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true);

-- Allow authenticated users to upload files to the product-photos bucket
CREATE POLICY "Allow authenticated users to upload product photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read files from the product-photos bucket
CREATE POLICY "Allow authenticated users to read product photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-photos' 
  AND auth.role() = 'authenticated'
);
