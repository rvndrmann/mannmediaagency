
import { createClient } from '@supabase/supabase-js';

// Use import.meta.env instead of process.env for Vite projects
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, supabaseAnonKey);
