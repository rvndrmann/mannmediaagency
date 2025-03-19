
-- Create a table for browser automation tasks
CREATE TABLE IF NOT EXISTS public.browser_automation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  input TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  current_url TEXT,
  output TEXT,
  browser_task_id TEXT,
  live_url TEXT,
  browser_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create a table for storing browser automation steps
CREATE TABLE IF NOT EXISTS public.browser_automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.browser_automation_tasks NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  details TEXT,
  screenshot TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS) to ensure users can only see their own data
ALTER TABLE public.browser_automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_automation_steps ENABLE ROW LEVEL SECURITY;

-- Create policies for browser_automation_tasks
CREATE POLICY "Users can view their own browser tasks" 
  ON public.browser_automation_tasks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own browser tasks" 
  ON public.browser_automation_tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own browser tasks" 
  ON public.browser_automation_tasks 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policies for browser_automation_steps
CREATE POLICY "Users can view their own browser steps" 
  ON public.browser_automation_steps 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.browser_automation_tasks 
      WHERE id = task_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert browser steps for their tasks" 
  ON public.browser_automation_steps 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.browser_automation_tasks 
      WHERE id = task_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own browser steps" 
  ON public.browser_automation_steps 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.browser_automation_tasks 
      WHERE id = task_id AND user_id = auth.uid()
    )
  );

-- Add trigger to update timestamp
CREATE TRIGGER set_browser_automation_tasks_updated_at
BEFORE UPDATE ON public.browser_automation_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
