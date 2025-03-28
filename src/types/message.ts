
// MessageType type definition
export type MessageType = 
  | "text" 
  | "system" 
  | "handoff" 
  | "tool" 
  | "command" 
  | "error" 
  | undefined;

// We need to align these statuses to make them consistent across the app
export type MessageStatus = "loading" | "done" | "error" | "thinking" | "working" | "completed";

export interface Task {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  details?: string;
}

export interface Command {
  name: string;
  parameters?: Record<string, any>;
  args?: Record<string, any>; // Add this to fix tool-executor.ts
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

export interface ContinuityData {
  fromAgent: string;
  toAgent: string;
  reason: string;
  timestamp: string;
  preserveHistory: boolean;
  additionalContext?: Record<string, any>;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  status?: MessageStatus;
  attachments?: Attachment[];
  tool_name?: string;
  tool_arguments?: Record<string, any>;
  agentType?: string;
  type?: MessageType;
  tasks?: Task[];
  command?: Command;
  handoffRequest?: HandoffRequest;
  timestamp?: string;
  continuityData?: ContinuityData;
  structured_output?: any; // Add this to fix AgentRunner.ts
  selectedTool?: string; // Add this to fix use-ai-chat.tsx
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url?: string;
  content?: string;
  size?: number;
  contentType?: string; // Add this to fix FileAttachmentButton.tsx and other errors
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
  preserveFullHistory?: boolean;
  additionalContext?: Record<string, any>;
}
