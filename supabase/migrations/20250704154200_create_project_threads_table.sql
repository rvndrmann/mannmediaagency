-- Migration file: supabase/migrations/20250704154200_create_project_threads_table.sql

-- 1. Create the project_threads table
CREATE TABLE public.project_threads (
    project_id uuid NOT NULL REFERENCES public.canvas_projects(id) ON DELETE CASCADE,
    openai_thread_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_threads_pkey PRIMARY KEY (project_id) -- Ensure one thread per project
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE public.project_threads IS 'Stores the mapping between a canvas project and its associated OpenAI Assistant thread ID for persistent chat history.';
COMMENT ON COLUMN public.project_threads.project_id IS 'Foreign key referencing the canvas project.';
COMMENT ON COLUMN public.project_threads.openai_thread_id IS 'The unique identifier for the OpenAI Assistant thread.';
COMMENT ON COLUMN public.project_threads.created_at IS 'Timestamp when the thread mapping was first created.';
COMMENT ON COLUMN public.project_threads.updated_at IS 'Timestamp when the thread mapping was last updated.';


-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.project_threads ENABLE ROW LEVEL SECURITY;

-- Grant usage permissions for the table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_threads TO authenticated;


-- 3. Define RLS Policies

-- Policy: Allow authenticated users to SELECT their own project's thread ID
CREATE POLICY "Allow select for project members"
ON public.project_threads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.canvas_projects cp
    WHERE cp.id = project_threads.project_id
      AND cp.user_id = auth.uid() -- Assuming canvas_projects has a user_id column linking to the owner
  )
);

-- Policy: Allow authenticated users to INSERT a thread ID for their own projects
-- Needed when the orchestrator saves a newly created thread ID.
-- Assumes the function runs with the user's permissions or uses service_role bypass.
-- If using service_role bypass in the function, this policy might be less critical for INSERT,
-- but it's good practice if direct inserts were ever needed or function permissions change.
CREATE POLICY "Allow insert for project members"
ON public.project_threads
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.canvas_projects cp
    WHERE cp.id = project_threads.project_id
      AND cp.user_id = auth.uid()
  )
);

-- Policy: Allow authenticated users to UPDATE the thread ID for their own projects
-- Needed for the ON CONFLICT DO UPDATE clause if the function uses user permissions.
CREATE POLICY "Allow update for project members"
ON public.project_threads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.canvas_projects cp
    WHERE cp.id = project_threads.project_id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.canvas_projects cp
    WHERE cp.id = project_threads.project_id
      AND cp.user_id = auth.uid()
  )
);

-- Note: No DELETE policy for authenticated users by default. Deletion might be handled differently.

-- Policy: Allow full access for service_role (used by Supabase Edge Functions)
CREATE POLICY "Allow full access for service role"
ON public.project_threads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);