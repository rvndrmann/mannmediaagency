
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface FalVideoResponse {
  video?: {
    url: string;
  };
}

serve(async (req) => {
  // Log the start of function execution with timestamp
  const startTime = new Date().toISOString();
  console.log(`[${startTime}] fetch-video-result function started`);
  console.log('Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only allow GET requests
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
    console.log('Initializing Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request_id from URL parameters
    const url = new URL(req.url);
    const request_id = url.searchParams.get('request_id');
    
    if (!request_id) {
      console.error('No request_id provided in URL parameters');
      throw new Error('No request_id provided');
    }

    console.log(`[${new Date().toISOString()}] Fetching result for request_id: ${request_id}`);
    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    console.log('FAL API Key available:', !!falApiKey, 'Length:', falApiKey?.length);

    const falApiUrl = `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`;
    console.log('Calling FAL API URL:', falApiUrl);

    const resultResponse = await fetch(falApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('FAL API Response status:', resultResponse.status);
    console.log('FAL API Response headers:', Object.fromEntries(resultResponse.headers.entries()));

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      console.error('Failed to fetch result, response:', errorText);
      throw new Error(`Failed to fetch result: ${errorText}`);
    }

    const result: FalVideoResponse = await resultResponse.json();
    console.log('FAL API Response body:', JSON.stringify(result, null, 2));

    if (result.video?.url) {
      console.log('Video URL found:', result.video.url);
      console.log('Updating job with result URL...');
      
      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'completed',
          progress: 100,
          result_url: result.video.url,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', request_id);

      if (updateError) {
        console.error('Error updating job:', updateError);
        throw updateError;
      }

      console.log('Successfully updated job with result URL');
      return new Response(
        JSON.stringify({ 
          status: 'completed', 
          video_url: result.video.url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No video URL found in response, still processing');
    return new Response(
      JSON.stringify({ status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[${new Date().toISOString()}] Function error:`, errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
