
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

    let requestBody;
    try {
      requestBody = await req.json()
    } catch (e) {
      console.error('JSON parsing error:', e);
      throw new Error('Invalid JSON in request body')
    }

    const { image_url, scene_description } = requestBody
    if (!image_url || !scene_description) {
      throw new Error('Missing required parameters: image_url and scene_description')
    }

    console.log('Processing request for image:', image_url);
    console.log('Scene description:', scene_description);

    // 1. Submit initial request
    const submitResponse = await fetch('https://queue.fal.ai/fal-ai/bria/product-shot', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url,
        scene_description
      })
    }).catch(error => {
      console.error('Submit request failed:', error);
      throw new Error('Failed to submit generation request')
    });

    if (!submitResponse.ok) {
      const errorData = await submitResponse.text();
      console.error('Submit response not OK:', submitResponse.status, errorData);
      throw new Error(`API request failed with status ${submitResponse.status}`)
    }

    // 2. Get request ID from response
    const submitData = await submitResponse.json();
    console.log('Initial response:', submitData);

    const requestId = submitData.request_id
    if (!requestId) {
      throw new Error('No request ID received')
    }
    console.log('Request ID:', requestId);

    // 3. Poll for completion
    let attempts = 0
    while (attempts < 30) {
      console.log(`Checking status attempt ${attempts + 1}`);
      
      const statusResponse = await fetch(`https://queue.fal.ai/fal-ai/bria/requests/${requestId}/status`, {
        headers: {
          'Authorization': `Key ${falKey}`
        }
      }).catch(error => {
        console.error('Status check failed:', error);
        throw new Error('Failed to check generation status')
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.text();
        console.error('Status response not OK:', statusResponse.status, errorData);
        throw new Error(`Status check failed with status ${statusResponse.status}`)
      }
      
      const statusData = await statusResponse.json()
      console.log('Status:', statusData);
      
      if (statusData.status === 'completed') {
        const resultResponse = await fetch(`https://queue.fal.ai/fal-ai/bria/requests/${requestId}`, {
          headers: {
            'Authorization': `Key ${falKey}`
          }
        }).catch(error => {
          console.error('Result fetch failed:', error);
          throw new Error('Failed to fetch generation result')
        });

        if (!resultResponse.ok) {
          const errorData = await resultResponse.text();
          console.error('Result response not OK:', resultResponse.status, errorData);
          throw new Error(`Failed to fetch result with status ${resultResponse.status}`)
        }
        
        const result = await resultResponse.json()
        console.log('Success! Final result:', result);

        if (!result.images || !result.images[0]) {
          throw new Error('No image URL in response')
        }

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
