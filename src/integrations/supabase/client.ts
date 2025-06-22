
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase'; // Use generated types

// Use the actual Supabase project URL and anon key from the project configuration
const SUPABASE_URL = 'https://avdwgvjhufslhqrrmxgo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4Mzg3OTMsImV4cCI6MjA1NDQxNDc5M30.NYkKpNhStznwM0M-ZwyANUJNoGsYDM7xF2oMaWQ92w4';

// Create a function to initialize the Supabase client
const createSupabaseClient = () => {
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
