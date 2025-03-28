
import { Message as GlobalMessage, MessageStatus } from "@/types/message";

// Simple Message type for components that only need basic message functionality
export interface SimpleMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  status?: MessageStatus; // Use the consistent MessageStatus type
  id: string;
  createdAt: string;
}

// Convert the global Message type to SimpleMessage for components that expect it
export function adaptMessageToSimple(message: GlobalMessage): SimpleMessage {
  return {
    role: message.role,
    content: message.content,
    status: message.status,
    id: message.id,
    createdAt: message.createdAt
  };
}

// Create a globally compliant message from simple inputs
export function createGlobalMessage(input: {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  status?: MessageStatus;
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
