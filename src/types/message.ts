
import { WorkflowState, WorkflowStage } from "@/types/canvas";

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: string;
  agentType?: string; 
  sceneId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
  status?: MessageStatus;
  type?: MessageType;
  attachments?: Attachment[];
  tool_name?: string;
  tool_arguments?: Record<string, any>;
  tasks?: Task[];
  command?: Command;
  handoffRequest?: {
    targetAgent: string;
    reason?: string;
  };
  timestamp?: string;
  continuityData?: any;
  structured_output?: any;
  selectedTool?: string;
  workflow?: {
    state?: WorkflowState;
    currentStage?: WorkflowStage;
    progress?: number;
  };
}

export type MessageType = 'text' | 'canvas' | 'system' | 'tool' | 'image' | 'video' | 'handoff' | 'error' | 'context';

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
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'error' | 'working';
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
  name?: string;
  details?: string;
}

export interface Command {
  action: string;
  content?: string;
  target?: string;
  params?: Record<string, any>;
  name?: string;
  feature?: string;
  parameters?: Record<string, any>;
}

export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  instructions?: string;
  type?: string;
}

export type MessageStatus = 'pending' | 'completed' | 'error' | 'thinking' | 'working' | 'in-progress';
