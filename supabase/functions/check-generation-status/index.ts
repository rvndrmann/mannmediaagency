
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
  images?: { url: string }[];
  error?: string;
}

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_JOB_AGE = 1800000; // 30 minutes in milliseconds

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // If the request is successful, return the response
    if (response.ok) {
      return response;
    }

    // If we have no more retries, throw the error
    if (retries === 0) {
      const errorText = await response.text();
      throw new Error(`Failed after ${MAX_RETRIES} retries. Status: ${response.status}, Body: ${errorText}`);
    }

    // Log retry attempt
    console.log(`[Retry] Attempt ${MAX_RETRIES - retries + 1} of ${MAX_RETRIES}. Status: ${response.status}`);
    
    // Wait before retrying with exponential backoff
    await sleep(delay);
    
    // Retry with increased delay
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  } catch (error) {
    if (retries === 0) throw error;
    
    console.log(`[Retry] Network error, attempting retry. ${retries} retries remaining`);
    await sleep(delay);
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

async function fetchGenerationStatus(requestId: string, falKey: string): Promise<FalResponse> {
  console.log(`[Status] Fetching generation status for request ID: ${requestId}`);
  const apiUrl = `https://queue.fal.run/fal-ai/bria/requests/${requestId}`;
  console.log(`[Status] API URL: ${apiUrl}`);

  try {
    const response = await fetchWithRetry(
      apiUrl,
      {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    console.log('[Status] Raw response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('[Status] Fetch error:', error);
    throw error;
  }
}

function validateRequestId(requestId: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(requestId);
}

function isJobStuck(createdAt: string): boolean {
  const jobAge = Date.now() - new Date(createdAt).getTime();
  return jobAge > MAX_JOB_AGE;
}

async function getJobCreationTime(requestId: string): Promise<string | null> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration');
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/image_generation_jobs?request_id=eq.${requestId}&select=created_at`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch job creation time: ${response.status}`);
    }

    const data = await response.json();
    return data[0]?.created_at || null;
  } catch (error) {
    console.error('[Job] Error fetching job creation time:', error);
    return null;
  }
}

function mapFalStatusToInternal(falResponse: FalResponse): 'pending' | 'processing' | 'completed' | 'failed' {
  console.log('[Status] Mapping status from response:', JSON.stringify(falResponse, null, 2));

  // If we have a valid image URL, consider it completed
  if (falResponse.result?.images?.[0]?.url || falResponse.images?.[0]?.url) {
    return 'completed';
  }

  // Handle status field if present
  if (falResponse.status) {
    const normalizedStatus = falResponse.status.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'in_progress':
      case 'pending':
        return 'pending';
      default:
        return 'processing';
    }
  }

  return 'processing';
}

function extractImageUrl(data: FalResponse): string | undefined {
  const imageUrl = data.result?.images?.[0]?.url || data.images?.[0]?.url;
  console.log('[URL] Extracted image URL:', imageUrl);
  return imageUrl;
}

async function updateImageJobStatus(requestId: string, status: string, resultUrl?: string): Promise<void> {
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

  try {
    const response = await fetchWithRetry(
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
      const errorText = await response.text();
      throw new Error(`Failed to update job status: ${response.status}, ${errorText}`);
    }
  } catch (error) {
    console.error('[DB] Error updating job status:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  console.log('[Request] Method:', req.method);
  console.log('[Request] Headers:', Object.fromEntries(req.headers.entries()));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { requestId } = await req.json();
    console.log(`[Main] Processing request ID: ${requestId}`);

    if (!requestId) {
      throw new Error('Missing request ID');
    }

    if (!validateRequestId(requestId)) {
      throw new Error('Invalid request ID format');
    }

    // Check job age
    const createdAt = await getJobCreationTime(requestId);
    if (createdAt && isJobStuck(createdAt)) {
      console.log(`[Job] Job ${requestId} is stuck (created at ${createdAt})`);
      await updateImageJobStatus(requestId, 'failed');
      throw new Error('Job timeout exceeded');
    }

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      console.error('[Config] FAL_KEY is not configured');
      throw new Error('FAL_KEY is not configured');
    }

    console.log('[Config] FAL key length:', falKey.length);

    const falResponse = await fetchGenerationStatus(requestId, falKey);
    const internalStatus = mapFalStatusToInternal(falResponse);
    const imageUrl = extractImageUrl(falResponse);

    console.log(`[Main] Mapped status: ${internalStatus}, Image URL: ${imageUrl || 'none'}`);

    // Update database first
    await updateImageJobStatus(requestId, internalStatus, imageUrl);

    // Prepare response
    const response: GenerationStatusResponse = {
      status: internalStatus,
      debug_info: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        raw_status: falResponse.status,
        job_age: createdAt ? Date.now() - new Date(createdAt).getTime() : null
      }
    };

    if (imageUrl && internalStatus === 'completed') {
      response.images = [{
        id: `${requestId}-0`,
        url: imageUrl,
        content_type: 'image/png',
        status: 'completed'
      }];
    }

    if (falResponse.error) {
      response.error = falResponse.error;
    }

    console.log('[Main] Sending response:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error]', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        error: error.message,
        debug_info: {
          timestamp: new Date().toISOString(),
          error_type: error.name,
          error_stack: error.stack
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
