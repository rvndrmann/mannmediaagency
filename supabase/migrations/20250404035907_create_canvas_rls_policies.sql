-- Enable RLS for canvas_projects if not already enabled (Best practice: Enable in UI first)
-- alter table public.canvas_projects enable row level security;

-- Drop existing potentially incorrect policies (applied to public role) before creating new ones
drop policy if exists "Users can view their own projects" on public.canvas_projects;
drop policy if exists "Users can create their own projects" on public.canvas_projects;
drop policy if exists "Users can update their own projects" on public.canvas_projects;
drop policy if exists "Users can delete their own projects" on public.canvas_projects;
-- Keep the existing policy applied to authenticated role if it's correct, or drop if replacing
-- drop policy if exists "Allow authenticated users to delete their own projects" on public.canvas_projects;


-- Create new policies for canvas_projects targeting authenticated users
-- Drop the policy if it already exists before creating
drop policy if exists "Allow authenticated select access" on public.canvas_projects;
create policy "Allow authenticated select access" on public.canvas_projects
  for select using (auth.uid() = user_id);

-- Drop the policy if it already exists before creating
drop policy if exists "Allow authenticated insert access" on public.canvas_projects;
create policy "Allow authenticated insert access" on public.canvas_projects
  for insert with check (auth.uid() = user_id);

-- Drop the policy if it already exists before creating
drop policy if exists "Allow authenticated update access" on public.canvas_projects;
create policy "Allow authenticated update access" on public.canvas_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- If keeping the specific authenticated delete policy from screenshot, skip this generic one
-- create policy "Allow authenticated delete access" on public.canvas_projects
--   for delete using (auth.uid() = user_id);


-- Enable RLS for canvas_scenes if not already enabled (Best practice: Enable in UI first)
-- alter table public.canvas_scenes enable row level security;

-- Drop existing potentially incorrect policies (applied to public role) before creating new ones
drop policy if exists "Users can view scenes of their projects" on public.canvas_scenes;
drop policy if exists "Users can create scenes for their projects" on public.canvas_scenes;
drop policy if exists "Users can update scenes for their projects" on public.canvas_scenes;
drop policy if exists "Users can delete scenes for their projects" on public.canvas_scenes;
drop policy if exists "Users can insert scenes for their projects" on public.canvas_scenes; -- Duplicate name from screenshot


-- Create new policies for canvas_scenes targeting authenticated users (checking project ownership)
-- Drop the policy if it already exists before creating
drop policy if exists "Allow authenticated select access based on project" on public.canvas_scenes;
create policy "Allow authenticated select access based on project" on public.canvas_scenes
  for select using (
    exists (
      select 1 from public.canvas_projects p
      where p.id = canvas_scenes.project_id and p.user_id = auth.uid()
    )
  );
-- Note: SELECT policies usually grant access to all columns if the row condition passes.
-- Explicitly listing columns for SELECT isn't standard but can be done if needed:
-- for select using ( ... ) to authenticated with columns (col1, col2, ...);

-- Drop the policy if it already exists before creating
drop policy if exists "Allow authenticated insert access based on project" on public.canvas_scenes;
create policy "Allow authenticated insert access based on project" on public.canvas_scenes
  for insert with check (
    exists (
      select 1 from public.canvas_projects p
      where p.id = canvas_scenes.project_id and p.user_id = auth.uid()
    )
  );
-- Explicitly listing columns for INSERT isn't typically needed unless restricting specific columns.
-- The check condition already gates the entire row insertion.

-- Drop the policy if it already exists before creating
drop policy if exists "Allow authenticated update access based on project" on public.canvas_scenes;
-- Recreate the update policy explicitly listing allowed columns
create policy "Allow authenticated update access based on project" on public.canvas_scenes
  for update using (
    -- Condition to determine WHICH rows can be updated (users can update scenes in their projects)
    exists (
      select 1 from public.canvas_projects p
      where p.id = canvas_scenes.project_id and p.user_id = auth.uid()
    )
  ) with check (
    -- Condition to ensure updated row STILL meets criteria (should still belong to user's project - usually same as USING)
    exists (
      select 1 from public.canvas_projects p
      where p.id = canvas_scenes.project_id and p.user_id = auth.uid()
    )
  );
  -- Note: Column-level update permissions should be handled via GRANT statements,
  -- not within the CREATE POLICY statement itself.
  -- Example (if needed, but often handled by Supabase defaults):
  -- GRANT UPDATE (title, description, script, ...) ON public.canvas_scenes TO authenticated;

-- Drop the policy if it already exists before creating
drop policy if exists "Allow authenticated delete access based on project" on public.canvas_scenes;
create policy "Allow authenticated delete access based on project" on public.canvas_scenes
  for delete using (
    exists (
      select 1 from public.canvas_projects p
      where p.id = canvas_scenes.project_id and p.user_id = auth.uid()
    )
  );