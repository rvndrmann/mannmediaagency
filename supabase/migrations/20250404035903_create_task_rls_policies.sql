-- RLS Policies for 'tasks' table

-- Drop existing policies first (best practice for idempotency)
DROP POLICY IF EXISTS "Allow admin full access" ON public.tasks;
DROP POLICY IF EXISTS "Allow assigned user read access" ON public.tasks; -- Old policy name
DROP POLICY IF EXISTS "Allow assigned worker read access" ON public.tasks; -- Old policy name
DROP POLICY IF EXISTS "Allow assigned user status update" ON public.tasks; -- Old policy name
DROP POLICY IF EXISTS "Allow assigned worker status update" ON public.tasks; -- Old policy name
DROP POLICY IF EXISTS "Allow admin insert access" ON public.tasks; -- Old policy name

-- 1. Admins have full access (SELECT, INSERT, UPDATE, DELETE)
-- Assumes a 'check_is_admin()' function exists that returns true if the current user is an admin.
CREATE POLICY "Allow admin full access"
ON public.tasks
FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE
USING (check_is_admin())
WITH CHECK (check_is_admin());
-- RLS Policies for 'task_submissions' table (DEPRECATED)
-- The table itself is deprecated/removed, so no policies are needed.
-- Removing attempts to drop policies on a potentially non-existent table.


-- No new policies are created for task_submissions as the table is deprecated.