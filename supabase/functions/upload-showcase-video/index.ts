
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const video = formData.get('video')
    const thumbnail = formData.get('thumbnail')
    const title = formData.get('title')
    const description = formData.get('description')
    const category = formData.get('category')
    const order = formData.get('order')

    if (!video || !thumbnail || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload video file
    const videoPath = `${crypto.randomUUID()}.mp4`
    const { error: videoUploadError } = await supabase.storage
      .from('showcase-videos')
      .upload(videoPath, video, {
        contentType: 'video/mp4',
        upsert: false
      })

    if (videoUploadError) {
      throw videoUploadError
    }

    // Upload thumbnail
    const thumbnailPath = `${crypto.randomUUID()}.jpg`
    const { error: thumbnailUploadError } = await supabase.storage
      .from('showcase-videos')
      .upload(thumbnailPath, thumbnail, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (thumbnailUploadError) {
      throw thumbnailUploadError
    }

    // Get public URLs
    const videoUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/showcase-videos/${videoPath}`
    const thumbnailUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/showcase-videos/${thumbnailPath}`

    // Insert into database
    const { error: dbError } = await supabase
      .from('auth_showcase_videos')
      .insert({
        title,
        description,
        category,
        order: order ? parseInt(order as string) : 0,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl
      })

    if (dbError) {
      throw dbError
    }

    return new Response(
      JSON.stringify({ 
        message: 'Video uploaded successfully',
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to upload video', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
