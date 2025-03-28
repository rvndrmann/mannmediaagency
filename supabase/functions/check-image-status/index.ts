
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobStatus {
  status: 'IN_QUEUE' | 'COMPLETED' | 'FAILED';
  resultUrl?: string;
  errorMessage?: string;
  falStatus?: string;
  jobId?: string;
  requestId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestData = await req.json();
    const { jobId, requestId } = requestData;
    
    console.log("Request data received:", JSON.stringify(requestData));
    
    // Validate that we have either jobId or requestId
    if (!jobId && !requestId) {
      console.error("Missing jobId and requestId in request");
      throw new Error('Either Job ID or Request ID is required')
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const falApiKey = Deno.env.get('FAL_AI_API_KEY') || Deno.env.get('FAL_KEY')

    if (!supabaseUrl || !supabaseKey || !falApiKey) {
      console.error("Missing required environment variables");
      throw new Error('Missing required configuration')
    }

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch job details - prioritize requestId if provided
    let job;
    if (requestId) {
      // If requestId is provided, find the job by request_id
      const { data: jobByRequestId, error: requestIdError } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('request_id', requestId)
        .single()

      if (requestIdError && requestIdError.code !== 'PGRST116') {
        console.error(`Failed to find job with request ID: ${requestId}`, requestIdError);
        throw new Error(`Failed to find job with request ID: ${requestId}`)
      }
      job = jobByRequestId;
    }
    
    if (!job && jobId) {
      // Fallback to jobId
      const { data: jobById, error: jobIdError } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (jobIdError) {
        console.error(`Failed to find job with ID: ${jobId}`, jobIdError);
        throw new Error(`Failed to find job with ID: ${jobId}`)
      }
      job = jobById;
    }

    // If no job found, throw an error
    if (!job) {
      console.error("No job found for the provided identifiers");
      throw new Error('Job not found')
    }

    // If no request_id found but job exists, throw an error
    if (!job.request_id) {
      console.error(`Job found (${job.id}) but has no request_id`);
      throw new Error('No request ID associated with this job')
    }

    console.log('Checking status for job ID:', job.id, 'request_id:', job.request_id);

    // Check status in Fal.ai
    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/flux-subject/requests/${job.request_id}/status`,
      {
        headers: {
          'Authorization': `Key ${falApiKey}`,
        }
      }
    )

    if (!statusResponse.ok) {
      console.error("Failed to check job status:", await statusResponse.text());
      throw new Error('Failed to check job status')
    }

    const statusData = await statusResponse.json()
    console.log('Status response:', statusData);

    // Map Fal.ai status to our standardized status
    // For the database we use lowercase, for the client response we use uppercase
    let dbStatus = 'in_queue'; // Default fallback
    if (statusData.status === 'COMPLETED') {
      dbStatus = 'completed';
    } else if (statusData.status === 'FAILED') {
      dbStatus = 'failed';
    } else if (statusData.status === 'IN_QUEUE' || statusData.status === 'PROCESSING') {
      dbStatus = 'in_queue';
    }
    
    let resultUrl = job.result_url;
    let errorMessage = job.error_message;

    if (statusData.status === 'COMPLETED') {
      // Fetch the result
      const resultResponse = await fetch(
        `https://queue.fal.run/fal-ai/flux-subject/requests/${job.request_id}`,
        {
          headers: {
            'Authorization': `Key ${falApiKey}`,
          }
        }
      )

      if (!resultResponse.ok) {
        console.error("Failed to fetch result:", await resultResponse.text());
        throw new Error('Failed to fetch result')
      }

      const resultData = await resultResponse.json()
      console.log('Result data:', resultData);

      if (resultData.images?.[0]?.url) {
        resultUrl = resultData.images[0].url;

        // Update job record
        const { error: updateError } = await supabase
          .from('image_generation_jobs')
          .update({
            status: dbStatus,
            result_url: resultUrl,
            checked_at: new Date().toISOString()
          })
          .eq('id', job.id)

        if (updateError) {
          console.error("Failed to update job record:", updateError);
          throw new Error('Failed to update job record');
        }
      }
    } else if (statusData.status === 'FAILED') {
      errorMessage = statusData.error || 'Unknown error occurred during generation';
      // Update job status
      await supabase
        .from('image_generation_jobs')
        .update({ 
          status: dbStatus,
          error_message: errorMessage,
          checked_at: new Date().toISOString()
        })
        .eq('id', job.id);
    } else {
      // Update for IN_QUEUE or PROCESSING status
      await supabase
        .from('image_generation_jobs')
        .update({ 
          status: dbStatus,
          checked_at: new Date().toISOString()
        })
        .eq('id', job.id);
    }

    // Return response with normalized uppercase status for client
    const clientStatus = dbStatus === 'in_queue' ? 'IN_QUEUE' : 
                         dbStatus === 'completed' ? 'COMPLETED' : 
                         dbStatus === 'failed' ? 'FAILED' : 'IN_QUEUE';

    return new Response(
      JSON.stringify({
        status: clientStatus,
        resultUrl,
        errorMessage,
        falStatus: statusData.status,
        jobId: job.id,
        requestId: job.request_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-image-status:', error);
    return new Response(
      JSON.stringify({ 
        status: 'FAILED',
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
