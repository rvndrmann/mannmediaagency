
import { Command } from "@/types/message";

export const parseToolCall = (text: string): Command | null => {
  // Extract commands in the format: {{tool:command(params)}}
  const commandRegex = /\{\{tool:([^(]+)\(([^)]*)\)\}\}/;
  const match = text.match(commandRegex);
  
  if (!match) return null;
  
  const toolName = match[1].trim();
  const paramsString = match[2].trim();
  
  try {
    // Parse parameters - handle both JSON format and simple key=value format
    let parameters: Record<string, any> = {};
    
    if (paramsString) {
      if (paramsString.startsWith('{') && paramsString.endsWith('}')) {
        // JSON format
        parameters = JSON.parse(paramsString);
      } else {
        // Simple key=value format
        paramsString.split(',').forEach(pair => {
          const [key, value] = pair.split('=').map(s => s.trim());
          parameters[key] = value;
        });
      }
    }
    
    return {
      name: toolName,
      parameters
    };
  } catch (error) {
    console.error('Error parsing tool parameters:', error);
    return null;
  }
};

export const parseJsonToolCall = (text: string): Command | null => {
  try {
    // Try to extract JSON object enclosed in triple backticks
    const jsonRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/;
    const match = text.match(jsonRegex);
    
    if (!match) return null;
    
    const jsonString = match[1];
    const data = JSON.parse(jsonString);
    
    // Check if it has the required structure
    if (!data.name) return null;
    
    return {
      name: data.name,
      parameters: data.parameters || {}
    };
  } catch (error) {
    console.error('Error parsing JSON tool call:', error);
    return null;
  }
};
