
import { Message } from "@/types/message";
import { ToolContext, ToolResult } from "@/hooks/types";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiredCredits?: number;
  execute: (params: any, context: ToolContext) => Promise<ToolResult>;
}

export interface CommandExecutionState {
  command: string;
  params: Record<string, any>;
  status: "pending" | "executing" | "completed" | "failed";
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  commandId?: string;
}

export interface TraceEvent {
  id: string;
  type: string;
  timestamp: number;
  data: any;
}

export interface ConversationData {
  id: string;
  created_at: string;
  user_id: string;
  last_message_at: string;
  message_count: number;
  initial_prompt: string;
}

export interface AnalyticsData {
  totalMessages: number;
  totalConversations: number;
  messagesByAgent: Record<string, number>;
  handoffCount: number;
  toolUsageCount: Record<string, number>;
}
