
// Follow Deno runtime API
import { corsHeaders } from "../_shared/cors.ts";

interface GenerationStatusResponse {
  status: string;
  images?: { url: string }[];
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { requestId } = await req.json();

    if (!requestId) {
      throw new Error('Request ID is required');
    }

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    // Call fal.ai status endpoint
    const response = await fetch(`https://queue.fal.ai/fal-ai/bria/requests/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Fal.ai API error:', error);
      throw new Error(`Failed to check generation status: ${error}`);
    }

    const data = await response.json();
    console.log('Fal.ai response:', JSON.stringify(data, null, 2));

    // Map fal.ai status to our format
    const result: GenerationStatusResponse = {
      status: data.status === 'completed' ? 'completed' : 'processing',
    };

    // If generation is complete, include the image URLs
    if (data.status === 'completed' && data.result?.images) {
      result.images = data.result.images.map((img: any) => ({
        url: img.url,
        content_type: 'image/png',
        status: 'completed'
      }));
    } else if (data.status === 'failed') {
      result.status = 'failed';
      result.error = data.error || 'Generation failed';
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-generation-status:', error);
    
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
