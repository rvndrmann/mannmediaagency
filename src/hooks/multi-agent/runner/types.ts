
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { AgentMessage, Command, HandoffRequest, Message, Task } from "@/types/message";
import { ToolContext, ToolResult } from "../types";

/**
 * Configuration for an agent run
 */
export interface RunConfig {
  // The model to use for this run
  model?: "gpt-4o-mini" | "gpt-4o";
  // Whether to use the performance model (faster responses)
  usePerformanceModel?: boolean;
  // Maximum number of turns before stopping
  maxTurns?: number;
  // Whether to disable tracing
  tracingDisabled?: boolean;
  // Custom metadata for this run
  metadata?: Record<string, any>;
  // Run ID for tracing purposes
  runId?: string;
  // Group ID for conversation tracking
  groupId?: string;
}

// Define a union type for run status to ensure type safety
export type RunStatus = "pending" | "running" | "completed" | "error";

/**
 * State of an agent run
 */
export interface RunState {
  // Current agent being used
  currentAgentType: AgentType;
  // Messages in the conversation 
  messages: Message[];
  // Whether a handoff is in progress
  handoffInProgress: boolean;
  // Current turn number
  turnCount: number;
  // Status of the run
  status: RunStatus;
  // The last message index (for referencing response messages)
  lastMessageIndex: number;
  // The last result from a tool execution
  lastToolResult?: ToolResult;
  // The last command executed
  lastCommand?: Command;
  // Context for tool execution
  toolContext?: ToolContext;
  // Last handoff request
  handoffRequest?: HandoffRequest;
}

/**
 * Result of an agent run
 */
export interface RunResult {
  // Final state of the run
  state: RunState;
  // Final output messages
  output: Message[];
  // Whether the run completed successfully
  success: boolean;
  // Error message if the run failed
  error?: string;
  // Metrics about the run
  metrics?: {
    totalDuration: number;
    turnCount: number;
    toolCalls: number;
    handoffs: number;
  };
}

/**
 * Event emitted during an agent run
 */
export type RunEvent = 
  | { type: "thinking"; agentType: AgentType }
  | { type: "message"; message: Message }
  | { type: "tool_start"; command: Command }
  | { type: "tool_end"; result: ToolResult }
  | { type: "handoff_start"; from: AgentType; to: AgentType; reason: string }
  | { type: "handoff_end"; to: AgentType }
  | { type: "error"; error: string }
  | { type: "completed"; result: RunResult };

/**
 * Callback for run events
 */
export type RunEventCallback = (event: RunEvent) => void;

/**
 * Hook for receiving events during a run
 */
export interface RunHooks {
  onEvent?: RunEventCallback;
  onThinking?: (agentType: AgentType) => void;
  onMessage?: (message: Message) => void;
  onToolStart?: (command: Command) => void;
  onToolEnd?: (result: ToolResult) => void;
  onHandoffStart?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffEnd?: (to: AgentType) => void;
  onError?: (error: string) => void;
  onCompleted?: (result: RunResult) => void;
}

/**
 * Context for filtering handoff inputs
 */
export interface HandoffInputContext {
  // Previous messages before handoff
  previousMessages: Message[];
  // Current messages including handoff
  currentMessages: Message[];
  // Agent types involved in handoff
  fromAgent: AgentType;
  toAgent: AgentType;
  // Reason for handoff
  reason: string;
}

/**
 * Function to filter inputs for handoffs
 */
export type HandoffInputFilter = (context: HandoffInputContext) => Message[];
