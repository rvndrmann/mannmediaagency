import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Updated API URL to match the Astra Langflow format from documentation
const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://api.langflow.astra.datastax.com";
const LANGFLOW_ID = Deno.env.get("LANGFLOW_ID");
const FLOW_ID = Deno.env.get("FLOW_ID");
const APPLICATION_TOKEN = Deno.env.get("APPLICATION_TOKEN");
const X_API_KEY = Deno.env.get("X_API_KEY");

// Increase timeout to 45 seconds to allow for longer processing times
const API_TIMEOUT_MS = 45000; 

// Maximum retries for failed requests
const MAX_RETRIES = 2;

// Maximum input length to avoid timeouts due to large payloads
const MAX_INPUT_LENGTH = 4000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Helper function to check environment variables
function checkEnvironmentVariables() {
  const variables = {
    baseApiUrl: BASE_API_URL,
    langflowId: LANGFLOW_ID,
    flowId: FLOW_ID,
    applicationToken: APPLICATION_TOKEN ? "Set" : "Not set",
    xApiKey: X_API_KEY ? "Set" : "Not set",
  };
  
  console.log("Environment variables:", JSON.stringify(variables));
  
  if (!LANGFLOW_ID || !FLOW_ID || !APPLICATION_TOKEN || !X_API_KEY) {
    const missingVars = [];
    if (!LANGFLOW_ID) missingVars.push("LANGFLOW_ID");
    if (!FLOW_ID) missingVars.push("FLOW_ID");
    if (!APPLICATION_TOKEN) missingVars.push("APPLICATION_TOKEN");
    if (!X_API_KEY) missingVars.push("X_API_KEY");
    
    return {
      isValid: false,
      missingVars: missingVars.join(", ")
    };
  }
  
  return { isValid: true };
}

// Helper function to extract text from Langflow response
function extractResponseText(responseData: any): { messageText: string | null, command: any | null } {
  try {
    console.log("Extracting response text from:", JSON.stringify(responseData, null, 2).substring(0, 500) + "...");
    
    if (!responseData?.outputs?.[0]?.outputs?.[0]?.results) {
      console.error('Invalid or unexpected response format:', JSON.stringify(responseData, null, 2).substring(0, 500));
      return { messageText: null, command: null };
    }

    const result = responseData.outputs[0].outputs[0].results;
    
    // Handle different response formats
    let messageText;
    if (typeof result.message === 'string') {
      messageText = result.message;
    } else if (result.message?.text) {
      messageText = result.message.text;
    } else if (result.message) {
      messageText = JSON.stringify(result.message);
    } else if (result.output) {
      // Try alternative output format
      messageText = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
    } else {
      messageText = "I received a response but couldn't understand it. Please try again.";
    }
    
    console.log('Extracted message text:', messageText ? (messageText.substring(0, 100) + '...') : null);
    
    // Extract command if present
    let command = null;
    if (result.command) {
      command = {
        feature: result.command.feature || 'default-image',
        action: result.command.action || 'list',
        parameters: result.command.parameters || {}
      };
      console.log('Extracted command:', command);
    }
    
    return { messageText, command };
  } catch (error) {
    console.error('Error extracting response text:', error);
    return { 
      messageText: "I encountered an error processing the AI response. Please try again.", 
      command: null 
    };
  }
}

// Helper function to truncate input if it's too long
function truncateInput(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }
  
  console.log(`Input exceeds maximum length (${input.length} > ${maxLength}), truncating...`);
  
  // Simple truncation strategy that keeps the most recent message intact
  // For more sophisticated truncation, consider using a more complex algorithm
  const userMessageStart = input.lastIndexOf("user:"); 
  if (userMessageStart > 0 && input.length - userMessageStart < maxLength) {
    // If we can keep just the last user message, do that
    return input.substring(userMessageStart);
  }
  
  // Otherwise just truncate, prioritizing the most recent content
  return input.substring(input.length - maxLength);
}

