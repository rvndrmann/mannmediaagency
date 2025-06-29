-- Enable RLS for stories table
alter table "public"."stories" enable row level security;

-- Enable RLS for video_generation_jobs table
alter table "public"."video_generation_jobs" enable row level security;