
-- Create a table for Manus sessions
CREATE TABLE IF NOT EXISTS public.manus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  task TEXT NOT NULL,
  environment TEXT NOT NULL,
  current_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  api_key TEXT, -- Note: Consider encrypting this in a production environment
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create a table for storing action history
CREATE TABLE IF NOT EXISTS public.manus_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.manus_sessions NOT NULL,
  action JSONB NOT NULL,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  screenshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Add Row Level Security (RLS) to ensure users can only see their own data
ALTER TABLE public.manus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manus_action_history ENABLE ROW LEVEL SECURITY;

-- Create policies for manus_sessions
CREATE POLICY "Users can view their own sessions" 
  ON public.manus_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
  ON public.manus_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
  ON public.manus_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policies for manus_action_history
CREATE POLICY "Users can view their own action history" 
  ON public.manus_action_history 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.manus_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert action history for their sessions" 
  ON public.manus_action_history 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.manus_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own action history" 
  ON public.manus_action_history 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.manus_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Add triggers to update timestamps
CREATE TRIGGER set_manus_sessions_updated_at
BEFORE UPDATE ON public.manus_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
