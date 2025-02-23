
import { corsHeaders } from '../_shared/cors.ts';

const LANGFLOW_API_TOKEN = Deno.env.get('LANGFLOW_API_TOKEN');
const LANGFLOW_FLOW_ID = Deno.env.get('LANGFLOW_FLOW_ID');
const LANGFLOW_RUN_ID = Deno.env.get('LANGFLOW_RUN_ID');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate all required environment variables
    const missingVars = [];
    if (!LANGFLOW_API_TOKEN) missingVars.push('LANGFLOW_API_TOKEN');
    if (!LANGFLOW_FLOW_ID) missingVars.push('LANGFLOW_FLOW_ID');
    if (!LANGFLOW_RUN_ID) missingVars.push('LANGFLOW_RUN_ID');

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1] as ChatMessage;
    
    // Construct the API URL matching the curl example
    const apiUrl = `https://api.langflow.astra.datastax.com/lf/${LANGFLOW_FLOW_ID}/api/v1/run/${LANGFLOW_RUN_ID}?stream=false`;
    console.log('Requesting Langflow API:', apiUrl);

    // Create Langflow request with the exact same format as the curl example
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

    console.log('Sending request to Langflow:', JSON.stringify(langflowRequest, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LANGFLOW_API_TOKEN}`,
        ...corsHeaders
      },
      body: JSON.stringify(langflowRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Langflow API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Langflow API error (${response.status}): ${errorText}`);
    }

    // Since we're not streaming, we can just return the response directly
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
