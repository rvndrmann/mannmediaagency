
-- Create an RPC function to create storage policies
CREATE OR REPLACE FUNCTION create_storage_policy(
  bucket_name TEXT,
  policy_name TEXT,
  definition TEXT,
  action TEXT
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'CREATE POLICY %I ON storage.objects
    FOR %s TO anon
    USING (%s);',
    policy_name, action, definition
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to set up video creator storage buckets
CREATE OR REPLACE FUNCTION setup_video_creator_storage() RETURNS VOID AS $$
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  -- Check if videos bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'videos'
  ) INTO bucket_exists;
  
  -- Create videos bucket if it doesn't exist
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', TRUE);
    
    -- Add policies for videos bucket
    EXECUTE format(
      'CREATE POLICY "Public Access Videos" ON storage.objects
      FOR SELECT TO anon
      USING (bucket_id = ''videos'');'
    );
    
    EXECUTE format(
      'CREATE POLICY "Authenticated Users Can Upload Videos" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = ''videos'');'
    );
  END IF;
  
  -- Check if audio bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'audio'
  ) INTO bucket_exists;
  
  -- Create audio bucket if it doesn't exist
  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', TRUE);
    
    -- Add policies for audio bucket
    EXECUTE format(
      'CREATE POLICY "Public Access Audio" ON storage.objects
      FOR SELECT TO anon
      USING (bucket_id = ''audio'');'
    );
    
    EXECUTE format(
      'CREATE POLICY "Authenticated Users Can Upload Audio" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = ''audio'');'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute setup function
SELECT setup_video_creator_storage();
