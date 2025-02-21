
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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

    // Get request parameters
    const { image_url, scene_description } = await req.json()
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
    })

    // 2. Get request ID from response
    const submitData = await submitResponse.json()
    console.log('Initial response:', submitData);
    
    if (!submitResponse.ok) {
      throw new Error(`Request failed: ${JSON.stringify(submitData)}`)
    }

    const requestId = submitData.request_id
    if (!requestId) {
      throw new Error('No request ID received')
    }
    console.log('Request ID:', requestId);

    // 3. Poll for completion
    let attempts = 0
    let result = null
    while (attempts < 30) {
      console.log(`Checking status attempt ${attempts + 1}`);
      
      const statusResponse = await fetch(`https://queue.fal.ai/fal-ai/bria/requests/${requestId}/status`, {
        headers: {
          'Authorization': `Key ${falKey}`,
        }
      })
      
      const statusData = await statusResponse.json()
      console.log('Status:', statusData);
      
      if (statusData.status === 'completed') {
        // 4. Get final result
        const resultResponse = await fetch(`https://queue.fal.ai/fal-ai/bria/requests/${requestId}`, {
          headers: {
            'Authorization': `Key ${falKey}`,
          }
        })
        
        result = await resultResponse.json()
        console.log('Success! Final result:', result);

        // Transform the response to match our expected format
        const transformedResult = {
          images: [{
            url: result.images[0],
            content_type: 'image/png'
          }]
        }
        
        return new Response(
          JSON.stringify(transformedResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
