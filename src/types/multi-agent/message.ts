
export type MessageStatus = "thinking" | "pending" | "working" | "completed" | "error";

export interface Task {
  id: string;
  name: string;
  status: "pending" | "working" | "completed" | "error";
  details?: string;
}

export interface Command {
  feature?: string;
  action?: string;
  tool?: string;
  type?: string;
  name: string;
  parameters?: Record<string, any>;
  args?: Record<string, any>;
}

export interface Attachment {
  id: string;
  type: string;
  url: string;
  name: string;
  size: number;
  contentType?: string;
}

export type MessageType = "text" | "image" | "code" | "tool_call" | "tool_result" | "error";

export interface ContinuityData {
  previousContextId?: string;
  continuityMarkers?: string[];
  fromAgent?: string;
  toAgent?: string;
  reason?: string;
  timestamp?: string;
  preserveHistory?: boolean;
  additionalContext?: Record<string, any>;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  instructions: string;
  systemPrompt?: string;
  isEnabled: boolean;
  icon?: string;
  color?: string;
  type?: string;
  isBuiltIn?: boolean;
}

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system" | "tool";
  createdAt: string;
  sessionId?: string;
  agentName?: string;
  agentType?: string;
  status?: MessageStatus;
  tasks?: Task[];
  attachments?: Attachment[];
  tool_name?: string;
  tool_arguments?: Record<string, any>;
  command?: Command;
  type?: MessageType;
  timestamp?: string;
  continuityData?: ContinuityData;
  structured_output?: any;
  selectedTool?: string;
  handoffRequest?: {
    targetAgent: string;
    reason: string;
    additionalContext?: string;
    preserveFullHistory?: boolean;
  };
}
