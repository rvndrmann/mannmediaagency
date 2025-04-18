
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

// Helper function to map API status to database status
const mapApiStatusToDbStatus = (apiStatus: string): 'in_queue' | 'completed' | 'failed' => {
  const status = apiStatus.toUpperCase();
  
  if (status === 'COMPLETED') return 'completed';
  if (status === 'FAILED') return 'failed';
  
  return 'in_queue';
};

// Get the appropriate status endpoint based on the request ID or job settings
const getStatusEndpoint = (requestId: string, job: any): string => {
  // Check if this is a product-shot job from the settings
  const isProductShot = job.settings && 
    (job.settings.scene_description || 
     job.settings.placement_type || 
     job.settings.shot_size);
  
  if (isProductShot) {
    return `https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`;
  } else {
    // Default to flux-subject endpoint for other types
    return `https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}/status`;
  }
};

// Get the appropriate result endpoint based on the request ID or job settings
const getResultEndpoint = (requestId: string, job: any): string => {
  // Check if this is a product-shot job from the settings
  const isProductShot = job.settings && 
    (job.settings.scene_description || 
     job.settings.placement_type || 
     job.settings.shot_size);
  
  if (isProductShot) {
    return `https://queue.fal.run/fal-ai/bria/requests/${requestId}`;
  } else {
    // Default to flux-subject endpoint for other types
    return `https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}`;
  }
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
          error: job.error_message || 'No request_id available for this job'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Checking status for request_id: ${requestId}`);
    
    try {
      // Get the appropriate endpoint for this job type
      const statusEndpoint = getStatusEndpoint(requestId, job);
      console.log(`Using status endpoint: ${statusEndpoint}`);
      
      // Check status with the appropriate endpoint
      const statusResponse = await fetch(statusEndpoint, {
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
        
        // If we get a 404, the job is gone on Fal.ai's side
        if (statusCode === 404) {
          // Update the job to indicate we need to regenerate
          const { error: updateError } = await supabase
            .from('image_generation_jobs')
            .update({
              status: 'failed',
              error_message: `API Error (${statusCode}): Resource not found. Request may have expired.`
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
              error: `API Error (${statusCode}): Resource not found. Try regenerating the image.`
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
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
      if (normalizedStatus === 'COMPLETED') {
        // If status is COMPLETED, we need to fetch the full result
        try {
          const resultEndpoint = getResultEndpoint(requestId, job);
          console.log(`Fetching result from endpoint: ${resultEndpoint}`);
          
          const resultResponse = await fetch(resultEndpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Key ${FAL_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!resultResponse.ok) {
            console.error(`Error fetching results for ${requestId}: ${resultResponse.status}`);
          } else {
            const resultData = await resultResponse.json();
            console.log(`Result data for ${requestId}:`, JSON.stringify(resultData));
            
            // Extract URL based on the response format (could be in different places depending on endpoint)
            if (resultData.result?.url) {
              resultUrl = resultData.result.url;
            } else if (resultData.image_url) {
              resultUrl = resultData.image_url;
            } else if (resultData.output?.images?.[0]?.url) {
              resultUrl = resultData.output.images[0].url;
            } else if (resultData.url) {
              resultUrl = resultData.url;
            }
          }
        } catch (resultError) {
          console.error(`Error fetching full result for ${requestId}:`, resultError);
        }
        
        if (resultUrl) {
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
        } else {
          console.warn(`Could not extract result URL for completed job ${jobId}`);
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
    } catch (requestError) {
      console.error(`Error checking status with Fal.ai for job ${jobId}:`, requestError);
      
      // Return the job's current status from database as fallback
      return new Response(
        JSON.stringify({
          jobId: job.id,
          requestId: requestId,
          status: mapDbStatusToApiStatus(job.status),
          resultUrl: job.result_url,
          error: `Failed to check status with Fal.ai: ${requestError.message}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
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
