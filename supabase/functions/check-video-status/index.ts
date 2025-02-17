
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
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
      .maybeSingle()

    if (jobError || !job) {
      throw new Error('Job not found')
    }

    // Check status from Fal.ai
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

    // Update job status and progress
    const updates: any = {
      status: statusData.status,
      progress: statusData.progress || job.progress || 0,
      last_checked_at: new Date().toISOString(),
      retry_count: (job.retry_count || 0) + 1
    }

    if (statusData.status === 'completed') {
      // Fetch the final result using the new endpoint
      const resultResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-video-result`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ request_id })
        }
      )

      if (!resultResponse.ok) {
        throw new Error('Failed to fetch video result')
      }

      const resultData = await resultResponse.json()
      return new Response(
        JSON.stringify(resultData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (statusData.status === 'failed') {
      updates.status = 'failed'
      updates.error_message = statusData.error || 'Generation failed'
    }

    // Update the database
    const { error: updateError } = await supabaseAdmin
      .from('video_generation_jobs')
      .update(updates)
      .eq('id', job.id)

    if (updateError) {
      throw updateError
    }

    // Schedule next check if still processing
    if (statusData.status === 'processing' || statusData.status === 'in_queue') {
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
      }, 30000) // Check every 30 seconds
    }

    return new Response(
      JSON.stringify({ 
        status: statusData.status,
        progress: updates.progress
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
