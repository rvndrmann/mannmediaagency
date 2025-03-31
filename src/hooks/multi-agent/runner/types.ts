
export type AgentType = "main" | "script" | "image" | "tool" | "scene" | "data";

export interface RunnerContext {
  supabase: any;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  runId?: string;
  groupId?: string;
  metadata?: Record<string, any>;
  tracingDisabled?: boolean;
  addMessage?: (message: string, type: string) => void;
  attachments?: any[];
  credits?: number;
}

export interface AgentOptions {
  context?: RunnerContext;
  traceId?: string;
  config?: any;
}

export interface AgentResult {
  output: string;
  nextAgent?: AgentType;
  handoffReason?: string;
  structured_output?: any;
  additionalContext?: any;
}

export interface RunnerCallbacks {
  onHandoff?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffStart?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffEnd?: (from: AgentType, to: AgentType, result: AgentResult) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: string, agentType: AgentType) => void;
  onExecute?: (command: string, parameters: any) => void;
  onComplete?: (result: AgentResult) => void;
}

export interface SDKRunner {
  initialize(): Promise<void>;
  processInput(input: string, context: RunnerContext): Promise<AgentResult>;
  getCurrentAgent(): AgentType;
  getTraceId(): string;
  setCallbacks(callbacks: RunnerCallbacks): void;
}
