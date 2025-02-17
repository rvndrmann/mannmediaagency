
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    console.log('Fetching result for request:', request_id)

    if (!request_id) {
      throw new Error('Missing request_id parameter')
    }

    const falApiKey = Deno.env.get('FAL_AI_API_KEY')
    if (!falApiKey) {
      throw new Error('FAL_AI_API_KEY is not configured')
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

    // Fetch result from Fal.ai
    console.log('Fetching final result from Fal.ai')
    const resultResponse = await fetch(
      `https://queue.fal.run/fal-ai/kling-video/requests/${request_id}`,
      {
        headers: {
          'Authorization': `Key ${falApiKey}`,
        },
      }
    )

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text()
      console.error('Error fetching result:', errorText)
      throw new Error('Failed to fetch video result')
    }

    const resultData = await resultResponse.json()
    console.log('Received result data:', resultData)

    if (!resultData.video?.url) {
      throw new Error('No video URL in response')
    }

    // Update database with result
    const { error: updateError } = await supabaseAdmin
      .from('video_generation_jobs')
      .update({
        status: 'completed',
        result_url: resultData.video.url,
        file_size: resultData.video?.file_size || 0,
        updated_at: new Date().toISOString()
      })
      .eq('request_id', request_id)

    if (updateError) {
      console.error('Error updating database:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        status: 'completed', 
        url: resultData.video.url
      }),
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
      JSON.stringify({ error: err.message }),
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
