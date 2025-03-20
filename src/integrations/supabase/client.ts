
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const originalClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Extend the supabase client with typed RPC functions
export const supabase = {
  ...originalClient,
  rpc: function<T = any>(
    fn: keyof SupabaseRpcFunctions,
    args?: Parameters<SupabaseRpcFunctions[typeof fn]>[0]
  ) {
    return originalClient.rpc(fn, args) as ReturnType<typeof originalClient.rpc> & { data: T };
  },
  // Add missing properties from the original client to ensure all methods are available
  from: originalClient.from.bind(originalClient),
  storage: originalClient.storage.bind(originalClient),
  functions: originalClient.functions.bind(originalClient)
};
