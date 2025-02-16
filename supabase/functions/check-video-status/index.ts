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

    console.log(`Checking status for request_id: ${request_id}`);

    // Get the current job status from our database
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

    console.log(`Current job status: ${currentJob.status}, progress: ${currentJob.progress || 0}`);

    // First, try to get the video result directly
    let videoUrl = currentJob.result_url;
    let status = currentJob.status;
    let progress = currentJob.progress || 0;
    
    try {
      // Try to get the result first, regardless of status
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
          videoUrl = result.video_url;
          status = 'completed';
          progress = 100;
          console.log('Retrieved video URL successfully:', videoUrl);
        }
      }
    } catch (error) {
      console.error('Error retrieving video result:', error);
      // Don't throw here, continue with status check
    }

    // If we didn't get a video URL, check the status
    if (!videoUrl) {
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
            progress = Math.min(Math.round((statusResult.progress || 0) * 100), 99);
          } else if (statusResult.status === 'failed') {
            // Even if status is failed, keep the video URL if we have one
            status = videoUrl ? 'completed' : 'failed';
            progress = videoUrl ? 100 : 0;
          }
        } else {
          const errorText = await statusResponse.text();
          console.error('Status check failed:', errorText);
          
          // If the video is older than 30 minutes and we have no video URL, mark as failed
          const createdAt = new Date(currentJob.created_at);
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          
          if (createdAt < thirtyMinutesAgo && !videoUrl) {
            status = 'failed';
            progress = 0;
          }
        }
      } catch (error) {
        console.error('Error checking video status:', error);
        // Don't throw here, use existing status
      }
    }

    // Update the job status in our database
    const { error: updateError } = await supabaseClient
      .from('video_generation_jobs')
      .update({ 
        status,
        progress,
        result_url: videoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('request_id', request_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Successfully updated database with status:', {
      status,
      progress,
      videoUrl
    });

    return new Response(
      JSON.stringify({ 
        status,
        progress,
        video_url: videoUrl
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
