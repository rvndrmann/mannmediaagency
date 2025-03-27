
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const json2videoApiKey = Deno.env.get('JSON2VIDEO_API_KEY')
    
    if (!json2videoApiKey) {
      console.log('Missing JSON2VIDEO_API_KEY in environment variables')
      throw new Error('JSON2Video API key is not configured')
    }

    console.log('Checking JSON2Video API status with key length:', json2videoApiKey.length)
    
    // Attempt to make a simple call to JSON2Video API to verify the key works
    const response = await fetch('https://api.json2video.com/v2/status', {
      method: 'GET',
      headers: {
        'x-api-key': json2videoApiKey,
        'Content-Type': 'application/json',
      }
    })

    console.log('JSON2Video status response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      let errorData;
      
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText }
      }
      
      console.error('JSON2Video API error response:', JSON.stringify(errorData))
      throw new Error(`JSON2Video API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    console.log('JSON2Video API success response:', JSON.stringify(data))
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'JSON2Video API key is valid and configured',
        status: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error checking JSON2Video API key:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
