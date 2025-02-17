
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface VideoJob {
  id: string;
  request_id: string;
  status: 'in_queue' | 'processing' | 'completed' | 'failed';
  created_at: string;
  retry_count: number;
  last_checked_at: string | null;
}

const MAX_RETRIES = 3;
const MAX_PROCESSING_TIME = 8 * 60 * 1000; // 8 minutes in milliseconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all in_queue or processing jobs
    const { data: jobs, error: jobError } = await supabaseClient
      .from('video_generation_jobs')
      .select('*')
      .in('status', ['in_queue', 'processing'])
      .order('created_at', { ascending: true });

    if (jobError) throw jobError;

    console.log(`Found ${jobs?.length || 0} jobs to check`);

    const results = [];
    for (const job of jobs || []) {
      if (job.request_id) {
        console.log(`Checking status for job ${job.id} with request_id ${job.request_id}`);
        
        // Check if job has exceeded maximum processing time
        const createdAt = new Date(job.created_at).getTime();
        const now = Date.now();
        const elapsedTime = now - createdAt;

        if (elapsedTime > MAX_PROCESSING_TIME) {
          // Mark job as failed if it's been processing too long
          await supabaseClient
            .from('video_generation_jobs')
            .update({
              status: 'failed',
              error_message: 'Exceeded maximum processing time of 8 minutes',
              last_checked_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          results.push({ 
            job_id: job.id, 
            status: 'failed',
            error: 'Timeout'
          });
          continue;
        }

        try {
          // Check status from the API
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
            throw new Error(`API error: ${statusResponse.statusText}`);
          }

          const statusData = await statusResponse.json();
          console.log(`Status data for job ${job.id}:`, statusData);

          let newStatus = job.status;
          let progress = job.progress || 0;
          let errorMessage = null;

          // Update status based on API response
          switch(statusData.status) {
            case 'IN_QUEUE':
              newStatus = 'in_queue';
              break;
            case 'PROCESSING':
              newStatus = 'processing';
              progress = Math.min((elapsedTime / MAX_PROCESSING_TIME) * 100, 99);
              break;
            case 'COMPLETED':
              newStatus = 'completed';
              progress = 100;
              break;
            case 'FAILED':
              newStatus = 'failed';
              errorMessage = statusData.error || 'Failed to generate video';
              break;
            default:
              console.log(`Unknown status: ${statusData.status}`);
          }

          // Update job in database
          await supabaseClient
            .from('video_generation_jobs')
            .update({
              status: newStatus,
              progress,
              error_message: errorMessage,
              last_checked_at: new Date().toISOString(),
              retry_count: job.retry_count + 1
            })
            .eq('id', job.id);

          results.push({ 
            job_id: job.id, 
            status: newStatus,
            progress
          });

        } catch (error) {
          console.error(`Error checking job ${job.id}:`, error);
          
          // Increment retry count and possibly mark as failed
          const newRetryCount = (job.retry_count || 0) + 1;
          if (newRetryCount >= MAX_RETRIES) {
            await supabaseClient
              .from('video_generation_jobs')
              .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Unknown error',
                last_checked_at: new Date().toISOString(),
                retry_count: newRetryCount
              })
              .eq('id', job.id);
          } else {
            await supabaseClient
              .from('video_generation_jobs')
              .update({
                last_checked_at: new Date().toISOString(),
                retry_count: newRetryCount
              })
              .eq('id', job.id);
          }

          results.push({ 
            job_id: job.id, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        checked_jobs: results.length,
        results 
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
