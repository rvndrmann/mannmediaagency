
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIMEOUT_MINUTES = 15;
const CHECK_INTERVAL_MS = 30000; // 30 seconds
const MAX_RETRIES = Math.ceil((TIMEOUT_MINUTES * 60 * 1000) / CHECK_INTERVAL_MS);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { request_id } = await req.json()
    console.log('Checking status for request:', request_id)

    if (!request_id) {
      throw new Error('Missing request_id parameter')
    }

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

    // Get the job from database
    const { data: job, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('*')
      .eq('request_id', request_id)
      .single()

    if (jobError || !job) {
      throw new Error('Job not found')
    }

    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
    }

    // Check if we've exceeded the timeout
    const createdAt = new Date(job.created_at)
    const now = new Date()
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60)

    if (minutesSinceCreation > TIMEOUT_MINUTES) {
      console.log('Job timed out after', TIMEOUT_MINUTES, 'minutes')
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: `Generation timed out after ${TIMEOUT_MINUTES} minutes`,
          updated_at: now.toISOString()
        })
        .eq('id', job.id)

      return new Response(
        JSON.stringify({ status: 'timeout' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check the status
    console.log('Checking status with Fal.ai')
    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}/status`,
      {
        headers: {
          'Authorization': `Key ${falApiKey}`,
        },
      }
    )

    if (!statusResponse.ok) {
      throw new Error('Failed to check status')
    }

    const statusData = await statusResponse.json()
    console.log('Status check result:', statusData)

    if (statusData.status === 'completed') {
      // Fetch the final result
      const resultResponse = await fetch(
        `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`,
        {
          headers: {
            'Authorization': `Key ${falApiKey}`,
          },
        }
      )

      if (!resultResponse.ok) {
        throw new Error('Failed to fetch result')
      }

      const resultData = await resultResponse.json()
      console.log('Completed result data:', resultData)

      if (resultData.video?.url) {
        await supabaseAdmin
          .from('video_generation_jobs')
          .update({
            status: 'completed',
            result_url: resultData.video.url,
            updated_at: now.toISOString(),
            last_checked_at: now.toISOString()
          })
          .eq('id', job.id)

        return new Response(
          JSON.stringify({ status: 'completed', url: resultData.video.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (statusData.status === 'failed') {
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: statusData.error || 'Generation failed',
          updated_at: now.toISOString(),
          last_checked_at: now.toISOString()
        })
        .eq('id', job.id)

      return new Response(
        JSON.stringify({ status: 'failed', error: statusData.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If still processing, update job and schedule next check
    await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        retry_count: job.retry_count + 1,
        last_checked_at: now.toISOString(),
        updated_at: now.toISOString(),
        progress: statusData.progress || job.progress || 0
      })
      .eq('id', job.id)

    // Schedule next check if we haven't exceeded max retries
    if (job.retry_count < MAX_RETRIES) {
      // Schedule next check after CHECK_INTERVAL_MS
      setTimeout(async () => {
        try {
          await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-video-status`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ request_id })
            }
          )
        } catch (error) {
          console.error('Error scheduling next check:', error)
        }
      }, CHECK_INTERVAL_MS)
    }

    return new Response(
      JSON.stringify({ 
        status: 'processing',
        progress: statusData.progress || job.progress || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
