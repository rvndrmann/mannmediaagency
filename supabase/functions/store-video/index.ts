
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
    const { videoUrl, videoType, storyId } = await req.json()

    if (!videoUrl) {
      throw new Error('Video URL is required')
    }

    // Download the video
    console.log(`Downloading video from: ${videoUrl}`)
    const videoResponse = await fetch(videoUrl)
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`)
    }

    const videoBlob = await videoResponse.blob()
    const videoId = crypto.randomUUID()
    const fileExt = 'mp4' // Default to mp4 as it's the most common
    const filePath = `${videoId}.${fileExt}`

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload to storage
    console.log(`Uploading video to storage: ${filePath}`)
    const { error: uploadError } = await supabase.storage
      .from('showcase-videos')
      .upload(filePath, videoBlob, {
        contentType: 'video/mp4',
        upsert: false
      })

    if (uploadError) {
      throw uploadError
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('showcase-videos')
      .getPublicUrl(filePath)

    // Insert into stored_videos table
    const { error: dbError } = await supabase
      .from('stored_videos')
      .insert({
        original_url: videoUrl,
        storage_path: filePath,
        video_type: videoType,
        story_id: storyId,
        status: 'completed',
        size_bytes: videoBlob.size,
        metadata: {
          content_type: videoBlob.type,
          upload_date: new Date().toISOString()
        }
      })

    if (dbError) {
      throw dbError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        storage_path: filePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
