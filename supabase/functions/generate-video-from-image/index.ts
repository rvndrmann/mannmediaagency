
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  prompt: string;
  image_url: string;
  duration?: string;
  aspect_ratio?: string;
  tail_image_url?: string;
  static_mask_url?: string;
  dynamic_masks?: Array<{
    mask_url: string;
    trajectories: Array<{ x: number; y: number }>;
  }>;
}

interface FalAIResponse {
  request_id: string;
  status?: string;
  error?: string;
}

// Utility function for logging with timestamp
const logWithTimestamp = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] Data:`, JSON.stringify(data, null, 2));
  }
};

// Validate the Fal AI response
const validateFalAIResponse = (response: any): FalAIResponse => {
  if (!response.request_id) {
    throw new Error('Invalid Fal AI response: missing request_id');
  }
  return response as FalAIResponse;
};

// Validate request body
const validateRequestBody = (body: any): RequestBody => {
  if (!body.prompt) {
    throw new Error('Missing required field: prompt');
  }
  if (!body.image_url) {
    throw new Error('Missing required field: image_url');
  }
  return body as RequestBody;
};

serve(async (req) => {
  // Log function invocation
  logWithTimestamp('generate-video-from-image function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured');
    }

    // Parse and validate request body
    const requestBody = await req.json();
    logWithTimestamp('Request body received', requestBody);
    const validatedBody = validateRequestBody(requestBody);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user information from auth header
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      throw new Error('No auth token provided');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader);
    if (authError || !user) {
      logWithTimestamp('Authentication error', authError);
      throw new Error('Unauthorized');
    }

    // Prepare request to Fal AI
    const falAIRequest = {
      prompt: validatedBody.prompt,
      image_url: validatedBody.image_url,
      ...(validatedBody.duration && { duration: validatedBody.duration }),
      ...(validatedBody.aspect_ratio && { aspect_ratio: validatedBody.aspect_ratio }),
      ...(validatedBody.tail_image_url && { tail_image_url: validatedBody.tail_image_url }),
      ...(validatedBody.static_mask_url && { static_mask_url: validatedBody.static_mask_url }),
      ...(validatedBody.dynamic_masks && { dynamic_masks: validatedBody.dynamic_masks }),
    };

    logWithTimestamp('Sending request to Fal AI', falAIRequest);

    // Make request to Fal AI
    const response = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falAIRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logWithTimestamp('Fal AI API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Fal AI API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    logWithTimestamp('Fal AI response received', result);

    // Validate Fal AI response
    const validatedResponse = validateFalAIResponse(result);

    // Create job record in database
    const { data: job, error: insertError } = await supabaseClient
      .from('video_generation_jobs')
      .insert({
        user_id: user.id,
        prompt: validatedBody.prompt,
        source_image_url: validatedBody.image_url,
        request_id: validatedResponse.request_id,
        status: 'pending',
        duration: validatedBody.duration || "5",
        aspect_ratio: validatedBody.aspect_ratio || "16:9",
        file_name: `video_${Date.now()}.mp4`,
        file_size: 0,
        content_type: 'video/mp4',
        negative_prompt: '',
        settings: {
          tail_image_url: validatedBody.tail_image_url,
          static_mask_url: validatedBody.static_mask_url,
          dynamic_masks: validatedBody.dynamic_masks,
        },
      })
      .select()
      .single();

    if (insertError) {
      logWithTimestamp('Database insert error', insertError);
      throw insertError;
    }

    logWithTimestamp('Job created successfully', job);

    return new Response(
      JSON.stringify({ 
        message: 'Video generation started',
        jobId: job.id,
        requestId: validatedResponse.request_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    logWithTimestamp('Function error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
