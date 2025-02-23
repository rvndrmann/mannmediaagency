
import { corsHeaders } from '../_shared/cors.ts';

const LANGFLOW_API_TOKEN = Deno.env.get('LANGFLOW_API_TOKEN');
const LANGFLOW_BASE_URL = Deno.env.get('LANGFLOW_BASE_URL');
const LANGFLOW_FLOW_ID = Deno.env.get('LANGFLOW_FLOW_ID');
const LANGFLOW_RUN_ID = Deno.env.get('LANGFLOW_RUN_ID');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate all required environment variables
    const missingVars = [];
    if (!LANGFLOW_API_TOKEN) missingVars.push('LANGFLOW_API_TOKEN');
    if (!LANGFLOW_BASE_URL) missingVars.push('LANGFLOW_BASE_URL');
    if (!LANGFLOW_FLOW_ID) missingVars.push('LANGFLOW_FLOW_ID');
    if (!LANGFLOW_RUN_ID) missingVars.push('LANGFLOW_RUN_ID');

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // Construct the API URL using all environment variables
    const apiUrl = `${LANGFLOW_BASE_URL}/lf/${LANGFLOW_FLOW_ID}/api/v1/run/${LANGFLOW_RUN_ID}?stream=true`;
    console.log('Requesting Langflow API:', apiUrl); // Debug log

    // Create Langflow request with the correct format
    const langflowResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LANGFLOW_API_TOKEN}`,
        ...corsHeaders
      },
      body: JSON.stringify({
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
      })
    });

    if (!langflowResponse.ok) {
      const errorText = await langflowResponse.text();
      console.error('Langflow API error:', {
        status: langflowResponse.status,
        statusText: langflowResponse.statusText,
        body: errorText
      });
      throw new Error(`Langflow API error (${langflowResponse.status}): ${errorText}`);
    }

    // Set up streaming response
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const streamResponse = new Response(responseStream.readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // Process the streaming response
    const reader = langflowResponse.body?.getReader();
    if (!reader) throw new Error('No response body received from Langflow API');

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            await writer.write(encoder.encode('data: [DONE]\n\n'));
            await writer.close();
            break;
          }

          const chunk = new TextDecoder().decode(value);
          console.log('Received chunk:', chunk); // Debug log
          
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            try {
              // Format the chunk as expected by the frontend
              const formattedChunk = JSON.stringify({
                choices: [{
                  delta: {
                    content: line
                  }
                }]
              });
              
              await writer.write(encoder.encode(`data: ${formattedChunk}\n\n`));
            } catch (e) {
              console.error('Error processing chunk:', e);
              throw new Error(`Error processing response chunk: ${e.message}`);
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        const errorMessage = JSON.stringify({ 
          error: 'Streaming error occurred', 
          details: error.message 
        });
        await writer.write(encoder.encode(`data: ${errorMessage}\n\n`));
        await writer.close();
      }
    })();

    return streamResponse;
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
