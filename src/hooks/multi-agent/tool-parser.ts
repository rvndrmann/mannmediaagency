
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
          // Try to extract a more flexible JSON structure
          const jsonString = extractJSONFromText(paramsMatch[1]);
          if (jsonString) {
            try {
              parameters = JSON.parse(jsonString);
              console.log(`Parsed tool parameters with flexible extraction:`, parameters);
            } catch (err) {
              console.error("Error parsing JSON with flexible extraction:", err);
            }
          }
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
    const toolCallPatterns = [
      /I'll use the ([a-z0-9-]+) tool.*?(\{.*?\})/is,
      /I need to use the ([a-z0-9-]+) tool.*?(\{.*?\})/is,
      /Using the ([a-z0-9-]+) tool.*?(\{.*?\})/is,
      /Let's use the ([a-z0-9-]+) tool.*?(\{.*?\})/is
    ];
    
    for (const pattern of toolCallPatterns) {
      const directMatch = text.match(pattern);
      
      if (directMatch) {
        const feature = directMatch[1].toLowerCase();
        
        try {
          // Try to parse the JSON directly
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
          
          // Try to extract a more flexible JSON structure
          const jsonString = extractJSONFromText(directMatch[2]);
          if (jsonString) {
            try {
              const parameters = JSON.parse(jsonString);
              console.log(`Parsed direct tool parameters with flexible extraction:`, parameters);
              
              return {
                feature: feature as Command["feature"],
                action: "create",
                parameters,
                confidence: 0.7,
                type: "direct"
              };
            } catch (err) {
              console.error("Error parsing JSON with flexible extraction:", err);
            }
          }
        }
      }
    }
    
    // Look for code-block formatted JSON
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{\s*".*"\s*:.*\})\s*```/s);
    if (codeBlockMatch) {
      try {
        const parameters = JSON.parse(codeBlockMatch[1]);
        const toolNameMatch = text.match(/use the ([a-z0-9-]+) tool/i);
        const feature = toolNameMatch ? toolNameMatch[1].toLowerCase() : "product-shot-v2";
        
        console.log(`Parsed code block tool parameters for ${feature}:`, parameters);
        
        return {
          feature: feature as Command["feature"],
          action: "create",
          parameters,
          confidence: 0.75,
          type: "code-block"
        };
      } catch (e) {
        console.error("Error parsing code block parameters:", e);
      }
    }
    
    console.log("No tool command found in text");
    return null;
  } catch (error) {
    console.error("Error parsing tool command:", error);
    return null;
  }
}

/**
 * Extract a valid JSON object from text that might have extra characters
 */
function extractJSONFromText(text: string): string | null {
  try {
    // Try to find the outermost '{' and '}'
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (startIndex !== -1 && endIndex !== -1) {
      return text.substring(startIndex, endIndex + 1);
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting JSON:", error);
    return null;
  }
}

/**
 * Parse handoff request from text output
 * This function is similar to the one in the edge function but allows frontend validation
 */
export function parseHandoffRequest(text: string): { targetAgent: string, reason: string } | null {
  if (!text || typeof text !== 'string') {
    console.log("Invalid input to parseHandoffRequest:", text);
    return null;
  }

  console.log("Attempting to parse handoff from:", text.slice(-300));
  
  // More flexible regex that can handle variations in format
  const handoffRegex = /HANDOFF:\s*([a-z0-9_-]+)(?:[,\s]\s*REASON:|\s+REASON:)\s*(.+?)(?:$|[\n\r])/is;
  const handoffMatch = text.match(handoffRegex);
  
  if (handoffMatch) {
    const targetAgent = handoffMatch[1].toLowerCase().trim();
    const reason = handoffMatch[2].trim();
    
    console.log(`Handoff detected: Agent=${targetAgent}, Reason=${reason}`);
    
    // Allow handoff to any agent including custom agents
    return { targetAgent, reason };
  } else {
    // Check if there's a partial match that needs more flexible parsing
    if (text.toLowerCase().includes("handoff")) {
      console.log("Potential handoff detected. Trying alternative parsing method.");
      
      // Try a two-step approach
      const handoffPart = text.match(/HANDOFF:\s*([a-z0-9_-]+)/i);
      const reasonPart = text.match(/REASON:\s*(.+?)(?:$|[\n\r])/i);
      
      if (handoffPart && reasonPart) {
        const targetAgent = handoffPart[1].toLowerCase().trim();
        const reason = reasonPart[1].trim();
        
        console.log(`Handoff detected using alternative parsing: Agent=${targetAgent}, Reason=${reason}`);
        return { targetAgent, reason };
      }
      
      // If we have just the agent but no reason, provide a default reason
      if (handoffPart) {
        const targetAgent = handoffPart[1].toLowerCase().trim();
        const reason = "Specialized assistance required";
        
        console.log(`Partial handoff detected, using default reason: Agent=${targetAgent}, Reason=${reason}`);
        return { targetAgent, reason };
      }
      
      console.log("Potential handoff format detected but couldn't parse completely");
    }
  }
  
  return null;
}
