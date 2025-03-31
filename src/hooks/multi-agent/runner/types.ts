
import { Message, Attachment } from "@/types/message";
import { SupabaseClient } from "@supabase/supabase-js";

export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data" | string;

export interface AgentResult {
  response: string;
  output?: any;
  nextAgent: AgentType | null;
  handoffReason?: string;
  structured_output?: any;
  additionalContext?: Record<string, any>;
  commandSuggestion?: any;
}

export interface RunnerContext {
  addMessage: (message: string, type: string) => void;
  supabase: SupabaseClient;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  runId?: string;
  enableDirectToolExecution?: boolean;
  history?: any[];
  attachments?: Attachment[];
  tracingEnabled?: boolean;
}

export interface ToolContext {
  addMessage: (message: string, type: string) => void;
  supabase: SupabaseClient;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  groupId?: string;
  runId?: string;
  enableDirectToolExecution?: boolean;
  history?: any[];
  attachments?: Attachment[];
  tracingEnabled?: boolean;
  toolAvailable: boolean;
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
  usage?: {
    creditsUsed: number;
  };
}

export enum CommandExecutionState {
  PENDING = "pending",
  EXECUTING = "executing",
  COMPLETED = "completed",
  ERROR = "error"
}
