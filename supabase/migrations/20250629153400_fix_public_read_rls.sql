-- Drop the old RLS policies if they exist
drop policy if exists "Enable read access for all users" on "public"."stories";
drop policy if exists "Enable read access for all users" on "public"."video_generation_jobs";

-- Add a new policy to allow public read access to the stories table
create policy "Enable public read access for all users"
on "public"."stories"
as permissive
for select
to public
using (true);

-- Add a new policy to allow public read access to the video_generation_jobs table
create policy "Enable public read access for all users"
on "public"."video_generation_jobs"
as permissive
for select
to public
using (true);