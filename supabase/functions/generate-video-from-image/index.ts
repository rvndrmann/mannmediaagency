
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  prompt: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  image_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user ID from the authorization header
    const authHeader = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the JWT and get the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: RequestBody = await req.json();
    const { prompt, negative_prompt, num_inference_steps, guidance_scale, image_url } = requestData;

    // Submit request to FAL.AI
    const response = await fetch('https://queue.fal.run/fal-ai/ltx-video/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negative_prompt || "low quality, worst quality, deformed, distorted, disfigured, motion smear, motion artifacts, fused fingers, bad anatomy, weird hand, ugly",
        num_inference_steps: num_inference_steps || 30,
        guidance_scale: guidance_scale || 3,
        image_url,
      }),
    });

    const jsonResponse = await response.json();
    console.log('FAL.AI Response:', jsonResponse);

    if (!response.ok) {
      throw new Error(jsonResponse.error || 'Failed to submit video generation request');
    }

    // Create job record in database with user_id
    const { data: job, error: insertError } = await supabaseClient
      .from('video_generation_jobs')
      .insert({
        user_id: user.id, // Add user_id here
        prompt,
        negative_prompt,
        source_image_url: image_url,
        request_id: jsonResponse.request_id,
        settings: {
          num_inference_steps,
          guidance_scale,
        },
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError); // Add error logging
      throw insertError;
    }

    // Start polling for results
    return new Response(
      JSON.stringify({ 
        message: 'Video generation started',
        jobId: job.id,
        requestId: jsonResponse.request_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
