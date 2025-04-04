// supabase/functions/generate-voiceover/index.ts
/// <reference types="https://deno.land/x/deno/cli/types/dts/index.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; // Added Supabase client import
import { corsHeaders } from "../_shared/cors.ts";

interface VoiceConfig {
  voice: string;
  turn_prefix: string;
}

interface RequestPayload {
  dialogueText: string;
  voices: VoiceConfig[];
  sceneId: string; // Added sceneId
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: RequestPayload = await req.json();
    const { dialogueText, voices, sceneId } = payload; // Destructure sceneId

    // @ts-ignore Deno specific API
    const falKey = Deno.env.get("FAL_KEY");
    // @ts-ignore Deno specific API
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore Deno specific API
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!falKey) {
      console.error("FAL_KEY environment variable not set.");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Added check for Supabase env vars
    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable not set.");
        return new Response(JSON.stringify({ error: "Database connection not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Added validation for sceneId
    if (!dialogueText || !voices || voices.length === 0 || !sceneId) {
      return new Response(JSON.stringify({ error: "Missing required input: dialogueText, voices, or sceneId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    const falApiUrl = "https://queue.fal.run/fal-ai/playai/tts/dialog";

    const apiPayload = {
      input: dialogueText,
      voices: voices,
      response_format: "url", // Request URL format for easier handling
    };

    console.log("Sending request to Fal AI TTS API:", JSON.stringify(apiPayload));

    const response = await fetch(falApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Fal AI API request failed with status ${response.status}:`, errorBody);
      return new Response(JSON.stringify({ error: `Fal AI API error: ${response.statusText}`, details: errorBody }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const requestId = result.request_id; // Assuming the API returns { request_id: "..." }

    if (!requestId) {
        console.error("Fal AI API response did not contain request_id:", result);
        return new Response(JSON.stringify({ error: "Failed to get request_id from Fal AI API" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log("Fal AI TTS request submitted successfully. Request ID:", requestId);

    // Insert tracking record into Supabase
    try {
        const { error: insertError } = await supabaseAdmin
            .from('scene_voiceover_requests')
            .insert({
                scene_id: sceneId,
                fal_request_id: requestId,
                status: 'queued', // Initial status
            });

        if (insertError) {
            console.error("Error inserting voiceover request tracking record:", insertError);
            // Log the error but proceed, as the Fal job is already submitted.
            // The polling function might handle this case or fail if the record is missing.
        } else {
            console.log(`Successfully inserted tracking record for scene ${sceneId}, request ${requestId}`);
        }
    } catch (dbError) {
        console.error("Unexpected error during database insert:", dbError);
        // Also log and proceed
    }

    return new Response(JSON.stringify({ request_id: requestId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 202, // Accepted for processing
    });
  } catch (error) {
    console.error("Error processing request:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});