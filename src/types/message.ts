
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
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  contentType?: string;
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
}

export type MessageType = "user" | "agent" | "system" | "tool";

// Agent types
export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: AgentIconType | string; // Modified to accept both enum and string
  isBuiltIn: boolean;
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
