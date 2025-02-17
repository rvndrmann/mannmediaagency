
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_RETRIES = 180; // 30 minutes with 10-second intervals
const CHECK_INTERVAL = 10000; // 10 seconds

async function scheduleNextCheck(supabaseUrl: string, supabaseKey: string, request_id: string, job_id: string) {
  console.log(`Scheduling next check for job ${job_id} in ${CHECK_INTERVAL/1000} seconds`)
  
  await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL))
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/check-video-status`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ request_id, job_id })
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Failed to schedule next check for job ${job_id}:`, errorText)
    throw new Error(`Failed to schedule next check: ${errorText}`)
  }
  
  return response
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { request_id, job_id } = await req.json()
    console.log(`[${new Date().toISOString()}] Starting status check for request: ${request_id}, job: ${job_id}`)

    if (!request_id) {
      throw new Error('Missing request_id parameter')
    }

    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!falApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Get current job data with FOR UPDATE to prevent concurrent updates
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('retry_count, status, progress')
      .eq('id', job_id)
      .single()

    if (jobError) {
      throw new Error(`Failed to fetch job data: ${jobError.message}`)
    }

    const currentRetryCount = (jobData?.retry_count || 0)
    const newRetryCount = currentRetryCount + 1
    console.log(`Job ${job_id} - Retry ${newRetryCount}/${MAX_RETRIES}`)

    // Always update retry count first
    const { error: retryUpdateError } = await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        retry_count: newRetryCount,
        last_checked_at: new Date().toISOString()
      })
      .eq('id', job_id)

    if (retryUpdateError) {
      throw new Error(`Failed to update retry count: ${retryUpdateError.message}`)
    }

    if (newRetryCount > MAX_RETRIES) {
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Generation timed out after 30 minutes',
          last_checked_at: new Date().toISOString()
        })
        .eq('id', job_id)

      throw new Error('Generation timed out after maximum retries')
    }

    // Check status from Fal.ai
    console.log(`[${new Date().toISOString()}] Checking Fal.ai status for request: ${request_id}`)
    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
      }
    )

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text()
      console.error(`Status check error for job ${job_id}:`, errorText)
      throw new Error(`Failed to check status: ${errorText}`)
    }

    const statusData = await statusResponse.json()
    console.log(`Status response for job ${job_id}:`, JSON.stringify(statusData, null, 2))

    // Calculate progress
    let progress = jobData?.progress || 0
    if (statusData.status === 'PROCESSING') {
      progress = Math.min(95, progress + 3)
    } else if (statusData.status === 'COMPLETED') {
      progress = 100
    }

    const updates: any = {
      status: statusData.status === 'PROCESSING' ? 'processing' :
             statusData.status === 'COMPLETED' ? 'completed' :
             statusData.status === 'FAILED' ? 'failed' : 'in_queue',
      progress,
      last_checked_at: new Date().toISOString()
    }

    // If completed, fetch the final result
    if (statusData.status === 'COMPLETED') {
      console.log(`[${new Date().toISOString()}] Fetching final result for job ${job_id}`)
      try {
        const resultResponse = await fetch(
          `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Key ${falApiKey}`,
              'Content-Type': 'application/json'
            },
          }
        )

        if (!resultResponse.ok) {
          throw new Error('Failed to fetch video result')
        }

        const resultData = await resultResponse.json()
        console.log(`Final result for job ${job_id}:`, JSON.stringify(resultData, null, 2))

        if (resultData.video?.url) {
          updates.result_url = resultData.video.url
          updates.file_size = resultData.video.file_size || 0
        } else {
          throw new Error('No video URL in completed result')
        }
      } catch (error) {
        console.error(`Error fetching final result for job ${job_id}:`, error)
        updates.error_message = 'Failed to fetch final video result'
        updates.status = 'failed'
      }
    } else if (statusData.status === 'FAILED') {
      updates.error_message = statusData.error || 'Generation failed'
    }

    // Update the database
    const { error: updateError } = await supabaseAdmin
      .from('video_generation_jobs')
      .update(updates)
      .eq('id', job_id)

    if (updateError) {
      throw updateError
    }

    // Schedule next check if still in progress
    if (updates.status === 'processing' || updates.status === 'in_queue') {
      // Use EdgeRuntime.waitUntil with a new Promise for the background task
      EdgeRuntime.waitUntil(
        scheduleNextCheck(supabaseUrl, supabaseKey, request_id, job_id)
          .catch(error => {
            console.error(`Background task error for job ${job_id}:`, error)
          })
      )
    }

    return new Response(
      JSON.stringify({ 
        status: updates.status,
        progress: updates.progress,
        result_url: updates.result_url,
        retry_count: newRetryCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
