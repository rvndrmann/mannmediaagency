
import { Message, Attachment } from "@/types/message";

// Context for tool execution
export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  previousOutputs?: Record<string, any>;
  sessionId?: string;
  messageHistory?: Message[];
  attachments?: Attachment[]; // Added to fix TS errors related to attachments
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
  }>;
  requiredCredits: number;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

// Agent runner options
export interface AgentRunnerOptions {
  usePerformanceModel?: boolean;
  enableDirectToolExecution?: boolean;
  customInstructions?: string;
  tracingDisabled?: boolean;
  metadata?: Record<string, any>;
  runId?: string;
  groupId?: string;
}

// Callbacks for agent runner
export interface AgentRunnerCallbacks {
  onMessage: (message: Message) => void;
  onError: (error: string) => void;
  onHandoffEnd?: (toAgent: string) => void;
}

// Handoff request data
export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}

// Analytics data
export interface AnalyticsData {
  totalConversations: number;
  completedHandoffs: number;
  successfulToolCalls: number;
  failedToolCalls: number;
  modelUsage: Record<string, number>;
  agentUsage: Record<string, number>;
}

// Conversation data
export interface ConversationData {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  agentTypes: string[];
  messageCount: number;
  toolCalls: number;
  handoffs: number;
  status: 'completed' | 'running' | 'failed';
  userId: string;
  firstMessage?: string;
}

// Trace Event data
export interface TraceEvent {
  id: string;
  timestamp: number;
  agentType: string;
  eventType: 'user_message' | 'assistant_response' | 'tool_call' | 'handoff';
  data: any;
}

// Trace summary
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

// Trace data
export interface TraceData {
  id: string;
  events: TraceEvent[];
  summary: TraceSummary;
}

// Custom agent 
export interface CustomAgent {
  id: string;
  name: string;
  instructions: string;
  user_id: string;
  created_at?: string;
}

// Custom agent form data
export interface CustomAgentFormData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  instructions: string;
}

// Runner types
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

// Tracing interfaces
export interface Trace {
  traceId: string;
  start(): void;
  finish(): void;
}

export class TraceManager {
  constructor(tracingEnabled: boolean) {}
  
  isTracingEnabled(): boolean {
    return false; // Placeholder implementation
  }
  
  startTrace(userId: string, runId: string): Trace {
    return {
      traceId: runId,
      start: () => {},
      finish: () => {}
    };
  }
  
  recordEvent(eventType: string, agentType: string, event: any): void {}
  
  finishTrace(): void {}
}
