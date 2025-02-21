
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

    console.log('Making request to FAL API with payload:', requestPayload);

    // Make the API request
    const response = await fetch('https://rest.fal.ai/bria/product-shot', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FAL API error:', errorText);
      throw new Error(`FAL API request failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('FAL API response:', result);

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

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
