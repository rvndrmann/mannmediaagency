
export type AgentType = 
  | "main" 
  | "script" 
  | "image" 
  | "tool" 
  | "scene" 
  | "data" 
  | "assistant" 
  | "scene-generator";

export interface RunnerContext {
  userId?: string;
  projectId?: string;
  sceneId?: string;
  metadata?: Record<string, any>;
  tracingEnabled?: boolean;
  addMessage?: (message: string, type: string) => void;
  groupId?: string;
  runId?: string;
  // Additional properties used in components
  supabase?: any;
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
}

export interface AgentResult {
  response: string;
  output: string;
  nextAgent?: AgentType | null;
  handoffReason?: string;
  additionalContext?: Record<string, any>;
  metadata?: Record<string, any>;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: Record<string, any>;
  };
  // Additional properties for SDK compatibility
  structured_output?: any;
  commandSuggestion?: any;
}

export interface BaseAgent {
  name: string;
  run: (input: string, context: RunnerContext) => Promise<AgentResult>;
  getInstructions: () => string;
  getTools: () => any[];
}

export type RunnerCallbacks = {
  onHandoff?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffStart?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffEnd?: (from: AgentType, to: AgentType, result: AgentResult) => void;
  onError?: (error: Error) => void;
};

export interface OnHandoffWithInput<TInput> {
  (runContext: any, input: TInput): Promise<any>;
}

export interface OnHandoffWithoutInput {
  (runContext: any): Promise<any>;
}

export interface AgentOptions {
  name: string;
  description?: string;
  instructions?: string;
  tools?: any[];
  context?: RunnerContext;
  traceId?: string;
  model?: string;
  contextData?: Record<string, any>;
}

// Define CommandExecutionState as enum for proper usage
export enum CommandExecutionState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  ERROR = "error",
  PROCESSING = "processing"
}

export interface ToolExecutionResult {
  success: boolean;
  message?: string;
  state: CommandExecutionState; 
  error?: string | Error;
  data?: any;
  usage?: {
    creditsUsed?: number;
  };
}
