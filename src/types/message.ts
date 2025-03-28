export interface Message {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
  agentType?: string;
  attachments?: Attachment[];
  tool_name?: string;
  tool_arguments?: string;
  // Additional fields for multi-agent chat
  status?: "thinking" | "working" | "completed" | "error";
  tasks?: Task[];
  command?: Command;
  handoffRequest?: HandoffRequest;
  timestamp?: string;
  type?: MessageType;
  selectedTool?: string; // Added for use-ai-chat.tsx
  structured_output?: any; // Added to support structured data from LLM responses
  continuityData?: ContinuityData; // Added for handoff context between agents
}

// Data for maintaining context during agent handoffs
export interface ContinuityData {
  fromAgent?: string;
  toAgent?: string;
  reason?: string;
  timestamp?: string;
  preserveHistory?: boolean;
  additionalContext?: Record<string, any>;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  file?: File;
}

export interface Command {
  name: string;
  parameters?: Record<string, any>;
  // Maintaining backwards compatibility
  args?: Record<string, any>;
  feature?: string;
  action?: string;
}

export interface Task {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  details?: string;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
  context?: Record<string, any>;
  preserveFullHistory?: boolean; // Added to control history preservation
}

export type MessageType = "user" | "agent" | "system" | "tool" | "handoff" | "error";

// Agent types
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  type: string; // Required 
  icon: AgentIconType | string; // Modified to accept both enum and string
  isBuiltIn: boolean; // Required
  color?: string;
  instructions?: string;
}

// Allow both enum values and string literals to support different component usage patterns
export type AgentIconType = 
  | "assistant" 
  | "script" 
  | "image" 
  | "tool" 
  | "scene" 
  | "browser" 
  | "custom"
  | "Bot" 
  | "PenLine" 
  | "Image" 
  | "Wrench" 
  | "Code" 
  | "FileText" 
  | "Zap" 
  | "Brain" 
  | "Lightbulb" 
  | "Music";

export interface AgentMessage extends Message {
  agentType: string;
}
