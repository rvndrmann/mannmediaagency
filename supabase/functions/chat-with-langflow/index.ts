
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://api.langflow.astra.datastax.com";
const LANGFLOW_ID = Deno.env.get("LANGFLOW_ID");
const FLOW_ID = Deno.env.get("FLOW_ID");
const APPLICATION_TOKEN = Deno.env.get("APPLICATION_TOKEN");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const missingVars = [];
    if (!LANGFLOW_ID) missingVars.push('LANGFLOW_ID');
    if (!FLOW_ID) missingVars.push('FLOW_ID');
    if (!APPLICATION_TOKEN) missingVars.push('APPLICATION_TOKEN');

    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    let requestData;
    try {
      requestData = await req.json();
      console.log('Received request data:', JSON.stringify(requestData));
    } catch (e) {
      console.error('Error parsing request JSON:', e);
      throw new Error('Invalid JSON in request body');
    }
    
    if (!requestData.messages || !Array.isArray(requestData.messages)) {
      console.error('Invalid request format:', requestData);
      throw new Error('Invalid request format: messages array is required');
    }

    // Get the last user message
    const lastMessage = requestData.messages[requestData.messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      console.error('No valid message found in:', requestData.messages);
      throw new Error('No valid message content found');
    }

    console.log('Processing message:', lastMessage.content);

    // Prepare Langflow request following the Python example structure
    const langflowRequest = {
      input_value: lastMessage.content,
      output_type: "chat",
      input_type: "chat",
      tweaks: {
        "Agent-swaq6": {},
        "ChatInput-SylqI": {},
        "ChatOutput-E57mu": {},
        "Agent-Hpbdi": {},
        "Agent-JogPZ": {}
      }
    };

    const apiUrl = `${BASE_API_URL}/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}`;
    console.log('Sending request to Langflow:', {
      url: apiUrl,
      request: langflowRequest
    });

    // Call Langflow API with proper authentication
    try {
      const langflowResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${APPLICATION_TOKEN}`
        },
        body: JSON.stringify(langflowRequest)
      });

      console.log('Response status:', langflowResponse.status);
      const responseText = await langflowResponse.text();
      console.log('Raw response:', responseText);

      if (!langflowResponse.ok) {
        throw new Error(`Langflow API error: ${langflowResponse.status} - ${responseText}`);
      }

      let langflowData;
      try {
        langflowData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing Langflow response:', e);
        throw new Error('Invalid JSON response from Langflow');
      }

      console.log('Parsed Langflow response:', langflowData);

      // Extract the response message
      const responseMessage = langflowData.result || langflowData.message || "I apologize, but I couldn't process that request.";

      return new Response(
        JSON.stringify({ message: responseMessage }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (apiError) {
      console.error('API call error:', apiError);
      throw apiError;
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
