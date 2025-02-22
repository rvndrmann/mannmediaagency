
// Follow Deno runtime API
import { corsHeaders } from "../_shared/cors.ts";

interface GenerationStatusResponse {
  status: string;
  images?: { url: string; content_type: string }[];
  error?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TIMEOUT = 8000; // 8 seconds

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const fetchOptions = {
      ...options,
      signal: controller.signal,
    };

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${TIMEOUT}ms`);
    }

    if (retries > 0) {
      console.log(`Request failed, retrying... ${retries} attempts remaining. Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    throw error;
  }
}

async function fetchGenerationStatus(requestId: string, falKey: string): Promise<any> {
  // First try to get the status
  const statusResponse = await fetchWithRetry(
    `https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    }
  );

  const statusData = await statusResponse.json();
  
  // If the status is completed, fetch the full result
  if (statusData.status === 'COMPLETED') {
    const resultResponse = await fetchWithRetry(
      `https://queue.fal.run/fal-ai/bria/requests/${requestId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      }
    );
    
    return await resultResponse.json();
  }
  
  return statusData;
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

    const data = await fetchGenerationStatus(requestId, falKey);
    console.log(`Status check response for ${requestId}:`, JSON.stringify(data, null, 2));

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
      console.warn(`Unexpected status from fal.ai for request ${requestId}: ${data.status}`);
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
    
    // Structured error response with more details
    const errorResponse = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? {
        name: error.name,
        stack: error.stack,
      } : undefined
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
