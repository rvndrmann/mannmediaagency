
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

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type?: 'image' | 'video' | 'file' | string;
  size?: number;
  contentType?: string;
}

export interface Command {
  toolName: string;
  feature: string;
  parameters: any;
}

export interface Task {
  id: string;
  name?: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'error';
  result?: any;
  details?: string;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: AgentIconType;
  color: string;
  instructions: string;
}

export interface SimpleMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  status?: "thinking" | "completed" | "error";
  id?: string;
  createdAt?: string;
}

export interface AgentMessage extends SimpleMessage {
  agentType?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: string;
  status?: 'thinking' | 'completed' | 'error';
  agentType?: string;
  agentName?: string;
  agentIcon?: AgentIconType;
  agentColor?: string;
  modelUsed?: string;
  attachments?: Attachment[];
  command?: Command;
  tasks?: Task[];
  handoff?: {
    to: string;
    reason: string;
  };
}
