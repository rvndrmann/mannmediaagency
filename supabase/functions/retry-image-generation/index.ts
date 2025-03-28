
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobResult {
  id: string;
  request_id: string;
  success: boolean;
  error?: string;
  status?: string;
  result_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestData = await req.json();
    const { jobId, forceRegenerate = false, batchSize = 10 } = requestData;
    
    // Validate that we have at least some job ID information
    if (!jobId) {
      console.log("Request data received:", JSON.stringify(requestData));
      throw new Error('Job ID is required for retry')
    }

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
              // Add other parameters as needed
            };
            
            const regenerateResponse = await fetch("https://fal.run/fal-ai/flux-subject", {
              method: "POST",
              headers: {
                "Authorization": `Key ${FAL_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });
            
            if (regenerateResponse.ok) {
              const data = await regenerateResponse.json();
              requestId = data.request_id;
              
              console.log(`Created new generation with request_id: ${requestId}`);
              
              // Update the job with the new request ID and reset status to pending
              await supabase
                .from('image_generation_jobs')
                .update({ 
                  request_id: requestId, 
                  status: 'pending',
                  result_url: null,
                  error_message: null,
                  retried_at: new Date().toISOString()
                })
                .eq('id', job.id);
            } else {
              console.error(`Fal.ai API error for job ${job.id}:`, await regenerateResponse.text())
            }
          } else {
            // Use existing request ID
            requestId = job.request_id;
          }
          
          // If we have a request ID, check current status
          if (requestId) {
            const statusResponse = await fetch(`https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}/status`, {
              headers: {
                "Authorization": `Key ${FAL_KEY}`
              }
            });
            
            if (!statusResponse.ok) {
              console.error(`Fal.ai API error for job ${job.id}:`, await statusResponse.text())
            }
            
            const statusData = await statusResponse.json();
            console.log(`Status for request ${requestId}:`, JSON.stringify(statusData));
            
            // Map Fal.ai status to our database status
            let dbStatus = job.status;
            let resultUrl = job.result_url;
            
            if (statusData.status === 'COMPLETED') {
              dbStatus = 'completed';
              
              const resultResponse = await fetch(`https://queue.fal.run/fal-ai/flux-subject/requests/${requestId}`, {
                headers: {
                  "Authorization": `Key ${FAL_KEY}`
                }
              });
              
              if (resultResponse.ok) {
                const resultData = await resultResponse.json();
                if (resultData.images?.[0]?.url) {
                  resultUrl = resultData.images[0].url;
                }
              }
            } else if (statusData.status === 'FAILED') {
              dbStatus = 'failed';
            } else if (statusData.status === 'IN_QUEUE' || statusData.status === 'PROCESSING') {
              dbStatus = 'pending';
            }
            
            console.log(`Updating job ${job.id} with status: ${dbStatus}, resultUrl: ${resultUrl || 'none'}`);
            
            // Update database with latest status
            await supabase
              .from('image_generation_jobs')
              .update({ 
                status: dbStatus,
                result_url: resultUrl,
                checked_at: new Date().toISOString()
              })
              .eq('id', job.id);
          }
          
          results.push({
            id: job.id,
            request_id: requestId,
            success: true
          });
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error)
          results.push({
            id: job.id,
            request_id: job.request_id || '',
            success: false,
            error: error.message || 'Unknown error'
          })
        }
      }
      
      return results;
    };
    
    let jobs = [];
    
    if (jobId) {
      // Get the job with the provided ID
      const { data: job, error: jobError } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('id', jobId)
      
      if (jobError) {
        console.error('Error fetching job:', jobError)
        throw new Error(`Failed to fetch job: ${jobError.message}`)
      }
      
      if (!job || job.length === 0) {
        throw new Error('No job found with the provided ID')
      }
      
      jobs = [job[0]];
    } else {
      // Get all jobs that are pending or stuck
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .in('status', ['pending', 'processing', 'failed'])
        .order('created_at', { ascending: false })
        .limit(batchSize);
      
      if (error) throw error;
      jobs = data || [];
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
    )

  } catch (error) {
    console.error('Error in retry-image-generation:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
