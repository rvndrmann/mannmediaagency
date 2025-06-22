-- supabase/migrations/20250414234000_create_chat_messages_table.sql

CREATE TABLE public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content text NOT NULL,
    read_at timestamp with time zone, -- Optional: track when a message is read
    order_id uuid REFERENCES public.custom_orders(id) ON DELETE SET NULL -- Assuming custom_orders table exists with uuid primary key
);

-- Add indexes for performance
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_recipient_id ON public.chat_messages(recipient_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;