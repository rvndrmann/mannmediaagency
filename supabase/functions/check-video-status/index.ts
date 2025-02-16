
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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

serve(async (req) => {
  console.log('Request received:', req.method);

  // Handle CORS preflight
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

    // Get all pending or processing jobs
    const { data: jobs, error: jobError } = await supabaseClient
      .from('video_generation_jobs')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });

    if (jobError) {
      throw jobError;
    }

    console.log(`Found ${jobs?.length || 0} pending/processing jobs`);

    // Process each job
    const results = [];
    for (const job of jobs || []) {
      if (job.request_id) {
        console.log(`Checking status for job ${job.id} with request_id ${job.request_id}`);
        
        try {
          // Call fetch-video-result endpoint for each job
          const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-video-result?request_id=${job.request_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            }
          });

          const result = await response.json();
          console.log(`Result for job ${job.id}:`, result);
          results.push({ job_id: job.id, request_id: job.request_id, ...result });
        } catch (error) {
          console.error(`Error checking job ${job.id}:`, error);
          results.push({ 
            job_id: job.id, 
            request_id: job.request_id, 
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
