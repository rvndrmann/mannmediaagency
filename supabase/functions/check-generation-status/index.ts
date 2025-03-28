
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

// Get the appropriate status endpoint based on the request ID and source
const getStatusEndpoint = (requestId: string, source?: string): string => {
  // Default endpoint is flux-subject
  let endpoint = `https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}/status`;
  
  // If source is explicitly set to bria/product-shot, use that endpoint
  if (source === 'bria') {
    endpoint = `https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`;
  }
  
  return endpoint;
};

// Get the appropriate result endpoint based on the request ID and source
const getResultEndpoint = (requestId: string, source?: string): string => {
  // Default endpoint is flux-subject
  let endpoint = `https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}`;
  
  // If source is explicitly set to bria/product-shot, use that endpoint
  if (source === 'bria') {
    endpoint = `https://queue.fal.run/fal-ai/bria/requests/${requestId}`;
  }
  
  return endpoint;
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

    // Get the request ID and source from the request body
    let { requestId, source } = await req.json()
    
    if (!requestId) {
      console.error('Missing requestId in request');
      throw new Error('requestId is required')
    }

    console.log(`Checking status for request_id: ${requestId}, source: ${source || 'default'}`);
    
    const statusEndpoint = getStatusEndpoint(requestId, source);
    console.log(`Using status endpoint: ${statusEndpoint}`);

    try {
      // Fetch the status using the appropriate endpoint
      const statusResponse = await fetch(statusEndpoint, {
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
        
        // Fetch the full result if necessary
        let resultData = statusData;
        if (!resultData.result && !resultData.output && !resultData.url) {
          try {
            const resultEndpoint = getResultEndpoint(requestId, source);
            console.log(`Fetching full result from: ${resultEndpoint}`);
            
            const resultResponse = await fetch(resultEndpoint, {
              method: 'GET',
              headers: {
                'Authorization': `Key ${FAL_KEY}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (resultResponse.ok) {
              resultData = await resultResponse.json();
              console.log(`Full result data:`, JSON.stringify(resultData));
            } else {
              console.error(`Error fetching full result: ${resultResponse.status}`);
            }
          } catch (resultError) {
            console.error('Error fetching full result:', resultError);
          }
        }
        
        // Extract the output from the response - check different response structures
        // Sometimes it's in result, sometimes in output, and sometimes it has a nested images array
        let images = [];
        let prompt = '';
        
        if (resultData.result) {
          // First, try to find images in the result property
          if (Array.isArray(resultData.result?.images)) {
            images = resultData.result.images;
            prompt = resultData.result.prompt || '';
          } else if (resultData.result?.url) {
            // If result has a direct URL
            images = [{ url: resultData.result.url }];
          }
        } else if (resultData.output) {
          // Try to find images in the output property
          if (Array.isArray(resultData.output?.images)) {
            images = resultData.output.images;
            prompt = resultData.output.prompt || '';
          } else if (resultData.output?.url) {
            // If output has a direct URL
            images = [{ url: resultData.output.url }];
          }
        }
        
        // If no images found in standard locations, look for any URL properties at the top level
        if (images.length === 0) {
          if (resultData.url) {
            images = [{ url: resultData.url }];
          } else if (resultData.image_url) {
            images = [{ url: resultData.image_url }];
          }
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
