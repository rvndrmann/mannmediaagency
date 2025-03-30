
export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  sessionId?: string;
  agentName?: string;
  agentType?: string;
  attachments?: {
    type: string;
    url: string;
    name: string;
  }[];
  handoffRequest?: {
    targetAgent: string;
    reason: string;
  };
}
