
-- Create get_video_templates RPC function
CREATE OR REPLACE FUNCTION public.get_video_templates()
RETURNS SETOF public.video_templates
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * 
  FROM public.video_templates 
  WHERE is_active = true
  ORDER BY created_at DESC;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_video_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_video_templates() TO anon;
