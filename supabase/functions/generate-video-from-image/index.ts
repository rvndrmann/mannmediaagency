
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

const MAX_POLLS = 20;
const POLL_INTERVAL = 60000; // 1 minute in milliseconds

const checkImageExists = async (url: string): Promise<boolean> => {
  try {
    logWithTimestamp(`Checking image accessibility for URL: ${url}`);
    
    // Encode the URL properly
    const encodedUrl = encodeURI(url);
    
    const response = await fetch(encodedUrl, {
      method: 'HEAD',
      headers: {
        'Accept': 'image/*'
      }
    });

    if (!response.ok) {
      logWithTimestamp(`Image accessibility check failed with status: ${response.status}`);
      return false;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      logWithTimestamp(`Invalid content type: ${contentType}`);
      return false;
    }

    return true;
  } catch (error) {
    logWithTimestamp(`Error checking image existence:`, error);
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
  });

  return schema.parse(body);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const checkVideoStatus = async (requestId: string, falApiKey: string) => {
  const statusUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}/status`;
  const response = await fetch(statusUrl, {
    headers: { 'Authorization': `Key ${falApiKey}` }
  });
  return response.json();
};

const getVideoResult = async (requestId: string, falApiKey: string) => {
  const resultUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`;
  const response = await fetch(resultUrl, {
    headers: { 'Authorization': `Key ${falApiKey}` }
  });
  return response.json();
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
    logWithTimestamp('Request data:', requestData);

    const validatedBody = validateBody(requestData);
    logWithTimestamp('Validated body:', validatedBody);

    // Check if the image URL is from Supabase storage
    if (validatedBody.image_url.includes('supabase.co/storage/v1/object/public')) {
      // For Supabase storage URLs, we skip the accessibility check as they're already validated
      logWithTimestamp('Supabase storage URL detected, skipping accessibility check');
    } else {
      // For external URLs, we perform the accessibility check
      if (!(await checkImageExists(validatedBody.image_url))) {
        throw new Error('Source image is not accessible. Please ensure the image URL is valid and publicly accessible.');
      }
    }

    const FAL_API_KEY = Deno.env.get('FAL_AI_API_KEY');
    if (!FAL_API_KEY) {
      throw new Error('FAL AI API key not configured');
    }

    // Initial request to start video generation
    logWithTimestamp('Making initial request to FAL AI API');
    const initialResponse = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: validatedBody.prompt,
        image_url: validatedBody.image_url,
        negative_prompt: validatedBody.negative_prompt,
      })
    });

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      logWithTimestamp('FAL AI API error:', errorText);
      throw new Error(`FAL AI API error: ${errorText}`);
    }

    const initialData = await initialResponse.json();
    const requestId = initialData.request_id;

    if (!requestId) {
      throw new Error('No request ID received from FAL AI');
    }

    // Create initial job record
    const { data: videoData, error: insertError } = await supabaseClient
      .from('video_generation_jobs')
      .insert({
        prompt: validatedBody.prompt,
        source_image_url: validatedBody.image_url,
        request_id: requestId,
        status: 'processing',
        duration: validatedBody.duration || "5",
        aspect_ratio: validatedBody.aspect_ratio || "16:9",
        file_name: `video_${Date.now()}.mp4`,
        negative_prompt: validatedBody.negative_prompt,
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Active polling loop
    let resultUrl: string | undefined;
    let errorMessage: string | undefined;
    
    for (let i = 0; i < MAX_POLLS; i++) {
      logWithTimestamp(`Polling attempt ${i + 1} of ${MAX_POLLS}`);
      
      const statusResponse = await checkVideoStatus(requestId, FAL_API_KEY);
      console.log('Status response:', statusResponse);

      if (statusResponse.status === 'failed') {
        errorMessage = statusResponse.error || 'Video generation failed';
        break;
      }

      if (statusResponse.status === 'completed') {
        const result = await getVideoResult(requestId, FAL_API_KEY);
        resultUrl = result.video_url;
        break;
      }

      // Update progress in database
      const progress = Math.min(95, Math.round((i / MAX_POLLS) * 100));
      await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoData.id);

      if (i < MAX_POLLS - 1) {
        await sleep(POLL_INTERVAL);
      }
    }

    // Final status update
    const finalStatus = resultUrl ? 'completed' : 'failed';
    const finalUpdate = {
      status: finalStatus,
      result_url: resultUrl,
      error_message: errorMessage,
      progress: finalStatus === 'completed' ? 100 : undefined,
      updated_at: new Date().toISOString()
    };

    await supabaseClient
      .from('video_generation_jobs')
      .update(finalUpdate)
      .eq('id', videoData.id);

    return new Response(
      JSON.stringify({ 
        message: finalStatus === 'completed' ? 'Video generation completed' : 'Video generation failed',
        data: {
          ...videoData,
          ...finalUpdate
        }
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
        error: error instanceof Error ? error.message : 'An unknown error occurred'
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
