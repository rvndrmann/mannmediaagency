
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoUrl, videoType, storyId } = await req.json()
    
    if (!videoUrl) {
      throw new Error('Video URL is required')
    }

    console.log('Attempting to download video:', { videoUrl, videoType, storyId })

    // Download the video
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      console.error('Failed to download video:', {
        status: videoResponse.status,
        statusText: videoResponse.statusText
      })
      throw new Error(`Failed to download video: ${videoResponse.statusText}`)
    }

    const videoBlob = await videoResponse.blob()
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate a unique filename
    const filename = `${crypto.randomUUID()}.mp4`
    
    console.log('Uploading video to storage:', { filename })

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filename, videoBlob, {
        contentType: 'video/mp4',
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Failed to upload to storage:', uploadError)
      throw uploadError
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filename)

    console.log('Video successfully stored:', { publicUrl })

    // If this is a story video, update the story record
    if (storyId) {
      const { error: updateError } = await supabase
        .from('stories')
        .update({
          final_video_with_music: publicUrl
        })
        .eq('id', storyId)

      if (updateError) {
        console.error('Failed to update story:', updateError)
        throw updateError
      }
    }

    // Store video metadata
    const { error: metadataError } = await supabase
      .from('stored_videos')
      .insert({
        original_url: videoUrl,
        stored_url: publicUrl,
        video_type: videoType,
        story_id: storyId
      })

    if (metadataError) {
      console.error('Failed to store video metadata:', metadataError)
      throw metadataError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        url: publicUrl
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error in store-video function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
