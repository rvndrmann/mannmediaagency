-- Enable Row Level Security for stories and video_generation_jobs tables
alter table "public"."stories" enable row level security;
alter table "public"."video_generation_jobs" enable row level security;

-- Add a policy to allow public read access to the stories table
create policy "Enable public read access for all users"
on "public"."stories"
as permissive
for select
to public
using (true);

-- Add a policy to allow public read access to the video_generation_jobs table
create policy "Enable public read access for all users"
on "public"."video_generation_jobs"
as permissive
for select
to public
using (true);