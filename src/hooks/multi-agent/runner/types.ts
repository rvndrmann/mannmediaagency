
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
  history?: any[];
}

export interface AgentOptions {
  context?: RunnerContext;
  traceId?: string;
  config?: any;
  model?: string;
}

export interface AgentResult {
  output: string;
  nextAgent?: AgentType;
  handoffReason?: string;
  structured_output?: any;
  additionalContext?: any;
  // Added properties to fix type errors
  response?: string;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: any;
  };
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

// Add BaseAgent interface to fix import errors
export interface BaseAgent {
  processInput(input: string, context: RunnerContext): Promise<AgentResult>;
  getType(): AgentType;
  getName(): string;
  getDescription(): string;
}
