-- Define task status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('Pending Task', 'On Revision', 'Done Task Approved');
    END IF;
END$$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    title text NOT NULL CHECK (char_length(title) > 0),
    description text,
    status task_status DEFAULT 'Pending Task'::task_status NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Who created the task (admin)
    -- assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Removed: No longer assigning tasks
    task_image_url text, -- Renamed from admin_media_url: Optional URL for the initial task image
    task_image_type text, -- Renamed from admin_media_type: e.g., 'image/jpeg', 'image/png'
    result_image_url text, -- Added: Optional URL for the result image uploaded by admin
    result_image_type text -- Added: Mime type for the result image
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Add indexes for common lookups
-- DROP INDEX IF EXISTS idx_tasks_assigned_to; -- Index removed as column is removed
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update 'updated_at' on row update
DROP TRIGGER IF EXISTS on_tasks_update ON public.tasks;
CREATE TRIGGER on_tasks_update
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Grant usage permissions for the table to authenticated users (RLS will restrict further)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE tasks_id_seq TO authenticated; -- Only needed if sequence name isn't default or permissions are stricter

-- Grant permissions for the status type
GRANT USAGE ON TYPE task_status TO authenticated;

-- Add comments for clarity
COMMENT ON TABLE public.tasks IS 'Stores tasks created and managed by admins.';
COMMENT ON COLUMN public.tasks.created_by IS 'User ID of the admin who created the task.';
-- COMMENT ON COLUMN public.tasks.assigned_to IS 'Removed.';
COMMENT ON COLUMN public.tasks.task_image_url IS 'URL of the initial image file uploaded by the admin during task creation.';
COMMENT ON COLUMN public.tasks.task_image_type IS 'Mime type of the initial task image.';
COMMENT ON COLUMN public.tasks.result_image_url IS 'URL of the result image file uploaded by the admin.';
COMMENT ON COLUMN public.tasks.result_image_type IS 'Mime type of the result image.';