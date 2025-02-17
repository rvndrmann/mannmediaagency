
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
  console.log(`[${new Date().toISOString()}] fetch-video-result function started`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'GET') {
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
      throw new Error('No request_id provided');
    }

    console.log(`Fetching result for request_id: ${request_id}`);

    const falApiUrl = `https://api.fal.ai/rest/v1/video/check/${request_id}`;
    const falApiKey = Deno.env.get('FAL_AI_API_KEY');

    if (!falApiKey) {
      console.error('FAL_AI_API_KEY is not configured');
      throw new Error('FAL_AI_API_KEY is not configured');
    }

    console.log('Calling Fal AI API...');
    const resultResponse = await fetch(falApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${falApiKey}`,
        'Content-Type': 'application/json',
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
    console.log('API Response:', JSON.stringify(result, null, 2));

    // Map Fal AI status to our status
    const status = 
      result.status === 'completed' ? 'completed' :
      result.status === 'failed' ? 'failed' :
      'processing';

    if (status === 'completed' && result.result?.url) {
      console.log('Video URL found:', result.result.url);
      
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
      console.log('Video generation failed');
      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (updateError) {
        console.error('Error updating job status to failed:', updateError);
        throw updateError;
      }

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
      console.log('Video still processing, progress:', result.progress);
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
    console.error(`Function error:`, error);
    
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
