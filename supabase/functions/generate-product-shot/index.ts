
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  // If not JSON, get the text content for error reporting
  const text = await response.text();
  throw new Error(`Unexpected response format. Status: ${response.status}, Content: ${text.substring(0, 200)}...`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const falKey = Deno.env.get('FAL_KEY')
    if (!falKey) {
      throw new Error('FAL_KEY is not set')
    }

    const { image_url, scene_description, placement_type, manual_placement_selection } = await req.json()
    
    console.log('Received request:', { image_url, scene_description, placement_type, manual_placement_selection });

    // Submit the initial request to FAL AI
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/bria/product-shot', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url,
        scene_description,
        placement_type,
        manual_placement_selection,
        optimize_description: true,
        num_results: 1,
        fast: true,
        shot_size: [1000, 1000]
      })
    })

    let submitData;
    try {
      submitData = await parseResponse(submitResponse);
      console.log('FAL AI submit response:', submitData);
    } catch (error) {
      console.error('Error parsing submit response:', error);
      throw new Error(`Failed to parse FAL AI response: ${error.message}`);
    }

    if (!submitResponse.ok) {
      throw new Error(`FAL AI submit failed: ${JSON.stringify(submitData)}`)
    }

    const requestId = submitData.request_id
    if (!requestId) {
      throw new Error('No request ID received from FAL AI')
    }

    // Poll for the result
    let attempts = 0
    let result = null
    while (attempts < 30) { // Maximum 30 attempts (30 seconds)
      console.log(`Polling attempt ${attempts + 1} for request ${requestId}`);
      
      const statusResponse = await fetch(`https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`, {
        headers: {
          'Authorization': `Key ${falKey}`,
        }
      })
      
      let statusData;
      try {
        statusData = await parseResponse(statusResponse);
        console.log(`Status response for attempt ${attempts + 1}:`, statusData);
      } catch (error) {
        console.error(`Error parsing status response on attempt ${attempts + 1}:`, error);
        throw new Error(`Failed to parse status response: ${error.message}`);
      }
      
      if (statusData.status === 'completed') {
        const resultResponse = await fetch(`https://queue.fal.run/fal-ai/bria/requests/${requestId}`, {
          headers: {
            'Authorization': `Key ${falKey}`,
          }
        })
        
        try {
          result = await parseResponse(resultResponse);
          console.log('Final result:', result);
          break;
        } catch (error) {
          console.error('Error parsing result response:', error);
          throw new Error(`Failed to parse result response: ${error.message}`);
        }
      }
      
      if (statusData.status === 'failed') {
        throw new Error(`Image generation failed: ${JSON.stringify(statusData)}`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before next attempt
      attempts++
    }

    if (!result) {
      throw new Error('Timeout waiting for image generation')
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in generate-product-shot function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
