
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { request_id } = await req.json()
    console.log('Fetching video result for request:', request_id)

    if (!request_id) {
      throw new Error('Missing request_id parameter')
    }

    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
    }

    // Fetch the final video result using the requests endpoint
    const response = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falApiKey}`,
          'Content-Type': 'application/json'
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch video result')
    }

    const data = await response.json()
    console.log('Video result data:', data)

    // Extract video URL and file size from the response
    const video_url = data.video?.url
    const file_size = data.video?.file_size || 0

    if (!video_url) {
      throw new Error('No video URL found in response')
    }

    return new Response(
      JSON.stringify({ 
        video_url,
        file_size
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
