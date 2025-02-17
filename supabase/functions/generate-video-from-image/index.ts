import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Verify if the image URL is from our storage
    const storageUrlPattern = new RegExp(`${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/`)
    if (storageUrlPattern.test(image_url)) {
      // The URL is already a storage URL, we can use it directly
      console.log('Using storage URL directly:', image_url)
    } else {
      throw new Error('Invalid image URL. Must be a Supabase storage URL.')
    }

    // Call the video generation API with your implementation
    // This is a placeholder - replace with your actual video generation logic
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
        file_name: `video_${apiResponse.request_id}.mp4`,
        file_size: 0, // Will be updated when video is generated
        negative_prompt: "",
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      throw jobError
    }

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
