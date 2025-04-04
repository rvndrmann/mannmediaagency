/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />
// supabase/functions/check-fal-voiceover-result/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "check-fal-voiceover-result" up and running!`)

const FAL_API_KEY = Deno.env.get('FAL_KEY');
const FAL_TTS_API_BASE = 'https://queue.fal.run/fal-ai/playai/tts/dialog';

interface RequestPayload {
  requestId: string;
}

interface FalStatusPayload {
  status: 'COMPLETED' | 'ERROR' | 'FAILED' | 'IN_PROGRESS' | 'IN_QUEUE';
  // Add other fields if needed based on actual status response
}

interface FalAudioResultPayload {
  request_id: string;
  status: 'COMPLETED'; // Expect COMPLETED when fetching result
  result?: {
    audio?: { url: string; content_type: string; }; // Reflects audio output schema
  };
  error?: any;
  logs?: any[];
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!FAL_API_KEY) {
    console.error("FAL_KEY environment variable not set!");
    return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const payload: RequestPayload = await req.json();
    const { requestId } = payload;

    if (!requestId) {
      return new Response(JSON.stringify({ error: "Missing required input: requestId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Checking status for Fal TTS request ID: ${requestId}`);
    const statusUrl = `${FAL_TTS_API_BASE}/requests/${requestId}/status`;
    let falStatus: FalStatusPayload['status'] | null = null;
    let statusCheckError: string | null = null;
    let audioUrl: string | null = null;
    let errorMessage: string | null = null;

    // 1. Check Status
    try {
      const statusResponse = await fetch(statusUrl, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } });
      if (!statusResponse.ok) {
        const errorBody = await statusResponse.text();
        throw new Error(`Status check failed: ${statusResponse.status} ${errorBody}`);
      }
      const statusResult: FalStatusPayload = await statusResponse.json();
      falStatus = statusResult.status;
      console.log(`Status for request ${requestId}: ${falStatus}`);
    } catch (err) {
      console.error(`Error checking status for request ${requestId}:`, err);
      statusCheckError = err instanceof Error ? err.message : String(err);
      errorMessage = `Failed to check status: ${statusCheckError}`;
    }

    // 2. Fetch Result if Completed
    if (falStatus === 'COMPLETED') {
      console.log(`Request ${requestId} completed. Fetching result...`);
      try {
        const resultUrl = `${FAL_TTS_API_BASE}/requests/${requestId}`;
        const resultResponse = await fetch(resultUrl, { headers: { 'Authorization': `Key ${FAL_API_KEY}` } });
        if (!resultResponse.ok) {
          const errorBody = await resultResponse.text();
          throw new Error(`Result fetch failed: ${resultResponse.status} ${errorBody}`);
        }
        const resultPayload: FalAudioResultPayload = await resultResponse.json();

        if (resultPayload.result?.audio?.url) {
          audioUrl = resultPayload.result.audio.url;
          console.log(`Successfully fetched audio URL for request ${requestId}: ${audioUrl}`);
        } else {
          console.warn(`Request ${requestId} COMPLETED but result payload missing audio URL:`, resultPayload);
          falStatus = 'FAILED'; // Treat as failed if result format is wrong
          errorMessage = 'Completed but result format unexpected (missing audio URL).';
        }
      } catch (err) {
        console.error(`Error fetching result for completed request ${requestId}:`, err);
        falStatus = 'FAILED'; // Treat as failed if result fetch fails
        errorMessage = `Failed to fetch result after completion: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else if (falStatus === 'ERROR' || falStatus === 'FAILED') {
        errorMessage = `Fal AI processing failed with status: ${falStatus}`;
    } else if (statusCheckError) {
        // Keep status as null or undefined if status check failed
        falStatus = null;
    }

    // 3. Return Response
    return new Response(JSON.stringify({
        status: falStatus, // COMPLETED, FAILED, ERROR, IN_PROGRESS, IN_QUEUE, or null if status check failed
        audioUrl: audioUrl, // URL if completed successfully
        error: errorMessage // Error message if applicable
    }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Critical error in check-fal-voiceover-result function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})