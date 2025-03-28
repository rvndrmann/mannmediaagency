
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to normalize status
const normalizeStatus = (status: string): 'IN_QUEUE' | 'COMPLETED' | 'FAILED' => {
  if (!status) return 'IN_QUEUE';
  
  const upperStatus = status.toUpperCase();
  
  switch (upperStatus) {
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
      return 'FAILED';
    case 'IN_QUEUE':
    case 'PROCESSING':
    default:
      return 'IN_QUEUE';
  }
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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestData = await req.json();
    console.log("Request data received:", JSON.stringify(requestData));
    
    // Validate that we have job ID information
    const { jobId, forceRegenerate = false, batchSize = 10 } = requestData;
    
    if (!jobId) {
      console.error("Missing jobId in request data:", JSON.stringify(requestData));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Job ID is required for retry' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Processing retry request for job ID: ${jobId}, forceRegenerate: ${forceRegenerate}`);

    // Get the FAL_KEY from environment
    const FAL_KEY = Deno.env.get('FAL_AI_API_KEY') || Deno.env.get('FAL_KEY')
    if (!FAL_KEY) {
      console.error('FAL_KEY environment variable is not set');
      throw new Error('FAL_KEY environment variable is not set')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase configuration')
    }
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Function to process a batch of jobs
    const processJobs = async (jobs: any[]) => {
      const results = [];
      
      for (const job of jobs) {
        try {
          console.log(`Processing job ${job.id}, request_id: ${job.request_id || 'none'}`);
          
          // Skip jobs that are already completed or don't have required data
          if (job.status === 'completed' || !job.prompt) {
            results.push({
              id: job.id,
              request_id: job.request_id || '',
              success: false,
              error: job.status === 'completed' ? 'Job already completed' : 'Missing required data'
            });
            continue;
          }
          
          let requestId = '';
          
          // If no request ID exists or force regenerate, create a new generation
          if (!job.request_id || forceRegenerate) {
            // Prepare generation parameters from the job
            const payload = {
              prompt: job.prompt,
              image_url: job.source_image_url || job.original_url,
              // Add other parameters as needed
            };
            
            console.log(`Sending request to fal.ai API with payload:`, JSON.stringify(payload));
            
            const regenerateResponse = await fetch("https://queue.fal.run/fal-ai/flux-subject", {
              method: "POST",
              headers: {
                "Authorization": `Key ${FAL_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });
            
            const responseText = await regenerateResponse.text();
            console.log(`Response from fal.ai:`, responseText);
            
            if (regenerateResponse.ok) {
              const data = JSON.parse(responseText);
              requestId = data.request_id;
              
              console.log(`Created new generation with request_id: ${requestId}`);
              
              // Update the job with the new request ID and reset status to IN_QUEUE
              await supabase
                .from('image_generation_jobs')
                .update({ 
                  request_id: requestId, 
                  status: 'in_queue',  // Using database enum value
                  result_url: null,
                  error_message: null,
                  retried_at: new Date().toISOString()
                })
                .eq('id', job.id);
            } else {
              console.error(`Fal.ai API error for job ${job.id}:`, responseText);
              
              // Update the job with the error message
              await supabase
                .from('image_generation_jobs')
                .update({ 
                  status: 'failed',
                  error_message: `API Error: ${responseText}`
                })
                .eq('id', job.id);
                
              throw new Error(`Fal.ai API error: ${responseText}`);
            }
          } else {
            // Use existing request ID
            requestId = job.request_id;
          }
          
          // CRITICAL: Check status using request_id - this is what Fal.ai expects
          console.log(`Checking status for request_id: ${requestId}`);
          
          // Note the URL endpoint - using Fal.ai specific model endpoint with correct request_id parameter
          const statusResponse = await fetch(`https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}/status`, {
            headers: {
              "Authorization": `Key ${FAL_KEY}`
            }
          });
          
          if (!statusResponse.ok) {
            const statusCode = statusResponse.status;
            const errorText = await statusResponse.text();
            console.error(`Fal.ai status check failed for request_id: ${requestId} (job ${job.id}) - Status ${statusCode}`);
            
            // Update the database with the error for permanent errors (4xx)
            if (statusCode >= 400 && statusCode < 500) {
              await supabase
                .from('image_generation_jobs')
                .update({ 
                  status: 'failed',
                  error_message: `API Error (${statusCode}): ${errorText}`
                })
                .eq('id', job.id);
            }
            
            results.push({
              id: job.id,
              request_id: requestId,
              success: false,
              error: `Failed to check status: API Error (${statusCode})`
            });
            continue;
          }
          
          const statusData = await statusResponse.json();
          const normalizedStatus = normalizeStatus(statusData.status);
          
          console.log(`Request_id ${requestId} (job ${job.id}) status: ${normalizedStatus}`);
          
          // Update the database with the current status
          if (normalizedStatus === 'COMPLETED' && statusData.result?.url) {
            await supabase
              .from('image_generation_jobs')
              .update({ 
                status: 'completed',
                result_url: statusData.result.url,
                error_message: null
              })
              .eq('id', job.id);
          } else if (normalizedStatus === 'FAILED') {
            await supabase
              .from('image_generation_jobs')
              .update({ 
                status: 'failed',
                error_message: statusData.error || 'Unknown error'
              })
              .eq('id', job.id);
          }
          
          results.push({
            id: job.id,
            request_id: requestId,
            success: true,
            status: normalizedStatus
          });
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          results.push({
            id: job.id,
            request_id: job.request_id || '',
            success: false,
            error: error.message || 'Unknown error'
          });
        }
      }
      
      return results;
    };
    
    let jobs = [];
    
    if (jobId) {
      // Get the job with the provided ID
      const { data: jobData, error: jobError } = await supabase
        .from("image_generation_jobs")
        .select("*")
        .eq("id", jobId);
      
      if (jobError) {
        console.error('Error fetching job:', jobError);
        throw new Error(`Failed to fetch job: ${jobError.message}`);
      }
      
      if (!jobData || jobData.length === 0) {
        throw new Error('No job found with the provided ID');
      }
      
      jobs = [jobData[0]];
      console.log(`Found job with ID ${jobId}:`, JSON.stringify(jobData[0]));
    } else {
      // Get all jobs that are in_queue or failed
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .in('status', ['in_queue', 'failed'])
        .order('created_at', { ascending: false })
        .limit(batchSize);
      
      if (error) throw error;
      jobs = data || [];
      console.log(`Found ${jobs.length} jobs in queue or failed status`);
    }
    
    if (jobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No matching jobs found to retry'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }
    
    // Process the jobs
    const results = await processJobs(jobs);
    
    // Return the results
    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in retry-image-generation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
})
