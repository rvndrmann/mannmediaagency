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

    const { data: currentJob, error: dbError } = await supabaseClient
      .from('video_generation_jobs')
      .select('*')
      .eq('request_id', request_id)
      .single();

    if (dbError) {
      console.error('Error fetching job from database:', dbError);
      throw dbError;
    }

    if (!currentJob) {
      throw new Error(`No job found with request_id: ${request_id}`);
    }

    const createdAt = new Date(currentJob.created_at);
    const elapsedMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
    
    console.log(`Current job status: ${currentJob.status}, elapsed time: ${elapsedMinutes.toFixed(2)} minutes`);

    // Always try to get the result first
    try {
      const resultResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
      });

      if (resultResponse.ok) {
        const result = await resultResponse.json();
        console.log('Result response:', result);

        if (result.video_url) {
          // We have a video! Update and return immediately
          const { error: updateError } = await supabaseClient
            .from('video_generation_jobs')
            .update({ 
              status: 'completed',
              progress: 100,
              result_url: result.video_url,
              updated_at: new Date().toISOString()
            })
            .eq('request_id', request_id);

          if (updateError) throw updateError;

          return new Response(
            JSON.stringify({ 
              status: 'completed',
              progress: 100,
              video_url: result.video_url
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (error) {
      console.error('Error retrieving video result:', error);
    }

    // If we get here, we didn't get a video result, so check status
    let status = currentJob.status;
    let progress = currentJob.progress || 0;

    try {
      const statusResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
          'Content-Type': 'application/json'
        },
      });

      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        console.log('Status response:', statusResult);

        if (statusResult.status === 'processing') {
          status = 'processing';
          // Calculate progress based on elapsed time
          if (elapsedMinutes <= 2) {
            progress = Math.min(Math.round((elapsedMinutes / 2) * 30), 30); // 0-30%
          } else if (elapsedMinutes <= 5) {
            progress = Math.min(30 + Math.round(((elapsedMinutes - 2) / 3) * 40), 70); // 30-70%
          } else {
            progress = Math.min(70 + Math.round(((elapsedMinutes - 5) / 2) * 29), 99); // 70-99%
          }
        } else if (statusResult.status === 'failed') {
          if (elapsedMinutes < 30) {
            // Keep as processing if under 30 minutes
            status = 'processing';
            progress = Math.min(Math.round((elapsedMinutes / 30) * 99), 99);
          } else {
            status = 'failed';
            progress = 0;
          }
        }
      }
    } catch (error) {
      console.error('Error checking video status:', error);
      
      // Handle timeouts based on elapsed time
      if (elapsedMinutes > 30) {
        status = 'failed';
        progress = 0;
      }
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

    console.log('Successfully updated database with status:', {
      status,
      progress
    });

    return new Response(
      JSON.stringify({ 
        status,
        progress,
        video_url: currentJob.result_url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
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
