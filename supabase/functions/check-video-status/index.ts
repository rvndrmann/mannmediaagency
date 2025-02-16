
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

    const { request_id }: RequestBody = await req.json();
    if (!request_id) {
      throw new Error('No request_id provided');
    }

    console.log(`Checking status for request_id: ${request_id}`);

    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to fetch status');
    }

    const statusResult = await statusResponse.json();
    console.log('Status response:', statusResult);

    let status = 'processing';
    let progress = 0;

    if (statusResult.status === 'processing') {
      // Calculate progress based on time
      const { data: currentJob } = await supabaseClient
        .from('video_generation_jobs')
        .select('created_at')
        .eq('request_id', request_id)
        .single();

      if (currentJob) {
        const createdAt = new Date(currentJob.created_at);
        const elapsedMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
        
        if (elapsedMinutes <= 2) {
          progress = Math.min(Math.round((elapsedMinutes / 2) * 30), 30);
        } else if (elapsedMinutes <= 5) {
          progress = Math.min(30 + Math.round(((elapsedMinutes - 2) / 3) * 40), 70);
        } else {
          progress = Math.min(70 + Math.round(((elapsedMinutes - 5) / 2) * 29), 99);
        }
      }
    } else if (statusResult.status === 'completed') {
      status = 'completed';
      progress = 100;
    } else if (statusResult.status === 'failed') {
      status = 'failed';
      progress = 0;
    }

    // Update the job status
    const { error: updateError } = await supabaseClient
      .from('video_generation_jobs')
      .update({ 
        status,
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('request_id', request_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ status, progress }),
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
