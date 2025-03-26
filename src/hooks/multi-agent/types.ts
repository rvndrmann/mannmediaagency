
import { Attachment } from "@/types/message";
import { CanvasScene } from "@/types/canvas";
import { SupabaseClient } from "@supabase/supabase-js";

export interface ToolContext {
  supabase: SupabaseClient;
  runId: string;
  groupId: string;
  userId: string;
  usePerformanceModel: boolean;
  enableDirectToolExecution: boolean;
  tracingDisabled: boolean;
  metadata: Record<string, any>;
  abortSignal?: AbortSignal;
  addMessage?: (text: string, type: string, attachments?: Attachment[]) => void;
  toolAvailable?: (toolName: string) => boolean;
  attachments?: Attachment[];
  canvasScene?: CanvasScene;
}

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
  default?: any;
  enum?: string[];
  prompt?: string;
}

export interface Command {
  name: string;
  parameters?: Record<string, any>;
  feature?: string;
  action?: string;
  args?: Record<string, any>;
}
