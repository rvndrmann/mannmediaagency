-- Placeholder migration to create canvas_projects and canvas_scenes
-- May need adjustments based on the actual remote schema

CREATE TABLE IF NOT EXISTS public.canvas_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
    -- Add other columns based on your actual schema if known
);

CREATE TABLE IF NOT EXISTS public.canvas_scenes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.canvas_projects(id) ON DELETE CASCADE,
    scene_order INTEGER,
    title TEXT,
    script TEXT,
    description TEXT, -- Added based on migration 0000...01
    image_url TEXT,
    product_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
    -- Add other columns based on your actual schema if known
);

-- Optional: Add indexes if needed
CREATE INDEX IF NOT EXISTS idx_canvas_projects_user_id ON public.canvas_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_scenes_project_id ON public.canvas_scenes(project_id);