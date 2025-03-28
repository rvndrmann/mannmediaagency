
// Adding the MessageType type definition if it doesn't exist already
export type MessageType = 
  | "text" 
  | "system" 
  | "handoff" 
  | "tool" 
  | "command" 
  | "error" 
  | undefined;

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  status?: "loading" | "done" | "error";
  attachments?: Attachment[];
  tool_name?: string;
  tool_arguments?: Record<string, any>;
  agentType?: string;
  type?: MessageType;
  tasks?: any[];
  command?: {
    name: string;
    parameters?: Record<string, any>;
  };
  handoffRequest?: HandoffRequest;
  timestamp?: string;
  continuityData?: Record<string, any>;
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
