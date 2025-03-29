
// Define types for custom RPC functions used in the application
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// Extend the SupabaseClient type with our custom RPC functions
declare module '@supabase/supabase-js' {
  interface SupabaseClient<T extends {}, SchemaName extends string & keyof T = 'public'> {
    rpc<ResponseType = any>(
      fn: string,
      params?: object,
      options?: { count?: null | 'exact' | 'planned' | 'estimated', head?: boolean }
    ): Promise<{ data: ResponseType; error: Error | null }>;
  }
}

// Add the types for our RPC function responses
export interface AgentAnalytics {
  total_traces: number;
  total_messages: number;
  total_handoffs: number;
  total_tool_calls: number;
  avg_response_time: number;
  agent_usage: Record<string, number>;
  model_usage: Record<string, number>;
}

export interface Conversation {
  conversation_id: string;
  start_time: string; 
  end_time: string;
  message_count: number;
  agent_types: string[];
  model_used: string;
}

export interface TraceData {
  messages: any[];
  summary: {
    agent_types: string[];
    duration: number;
    handoffs: number;
    tool_calls: number;
    message_count: number;
    model_used: string;
    success: boolean;
  };
}
