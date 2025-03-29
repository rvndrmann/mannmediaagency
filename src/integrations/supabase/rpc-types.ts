
// Define types for custom RPC functions used in the application
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

// Extend the SupabaseClient type correctly
declare module '@supabase/supabase-js' {
  // Note: We're not redefining SupabaseClient here, only extending the interface
  interface SupabaseClient {
    rpc<ResponseType = any>(
      fn: string,
      params?: object,
      options?: { count?: null | 'exact' | 'planned' | 'estimated', head?: boolean }
    ): Promise<{ data: ResponseType; error: Error | null; count?: number }>;
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

export interface ScriptData {
  id: string;
  project_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  title?: string;
  scenes?: Scene[];
}

export interface Scene {
  id: string;
  project_id: string;
  title: string;
  scene_order: number;
  script: string;
  description: string;
  image_prompt: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

// Type for Supabase error extension
export interface SupabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
  statusCode?: number;
}
