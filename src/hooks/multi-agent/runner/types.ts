
import { Attachment, Message } from "@/types/message";
import { SupabaseClient } from "@supabase/supabase-js";

export type AgentType = "main" | "script" | "image" | "tool" | "scene";

export interface AgentResult {
  response?: string;
  nextAgent?: string;
  handoffReason?: string;
  additionalContext?: Record<string, any>;
  structured_output?: any;
}

export interface RunnerContext {
  supabase?: SupabaseClient;
  userId?: string;
  runId?: string;
  groupId?: string;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  tracingDisabled?: boolean;
  metadata: {
    projectId?: string;
    projectDetails?: any;
    conversationHistory?: Message[];
    isHandoffContinuation?: boolean;
    previousAgentType?: AgentType | null;
    handoffReason?: string;
    handoffHistory?: Array<{ from: AgentType, to: AgentType, reason: string }>;
    instructions?: Record<string, string>;
    continuityData?: any;
    [key: string]: any;
  };
  addMessage: (text: string, type: string, attachments?: Attachment[]) => void;
  toolAvailable: (toolName: string) => boolean;
}

export interface RunnerCallbacks {
  onMessage: (message: Message) => void;
  onError: (error: string) => void;
  onHandoffStart: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffEnd: (agent: AgentType) => void;
  onToolExecution: (toolName: string, params: any) => void;
  // New streaming callbacks
  onStreamingStart?: (message: Message) => void;
  onStreamingChunk?: (chunk: string) => void;
  onStreamingEnd?: () => void;
  onAgentThinking?: (agentType: AgentType) => void;
}

export interface AgentOptions {
  context: RunnerContext;
  traceId?: string;
  streamingHandler?: (chunk: string) => void;
}
