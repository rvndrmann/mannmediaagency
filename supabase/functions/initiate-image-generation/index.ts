
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Convert ArrayBuffer to base64 in chunks to avoid stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const chunkSize = 0x8000; // Process in 32KB chunks
  let binary = '';
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  
  return btoa(binary);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing new image generation request')
    const formData = await req.formData()
    const image = formData.get('image') as File
    const prompt = formData.get('prompt')
    const imageSize = formData.get('imageSize') || 'square_hd'
    const numInferenceSteps = Number(formData.get('numInferenceSteps')) || 8
    const guidanceScale = Number(formData.get('guidanceScale')) || 3.5
    const outputFormat = formData.get('outputFormat') || 'png'

    // Validate required fields
    if (!image || !prompt) {
      console.error('Missing required parameters:', { hasImage: !!image, hasPrompt: !!prompt })
      return new Response(
        JSON.stringify({ error: 'Image and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (image.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Image file size must be less than 10MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user ID from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Check API configuration
    const apiKey = Deno.env.get('FAL_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!apiKey || !supabaseUrl || !supabaseKey) {
      console.error('Missing required configuration')
      throw new Error('Server configuration error')
    }

    console.log('Converting image to base64')
    // Convert image to base64 using chunked approach
    const imageBuffer = await image.arrayBuffer()
    const base64Image = arrayBufferToBase64(imageBuffer)
    const dataUri = `data:${image.type};base64,${base64Image}`

    // Submit job to Fal.ai with timeout and retry
    console.log('Sending request to Fal.ai API')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
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
        }),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!falResponse.ok) {
        const errorText = await falResponse.text()
        console.error('Fal.ai API error:', errorText)
        throw new Error(`Fal.ai API error: ${errorText}`)
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
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: The server took too long to respond')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }

  } catch (error) {
    console.error('Error in initiate-image-generation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
