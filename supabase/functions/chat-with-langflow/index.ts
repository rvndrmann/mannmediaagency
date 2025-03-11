
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";
import { RequestBody, ChatResponse } from "./types.ts";
import { generateRequestId, checkEnvironmentVariables, extractResponseText, truncateInput, isOpenAIQuotaError } from "./utils.ts";
import { makeAstraLangflowRequest, makeOpenAIAssistantRequest, makeMCPRequest } from "./api.ts";
import { 
  BASE_API_URL, 
  LANGFLOW_ID, 
  FLOW_ID, 
  APPLICATION_TOKEN, 
  MAX_INPUT_LENGTH,
  USE_ASSISTANTS_API,
  USE_MCP 
} from "./config.ts";

// Fallback responses for when the API is having issues
const fallbackResponses = [
  "I'm having trouble connecting to my knowledge base right now. Could you please try again in a moment?",
  "I apologize, but I'm experiencing some technical difficulties. Let's try again shortly.",
  "It looks like my connection to the AI service is slow right now. Could you please try your request again?",
  "I'm sorry for the inconvenience. My AI services are a bit busy at the moment. Please try again in a few seconds.",
  "I couldn't process your request completely. Please try again with a slightly shorter message or try again shortly."
];

const getFallbackResponse = () => {
  const index = Math.floor(Math.random() * fallbackResponses.length);
  return fallbackResponses[index];
};

serve(async (req) => {
  const requestId = generateRequestId();
  console.log(`[${requestId}] New request received`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if we're using the OpenAI Assistants API or MCP
    const useAssistantsAPI = USE_ASSISTANTS_API;
    const useMCP = USE_MCP;
    
    if (useMCP) {
      console.log(`[${requestId}] Using Model Context Protocol`);
    } else if (useAssistantsAPI) {
      console.log(`[${requestId}] Using OpenAI Assistants API`);
    } else {
      // Check Langflow environment variables only if we're not using Assistants API
      const envCheck = checkEnvironmentVariables();
      if (!envCheck.isValid) {
        console.error(`[${requestId}] Missing required environment variables: ${envCheck.missingVars}`);
        return new Response(
          JSON.stringify({ 
            message: "Sorry, the AI chat system is not properly configured. Please contact support.",
            command: null,
            error: `Missing configuration: ${envCheck.missingVars}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let bodyData: RequestBody;
    try {
      bodyData = await req.json();
      console.log(`[${requestId}] Request body structure:`, Object.keys(bodyData).join(", "));
    } catch (parseError) {
      console.error(`[${requestId}] Error parsing request body:`, parseError);
      return new Response(
        JSON.stringify({ 
          message: "Invalid request format. Please try again.",
          command: null,
          error: "Request parsing error" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { message } = bodyData;
    
    if (!message) {
      console.error(`[${requestId}] Invalid request: missing message content`);
      return new Response(
        JSON.stringify({ 
          message: "Please provide a valid message to process.",
          command: null,
          error: "Missing message content" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Processing message:`, message.substring(0, 100) + '...');

    // Use development fallback if configured
    if (Deno.env.get("ENVIRONMENT") === "development" && Deno.env.get("USE_FALLBACK") === "true") {
      console.log(`[${requestId}] Using fallback response in development mode`);
      return new Response(
        JSON.stringify({
          message: "I'm operating in development fallback mode. This is a placeholder response.",
          command: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which API to use based on configuration
    let responseData;
    
    if (useMCP) {
      // Use Model Context Protocol
      responseData = await makeMCPRequest(message, requestId);
    } else if (useAssistantsAPI) {
      // Use OpenAI Assistants API
      responseData = await makeOpenAIAssistantRequest(message, requestId);
    } else {
      // Use original Langflow API
      // Prepare API endpoint
      const endpoint = `/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}?stream=false`;
      
      // Use the exact tweaks structure from documentation
      const tweaks = {
        "Agent-swaq6": {},
        "ChatInput-SylqI": {},
        "ChatOutput-E57mu": {},
        "Agent-Hpbdi": {},
        "Agent-JogPZ": {}
      };

      // Prepare API payload with simplified structure exactly matching the curl example
      const payload = {
        input_value: truncateInput(message, MAX_INPUT_LENGTH),
        input_type: "chat",
        output_type: "chat",
        tweaks
      };

      const fullUrl = `${BASE_API_URL}${endpoint}`;
      
      // Prepare API headers
      const headers = {
        "Authorization": `Bearer ${APPLICATION_TOKEN}`,
        "Content-Type": "application/json"
      };

      console.log(`[${requestId}] Request headers:`, JSON.stringify(headers, (key, value) => 
        key === "Authorization" ? "Bearer [REDACTED]" : value
      ));

      // Make API request with unique request ID
      responseData = await makeAstraLangflowRequest(fullUrl, headers, payload, requestId);
    }
    
    // Extract response components
    const { messageText, command } = extractResponseText(responseData);
    
    if (!messageText) {
      console.warn(`[${requestId}] Could not extract message text from response`);
      
      return new Response(
        JSON.stringify({
          message: "I apologize, but I couldn't generate a proper response. Please try a different question.",
          command: null,
          error: "Response extraction failed"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Returning successful response with message and command`);
    return new Response(
      JSON.stringify({
        message: messageText,
        command: command
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (apiError) {
    console.error(`[${requestId}] API call error:`, apiError);
    
    if (apiError.message?.includes('timed out') || apiError.name === 'AbortError') {
      console.log(`[${requestId}] Request timed out after retries`);
      return new Response(
        JSON.stringify({
          message: getFallbackResponse(),
          command: null,
          error: "Request timeout after retries"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for OpenAI quota errors
    if (isOpenAIQuotaError(apiError)) {
      console.error(`[${requestId}] OpenAI quota exceeded error detected`);
      return new Response(
        JSON.stringify({
          message: "I'm sorry, but the AI service is currently unavailable due to usage limits. Please try again later or contact support for assistance.",
          command: null,
          error: "OpenAI quota exceeded"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        message: getFallbackResponse(),
        command: null,
        error: apiError instanceof Error ? apiError.message : String(apiError)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error in chat-with-langflow function:`, error);
    console.error(`[${requestId}] Stack trace:`, error.stack);
    
    // Check for OpenAI quota errors in the general catch block too
    if (isOpenAIQuotaError(error)) {
      console.error(`[${requestId}] OpenAI quota exceeded error detected in general error handling`);
      return new Response(
        JSON.stringify({
          message: "I'm sorry, but the AI service is currently unavailable due to usage limits. Please try again later or contact support for assistance.",
          command: null,
          error: "OpenAI quota exceeded"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        message: getFallbackResponse(),
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
