-- Drop the old RLS policies if they exist
drop policy if exists "Enable public read access for all users" on "public"."stories";
drop policy if exists "Enable public read access for all users" on "public"."video_generation_jobs";

-- Add a new policy to allow public read access to the stories table for anon and authenticated users
create policy "Enable read access for all users"
on "public"."stories"
as permissive
for select
to authenticated, anon
using (true);

-- Add a new policy to allow public read access to the video_generation_jobs table for anon and authenticated users
create policy "Enable read access for all users"
on "public"."video_generation_jobs"
as permissive
for select
to authenticated, anon
using (true);