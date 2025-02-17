
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_RETRIES = 90; // 15 minutes with 10-second intervals
const CHECK_INTERVAL = 10000; // 10 seconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { request_id, job_id } = await req.json()
    console.log('Checking status for request:', request_id, 'job:', job_id)

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

    // Get current retry count
    const { data: jobData } = await supabaseAdmin
      .from('video_generation_jobs')
      .select('retry_count')
      .eq('id', job_id)
      .single()

    const retryCount = (jobData?.retry_count || 0) + 1

    if (retryCount > MAX_RETRIES) {
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: 'Generation timed out after 15 minutes',
          last_checked_at: new Date().toISOString()
        })
        .eq('id', job_id)

      throw new Error('Generation timed out')
    }

    // Check status from Fal.ai using the correct endpoint
    console.log('Checking status with Fal.ai')
    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video/${request_id}/status`,
      {
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
      }
    )

    if (!statusResponse.ok) {
      throw new Error(`Failed to check status: ${await statusResponse.text()}`)
    }

    const statusData = await statusResponse.json()
    console.log('Status check result:', statusData)

    // Update job status and progress
    const updates: any = {
      status: statusData.status === 'completed' ? 'completed' : 
             statusData.status === 'failed' ? 'failed' : 'processing',
      progress: Math.round((statusData.progress || 0) * 100),
      retry_count: retryCount,
      last_checked_at: new Date().toISOString()
    }

    if (statusData.status === 'completed') {
      // Fetch the final result
      const resultResponse = await fetch(
        `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video/${request_id}`,
        {
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
      console.log('Result data:', resultData)

      if (resultData.video?.url) {
        updates.result_url = resultData.video.url
        updates.file_size = resultData.video.file_size || 0
      }
    } else if (statusData.status === 'failed') {
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

    // If the video is not yet complete, schedule another check
    if (updates.status === 'processing') {
      // Wait for the specified interval
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL))
      
      // Make another status check request
      await fetch(
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
