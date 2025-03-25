export interface Attachment {
  id: string;
  name: string;
  url: string;
  type?: 'image' | 'video' | 'file' | string;
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
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
}

// Add the handoff type to Message type
export interface HandoffRequest {
  targetAgent: string;
  reason: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  status?: 'thinking' | 'completed' | 'error';
  agentType?: string;
  modelUsed?: string;
  attachments?: Attachment[];
  command?: Command;
  tasks?: Task[];
  handoff?: {
    to: string;
    reason: string;
  };
}
