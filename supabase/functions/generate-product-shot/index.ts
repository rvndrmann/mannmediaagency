
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

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
  manual_placement_selection?: string;
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
      console.error('FAL_KEY environment variable is not set');
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
      console.error('Missing image_url in request');
      throw new Error('image_url is required');
    }

    if (!requestBody.scene_description && !requestBody.ref_image_url) {
      console.error('Missing scene_description or ref_image_url in request');
      throw new Error('Either scene_description or ref_image_url must be provided');
    }

    // Log complete request for debugging
    console.log('Request validation passed, preparing to submit to fal.ai');
    console.log('Image URL:', requestBody.image_url.substring(0, 50) + '...');
    console.log('Scene description:', requestBody.scene_description);
    console.log('Placement type:', requestBody.placement_type);
    console.log('Fast mode:', requestBody.fast);

    // Force async mode for all requests
    requestBody.sync_mode = false;

    // Submit request to queue using the correct endpoint
    console.log('Submitting request to fal.ai');
    
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/bria/product-shot', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Fal.ai API error response:', errorText);
      throw new Error(`Failed to submit to queue: ${errorText}`);
    }

    const queueResponse: RequestResponse = await submitResponse.json();
    console.log('Fal.ai queue response:', queueResponse);

    if (!queueResponse.request_id) {
      console.error('No request ID received from fal.ai');
      throw new Error('No request ID received from fal.ai');
    }

    // Always return immediately with the request ID for async handling
    return new Response(
      JSON.stringify({
        requestId: queueResponse.request_id,
        status: 'processing',
        statusUrl: queueResponse.status_url
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

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
