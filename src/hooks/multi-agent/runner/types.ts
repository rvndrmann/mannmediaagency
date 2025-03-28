
import { Attachment } from "@/types/message";
import { ToolContext, AgentConfig } from "../types";

export type AgentType = 'main' | 'script' | 'image' | 'tool' | 'scene';

export interface AgentResult {
  response: string | null;
  nextAgent: string | null;
  commandSuggestion?: any;
  structured_output?: any;
}

export interface AgentOptions {
  config: AgentConfig;
  context: ToolContext;
}

export interface BaseAgent {
  name: string;
  config: AgentConfig;
  run(input: string, attachments: Attachment[]): Promise<AgentResult>;
  clone(configOverrides: Partial<AgentConfig>): BaseAgent;
}

export interface AgentHooks {
  onAgentStart?: (agent: BaseAgent, input: string) => void | Promise<void>;
  onAgentEnd?: (agent: BaseAgent, result: AgentResult) => void | Promise<void>;
  onToolStart?: (agent: BaseAgent, toolName: string, params: any) => void | Promise<void>;
  onToolEnd?: (agent: BaseAgent, toolName: string, result: any) => void | Promise<void>;
  onHandoff?: (fromAgent: BaseAgent, toAgent: BaseAgent, reason: string) => void | Promise<void>;
  onError?: (agent: BaseAgent, error: Error) => void | Promise<void>;
}

export interface AgentRegistry {
  registerAgent(agent: BaseAgent): void;
  getAgent(name: string): BaseAgent | undefined;
  getAllAgents(): BaseAgent[];
}
