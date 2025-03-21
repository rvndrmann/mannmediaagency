
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
    
    // Try more flexible formats for direct agent mode
    
    // Check for JSON-like parameter blocks in the text
    const jsonBlocks = text.match(/\{[\s\S]*?\}/g);
    if (jsonBlocks) {
      // Look for mentions of tools near JSON blocks
      const toolNames = [
        "product-shot-v1", 
        "product-shot-v2", 
        "image-to-video", 
        "browser-use", 
        "product-video", 
        "custom-video"
      ];
      
      for (const toolName of toolNames) {
        if (text.toLowerCase().includes(toolName.toLowerCase())) {
          // Find the closest JSON block to the tool mention
          const toolIndex = text.toLowerCase().indexOf(toolName.toLowerCase());
          let closestJsonBlock = null;
          let closestDistance = Infinity;
          
          for (const block of jsonBlocks) {
            const blockIndex = text.indexOf(block);
            const distance = Math.abs(blockIndex - toolIndex);
            
            if (distance < closestDistance) {
              closestJsonBlock = block;
              closestDistance = distance;
            }
          }
          
          if (closestJsonBlock && closestDistance < 500) { // Within reasonable distance
            try {
              const parameters = JSON.parse(closestJsonBlock);
              console.log(`Parsed tool parameters for ${toolName}:`, parameters);
              
              return {
                feature: toolName as Command["feature"],
                action: "create",
                parameters,
                confidence: 0.8,
                type: "direct"
              };
            } catch (e) {
              console.error(`Error parsing parameters for ${toolName}:`, e);
            }
          }
        }
      }
    }
    
    // If we still haven't found a match, try a more pattern-based approach
    const toolNames = [
      "product-shot-v1", 
      "product-shot-v2", 
      "image-to-video", 
      "browser-use", 
      "product-video", 
      "custom-video"
    ];
    
    for (const toolName of toolNames) {
      const toolPattern = new RegExp(`(use|using|execute|run)\\s+(?:the)?\\s*${toolName}\\s+(?:tool|function)`, 'i');
      if (toolPattern.test(text)) {
        console.log(`Detected ${toolName} tool mention without structured parameters`);
        
        // Try to extract parameters from context
        let parameters: Record<string, any> = {};
        
        // Look for common parameter patterns based on tool type
        if (toolName.includes("product-shot")) {
          const promptMatch = text.match(/prompt[:\s]+["']?([^"'\n]+)["']?/i);
          if (promptMatch) parameters.prompt = promptMatch[1].trim();
          
          const sceneMatch = text.match(/scene[:\s]+["']?([^"'\n]+)["']?/i);
          if (sceneMatch) parameters.sceneDescription = sceneMatch[1].trim();
        }
        
        if (toolName === "image-to-video") {
          const promptMatch = text.match(/prompt[:\s]+["']?([^"'\n]+)["']?/i);
          if (promptMatch) parameters.prompt = promptMatch[1].trim();
          
          const durationMatch = text.match(/duration[:\s]+["']?(\d+)["']?/i);
          if (durationMatch) parameters.duration = durationMatch[1].trim();
          
          const ratioMatch = text.match(/(?:aspect)?ratio[:\s]+["']?([0-9:]+)["']?/i);
          if (ratioMatch) parameters.aspectRatio = ratioMatch[1].trim();
        }
        
        if (toolName === "browser-use") {
          const taskMatch = text.match(/task[:\s]+["']?([^"'\n]+)["']?/i);
          if (taskMatch) parameters.task = taskMatch[1].trim();
          
          // Look for save browser data option
          const saveMatch = text.match(/save(?:Browser)?Data[:\s]+["']?([a-zA-Z]+)["']?/i);
          if (saveMatch) parameters.saveBrowserData = saveMatch[1].toLowerCase() === "true";
        }
        
        if (toolName === "product-video") {
          const scriptMatch = text.match(/script[:\s]+["']?([^"'\n]+)["']?/i);
          if (scriptMatch) parameters.script = scriptMatch[1].trim();
          
          const styleMatch = text.match(/style[:\s]+["']?([a-zA-Z]+)["']?/i);
          if (styleMatch) parameters.style = styleMatch[1].toLowerCase();
          
          const readyMatch = text.match(/readyToGo[:\s]+["']?([a-zA-Z]+)["']?/i);
          if (readyMatch) parameters.readyToGo = readyMatch[1].toLowerCase() === "true";
        }
        
        if (toolName === "custom-video") {
          const descriptionMatch = text.match(/description[:\s]+["']?([^"'\n]+)["']?/i);
          if (descriptionMatch) parameters.description = descriptionMatch[1].trim();
          
          const creditsMatch = text.match(/credits(?:Amount)?[:\s]+["']?(\d+)["']?/i);
          if (creditsMatch) parameters.creditsAmount = parseInt(creditsMatch[1], 10);
        }
        
        return {
          feature: toolName as Command["feature"],
          action: "create",
          parameters,
          confidence: 0.7,
          type: "direct"
        };
      }
    }
    
    console.log("No tool command found in text");
    return null;
  } catch (error) {
    console.error("Error parsing tool command:", error);
    return null;
  }
}
