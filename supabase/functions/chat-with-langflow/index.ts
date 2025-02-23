
import { corsHeaders } from '../_shared/cors.ts';

const LANGFLOW_API_TOKEN = Deno.env.get('LANGFLOW_API_TOKEN');
const LANGFLOW_BASE_URL = Deno.env.get('LANGFLOW_BASE_URL');
const LANGFLOW_FLOW_ID = Deno.env.get('LANGFLOW_FLOW_ID');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!LANGFLOW_API_TOKEN || !LANGFLOW_BASE_URL || !LANGFLOW_FLOW_ID) {
      throw new Error('Langflow configuration is incomplete');
    }

    const apiUrl = `${LANGFLOW_BASE_URL}/lf/${LANGFLOW_FLOW_ID}/api/v1/run/09a9ff6c-a145-40ca-b270-7107ad0d68ca?stream=true`;

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
      console.error('Langflow API error:', langflowResponse.status, await langflowResponse.text());
      throw new Error(`Langflow API error: ${langflowResponse.statusText}`);
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
    if (!reader) throw new Error('No response body');

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
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        const errorMessage = JSON.stringify({ error: 'Streaming error occurred' });
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
