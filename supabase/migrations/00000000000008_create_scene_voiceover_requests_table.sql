-- Create the scene_voiceover_requests table
CREATE TABLE scene_voiceover_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id uuid NOT NULL REFERENCES canvas_scenes(id) ON DELETE CASCADE,
    fal_request_id text UNIQUE,
    status text NOT NULL DEFAULT 'queued', -- e.g., 'queued', 'in_progress', 'completed', 'failed'
    result_url text,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_scene_voiceover_requests_scene_id ON scene_voiceover_requests(scene_id);
CREATE INDEX idx_scene_voiceover_requests_status ON scene_voiceover_requests(status);
CREATE INDEX idx_scene_voiceover_requests_fal_request_id ON scene_voiceover_requests(fal_request_id);

-- Enable Row Level Security
ALTER TABLE scene_voiceover_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to select any request (access controlled by function/scene RLS)
CREATE POLICY "Allow authenticated users to select requests"
ON scene_voiceover_requests
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert new requests
CREATE POLICY "Allow authenticated users to insert requests"
ON scene_voiceover_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Disallow updates for users (should be handled by backend functions)
CREATE POLICY "Disallow user updates"
ON scene_voiceover_requests
FOR UPDATE
TO authenticated
USING (false); -- Effectively blocks updates via this policy

-- Disallow deletes for users (should be handled by backend functions or cascade)
CREATE POLICY "Disallow user deletes"
ON scene_voiceover_requests
FOR DELETE
TO authenticated
USING (false); -- Effectively blocks deletes via this policy

-- Function to update updated_at timestamp (assuming it might not exist yet)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on row update
CREATE TRIGGER update_scene_voiceover_requests_updated_at
BEFORE UPDATE ON scene_voiceover_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();