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
        
        // Check various tool call formats
        
        // Format 1: { tool: "toolName", parameters: {...} }
        if (jsonObj.tool && jsonObj.parameters) {
          return {
            name: jsonObj.tool,
            parameters: jsonObj.parameters
          };
        }
        
        // Format 2: { name: "toolName", arguments/parameters: {...} }
        if (jsonObj.name && (jsonObj.arguments || jsonObj.parameters)) {
          return {
            name: jsonObj.name,
            parameters: jsonObj.arguments || jsonObj.parameters
          };
        }
        
        // Format 3: { function: "toolName", args/parameters: {...} }
        if (jsonObj.function && (jsonObj.args || jsonObj.parameters)) {
          return {
            name: jsonObj.function,
            parameters: jsonObj.args || jsonObj.parameters
          };
        }
        
        // Format 4: Directly parse JSON if it has a 'name' property that seems like a tool
        if (jsonObj.name && typeof jsonObj.name === 'string' && 
            !/^\s*[A-Za-z]/.test(jsonObj.name) && Object.keys(jsonObj).length > 1) {
          const { name, ...parameters } = jsonObj;
          return { name, parameters };
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
        
        // Try to intelligently parse the values
        const trimmedValue = value.trim();
        if (/^-?\d+$/.test(trimmedValue)) {
          // Parse as integer
          parameters[key.trim()] = parseInt(trimmedValue, 10);
        } else if (/^-?\d+\.\d+$/.test(trimmedValue)) {
          // Parse as float
          parameters[key.trim()] = parseFloat(trimmedValue);
        } else if (/^(true|false)$/i.test(trimmedValue)) {
          // Parse as boolean
          parameters[key.trim()] = trimmedValue.toLowerCase() === 'true';
        } else {
          // Keep as string
          parameters[key.trim()] = trimmedValue;
        }
      }
    }
    
    return parameters;
  }
};

// Unified parser that tries all methods
export const parseToolCallFromText = (text: string): Command | null => {
  return parseJsonToolCall(text) || parseToolCall(text);
};
