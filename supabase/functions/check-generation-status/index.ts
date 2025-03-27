
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

interface GeneratedImage {
  id: string;
  url: string;
  content_type: string;
  status: 'completed';
  prompt?: string;
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

    // Get the request ID from the request body
    let { requestId } = await req.json()
    
    if (!requestId) {
      console.error('Missing requestId in request');
      throw new Error('requestId is required')
    }

    console.log(`Checking status for request: ${requestId}`)

    // Check status from fal.ai using the correct endpoint
    // The key issue was using the wrong URL format - we need to use the specific endpoint format
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`, {
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

    const statusData = await statusResponse.json()
    console.log(`Status for request ${requestId}:`, JSON.stringify(statusData))

    // Process completed results to match our expected format
    if (statusData.status === 'COMPLETED' || statusData.status === 'completed') {
      console.log('Processing completed results');
      
      // Extract the output from the response
      const output = statusData.result || statusData.output || {};
      const images = output.images || [];
      
      const formattedImages: GeneratedImage[] = images.map((img: any, index: number) => ({
        id: `${requestId}-${index}`,
        url: img.url,
        content_type: 'image/jpeg', // fal.ai default
        status: 'completed',
        prompt: output.prompt || ''
      }));
      
      console.log('Formatted images:', JSON.stringify(formattedImages));
      
      return new Response(
        JSON.stringify({
          status: 'completed',
          images: formattedImages
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    } else if (statusData.status === 'FAILED' || statusData.status === 'failed' || statusData.error) {
      // Handle failed status
      return new Response(
        JSON.stringify({
          status: 'failed',
          error: statusData.error || 'Unknown error occurred'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    } else {
      // For in-progress status, normalize the status field
      let normalizedStatus = 'processing';
      if (statusData.status === 'IN_QUEUE' || statusData.status === 'PROCESSING') {
        normalizedStatus = 'processing';
      }
      
      return new Response(
        JSON.stringify({
          status: normalizedStatus,
          error: statusData.error
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
    console.error('Error in check-generation-status:', error)
    return new Response(
      JSON.stringify({
        status: 'failed',
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
