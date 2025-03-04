
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StatusResponse {
  status: 'starting' | 'processing' | 'completed' | 'failed';
  output?: any;
  error?: string;
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

    // Get the request ID from the request body
    let { requestId } = await req.json()
    
    if (!requestId) {
      throw new Error('requestId is required')
    }

    console.log(`Checking status for request: ${requestId}`)

    // Check status from fal.ai
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/bria/product-shot/status/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text()
      console.error('Fal.ai API error:', errorText)
      throw new Error(`Failed to check status: ${errorText}`)
    }

    const statusData: StatusResponse = await statusResponse.json()
    console.log(`Status for request ${requestId}: ${statusData.status}`)

    // Return the status response
    return new Response(
      JSON.stringify({
        status: statusData.status,
        output: statusData.output,
        error: statusData.error
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in check-generation-status:', error)
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
