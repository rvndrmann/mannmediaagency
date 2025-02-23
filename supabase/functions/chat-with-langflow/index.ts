
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

// Default tweaks matching Python example
const DEFAULT_TWEAKS = {
  "Agent-swaq6": {},
  "ChatInput-SylqI": {},
  "ChatOutput-E57mu": {},
  "Agent-Hpbdi": {},
  "Agent-JogPZ": {}
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

    // Prepare payload exactly as in Python example
    const payload = {
      input_value: lastMessage.content,
      output_type: "chat",
      input_type: "chat",
      tweaks: DEFAULT_TWEAKS
    };

    // Construct API URL
    const apiUrl = `${BASE_API_URL}/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}`;
    
    // Prepare headers exactly as in Python example
    const headers = {
      "Authorization": `Bearer ${APPLICATION_TOKEN}`,
      "Content-Type": "application/json"
    };

    console.log('Calling Langflow API:', {
      url: apiUrl,
      payload: JSON.stringify(payload, null, 2),
      headers: {
        ...headers,
        "Authorization": "Bearer [REDACTED]" // Don't log the actual token
      }
    });

    try {
      const langflowResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      console.log('Response status:', langflowResponse.status);
      const responseText = await langflowResponse.text();
      console.log('Raw response:', responseText);

      if (!langflowResponse.ok) {
        console.error('API Error:', {
          status: langflowResponse.status,
          statusText: langflowResponse.statusText,
          response: responseText
        });
        throw new Error(`Langflow API error: ${langflowResponse.status} - ${responseText}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed response:', JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.error('Error parsing Langflow response:', e);
        throw new Error('Invalid JSON response from Langflow');
      }

      // Extract message from response based on different possible structures
      let responseMessage;

      if (typeof responseData === 'string') {
        responseMessage = responseData;
      } else if (responseData.message) {
        responseMessage = responseData.message;
      } else if (responseData.response) {
        responseMessage = responseData.response;
      } else if (responseData.result) {
        responseMessage = responseData.result;
      } else if (responseData.outputs?.[0]?.outputs?.[0]?.results?.response) {
        responseMessage = responseData.outputs[0].outputs[0].results.response;
      } else if (responseData.outputs?.[0]?.outputs?.[0]?.outputs?.response) {
        responseMessage = responseData.outputs[0].outputs[0].outputs.response;
      } else {
        console.error('Unable to extract response from data:', JSON.stringify(responseData, null, 2));
        throw new Error('Could not find response in Langflow output');
      }

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
