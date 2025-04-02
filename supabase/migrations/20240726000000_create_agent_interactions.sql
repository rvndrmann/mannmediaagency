
-- Create a table to store agent interactions
CREATE TABLE IF NOT EXISTS public.agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  agent_type TEXT NOT NULL,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Add RLS policies
ALTER TABLE public.agent_interactions ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own interactions
DROP POLICY IF EXISTS "Users can view their own agent interactions" ON public.agent_interactions;
CREATE POLICY "Users can view their own agent interactions"
  ON public.agent_interactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Only allow users to insert their own interactions
DROP POLICY IF EXISTS "Users can create their own agent interactions" ON public.agent_interactions;
CREATE POLICY "Users can create their own agent interactions"
  ON public.agent_interactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS agent_interactions_user_id_idx ON public.agent_interactions (user_id);
CREATE INDEX IF NOT EXISTS agent_interactions_agent_type_idx ON public.agent_interactions (agent_type);
CREATE INDEX IF NOT EXISTS agent_interactions_timestamp_idx ON public.agent_interactions (timestamp);
