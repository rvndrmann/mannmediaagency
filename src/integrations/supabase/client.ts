
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase'; // Use generated types

// Read Supabase credentials from Vite environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic check to ensure variables are loaded
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase URL or Anon Key is missing. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file and Netlify build environment.");
  // Optionally throw an error here if the app cannot function without them
  // throw new Error("Supabase URL and Anon Key must be provided.");
}
// Create a function to initialize the Supabase client
const createSupabaseClient = () => {
  // Note: Removed logic that cleared localStorage.removeItem('supabase.auth.token')
  // as it might interfere with the PKCE flow.
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    }
  );
};

export const supabase = createSupabaseClient();
