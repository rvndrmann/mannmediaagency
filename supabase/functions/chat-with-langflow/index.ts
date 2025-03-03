
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://api.langflow.astra.datastax.com";
const LANGFLOW_ID = Deno.env.get("LANGFLOW_ID");
const FLOW_ID = Deno.env.get("FLOW_ID");
const APPLICATION_TOKEN = Deno.env.get("APPLICATION_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Environment check:", {
      baseApiUrl: BASE_API_URL ? "Set" : "Not set",
      langflowId: LANGFLOW_ID ? "Set" : "Not set",
      flowId: FLOW_ID ? "Set" : "Not set",
      applicationToken: APPLICATION_TOKEN ? "Set" : "Not set",
    });

    if (!LANGFLOW_ID || !FLOW_ID || !APPLICATION_TOKEN) {
      throw new Error('Missing required environment variables for LangFlow API');
    }

    const { messages, activeTool, userCredits } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid request: messages array is required');
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      throw new Error('Invalid request: no message content found');
    }

    console.log('Processing message:', lastMessage.content);
    console.log('Active tool:', activeTool);
    console.log('User credits:', userCredits);

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

    console.log('Context string:', contextString);
    
    // Create a simple input string that Langflow can accept
    const inputString = `${lastMessage.content}\n\nContext: ${contextString}`;
    
    console.log('Input string sample:', 
               inputString.length > 100 
               ? inputString.substring(0, 100) + '...' 
               : inputString);

    // Prepare for API call
    const endpoint = `/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}`;
    const tweaks = {};

    const payload = {
      input_value: inputString, // Simple string input
      input_type: "chat",
      output_type: "chat",
      tweaks
    };

    console.log(`Making request to: ${BASE_API_URL}${endpoint}`);
    console.log('Payload structure:', JSON.stringify({
      input_type: payload.input_type,
      output_type: payload.output_type,
      input_value_length: inputString.length,
      tweaks: payload.tweaks
    }));
    
    const headers = {
      "Authorization": `Bearer ${APPLICATION_TOKEN}`,
      "Content-Type": "application/json"
    };

    const apiResponse = await fetch(`${BASE_API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    console.log('API Response status:', apiResponse.status);
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API Error:', errorText);
      
      // Return a friendly error message to the user
      return new Response(
        JSON.stringify({ 
          message: "I'm sorry, I'm having trouble connecting to my knowledge base. Please try again in a moment.",
          command: null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Send 200 to client even on API error
        }
      );
    }

    const responseData = await apiResponse.json();
    console.log('Raw response data:', JSON.stringify(responseData, null, 2));
    
    if (!responseData?.outputs?.[0]?.outputs?.[0]?.results?.message) {
      console.warn('Invalid response format:', JSON.stringify(responseData, null, 2));
      
      // Return the fallback response when we can't parse the API response
      return new Response(
        JSON.stringify(fallbackResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = responseData.outputs[0].outputs[0].results;
    const messageText = result.message.text || result.message;
    console.log('Successfully extracted response text');

    // Check if the response contains a command
    let command = null;
    try {
      if (result.command) {
        command = {
          feature: result.command.feature,
          action: result.command.action,
          parameters: result.command.parameters || {}
        };
        console.log('Extracted command:', command);
      }
    } catch (error) {
      console.error('Error extracting command:', error);
    }

    return new Response(
      JSON.stringify({
        message: messageText,
        command: command
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-with-langflow function:', error);
    
    return new Response(
      JSON.stringify({ 
        message: "I apologize, but I encountered an error processing your request. Please try again.",
        command: null,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Send 200 to the client even on internal errors
      }
    );
  }
});
