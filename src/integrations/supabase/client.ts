
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase project URL and anon key
export const SUPABASE_URL = "https://avdwgvjhufslhqrrmxgo.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ5ODM4NTAsImV4cCI6MjAyMDU1OTg1MH0.D0Eju8IBr12Ggy3NwFHxonYxXHY2kBp3XGCvYJr5_RU";

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
      flowType: 'pkce',
      // Adding these options to ensure proper redirect handling
      debug: true, // This will help us see what's happening with auth
      cookieOptions: {
        // Ensure cookies are properly handled
        name: 'sb-auth',
        lifetime: 28800, // 8 hours
        path: '/',
        sameSite: 'lax'
      }
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
