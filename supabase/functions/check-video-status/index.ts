
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

// Increased polling duration for video generation
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLLS = 100; // ~8.3 minutes total (100 * 5 seconds)

serve(async (req) => {
  const startTime = new Date().toISOString();
  console.log(`[${startTime}] check-video-status function started`);
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

    console.log(`[${new Date().toISOString()}] Checking status for request_id: ${request_id}`);
    const falApiKey = Deno.env.get('FAL_AI_API_KEY');
    console.log('FAL API Key available:', !!falApiKey, 'Length:', falApiKey?.length);

    let pollCount = 0;

    // Get the job creation time to calculate elapsed time
    const { data: job } = await supabaseClient
      .from('video_generation_jobs')
      .select('created_at')
      .eq('request_id', request_id)
      .single();

    const createdAt = job?.created_at ? new Date(job.created_at) : new Date();
    const now = new Date();
    const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    while (pollCount < MAX_POLLS) {
      console.log(`Polling attempt ${pollCount + 1}/${MAX_POLLS}`);
      
      // Step 1: Check status
      const statusResponse = await fetch(
        `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Key ${falApiKey}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Failed to fetch status, response:', errorText);
        throw new Error(`Failed to fetch status: ${errorText}`);
      }

      const statusResult = await statusResponse.json();
      console.log('Status result:', statusResult);

      let status = 'processing';
      let progress = 0;
      
      // Calculate progress based on elapsed time (7-minute expected duration)
      progress = Math.min(Math.round((elapsedMinutes / 7) * 100), 99);

      if (statusResult.status === 'completed') {
        status = 'completed';
        progress = 100;
        
        console.log('Status is completed, fetching final result...');
        const resultResponse = await fetch(
          `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`,
          {
            headers: {
              'Authorization': `Key ${falApiKey}`
            }
          }
        );

        if (!resultResponse.ok) {
          throw new Error(`Failed to get result: ${await resultResponse.text()}`);
        }

        const result = await resultResponse.json();
        
        if (result.video?.url) {
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
            console.error('Error updating job with result:', updateError);
            throw updateError;
          }

          console.log('Successfully updated job with result URL');
          return new Response(
            JSON.stringify({ 
              status: 'completed', 
              progress: 100,
              video_url: result.video.url 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      } else if (statusResult.status === 'failed') {
        status = 'failed';
        const { error: updateError } = await supabaseClient
          .from('video_generation_jobs')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('request_id', request_id);

        if (updateError) {
          console.error('Error updating failed status:', updateError);
        }
        throw new Error('Video generation failed');
      } else {
        // Update progress in database
        const { error: updateError } = await supabaseClient
          .from('video_generation_jobs')
          .update({ 
            status,
            progress,
            updated_at: new Date().toISOString()
          })
          .eq('request_id', request_id);

        if (updateError) {
          console.error('Error updating job progress:', updateError);
          throw updateError;
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      pollCount++;
    }

    // Instead of throwing an error on timeout, return current progress
    const { data: currentJob } = await supabaseClient
      .from('video_generation_jobs')
      .select('progress, status')
      .eq('request_id', request_id)
      .single();

    console.log('Polling cycle completed, returning current progress:', currentJob);
    return new Response(
      JSON.stringify({ 
        status: currentJob?.status || 'processing', 
        progress: currentJob?.progress || 99,
        message: 'Video generation in progress. This typically takes 7 minutes.'
      }),
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
