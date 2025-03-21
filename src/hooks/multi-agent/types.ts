import { Message, Attachment } from "@/types/message";

// Context for tool execution
export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  previousOutputs?: Record<string, any>;
  sessionId?: string;
  messageHistory?: Message[];
  attachments?: Attachment[]; // Adding attachments to fix TS errors
}

// Result from tool execution
export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  creditsUsed?: number;
}

// Tool definition
export interface Tool {
  name: string;
  description: string;
  requiredCredits: number;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

// Tool definition with parameters (more detailed version)
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required: boolean;
    enum?: string[]; // Added to support enum in tool parameters
    default?: string; // Added to support default values in tool parameters
  }>;
  requiredCredits: number;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

// Config for agent runs
export interface RunConfig {
  model?: "gpt-4o-mini" | "gpt-4o";
  usePerformanceModel?: boolean;
  maxTurns?: number;
  tracingDisabled?: boolean;
  metadata?: Record<string, any>;
  runId?: string;
  groupId?: string;
  enableDirectToolExecution?: boolean;
}

// Define a union type for run status to ensure type safety
export type RunStatus = "pending" | "running" | "completed" | "error";

// State of an agent run
export interface RunState {
  currentAgentType: string;
  messages: Message[];
  handoffInProgress: boolean;
  turnCount: number;
  status: RunStatus;
  lastMessageIndex: number;
  lastToolResult?: ToolResult;
  lastCommand?: any;
  toolContext?: ToolContext;
  handoffRequest?: HandoffRequest;
  isCustomAgent?: boolean;
  enableDirectToolExecution?: boolean;
}

// Result of an agent run
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
    messageCount?: number;
  };
}

// Handoff request data
export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}

// Event emitted during an agent run
export type RunEvent = 
  | { type: "thinking"; agentType: string }
  | { type: "message"; message: Message }
  | { type: "tool_start"; command: any }
  | { type: "tool_end"; result: ToolResult }
  | { type: "handoff_start"; from: string; to: string; reason: string }
  | { type: "handoff_end"; to: string }
  | { type: "error"; error: string }
  | { type: "completed"; result: RunResult };

// Callback for run events
export type RunEventCallback = (event: RunEvent) => void;

// Hooks for receiving events during a run
export interface RunHooks {
  onEvent?: RunEventCallback;
  onThinking?: (agentType: string) => void;
  onMessage?: (message: Message) => void;
  onToolStart?: (command: any) => void;
  onToolEnd?: (result: ToolResult) => void;
  onHandoffStart?: (from: string, to: string, reason: string) => void;
  onHandoffEnd?: (to: string) => void;
  onError?: (error: string) => void;
  onCompleted?: (result: RunResult) => void;
}

// Context for filtering handoff inputs
export interface HandoffInputContext {
  previousMessages: Message[];
  currentMessages: Message[];
  fromAgent: string;
  toAgent: string;
  reason: string;
}

// Function to filter inputs for handoffs
export type HandoffInputFilter = (context: HandoffInputContext) => Message[];

// Update the TraceEvent to include all event types needed for TraceDashboard
export interface TraceEvent {
  id: string;
  timestamp: number;
  agentType: string;
  eventType: 'user_message' | 'assistant_response' | 'tool_call' | 'handoff' | 'error';
  data: any;
}

export interface TraceSummary {
  startTime: number;
  endTime: number;
  duration: number;
  agentTypes: string[];
  userId: string;
  success: boolean;
  toolCalls: number;
  handoffs: number;
  messageCount: number;
  modelUsed: string;
}

export interface TraceData {
  id: string;
  events: TraceEvent[];
  summary: TraceSummary;
}

export interface ConversationData {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  agentTypes: string[];
  messageCount: number;
  toolCalls: number;
  handoffs: number;
  status: 'pending' | 'completed' | 'error';
  userId: string;
  firstMessage?: string;
}

// Trace Manager implementation
export class TraceManager {
  private tracingEnabled: boolean;
  private currentTrace: Trace | null = null;
  
  constructor(tracingEnabled: boolean = true) {
    this.tracingEnabled = tracingEnabled;
  }
  
  isTracingEnabled(): boolean {
    return this.tracingEnabled;
  }
  
  startTrace(userId: string, runId: string): Trace {
    // Create a simple trace object
    const trace: Trace = {
      traceId: runId,
      start: () => {
        console.log(`Starting trace ${runId} for user ${userId}`);
      },
      finish: () => {
        console.log(`Finishing trace ${runId} for user ${userId}`);
      },
      recordEvent: (eventType: string, agentType: string, data: any) => {
        console.log(`Event in trace ${runId}: ${eventType} from ${agentType}`, data);
      }
    };
    
    this.currentTrace = trace;
    trace.start();
    return trace;
  }
  
  recordEvent(eventType: string, agentType: string, event: any): void {
    if (this.tracingEnabled && this.currentTrace) {
      this.currentTrace.recordEvent(eventType, agentType, event);
    }
  }
  
  finishTrace(): void {
    if (this.tracingEnabled && this.currentTrace) {
      this.currentTrace.finish();
      this.currentTrace = null;
    }
  }
}

// Trace interface
export interface Trace {
  traceId: string;
  start(): void;
  finish(): void;
  recordEvent(eventType: string, agentType: string, data: any): void;
}

// Custom agent form data
export interface CustomAgentFormData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  instructions: string;
}

// Custom agent data
export interface CustomAgent {
  id: string;
  name: string;
  instructions: string;
  user_id: string;
  created_at?: string;
  description?: string;
  icon?: string;
  color?: string;
}
