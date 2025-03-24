
// If this file doesn't exist yet, we'll create it with the necessary types
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

// Add any other necessary types for messages, commands, etc.
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: string;
  agentType?: string;
  agentName?: string;
  agentIcon?: AgentIconType;
  agentColor?: string;
  // Add other message fields as needed
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  // Add other attachment fields as needed
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  // Add other task fields as needed
}

export interface Command {
  toolName: string;
  parameters: Record<string, any>;
  // Add other command fields as needed
}

// Add any other types that might be missing and causing errors
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | any;
  name?: string;
}
