
-- Create a table for browser automation sessions
CREATE TABLE IF NOT EXISTS public.browser_automation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  task_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create a table for storing browser automation actions
CREATE TABLE IF NOT EXISTS public.browser_automation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.browser_automation_sessions NOT NULL,
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL,
  reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Add Row Level Security (RLS) to ensure users can only see their own data
ALTER TABLE public.browser_automation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_automation_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for browser_automation_sessions
CREATE POLICY "Users can view their own browser sessions" 
  ON public.browser_automation_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own browser sessions" 
  ON public.browser_automation_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own browser sessions" 
  ON public.browser_automation_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policies for browser_automation_actions
CREATE POLICY "Users can view their own browser actions" 
  ON public.browser_automation_actions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.browser_automation_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert browser actions for their sessions" 
  ON public.browser_automation_actions 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.browser_automation_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own browser actions" 
  ON public.browser_automation_actions 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.browser_automation_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Add trigger to update timestamp
CREATE TRIGGER set_browser_automation_sessions_updated_at
BEFORE UPDATE ON public.browser_automation_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
