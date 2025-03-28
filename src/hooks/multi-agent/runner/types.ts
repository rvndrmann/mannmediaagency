import { Attachment, Message, MessageType } from "@/types/message";
import { ToolContext, AgentConfig } from "../types";
import { supabase } from "@/integrations/supabase/client";

export type AgentType = "main" | "assistant" | "tool" | "sceneCreator" | "scriptWriter" | "imageGenerator" | string;

export interface AgentResult {
  response: string | null;
  nextAgent: string | null;
  commandSuggestion?: any;
  structured_output?: any;
}

export interface AgentOptions {
  context: RunnerContext;
  config?: AgentConfig;
}

export interface RunnerContext extends ToolContext {
  metadata: {
    conversationHistory?: Message[];
    isHandoffContinuation?: boolean;
    previousAgentType?: string | null;
    handoffReason?: string;
    [key: string]: any;
  };
}

export interface RunnerCallbacks {
  onMessage: (message: Message) => void;
  onError: (error: string) => void;
  onHandoffStart: (fromAgent: string, toAgent: string, reason: string) => void;
  onHandoffEnd: (agentType: string) => void;
  onToolExecution: (toolName: string, params: any) => void;
}

export interface BaseAgent {
  name: string;
  config: AgentConfig;
  run(input: string, attachments: Attachment[]): Promise<AgentResult>;
  clone(configOverrides: Partial<AgentConfig>): BaseAgent;
  getType?(): AgentType;
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
