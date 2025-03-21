
-- Update the handle_new_user_credits function to give 0 credits instead of 10
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
    default_credits numeric;
begin
    -- Get default credits from system settings
    select (value->>'value')::numeric into default_credits
    from public.system_settings
    where key = 'new_user_credits';

    -- Use default credits or fallback to 0 if setting doesn't exist (changed from 1)
    insert into public.user_credits (user_id, credits_remaining)
    values (NEW.id, COALESCE(default_credits, 0));
    
    return NEW;
end;
$$;
