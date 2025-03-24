
// Message and agent types for the application
export type AgentIconType = 
  | "Bot" 
  | "PenLine" 
  | "Image" 
  | "Wrench" 
  | "Code" 
  | "FileText" 
  | "Zap" 
  | "Brain" 
  | "Lightbulb" 
  | "Music"
  | "Video"
  | "Globe"
  | "ShoppingBag";

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: AgentIconType;
  color: string;
  instructions: string;
  isCustom?: boolean;
  isTool?: boolean;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: string;
  agentType?: string;
  agentName?: string;
  agentIcon?: AgentIconType;
  agentColor?: string;
  status?: 'thinking' | 'working' | 'completed' | 'error';
  command?: Command;
  handoffRequest?: HandoffRequest;
  tasks?: Task[];
  attachments?: Attachment[];
  feature?: string;
  modelUsed?: string;
  selectedTool?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  contentType?: string;
  size?: number;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}

export interface Task {
  id: string;
  name?: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'in-progress' | 'error';
  details?: string;
}

export interface Command {
  toolName?: string;
  feature: string;
  parameters: Record<string, any>;
  type?: string;
  confidence?: number;
}

// Export a type alias for components that use a simpler Message type
export type SimpleMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  status?: 'thinking' | 'working' | 'completed' | 'error';
};

// Define AgentMessage type for use in multi-agent system
export type AgentMessage = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
};

// Analytics data types
export interface ConversationData {
  id: string;
  user_id: string;
  conversation_id: string;
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

export interface TraceData {
  summary: {
    agent_types?: string[];
    handoffs?: number;
    tool_calls?: number;
    duration?: number;
    success?: boolean;
  };
  messages: Array<{
    role: string;
    timestamp: string;
    user_message?: string;
    assistant_response?: string;
    agent_type?: string;
    trace?: {
      events: Array<{
        eventType: string;
        timestamp: string;
        agentType?: string;
        data: any;
      }>;
      modelUsed?: string;
      duration?: number;
      summary?: {
        handoffs?: number;
        toolCalls?: number;
        success?: boolean;
      };
    };
  }>;
}
