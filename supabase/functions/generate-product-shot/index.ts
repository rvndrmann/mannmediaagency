
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

    // Parse request body
    const requestBody: ProductShotRequest = await req.json()

    // Validate required fields
    if (!requestBody.image_url) {
      throw new Error('image_url is required')
    }

    // Prepare request payload with default values
    const requestPayload = {
      image_url: requestBody.image_url,
      scene_description: requestBody.scene_description || '',
      ref_image_url: requestBody.ref_image_url || '',
      optimize_description: requestBody.optimize_description ?? true,
      num_results: requestBody.num_results ?? 1,
      fast: requestBody.fast ?? true,
      placement_type: requestBody.placement_type || 'manual_placement',
      shot_size: requestBody.shot_size || [1000, 1000],
      sync_mode: requestBody.sync_mode ?? true
    };

    // Add conditional parameters
    if (requestPayload.placement_type === 'manual_placement') {
      requestPayload['manual_placement_selection'] = requestBody.manual_placement_selection || 'bottom_center';
    } else if (requestPayload.placement_type === 'manual_padding' && requestBody.padding_values) {
      requestPayload['padding_values'] = requestBody.padding_values;
    } else if (requestPayload.placement_type === 'original') {
      requestPayload['original_quality'] = requestBody.original_quality ?? false;
    }

    console.log('Submitting request to queue with payload:', requestPayload);

    // 1. Submit request to queue
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
      console.error('Queue submission error:', errorText);
      throw new Error(`Failed to submit to queue: ${errorText}`);
    }

    const queueResponse: RequestResponse = await submitResponse.json();
    console.log('Queue response:', queueResponse);

    if (!queueResponse.request_id) {
      throw new Error('No request ID received from queue');
    }

    // For sync mode, wait for completion
    if (requestPayload.sync_mode) {
      const startTime = Date.now();
      const timeout = 60000; // 60 second timeout
      
      while (Date.now() - startTime < timeout) {
        // 2. Check status
        console.log(`Checking status for request ${queueResponse.request_id}`);
        const statusResponse = await fetch(
          `https://queue.fal.run/fal-ai/bria/requests/${queueResponse.request_id}/status`,
          {
            headers: {
              'Authorization': `Key ${FAL_KEY}`
            }
          }
        );

        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${await statusResponse.text()}`);
        }

        const statusData: StatusResponse = await statusResponse.json();
        console.log('Status response:', statusData);

        if (statusData.status === 'completed') {
          // 3. Get final result
          console.log('Request completed, fetching result');
          const resultResponse = await fetch(
            `https://queue.fal.run/fal-ai/bria/requests/${queueResponse.request_id}`,
            {
              headers: {
                'Authorization': `Key ${FAL_KEY}`
              }
            }
          );

          if (!resultResponse.ok) {
            throw new Error(`Failed to fetch result: ${await resultResponse.text()}`);
          }

          const result = await resultResponse.json();
          console.log('Final result:', result);

          return new Response(JSON.stringify(result), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        if (statusData.status === 'failed') {
          throw new Error(`Generation failed: ${statusData.error || 'Unknown error'}`);
        }

        // Wait 2 seconds before next status check
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      throw new Error('Request timed out after 60 seconds');
    } else {
      // For async mode, return the request ID immediately
      return new Response(
        JSON.stringify({
          request_id: queueResponse.request_id,
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
