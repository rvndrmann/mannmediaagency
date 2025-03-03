
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
    const { jobId } = await req.json()
    if (!jobId) {
      throw new Error('Job ID is required')
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const falApiKey = Deno.env.get('FAL_AI_API_KEY')

    if (!supabaseUrl || !supabaseKey || !falApiKey) {
      throw new Error('Missing required configuration')
    }

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('image_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error('Job not found')
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

    let newStatus = job.status
    let resultUrl = job.result_url

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
        newStatus = 'completed'
        resultUrl = resultData.images[0].url

        // Update job record
        const { error: updateError } = await supabase
          .from('image_generation_jobs')
          .update({
            status: newStatus,
            result_url: resultUrl
          })
          .eq('id', jobId)

        if (updateError) {
          throw new Error('Failed to update job record')
        }
      }
    } else if (statusData.status === 'FAILED') {
      newStatus = 'failed'
      // Update job status
      await supabase
        .from('image_generation_jobs')
        .update({ status: newStatus })
        .eq('id', jobId)
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        resultUrl,
        falStatus: statusData.status
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
