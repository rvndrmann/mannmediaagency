
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const json2videoApiKey = Deno.env.get('VITE_JSON2VIDEO_API_KEY')
    
    if (!json2videoApiKey) {
      throw new Error('JSON2Video API key is not configured')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'JSON2Video API key is configured'
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
