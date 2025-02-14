
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    console.log('Processing new image generation request')
    const formData = await req.formData()
    const image = formData.get('image')
    const prompt = formData.get('prompt')
    const imageSize = formData.get('imageSize') || 'square_hd'
    const numInferenceSteps = Number(formData.get('numInferenceSteps')) || 8
    const guidanceScale = Number(formData.get('guidanceScale')) || 3.5
    const outputFormat = formData.get('outputFormat') || 'png'

    if (!image || !prompt) {
      console.error('Missing required parameters:', { hasImage: !!image, hasPrompt: !!prompt })
      return new Response(
        JSON.stringify({ error: 'Image and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert the image to base64
    const imageBuffer = await (image as File).arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
    const dataUri = `data:${(image as File).type};base64,${base64Image}`

    // Get user ID from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Initial request to queue the job
    console.log('Sending request to Fal.ai API')
    const apiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!apiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
    }

    // Create database client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Submit job to Fal.ai
    const falResponse = await fetch('https://queue.fal.run/fal-ai/flux-subject', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: dataUri,
        image_size: imageSize,
        num_inference_steps: numInferenceSteps,
        guidance_scale: guidanceScale,
        output_format: outputFormat,
        num_images: 1,
        enable_safety_checker: true
      })
    })

    if (!falResponse.ok) {
      throw new Error(`Fal.ai API error: ${await falResponse.text()}`)
    }

    const falData = await falResponse.json()
    console.log('Fal.ai response:', falData)

    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user ID from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) {
      throw new Error('Failed to get user information')
    }

    // Create job record in database
    const { data: job, error: insertError } = await supabase
      .from('image_generation_jobs')
      .insert({
        user_id: user.id,
        request_id: falData.request_id,
        prompt,
        settings: {
          imageSize,
          numInferenceSteps,
          guidanceScale,
          outputFormat
        },
        status: 'processing'
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create job record: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        jobId: job.id,
        message: 'Image generation initiated' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in initiate-image-generation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
