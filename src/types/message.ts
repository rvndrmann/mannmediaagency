
export type MessageType = 
  | "chat" 
  | "system" 
  | "function" 
  | "tool" 
  | "error" 
  | "handoff"
  | "canvas";

export type MessageStatus = "pending" | "complete" | "error";

export interface Attachment {
  id: string;
  type: string;
  url: string;
  name: string;
  size?: number;
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

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
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
}
