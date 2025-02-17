
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
      
      // Determine URL type
      const isFalUrl = image_url.startsWith('https://fal.media')
      const isSupabaseUrl = image_url.includes(Deno.env.get('SUPABASE_URL') || '')
      
      console.log('URL type:', { isFalUrl, isSupabaseUrl })

      // Add custom headers for potential CORS issues
      const headers = {
        'Accept': 'image/*',
        'User-Agent': 'Mozilla/5.0 (compatible; VideoGenerator/1.0)',
      }

      // For Fal.ai URLs or Supabase Storage URLs, we'll do a GET request
      const response = await fetch(image_url, { 
        method: 'GET',
        headers,
      })

      console.log('Image URL verification status:', response.status)
      
      if (!response.ok) {
        throw new Error(`Image URL is not accessible (Status: ${response.status})`)
      }

      // Check content type
      const contentType = response.headers.get('content-type')
      console.log('Content-Type:', contentType)
      
      if (!isFalUrl && !contentType?.startsWith('image/')) {
        throw new Error('URL does not point to a valid image')
      }
      
      console.log('Image URL is valid and accessible')
    } catch (error) {
      console.error('Error checking image URL:', error)
      throw new Error(`Source image is not accessible: ${error.message}`)
    }

    // Call the video generation API with your implementation
    const apiResponse = {
      status: 'in_queue',
      request_id: crypto.randomUUID(),
    }

    // Store the job in the database
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('video_generation_jobs')
      .insert({
        user_id: user.id,
        status: 'in_queue',
        prompt,
        source_image_url: image_url,
        request_id: apiResponse.request_id,
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
