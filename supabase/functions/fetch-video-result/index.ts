
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface FalVideoStatus {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

interface FalVideoResult {
  status: string;
  result?: {
    url: string;
  };
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

const checkVideoStatus = async (requestId: string, falApiKey: string): Promise<FalVideoStatus> => {
  const statusUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}/status`;
  logWithTimestamp(`Checking video status for request ${requestId}`, { url: statusUrl });

  const response = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Key ${falApiKey}`,
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logWithTimestamp('Status check failed', { error: errorText });
    throw new Error(`Failed to check status: ${errorText}`);
  }

  const statusResult = await response.json();
  logWithTimestamp('Status check response', statusResult);
  return statusResult;
};

const getVideoResult = async (requestId: string, falApiKey: string): Promise<FalVideoResult> => {
  const resultUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`;
  logWithTimestamp(`Fetching video result for request ${requestId}`, { url: resultUrl });

  const response = await fetch(resultUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Key ${falApiKey}`,
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logWithTimestamp('Result fetch failed', { error: errorText });
    throw new Error(`Failed to fetch result: ${errorText}`);
  }

  const result = await response.json();
  logWithTimestamp('Result fetch response', result);
  return result;
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

    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured');
    }

    // First, check the status
    const statusResult = await checkVideoStatus(request_id, falApiKey);
    logWithTimestamp('Status result', statusResult);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Map Fal AI status to our status
    let status = 
      statusResult.status === 'completed' ? 'completed' :
      statusResult.status === 'failed' ? 'failed' :
      statusResult.status === 'processing' ? 'processing' : 'pending';

    // If completed, fetch the final result
    if (status === 'completed') {
      const result = await getVideoResult(request_id, falApiKey);
      
      if (result.result?.url) {
        logWithTimestamp('Video completed, updating with result URL');
        
        const { error: updateError } = await supabaseClient
          .from('video_generation_jobs')
          .update({ 
            status: 'completed',
            progress: 100,
            result_url: result.result.url,
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
            result_url: result.result.url,
            progress: 100
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Still processing or pending
    if (status === 'processing' || status === 'pending') {
      logWithTimestamp('Video still processing', { progress: statusResult.progress });
      
      if (typeof statusResult.progress === 'number') {
        const { error: updateError } = await supabaseClient
          .from('video_generation_jobs')
          .update({ 
            status: status,
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
          status: status,
          progress: statusResult.progress || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(statusResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
