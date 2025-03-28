
import { createClient } from '@supabase/supabase-js';

// Default values for development (these should be overridden by environment variables)
const DEFAULT_SUPABASE_URL = 'https://avdwgvjhufslhqrrmxgo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5ODM4NTAsImV4cCI6MjA1MzU1OTg1MH0.wzh0gNTwGWgw-vDwxHcSdBZdiOdbABCXfQV_NuHvqzY';

// Get environment variables or use defaults
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Create Supabase client with proper auth configuration
export const supabase = createClient(
  SUPABASE_URL,
  supabaseAnonKey,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Log initialization
console.log(`Supabase client initialized with URL: ${SUPABASE_URL}`);
