
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { jobId, requestId } = await req.json()
    
    // Validate that we have either jobId or requestId
    if (!jobId && !requestId) {
      throw new Error('Either Job ID or Request ID is required')
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const falApiKey = Deno.env.get('FAL_AI_API_KEY') || Deno.env.get('FAL_KEY')

    if (!supabaseUrl || !supabaseKey || !falApiKey) {
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

      if (requestIdError) {
        throw new Error(`Failed to find job with request ID: ${requestId}`)
      }
      job = jobByRequestId;
    } else {
      // Fallback to jobId
      const { data: jobById, error: jobIdError } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (jobIdError) {
        throw new Error(`Failed to find job with ID: ${jobId}`)
      }
      job = jobById;
    }

    // If no request_id found, throw an error
    if (!job.request_id) {
      throw new Error('No request ID associated with this job')
    }

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
      throw new Error('Failed to check job status')
    }

    const statusData = await statusResponse.json()
    console.log('Status response:', statusData)

    // Map Fal.ai status to our database status
    let dbStatus = 'pending'; // Default fallback
    if (statusData.status === 'COMPLETED') {
      dbStatus = 'completed'
    } else if (statusData.status === 'FAILED') {
      dbStatus = 'failed'
    } else if (statusData.status === 'IN_QUEUE' || statusData.status === 'PROCESSING') {
      dbStatus = 'pending'
    }
    
    let resultUrl = job.result_url
    let errorMessage = job.error_message

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
        throw new Error('Failed to fetch result')
      }

      const resultData = await resultResponse.json()
      console.log('Result data:', resultData)

      if (resultData.images?.[0]?.url) {
        resultUrl = resultData.images[0].url

        // Update job record
        const { error: updateError } = await supabase
          .from('image_generation_jobs')
          .update({
            status: dbStatus,
            result_url: resultUrl
          })
          .eq('id', job.id)

        if (updateError) {
          throw new Error('Failed to update job record')
        }
      }
    } else if (statusData.status === 'FAILED') {
      errorMessage = statusData.error || 'Unknown error occurred during generation'
      // Update job status
      await supabase
        .from('image_generation_jobs')
        .update({ 
          status: dbStatus,
          error_message: errorMessage
        })
        .eq('id', job.id)
    } else {
      // Update for IN_QUEUE or PROCESSING status
      await supabase
        .from('image_generation_jobs')
        .update({ 
          status: dbStatus
        })
        .eq('id', job.id)
    }

    return new Response(
      JSON.stringify({
        status: dbStatus,
        resultUrl,
        errorMessage,
        falStatus: statusData.status,
        jobId: job.id,
        requestId: job.request_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-image-status:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
