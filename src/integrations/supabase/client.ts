
import { createClient } from '@supabase/supabase-js';

// Get environment variables
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

// Create Supabase client
export const supabase = createClient(
  SUPABASE_URL || '',
  supabaseAnonKey || ''
);
