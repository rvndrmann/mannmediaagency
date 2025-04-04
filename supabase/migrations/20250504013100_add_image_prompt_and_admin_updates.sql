-- Migration: Add image_prompt to canvas_scenes and create admin_scene_updates table

-- 1. Add image_prompt column to canvas_scenes
ALTER TABLE public.canvas_scenes
ADD COLUMN IF NOT EXISTS image_prompt TEXT;

COMMENT ON COLUMN public.canvas_scenes.image_prompt IS 'Stores the AI-generated image prompt for the scene.';

-- 2. Create admin_scene_updates table
CREATE TABLE IF NOT EXISTS public.admin_scene_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id uuid NOT NULL REFERENCES public.canvas_scenes(id) ON DELETE CASCADE,
    admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    update_type TEXT NOT NULL CHECK (update_type IN ('script', 'voiceover', 'image_prompt', 'description', 'image_url', 'video_url', 'other')), -- Type of content updated
    update_content TEXT, -- Optional: Store the new content or a description of the change
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now() -- Keep updated_at for potential future use
);

COMMENT ON TABLE public.admin_scene_updates IS 'Records updates made to scenes by administrators.';
COMMENT ON COLUMN public.admin_scene_updates.update_type IS 'Indicates which part of the scene was updated by the admin.';
COMMENT ON COLUMN public.admin_scene_updates.update_content IS 'Stores the updated content or a note about the admin action.';

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_scene_updates_scene_id ON public.admin_scene_updates(scene_id);
CREATE INDEX IF NOT EXISTS idx_admin_scene_updates_admin_user_id ON public.admin_scene_updates(admin_user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.admin_scene_updates ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies for admin_scene_updates

-- Function to check if a user is an admin (assuming admin_users table exists)
-- Re-using the function from 20250404035902_define_check_is_admin_function.sql
-- Ensure that migration is run if this one depends on it.
/*
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = check_is_admin.user_id
  );
$$;
*/

-- Policy: Admins can perform all actions on admin_scene_updates
DROP POLICY IF EXISTS "Allow admins full access" ON public.admin_scene_updates;
CREATE POLICY "Allow admins full access"
ON public.admin_scene_updates
FOR ALL
USING (public.check_is_admin(auth.uid()))
WITH CHECK (public.check_is_admin(auth.uid()));

-- Policy: Users can read updates for scenes belonging to projects they own
DROP POLICY IF EXISTS "Allow users to read updates for their project scenes" ON public.admin_scene_updates;
CREATE POLICY "Allow users to read updates for their project scenes"
ON public.admin_scene_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.canvas_scenes cs
    JOIN public.canvas_projects cp ON cs.project_id = cp.id
    WHERE cs.id = admin_scene_updates.scene_id
      AND cp.user_id = auth.uid()
  )
);

-- Grant usage on the function to authenticated users if not already done
-- GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated; -- Might be needed depending on setup