// Helper function to make API call with retries
async function makeAstraLangflowRequest(
  url: string, 
  headers: Record<string, string>, 
  payload: any, 
  retries = MAX_RETRIES
): Promise<any> {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoffMs = Math.min(1000 * (2 ** attempt), 10000); // Exponential backoff capped at 10 seconds
      console.log(`Retry attempt ${attempt}/${retries} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
    
    try {
      console.log(`API request attempt ${attempt + 1}/${retries + 1} to ${url}`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Request timeout after ${API_TIMEOUT_MS}ms - aborting`);
        controller.abort();
      }, API_TIMEOUT_MS);
      
      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check for successful response
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (${response.status}):`, errorText.substring(0, 500));
        throw new Error(`API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }
      
      // Parse the response JSON
      const data = await response.json();
      console.log('API response received successfully');
      return data;
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's an abort error and it's the last attempt
      if (error.name === 'AbortError' && attempt === retries) {
        console.error('Final attempt timed out');
        throw new Error('Request timed out after multiple attempts');
      }
      
      // Log the error
      console.error(`API request attempt ${attempt + 1} failed:`, error.message);
      
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
    }
  }
  
  // This should never be reached but is here for completeness
  throw lastError;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const envCheck = checkEnvironmentVariables();
    if (!envCheck.isValid) {
      console.error(`Missing required environment variables: ${envCheck.missingVars}`);
      return new Response(
        JSON.stringify({ 
          message: "Sorry, the AI chat system is not properly configured. Please contact support.",
          command: null,
          error: `Missing configuration: ${envCheck.missingVars}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let bodyData;
    try {
      bodyData = await req.json();
      console.log("Request body structure:", Object.keys(bodyData).join(", "));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ 
          message: "Invalid request format. Please try again.",
          command: null,
          error: "Request parsing error" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { messages, activeTool, userCredits, command, detectedMessage } = bodyData;
    
    // If we received a command and message from the detect-command function, use that directly
    if (command && detectedMessage) {
      console.log("Using pre-detected command:", command);
      return new Response(
        JSON.stringify({
          message: detectedMessage,
          command: command
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid request: missing or empty messages array');
      return new Response(
        JSON.stringify({ 
          message: "Please provide a valid message to process.",
          command: null,
          error: "Invalid messages array" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      console.error('Invalid request: no message content found in last message');
      return new Response(
        JSON.stringify({ 
          message: "Your message appears to be empty. Please try again.",
          command: null,
          error: "Empty message content" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing message:', lastMessage.content.substring(0, 100) + '...');
    console.log('Active tool:', activeTool);
    console.log('User credits:', userCredits?.credits_remaining || 'Not provided');

    // Simple fallback response to use if the API is not available
    const fallbackResponse = {
      message: "I'm sorry, I'm currently experiencing connectivity issues. Please try again later.",
      command: null
    };

    // Check if we're in a development environment without API connection
    if (Deno.env.get("ENVIRONMENT") === "development" && Deno.env.get("USE_FALLBACK") === "true") {
      console.log("Using fallback response in development mode");
      return new Response(
        JSON.stringify(fallbackResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract only the text from previous messages to create a conversation history
    // Limit the number of previous messages to include to avoid excessive payload size
    const maxPreviousMessages = 5;
    const messageHistoryArray = messages
      .slice(Math.max(0, messages.length - 1 - maxPreviousMessages), messages.length - 1)
      .map((msg: Message) => `${msg.role}: ${msg.content}`);
    
    const messageHistory = messageHistoryArray.join("\n");
    console.log(`Including ${messageHistoryArray.length} previous messages in context`);

    // Create a simplified context string (kept short to reduce payload size)
    const contextString = `
Active Tool: ${activeTool || "ai-agent"}
Credits Available: ${userCredits?.credits_remaining || 0}
Message History: 
${messageHistory}
`;

    // Create a simple input string that Langflow can accept
    // Truncate if necessary to avoid timeout issues with large payloads
    const fullInputString = `${lastMessage.content}\n\nContext: ${contextString}`;
    const inputString = truncateInput(fullInputString, MAX_INPUT_LENGTH);
    
    console.log('Input string length:', inputString.length, 
                inputString.length < fullInputString.length ? '(truncated)' : '');
    console.log('Input string sample:', 
               inputString.length > 100 
               ? inputString.substring(0, 100) + '...' 
               : inputString);

    // Prepare for API call - updated to match the documented Astra Langflow format
    const endpoint = `/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}?stream=false`;
    
    // Simplified tweaks object to reduce payload size
    const tweaks = {};

    const payload = {
      input_value: inputString,
      input_type: "chat",
      output_type: "chat",
      tweaks
    };

    const fullUrl = `${BASE_API_URL}${endpoint}`;
    console.log(`Making request to: ${fullUrl}`);
    
    // Updated headers to include x-api-key
    const headers = {
      "Authorization": `Bearer ${APPLICATION_TOKEN}`,
      "Content-Type": "application/json",
      "x-api-key": X_API_KEY
    };

    console.log('Request headers:', JSON.stringify(headers, (key, value) => 
      key === "Authorization" ? "Bearer [REDACTED]" : value
    ));

    try {
      // Make API call with retry logic
      console.log("Starting Astra Langflow API request with retry capability");
      const responseData = await makeAstraLangflowRequest(fullUrl, headers, payload);
      
      // Extract the response text and command
      const { messageText, command } = extractResponseText(responseData);
      
      if (!messageText) {
        console.warn('Could not extract message text from response');
        
        // Return the fallback response when we can't parse the API response
        return new Response(
          JSON.stringify({
            message: "I apologize, but I couldn't generate a proper response. Please try a different question.",
            command: null,
            error: "Response extraction failed"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log("Returning successful response with message and command");
      return new Response(
        JSON.stringify({
          message: messageText,
          command: command
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (apiError) {
      console.error('API call error:', apiError);
      
      // Special handling for timeout errors
      if (apiError.message?.includes('timed out') || apiError.name === 'AbortError') {
        console.log('Request timed out after retries');
        return new Response(
          JSON.stringify({
            message: "I'm sorry, but I'm taking too long to process your request. Try sending a shorter message or try again later.",
            command: null,
            error: "Request timeout after retries"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle other API errors
      return new Response(
        JSON.stringify({
          message: "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again in a moment.",
          command: null,
          error: apiError instanceof Error ? apiError.message : String(apiError)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in chat-with-langflow function:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        message: "I apologize, but I encountered an error processing your request. Please try again.",
        command: null,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Send 200 to the client even on internal errors
      }
    );
  }
});
