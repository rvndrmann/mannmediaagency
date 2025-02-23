
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const LANGFLOW_API_URL = Deno.env.get("LANGFLOW_API_URL");
const LANGFLOW_API_TOKEN = Deno.env.get("LANGFLOW_API_TOKEN");
const LANGFLOW_FLOW_ID = Deno.env.get("LANGFLOW_FLOW_ID");

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
    if (!LANGFLOW_API_URL || !LANGFLOW_API_TOKEN || !LANGFLOW_FLOW_ID) {
      throw new Error("Missing required environment variables for Langflow");
    }

    const requestData = await req.json();
    
    if (!requestData.messages || !Array.isArray(requestData.messages)) {
      throw new Error('Invalid request format: messages array is required');
    }

    // Get the last user message
    const lastMessage = requestData.messages[requestData.messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      throw new Error('No valid message content found');
    }

    console.log('Processing message:', lastMessage.content);

    // Prepare Langflow request
    const langflowRequest = {
      input_value: lastMessage.content,
      tweaks: {}
    };

    console.log('Sending request to Langflow:', {
      url: `${LANGFLOW_API_URL}/api/v1/process/${LANGFLOW_FLOW_ID}`,
      body: langflowRequest
    });

    // Call Langflow API
    const langflowResponse = await fetch(`${LANGFLOW_API_URL}/api/v1/process/${LANGFLOW_FLOW_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LANGFLOW_API_TOKEN}`
      },
      body: JSON.stringify(langflowRequest)
    });

    if (!langflowResponse.ok) {
      const errorText = await langflowResponse.text();
      console.error('Langflow API error:', errorText);
      throw new Error(`Langflow API error: ${langflowResponse.status}`);
    }

    const langflowData = await langflowResponse.json();
    console.log('Langflow response:', langflowData);

    // Extract the response message
    const responseMessage = langflowData.result || langflowData.message || "I apologize, but I couldn't process that request.";

    return new Response(
      JSON.stringify({ message: responseMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
