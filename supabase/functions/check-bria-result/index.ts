import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const FAL_API_KEY = Deno.env.get('FAL_AI_API_KEY');
const BRIA_QUEUE_URL = 'https://queue.fal.run/fal-ai/bria'; // Correct base URL for status/result

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!FAL_API_KEY) {
      throw new Error('FAL_AI_API_KEY environment variable not set.');
    }

    // Extract requestId from request body
    const { requestId } = await req.json();
    if (!requestId) {
      throw new Error('Missing required parameter: requestId');
    }

    console.log(`[check-bria-result] Checking status for request ID: ${requestId}`);

    // --- Check the status endpoint ---
    const statusResponse = await fetch(`${BRIA_QUEUE_URL}/requests/${requestId}/status`, {
      method: 'GET', // Use GET as per documentation and V1 logic
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Accept': 'application/json', // Add Accept header
      },
    });

    let responsePayload: { status: string; imageUrl?: string; error?: string };

    if (!statusResponse.ok) {
      // Handle potential 405 or other errors during status check
      const errorBody = await statusResponse.text();
      console.error(`[check-bria-result] Bria API status check failed: ${statusResponse.status}`, errorBody);
      // Return an error status to the frontend
      responsePayload = { status: 'ERROR', error: `Status check failed: ${statusResponse.status}` };

    } else {
      const statusResult = await statusResponse.json();
      const currentStatus = statusResult?.status;
      console.log(`[check-bria-result] Status for ${requestId}: ${currentStatus}`);

      if (currentStatus === 'COMPLETED') {
        // --- Fetch the final result ---
        console.log(`[check-bria-result] Request ${requestId} completed. Fetching result...`);
        const resultResponse = await fetch(`${BRIA_QUEUE_URL}/requests/${requestId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${FAL_API_KEY}`,
          },
        });

        if (!resultResponse.ok) {
          const errorBody = await resultResponse.text();
          console.error(`[check-bria-result] Bria API result fetch failed: ${resultResponse.status}`, errorBody);
          responsePayload = { status: 'ERROR', error: `Result fetch failed: ${resultResponse.status}` };
        } else {
          const finalResult = await resultResponse.json();
          if (finalResult?.images && finalResult.images.length > 0 && finalResult.images[0].url) {
            const imageUrl = finalResult.images[0].url;
            console.log(`[check-bria-result] Successfully fetched image URL for ${requestId}: ${imageUrl}`);
            responsePayload = { status: 'COMPLETED', imageUrl: imageUrl };
          } else {
            console.error("[check-bria-result] Bria API result did not contain expected image URL:", finalResult);
            responsePayload = { status: 'ERROR', error: 'Result format unexpected' };
          }
        }
      } else if (currentStatus === 'ERROR' || currentStatus === 'FAILED') {
        console.error(`[check-bria-result] Bria request ${requestId} failed with status: ${currentStatus}`);
        responsePayload = { status: 'FAILED', error: `Generation failed with status: ${currentStatus}` };
      } else if (currentStatus === 'IN_QUEUE' || currentStatus === 'IN_PROGRESS') {
        console.log(`[check-bria-result] Request ${requestId} is ${currentStatus}.`);
        responsePayload = { status: 'PENDING' }; // Indicate still processing
      } else {
        console.warn(`[check-bria-result] Received unexpected status '${currentStatus}' for ${requestId}.`);
        responsePayload = { status: 'PENDING' }; // Treat unexpected as pending for now
      }
    }

    // Return the status payload
    return new Response(
      JSON.stringify(responsePayload),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Always return 200 OK from the edge function itself
      }
    );

  } catch (error) {
    console.error('[check-bria-result] Error:', error);
    return new Response(
      JSON.stringify({ status: 'ERROR', error: (error as Error).message || 'An unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Use 500 for internal edge function errors
      }
    );
  }
});