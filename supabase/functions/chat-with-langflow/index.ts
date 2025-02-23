
import { corsHeaders } from '../_shared/cors.ts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Parse and validate request body
    let body: ChatRequest;
    try {
      const text = await req.text();
      console.log('Received request body:', text);
      
      if (!text) {
        throw new Error('Request body is empty');
      }
      
      body = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON in request body: ${e.message}`);
    }

    // Validate messages array
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new Error('Request must include a messages array');
    }

    // Validate message format
    body.messages.forEach((msg, index) => {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        throw new Error(`Invalid message format at index ${index}`);
      }
    });

    console.log('Processing chat request with messages:', body.messages);

    // Here we'll integrate with Langflow API
    // For now, return a mock response
    const response = {
      message: "I am the AI assistant. I received your message: " + 
               body.messages[body.messages.length - 1].content
    };

    console.log('Sending response:', response);

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
