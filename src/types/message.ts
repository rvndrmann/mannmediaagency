
// Adding the MessageType type definition if it doesn't exist already
export type MessageType = 
  | "text" 
  | "system" 
  | "handoff" 
  | "tool" 
  | "command" 
  | "error" 
  | undefined;

export type MessageStatus = "loading" | "done" | "error";

export interface Task {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "error";
  details?: string;
}

export interface Command {
  name: string;
  parameters?: Record<string, any>;
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
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url?: string;
  content?: string;
  size?: number;
}

export interface HandoffRequest {
  targetAgent: string;
  reason: string;
  preserveFullHistory?: boolean;
  additionalContext?: Record<string, any>;
}
