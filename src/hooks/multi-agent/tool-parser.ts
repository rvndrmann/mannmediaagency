
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
    
    // Check for other common formats
    const alternativeFormats = [
      // "Using the X tool with parameters: {...}"
      /Using the ([a-z0-9-]+) tool.*?parameters:?\s*(\{.*?\})/is,
      // "Let me invoke the X tool with {...}"
      /invoke the ([a-z0-9-]+) tool.*?(\{.*?\})/is,
      // "I'll execute X with parameters {...}" 
      /execute (?:the )?([a-z0-9-]+).*?parameters:?\s*(\{.*?\})/is
    ];
    
    for (const pattern of alternativeFormats) {
      const match = text.match(pattern);
      if (match) {
        const feature = match[1].toLowerCase();
        try {
          const parameters = JSON.parse(match[2]);
          console.log(`Parsed tool using alternative format: ${feature}`, parameters);
          
          return {
            feature: feature as Command["feature"],
            action: "create",
            parameters,
            confidence: 0.7,
            type: "alternative"
          };
        } catch (e) {
          console.error(`Error parsing alternative tool format for ${feature}:`, e);
        }
      }
    }
    
    console.log("No tool command found in text");
    return null;
  } catch (error) {
    console.error("Error parsing tool command:", error);
    return null;
  }
}
