
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DynamicMask {
  mask_url: string;
  trajectories: Array<{
    x: number;
    y: number;
  }>;
}

interface RequestBody {
  prompt: string;
  image_url: string;
  duration?: "5" | "10";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  tail_image_url?: string;
  static_mask_url?: string;
  dynamic_masks?: DynamicMask[];
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

    // Get the authenticated user's ID from the request
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      throw new Error('No auth token provided');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      prompt,
      image_url,
      duration = "5",
      aspect_ratio = "16:9",
      tail_image_url,
      static_mask_url,
      dynamic_masks,
    }: RequestBody = await req.json();

    // Validate required fields
    if (!prompt || !image_url) {
      throw new Error('Missing required fields: prompt and image_url are required');
    }

    // Submit request to FAL AI
    const response = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_url,
        duration,
        aspect_ratio,
        ...(tail_image_url && { tail_image_url }),
        ...(static_mask_url && { static_mask_url }),
        ...(dynamic_masks && { dynamic_masks }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('FAL AI Error:', error);
      throw new Error(error.error || 'Failed to submit video generation request');
    }

    const result = await response.json();
    console.log('FAL AI Response:', result);

    // Create job record in database
    const { data: job, error: insertError } = await supabaseClient
      .from('video_generation_jobs')
      .insert({
        user_id: user.id,
        prompt,
        source_image_url: image_url,
        request_id: result.request_id,
        status: 'processing',
        duration,
        aspect_ratio,
        settings: {
          tail_image_url,
          static_mask_url,
          dynamic_masks,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Video generation started',
        jobId: job.id,
        requestId: result.request_id
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
