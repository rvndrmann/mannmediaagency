
import { Message, Command } from "@/types/message";

// Detect if a message contains a tool command
export const detectToolCommand = (message: Message): Command | null => {
  // Simple regex to detect command patterns like `/tool param1=value1 param2=value2`
  const commandRegex = /^\/(\w+)(?:\s+(.*))?$/;
  
  // Check if the message content starts with a command
  const commandMatch = message.content.trim().match(commandRegex);
  
  if (!commandMatch) {
    return null;
  }
  
  const [, feature, paramsText] = commandMatch;
  
  // Parse parameters if present
  const parameters: Record<string, any> = {};
  
  if (paramsText) {
    // Match param=value patterns, handling quoted values
    const paramRegex = /(\w+)=(?:"([^"]*)"|([\w-]+))/g;
    let param;
    
    while ((param = paramRegex.exec(paramsText)) !== null) {
      const key = param[1];
      const value = param[2] !== undefined ? param[2] : param[3];
      parameters[key] = value;
    }
  }
  
  return {
    feature: feature as any, // Would be properly typed in a real implementation
    action: "create", // Default action
    parameters,
    confidence: 1.0,
    type: "standard"
  };
};

// Extract tool commands from a message
export const extractToolCommands = (message: Message): Command[] => {
  const commands: Command[] = [];
  const lines = message.content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('/')) {
      const command = detectToolCommand({ ...message, content: trimmedLine });
      if (command) {
        commands.push(command);
      }
    }
  }
  
  return commands;
};

// Check if a message is likely requesting a tool execution
export const isToolRequest = (message: Message): boolean => {
  // Look for patterns like "Use tool X to..." or "Can you use X tool to..."
  const toolRequestPatterns = [
    /use\s+(\w+)\s+tool/i,
    /with\s+(\w+)\s+tool/i,
    /using\s+(\w+)\s+tool/i,
    /run\s+(\w+)\s+tool/i,
    /execute\s+(\w+)\s+tool/i,
  ];
  
  for (const pattern of toolRequestPatterns) {
    if (pattern.test(message.content)) {
      return true;
    }
  }
  
  // Also check for direct command syntax
  return message.content.trim().startsWith('/');
};
