
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
