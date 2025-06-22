import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const LEONARDO_API_KEY = Deno.env.get('LEONARDO_API_KEY')
const LEONARDO_API_URL = 'https://cloud.leonardo.ai/api/rest/v1/generations'

interface GenerationResponse {
  generations_by_pk: {
    id: string
    status: 'PENDING' | 'COMPLETE' | 'FAILED' | string // Add other potential statuses if known
    generated_images: {
      id: string
      url: string
      nsfw: boolean
      // Add other fields if needed
    }[]
    // Add other fields if needed
  } | null
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!LEONARDO_API_KEY) {
    console.error('LEONARDO_API_KEY environment variable not set.')
    return new Response(JSON.stringify({ error: 'Internal server configuration error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }

  let generationId: string | null = null
  try {
    const body = await req.json()
    generationId = body.generationId
    if (!generationId || typeof generationId !== 'string') {
      throw new Error('Missing or invalid generationId in request body')
    }
  } catch (error) {
    console.error('Failed to parse request body:', error)
    const errorMessage = error instanceof Error ? error.message : 'Invalid request body'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  try {
    const response = await fetch(`${LEONARDO_API_URL}/${generationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LEONARDO_API_KEY}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Leonardo API request failed (${response.status}): ${errorText}`)
      throw new Error(`Failed to fetch generation status from Leonardo API: ${response.status}`)
    }

    const data: GenerationResponse = await response.json()

    if (!data || !data.generations_by_pk) {
       console.error('Invalid response structure from Leonardo API:', data)
       throw new Error('Invalid response structure from Leonardo API')
    }

    const generationInfo = data.generations_by_pk
    const status = generationInfo.status
    let imageUrl: string | null = null

    if (status === 'COMPLETE') {
      if (generationInfo.generated_images && generationInfo.generated_images.length > 0) {
        imageUrl = generationInfo.generated_images[0].url
      } else {
        // Handle case where status is COMPLETE but no images are found (should ideally not happen)
        console.warn(`Generation ${generationId} is COMPLETE but has no images.`)
        // Consider treating this as FAILED or returning status COMPLETE without URL
      }
    }

    // Return status and imageUrl if complete
    return new Response(
      JSON.stringify({
        status: status,
        imageUrl: imageUrl, // Will be null if status is not COMPLETE or no image found
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error(`Error checking generation ${generationId}:`, error)
    const detailMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({
        error: 'Failed to check generation status',
        details: detailMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
