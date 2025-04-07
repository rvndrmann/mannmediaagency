-- Function to increment user credits atomically (e.g., for refunds).
-- Returns true if successful, false if user not found.

CREATE OR REPLACE FUNCTION increment_user_credits(user_id_param uuid, amount int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Important for allowing the function to update the table
AS $$
DECLARE
  success boolean := false;
BEGIN
  -- Lock the row for the specific user to prevent race conditions
  -- We still lock even for incrementing to maintain consistency if other operations exist
  PERFORM 1 FROM public.user_credits WHERE user_id = user_id_param FOR UPDATE;

  -- Check if the user was found
  IF FOUND THEN
    -- Increment the credits
    UPDATE public.user_credits
    SET credits_remaining = credits_remaining + amount
    WHERE user_id = user_id_param;
    success := true;
  ELSE
    -- User not found
    success := false;
  END IF;

  RETURN success;
END;
$$;

-- Grant execute permission to the authenticated role (or service_role if called from backend functions)
GRANT EXECUTE ON FUNCTION public.increment_user_credits(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_user_credits(uuid, int) TO authenticated;