import { Message } from "./types.ts";
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

export function extractResponseText(responseData: any): { messageText: string | null, command: any | null } {
  try {
    console.log("Extracting response text");
    
    if (!responseData?.outputs?.[0]?.outputs?.[0]?.results) {
      console.error('Invalid or unexpected response format:', JSON.stringify(responseData, null, 2).substring(0, 500));
      return { messageText: null, command: null };
    }

    const result = responseData.outputs[0].outputs[0].results;
    
    let messageText;
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
    
    console.log('Extracted message text:', messageText ? (messageText.substring(0, 100) + '...') : null);
    
    return { messageText, command: null };
  } catch (error) {
    console.error('Error extracting response text:', error);
    return { 
      messageText: "I encountered an error processing the AI response. Please try again.", 
      command: null 
    };
  }
}

// Truncate the input if it exceeds the maximum length
export function truncateInput(input: string, maxLength: number): string {
  if (!input || input.length <= maxLength) {
    return input;
  }
  
  console.log(`Input exceeds maximum length (${input.length} > ${maxLength}), truncating...`);
  return input.substring(input.length - maxLength);
}
