
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobStatus {
  jobId?: string;
  requestId?: string;
  status: 'IN_QUEUE' | 'COMPLETED' | 'FAILED';
  resultUrl?: string;
  error?: string; 
}

// Helper function to normalize status to uppercase
const normalizeStatus = (status: string | undefined): 'IN_QUEUE' | 'COMPLETED' | 'FAILED' => {
  if (!status) return 'IN_QUEUE';
  
  const upperStatus = status.toUpperCase();
  
  if (upperStatus === 'COMPLETED') return 'COMPLETED';
  if (upperStatus === 'FAILED') return 'FAILED';
  
  return 'IN_QUEUE';
};

// Helper function to map database status to API status
const mapDbStatusToApiStatus = (dbStatus: string): 'IN_QUEUE' | 'COMPLETED' | 'FAILED' => {
  const status = dbStatus.toLowerCase();
  
  if (status === 'completed') return 'COMPLETED';
  if (status === 'failed') return 'FAILED';
  
  return 'IN_QUEUE';
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the FAL_KEY and Supabase admin keys
    const FAL_KEY = Deno.env.get('FAL_AI_API_KEY') || Deno.env.get('FAL_KEY');
    if (!FAL_KEY) {
      throw new Error('FAL_KEY environment variable is not set');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required Supabase configuration');
    }
    
    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the job ID from the request body
    const { jobId } = await req.json();
    
    if (!jobId) {
      throw new Error('jobId is required');
    }
    
    console.log(`Checking status for job ID: ${jobId}`);
    
    // Fetch the job from the database
    const { data: job, error: jobError } = await supabase
      .from('image_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError) {
      console.error('Error fetching job:', jobError);
      throw new Error(`Failed to fetch job: ${jobError.message}`);
    }
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    const requestId = job.request_id;
    
    if (!requestId) {
      console.log('Job has no request_id, skipping status check with Fal.ai');
      return new Response(
        JSON.stringify({
          jobId: job.id,
          status: mapDbStatusToApiStatus(job.status),
          resultUrl: job.result_url,
          error: job.error || 'No request_id available for this job'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Checking status for request_id: ${requestId}`);
    
    // Use flux-subject endpoint for consistency with retry-image-generation function
    const statusResponse = await fetch(`https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!statusResponse.ok) {
      const statusCode = statusResponse.status;
      const errorText = await statusResponse.text();
      console.error(`Fal.ai status check error for request_id ${requestId} (Status: ${statusCode}):`, errorText);
      
      // Update the job in the database as failed if we get a permanent error (4xx)
      if (statusCode >= 400 && statusCode < 500) {
        const { error: updateError } = await supabase
          .from('image_generation_jobs')
          .update({
            status: 'failed',
            error_message: `API Error (${statusCode}): ${errorText}`
          })
          .eq('id', jobId);
          
        if (updateError) {
          console.error('Error updating job as failed:', updateError);
        }
        
        return new Response(
          JSON.stringify({
            jobId: job.id,
            requestId: requestId,
            status: 'FAILED',
            error: `API Error (${statusCode}): ${errorText}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`Failed to check status: ${errorText} (Status: ${statusCode})`);
    }
    
    const statusData = await statusResponse.json();
    console.log(`Status for request_id ${requestId}:`, JSON.stringify(statusData));
    
    // Map Fal.ai status to our internal status - ensure uppercase
    const normalizedStatus = normalizeStatus(statusData.status);
    console.log(`Normalized status for ${requestId}: ${normalizedStatus}`);
    
    // Extract result URL if completed
    let resultUrl = null;
    if (normalizedStatus === 'COMPLETED' && statusData.result?.url) {
      resultUrl = statusData.result.url;
      
      // Update the job in the database
      const { error: updateError } = await supabase
        .from('image_generation_jobs')
        .update({
          status: 'completed',
          result_url: resultUrl
        })
        .eq('id', jobId);
      
      if (updateError) {
        console.error('Error updating job:', updateError);
      }
    } else if (normalizedStatus === 'FAILED') {
      // Update the job in the database as failed
      const { error: updateError } = await supabase
        .from('image_generation_jobs')
        .update({
          status: 'failed',
          error_message: statusData.error || 'Unknown error'
        })
        .eq('id', jobId);
      
      if (updateError) {
        console.error('Error updating job:', updateError);
      }
    }
    
    // Prepare response
    const response: JobStatus = {
      jobId: job.id,
      requestId: requestId,
      status: normalizedStatus,
      resultUrl: resultUrl || job.result_url,
      error: normalizedStatus === 'FAILED' ? (statusData.error || 'Unknown error') : undefined
    };
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error in check-image-status:', error);
    return new Response(
      JSON.stringify({
        status: 'FAILED',
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
