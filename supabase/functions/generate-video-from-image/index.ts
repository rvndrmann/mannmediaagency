
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logWithTimestamp = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

const checkImageExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking image existence:', error);
    return false;
  }
};

const validateBody = (body: any) => {
  const schema = z.object({
    image_url: z.string().url(),
    prompt: z.string().min(1),
    duration: z.string().optional(),
    aspect_ratio: z.string().optional(),
    negative_prompt: z.string().optional(),
    static_mask_url: z.string().url().optional(),
    tail_image_url: z.string().url().optional(),
    dynamic_masks: z.array(z.object({
      prompt: z.string(),
      url: z.string().url()
    })).optional()
  });

  return schema.parse(body);
};

const validateApiResponse = (response: any) => {
  const schema = z.object({
    request_id: z.string(),
    status: z.string()
  });

  return schema.parse(response);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) 
    return String(error.message);
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
};

serve(async (req) => {
  logWithTimestamp('generate-video-from-image function called');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData = await req.json();
    const validatedBody = validateBody(requestData);

    // Verify the image exists and is accessible
    if (!(await checkImageExists(validatedBody.image_url))) {
      throw new Error('Source image is not accessible');
    }

    if (validatedBody.tail_image_url && !(await checkImageExists(validatedBody.tail_image_url))) {
      throw new Error('Tail image is not accessible');
    }

    if (validatedBody.static_mask_url && !(await checkImageExists(validatedBody.static_mask_url))) {
      throw new Error('Static mask image is not accessible');
    }

    if (validatedBody.dynamic_masks) {
      for (const mask of validatedBody.dynamic_masks) {
        if (!(await checkImageExists(mask.url))) {
          throw new Error(`Dynamic mask image is not accessible: ${mask.url}`);
        }
      }
    }

    const FAL_API_KEY = Deno.env.get('FAL_AI_API_KEY');
    if (!FAL_API_KEY) {
      throw new Error('FAL AI API key not configured');
    }

    logWithTimestamp('Making request to FAL AI API');
    const response = await fetch('https://110602490-video-to-video-stable.gateway.alpha.fal.ai/video_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: validatedBody.image_url,
        prompt: validatedBody.prompt,
        negative_prompt: validatedBody.negative_prompt,
        duration: validatedBody.duration || "5",
        aspect_ratio: validatedBody.aspect_ratio || "16:9",
        static_mask_url: validatedBody.static_mask_url,
        tail_image_url: validatedBody.tail_image_url,
        dynamic_masks: validatedBody.dynamic_masks
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FAL AI API error: ${errorText}`);
    }

    const responseData = await response.json();
    logWithTimestamp('FAL AI API response:', responseData);

    const validatedResponse = validateApiResponse(responseData);
    
    // Insert the job into the database
    const { data: videoData, error: insertError } = await supabaseClient
      .from('video_generation_jobs')
      .insert({
        prompt: validatedBody.prompt,
        source_image_url: validatedBody.image_url,
        request_id: validatedResponse.request_id,
        status: 'in_queue',
        duration: validatedBody.duration || "5",
        aspect_ratio: validatedBody.aspect_ratio || "16:9",
        file_name: `video_${Date.now()}.mp4`,
        negative_prompt: validatedBody.negative_prompt,
        settings: {
          negative_prompt: validatedBody.negative_prompt,
          static_mask_url: validatedBody.static_mask_url,
          tail_image_url: validatedBody.tail_image_url,
          dynamic_masks: validatedBody.dynamic_masks,
        }
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Video generation started',
        data: videoData
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    logWithTimestamp('Error:', error);
    
    return new Response(
      JSON.stringify({
        error: getErrorMessage(error)
      }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

