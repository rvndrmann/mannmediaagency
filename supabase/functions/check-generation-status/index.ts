
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
  debug_info?: any;
}

interface FalResponse {
  status?: string;
  result?: {
    images?: { url: string }[];
  };
  images?: { url: string }[];  // Support both nested and top-level images
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
    console.log(`[Fetch] Attempting fetch to ${url}, attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}`);
    
    const fetchOptions = {
      ...options,
      signal: controller.signal,
    };

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    console.log(`[Fetch] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Fetch] HTTP error response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`[Fetch] Request timed out after ${TIMEOUT}ms`);
      throw new Error(`Request timed out after ${TIMEOUT}ms`);
    }

    console.error(`[Fetch] Error:`, error);

    if (retries > 0) {
      console.log(`[Fetch] Request failed, retrying... ${retries} attempts remaining. Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    throw error;
  }
}

function validateFalResponse(data: FalResponse): void {
  console.log('[Validate] Validating fal.ai response structure:', JSON.stringify(data, null, 2));
  
  if (!data) {
    throw new Error('Empty response from fal.ai');
  }

  if (!data.status && !data.result?.images && !data.images) {
    throw new Error('Invalid response structure: missing status and images');
  }
}

async function fetchGenerationStatus(requestId: string, falKey: string): Promise<FalResponse> {
  console.log(`[Status] Fetching generation status for request ID: ${requestId}`);

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
  console.log('[Status] Raw status response:', JSON.stringify(statusData, null, 2));
  
  validateFalResponse(statusData);
  
  // Case-insensitive status check
  const normalizedStatus = statusData.status?.toLowerCase() || '';
  
  // If the status is completed, fetch the full result
  if (normalizedStatus === 'completed') {
    console.log('[Status] Status is completed, fetching full result');
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
      console.log('[Result] Raw result response:', JSON.stringify(resultData, null, 2));
      
      validateFalResponse(resultData);
      
      // Check for images in both possible locations
      const hasImages = !!(resultData.result?.images?.[0]?.url || resultData.images?.[0]?.url);
      if (!hasImages) {
        console.error('[Result] Missing image URL in completed result:', resultData);
        throw new Error('Invalid result data: missing image URL');
      }
      
      return resultData;
    } catch (error) {
      console.error('[Result] Error fetching full result:', error);
      // Return detailed error information
      return {
        ...statusData,
        error: `Failed to fetch completed result: ${error.message}`,
        logs: {
          timestamp: new Date().toISOString(),
          error_details: error instanceof Error ? error.stack : String(error)
        }
      };
    }
  }
  
  return statusData;
}

function mapFalStatusToInternal(falStatus?: string): 'pending' | 'processing' | 'completed' | 'failed' {
  if (!falStatus) {
    console.log('[Status] No status provided, defaulting to processing');
    return 'processing';
  }
  
  const normalizedStatus = falStatus.toLowerCase();
  console.log(`[Status] Mapping fal.ai status: ${falStatus} (normalized: ${normalizedStatus})`);
  
  switch (normalizedStatus) {
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'in_progress':
    case 'pending':
      return 'pending';
    case 'processing':
    default:
      return 'processing';
  }
}

// Get prompt from database for a given request ID
async function getPromptFromDB(requestId: string): Promise<string | undefined> {
  try {
    console.log(`[DB] Fetching prompt from DB for request ID: ${requestId}`);
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[DB] Missing Supabase configuration');
      return undefined;
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/image_generation_jobs?request_id=eq.${requestId}&select=prompt`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error(`[DB] Fetch error: ${response.status}`, await response.text());
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[DB] Prompt fetch result:', data);
    return data[0]?.prompt;
  } catch (error) {
    console.error('[DB] Error fetching prompt:', error);
    return undefined;
  }
}

// Update image job status in database
async function updateImageJobStatus(requestId: string, status: string, resultUrl?: string): Promise<void> {
  try {
    console.log(`[DB] Updating job status - Request ID: ${requestId}, Status: ${status}, URL: ${resultUrl || 'none'}`);
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (resultUrl) {
      updateData.result_url = resultUrl;
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/image_generation_jobs?request_id=eq.${requestId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update job status: ${response.status}`);
    }

    console.log('[DB] Successfully updated job status');
  } catch (error) {
    console.error('[DB] Error updating job status:', error);
    throw error;
  }
}

function extractImageUrl(data: FalResponse): string | undefined {
  // Try both possible locations for the image URL
  return data.result?.images?.[0]?.url || data.images?.[0]?.url;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { requestId } = await req.json();

    if (!requestId || typeof requestId !== 'string' || requestId.length < 1) {
      throw new Error('Invalid or missing request ID');
    }

    console.log(`[Main] Processing status check for request ID: ${requestId}`);

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

    const [data, prompt] = await Promise.all([
      fetchGenerationStatus(requestId, falKey),
      getPromptFromDB(requestId)
    ]);

    console.log(`[Main] Processed status check response:`, JSON.stringify(data, null, 2));

    // Map fal.ai status to our format with better error handling
    const internalStatus = mapFalStatusToInternal(data.status);
    const result: GenerationStatusResponse = {
      status: internalStatus,
      debug_info: {
        original_status: data.status,
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    };

    if (internalStatus === 'completed') {
      const imageUrl = extractImageUrl(data);
      if (imageUrl) {
        result.images = [{
          id: `${requestId}-0`,
          url: imageUrl,
          content_type: 'image/png',
          status: 'completed',
          prompt: prompt
        }];

        // Update DB with completed status and result URL
        await updateImageJobStatus(requestId, 'completed', imageUrl);
      } else {
        console.error('[Main] Completed status but no image URL found');
        result.status = 'failed';
        result.error = 'Generation completed but no image URL found';
        await updateImageJobStatus(requestId, 'failed');
      }
    } else if (internalStatus === 'failed') {
      result.error = data.error || 'Generation failed unexpectedly';
      result.debug_info = {
        ...result.debug_info,
        error_details: data.logs || {},
      };
      
      // Update DB with failed status
      await updateImageJobStatus(requestId, 'failed');
    } else {
      // For pending/processing status, just update the status
      await updateImageJobStatus(requestId, internalStatus);
    }

    console.log('[Main] Returning response:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Main] Error in check-generation-status:', error);
    
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
