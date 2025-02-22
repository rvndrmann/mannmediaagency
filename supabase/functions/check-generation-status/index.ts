
// Follow Deno runtime API
import { corsHeaders } from "../_shared/cors.ts";

interface GenerationStatusResponse {
  status: string;
  images?: { url: string; content_type: string }[];
  error?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${retries} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
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

    console.log(`Checking status for request ID: ${requestId}`);

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    // Call fal.ai status endpoint with retry logic
    const response = await fetchWithRetry(
      `https://queue.fal.ai/fal-ai/bria/requests/${requestId}/status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log('Fal.ai response:', JSON.stringify(data, null, 2));

    // Map fal.ai status to our format with better error handling
    const result: GenerationStatusResponse = {
      status: 'processing', // Default status
    };

    if (data.status === 'COMPLETED' && data.result?.images) {
      result.status = 'completed';
      result.images = data.result.images.map((img: any) => ({
        url: img.url,
        content_type: 'image/png',
        status: 'completed'
      }));
    } else if (data.status === 'FAILED') {
      result.status = 'failed';
      result.error = data.error || 'Generation failed unexpectedly';
    } else if (data.status === 'PROCESSING' || data.status === 'PENDING') {
      result.status = 'processing';
    } else {
      console.warn(`Unexpected status from fal.ai: ${data.status}`);
      result.status = 'processing'; // Fallback to processing for unknown states
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
    
    // Structured error response
    const errorResponse = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
