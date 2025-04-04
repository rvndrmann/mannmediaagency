import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Function 'fal-image-to-video-result' starting up.");

// Base URL for Fal AI requests
const FAL_API_BASE_URL = "https://queue.fal.run/fal-ai/kling-video";

serve(async (req: Request) => {
  console.log(`Request received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  // Extract request_id from the URL path
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // Assuming URL structure like /fal-image-to-video-result/{request_id}
  // The last part should be the request_id
  const requestId = pathParts[pathParts.length - 1];

  if (!requestId) {
    console.error("Missing request_id in URL path.");
    return new Response(JSON.stringify({ error: "Missing 'request_id' in URL path." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  console.log(`Extracted request_id: ${requestId}`);

  try {
    // Ensure FAL_KEY is set
    const falApiKey = Deno.env.get("FAL_KEY");
    if (!falApiKey) {
      console.error("FAL_KEY environment variable not set.");
      return new Response(JSON.stringify({ error: "Server configuration error: FAL_KEY missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("FAL_KEY found in environment.");

    // Construct the URL to fetch the result
    const resultUrl = `${FAL_API_BASE_URL}/requests/${requestId}`;
    console.log(`Fetching result from Fal AI: ${resultUrl}`);

    // Fetch the result/status from Fal AI
    const falResponse = await fetch(resultUrl, {
      method: "GET",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`Fal AI response status: ${falResponse.status}`);
    const falResult = await falResponse.json();
    console.log("Fal AI response body:", falResult);

    if (!falResponse.ok) {
      // Handle potential errors like 404 Not Found if the ID is invalid
      console.error(`Fal AI API request failed (Status: ${falResponse.status}):`, falResult);
      // Check if it's a 422 for 'IN_PROGRESS' or similar, which isn't strictly an error for polling
      if (falResponse.status === 422 && falResult?.status === 'IN_PROGRESS') {
         console.log("Job is still in progress.");
         return new Response(JSON.stringify({ status: "IN_PROGRESS" }), {
             status: 202, // Accepted, but not ready
             headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
      // Handle other errors
      return new Response(JSON.stringify({ error: "Fal AI API request failed.", details: falResult }), {
        status: falResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check the status within the response body
    // The structure might vary, adjust based on actual Fal API response
    // Common statuses: COMPLETED, FAILED, IN_PROGRESS, QUEUED
    const status = falResult?.status;

    if (status === "COMPLETED") {
      console.log("Job completed successfully.");
      // Extract the video URL - adjust path based on actual response schema
      const videoUrl = falResult?.response?.video?.url;
      if (!videoUrl) {
          console.error("Could not find video URL in completed job response:", falResult);
          return new Response(JSON.stringify({ error: "Job completed but video URL not found.", details: falResult }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }
      console.log(`Video URL found: ${videoUrl}`);
      return new Response(JSON.stringify({ status: "COMPLETED", video_url: videoUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // OK
      });
    } else if (status === "FAILED") {
        console.error("Job failed:", falResult);
        return new Response(JSON.stringify({ status: "FAILED", error: "Job processing failed at Fal AI.", details: falResult }), {
            status: 500, // Or maybe map Fal's error code if available
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } else {
      // Handle other statuses like IN_PROGRESS, QUEUED etc.
      console.log(`Job status: ${status || 'Unknown'}. Not yet complete.`);
      return new Response(JSON.stringify({ status: status || "UNKNOWN" }), {
        status: 202, // Accepted, processing ongoing
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Unhandled error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: "Internal server error.", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});