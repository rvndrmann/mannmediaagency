
import { Command } from "@/types/message";

/**
 * Parse a tool command from text output
 */
export function parseToolCommand(text: string): Command | null {
  try {
    // First try the formal TOOL format used by the tool orchestrator
    const toolMatch = text.match(/TOOL:\s*([a-z0-9-]+)/i);
    const paramsMatch = text.match(/PARAMETERS:\s*(\{.+\})/s);
    
    if (toolMatch) {
      const feature = toolMatch[1].toLowerCase();
      let parameters = {};
      
      if (paramsMatch) {
        try {
          parameters = JSON.parse(paramsMatch[1]);
          console.log(`Parsed tool parameters:`, parameters);
        } catch (e) {
          console.error("Error parsing tool parameters:", e);
        }
      }
      
      return {
        feature: feature as Command["feature"],
        action: "create",
        parameters,
        confidence: 0.9
      };
    }
    
    // If no match with the formal TOOL format, try the more flexible direct agent format
    // This looks for standard JSON tool calls in the LLM output
    const toolCallPattern = /I'll use the ([a-z0-9-]+) tool.*?(\{.*?\})/is;
    const directMatch = text.match(toolCallPattern);
    
    if (directMatch) {
      const feature = directMatch[1].toLowerCase();
      
      try {
        const parameters = JSON.parse(directMatch[2]);
        console.log(`Parsed direct tool parameters:`, parameters);
        
        return {
          feature: feature as Command["feature"],
          action: "create",
          parameters,
          confidence: 0.8,
          type: "direct"
        };
      } catch (e) {
        console.error("Error parsing direct tool parameters:", e);
      }
    }
    
    console.log("No tool command found in text");
    return null;
  } catch (error) {
    console.error("Error parsing tool command:", error);
    return null;
  }
}
