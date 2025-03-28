
import { v4 as uuidv4 } from 'uuid';
import {
  LocalMessage
} from "@/types/local-message";
import {
  Message
} from "@/types/message";

// Simple message type for basic messaging components
export interface SimpleMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  status?: Message["status"];
  createdAt: string;
}

export const adapters = {
  toGlobalMessage: (message: LocalMessage): Message => {
    return {
      id: message.id || uuidv4(),
      role: message.role,
      content: message.content,
      createdAt: message.createdAt || new Date().toISOString(),
      status: message.status,
      tasks: message.tasks,
      tool_name: message.tool_name,
      tool_arguments: message.tool_arguments ? message.tool_arguments : undefined,
      agentType: message.agentType,
      type: message.type || "text",
      command: message.command,
      handoffRequest: message.handoffRequest,
      timestamp: message.timestamp || new Date().toISOString(),
      continuityData: message.continuityData,
      structured_output: message.structured_output,
      selectedTool: message.selectedTool,
      attachments: message.attachments || []
    };
  },
};

// Create a new message in the global format
export const createGlobalMessage = (message: LocalMessage): Message => {
  return adapters.toGlobalMessage(message);
};

// Helper function to adapt a single message to SimpleMessage format
export const adaptMessageToSimple = (message: Message): SimpleMessage => {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    createdAt: message.createdAt
  };
};

// Helper function to adapt an array of messages to SimpleMessage format
export const adaptMessagesToSimple = (messages: Message[]): SimpleMessage[] => {
  return messages.map(adaptMessageToSimple);
};
