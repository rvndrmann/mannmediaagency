
import { SupabaseClient } from "@supabase/supabase-js";

// Agent types
export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data";

// Runner context interface for agent execution
export interface RunnerContext {
  supabase: SupabaseClient<any, "public", any>;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  history?: any[];
  tracingEnabled?: boolean;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  addMessage?: (message: string, type: string) => void;
  metadata?: Record<string, any>;
}

// Result from agent execution
export interface AgentResult {
  response: string;
  output?: string;
  nextAgent: AgentType | null;
  handoffReason?: string;
  additionalContext?: Record<string, any>;
  commandSuggestion?: any;
  structured_output?: any;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: Record<string, any>;
  };
}

// Agent option for initialization
export interface AgentOptions {
  context: RunnerContext;
  traceId?: string;
  model?: string;
  config?: any;
}

// Base agent interface
export interface BaseAgent {
  run(input: string, context: RunnerContext): Promise<AgentResult>;
  getType(): AgentType;
}

// For callback handling
export interface RunnerCallbacks {
  onHandoff?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffStart?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffEnd?: (fromAgent: AgentType, toAgent: AgentType, result: AgentResult) => void;
  onError?: (error: Error) => void;
}
