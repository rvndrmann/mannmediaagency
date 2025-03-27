
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
    // Get the FAL_KEY from environment
    const FAL_KEY = Deno.env.get('FAL_KEY')
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

    // Get the job IDs from the request body
    const { jobIds } = await req.json();
    
    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      throw new Error('No job IDs provided for retry')
    }

    console.log(`Attempting to retry ${jobIds.length} image generation jobs`)
    
    // Get all the jobs with the provided IDs
    const { data: jobs, error: jobsError } = await supabase
      .from('image_generation_jobs')
      .select('*')
      .in('id', jobIds)
      
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`)
    }
    
    if (!jobs || jobs.length === 0) {
      throw new Error('No jobs found with the provided IDs')
    }
    
    console.log(`Found ${jobs.length} jobs to retry`)
    
    // Process each job
    const results: JobResult[] = []
    
    for (const job of jobs) {
      try {
        if (!job.request_id) {
          results.push({
            id: job.id,
            request_id: '',
            success: false,
            error: 'No request ID found for this job'
          })
          continue
        }
        
        // Check status from fal.ai using the correct endpoint
        const statusResponse = await fetch(`https://queue.fal.run/fal-ai/bria/requests/${job.request_id}/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json'
          }
        })

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text()
          console.error(`Fal.ai API error for job ${job.id}:`, errorText)
          
          results.push({
            id: job.id,
            request_id: job.request_id,
            success: false,
            error: `API error: ${errorText}`
          })
          continue
        }

        const statusData = await statusResponse.json()
        console.log(`Status for job ${job.id} (${job.request_id}):`, JSON.stringify(statusData))
        
        // Extract the status and update the job in the database
        let dbStatus = job.status
        let resultUrl = job.result_url
        
        if (statusData.status === 'COMPLETED' || statusData.status === 'completed') {
          console.log(`Job ${job.id} is completed, fetching result`)
          
          // Fetch the full result to get image URLs
          const resultResponse = await fetch(`https://queue.fal.run/fal-ai/bria/requests/${job.request_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Key ${FAL_KEY}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (resultResponse.ok) {
            const resultData = await resultResponse.json()
            console.log(`Result for job ${job.id}:`, JSON.stringify(resultData))
            
            // Extract image URL (various response structures possible)
            let imageUrl = null
            
            if (resultData.result && resultData.result.images && resultData.result.images.length > 0) {
              imageUrl = resultData.result.images[0].url
            } else if (resultData.images && resultData.images.length > 0) {
              imageUrl = resultData.images[0].url
            } else if (resultData.output && resultData.output.images && resultData.output.images.length > 0) {
              imageUrl = resultData.output.images[0].url
            } else if (resultData.url) {
              imageUrl = resultData.url
            } else if (resultData.output && resultData.output.url) {
              imageUrl = resultData.output.url
            } else if (resultData.result && resultData.result.url) {
              imageUrl = resultData.result.url
            }
            
            if (imageUrl) {
              resultUrl = imageUrl
              dbStatus = 'completed'
              console.log(`Found image URL for job ${job.id}: ${imageUrl}`)
            } else {
              console.error(`No image URL found in response for job ${job.id}`)
            }
          } else {
            const errorText = await resultResponse.text()
            console.error(`Error fetching result for job ${job.id}:`, errorText)
          }
        } else if (statusData.status === 'FAILED' || statusData.status === 'failed') {
          dbStatus = 'failed'
        }
        
        console.log(`Updating job ${job.id} with status: ${dbStatus}, resultUrl: ${resultUrl || 'none'}`)
        
        // Update the job in the database
        const { error: updateError } = await supabase
          .from('image_generation_jobs')
          .update({
            status: dbStatus,
            result_url: resultUrl
          })
          .eq('id', job.id)
        
        if (updateError) {
          console.error(`Error updating job ${job.id}:`, updateError)
          results.push({
            id: job.id,
            request_id: job.request_id,
            success: false,
            error: `Database update error: ${updateError.message}`
          })
        } else {
          results.push({
            id: job.id,
            request_id: job.request_id,
            success: true,
            status: dbStatus,
            result_url: resultUrl
          })
        }
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
