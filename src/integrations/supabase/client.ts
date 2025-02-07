
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://avdwgvjhufslhqrrmxgo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDcyODc4NTAsImV4cCI6MjAyMjg2Mzg1MH0.wzh0gNTwGWgw-vDwxHcSdBZdiOdbABCXfQV_NuHvqzY";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
