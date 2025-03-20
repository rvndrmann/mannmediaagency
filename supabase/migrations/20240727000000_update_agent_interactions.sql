
-- If the table doesn't exist, create it first
CREATE TABLE IF NOT EXISTS public.agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  agent_type TEXT NOT NULL,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB
);

-- Add RLS policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_interactions' 
        AND policyname = 'Users can view their own agent interactions'
    ) THEN
        CREATE POLICY "Users can view their own agent interactions" 
        ON public.agent_interactions 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_interactions' 
        AND policyname = 'Users can create their own agent interactions'
    ) THEN
        CREATE POLICY "Users can create their own agent interactions" 
        ON public.agent_interactions 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- Make sure RLS is enabled
ALTER TABLE public.agent_interactions ENABLE ROW LEVEL SECURITY;

-- Add indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS agent_interactions_user_id_idx ON public.agent_interactions (user_id);
CREATE INDEX IF NOT EXISTS agent_interactions_agent_type_idx ON public.agent_interactions (agent_type);
CREATE INDEX IF NOT EXISTS agent_interactions_timestamp_idx ON public.agent_interactions (timestamp);
