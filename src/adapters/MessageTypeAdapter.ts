
import { Message as GlobalMessage } from "@/types/message";

// Simple Message type for components that only need basic message functionality
export interface SimpleMessage {
  role: "user" | "assistant";
  content: string;
  status?: "thinking" | "working" | "completed" | "error";
}

// Convert the global Message type to SimpleMessage for components that expect it
export function adaptMessageToSimple(message: GlobalMessage): SimpleMessage {
  // Filter role to only "user" or "assistant"
  const role = message.role === "system" || message.role === "tool" 
    ? "assistant" // Default system and tool messages to assistant
    : message.role;
  
  return {
    role,
    content: message.content,
    status: message.status
  };
}

// Create a globally compliant message from simple inputs
export function createGlobalMessage(input: {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  status?: "thinking" | "working" | "completed" | "error";
  tasks?: any[];
  tool_name?: string;
  tool_arguments?: string;
}): GlobalMessage {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  };
}

// Adapt a array of GlobalMessages to SimpleMessages
export function adaptMessagesToSimple(messages: GlobalMessage[]): SimpleMessage[] {
  return messages.map(adaptMessageToSimple);
}
