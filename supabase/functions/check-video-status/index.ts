
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  request_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the request ID from the request body
    const { request_id }: RequestBody = await req.json();
    if (!request_id) {
      throw new Error('No request_id provided');
    }

    // First check the status
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    const statusResult = await statusResponse.json();
    console.log('Kling AI Status Response:', statusResult);

    if (!statusResponse.ok) {
      throw new Error(statusResult.error || 'Failed to check video status');
    }

    let status = 'processing';
    let videoUrl = null;

    if (statusResult.status === 'completed') {
      // Get the final result
      const resultResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
      });

      if (resultResponse.ok) {
        const result = await resultResponse.json();
        status = 'completed';
        videoUrl = result.video_url;
      } else {
        throw new Error('Failed to fetch completed video result');
      }
    } else if (statusResult.status === 'failed') {
      status = 'failed';
    }

    // Update the job status in our database
    const { error: updateError } = await supabaseClient.rpc(
      'update_video_generation_status',
      { 
        p_request_id: request_id,
        p_status: status,
        p_result_url: videoUrl
      }
    );

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        status,
        video_url: videoUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
