
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface RequestBody {
  request_id: string;
}

serve(async (req) => {
  // Log the start of function execution
  console.log('fetch-video-result function started');
  console.log('Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log('Initializing Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Received request body:', body);

    const { request_id }: RequestBody = body;
    if (!request_id) {
      console.error('No request_id provided in request body');
      throw new Error('No request_id provided');
    }

    console.log(`Fetching result for request_id: ${request_id}`);
    console.log('FAL API Key available:', !!Deno.env.get('FAL_AI_API_KEY'));

    const resultResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
    });

    console.log('Result response status:', resultResponse.status);
    if (!resultResponse.ok) {
      console.error('Failed to fetch result, response:', await resultResponse.text());
      throw new Error('Failed to fetch result');
    }

    const result = await resultResponse.json();
    console.log('Result response:', result);

    if (result.video_url) {
      console.log('Video URL found:', result.video_url);
      console.log('Updating job with result URL...');
      
      const { error: updateError } = await supabaseClient
        .from('video_generation_jobs')
        .update({ 
          status: 'completed',
          progress: 100,
          result_url: result.video_url,
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
          video_url: result.video_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('No video URL found yet, still processing');
    return new Response(
      JSON.stringify({ status: 'processing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
