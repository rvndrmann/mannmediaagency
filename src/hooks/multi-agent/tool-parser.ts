
import { Command } from "@/types/message";

/**
 * Parse a tool command from text output
 */
export function parseToolCommand(text: string): Command | null {
  try {
    const toolMatch = text.match(/TOOL:\s*([a-z0-9-]+)/i);
    const paramsMatch = text.match(/PARAMETERS:\s*(\{.+\})/s);
    
    if (!toolMatch) {
      console.log("No tool command found in text");
      return null;
    }
    
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
  } catch (error) {
    console.error("Error parsing tool command:", error);
    return null;
  }
}
