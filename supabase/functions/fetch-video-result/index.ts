
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

serve(async (req) => {
  const logWithTimestamp = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(`[${timestamp}] Data:`, JSON.stringify(data, null, 2));
    }
  };

  logWithTimestamp('fetch-video-result function started');
  
  if (req.method === 'OPTIONS') {
    logWithTimestamp('Handling OPTIONS request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'GET') {
    logWithTimestamp('Invalid method received', { method: req.method });
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const request_id = url.searchParams.get('request_id');
    
    if (!request_id) {
      logWithTimestamp('No request_id provided');
      throw new Error('No request_id provided');
    }

    logWithTimestamp('Processing request', { request_id });

    const falApiUrl = `https://api.fal.ai/rest/v1/video/check/${request_id}`;
    const falApiKey = Deno.env.get('FAL_AI_API_KEY');

    if (!falApiKey) {
      logWithTimestamp('FAL_AI_API_KEY not configured');
      throw new Error('FAL_AI_API_KEY is not configured');
    }

    logWithTimestamp('Calling Fal AI API', { url: falApiUrl });
    const resultResponse = await fetch(falApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${falApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });

    logWithTimestamp('API Response received', { 
      status: resultResponse.status,
      statusText: resultResponse.statusText,
      headers: Object.fromEntries(resultResponse.headers)
    });

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      logWithTimestamp('API request failed', { 
        status: resultResponse.status,
        error: errorText 
      });
      throw new Error(`Failed to fetch result: ${errorText}`);
    }

    const result: FalVideoResponse = await resultResponse.json();
    logWithTimestamp('API Response parsed', result);

    // Map Fal AI status to our status
    const status = 
      result.status === 'completed' ? 'completed' :
      result.status === 'failed' ? 'failed' :
      'processing';

    logWithTimestamp('Mapped status', { originalStatus: result.status, mappedStatus: status });

    if (status === 'completed' && result.result?.url) {
      logWithTimestamp('Video completed', { 
        status,
        videoUrl: result.result.url
      });
      
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
        logWithTimestamp('Error updating job status', updateError);
        throw updateError;
      }

      logWithTimestamp('Successfully updated job to completed');

      return new Response(
        JSON.stringify({ 
          status: 'completed', 
          video_url: result.result.url 
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
      logWithTimestamp('Video generation failed', { error: result.error });
      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (updateError) {
        logWithTimestamp('Error updating job status to failed', updateError);
        throw updateError;
      }

      logWithTimestamp('Successfully updated job to failed status');

      return new Response(
        JSON.stringify({ 
          status: 'failed',
          error: result.error || 'Video generation failed'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // If still processing, update the progress
    if (status === 'processing' && typeof result.progress === 'number') {
      logWithTimestamp('Video still processing', { 
        status,
        progress: result.progress 
      });

      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'processing',
          progress: result.progress,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (updateError) {
        logWithTimestamp('Error updating progress', updateError);
      } else {
        logWithTimestamp('Successfully updated progress');
      }
    }

    logWithTimestamp('Returning processing status', { 
      status,
      progress: result.progress || 0 
    });

    return new Response(
      JSON.stringify({ 
        status: 'processing',
        progress: result.progress || 0
      }),
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
