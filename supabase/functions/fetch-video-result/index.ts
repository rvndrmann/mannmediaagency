
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

serve(async (req) => {
  console.log('fetch-video-result function called');

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

    console.log(`Fetching result for request_id: ${request_id}`);

    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured');
    }

    // Using the queue.fal.run endpoint as specified
    const falApiUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`;
    console.log(`Calling Fal AI API: ${falApiUrl}`);

    const resultResponse = await fetch(falApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Accept': 'application/json'
      },
    });

    console.log('API Response status:', resultResponse.status);

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      console.error('Failed to fetch result:', errorText);
      throw new Error(`Failed to fetch result: ${errorText}`);
    }

    const result: FalVideoResponse = await resultResponse.json();
    console.log('API Response:', result);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Map Fal AI status to our status
    const status = 
      result.status === 'completed' ? 'completed' :
      result.status === 'failed' ? 'failed' :
      'processing';

    if (status === 'completed' && result.result?.url) {
      console.log('Video completed, updating database');
      
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
        console.error('Error updating job:', updateError);
        throw updateError;
      }
    } else if (status === 'failed') {
      console.log('Video generation failed, updating database');
      
      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (updateError) {
        console.error('Error updating job:', updateError);
        throw updateError;
      }
    } else if (status === 'processing' && typeof result.progress === 'number') {
      console.log('Video processing, updating progress');
      
      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'processing',
          progress: result.progress,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (updateError) {
        console.error('Error updating progress:', updateError);
      }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    
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
