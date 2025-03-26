
import { Message as GlobalMessage } from "@/types/message";
import { SimpleMessage } from "@/adapters/MessageTypeAdapter";

/**
 * Convert any message array to the GlobalMessage format
 * This is useful when components receive different message types
 */
export function adaptToGlobalMessage(message: any): GlobalMessage {
  // If it's already a global message with required properties
  if (message.id && message.createdAt) {
    return message as GlobalMessage;
  }
  
  // Create a new global message
  return {
    id: message.id || crypto.randomUUID(),
    role: message.role || "assistant",
    content: message.content || "",
    createdAt: message.createdAt || new Date().toISOString(),
    status: message.status,
    attachments: message.attachments,
    tool_name: message.tool_name,
    tool_arguments: message.tool_arguments,
    tasks: message.tasks,
    agentType: message.agentType,
    command: message.command,
    handoffRequest: message.handoffRequest,
    timestamp: message.timestamp,
    type: message.type
  };
}

/**
 * Ensure an array of messages conforms to the GlobalMessage format
 */
export function ensureGlobalMessages(messages: any[]): GlobalMessage[] {
  return messages.map(adaptToGlobalMessage);
}

/**
 * Convert any message type to a SimpleMessage format
 * This is useful when components expect only simple message properties
 */
export function convertToSimpleMessage(message: any): SimpleMessage {
  return {
    id: message.id || crypto.randomUUID(),
    role: getSimpleRole(message.role),
    content: message.content || "",
    status: message.status,
    createdAt: message.createdAt || new Date().toISOString()
  };
}

/**
 * Convert any role type to a simple role ("user" or "assistant")
 */
function getSimpleRole(role: string | undefined): "user" | "assistant" {
  if (!role) return "assistant";
  
  return role === "user" ? "user" : "assistant";
}

/**
 * Convert any array of messages to SimpleMessage format
 */
export function convertToSimpleMessages(messages: any[]): SimpleMessage[] {
  return messages.map(convertToSimpleMessage);
}
