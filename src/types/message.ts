export type MessageType = 
  | "chat" 
  | "system" 
  | "function" 
  | "tool" 
  | "error" 
  | "handoff"
  | "canvas"
  | "text";

export type MessageStatus = "pending" | "complete" | "error" | "thinking" | "working" | "completed" | "in-progress";

export interface Attachment {
  id: string;
  type: string;
  url: string;
  name: string;
  size?: number;
  contentType?: string;
  metadata?: Record<string, any>;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
  preserveFullHistory?: boolean;
  additionalContext?: Record<string, any>;
}

export interface ContinuityData {
  fromAgent: string;
  toAgent: string;
  reason: string;
  timestamp: string;
  preserveHistory: boolean;
  additionalContext: Record<string, any>;
}

export interface CanvasContentData {
  sceneId: string;
  title?: string;
  script?: string;
  description?: string;
  imagePrompt?: string;
  voiceOverText?: string;
}

export interface Task {
  id: string;
  name: string;
  status: "pending" | "working" | "complete" | "error" | "completed";
  details?: string;
}

export interface Command {
  name: string;
  parameters?: Record<string, any>;
  args?: Record<string, any>;
  feature?: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  instructions: string;
  type: string;
  isBuiltIn: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  type?: MessageType;
  createdAt: string;
  agentType?: string;
  attachments?: Attachment[];
  status?: MessageStatus;
  statusMessage?: string;
  handoffRequest?: HandoffRequest;
  continuityData?: ContinuityData;
  tool_name?: string;
  tool_arguments?: Record<string, any> | string;
  structured_output?: any;
  canvasContent?: CanvasContentData;
  tasks?: Task[];
  command?: Command;
  timestamp?: string;
  selectedTool?: string;
}
