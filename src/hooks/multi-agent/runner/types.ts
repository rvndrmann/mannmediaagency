
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";
import { Attachment } from "@/types/message";

export type AgentType = 
  | "main" 
  | "assistant" 
  | "script" 
  | "image" 
  | "tool" 
  | "scene" 
  | "scene-generator" 
  | "data";

export interface RunnerContext {
  supabase: SupabaseClient<Database>;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  tracingEnabled?: boolean;
  metadata?: Record<string, any>;
  groupId?: string;
  runId?: string;
  addMessage?: (message: string, type: string) => void;
}

export interface AgentOptions {
  name: string;
  instructions: string;
  context: RunnerContext;
  traceId?: string;
  tools?: any[];
  model?: string;
  config?: any;
}

export interface AgentResult {
  response: string;
  output: string;
  nextAgent: AgentType | null;
  handoffReason?: string | null;
  structured_output?: any;
  additionalContext?: any;
  commandSuggestion?: string;
}

export enum CommandExecutionState {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  state: CommandExecutionState;
  error?: Error;
}

export interface ToolContext {
  supabase: SupabaseClient<Database>;
  userId?: string;
  projectId?: string;
  sceneId?: string;
  userCredits?: number;
  additionalContext?: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  version?: string;
  requiredCredits?: number;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  metadata?: {
    category?: string;
    displayName?: string;
    icon?: string;
  };
  execute: (parameters: any, context: ToolContext) => Promise<ToolExecutionResult>;
}

export interface SDKTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  function: (params: any) => Promise<any>;
}
