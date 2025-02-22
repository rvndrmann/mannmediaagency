
// Follow Deno runtime API
import { corsHeaders } from "../_shared/cors.ts";

interface GenerationStatusResponse {
  status: string;
  images?: {
    id: string;
    url: string;
    content_type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    prompt?: string;
  }[];
  error?: string;
}

interface FalResponse {
  status?: string;
  result?: {
    images?: { url: string }[];
  };
  error?: string;
  request_id?: string;
  response_url?: string;
  status_url?: string;
  logs?: any;
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

async function fetchGenerationStatus(requestId: string, falKey: string): Promise<FalResponse> {
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

  const statusData: FalResponse = await statusResponse.json();
  console.log('Raw status response:', JSON.stringify(statusData, null, 2));
  
  // If the status is completed, fetch the full result
  if (statusData.status === 'COMPLETED') {
    try {
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
      
      const resultData: FalResponse = await resultResponse.json();
      console.log('Raw result response:', JSON.stringify(resultData, null, 2));
      return resultData;
    } catch (error) {
      console.error('Error fetching full result:', error);
      // If we fail to fetch the full result, return the status data
      return statusData;
    }
  }
  
  return statusData;
}

function mapFalStatusToInternal(falStatus?: string): 'pending' | 'processing' | 'completed' | 'failed' {
  if (!falStatus) return 'processing';
  
  switch (falStatus.toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'IN_PROGRESS':
    case 'PENDING':
      return 'pending';
    case 'PROCESSING':
    default:
      return 'processing';
  }
}

// Get prompt from database for a given request ID
async function getPromptFromDB(requestId: string): Promise<string | undefined> {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration');
      return undefined;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/image_generation_jobs?request_id=eq.${requestId}&select=prompt`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data[0]?.prompt;
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return undefined;
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

    const [data, prompt] = await Promise.all([
      fetchGenerationStatus(requestId, falKey),
      getPromptFromDB(requestId)
    ]);

    console.log(`Processed status check response for ${requestId}:`, JSON.stringify(data, null, 2));

    // Map fal.ai status to our format with better error handling
    const internalStatus = mapFalStatusToInternal(data.status);
    const result: GenerationStatusResponse = {
      status: internalStatus,
    };

    if (internalStatus === 'completed' && data.result?.images) {
      result.images = data.result.images.map((img: any, index: number) => ({
        id: `${requestId}-${index}`,
        url: img.url,
        content_type: 'image/png',
        status: 'completed',
        prompt: prompt
      }));
    } else if (internalStatus === 'failed') {
      result.error = data.error || 'Generation failed unexpectedly';
    }

    console.log('Returning response:', JSON.stringify(result, null, 2));

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
