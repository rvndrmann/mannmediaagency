-- Drop one of the foreign key constraints between stories and story_type
alter table "public"."stories"
drop constraint "stories_story_type_id_fkey";