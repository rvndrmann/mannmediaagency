
export interface AgentInfo {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface Attachment {
  id: string;
  type: "image" | "file" | "video" | "audio";
  url: string;
  name: string;
  size?: number;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
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

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  status?: "thinking" | "working" | "completed" | "error";
  agentType?: string;
  attachments?: Attachment[];
  tasks?: Task[];
  handoffRequest?: HandoffRequest;
  command?: string;
  threadId?: string;
}
