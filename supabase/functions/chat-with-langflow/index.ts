
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Updated API URL to match the Astra DataStax format
const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://astra.datastax.com";
const FLOW_ID = Deno.env.get("FLOW_ID");
const APPLICATION_TOKEN = Deno.env.get("APPLICATION_TOKEN");
const X_API_KEY = Deno.env.get("X_API_KEY");

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
    flowId: FLOW_ID,
    applicationToken: APPLICATION_TOKEN ? "Set" : "Not set",
    xApiKey: X_API_KEY ? "Set" : "Not set",
  };
  
  console.log("Environment variables:", variables);
  
  if (!FLOW_ID || !APPLICATION_TOKEN || !X_API_KEY) {
    const missingVars = [];
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
    const messageHistory = messages.slice(0, -1).map((msg: Message) => 
      `${msg.role}: ${msg.content}`
    ).join("\n");

    // Create a simplified context string
    const contextString = `
Active Tool: ${activeTool || "ai-agent"}
Credits Available: ${userCredits?.credits_remaining || 0}
Message History: 
${messageHistory}
`;

    console.log('Context string sample:', 
               contextString.length > 100 
               ? contextString.substring(0, 100) + '...' 
               : contextString);
    
    // Create a simple input string that Langflow can accept
    const inputString = `${lastMessage.content}\n\nContext: ${contextString}`;
    
    console.log('Input string sample:', 
               inputString.length > 100 
               ? inputString.substring(0, 100) + '...' 
               : inputString);

    // Prepare for API call - updated to match the new Astra format
    const endpoint = `/api/v1/run/${FLOW_ID}?stream=false`;
    
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

    console.log(`Making request to: ${BASE_API_URL}${endpoint}`);
    console.log('Payload structure:', JSON.stringify({
      input_type: payload.input_type,
      output_type: payload.output_type,
      input_value_length: inputString.length,
      tweaks: Object.keys(payload.tweaks)
    }));
    
    // Updated headers to include x-api-key
    const headers = {
      "Authorization": `Bearer ${APPLICATION_TOKEN}`,
      "Content-Type": "application/json",
      "x-api-key": X_API_KEY
    };

    try {
      // Timeout implementation to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("Request timeout - aborting");
        controller.abort();
      }, 25000); // 25 second timeout - adjusted for Astra API
    
      console.log("Starting Astra API request...");
      const apiResponse = await fetch(`${BASE_API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('API Response received, status:', apiResponse.status);
      
      if (!apiResponse.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await apiResponse.text();
          console.error('API Error response text:', errorText);
        } catch (e) {
          console.error('Could not read error response:', e);
          errorText = 'Could not read error response';
        }
        
        return new Response(
          JSON.stringify({ 
            message: "I'm sorry, I'm having trouble connecting to my knowledge base. Please try again in a moment.",
            command: null,
            error: `API error: ${apiResponse.status} - ${errorText.substring(0, 200)}`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Send 200 to client even on API error
          }
        );
      }

      let responseData;
      try {
        responseData = await apiResponse.json();
        console.log('Raw response received');
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        return new Response(
          JSON.stringify({ 
            message: "I received an invalid response from my knowledge base. Please try again.",
            command: null,
            error: "JSON parsing error"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
    } catch (fetchError) {
      console.error('Fetch error in Astra API call:', fetchError);
      
      // Special handling for timeout errors
      if (fetchError.name === 'AbortError') {
        console.log('Request timed out');
        return new Response(
          JSON.stringify({
            message: "I'm sorry, the request took too long to process. Please try a shorter message or try again later.",
            command: null,
            error: "Request timeout"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Generic fetch error
      return new Response(
        JSON.stringify({
          ...fallbackResponse,
          error: fetchError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in chat-with-langflow function:', error);
    
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
