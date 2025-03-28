
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StatusResponse {
  status: 'IN_QUEUE' | 'COMPLETED' | 'FAILED';
  output?: any;
  error?: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  content_type: string;
  status: 'COMPLETED';
  prompt?: string;
}

// Helper function to normalize status
const normalizeStatus = (status: string): 'IN_QUEUE' | 'COMPLETED' | 'FAILED' => {
  if (!status) return 'IN_QUEUE';
  
  const upperStatus = status.toUpperCase();
  
  if (upperStatus === 'COMPLETED' || upperStatus === 'FAILED') {
    return upperStatus as 'COMPLETED' | 'FAILED';
  }
  
  // For any status that is not COMPLETED or FAILED, normalize to IN_QUEUE
  return 'IN_QUEUE';
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Get the FAL_KEY from environment
    const FAL_KEY = Deno.env.get('FAL_AI_API_KEY') || Deno.env.get('FAL_KEY')
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

    console.log(`Checking status for request_id: ${requestId}`)

    try {
      // Use flux-subject endpoint for consistency with retry-image-generation function
      const statusResponse = await fetch(`https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!statusResponse.ok) {
        const statusCode = statusResponse.status;
        const errorText = await statusResponse.text();
        console.error(`Fal.ai API error (Status ${statusCode}):`, errorText);
        
        // Special handling for 404 errors - the request ID no longer exists
        if (statusCode === 404) {
          return new Response(
            JSON.stringify({
              status: 'FAILED',
              error: `Resource not found (404). The generation request may have expired.`
            }),
            {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              },
              status: 200 // Still return 200 to client so they can handle the FAILED status
            }
          );
        }
        
        // For other client errors, also mark as FAILED but with appropriate message
        if (statusCode >= 400 && statusCode < 500) {
          return new Response(
            JSON.stringify({
              status: 'FAILED',
              error: `API Error (${statusCode}): ${errorText}`
            }),
            {
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              },
              status: 200 // Still return 200 to client so they can handle the FAILED status
            }
          );
        }
        
        throw new Error(`Failed to check status: ${errorText} (Status: ${statusCode})`);
      }

      const statusData = await statusResponse.json()
      console.log(`Status for request_id ${requestId}:`, JSON.stringify(statusData))
      
      // Normalize the status to our simplified format
      const normalizedStatus = normalizeStatus(statusData.status);
      console.log(`Normalized status: ${normalizedStatus}`);

      // Process completed results to match our expected format
      if (normalizedStatus === 'COMPLETED') {
        console.log('Processing completed results');
        
        // Extract the output from the response - check different response structures
        // Sometimes it's in result, sometimes in output, and sometimes it has a nested images array
        let images = [];
        let prompt = '';
        
        if (statusData.result) {
          // First, try to find images in the result property
          if (Array.isArray(statusData.result?.images)) {
            images = statusData.result.images;
            prompt = statusData.result.prompt || '';
          } else if (statusData.result?.url) {
            // If result has a direct URL
            images = [{ url: statusData.result.url }];
          }
        } else if (statusData.output) {
          // Try to find images in the output property
          if (Array.isArray(statusData.output?.images)) {
            images = statusData.output.images;
            prompt = statusData.output.prompt || '';
          } else if (statusData.output?.url) {
            // If output has a direct URL
            images = [{ url: statusData.output.url }];
          }
        }
        
        // If no images found in standard locations, look for any URL properties at the top level
        if (images.length === 0 && statusData.url) {
          images = [{ url: statusData.url }];
        }
        
        console.log('Extracted images:', JSON.stringify(images));
        
        // Format the images according to our expected structure
        const formattedImages: GeneratedImage[] = images.map((img: any, index: number) => ({
          id: `${requestId}-${index}`,
          url: img.url,
          content_type: 'image/jpeg', // fal.ai default
          status: 'COMPLETED',
          prompt: prompt
        }));
        
        console.log('Formatted images:', JSON.stringify(formattedImages));
        
        return new Response(
          JSON.stringify({
            status: normalizedStatus,
            images: formattedImages
          }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        )
      } else if (normalizedStatus === 'FAILED') {
        // Handle failed status
        return new Response(
          JSON.stringify({
            status: normalizedStatus,
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
        // For in-progress status (IN_QUEUE)
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
    } catch (requestError) {
      console.error(`Error communicating with Fal.ai API:`, requestError);
      return new Response(
        JSON.stringify({
          status: 'FAILED',
          error: `API communication error: ${requestError.message}`
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200 // Still return 200 to allow client to handle the error
        }
      );
    }

  } catch (error) {
    console.error('Error in check-generation-status:', error);
    return new Response(
      JSON.stringify({
        status: 'FAILED',
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
