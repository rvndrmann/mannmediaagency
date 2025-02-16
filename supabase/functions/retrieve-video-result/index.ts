
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the request body
    const { request_id }: RequestBody = await req.json();
    if (!request_id) {
      throw new Error('No request_id provided');
    }

    console.log(`Retrieving video result for request_id: ${request_id}`);

    // Get the final result using the GET endpoint
    const resultResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
    });

    if (!resultResponse.ok) {
      throw new Error(`Failed to fetch result: ${resultResponse.statusText}`);
    }

    const result = await resultResponse.json();
    console.log('Final result response:', result);

    if (!result.video_url) {
      throw new Error('No video URL in result');
    }

    // Update the job status in our database
    const { error: updateError } = await supabaseClient
      .from('video_generation_jobs')
      .update({ 
        status: 'completed',
        result_url: result.video_url,
        progress: 100,
        updated_at: new Date().toISOString()
      })
      .eq('request_id', request_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Successfully updated database with video result');

    return new Response(
      JSON.stringify({ 
        status: 'completed',
        video_url: result.video_url,
        progress: 100
      }),
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
