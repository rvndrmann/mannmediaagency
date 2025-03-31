
import { AgentType, RunnerContext } from "../runner/types";

export interface SDKTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any, context: any) => Promise<any>;
}

export interface SDKAgentDefinition {
  name: string;
  type: AgentType;
  description: string;
  instructions?: string;
  model?: string;
}

export interface SDKAgentOptions {
  context?: RunnerContext;
  traceId?: string;
  model?: string;
  tools?: SDKTool[];
}

export interface AgentConfig {
  modelName: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface AgentStreamEvent {
  type: string;
  data?: any;
}

export interface SDKRunner {
  initialize(): Promise<void>;
  processInput(input: string, context: RunnerContext): Promise<any>;
  getCurrentAgent(): AgentType;
  getTraceId(): string;
  setCallbacks(callbacks: any): void;
}
