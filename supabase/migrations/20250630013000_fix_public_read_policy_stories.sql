-- Ensure RLS is enabled
alter table "public"."stories" enable row level security;

-- Drop any existing public read policies
drop policy if exists "Enable read access for all users" on "public"."stories";
drop policy if exists "Enable public read access for all users" on "public"."stories";

-- Create a permissive policy for all users to read public stories
create policy "Enable public read access for all users"
on "public"."stories"
as permissive
for select
to public
using (is_public = true);