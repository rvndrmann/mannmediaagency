-- Placeholder migration to create payment_transactions table
-- Adjust columns and types based on your actual schema if known

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    amount numeric,
    currency text,
    status text, -- Consider using an ENUM type if applicable
    provider text, -- e.g., 'stripe', 'paypal'
    provider_transaction_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Optional: Add indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- Ensure the column exists before creating the index, in case the table was created partially before
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS provider_transaction_id text;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_id ON public.payment_transactions(provider_transaction_id);

-- Optional: Enable RLS if needed
-- ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
-- Add RLS policies here if enabled