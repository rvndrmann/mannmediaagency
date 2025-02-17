
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get request_id from body if provided
    const body = await req.json();
    let jobsToCheck;

    if (body.request_id) {
      // Single job check
      const { data, error } = await supabaseClient
        .from('video_generation_jobs')
        .select('request_id, id, status, created_at')
        .or('status.eq.in_queue,status.eq.processing')
        .eq('request_id', body.request_id);

      if (error) throw error;
      jobsToCheck = data;
      console.log(`Checking single job with request_id: ${body.request_id}`);
    } else {
      // Batch check all pending jobs
      const { data, error } = await supabaseClient
        .from('video_generation_jobs')
        .select('request_id, id, status, created_at')
        .or('status.eq.in_queue,status.eq.processing')
        .not('request_id', 'is', null);

      if (error) throw error;
      jobsToCheck = data;
      console.log(`Checking ${jobsToCheck.length} pending jobs`);
    }

    const results = await Promise.all(
      jobsToCheck.map(async (job) => {
        try {
          console.log(`Checking status for job ${job.id} (${job.request_id})`);
          
          // Check status from FAL API
          const statusResponse = await fetch(
            `https://queue.fal.run/fal-ai/kling-video/requests/${job.request_id}/status`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
                'Content-Type': 'application/json'
              }
            }
          );

          if (!statusResponse.ok) {
            console.error(`FAL API error for ${job.request_id}: ${statusResponse.statusText}`);
            throw new Error(`Failed to check status: ${statusResponse.statusText}`);
          }

          const statusData = await statusResponse.json();
          console.log(`FAL API status response for ${job.request_id}:`, statusData);

          // Map FAL API status to our status enum
          let newStatus = job.status;
          let errorMessage = null;
          let progress = 0;
          let resultUrl = null;

          switch (statusData.status) {
            case 'COMPLETED':
              newStatus = 'completed';
              progress = 100;
              resultUrl = statusData.result?.url;
              console.log(`Job ${job.id} completed with URL: ${resultUrl}`);
              break;
            case 'FAILED':
              newStatus = 'failed';
              errorMessage = statusData.error || 'Video generation failed';
              console.log(`Job ${job.id} failed: ${errorMessage}`);
              break;
            case 'IN_QUEUE':
              progress = 25;
              break;
            case 'PROCESSING':
              newStatus = 'processing';
              progress = 50;
              break;
            default:
              console.log(`Unknown status from FAL API: ${statusData.status}`);
          }

          // Update the job in database
          const { error: updateError } = await supabaseClient
            .from('video_generation_jobs')
            .update({
              status: newStatus,
              progress,
              error_message: errorMessage,
              result_url: resultUrl,
              last_checked_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) {
            console.error(`Error updating job ${job.id}:`, updateError);
            throw updateError;
          }

          return {
            request_id: job.request_id,
            status: newStatus,
            progress,
            error_message: errorMessage,
            result_url: resultUrl
          };
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          return {
            request_id: job.request_id,
            error: error instanceof Error ? error.message : 'An unknown error occurred'
          };
        }
      })
    );

    return new Response(
      JSON.stringify(results),
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
