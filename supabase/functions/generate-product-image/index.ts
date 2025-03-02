
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, image, imageSize, numInferenceSteps, guidanceScale, outputFormat } = await req.json();

    // Validate inputs
    const validImageSizes = [
      "square_hd",
      "square",
      "portrait_4_3",
      "portrait_16_9",
      "landscape_4_3",
      "landscape_16_9"
    ];

    // Validate the image size
    if (!validImageSizes.includes(imageSize)) {
      return new Response(
        JSON.stringify({
          error: `Invalid image size. Valid options are: ${validImageSizes.join(', ')}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if prompt is provided
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(
        JSON.stringify({ error: "A valid prompt is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check if image is provided
    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: "A valid base64 image is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate numInferenceSteps (1-20)
    const inferenceSteps = Number(numInferenceSteps);
    if (isNaN(inferenceSteps) || inferenceSteps < 1 || inferenceSteps > 20) {
      return new Response(
        JSON.stringify({ error: "Inference steps must be between 1 and 20" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate guidanceScale (1-7)
    const guidance = Number(guidanceScale);
    if (isNaN(guidance) || guidance < 1 || guidance > 7) {
      return new Response(
        JSON.stringify({ error: "Guidance scale must be between 1 and 7" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate outputFormat
    if (outputFormat !== 'png' && outputFormat !== 'jpg') {
      return new Response(
        JSON.stringify({ error: "Output format must be 'png' or 'jpg'" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from JWT token in the request
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Log that we're queuing the generation
    console.log("Status: IN_QUEUE");

    // For now, we're just mocking the generation process
    // In a real implementation, you would call your AI service here
    // For example:
    // const generatedImageUrl = await callAIService(prompt, image, imageSize, inferenceSteps, guidance, outputFormat);

    // Insert generation job record into database
    const { data: jobData, error: jobError } = await supabase
      .from('image_generation_jobs')
      .insert({
        user_id: userData.user.id,
        prompt,
        status: 'processing',
        settings: {
          imageSize,
          numInferenceSteps: inferenceSteps,
          guidanceScale: guidance,
          outputFormat
        }
      })
      .select();

    if (jobError) {
      console.error('DB error:', jobError);
      return new Response(
        JSON.stringify({ error: "Failed to record generation job" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // For demonstration purposes, return a success response
    return new Response(
      JSON.stringify({ 
        message: "Image generation job queued successfully",
        jobId: jobData[0].id,
        imageUrl: "https://example.com/generated-image.png" // This would be the real URL in production
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", details: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
