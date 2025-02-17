
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { job_id, prompt, image_url, duration, aspect_ratio } = await req.json()
    console.log('Received request:', { job_id, prompt, image_url, duration, aspect_ratio })

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

    // Initialize video generation with Fal.ai
    console.log('Initializing video generation with Fal.ai')
    const response = await fetch(
      'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video',
      {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: image_url,
          prompt: prompt,
          negative_prompt: "",
          num_frames: 24,
          duration: parseInt(duration),
          aspect_ratio: aspect_ratio
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fal.ai API error:', errorText)
      
      await supabaseAdmin
        .from('video_generation_jobs')
        .update({
          status: 'failed',
          error_message: `Failed to initiate video generation: ${errorText}`,
          last_checked_at: new Date().toISOString()
        })
        .eq('id', job_id)
      
      throw new Error(`Failed to generate video: ${errorText}`)
    }

    const data = await response.json()
    console.log('Fal.ai response:', data)

    if (!data.request_id) {
      throw new Error('No request_id received from Fal.ai')
    }

    // Update the job with the request_id and initial status
    const { error: updateError } = await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        request_id: data.request_id,
        status: 'processing',
        last_checked_at: new Date().toISOString()
      })
      .eq('id', job_id)

    if (updateError) {
      throw updateError
    }

    // Do an immediate status check
    try {
      const initialStatusResponse = await fetch(
        `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video/${data.request_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Key ${falApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (initialStatusResponse.ok) {
        const statusData = await initialStatusResponse.json()
        console.log('Initial status check:', statusData)
      }
    } catch (error) {
      console.error('Initial status check error:', error)
    }

    // Schedule future status checks
    await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-video-status`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          request_id: data.request_id,
          job_id: job_id
        })
      }
    )

    return new Response(
      JSON.stringify({ 
        status: 'processing',
        request_id: data.request_id 
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
