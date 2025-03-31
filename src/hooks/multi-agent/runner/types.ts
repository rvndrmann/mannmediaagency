
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
  context: RunnerContext;
  traceId?: string;
}

export interface AgentResult {
  output: string;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: Record<string, any>;
  };
  // Additional properties for compatibility
  response?: string;
  nextAgent?: AgentType;
  handoffReason?: string;
  additionalContext?: Record<string, any>;
  structured_output?: any;
  commandSuggestion?: string;
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
  attachments?: any[];
  addMessage?: (message: string, type: string) => void;
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

// OpenAI Agents SDK types
export interface SDKAgentDefinition {
  name: string;
  instructions: string;
  tools?: SDKTool[];
  model?: string;
  handoffs?: SDKHandoffDefinition[];
}

export interface SDKTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any, context?: any) => Promise<any>;
}

export interface SDKHandoffDefinition {
  targetAgent: string;
  description: string;
  when: string[];
}

export interface SDKAgentOptions {
  model?: string;
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
  toolChoice?: 'auto' | 'required' | 'none' | string;
}

export interface SDKRunner {
  processInput: (input: string, context?: RunnerContext) => Promise<AgentResult>;
  getCurrentAgent: () => AgentType;
  getTraceId: () => string;
  initialize: () => Promise<void>;
  setCallbacks: (callbacks: RunnerCallbacks) => void;
}

export interface AgentStreamEvent {
  type: 'thinking' | 'message' | 'error' | 'tool_call' | 'tool_result' | 'handoff' | 'complete';
  content?: string;
  agentType?: AgentType;
  toolName?: string;
  toolParams?: any;
  toolResult?: any;
  handoffTarget?: AgentType;
  handoffReason?: string;
  timestamp: number;
}

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits?: number;
  execute: (params: any, context: RunnerContext) => Promise<any>;
};
