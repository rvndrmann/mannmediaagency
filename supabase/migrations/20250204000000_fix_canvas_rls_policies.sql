-- Enable RLS for canvas_projects if not already enabled
ALTER TABLE public.canvas_projects ENABLE ROW LEVEL SECURITY;

-- Policies for canvas_projects
-- 1. Allow users to view their own projects
DROP POLICY IF EXISTS "Users can view their own projects" ON public.canvas_projects;
CREATE POLICY "Users can view their own projects"
  ON public.canvas_projects FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Allow users to insert new projects for themselves
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.canvas_projects;
CREATE POLICY "Users can insert their own projects"
  ON public.canvas_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to update their own projects
DROP POLICY IF EXISTS "Users can update their own projects" ON public.canvas_projects;
CREATE POLICY "Users can update their own projects"
  ON public.canvas_projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to delete their own projects
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.canvas_projects;
CREATE POLICY "Users can delete their own projects"
  ON public.canvas_projects FOR DELETE
  USING (auth.uid() = user_id);


-- Enable RLS for canvas_scenes if not already enabled
ALTER TABLE public.canvas_scenes ENABLE ROW LEVEL SECURITY;

-- Policies for canvas_scenes
-- 1. Allow users to view scenes belonging to their projects
DROP POLICY IF EXISTS "Users can view scenes for their projects" ON public.canvas_scenes;
CREATE POLICY "Users can view scenes for their projects"
  ON public.canvas_scenes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.canvas_projects p
      WHERE p.id = canvas_scenes.project_id AND p.user_id = auth.uid()
    )
  );

-- 2. Allow users to insert scenes into their own projects
DROP POLICY IF EXISTS "Users can insert scenes for their projects" ON public.canvas_scenes;
CREATE POLICY "Users can insert scenes for their projects"
  ON public.canvas_scenes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.canvas_projects p
      WHERE p.id = canvas_scenes.project_id AND p.user_id = auth.uid()
    )
  );

-- 3. Allow users to update scenes belonging to their projects
DROP POLICY IF EXISTS "Users can update scenes for their projects" ON public.canvas_scenes;
CREATE POLICY "Users can update scenes for their projects"
  ON public.canvas_scenes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.canvas_projects p
      WHERE p.id = canvas_scenes.project_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.canvas_projects p
      WHERE p.id = canvas_scenes.project_id AND p.user_id = auth.uid()
    )
  );

-- 4. Allow users to delete scenes belonging to their projects
DROP POLICY IF EXISTS "Users can delete scenes for their projects" ON public.canvas_scenes;
CREATE POLICY "Users can delete scenes for their projects"
  ON public.canvas_scenes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.canvas_projects p
      WHERE p.id = canvas_scenes.project_id AND p.user_id = auth.uid()
    )
  );