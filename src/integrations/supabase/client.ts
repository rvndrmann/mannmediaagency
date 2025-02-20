
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { safeGetData } from '@/types/supabase';

export const SUPABASE_URL = "https://avdwgvjhufslhqrrmxgo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZHdndmpodWZzbGhxcnJteGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4Mzg3OTMsImV4cCI6MjA1NDQxNDc5M30.NYkKpNhStznwM0M-ZwyANUJNoGsYDM7xF2oMaWQ92w4";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'mann-media-auth-token'
    }
  }
);

// Add session persistence check helper
export const checkAuthSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error checking auth session:', error);
    return null;
  }
  return session;
};

// Add type-safe query helpers
export const getVideoGenerationJobs = async (userId: string) => {
  const result = await supabase
    .from('video_generation_jobs')
    .select()
    .eq('user_id', userId);
  return safeGetData(result);
};

export const getImageGenerationJobs = async (userId: string) => {
  const result = await supabase
    .from('image_generation_jobs')
    .select()
    .eq('user_id', userId);
  return safeGetData(result);
};

export const getUserCredits = async (userId: string) => {
  const result = await supabase
    .from('user_credits')
    .select()
    .eq('user_id', userId)
    .single();
  return safeGetData(result);
};

