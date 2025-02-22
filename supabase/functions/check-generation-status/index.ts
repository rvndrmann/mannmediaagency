
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

async function fetchGenerationStatus(requestId: string, falKey: string): Promise<FalResponse> {
  console.log(`[Status] Fetching generation status for request ID: ${requestId}`);

  const response = await fetch(
    `https://queue.fal.run/fal-ai/bria/requests/${requestId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Status] Raw response:', JSON.stringify(data, null, 2));
  return data;
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

  // Default to processing if we can't determine status
  return 'processing';
}

function extractImageUrl(data: FalResponse): string | undefined {
  // Check both possible locations for image URL
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { requestId } = await req.json();
    console.log(`[Main] Processing request ID: ${requestId}`);

    if (!requestId) {
      throw new Error('Missing request ID');
    }

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY is not configured');
    }

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
        raw_status: falResponse.status
      }
    };

    // Add image to response if available
    if (imageUrl && internalStatus === 'completed') {
      response.images = [{
        id: `${requestId}-0`,
        url: imageUrl,
        content_type: 'image/png',
        status: 'completed'
      }];
    }

    // Add error information if available
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
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
