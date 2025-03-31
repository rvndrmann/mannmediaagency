
export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data";

export interface AgentConfig {
  name: string;
  instructions: string;
  model: string;
}

export interface BaseAgent {
  getType(): AgentType;
  process(input: any, context: RunnerContext): Promise<AgentResult>;
}

export interface AgentOptions {
  config?: AgentConfig;
  model?: string;
  context?: RunnerContext;
  traceId?: string;
}

export interface AgentResult {
  output: string;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: Record<string, any>;
  };
  response?: string;
  nextAgent?: AgentType;
  handoffReason?: string;
  additionalContext?: Record<string, any>;
  structured_output?: any;
}

export interface RunnerContext {
  projectId?: string;
  history: any[];
  usePerformanceModel?: boolean;
  directToolExecution?: boolean;
  enableDirectToolExecution?: boolean;
  metadata?: Record<string, any>;
  tracingDisabled?: boolean;
  userId?: string;
  groupId?: string;
  runId?: string;
  supabase?: any;
}

export interface RunnerCallbacks {
  onHandoff?: (from: AgentType, to: AgentType, reason: string) => void;
  onToolUse?: (tool: string, params: any) => void;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
  onHandoffStart?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffEnd?: (from: AgentType, to: AgentType, result: any) => void;
  onToolExecution?: (toolName: string, params: any, result: any) => void;
}
