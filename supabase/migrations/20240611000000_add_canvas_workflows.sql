
-- Create enum for workflow stage
CREATE TYPE public.workflow_stage AS ENUM (
  'script_generation',
  'scene_splitting',
  'image_generation',
  'scene_description',
  'video_generation',
  'final_assembly'
);

-- Create enum for workflow status
CREATE TYPE public.workflow_status AS ENUM (
  'in_progress',
  'completed',
  'failed'
);

-- Create table for canvas workflows
CREATE TABLE IF NOT EXISTS public.canvas_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.canvas_projects(id) ON DELETE CASCADE,
  current_stage workflow_stage NOT NULL DEFAULT 'script_generation'::workflow_stage,
  completed_stages workflow_stage[] NOT NULL DEFAULT '{}',
  scene_statuses JSONB NOT NULL DEFAULT '{}'::jsonb,
  status workflow_status NOT NULL DEFAULT 'in_progress'::workflow_status,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Create a unique constraint on project_id to ensure one workflow per project
  CONSTRAINT canvas_workflows_project_id_unique UNIQUE (project_id)
);

-- Create RLS policies for canvas_workflows
ALTER TABLE public.canvas_workflows ENABLE ROW LEVEL SECURITY;

-- Get the user_id from canvas_projects to check ownership
CREATE POLICY "Users can view their own project workflows" 
  ON public.canvas_workflows 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.canvas_projects 
      WHERE canvas_projects.id = canvas_workflows.project_id 
      AND canvas_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workflows for their own projects" 
  ON public.canvas_workflows 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.canvas_projects 
      WHERE canvas_projects.id = canvas_workflows.project_id 
      AND canvas_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own project workflows" 
  ON public.canvas_workflows 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.canvas_projects 
      WHERE canvas_projects.id = canvas_workflows.project_id 
      AND canvas_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own project workflows" 
  ON public.canvas_workflows 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.canvas_projects 
      WHERE canvas_projects.id = canvas_workflows.project_id 
      AND canvas_projects.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at automatically
CREATE TRIGGER update_canvas_workflows_timestamp
BEFORE UPDATE ON public.canvas_workflows
FOR EACH ROW
EXECUTE FUNCTION update_canvas_timestamps();

-- Add final_video_url column to canvas_projects
ALTER TABLE public.canvas_projects
ADD COLUMN IF NOT EXISTS final_video_url TEXT;
