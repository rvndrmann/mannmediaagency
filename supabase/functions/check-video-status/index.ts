
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Increased to handle longer generation times
const MAX_RETRIES = 180; // 30 minutes with 10-second intervals
const CHECK_INTERVAL = 10000; // 10 seconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { request_id, job_id } = await req.json()
    console.log(`[${new Date().toISOString()}] Checking status for request:`, request_id, 'job:', job_id)

    if (!request_id) {
      throw new Error('Missing request_id parameter')
    }

    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
    }

    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Get current job data
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('retry_count, status, progress')
      .eq('id', job_id)
      .single()

    if (jobError) {
      throw new Error(`Failed to fetch job data: ${jobError.message}`)
    }

    const retryCount = (jobData?.retry_count || 0) + 1
    console.log(`Current retry count: ${retryCount}/${MAX_RETRIES}`)

    if (retryCount > MAX_RETRIES) {
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Generation timed out after 30 minutes',
          last_checked_at: new Date().toISOString()
        })
        .eq('id', job_id)

      throw new Error('Generation timed out')
    }

    // Check status from Fal.ai
    console.log('Fetching status from Fal.ai API')
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
      console.error('Status check error:', errorText)
      
      // Update retry count even on error
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          retry_count: retryCount,
          last_checked_at: new Date().toISOString()
        })
        .eq('id', job_id)

      throw new Error(`Failed to check status: ${errorText}`)
    }

    const statusData = await statusResponse.json()
    console.log('Status response:', JSON.stringify(statusData, null, 2))

    // Calculate progress based on status
    let progress = jobData?.progress || 0
    if (statusData.status === 'PROCESSING') {
      // If processing, increment progress by ~3% each check (30 steps total)
      progress = Math.min(95, progress + 3)
    } else if (statusData.status === 'COMPLETED') {
      progress = 100
    }

    // Prepare updates
    const updates: any = {
      status: statusData.status === 'PROCESSING' ? 'processing' :
             statusData.status === 'COMPLETED' ? 'completed' :
             statusData.status === 'FAILED' ? 'failed' : 'in_queue',
      progress,
      retry_count: retryCount,
      last_checked_at: new Date().toISOString()
    }

    // If completed, fetch the final result
    if (statusData.status === 'COMPLETED') {
      console.log('Generation completed, fetching final result')
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
        console.log('Final result data:', JSON.stringify(resultData, null, 2))

        if (resultData.video?.url) {
          updates.result_url = resultData.video.url
          updates.file_size = resultData.video.file_size || 0
        } else {
          throw new Error('No video URL in completed result')
        }
      } catch (error) {
        console.error('Error fetching final result:', error)
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
      console.log('Scheduling next check in', CHECK_INTERVAL/1000, 'seconds')
      
      // Use Promise.race to ensure the background task doesn't hang
      EdgeRuntime.waitUntil(
        Promise.race([
          (async () => {
            await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL))
            
            const response = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-video-status`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ request_id, job_id })
              }
            )
            
            if (!response.ok) {
              console.error('Failed to schedule next check:', await response.text())
            }
          })(),
          new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL + 5000)) // 5s timeout buffer
        ])
      )
    }

    return new Response(
      JSON.stringify({ 
        status: updates.status,
        progress: updates.progress,
        result_url: updates.result_url 
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
