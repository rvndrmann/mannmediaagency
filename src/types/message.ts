
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: string;
  agentType?: string; 
  sceneId?: string; // This is needed for scene references
  metadata?: Record<string, any>;
  status?: 'pending' | 'completed' | 'error';
  type?: MessageType;
  attachments?: Attachment[];
  tool_name?: string;
  tool_arguments?: Record<string, any>;
  tasks?: Task[];
  command?: Command;
  handoffRequest?: any;
  timestamp?: string;
  continuityData?: any;
  structured_output?: any;
  selectedTool?: string;
}

export type MessageType = 'text' | 'canvas' | 'system' | 'tool' | 'image' | 'video';

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'video' | 'audio';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Command {
  action: string;
  content?: string;
  target?: string;
  params?: Record<string, any>;
}

export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  instructions?: string;
}

export type MessageStatus = 'pending' | 'completed' | 'error';
