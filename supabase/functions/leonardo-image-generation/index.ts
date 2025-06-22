/// <reference types="https://esm.sh/v135/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Define the structure for ControlNet settings based on Leonardo.ai API docs
interface ControlNetSetting {
  initImageId?: string; // Required if using guidance
  initImageType?: 'UPLOADED' | 'GENERATED'; // Required if using guidance
  preprocessorId?: number; // Required for specific ControlNets (e.g., Style=67, Char=133, Edge=19)
  strengthType?: 'Low' | 'Mid' | 'High' | 'Ultra' | 'Max'; // For Style/Character Reference
  weight?: number; // For Character Reference (0-2) or other ControlNets (e.g., 0.5)
  influence?: number; // For multiple Style References (ratio)
  // Add other potential ControlNet params if needed
}

// Define the expected request body structure
interface RequestPayload {
  prompt: string;
  negative_prompt?: string;
  modelId?: string; // e.g., "aa77f04e-3eec-4034-9c07-d0f619684628" (Leonardo Kino XL)
  width?: number;
  height?: number;
  presetStyle?: 'CINEMATIC' | 'DYNAMIC' | 'VIBRANT' | 'NONE' | string; // Add others as needed
  photoReal?: boolean;
  photoRealVersion?: string; // e.g., "v2"
  alchemy?: boolean;
  // Image Guidance specific parameters
  image_guidance_settings?: {
    controlnets?: ControlNetSetting[];
    init_image_id?: string; // For Image-to-Image
    init_strength?: number; // For Image-to-Image (0-1)
  };
  // Add other Leonardo API params if needed (e.g., num_images, guidance_scale)
}

console.log("Leonardo Image Generation function started.");

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Ensure API key is set (User needs to set this in Supabase Function settings)
    const apiKey = Deno.env.get("LEONARDO_API_KEY");
    if (!apiKey) {
      console.error("LEONARDO_API_KEY environment variable not set.");
      return new Response(JSON.stringify({ error: "API key not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const payload: RequestPayload = await req.json();
    console.log("Received payload:", payload);

    // --- Basic Validation ---
    if (!payload.prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Add more validation as needed (e.g., for guidance settings if provided)

    // --- Construct Leonardo API Payload ---
    const leonardoPayload: any = {
      prompt: payload.prompt,
      negative_prompt: payload.negative_prompt,
      modelId: payload.modelId || "aa77f04e-3eec-4034-9c07-d0f619684628", // Default to Kino XL
      width: payload.width || 1024,
      height: payload.height || 576,
      presetStyle: payload.presetStyle || "CINEMATIC",
      photoReal: payload.photoReal === undefined ? true : payload.photoReal,
      photoRealVersion: payload.photoRealVersion || "v2",
      alchemy: payload.alchemy === undefined ? true : payload.alchemy,
      // Add other standard params here if needed
    };

    // Add image guidance parameters if present
    if (payload.image_guidance_settings) {
      if (payload.image_guidance_settings.controlnets) {
        leonardoPayload.controlnets = payload.image_guidance_settings.controlnets;
      }
      if (payload.image_guidance_settings.init_image_id) {
        leonardoPayload.init_image_id = payload.image_guidance_settings.init_image_id;
      }
      if (payload.image_guidance_settings.init_strength !== undefined) {
        leonardoPayload.init_strength = payload.image_guidance_settings.init_strength;
      }
    }

    console.log("Sending payload to Leonardo:", JSON.stringify(leonardoPayload, null, 2));

    // --- Call Leonardo API ---
    const response = await fetch("https://cloud.leonardo.ai/api/rest/v1/generations", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(leonardoPayload),
    });

    // --- Handle Leonardo Response ---
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Leonardo API Error:", responseData);
      return new Response(JSON.stringify({ error: "Leonardo API request failed.", details: responseData }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Leonardo API Success:", responseData);

    // Return the generation details (usually contains generationId)
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in Leonardo function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Reminder for the user:
// You need to set the LEONARDO_API_KEY environment variable in your Supabase project settings
// for this Edge Function (under Settings -> Edge Functions -> leonardo-image-generation).
