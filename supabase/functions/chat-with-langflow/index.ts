
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

    // Prepare Langflow request exactly as in Python example
    const langflowRequest = {
      input_value: lastMessage.content,
      output_type: "chat",
      input_type: "chat"
    };

    // Construct API URL exactly as in Python example
    const apiUrl = `${BASE_API_URL}/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}`;
    
    console.log('Calling Langflow API:', {
      url: apiUrl,
      request: langflowRequest,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APPLICATION_TOKEN}`
      }
    });

    // Call Langflow API with exact same structure as Python
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
        console.error('API Error:', {
          status: langflowResponse.status,
          statusText: langflowResponse.statusText,
          response: responseText
        });
        throw new Error(`Langflow API error: ${langflowResponse.status} - ${responseText}`);
      }

      let langflowData;
      try {
        langflowData = JSON.parse(responseText);
        console.log('Parsed response data:', langflowData);
      } catch (e) {
        console.error('Error parsing Langflow response:', e);
        throw new Error('Invalid JSON response from Langflow');
      }

      // Extract the response based on the actual structure
      let responseMessage;
      if (typeof langflowData === 'string') {
        responseMessage = langflowData;
      } else if (langflowData.result) {
        responseMessage = langflowData.result;
      } else if (langflowData.message) {
        responseMessage = langflowData.message;
      } else if (langflowData.response) {
        responseMessage = langflowData.response;
      } else {
        console.error('Unexpected response structure:', langflowData);
        throw new Error('Unexpected response structure from Langflow');
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
