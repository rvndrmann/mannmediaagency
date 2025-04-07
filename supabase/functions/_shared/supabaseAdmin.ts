import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Database } from './types.ts'; // Assume types.ts is copied or accessible relative to functions root during build/deploy

// Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set as environment variables in your Supabase project settings
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  // Optionally throw an error or handle appropriately
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  serviceKey,
  { auth: { persistSession: false } } // Don't persist session for admin client
);