export interface Message {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
  agentType?: string;
  attachments?: Attachment[];
  tool_name?: string;
  tool_arguments?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Command {
  name: string;
  parameters?: Record<string, any>;
  // Maintaining backwards compatibility
  args?: Record<string, any>;
}
