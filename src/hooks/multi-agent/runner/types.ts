
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Message } from "@/types/message";
import { ToolContext } from "@/hooks/types";

export type RunStatus = "pending" | "running" | "completed" | "error";

export interface RunState {
  currentAgentType: AgentType;
  messages: Message[];
  handoffInProgress: boolean;
  turnCount: number;
  status: RunStatus;
  lastMessageIndex: number;
  toolContext?: ToolContext;
  enableDirectToolExecution: boolean;
}

export interface RunConfig {
  usePerformanceModel?: boolean;
  maxTurns?: number;
  tracingDisabled?: boolean;
  enableDirectToolExecution?: boolean;
  metadata?: Record<string, any>;
  runId?: string;
  groupId?: string;
}

export interface RunResult {
  state: RunState;
  output: Message[];
  success: boolean;
}

export interface RunHooks {
  onThinking?: (agentType: AgentType) => void;
  onMessage?: (message: Message) => void;
  onError?: (error: string) => void;
  onCompleted?: (result: RunResult) => void;
  onHandoffStart?: (fromAgent: AgentType, toAgent: AgentType) => void;
  onHandoffEnd?: (toAgent: AgentType) => void;
}
