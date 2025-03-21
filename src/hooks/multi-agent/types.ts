
import { Message, Attachment } from "@/types/message";

// Context for tool execution
export interface ToolContext {
  userId: string;
  creditsRemaining: number;
  previousOutputs?: Record<string, any>;
  sessionId?: string;
  messageHistory?: Message[];
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
  instructions: string;
}
