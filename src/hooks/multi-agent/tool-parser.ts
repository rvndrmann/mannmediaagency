
import { Command } from "@/types/message";

// Parse a JSON tool call from a string
export function parseJsonToolCall(text: string): Command | null {
  // Look for JSON pattern with command, name, and parameters
  const jsonRegex = /```(?:json)?\s*({[\s\S]*?})```/;
  const match = text.match(jsonRegex);
  
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      
      // Check if it's a command with a name and optional parameters
      if (parsed && parsed.command && typeof parsed.command === 'string') {
        return {
          name: parsed.command,
          parameters: parsed.parameters || {}
        };
      } else if (parsed && parsed.name && typeof parsed.name === 'string') {
        return {
          name: parsed.name,
          parameters: parsed.parameters || parsed.args || {}
        };
      }
    } catch (e) {
      console.error("Failed to parse JSON tool call:", e);
    }
  }
  
  return null;
}

// Parse a tool call from a text format like "UseCalculator(num1=5, num2=10, operation='add')"
export function parseToolCall(text: string): Command | null {
  // Look for function call pattern: FunctionName(param1=value1, param2=value2)
  const functionRegex = /([a-zA-Z0-9_]+)\s*\(\s*([\s\S]*?)\s*\)/;
  const match = text.match(functionRegex);
  
  if (match && match[1] && match[2]) {
    const functionName = match[1];
    const paramsString = match[2];
    
    // Parse parameters
    const params: Record<string, any> = {};
    
    // Look for param=value patterns
    const paramRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:(['"])([^\2]*?)\2|([^,]+))/g;
    let paramMatch;
    
    while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
      const paramName = paramMatch[1];
      const paramValue = paramMatch[3] !== undefined ? paramMatch[3] : paramMatch[4];
      
      // Try to parse non-string values
      try {
        if (paramValue === 'true') {
          params[paramName] = true;
        } else if (paramValue === 'false') {
          params[paramName] = false;
        } else if (!isNaN(Number(paramValue))) {
          params[paramName] = Number(paramValue);
        } else {
          params[paramName] = paramValue;
        }
      } catch (e) {
        params[paramName] = paramValue;
      }
    }
    
    return {
      name: functionName,
      parameters: params
    };
  }
  
  return null;
}
