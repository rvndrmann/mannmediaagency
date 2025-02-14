
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

    // Check if video is already stored
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: existingVideo } = await supabase
      .from('stored_videos')
      .select('stored_url')
      .eq('original_url', videoUrl)
      .maybeSingle()

    if (existingVideo?.stored_url) {
      console.log('Video already stored, returning existing URL:', existingVideo.stored_url)
      return new Response(
        JSON.stringify({ 
          success: true,
          url: existingVideo.stored_url
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Download the video with timeout and retries
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      console.log('Fetching video from URL:', videoUrl)
      const videoResponse = await fetch(videoUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'video/*,*/*'
        }
      })
      clearTimeout(timeout)

      if (!videoResponse.ok) {
        console.error('Failed to download video:', {
          status: videoResponse.status,
          statusText: videoResponse.statusText,
          headers: Object.fromEntries(videoResponse.headers.entries())
        })
        throw new Error(`Failed to download video: ${videoResponse.statusText}`)
      }

      const contentType = videoResponse.headers.get('content-type')
      console.log('Video content type:', contentType)

      const videoBlob = await videoResponse.blob()
      console.log('Video blob size:', videoBlob.size)

      if (videoBlob.size === 0) {
        throw new Error('Downloaded video has zero size')
      }

      // Generate a unique filename
      const filename = `${crypto.randomUUID()}.mp4`
      
      console.log('Uploading video to storage:', { filename })

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filename, videoBlob, {
          contentType: contentType || 'video/mp4',
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
    } catch (fetchError) {
      clearTimeout(timeout)
      throw fetchError
    }
  } catch (error) {
    console.error('Error in store-video function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
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
