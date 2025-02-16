
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

    console.log(`Current job status: ${currentJob.status}, retry count: ${currentJob.retry_count || 0}`);

    // Check the status using the GET endpoint
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('FAL.ai error response:', errorText);
      throw new Error(`Failed to check video status: ${errorText}`);
    }

    const statusResult = await statusResponse.json();
    console.log('FAL.ai Status Response:', statusResult);

    let status = 'processing';
    let videoUrl = null;
    let progress = currentJob.progress || 0;

    // Calculate progress based on FAL.ai status
    if (statusResult.status === 'completed') {
      console.log('Status is completed, fetching final result...');
      try {
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

        if (result.video_url) {
          status = 'completed';
          videoUrl = result.video_url;
          progress = 100;
          
          console.log('Video generation completed successfully:', {
            request_id,
            status,
            video_url: videoUrl,
          });
        } else {
          throw new Error('No video URL in completed result');
        }
      } catch (error) {
        console.error('Error fetching completed video:', error);
        throw new Error(`Failed to fetch completed video: ${error.message}`);
      }
    } else if (statusResult.status === 'failed') {
      status = 'failed';
      progress = 0;
      console.error('Video generation failed:', statusResult);
    } else if (statusResult.status === 'processing') {
      // Estimate progress based on processing state
      progress = Math.min(Math.round((statusResult.progress || 0) * 100), 99);
      console.log('Processing progress:', progress);
    }

    // Update the job status in our database
    const { error: updateError } = await supabaseClient
      .from('video_generation_jobs')
      .update({ 
        status,
        result_url: videoUrl,
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('request_id', request_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Successfully updated database with:', {
      status,
      result_url: videoUrl,
      progress
    });

    return new Response(
      JSON.stringify({ 
        status,
        video_url: videoUrl,
        progress
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
