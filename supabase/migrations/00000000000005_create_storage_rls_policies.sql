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