
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

    const { image_url, scene_description } = requestBody
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
        // Only include scene_description if provided
        ...(scene_description && { scene_description })
      })
    }).catch(error => {
      console.error('Submit request failed:', error);
      throw new Error('Failed to submit generation request')
    });

    const submitResponseText = await submitResponse.text();
    console.log('Raw submit response:', submitResponseText);

    if (!submitResponse.ok) {
      console.error('Submit response not OK:', submitResponse.status, submitResponseText);
      throw new Error(`API request failed with status ${submitResponse.status}`)
    }

    // Parse the response text as JSON
    let submitData;
    try {
      submitData = JSON.parse(submitResponseText);
    } catch (e) {
      console.error('Failed to parse submit response as JSON:', e);
      throw new Error('Invalid JSON in API response')
    }

    console.log('Parsed submit response:', submitData);

    const requestId = submitData.request_id
    if (!requestId) {
      throw new Error('No request ID received')
    }
    console.log('Request ID:', requestId);

    // 3. Poll for completion
    let attempts = 0
    while (attempts < 30) {
      console.log(`Checking status attempt ${attempts + 1}`);
      
      const statusResponse = await fetch(`https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falKey}`
        }
      }).catch(error => {
        console.error('Status check failed:', error);
        throw new Error('Failed to check generation status')
      });

      const statusResponseText = await statusResponse.text();
      console.log('Raw status response:', statusResponseText);

      if (!statusResponse.ok) {
        console.error('Status response not OK:', statusResponse.status, statusResponseText);
        throw new Error(`Status check failed with status ${statusResponse.status}`)
      }

      let statusData;
      try {
        statusData = JSON.parse(statusResponseText);
      } catch (e) {
        console.error('Failed to parse status response as JSON:', e);
        throw new Error('Invalid JSON in status response')
      }

      console.log('Parsed status data:', statusData);
      
      if (statusData.status === 'completed') {
        const resultResponse = await fetch(`https://queue.fal.run/fal-ai/bria/requests/${requestId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${falKey}`
          }
        }).catch(error => {
          console.error('Result fetch failed:', error);
          throw new Error('Failed to fetch generation result')
        });

        const resultResponseText = await resultResponse.text();
        console.log('Raw result response:', resultResponseText);

        if (!resultResponse.ok) {
          console.error('Result response not OK:', resultResponse.status, resultResponseText);
          throw new Error(`Failed to fetch result with status ${resultResponse.status}`)
        }

        let result;
        try {
          result = JSON.parse(resultResponseText);
        } catch (e) {
          console.error('Failed to parse result response as JSON:', e);
          throw new Error('Invalid JSON in result response')
        }

        console.log('Parsed result:', result);

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
