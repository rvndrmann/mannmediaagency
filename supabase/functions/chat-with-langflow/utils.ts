
import { ExtractedResponse } from "./types.ts";
import { REQUEST_ID_PREFIX, MAX_INPUT_LENGTH } from "./config.ts";

// Generate unique request ID
export function generateRequestId(): string {
  return REQUEST_ID_PREFIX + crypto.randomUUID();
}

export function checkEnvironmentVariables() {
  const variables = {
    baseApiUrl: Deno.env.get("BASE_API_URL"),
    langflowId: Deno.env.get("LANGFLOW_ID"),
    flowId: Deno.env.get("FLOW_ID"),
    applicationToken: Deno.env.get("APPLICATION_TOKEN") ? "Set" : "Not set",
  };
  
  console.log("Environment variables:", JSON.stringify(variables));
  
  if (!Deno.env.get("LANGFLOW_ID") || !Deno.env.get("FLOW_ID") || !Deno.env.get("APPLICATION_TOKEN")) {
    const missingVars = [];
    if (!Deno.env.get("LANGFLOW_ID")) missingVars.push("LANGFLOW_ID");
    if (!Deno.env.get("FLOW_ID")) missingVars.push("FLOW_ID");
    if (!Deno.env.get("APPLICATION_TOKEN")) missingVars.push("APPLICATION_TOKEN");
    
    return {
      isValid: false,
      missingVars: missingVars.join(", ")
    };
  }
  
  return { isValid: true };
}

export function extractResponseText(responseData: any): ExtractedResponse {
  try {
    console.log("Extracting response text");
    
    // Check for MCP or Assistants API format
    if (responseData?.outputs?.[0]?.outputs?.[0]?.results?.message) {
      const result = responseData.outputs[0].outputs[0].results;
      const messageText = result.message;
      const command = result.command || null;
      
      // Safe logging with type checking
      if (typeof messageText === 'string') {
        console.log('Extracted message text:', messageText.length > 100 ? (messageText.substring(0, 100) + '...') : messageText);
      } else {
        console.log('Extracted message text (non-string):', JSON.stringify(messageText).substring(0, 100) + '...');
      }
      
      console.log('Extracted command:', command ? JSON.stringify(command).substring(0, 100) + '...' : 'null');
      
      return { 
        messageText: typeof messageText === 'string' ? messageText : JSON.stringify(messageText), 
        command 
      };
    }
    
    // Check original Langflow format
    if (!responseData?.outputs?.[0]?.outputs?.[0]?.results) {
      console.error('Invalid or unexpected response format:', JSON.stringify(responseData, null, 2).substring(0, 500));
      return { messageText: null, command: null };
    }

    const result = responseData.outputs[0].outputs[0].results;
    
    let messageText;
    let command = null;
    
    if (typeof result.message === 'string') {
      messageText = result.message;
    } else if (result.message?.text) {
      messageText = result.message.text;
    } else if (result.message) {
      messageText = JSON.stringify(result.message);
    } else if (result.output) {
      messageText = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
    } else {
      messageText = "I received a response but couldn't understand it. Please try again.";
    }
    
    // Check for command in various possible locations
    if (result.command) {
      command = result.command;
    } else if (result.actions && Array.isArray(result.actions) && result.actions.length > 0) {
      command = result.actions[0];
    }
    
    // Safe logging with type checking
    if (typeof messageText === 'string') {
      console.log('Extracted message text:', messageText.length > 100 ? (messageText.substring(0, 100) + '...') : messageText);
    } else {
      console.log('Extracted message text (non-string type):', messageText);
      // Convert to string if it's not already a string
      messageText = JSON.stringify(messageText);
    }
    
    console.log('Extracted command:', command ? JSON.stringify(command).substring(0, 100) + '...' : 'null');
    
    return { messageText, command };
  } catch (error) {
    console.error('Error extracting response text:', error);
    return { 
      messageText: "I encountered an error processing the AI response. Please try again.", 
      command: null 
    };
  }
}

// Check if the error is related to OpenAI quota
export function isOpenAIQuotaError(error: any): boolean {
  if (!error) return false;
  
  // Check different places where the error message might be
  const errorMessage = 
    error.message || 
    (typeof error === 'string' ? error : '') || 
    JSON.stringify(error);
  
  return errorMessage.includes('insufficient_quota') || 
         errorMessage.includes('exceeded your current quota') ||
         errorMessage.includes('You exceeded your current quota') ||
         errorMessage.includes('rate limit') ||
         errorMessage.includes('Rate limit reached');
}

// Truncate the input if it exceeds the maximum length
export function truncateInput(input: string, maxLength: number): string {
  if (!input || input.length <= maxLength) {
    return input;
  }
  
  console.log(`Input exceeds maximum length (${input.length} > ${maxLength}), truncating...`);
  return input.substring(input.length - maxLength);
}

// Parse command to determine if it contains media generation instructions
export function parseCommandForMediaGeneration(command: any): { 
  shouldGenerateMedia: boolean, 
  mediaType?: 'image' | 'video',
  prompt?: string 
} {
  if (!command) {
    return { shouldGenerateMedia: false };
  }
  
  try {
    if (typeof command === 'string') {
      try {
        command = JSON.parse(command);
      } catch (e) {
        // If it's not valid JSON, check for keywords in the string
        const lowerCommand = command.toLowerCase();
        if (lowerCommand.includes('generate image') || lowerCommand.includes('create image')) {
          return { 
            shouldGenerateMedia: true, 
            mediaType: 'image',
            prompt: command 
          };
        } else if (lowerCommand.includes('generate video') || lowerCommand.includes('create video')) {
          return { 
            shouldGenerateMedia: true, 
            mediaType: 'video',
            prompt: command 
          };
        }
        return { shouldGenerateMedia: false };
      }
    }
    
    // Check for feature/action in standard format
    if (command.feature && command.action) {
      if (['product-shot-v1', 'product-shot-v2', 'default-image'].includes(command.feature) && 
          ['create', 'generate'].includes(command.action)) {
        return { 
          shouldGenerateMedia: true, 
          mediaType: 'image',
          prompt: command.parameters?.prompt || 'Generate a product image' 
        };
      } else if (['image-to-video', 'product-video'].includes(command.feature) && 
                 ['create', 'convert'].includes(command.action)) {
        return { 
          shouldGenerateMedia: true, 
          mediaType: 'video',
          prompt: command.parameters?.prompt || 'Generate a video from image' 
        };
      }
    }
    
    // Check for type field
    if (command.type === 'image' || command.type === 'video') {
      return {
        shouldGenerateMedia: true,
        mediaType: command.type,
        prompt: command.prompt || command.description || 'Generate media'
      };
    }
    
    // Check for generate field
    if (command.generate === 'image' || command.generate === 'video') {
      return {
        shouldGenerateMedia: true,
        mediaType: command.generate,
        prompt: command.prompt || command.description || 'Generate media'
      };
    }
    
    return { shouldGenerateMedia: false };
  } catch (error) {
    console.error('Error parsing command for media generation:', error);
    return { shouldGenerateMedia: false };
  }
}
