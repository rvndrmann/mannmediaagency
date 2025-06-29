-- Set default value of is_public to true for stories
alter table "public"."stories"
alter column "is_public" set default true;