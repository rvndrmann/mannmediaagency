
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const SUPABASE_URL = "https://avdwgvjhufslhqrrmxgo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4Mzg3OTMsImV4cCI6MjA1NDQxNDc5M30.NYkKpNhStznwM0M-ZwyANUJNoGsYDM7xF2oMaWQ92w4";

// Extend the functions client with a url property
declare module '@supabase/supabase-js' {
  interface FunctionsClient {
    url: string;
  }
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true, // Changed to true to detect auth tokens in URL
      autoRefreshToken: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }
  }
);

// Add the url property to the functions client
// @ts-ignore - We're extending the FunctionsClient
supabase.functions.url = `${SUPABASE_URL}/functions/v1`;
