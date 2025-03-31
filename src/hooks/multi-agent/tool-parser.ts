
import { Command } from "@/types/message";

// Parse a tool call from a text response
export const parseToolCall = (text: string): Command | null => {
  // Regular expression to match tool call patterns
  const toolCallRegex = /\[Tool: (\w+)\]\s*Parameters:([\s\S]*?)(?=\[\/Tool\]|\[Tool:|\z)/g;
  const matches = [...text.matchAll(toolCallRegex)];
  
  if (matches.length === 0) return null;
  
  const firstMatch = matches[0];
  const toolName = firstMatch[1].trim();
  const parametersText = firstMatch[2].trim();
  
  try {
    // Try to parse the parameters as JSON
    const parameters = parseJsonParameters(parametersText);
    
    return {
      name: toolName,
      parameters
    };
  } catch (error) {
    console.error("Error parsing tool call parameters:", error);
    return {
      name: toolName,
      parameters: {}
    };
  }
};

// Parse a JSON tool call from a response
export const parseJsonToolCall = (text: string): Command | null => {
  try {
    // Look for JSON objects that might contain tool calls
    const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*?\})/g;
    const matches = [...text.matchAll(jsonRegex)];
    
    if (matches.length === 0) return null;
    
    // Try each potential JSON match
    for (const match of matches) {
      const jsonStr = (match[1] || match[2]).trim();
      try {
        const jsonObj = JSON.parse(jsonStr);
        
        // Check if this is a tool call format
        if (jsonObj.tool && jsonObj.parameters) {
          return {
            name: jsonObj.tool,
            parameters: jsonObj.parameters
          };
        }
        
        // Alternative format
        if (jsonObj.name && (jsonObj.arguments || jsonObj.parameters)) {
          return {
            name: jsonObj.name,
            parameters: jsonObj.arguments || jsonObj.parameters
          };
        }
      } catch (e) {
        // Continue to next potential match
        console.warn("Failed to parse potential JSON tool call:", e);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing JSON tool call:", error);
    return null;
  }
};

// Helper function to parse parameters
const parseJsonParameters = (text: string): Record<string, any> => {
  try {
    // Try to see if it's a valid JSON object already
    const parsed = JSON.parse(text);
    return parsed;
  } catch (e) {
    // Not valid JSON, try to parse key-value pairs
    const parameters: Record<string, any> = {};
    const lines = text.split('\n');
    
    for (const line of lines) {
      const keyValueMatch = line.match(/(\w+):\s*(.*)/);
      if (keyValueMatch) {
        const [_, key, value] = keyValueMatch;
        parameters[key.trim()] = value.trim();
      }
    }
    
    return parameters;
  }
};
