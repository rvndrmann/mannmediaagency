
import { corsHeaders } from '../_shared/cors.ts';

interface LangflowRequest {
  input_value: string;
  tweaks: Record<string, Record<string, unknown>>;
}

const LANGFLOW_API_URL = Deno.env.get("LANGFLOW_API_URL");
const LANGFLOW_API_TOKEN = Deno.env.get("LANGFLOW_API_TOKEN");
const FLOW_ID = Deno.env.get("LANGFLOW_FLOW_ID");

if (!LANGFLOW_API_URL || !LANGFLOW_API_TOKEN || !FLOW_ID) {
  throw new Error("Missing required environment variables for Langflow");
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Parse request body
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
    const langflowRequest: LangflowRequest = {
      input_value: lastMessage.content,
      tweaks: {
        "ChatInput-kKhri": {},
        "Prompt-KDSi5": {},
        "ChatOutput-Vr3Q7": {},
        "OpenAIModel-4xYtx": {}
      }
    };

    // Call Langflow API
    const langflowResponse = await fetch(`${LANGFLOW_API_URL}/api/v1/process/${FLOW_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LANGFLOW_API_TOKEN}`
      },
      body: JSON.stringify(langflowRequest)
    });

    if (!langflowResponse.ok) {
      const errorData = await langflowResponse.text();
      console.error('Langflow API error:', errorData);
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
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
