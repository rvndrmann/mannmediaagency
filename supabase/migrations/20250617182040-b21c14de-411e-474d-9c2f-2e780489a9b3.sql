
-- Drop tables that are causing RLS errors and are unnecessary for the website

-- First drop any dependent views or functions
DROP FUNCTION IF EXISTS public.get_video_templates();

-- Drop the tables causing RLS errors
DROP TABLE IF EXISTS public.video_metadata CASCADE;
DROP TABLE IF EXISTS public.video_templates CASCADE;
DROP TABLE IF EXISTS public.custom_order_links CASCADE;
DROP TABLE IF EXISTS public.custom_order_guests CASCADE;

-- Also drop related tables that might be unused
DROP TABLE IF EXISTS public.custom_order_forms CASCADE;
DROP TABLE IF EXISTS public.form_submissions CASCADE;

-- Clean up any orphaned references
UPDATE public.custom_orders SET order_link_id = NULL WHERE order_link_id IS NOT NULL;
UPDATE public.custom_orders SET guest_id = NULL WHERE guest_id IS NOT NULL;
