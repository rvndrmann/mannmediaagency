import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const FAL_API_KEY = Deno.env.get('FAL_AI_API_KEY');
// Use the specific Bria Product Shot queue endpoint
const BRIA_QUEUE_URL = 'https://queue.fal.run/fal-ai/bria/product-shot';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!FAL_API_KEY) {
      throw new Error('FAL_AI_API_KEY environment variable not set.');
    }

    // Extract input from request body - expecting image_url and ref_image_url
    const { image_url, ref_image_url } = await req.json();
    if (!image_url || !ref_image_url) {
      throw new Error('Missing required parameters: image_url (product image) and ref_image_url (scene image v1)');
    }

    console.log(`[generate-bria-image] Received request: image_url="${image_url}", ref_image_url="${ref_image_url}"`);

    // --- 1. Submit the request to Fal (Bria endpoint) ---
    const submitResponse = await fetch(BRIA_QUEUE_URL, { // POST to the Bria queue URL
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: image_url, // Main product image
        ref_image_url: ref_image_url, // Reference scene image (V1)
        shot_size: [768, 1360], // Set 9:16 aspect ratio
        // Add other Bria specific parameters if needed
      }),
    });

    if (!submitResponse.ok) {
      const errorBody = await submitResponse.text();
      console.error(`[generate-bria-image] Bria API submission failed: ${submitResponse.status}`, errorBody);
      throw new Error(`Bria API submission failed: ${submitResponse.status} ${errorBody}`);
    }

    const submitResult = await submitResponse.json();
    const requestId = submitResult?.request_id;

    if (!requestId) {
       console.error("[generate-bria-image] Bria API did not return a request_id:", submitResult);
       throw new Error("Bria API did not return a request ID.");
    }

    console.log(`[generate-bria-image] Submitted request to Bria. Request ID: ${requestId}`);

    // Return the request ID immediately
    return new Response(
      JSON.stringify({ requestId: requestId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Indicate successful submission
      }
    );

  } catch (error) {
    console.error('[generate-bria-image] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'An unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
