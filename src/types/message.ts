
export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  agentType?: string;
  status?: "thinking" | "completed" | "error";
  attachments?: Attachment[];
  handoffRequest?: HandoffRequest;
  command?: Command;
  tasks?: Task[];
  selectedTool?: string;
  modelUsed?: string;
}

export interface Attachment {
  id: string;
  url: string;
  name: string;
  type: string;
  size?: number;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}

export interface Command {
  toolName: string;
  feature: string;
  parameters: Record<string, any>;
}

export interface Task {
  id: string;
  name?: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "in-progress" | "error";
  details?: string;
}

export interface TraceData {
  summary: {
    agent_types: string[];
    handoffs: number;
    tool_calls: number;
    duration: number;
    success: boolean;
    events?: any[];
  };
  messages: {
    role: string;
    timestamp: string;
    user_message?: string;
    assistant_response?: string;
    agent_type?: string;
    trace?: {
      events: any[];
      modelUsed: string;
      duration: number;
      summary: {
        handoffs: number;
        toolCalls: number;
        success: boolean;
      };
    };
  }[];
}

export interface ConversationData {
  id: string;
  user_id: string;
  conversation_id: string;
  group_id?: string;
  timestamp: string;
  agent_types: string[];
  duration: number;
  messages_count: number;
  has_handoffs: boolean;
  has_tool_calls: boolean;
}

export interface AnalyticsData {
  total_conversations: number;
  total_handoffs: number;
  total_tool_calls: number;
  average_duration: number;
  agent_usage: Record<string, number>;
  conversations_by_day: Record<string, number>;
}

export interface ApiResponse {
  completion: string;
  handoffRequest?: HandoffRequest;
  modelUsed: string;
}

export interface AgentMessage extends Message {
  role: "assistant";
  agentType: string;
}
