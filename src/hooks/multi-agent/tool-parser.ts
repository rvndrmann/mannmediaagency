
import { Command } from "@/types/message";

/**
 * Attempts to parse a command from text content
 * This is a simplified implementation that extracts basic tool commands
 */
export function detectToolCommand(content: string): Command | null {
  try {
    // Try to match a command pattern like: [TOOL: tool-name] parameters...
    const toolRegex = /\[TOOL:\s*([^\]]+)\]\s*(.+)$/s;
    const match = content.match(toolRegex);

    if (match) {
      const feature = match[1].trim();
      const paramsString = match[2].trim();
      
      // Try to parse parameters as JSON if possible
      let parameters: any = {};
      try {
        parameters = JSON.parse(paramsString);
      } catch {
        // If not valid JSON, use as raw text
        parameters = { text: paramsString };
      }
      
      return {
        feature: feature,
        action: "create", // Default action
        parameters
      };
    }

    // Also try to look for tool API pattern: {{tool-name: parameters}}
    const apiRegex = /\{\{([^:]+):\s*(.+)\}\}/;
    const apiMatch = content.match(apiRegex);
    
    if (apiMatch) {
      const feature = apiMatch[1].trim();
      const paramsString = apiMatch[2].trim();
      
      // Try to parse parameters as JSON if possible
      let parameters: any = {};
      try {
        parameters = JSON.parse(paramsString);
      } catch {
        // If not valid JSON, use as raw text
        parameters = { text: paramsString };
      }
      
      return {
        feature: feature,
        action: "create", // Default action
        parameters
      };
    }

    return null;
  } catch (error) {
    console.error("Error parsing tool command:", error);
    return null;
  }
}
