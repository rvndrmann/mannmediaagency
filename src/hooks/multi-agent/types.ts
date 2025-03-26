
import { Message, Attachment, Command } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  version: string;
  requiredCredits: number;
  parameters: ToolParameter[];
  execute: (command: Command, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface ToolContext {
  runId: string;
  groupId: string;
  userId: string;
  usePerformanceModel: boolean;
  enableDirectToolExecution: boolean;
  tracingDisabled: boolean;
  metadata: Record<string, any>;
  abortSignal?: AbortSignal;
  supabase: typeof supabase;
  addMessage?: (text: string, type: string, attachments?: Attachment[]) => void;
  toolAvailable?: (toolName: string) => boolean;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}
