-- supabase/migrations/20250414234100_create_chat_rls_policies.sql

-- Policy: Users can select their own messages (sent or received)
CREATE POLICY "Allow users to select their own messages"
ON public.chat_messages
FOR SELECT
USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Policy: Users can insert messages where they are the sender
CREATE POLICY "Allow users to insert their own messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
);

-- Policy: Admins can select all messages
-- Assumes an 'is_admin' function exists or a custom claim 'is_admin' is set in JWT
-- Adjust the condition based on your admin identification method
CREATE POLICY "Allow admins to select all messages"
ON public.chat_messages
FOR SELECT
USING (
    -- Example: Check for a custom claim (adjust as needed)
    -- auth.jwt() ->> 'app_metadata' ->> 'is_admin' = 'true'
    -- Example: Check using a function (adjust as needed)
    public.is_admin(auth.uid()) -- Replace with your actual admin check function
);

-- Policy: Admins can insert messages (acting as admin)
-- This might need refinement depending on how admin messages are identified
CREATE POLICY "Allow admins to insert messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
    public.is_admin(auth.uid()) -- Replace with your actual admin check function
);

-- Optional: Policy to allow users/admins to update the 'read_at' status
-- CREATE POLICY "Allow users/admins to mark messages as read"
-- ON public.chat_messages
-- FOR UPDATE
-- USING (auth.uid() = recipient_id) -- Allow recipient to mark as read
-- WITH CHECK (true); -- Allow updating only specific columns if needed

-- Optional: Policy to allow deletion (consider carefully)
-- CREATE POLICY "Allow admins to delete messages"
-- ON public.chat_messages
-- FOR DELETE
-- USING (public.is_admin(auth.uid()));