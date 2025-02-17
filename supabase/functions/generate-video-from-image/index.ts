
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

    // Initialize video generation with Fal.ai
    console.log('Initializing video generation with Fal.ai')
    const response = await fetch(
      'https://rest.fal.ai/fal-ai/kling-video',
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
          duration: duration,
          aspect_ratio: aspect_ratio
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fal.ai API error:', errorText)
      throw new Error(`Failed to generate video: ${errorText}`)
    }

    const data = await response.json()
    console.log('Fal.ai response:', data)

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

    // Update the job with the request_id from Fal.ai
    const { error: updateError } = await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        request_id: data.request_id,
        status: 'processing'
      })
      .eq('id', job_id)

    if (updateError) {
      throw updateError
    }

    // Schedule initial status check
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
            body: JSON.stringify({ request_id: data.request_id })
          }
        )
      } catch (error) {
        console.error('Error scheduling status check:', error)
      }
    }, 5000)

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
