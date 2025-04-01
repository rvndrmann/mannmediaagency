
import { SupabaseClient } from '@supabase/supabase-js';

// Agent types
export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data";

export interface AgentOptions {
  name: string;
  instructions?: string;
  context?: RunnerContext;
  traceId?: string;
}

export interface RunnerContext {
  userId?: string;
  sessionId?: string;
  projectId?: string;
  runId?: string;
  groupId?: string;
  tracingEnabled?: boolean;
  addMessage?: (message: string, type: string) => void;
  metadata?: Record<string, any>;
  supabase?: SupabaseClient<any, "public", any>;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
}

export interface AgentResult {
  response: string;
  output: string; 
  nextAgent: AgentType | null;
  handoffReason?: string;
  additionalContext?: Record<string, any>;
  structured_output?: any;
}

// Define BaseAgent interface
export interface BaseAgent {
  run(input: string, context: RunnerContext): Promise<AgentResult>;
  getType(): AgentType;
}

// Tool execution result states - Consistent with tools/types.ts
export enum CommandExecutionState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  ERROR = "error",
  PROCESSING = "processing" // Add PROCESSING to align with other file
}

// Tool context interface - provided to all tools during execution
// Update to include user and session which may be used by adapted tools
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
  user?: any; // Add for compatibility with tools/types.ts
  session?: any; // Add for compatibility with tools/types.ts
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
  version?: string; // Add for compatibility
}

// Tool execution result interface
export interface ToolExecutionResult {
  success: boolean;
  message: string;
  state: CommandExecutionState; 
  error?: string | Error;
  data?: any;
  usage?: {
    creditsUsed?: number;
  };
}
