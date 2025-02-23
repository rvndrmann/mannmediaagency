
import { corsHeaders } from '../_shared/cors.ts';

const LANGFLOW_API_TOKEN = Deno.env.get('LANGFLOW_API_TOKEN');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    if (!LANGFLOW_API_TOKEN) {
      throw new Error('Langflow API token not configured');
    }

    // Set up Server-Sent Events response
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Create Langflow request
    const langflowResponse = await fetch('https://api.langflow.com/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LANGFLOW_API_TOKEN}`
      },
      body: JSON.stringify({
        message: lastMessage.content,
        chat_history: messages.slice(0, -1).map((msg: ChatMessage) => [msg.content, ''])
      })
    });

    if (!langflowResponse.ok) {
      throw new Error(`Langflow API error: ${langflowResponse.statusText}`);
    }

    // Start streaming response
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
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            const formattedChunk = JSON.stringify({
              choices: [{
                delta: {
                  content: line
                }
              }]
            });
            
            await writer.write(encoder.encode(`data: ${formattedChunk}\n\n`));
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
