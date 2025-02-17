
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface FalVideoResponse {
  status: string;
  result?: {
    url: string;
  };
  error?: string;
  progress?: number;
}

// Utility function for logging with timestamp
const logWithTimestamp = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] Data:`, JSON.stringify(data, null, 2));
  }
};

serve(async (req) => {
  logWithTimestamp('fetch-video-result function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const { request_id } = await req.json();
    
    if (!request_id) {
      throw new Error('No request_id provided');
    }

    logWithTimestamp('Checking status for request_id:', { request_id });

    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured');
    }

    // Step 1: Check Status
    const statusUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`;
    logWithTimestamp('Checking video status', { url: statusUrl });

    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Accept': 'application/json'
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      logWithTimestamp('Status check failed', { error: errorText });
      throw new Error(`Failed to check status: ${errorText}`);
    }

    const statusResult: FalVideoResponse = await statusResponse.json();
    logWithTimestamp('Status check response', statusResult);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Map Fal AI status to our status
    const status = 
      statusResult.status === 'completed' ? 'completed' :
      statusResult.status === 'failed' ? 'failed' :
      'processing';

    // Step 2: Handle Status Result
    if (status === 'completed' && statusResult.result?.url) {
      logWithTimestamp('Video completed, updating with result URL');
      
      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'completed',
          progress: 100,
          result_url: statusResult.result.url,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (updateError) {
        logWithTimestamp('Error updating completed status', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          status: 'completed',
          result_url: statusResult.result.url,
          progress: 100
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } 
    
    if (status === 'failed') {
      logWithTimestamp('Video generation failed');
      
      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (updateError) {
        logWithTimestamp('Error updating failed status', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          status: 'failed',
          error: statusResult.error || 'Video generation failed'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Still processing
    if (status === 'processing') {
      logWithTimestamp('Video still processing', { progress: statusResult.progress });
      
      if (typeof statusResult.progress === 'number') {
        const { error: updateError } = await supabaseClient
          .from('video_generation_jobs')
          .update({ 
            status: 'processing',
            progress: statusResult.progress,
            updated_at: new Date().toISOString()
          })
          .eq('request_id', request_id);

        if (updateError) {
          logWithTimestamp('Error updating progress', updateError);
        }
      }

      return new Response(
        JSON.stringify({
          status: 'processing',
          progress: statusResult.progress || 0
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    return new Response(
      JSON.stringify(statusResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
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
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});
