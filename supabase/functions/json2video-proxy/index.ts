
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

    const { operation, body } = await req.json()
    
    // Determine which endpoint to call based on the operation
    let endpoint = 'https://api.json2video.com/v2/movies'
    let method = 'POST'
    
    if (operation === 'getStatus') {
      // For status check, we need the project ID
      const projectId = body.projectId
      if (!projectId) {
        throw new Error('Project ID is required for status check')
      }
      endpoint = `https://api.json2video.com/v2/movies?project=${projectId}`
      method = 'GET'
    }
    
    console.log(`Making ${method} request to ${endpoint} with operation: ${operation}`)
    console.log(`Using API key with length: ${json2videoApiKey.length}`)
    
    // Forward the request to JSON2Video API
    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'x-api-key': json2videoApiKey.trim(),
        'Content-Type': 'application/json',
      },
      // Only include body for POST requests
      ...(method === 'POST' && { body: JSON.stringify(body) }),
    })
    
    console.log(`JSON2Video API response status: ${response.status}`)
    
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
    console.log(`JSON2Video API response:`, JSON.stringify(data))
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in JSON2Video proxy:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
