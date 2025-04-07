-- Function to decrement user credits atomically, checking for sufficient balance first.
-- Returns true if successful, false otherwise.

CREATE OR REPLACE FUNCTION decrement_user_credits(user_id_param uuid, amount int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Important for allowing the function to update the table
AS $$
DECLARE
  current_credits int;
  success boolean := false;
BEGIN
  -- Lock the row for the specific user to prevent race conditions
  SELECT credits_remaining INTO current_credits FROM public.user_credits WHERE user_id = user_id_param FOR UPDATE;

  -- Check if the user was found and has enough credits
  IF FOUND AND current_credits >= amount THEN
    -- Decrement the credits
    UPDATE public.user_credits
    SET credits_remaining = credits_remaining - amount
    WHERE user_id = user_id_param;
    success := true;
  ELSE
    -- User not found or insufficient credits
    success := false;
  END IF;

  RETURN success;
END;
$$;

-- Grant execute permission to the authenticated role (or service_role if called from backend functions)
GRANT EXECUTE ON FUNCTION public.decrement_user_credits(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_user_credits(uuid, int) TO authenticated;