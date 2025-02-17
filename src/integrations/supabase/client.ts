
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase project URL and anon key
export const SUPABASE_URL = "https://avdwgvjhufslhqrrmxgo.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5ODM4NTAsImV4cCI6MjA1MzU1OTg1MH0.wzh0gNTwGWgw-vDwxHcSdBZdiOdbABCXfQV_NuHvqzY";

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    }
  }
);

// Initialize session check
export const initializeAuth = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error checking auth session:', error.message);
      return null;
    }
    return session;
  } catch (err) {
    console.error('Error in initializeAuth:', err);
    return null;
  }
};
