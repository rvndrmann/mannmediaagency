
import { supabase } from "@/integrations/supabase/client";
import { Message, Attachment } from "@/types/message";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits: number;
}

export interface ToolContext {
  supabase: typeof supabase;
  runId: string;
  groupId: string;
  userId: string;
  usePerformanceModel: boolean;
  enableDirectToolExecution: boolean;
  tracingDisabled: boolean;
  metadata: Record<string, any>;
  abortSignal?: AbortSignal;
  addMessage: (text: string, type: string, attachments?: Attachment[]) => void;
  toolAvailable: (toolName: string) => boolean;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    creditsUsed: number;
  };
}

export interface ToolExecutionOptions {
  abortSignal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onPartialResult?: (result: any) => void;
}

export interface TraceItem {
  id: string;
  timestamp: string;
  type: 'agent_start' | 'agent_end' | 'tool_start' | 'tool_end' | 'handoff' | 'error';
  data: Record<string, any>;
}

export interface AgentTrace {
  id: string;
  runId: string;
  groupId: string;
  agentType: string;
  startTime: string;
  endTime?: string;
  steps: TraceItem[];
  input: string;
  output?: string;
  status: 'running' | 'completed' | 'error';
  metadata?: Record<string, any>;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
  context?: Record<string, any>;
}
