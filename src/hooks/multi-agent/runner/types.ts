
import { Attachment } from "@/types/message";

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
  metadata?: {
    instructions?: Record<string, string>;
    conversationHistory?: any[];
    projectId?: string;
    [key: string]: any;
  };
}

export interface BaseAgent {
  getType(): AgentType;
  run(input: string, attachments?: Attachment[]): Promise<AgentResult>;
  setStreamingHandler(handler: (chunk: string) => void): void;
}
