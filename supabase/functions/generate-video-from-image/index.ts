
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
    const { prompt, image_url, duration, aspect_ratio } = await req.json()
    console.log('Received request:', { prompt, image_url, duration, aspect_ratio })

    if (!prompt || !image_url) {
      throw new Error('Missing required parameters: prompt and image_url are required')
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

    // Get auth user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Invalid token')
    }

    // Verify if the image URL is accessible
    try {
      console.log('Attempting to verify image URL:', image_url)
      const response = await fetch(image_url, { 
        method: 'GET',
        headers: {
          'Accept': 'image/*',
          'User-Agent': 'Mozilla/5.0 (compatible; VideoGenerator/1.0)',
        },
      })

      if (!response.ok) {
        throw new Error(`Image URL is not accessible (Status: ${response.status})`)
      }
      
      console.log('Image URL is valid and accessible')
    } catch (error) {
      console.error('Error checking image URL:', error)
      throw new Error(`Source image is not accessible: ${error.message}`)
    }

    // Initialize video generation with Fal.ai
    console.log('Initializing video generation with Fal.ai')
    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
    }

    // Submit the initial request to Fal.ai
    const falResponse = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.6/standard/image-to-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${falApiKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_url,
        duration: duration || "5",
        aspect_ratio: aspect_ratio || "16:9"
      })
    })

    if (!falResponse.ok) {
      const errorText = await falResponse.text()
      console.error('Fal.ai API error:', errorText)
      throw new Error('Failed to initialize video generation')
    }

    const falData = await falResponse.json()
    console.log('Fal.ai initial response:', falData)

    if (!falData.request_id) {
      throw new Error('No request ID received from Fal.ai')
    }

    // Check initial status
    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/requests/${falData.request_id}/status`,
      {
        headers: {
          'Authorization': `Key ${falApiKey}`,
        },
      }
    )

    if (!statusResponse.ok) {
      throw new Error('Failed to check initial status')
    }

    const statusData = await statusResponse.json()
    console.log('Initial status:', statusData)

    // Store the job in the database
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .insert({
        user_id: user.id,
        status: 'in_queue',
        prompt,
        source_image_url: image_url,
        request_id: falData.request_id,
        aspect_ratio: aspect_ratio || "16:9",
        content_type: "mp4",
        duration: duration || "5",
        file_name: `video_${Date.now()}.mp4`,
        file_size: 0,
        negative_prompt: "",
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      throw jobError
    }

    // If the status is completed, get the result and update the job
    if (statusData.status === 'completed') {
      const resultResponse = await fetch(
        `https://queue.fal.run/fal-ai/kling-video/requests/${falData.request_id}`,
        {
          headers: {
            'Authorization': `Key ${falApiKey}`,
          },
        }
      )

      if (resultResponse.ok) {
        const resultData = await resultResponse.json()
        console.log('Result data:', resultData)

        if (resultData.video?.url) {
          const { error: updateError } = await supabaseAdmin
            .from('video_generation_jobs')
            .update({
              status: 'completed',
              result_url: resultData.video.url,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobData.id)

          if (updateError) {
            console.error('Error updating job status:', updateError)
          }

          return new Response(
            JSON.stringify({ 
              data: {
                ...jobData,
                status: 'completed',
                result_url: resultData.video.url
              }
            }),
            { 
              headers: { 
                ...corsHeaders,
                'Content-Type': 'application/json'
              } 
            }
          )
        }
      }
    }

    // If we reach here, the job is still in progress
    console.log('Job created successfully:', jobData)
    return new Response(
      JSON.stringify({ data: jobData }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({
        error: err.message || 'An error occurred during video generation'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      }
    )
  }
})
