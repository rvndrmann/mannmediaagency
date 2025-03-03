import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://api.langflow.astra.datastax.com";
const LANGFLOW_ID = Deno.env.get("LANGFLOW_ID");
const FLOW_ID = Deno.env.get("FLOW_ID");
const APPLICATION_TOKEN = Deno.env.get("APPLICATION_TOKEN");

const API_TIMEOUT_MS = 60000; 
const MAX_RETRIES = 3;
const MAX_INPUT_LENGTH = 4000;

interface Message {
  role: "user" | "assistant";
  content: string;
}

function checkEnvironmentVariables() {
  const variables = {
    baseApiUrl: BASE_API_URL,
    langflowId: LANGFLOW_ID,
    flowId: FLOW_ID,
    applicationToken: APPLICATION_TOKEN ? "Set" : "Not set",
  };
  
  console.log("Environment variables:", JSON.stringify(variables));
  
  if (!LANGFLOW_ID || !FLOW_ID || !APPLICATION_TOKEN) {
    const missingVars = [];
    if (!LANGFLOW_ID) missingVars.push("LANGFLOW_ID");
    if (!FLOW_ID) missingVars.push("FLOW_ID");
    if (!APPLICATION_TOKEN) missingVars.push("APPLICATION_TOKEN");
    
    return {
      isValid: false,
      missingVars: missingVars.join(", ")
    };
  }
  
  return { isValid: true };
}

function extractResponseText(responseData: any): { messageText: string | null, command: any | null } {
  try {
    console.log("Extracting response text from:", JSON.stringify(responseData, null, 2).substring(0, 500) + "...");
    
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

function truncateInput(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }
  
  console.log(`Input exceeds maximum length (${input.length} > ${maxLength}), truncating...`);
  
  const userMessageStart = input.lastIndexOf("user:"); 
  if (userMessageStart > 0 && input.length - userMessageStart < maxLength) {
    return input.substring(userMessageStart);
  }
  
  return input.substring(input.length - maxLength);
}

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
      console.log(`Request payload:`, JSON.stringify(payload).substring(0, 500));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Request timeout after ${API_TIMEOUT_MS}ms - aborting`);
        controller.abort();
      }, API_TIMEOUT_MS);
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API Error (${response.status}):`, errorText.substring(0, 500));
          throw new Error(`API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }
        
        const data = await response.json();
        console.log('API response received successfully');
        return data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error;
      
      if (error.name === 'AbortError' && attempt === retries) {
        console.error('Final attempt timed out');
        throw new Error('Request timed out after multiple attempts');
      }
      
      console.error(`API request attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const fallbackResponse = {
      message: "I'm sorry, I'm currently experiencing connectivity issues. Please try again later.",
      command: null
    };

    if (Deno.env.get("ENVIRONMENT") === "development" && Deno.env.get("USE_FALLBACK") === "true") {
      console.log("Using fallback response in development mode");
      return new Response(
        JSON.stringify(fallbackResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const maxPreviousMessages = 5;
    const messageHistoryArray = messages
      .slice(Math.max(0, messages.length - 1 - maxPreviousMessages), messages.length - 1)
      .map((msg: Message) => `${msg.role}: ${msg.content}`);
    
    const messageHistory = messageHistoryArray.join("\n");
    console.log(`Including ${messageHistoryArray.length} previous messages in context`);

    const contextString = `
Active Tool: ${activeTool || "ai-agent"}
Credits Available: ${userCredits?.credits_remaining || 0}
Message History: 
${messageHistory}
`;

    const fullInputString = `${lastMessage.content}\n\nContext: ${contextString}`;
    const inputString = truncateInput(fullInputString, MAX_INPUT_LENGTH);
    
    console.log('Input string length:', inputString.length, 
                inputString.length < fullInputString.length ? '(truncated)' : '');
    console.log('Input string sample:', 
               inputString.length > 100 
               ? inputString.substring(0, 100) + '...' 
               : inputString);

    const endpoint = `/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}?stream=false`;
    
    const tweaks = {
      "Agent-swaq6": {},
      "ChatInput-SylqI": {},
      "ChatOutput-E57mu": {},
      "Agent-Hpbdi": {},
      "Agent-JogPZ": {}
    };

    const payload = {
      input_value: inputString,
      input_type: "chat",
      output_type: "chat",
      tweaks
    };

    const fullUrl = `${BASE_API_URL}${endpoint}`;
    console.log(`Making request to: ${fullUrl}`);
    
    const headers = {
      "Authorization": `Bearer ${APPLICATION_TOKEN}`,
      "Content-Type": "application/json"
    };

    console.log('Request headers:', JSON.stringify(headers, (key, value) => 
      key === "Authorization" ? "Bearer [REDACTED]" : value
    ));

    try {
      const responseData = await makeAstraLangflowRequest(fullUrl, headers, payload);
      
      const { messageText, command } = extractResponseText(responseData);
      
      if (!messageText) {
        console.warn('Could not extract message text from response');
        
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
        status: 200
      }
    );
  }
});
