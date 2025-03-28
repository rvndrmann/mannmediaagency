
import { Attachment } from "@/types/message";
import { SupabaseClient } from "@supabase/supabase-js";

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  runId: string;
  groupId: string;
  usePerformanceModel: boolean;
  enableDirectToolExecution: boolean;
  tracingDisabled: boolean;
  metadata: Record<string, any>;
  abortSignal?: AbortSignal;
  addMessage: (text: string, type: string, attachments?: Attachment[]) => void;
  toolAvailable: (toolName: string) => boolean;
  creditsRemaining?: number;
  attachments?: Attachment[];
}

export enum CommandExecutionState {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

export interface ToolDefinition {
  name: string;
  description: string;
  version: string;
  requiredCredits: number;
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
    prompt?: string;
  }[];
  execute: (command: any, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}
