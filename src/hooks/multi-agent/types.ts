
import { Attachment, Command, Message, HandoffRequest, Task, AgentMessage } from "@/types/message";

// Tool context and result types
export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  attachments: Attachment[];
  selectedTool?: string;
  previousOutputs: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  credits_used?: number;
}

export interface CommandExecutionState {
  commandId: string;
  status: string;
  startTime: Date;
  result?: ToolResult;
  endTime?: Date;
  error?: string;
}

// Trace types
export interface TraceEvent {
  eventType: string;
  timestamp: string;
  agentType?: string;
  data: any;
}

export interface Trace {
  traceId: string;
  runId: string;
  userId: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  events: TraceEvent[];
  summary?: {
    agentTypes: string[];
    handoffs: number;
    toolCalls: number;
    success: boolean;
    duration: number;
    messageCount?: number;
  };
}

// Trace manager class
export class TraceManager {
  private currentTrace: Trace | null = null;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  isTracingEnabled(): boolean {
    return this.enabled;
  }

  startTrace(userId: string, runId: string, sessionId?: string): Trace {
    if (!this.enabled) {
      return null as unknown as Trace;
    }

    this.currentTrace = {
      traceId: `trace_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      runId,
      userId,
      sessionId: sessionId || runId,
      startTime: new Date().toISOString(),
      events: [],
      summary: {
        agentTypes: [],
        handoffs: 0,
        toolCalls: 0,
        success: true,
        duration: 0
      }
    };

    return this.currentTrace;
  }

  recordEvent(eventType: string, data: any): void {
    if (!this.enabled || !this.currentTrace) {
      return;
    }

    this.currentTrace.events.push({
      eventType,
      timestamp: new Date().toISOString(),
      data
    });

    // Update summary based on event type
    if (eventType === 'handoff' && this.currentTrace.summary) {
      this.currentTrace.summary.handoffs++;
      
      // Add agent type if not already in the list
      const agentType = data.to;
      if (agentType && !this.currentTrace.summary.agentTypes.includes(agentType)) {
        this.currentTrace.summary.agentTypes.push(agentType);
      }
    }
    
    if (eventType === 'tool_start' && this.currentTrace.summary) {
      this.currentTrace.summary.toolCalls++;
    }
    
    if (eventType === 'error' && this.currentTrace.summary) {
      this.currentTrace.summary.success = false;
    }
  }

  finishTrace(): Trace | null {
    if (!this.enabled || !this.currentTrace) {
      return null;
    }

    this.currentTrace.endTime = new Date().toISOString();
    
    // Calculate duration
    if (this.currentTrace.summary) {
      const start = new Date(this.currentTrace.startTime).getTime();
      const end = new Date(this.currentTrace.endTime).getTime();
      this.currentTrace.summary.duration = (end - start) / 1000;
    }
    
    const completedTrace = { ...this.currentTrace };
    this.currentTrace = null;
    return completedTrace;
  }

  getCurrentTrace(): Trace | null {
    return this.currentTrace;
  }
}

// Runner types
export type RunStatus = "pending" | "running" | "completed" | "error";

export interface RunState {
  currentAgentType: string;
  messages: Message[];
  handoffInProgress: boolean;
  turnCount: number;
  status: RunStatus;
  lastMessageIndex: number;
  isCustomAgent: boolean;
  enableDirectToolExecution: boolean;
  lastToolResult?: ToolResult;
  lastCommand?: Command;
}

export interface RunConfig {
  maxTurns?: number;
  usePerformanceModel?: boolean;
  tracingDisabled?: boolean;
  enableDirectToolExecution?: boolean;
  runId?: string;
  metadata?: Record<string, any>;
  groupId?: string;
}

export type RunEventType = 
  | "message" 
  | "thinking" 
  | "handoff_start" 
  | "handoff_end" 
  | "tool_start" 
  | "tool_end" 
  | "completed" 
  | "error";

export interface RunEvent {
  type: RunEventType;
  message?: Message;
  agentType?: string;
  from?: string;
  to?: string;
  reason?: string;
  command?: Command;
  result?: any;
  error?: string;
}

export interface RunHooks {
  onEvent?: (event: RunEvent) => void;
  onMessage?: (message: Message) => void;
  onError?: (error: string) => void;
  onHandoffStart?: (from: string, to: string, reason: string) => void;
  onHandoffEnd?: (to: string) => void;
  onToolStart?: (command: Command) => void;
  onToolEnd?: (result: any) => void;
  onCompleted?: (result: RunResult) => void;
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
