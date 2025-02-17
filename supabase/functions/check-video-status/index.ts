
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'

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
    const { request_id } = await req.json()
    console.log('Checking status for request:', request_id)

    if (!request_id) {
      throw new Error('Missing request_id parameter')
    }

    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
    }

    // Check status from Fal.ai
    console.log('Checking status with Fal.ai')
    const statusResponse = await fetch(
      `https://rest.fal.ai/fal-ai/kling-video/requests/${request_id}/status`,
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

    // Update job status and progress
    const updates: any = {
      status: statusData.status === 'completed' ? 'completed' : 
             statusData.status === 'failed' ? 'failed' : 'processing',
      progress: statusData.progress || 0,
      last_checked_at: new Date().toISOString()
    }

    if (statusData.status === 'completed') {
      // Fetch the final result
      const resultResponse = await fetch(
        `https://rest.fal.ai/fal-ai/kling-video/requests/${request_id}`,
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
      .eq('request_id', request_id)

    if (updateError) {
      throw updateError
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
