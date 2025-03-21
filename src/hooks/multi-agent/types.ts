
import { Attachment } from "@/types/message";
import { AgentType } from "@/hooks/use-multi-agent-chat";
import { Command, Message } from "@/types/message";
import { v4 as uuidv4 } from "uuid";

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  attachments?: Attachment[];
  selectedTool?: string;
  previousOutputs?: Record<string, any>;
  [key: string]: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits: number;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

// Command execution tracking
export interface CommandExecutionState {
  commandId: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  result?: ToolResult;
  error?: string;
}

// Agent Runner Types
export type RunStatus = "pending" | "running" | "completed" | "error";

export interface RunState {
  currentAgentType: AgentType;
  messages: Message[];
  handoffInProgress: boolean;
  turnCount: number;
  status: RunStatus;
  lastMessageIndex: number;
  lastToolResult?: ToolResult;
  lastCommand?: Command;
  toolContext?: ToolContext;
  isCustomAgent?: boolean;
  enableDirectToolExecution?: boolean;
}

export interface RunConfig {
  model?: "gpt-4o-mini" | "gpt-4o";
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
  error?: string;
  metrics?: {
    totalDuration: number;
    turnCount: number;
    toolCalls: number;
    handoffs: number;
    messageCount: number;
  };
}

export type RunEvent = 
  | { type: "thinking"; agentType: AgentType }
  | { type: "message"; message: Message }
  | { type: "tool_start"; command: Command }
  | { type: "tool_end"; result: ToolResult }
  | { type: "handoff_start"; from: AgentType; to: AgentType; reason: string }
  | { type: "handoff_end"; to: AgentType }
  | { type: "error"; error: string }
  | { type: "completed"; result: RunResult };

export interface RunHooks {
  onEvent?: (event: RunEvent) => void;
  onThinking?: (agentType: AgentType) => void;
  onMessage?: (message: Message) => void;
  onToolStart?: (command: Command) => void;
  onToolEnd?: (result: ToolResult) => void;
  onHandoffStart?: (from: AgentType, to: AgentType, reason: string) => void;
  onHandoffEnd?: (to: AgentType) => void;
  onError?: (error: string) => void;
  onCompleted?: (result: RunResult) => void;
}

// Trace management types
export interface TraceEvent {
  id: string;
  timestamp: number;
  eventType: string;
  agentType: string;
  data: any;
}

export interface TraceSummary {
  startTime: number;
  endTime?: number;
  duration?: number;
  agentTypes: string[];
  userId: string;
  success?: boolean;
  toolCalls?: number;
  handoffs?: number;
  messageCount?: number;
  modelUsed?: string;
}

export interface Trace {
  traceId: string;
  runId: string;
  events: TraceEvent[];
  summary?: TraceSummary;
  duration?: number;
}

export class TraceManager {
  private currentTrace: Trace | null = null;
  private isEnabled: boolean;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  isTracingEnabled(): boolean {
    return this.isEnabled;
  }

  startTrace(userId: string, runId: string): Trace {
    if (!this.isEnabled) {
      return { traceId: '', runId: '', events: [] };
    }

    this.currentTrace = {
      traceId: uuidv4(),
      runId,
      events: [],
      summary: {
        startTime: Date.now(),
        agentTypes: [],
        userId
      }
    };

    return this.currentTrace;
  }

  recordEvent(eventType: string, agentType: string, data: any): TraceEvent | null {
    if (!this.isEnabled || !this.currentTrace) {
      return null;
    }

    const event: TraceEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      eventType,
      agentType,
      data
    };

    this.currentTrace.events.push(event);

    // Update agent types
    if (
      this.currentTrace.summary && 
      !this.currentTrace.summary.agentTypes.includes(agentType)
    ) {
      this.currentTrace.summary.agentTypes.push(agentType);
    }

    return event;
  }

  finishTrace(): Trace | null {
    if (!this.isEnabled || !this.currentTrace) {
      return null;
    }

    const endTime = Date.now();
    
    if (this.currentTrace.summary) {
      this.currentTrace.summary.endTime = endTime;
      this.currentTrace.summary.duration = endTime - this.currentTrace.summary.startTime;
      this.currentTrace.summary.success = true;
    }
    
    this.currentTrace.duration = endTime - (this.currentTrace.summary?.startTime || endTime);
    
    const completedTrace = { ...this.currentTrace };
    this.currentTrace = null;
    
    return completedTrace;
  }

  getCurrentTrace(): Trace | null {
    return this.currentTrace;
  }
}
