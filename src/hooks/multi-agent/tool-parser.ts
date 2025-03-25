
import { Command } from "@/types/message";

export interface ParsedToolCall {
  toolName: string;
  parameters: Record<string, any>;
}

export function parseToolCall(text: string): Command | null {
  // Try to find a markdown-formatted tool call
  const markdownRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
  const markdownMatch = text.match(markdownRegex);
  
  if (markdownMatch) {
    try {
      const jsonData = JSON.parse(markdownMatch[1]);
      
      // Handle various formats
      if (jsonData.toolName && (jsonData.parameters || jsonData.args)) {
        return {
          toolName: jsonData.toolName,
          feature: jsonData.toolName,
          parameters: jsonData.parameters || jsonData.args
        };
      }
      
      if (jsonData.tool && jsonData.parameters) {
        return {
          toolName: jsonData.tool,
          feature: jsonData.tool,
          parameters: jsonData.parameters
        };
      }
    } catch (e) {
      console.error("Error parsing JSON from markdown block:", e);
    }
  }
  
  // Try to find a tool call with TOOL: and PARAMETERS: format
  const toolRegex = /TOOL:\s*([a-z0-9_-]+)(?:[,\s]\s*PARAMETERS:|\s+PARAMETERS:)\s*(\{.+\})/is;
  const toolMatch = text.match(toolRegex);
  
  if (toolMatch) {
    try {
      const toolName = toolMatch[1].trim();
      const parameters = JSON.parse(toolMatch[2]);
      
      return {
        toolName,
        feature: toolName,
        parameters
      };
    } catch (e) {
      console.error("Error parsing tool parameters:", e);
    }
  }
  
  // Try to find a tool in a more natural language format
  const naturalLanguageRegex = /(?:use|execute|run|call|activate)\s+(?:the\s+)?(?:tool\s+)?['"]?([a-z0-9_-]+)['"]?(?:\s+tool)?(?:\s+with\s+(?:parameters|args|arguments|params|data)\s*[:=])?\s*(\{.+\})/is;
  const naturalMatch = text.match(naturalLanguageRegex);
  
  if (naturalMatch) {
    try {
      const toolName = naturalMatch[1].trim();
      const parameters = JSON.parse(naturalMatch[2]);
      
      return {
        toolName,
        feature: toolName,
        parameters
      };
    } catch (e) {
      console.error("Error parsing natural language tool parameters:", e);
    }
  }
  
  // Try to find any JSON object that might contain tool information
  const jsonRegex = /(\{[\s\S]*?\})/g;
  const jsonMatches = [...text.matchAll(jsonRegex)];
  
  for (const match of jsonMatches) {
    try {
      const jsonData = JSON.parse(match[1]);
      
      if ((jsonData.toolName || jsonData.tool) && (jsonData.parameters || jsonData.args)) {
        return {
          toolName: jsonData.toolName || jsonData.tool,
          feature: jsonData.toolName || jsonData.tool,
          parameters: jsonData.parameters || jsonData.args
        };
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  
  return null;
}
