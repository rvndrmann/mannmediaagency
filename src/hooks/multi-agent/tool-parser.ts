
import { Command } from "@/types/message";

/**
 * Parse a tool call from a message
 */
export const parseToolCall = (message: string): Command | null => {
  try {
    // Try to find a JSON object that contains name and parameters
    const regex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gm;
    const match = regex.exec(message);
    
    if (match && match[1]) {
      const parsed = JSON.parse(match[1]);
      
      // Check if it has the required properties
      if (parsed.name && typeof parsed.parameters === 'object') {
        return {
          name: parsed.name,
          parameters: parsed.parameters
        };
      }
    }
    
    // Try to find a tool call format: @tool_name(parameters)
    const toolRegex = /@(\w+)\(([^)]*)\)/;
    const toolMatch = toolRegex.exec(message);
    
    if (toolMatch) {
      const toolName = toolMatch[1];
      const paramsStr = toolMatch[2];
      
      try {
        // Try to parse parameters as JSON
        const params = paramsStr ? JSON.parse(`{${paramsStr}}`) : {};
        return {
          name: toolName,
          parameters: params
        };
      } catch (e) {
        // If JSON parsing fails, try to parse as key-value pairs
        const params: Record<string, string> = {};
        const pairs = paramsStr.split(',');
        
        pairs.forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim());
          if (key && value) {
            params[key] = value;
          }
        });
        
        return {
          name: toolName,
          parameters: params
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing tool call:", error);
    return null;
  }
};

/**
 * Parse a JSON-formatted tool call
 */
export const parseJsonToolCall = (json: string): Command | null => {
  try {
    const parsed = JSON.parse(json);
    
    if (parsed.name && typeof parsed.parameters === 'object') {
      return {
        name: parsed.name,
        parameters: parsed.parameters
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing JSON tool call:", error);
    return null;
  }
};
