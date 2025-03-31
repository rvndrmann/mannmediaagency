
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
}

export interface AgentResult {
  output: string;
  handoff?: {
    targetAgent: AgentType;
    reason: string;
    additionalContext?: Record<string, any>;
  };
}

export interface RunnerContext {
  projectId?: string;
  history: any[];
  usePerformanceModel?: boolean;
  directToolExecution?: boolean;
}

export interface RunnerCallbacks {
  onHandoff?: (from: AgentType, to: AgentType, reason: string) => void;
  onToolUse?: (tool: string, params: any) => void;
}
