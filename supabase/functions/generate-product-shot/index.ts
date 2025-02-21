
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const falKey = Deno.env.get('FAL_KEY')
    if (!falKey) {
      throw new Error('FAL_KEY is not set')
    }

    let requestBody: ProductShotRequest;
    try {
      requestBody = await req.json()
    } catch (e) {
      console.error('JSON parsing error:', e);
      throw new Error('Invalid JSON in request body')
    }

    // Validate required parameters
    if (!requestBody.image_url) {
      throw new Error('Missing required parameter: image_url')
    }

    // Set default values according to API documentation
    const apiRequest = {
      image_url: requestBody.image_url,
      scene_description: requestBody.scene_description || "",
      ref_image_url: requestBody.ref_image_url || "",
      optimize_description: requestBody.optimize_description ?? true,
      num_results: requestBody.num_results ?? 1,
      fast: requestBody.fast ?? true,
      placement_type: requestBody.placement_type || "manual_placement",
      shot_size: requestBody.shot_size || [1000, 1000],
      manual_placement_selection: requestBody.manual_placement_selection || "bottom_center",
      sync_mode: requestBody.sync_mode ?? false
    };

    // Validate scene description or ref_image_url
    if (!apiRequest.scene_description && !apiRequest.ref_image_url) {
      throw new Error('Either scene_description or ref_image_url must be provided')
    }

    if (apiRequest.scene_description && apiRequest.ref_image_url) {
      throw new Error('Cannot provide both scene_description and ref_image_url')
    }

    console.log('Submitting request to FAL API with parameters:', apiRequest);

    // 1. Submit initial request
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/bria/product-shot', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiRequest)
    });

    if (!submitResponse.ok) {
      console.error('Submit response not OK:', submitResponse.status);
      const errorText = await submitResponse.text();
      throw new Error(`API request failed with status ${submitResponse.status}: ${errorText}`)
    }

    const submitData = await submitResponse.json();
    console.log('Submit response:', submitData);

    const requestId = submitData.request_id
    if (!requestId) {
      throw new Error('No request ID received')
    }

    // If sync_mode is true, wait for completion
    if (apiRequest.sync_mode) {
      // 2. Poll for completion with timeout
      const startTime = Date.now();
      const timeout = 30000; // 30 seconds timeout
      
      while (Date.now() - startTime < timeout) {
        console.log('Checking status...');
        
        const statusResponse = await fetch(
          `https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`,
          {
            headers: {
              'Authorization': `Key ${falKey}`
            }
          }
        );

        if (!statusResponse.ok) {
          throw new Error(`Status check failed with status ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        console.log('Status response:', statusData);
        
        if (statusData.status === 'completed') {
          // 3. Get the final result
          const resultResponse = await fetch(
            `https://queue.fal.run/fal-ai/bria/requests/${requestId}`,
            {
              headers: {
                'Authorization': `Key ${falKey}`
              }
            }
          );

          if (!resultResponse.ok) {
            throw new Error(`Failed to fetch result with status ${resultResponse.status}`);
          }

          const result = await resultResponse.json();
          console.log('Result:', result);

          return new Response(
            JSON.stringify(result),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              }
            }
          )
        }
        
        if (statusData.status === 'failed') {
          throw new Error(`Generation failed: ${JSON.stringify(statusData)}`)
        }
        
        // Wait 1 second before next check
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      throw new Error('Timeout waiting for completion')
    } else {
      // For async mode, just return the request ID
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
      )
    }
  } catch (error) {
    console.error('Error:', error);
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
    )
  }
})
