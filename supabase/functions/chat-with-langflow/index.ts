
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Define interfaces for the Langflow response structure
interface LangflowOutput {
  results?: Record<string, any>;
  artifacts?: Record<string, any>;
  outputs?: Record<string, any>;
  logs?: Record<string, any>;
  messages: any[];
  component_display_name: string;
  component_id: string;
  used_frozen_result: boolean;
}

interface LangflowResponse {
  session_id: string;
  outputs: Array<{
    inputs: {
      input_value: string;
    };
    outputs: LangflowOutput[];
  }>;
}

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

    // Prepare Langflow request
    const langflowRequest = {
      input_value: lastMessage.content,
      output_type: "chat",
      input_type: "chat"
    };

    // Construct API URL
    const apiUrl = `${BASE_API_URL}/lf/${LANGFLOW_ID}/api/v1/run/${FLOW_ID}`;
    
    console.log('Calling Langflow API:', {
      url: apiUrl,
      request: langflowRequest
    });

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

      let langflowData: LangflowResponse;
      try {
        langflowData = JSON.parse(responseText);
        console.log('Full parsed response:', JSON.stringify(langflowData, null, 2));
      } catch (e) {
        console.error('Error parsing Langflow response:', e);
        throw new Error('Invalid JSON response from Langflow');
      }

      // Extract the chat output from the nested structure
      let responseMessage: string;
      
      if (!langflowData.outputs?.[0]?.outputs?.[0]) {
        console.error('Unexpected response structure - missing outputs:', langflowData);
        throw new Error('Invalid response structure from Langflow');
      }

      const chatOutput = langflowData.outputs[0].outputs.find(
        output => output.component_id === "ChatOutput-E57mu"
      );

      if (!chatOutput) {
        console.error('ChatOutput component not found in response:', langflowData.outputs[0].outputs);
        throw new Error('ChatOutput component not found in response');
      }

      // Log the full structure of the chat output for debugging
      console.log('Chat output component:', JSON.stringify(chatOutput, null, 2));

      // Try to extract the message from various possible locations
      if (chatOutput.results && typeof chatOutput.results === 'object') {
        responseMessage = chatOutput.results.response || chatOutput.results.message || JSON.stringify(chatOutput.results);
      } else if (chatOutput.outputs && typeof chatOutput.outputs === 'object') {
        responseMessage = chatOutput.outputs.response || chatOutput.outputs.message || JSON.stringify(chatOutput.outputs);
      } else if (Array.isArray(chatOutput.messages) && chatOutput.messages.length > 0) {
        responseMessage = chatOutput.messages[chatOutput.messages.length - 1];
      } else {
        console.error('Unable to find response in chat output:', chatOutput);
        throw new Error('Could not find response in chat output');
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
