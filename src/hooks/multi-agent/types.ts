
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
  // Whether to allow direct tool execution by non-tool agents
  enableDirectToolExecution?: boolean;
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
  // Whether the current agent is a custom agent
  isCustomAgent?: boolean;
  // Whether direct tool execution is enabled
  enableDirectToolExecution?: boolean;
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

/**
 * Trace represents a collection of events that occurred during an agent run
 */
export interface Trace {
  // Unique ID for this trace
  traceId: string;
  // ID of the user who initiated the trace
  userId: string;
  // ID of the conversation/run
  runId: string;
  // Start time of the trace
  startTime: Date;
  // End time of the trace
  endTime?: Date;
  // List of events that occurred during this trace
  events: TraceEvent[];
  // Total duration of the trace in milliseconds
  duration?: number;
  // Summary of the trace (final outcome)
  summary?: {
    totalMessages: number;
    toolCalls: number;
    handoffs: number;
    modelUsed: string;
    agents: AgentType[];
    success: boolean;
  };
}

/**
 * Event recorded in a trace
 */
export interface TraceEvent {
  // Type of event
  eventType: string;
  // Time when the event occurred
  timestamp: Date;
  // Current agent when the event occurred
  agentType: AgentType;
  // Additional data specific to the event type
  data: any;
}

/**
 * Utility to create and manage traces
 */
export class TraceManager {
  private currentTrace?: Trace;
  private isEnabled: boolean;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  /**
   * Start a new trace
   */
  startTrace(userId: string, runId: string): Trace | undefined {
    if (!this.isEnabled) return undefined;
    
    this.currentTrace = {
      traceId: `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      runId,
      startTime: new Date(),
      events: []
    };
    
    return this.currentTrace;
  }

  /**
   * Record an event in the current trace
   */
  recordEvent(eventType: string, agentType: AgentType, data: any): void {
    if (!this.isEnabled || !this.currentTrace) return;
    
    this.currentTrace.events.push({
      eventType,
      timestamp: new Date(),
      agentType,
      data
    });
  }

  /**
   * Complete the current trace and calculate metrics
   */
  finishTrace(): Trace | undefined {
    if (!this.isEnabled || !this.currentTrace) return undefined;
    
    this.currentTrace.endTime = new Date();
    this.currentTrace.duration = this.currentTrace.endTime.getTime() - this.currentTrace.startTime.getTime();
    
    // Calculate summary stats
    const agents = new Set<AgentType>();
    let toolCalls = 0;
    let handoffs = 0;
    let modelUsed = "";
    
    for (const event of this.currentTrace.events) {
      agents.add(event.agentType);
      
      if (event.eventType === "tool_start") {
        toolCalls++;
      } else if (event.eventType === "handoff_start") {
        handoffs++;
      } else if (event.eventType === "message" && event.data?.modelUsed) {
        modelUsed = event.data.modelUsed;
      }
    }
    
    this.currentTrace.summary = {
      totalMessages: this.currentTrace.events.filter(e => e.eventType === "message").length,
      toolCalls,
      handoffs,
      modelUsed,
      agents: Array.from(agents),
      success: true // Default to true, should be updated based on final event
    };
    
    const trace = this.currentTrace;
    this.currentTrace = undefined;
    return trace;
  }

  /**
   * Get the current trace
   */
  getCurrentTrace(): Trace | undefined {
    return this.currentTrace;
  }

  /**
   * Check if tracing is enabled
   */
  isTracingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Enable or disable tracing
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}
