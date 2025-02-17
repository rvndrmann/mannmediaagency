
import { createClient } from '@supabase/supabase-js';

// Supabase project URL and anon key
export const SUPABASE_URL = "https://avdwgvjhufslhqrrmxgo.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5ODM4NTAsImV4cCI6MjA1MzU1OTg1MH0.wzh0gNTwGWgw-vDwxHcSdBZdiOdbABCXfQV_NuHvqzY";

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  }
);
