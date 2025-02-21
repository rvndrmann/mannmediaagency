
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestResponse {
  request_id: string;
  response_url: string;
  status_url: string;
}

interface StatusResponse {
  status: 'starting' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface ProductShotRequest {
  image_url: string;
  scene_description?: string;
  ref_image_url?: string;
  optimize_description?: boolean;
  num_results?: number;
  fast?: boolean;
  placement_type?: 'original' | 'automatic' | 'manual_placement' | 'manual_padding';
  original_quality?: boolean;
  shot_size?: [number, number];
  manual_placement_selection?: 'upper_left' | 'upper_right' | 'bottom_left' | 'bottom_right' | 'right_center' | 'left_center' | 'upper_center' | 'bottom_center' | 'center_vertical' | 'center_horizontal';
  padding_values?: [number, number, number, number];
  sync_mode?: boolean;
}

const MAX_RETRIES = 3;
const INITIAL_INTERVAL = 15000; // 15 seconds
const MAX_TIMEOUT = 300000; // 5 minutes
const MAX_INTERVAL = 30000; // 30 seconds

async function checkStatus(requestId: string, falKey: string): Promise<{ status: string; result?: any }> {
  const statusResponse = await fetch(
    `https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${falKey}`
      }
    }
  );

  if (!statusResponse.ok) {
    throw new Error(`Status check failed: ${await statusResponse.text()}`);
  }

  const statusData: StatusResponse = await statusResponse.json();
  console.log(`Status for request ${requestId}:`, statusData);

  if (statusData.status === 'failed') {
    throw new Error(`Generation failed: ${statusData.error || 'Unknown error'}`);
  }

  return statusData;
}

async function fetchResult(requestId: string, falKey: string): Promise<any> {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/bria/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${falKey}`
      }
    }
  );

  if (!resultResponse.ok) {
    throw new Error(`Failed to fetch result: ${await resultResponse.text()}`);
  }

  const result = await resultResponse.json();
  console.log(`Result for request ${requestId}:`, result);

  if (!result.images || !Array.isArray(result.images) || result.images.length === 0) {
    throw new Error('No images found in the result');
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the FAL_KEY from environment
    const FAL_KEY = Deno.env.get('FAL_KEY')
    if (!FAL_KEY) {
      throw new Error('FAL_KEY environment variable is not set')
    }

    // Parse request body with error handling
    let requestBody: ProductShotRequest;
    try {
      const text = await req.text();
      console.log('Raw request body:', text);
      requestBody = JSON.parse(text);
    } catch (error) {
      console.error('JSON parsing error:', error);
      throw new Error(`Invalid JSON in request body: ${error.message}`);
    }

    // Validate required fields
    if (!requestBody.image_url) {
      throw new Error('image_url is required');
    }

    if (!requestBody.scene_description && !requestBody.ref_image_url) {
      throw new Error('Either scene_description or ref_image_url must be provided');
    }

    if (requestBody.scene_description && requestBody.ref_image_url) {
      throw new Error('Cannot provide both scene_description and ref_image_url');
    }

    // Prepare request payload with default values
    const requestPayload: any = {
      image_url: requestBody.image_url,
      num_results: requestBody.num_results ?? 1,
      fast: requestBody.fast ?? true,
      placement_type: requestBody.placement_type || 'manual_placement',
      shot_size: requestBody.shot_size || [1000, 1000],
      sync_mode: requestBody.sync_mode ?? true
    };

    // Add either scene description or reference image
    if (requestBody.scene_description) {
      requestPayload.scene_description = requestBody.scene_description;
      requestPayload.optimize_description = requestBody.optimize_description ?? true;
    } else if (requestBody.ref_image_url) {
      requestPayload.ref_image_url = requestBody.ref_image_url;
    }

    // Add conditional parameters
    if (requestPayload.placement_type === 'manual_placement') {
      requestPayload.manual_placement_selection = requestBody.manual_placement_selection || 'bottom_center';
    } else if (requestPayload.placement_type === 'manual_padding' && requestBody.padding_values) {
      requestPayload.padding_values = requestBody.padding_values;
    } else if (requestPayload.placement_type === 'original') {
      requestPayload.original_quality = requestBody.original_quality ?? false;
    }

    console.log('Submitting request to queue with payload:', requestPayload);

    // Submit request to queue with retry mechanism
    let queueResponse: RequestResponse | null = null;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES && !queueResponse) {
      try {
        const submitResponse = await fetch('https://queue.fal.run/fal-ai/bria/product-shot', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          throw new Error(`Failed to submit to queue: ${errorText}`);
        }

        queueResponse = await submitResponse.json();
        console.log('Queue response:', queueResponse);
      } catch (error) {
        retryCount++;
        if (retryCount === MAX_RETRIES) {
          throw error;
        }
        console.log(`Retry ${retryCount}/${MAX_RETRIES} after error:`, error);
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      }
    }

    if (!queueResponse?.request_id) {
      throw new Error('No request ID received from queue');
    }

    const requestId = queueResponse.request_id;

    // For sync mode, wait for completion with progressive intervals
    if (requestPayload.sync_mode) {
      const startTime = Date.now();
      let currentInterval = INITIAL_INTERVAL;
      let lastStatusUpdate = '';

      while (Date.now() - startTime < MAX_TIMEOUT) {
        try {
          const statusData = await checkStatus(requestId, FAL_KEY);

          // If status changed, log it
          if (statusData.status !== lastStatusUpdate) {
            console.log(`Status updated for request ${requestId}: ${statusData.status}`);
            lastStatusUpdate = statusData.status;
          }

          if (statusData.status === 'completed') {
            try {
              const result = await fetchResult(requestId, FAL_KEY);
              return new Response(JSON.stringify(result), {
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json'
                }
              });
            } catch (error) {
              throw new Error(`Failed to process completed result: ${error.message}`);
            }
          }

          // Progressive interval increase
          currentInterval = Math.min(currentInterval * 1.5, MAX_INTERVAL);
          await new Promise(resolve => setTimeout(resolve, currentInterval));
        } catch (error) {
          console.error(`Error checking status for request ${requestId}:`, error);
          
          // If it's a temporary error, retry after a short delay
          if (error.message.includes('429') || error.message.includes('503')) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          
          throw error;
        }
      }

      // If we reach here, we've timed out
      throw new Error(`Request timed out after 5 minutes. You can check the status later using request ID: ${requestId}`);
    } else {
      // For async mode, return the request ID immediately
      return new Response(
        JSON.stringify({
          request_id: requestId,
          status: 'processing'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

  } catch (error) {
    console.error('Error in generate-product-shot:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
})
