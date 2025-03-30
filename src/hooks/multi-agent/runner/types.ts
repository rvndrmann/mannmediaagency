
import { Attachment } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";

// Use string literal union type for agent types
export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data" | "assistant";

export interface AgentResult {
  response: string;
  nextAgent?: AgentType;
  handoffReason?: string;
  additionalContext?: any;
  structured_output?: any;
}

export interface RunnerContext {
  userId: string;
  runId: string;
  groupId: string;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  enableTracing?: boolean;
  tracingDisabled?: boolean;
  projectId?: string;
  metadata?: {
    instructions?: Record<string, string>;
    conversationHistory?: any[];
    [key: string]: any;
  };
}

export interface BaseAgent {
  getType(): AgentType;
  run(input: string, attachments?: Attachment[]): Promise<AgentResult>;
  setStreamingHandler(handler: (chunk: string) => void): void;
}

export interface AgentOptions {
  context: RunnerContext;
  traceId: string;
  streamingHandler?: (chunk: string) => void;
}

export interface RunnerCallbacks {
  onMessage: (message: any) => void;
  onError: (error: string) => void;
  onHandoffStart?: (fromAgent: AgentType, toAgent: AgentType, reason: string) => void;
  onHandoffEnd?: (toAgent: AgentType) => void;
  onAgentThinking?: (agentType: AgentType) => void;
  onToolExecution?: (toolName: string, params: any) => void;
  onStreamingStart?: (message: any) => void;
  onStreamingChunk?: (chunk: string) => void;
  onStreamingEnd?: () => void;
}
