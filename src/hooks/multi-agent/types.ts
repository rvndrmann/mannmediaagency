
import { SupabaseClient } from '@supabase/supabase-js';

// Tool execution result states
export enum CommandExecutionState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  ERROR = "error" // Add ERROR state
}

// Tool context interface - provided to all tools during execution
export interface ToolContext {
  supabase: SupabaseClient<any, "public", any>;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  userCredits?: number;
  metadata?: Record<string, any>;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  addMessage?: (message: string, type: string) => void;
  toolAvailable?: boolean; 
  history?: any[];
  tracingEnabled?: boolean;
  // Add any other context-specific properties tools might need
}

// Tool definition interface
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  requiredCredits?: number;
  metadata?: {
    category?: string;
    displayName?: string;
    icon?: string;
  };
  execute: (parameters: any, context: ToolContext) => Promise<ToolExecutionResult>;
}

// Tool execution result interface
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  state: CommandExecutionState; // Use string instead of enum for flexibility
  error?: Error | string;
  data?: any;
  usage?: {
    creditsUsed?: number;
    // Add other usage metrics as needed
  };
}
