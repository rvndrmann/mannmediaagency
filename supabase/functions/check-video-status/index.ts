
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

    const { request_id }: RequestBody = await req.json();
    if (!request_id) {
      throw new Error('No request_id provided');
    }

    // Check the status using the GET endpoint
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
      },
    });

    const statusResult = await statusResponse.json();
    console.log('FAL.ai Status Response:', statusResult);

    if (!statusResponse.ok) {
      throw new Error(statusResult.error || 'Failed to check video status');
    }

    let status = 'processing';
    let videoUrl = null;
    let progress = 0;

    // Calculate progress based on FAL.ai status
    if (statusResult.status === 'completed') {
      // Get the final result using the GET endpoint
      const resultResponse = await fetch(`https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
        },
      });

      if (resultResponse.ok) {
        const result = await resultResponse.json();
        status = 'completed';
        videoUrl = result.video_url;
        progress = 100;
        
        console.log('Video generation completed:', {
          request_id,
          status,
          video_url: videoUrl,
        });
      } else {
        console.error('Failed to fetch video result:', await resultResponse.text());
        throw new Error('Failed to fetch completed video result');
      }
    } else if (statusResult.status === 'failed') {
      status = 'failed';
      progress = 0;
      console.error('Video generation failed:', statusResult);
    } else if (statusResult.status === 'processing') {
      // Estimate progress based on queue position and processing state
      progress = Math.min(Math.round((statusResult.progress || 0) * 100), 99);
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
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        status,
        video_url: videoUrl,
        progress
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
