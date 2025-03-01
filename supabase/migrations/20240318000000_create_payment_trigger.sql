
-- Create function to update user credits when payment is successful
CREATE OR REPLACE FUNCTION public.update_user_credits_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  credit_amount INTEGER;
  current_credits INTEGER;
  new_credits INTEGER;
  log_data JSONB;
BEGIN
  -- Determine credit amount based on payment amount
  CASE 
    WHEN NEW.amount = 299 THEN credit_amount := 10;  -- BASIC plan
    WHEN NEW.amount = 2499 THEN credit_amount := 100;  -- PRO plan
    ELSE credit_amount := 0;
  END CASE;

  -- Create log data
  log_data := jsonb_build_object(
    'transaction_id', NEW.transaction_id,
    'user_id', NEW.user_id,
    'amount', NEW.amount,
    'status', NEW.status,
    'payment_status', NEW.payment_status,
    'credit_amount', credit_amount,
    'timestamp', NOW()
  );

  -- Log the attempt
  INSERT INTO public.audit_logs (
    event_type,
    data
  ) VALUES (
    'credit_update_attempt',
    log_data
  );

  -- Only proceed if this is a successful payment
  IF NEW.status = 'completed' AND NEW.payment_status = 'success' AND 
     (OLD.status != 'completed' OR OLD.payment_status != 'success') THEN
    
    -- Get current credits
    SELECT credits_remaining INTO current_credits
    FROM public.user_credits
    WHERE user_id = NEW.user_id;

    -- Calculate new credits
    new_credits := COALESCE(current_credits, 0) + credit_amount;

    -- Update user credits
    UPDATE public.user_credits
    SET 
      credits_remaining = new_credits,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;

    -- Log the credit update
    INSERT INTO public.credit_update_logs (
      user_id,
      credits_before,
      credits_after,
      plan_name,
      status,
      trigger_source
    ) VALUES (
      NEW.user_id,
      current_credits,
      new_credits,
      CASE 
        WHEN NEW.amount = 299 THEN 'BASIC'
        WHEN NEW.amount = 2499 THEN 'PRO'
        ELSE 'UNKNOWN'
      END,
      'success',
      'payment_trigger'
    );

    -- Log successful update
    INSERT INTO public.audit_logs (
      event_type,
      data
    ) VALUES (
      'credit_update_success',
      log_data || jsonb_build_object(
        'credits_before', current_credits,
        'credits_after', new_credits,
        'credits_added', credit_amount
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to execute the function
DROP TRIGGER IF EXISTS on_payment_status_change ON public.payment_transactions;
CREATE TRIGGER on_payment_status_change
  AFTER UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credits_on_payment();

