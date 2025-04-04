-- Storage RLS Policies for 'task-images' bucket

-- Drop existing policies first (if any)
DROP POLICY IF EXISTS "Allow admin uploads for task-images" ON storage.objects; -- Removed FOR clause
DROP POLICY IF EXISTS "Allow admin reads for task-images" ON storage.objects; -- Removed FOR clause
DROP POLICY IF EXISTS "Allow admin updates for task-images" ON storage.objects; -- Removed FOR clause
DROP POLICY IF EXISTS "Allow admin deletes for task-images" ON storage.objects; -- Removed FOR clause

-- Allow admins to upload (insert) into the 'task-images' bucket
CREATE POLICY "Allow admin uploads for task-images"
ON storage.objects FOR INSERT
TO authenticated -- Apply to logged-in users
WITH CHECK (
    bucket_id = 'task-images' AND
    check_is_admin() -- Use our existing function to check if user is admin
);

-- Allow admins to read/list files in the 'task-images' bucket (needed for management/display)
CREATE POLICY "Allow admin reads for task-images"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'task-images' AND
    check_is_admin()
);

-- Allow admins to update files if needed (e.g., metadata)
CREATE POLICY "Allow admin updates for task-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'task-images' AND
    check_is_admin()
);

-- Allow admins to delete files
CREATE POLICY "Allow admin deletes for task-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'task-images' AND
    check_is_admin()
);


-- Storage RLS Policies for 'result-images' bucket

-- Drop existing policies first (if any) - Use distinct names
DROP POLICY IF EXISTS "Allow admin uploads for result-images" ON storage.objects; -- Removed FOR clause
DROP POLICY IF EXISTS "Allow admin reads for result-images" ON storage.objects; -- Removed FOR clause
DROP POLICY IF EXISTS "Allow admin updates for result-images" ON storage.objects; -- Removed FOR clause
DROP POLICY IF EXISTS "Allow admin deletes for result-images" ON storage.objects; -- Removed FOR clause


-- Allow admins to upload (insert) into the 'result-images' bucket
CREATE POLICY "Allow admin uploads for result-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'result-images' AND
    check_is_admin()
);

-- Allow admins to read/list files in the 'result-images' bucket
CREATE POLICY "Allow admin reads for result-images"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'result-images' AND
    check_is_admin()
);

-- Allow admins to update files if needed
CREATE POLICY "Allow admin updates for result-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'result-images' AND
    check_is_admin()
);

-- Allow admins to delete files
CREATE POLICY "Allow admin deletes for result-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'result-images' AND
    check_is_admin()
);
 
 
-- Storage RLS Policies for 'lovable-uploads' bucket
 
-- Drop existing policies first (if any) - Use distinct names
DROP POLICY IF EXISTS "Allow authenticated uploads for lovable-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads for lovable-uploads" ON storage.objects;
-- Add drops for update/delete if you create those policies
 
-- Allow any authenticated user to upload (insert) into the 'lovable-uploads' bucket
CREATE POLICY "Allow authenticated uploads for lovable-uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lovable-uploads'
    -- Optionally add path restrictions here if needed, e.g.:
    -- AND storage.foldername(name) = 'public' -- Allow only in 'public' folder
    -- OR storage.foldername(name) = 'main-project-images' -- Allow in specific folder
);
 
-- Allow public read access to files in 'lovable-uploads' (common for user-uploaded content)
CREATE POLICY "Allow public reads for lovable-uploads"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'lovable-uploads'
);
 
-- NOTE: Consider adding policies for UPDATE and DELETE if needed,
-- potentially restricted to the user who uploaded the file (using owner column) or admins.