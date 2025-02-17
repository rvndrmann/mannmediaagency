import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request_id } = await req.json();

    if (!request_id) {
      throw new Error('request_id is required');
    }

    console.log(`Checking status for request_id: ${request_id}`);

    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!statusResponse.ok) {
      console.error(`FAL API error: ${statusResponse.statusText}`);
      throw new Error(`Failed to check status: ${statusResponse.statusText}`);
    }

    const statusData = await statusResponse.json();
    console.log('FAL API status response:', statusData);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let newStatus = 'in_queue';
    let errorMessage = null;
    let progress = 0;
    let resultUrl = null;

    switch (statusData.status) {
      case 'COMPLETED':
        newStatus = 'completed';
        progress = 100;
        resultUrl = statusData.result?.url;
        break;
      case 'FAILED':
        errorMessage = statusData.error || 'Video generation failed';
        break;
      case 'IN_QUEUE':
      case 'PROCESSING':
        progress = statusData.status === 'PROCESSING' ? 50 : 25;
        break;
      default:
        console.log(`Unknown status from FAL API: ${statusData.status}`);
    }

    const { error: updateError } = await supabaseClient
      .from('video_generation_jobs')
      .update({
        status: newStatus,
        progress,
        error_message: errorMessage,
        result_url: resultUrl,
        last_checked_at: new Date().toISOString()
      })
      .eq('request_id', request_id);

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        progress,
        error_message: errorMessage,
        result_url: resultUrl
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
