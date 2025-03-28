
import { Message } from "@/types/message";

/**
 * A simplified version of the Message type for local operations
 * This is used for creating messages before they are converted to the global format
 */
export interface LocalMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt?: string;
  status?: Message["status"];
  attachments?: Message["attachments"];
  tool_name?: string;
  tool_arguments?: Record<string, any>;
  agentType?: string;
  type?: Message["type"];
  tasks?: Message["tasks"];
  command?: Message["command"];
  handoffRequest?: Message["handoffRequest"];
  timestamp?: string;
  continuityData?: Message["continuityData"];
  structured_output?: any;
  selectedTool?: string;
}
