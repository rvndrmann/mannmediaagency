import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Function 'fal-image-to-video-submit' starting up.");

// Fal AI API endpoint
const FAL_API_URL = "https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video";

serve(async (req: Request) => {
  console.log(`Request received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ensure FAL_KEY is set in environment variables
    const falApiKey = Deno.env.get("FAL_KEY");
    if (!falApiKey) {
      console.error("FAL_KEY environment variable not set.");
      return new Response(JSON.stringify({ error: "Server configuration error: FAL_KEY missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("FAL_KEY found in environment.");

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log("Request body parsed:", body);
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(JSON.stringify({ error: "Invalid request body. Expecting JSON." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, image_url, duration, aspect_ratio, negative_prompt, cfg_scale } = body;

    // Basic input validation
    if (!prompt || !image_url) {
      console.error("Missing required fields: prompt or image_url");
      return new Response(JSON.stringify({ error: "Missing required fields: 'prompt' and 'image_url'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construct payload for Fal AI API
    const payload = {
      prompt,
      image_url,
      ...(duration && { duration }), // Include optional params if provided
      ...(aspect_ratio && { aspect_ratio }),
      ...(negative_prompt && { negative_prompt }),
      ...(cfg_scale && { cfg_scale }),
    };
    console.log("Constructed Fal AI payload:", payload);

    // Call Fal AI API
    console.log(`Sending request to Fal AI: ${FAL_API_URL}`);
    const falResponse = await fetch(FAL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`Fal AI response status: ${falResponse.status}`);
    const falResult = await falResponse.json();
    console.log("Fal AI response body:", falResult);

    if (!falResponse.ok) {
      console.error("Fal AI API request failed:", falResult);
      return new Response(JSON.stringify({ error: "Fal AI API request failed.", details: falResult }), {
        status: falResponse.status, // Forward Fal AI's status code
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract request_id (assuming it's directly in the response body)
    // Adjust this based on the actual Fal AI response structure if needed
    const requestId = falResult?.request_id;

    if (!requestId) {
        console.error("Could not find 'request_id' in Fal AI response:", falResult);
        return new Response(JSON.stringify({ error: "Failed to get request_id from Fal AI.", details: falResult }), {
            status: 500, // Internal Server Error, as we expected a request_id
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log(`Successfully submitted job to Fal AI. Request ID: ${requestId}`);

    // Return the request_id to the client
    return new Response(JSON.stringify({ request_id: requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 202, // Accepted: Request accepted, processing started
    });

  } catch (error) {
    console.error("Unhandled error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: "Internal server error.", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});