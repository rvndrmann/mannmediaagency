-- Migration script to create tables for agent chat sessions and generation jobs

-- 1. chat_sessions table
CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.canvas_projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to user
    openai_thread_id text, -- Store the OpenAI thread ID
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chat_sessions_project_id_unique UNIQUE (project_id) -- Ensure one session per project
);

-- Add indexes
CREATE INDEX idx_chat_sessions_project_id ON public.chat_sessions(project_id);
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Example: User can manage their own sessions via project ownership)
-- Assumes canvas_projects has RLS allowing users to select their own projects.
CREATE POLICY "Allow ALL for users based on project ownership"
ON public.chat_sessions
FOR ALL
USING (
    auth.uid() = (
        SELECT user_id FROM public.canvas_projects WHERE id = chat_sessions.project_id
    )
)
WITH CHECK (
    auth.uid() = (
        SELECT user_id FROM public.canvas_projects WHERE id = chat_sessions.project_id
    )
);


-- 2. agent_image_generation_jobs table (for agent/canvas workflow)
CREATE TABLE public.agent_image_generation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    scene_id uuid NOT NULL REFERENCES public.canvas_scenes(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to user
    prompt text NOT NULL,
    product_image_url text, -- URL of the input product image
    version text, -- e.g., 'v1', 'v2'
    status text DEFAULT 'pending'::text NOT NULL, -- e.g., pending, processing, completed, failed
    result_url text, -- URL of the generated image
    error_message text, -- Store error details if failed
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_agent_image_generation_jobs_scene_id ON public.agent_image_generation_jobs(scene_id);
CREATE INDEX idx_agent_image_generation_jobs_user_id ON public.agent_image_generation_jobs(user_id);
CREATE INDEX idx_agent_image_generation_jobs_status ON public.agent_image_generation_jobs(status);

-- Enable RLS
ALTER TABLE public.agent_image_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Example: User can manage jobs related to their scenes/projects)
-- Assumes canvas_scenes has RLS allowing users select/insert based on project ownership.
CREATE POLICY "Allow ALL image jobs for users based on scene ownership"
ON public.agent_image_generation_jobs
FOR ALL
USING (
    auth.uid() = (
        SELECT cp.user_id 
        FROM public.canvas_scenes cs
        JOIN public.canvas_projects cp ON cs.project_id = cp.id
        WHERE cs.id = agent_image_generation_jobs.scene_id
    )
)
WITH CHECK (
     auth.uid() = (
        SELECT cp.user_id 
        FROM public.canvas_scenes cs
        JOIN public.canvas_projects cp ON cs.project_id = cp.id
        WHERE cs.id = agent_image_generation_jobs.scene_id
    )
);


-- 3. agent_video_generation_jobs table (for agent/canvas workflow)
CREATE TABLE public.agent_video_generation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    scene_id uuid NOT NULL REFERENCES public.canvas_scenes(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to user
    image_url text NOT NULL, -- Input image URL
    description text, -- Input description (optional)
    status text DEFAULT 'pending'::text NOT NULL, -- e.g., pending, processing, completed, failed
    result_url text, -- URL of the generated video
    error_message text, -- Store error details if failed
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX idx_agent_video_generation_jobs_scene_id ON public.agent_video_generation_jobs(scene_id);
CREATE INDEX idx_agent_video_generation_jobs_user_id ON public.agent_video_generation_jobs(user_id);
CREATE INDEX idx_agent_video_generation_jobs_status ON public.agent_video_generation_jobs(status);

-- Enable RLS
ALTER TABLE public.agent_video_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Example: User can manage jobs related to their scenes/projects)
CREATE POLICY "Allow ALL video jobs for users based on scene ownership"
ON public.agent_video_generation_jobs
FOR ALL
USING (
    auth.uid() = (
        SELECT cp.user_id 
        FROM public.canvas_scenes cs
        JOIN public.canvas_projects cp ON cs.project_id = cp.id
        WHERE cs.id = agent_video_generation_jobs.scene_id
    )
)
WITH CHECK (
     auth.uid() = (
        SELECT cp.user_id 
        FROM public.canvas_scenes cs
        JOIN public.canvas_projects cp ON cs.project_id = cp.id
        WHERE cs.id = agent_video_generation_jobs.scene_id
    )
);

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc', now()); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for chat_sessions
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.chat_sessions 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Triggers for agent_image_generation_jobs
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agent_image_generation_jobs
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Triggers for agent_video_generation_jobs
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.agent_video_generation_jobs
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();