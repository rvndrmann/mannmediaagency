
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read from environment variables provided by Vite
// Ensure you have a .env file or configure these in your deployment environment
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Basic check to ensure variables are loaded during runtime
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase URL:", SUPABASE_URL ? 'Loaded' : 'Missing');
  console.error("Supabase Anon Key:", SUPABASE_ANON_KEY ? 'Loaded' : 'Missing');
  throw new Error("Supabase URL and Anon Key must be provided in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
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
