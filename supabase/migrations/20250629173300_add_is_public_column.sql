-- Add is_public column to stories table
alter table "public"."stories"
add column "is_public" boolean not null default true;

-- Add is_public column to video_generation_jobs table
alter table "public"."video_generation_jobs"
add column "is_public" boolean not null default true;