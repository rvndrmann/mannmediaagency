-- Migration: Create agent_tasks table for multi-agent system task tracking

-- Create agent_tasks table
CREATE TABLE agent_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES canvas_projects(id) ON DELETE SET NULL,
    scene_id UUID REFERENCES canvas_scenes(id) ON DELETE SET NULL,
    assigned_agent TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    input_payload JSONB,
    result_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments to the table and columns for clarity
COMMENT ON TABLE agent_tasks IS 'Stores tasks for background processing by agents in the multi-agent system.';
COMMENT ON COLUMN agent_tasks.task_id IS 'Unique identifier for the task.';
COMMENT ON COLUMN agent_tasks.project_id IS 'Optional reference to the associated canvas project.';
COMMENT ON COLUMN agent_tasks.scene_id IS 'Optional reference to the associated canvas scene.';
COMMENT ON COLUMN agent_tasks.assigned_agent IS 'Identifier of the agent assigned or intended to process the task (e.g., ''PromptAgent'', ''ImageGenerationWorker'').';
COMMENT ON COLUMN agent_tasks.status IS 'Current status of the task (e.g., pending, processing, completed, failed).';
COMMENT ON COLUMN agent_tasks.input_payload IS 'JSONB data required for the agent to perform the task (parameters, references, etc.).';
COMMENT ON COLUMN agent_tasks.result_payload IS 'JSONB data containing the result of the task execution or error details.';
COMMENT ON COLUMN agent_tasks.error_message IS 'Stores any specific error message if the task failed.';
COMMENT ON COLUMN agent_tasks.created_at IS 'Timestamp when the task record was created.';
COMMENT ON COLUMN agent_tasks.updated_at IS 'Timestamp when the task record was last updated.';

-- Create indexes for commonly queried columns
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_assigned_agent ON agent_tasks(assigned_agent);
CREATE INDEX idx_agent_tasks_project_id ON agent_tasks(project_id);
CREATE INDEX idx_agent_tasks_scene_id ON agent_tasks(scene_id);

-- Function to update updated_at column automatically
-- Using a common pattern; ensure this function name doesn't conflict if it exists elsewhere.
-- Consider using Supabase's built-in trigger functions if preferred: https://supabase.com/docs/guides/database/functions#trigger-functions
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row modification for agent_tasks
CREATE TRIGGER set_timestamp_on_agent_tasks_update
BEFORE UPDATE ON agent_tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();