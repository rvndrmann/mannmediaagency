
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Validate FAL_KEY format
    if (!falKey.startsWith('fal_')) {
      throw new Error('Invalid FAL_KEY format. Key should start with "fal_"')
    }

    let requestBody;
    try {
      requestBody = await req.json()
    } catch (e) {
      console.error('JSON parsing error:', e);
      throw new Error('Invalid JSON in request body')
    }

    const { image_url, scene_description, placement_type } = requestBody
    if (!image_url) {
      throw new Error('Missing required parameter: image_url')
    }

    console.log('Processing request for image:', image_url);
    if (scene_description) {
      console.log('Scene description:', scene_description);
    }

    // 1. Submit initial request
    console.log('Submitting initial request to FAL API...');
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/bria/product-shot', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url,
        scene_description,
        placement_type
      })
    });

    if (!submitResponse.ok) {
      console.error('Submit response not OK:', submitResponse.status);
      throw new Error(`API request failed with status ${submitResponse.status}`)
    }

    const submitData = await submitResponse.json();
    console.log('Submit response:', submitData);

    const requestId = submitData.request_id
    if (!requestId) {
      throw new Error('No request ID received')
    }
    console.log('Request ID:', requestId);

    // 2. Poll for completion
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      console.log(`Checking status attempt ${attempts + 1}`);
      
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

        if (!result.images || !result.images[0]) {
          throw new Error('No image URL in response')
        }

        // Transform the result to match our expected format
        const transformedResult = {
          images: [{
            url: result.images[0],
            content_type: 'image/png'
          }]
        }
        
        return new Response(
          JSON.stringify(transformedResult),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            },
            status: 200
          }
        )
      }
      
      if (statusData.status === 'failed') {
        throw new Error(`Generation failed: ${JSON.stringify(statusData)}`)
      }
      
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
    }

    throw new Error('Timeout waiting for completion')
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
