import { v4 as uuidv4 } from 'uuid';
import {
  Message as LocalMessage,
} from "@/types/local-message";
import {
  Message
} from "@/types/message";

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
