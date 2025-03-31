
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StatusResponse {
  status: 'IN_QUEUE' | 'COMPLETED' | 'FAILED';
  images?: Array<{
    id: string;
    url: string;
    content_type: string;
    status: 'processing' | 'completed' | 'failed';
    prompt?: string;
  }>;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const FAL_KEY = Deno.env.get('FAL_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FAL_KEY) {
      console.error('Missing required environment variables')
      throw new Error('Server configuration error')
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Parse request body
    const { requestId, source } = await req.json()

    if (!requestId) {
      throw new Error('Request ID is required')
    }

    console.log(`Checking status for request: ${requestId}, source: ${source || 'default'}`)

    // Check if this is a Bria product-shot request
    if (source === 'bria') {
      const statusUrl = `https://queue.fal.run/fal-ai/bria/requests/${requestId}/status`
      const resultsUrl = `https://queue.fal.run/fal-ai/bria/requests/${requestId}`
      
      console.log(`Checking Bria status at: ${statusUrl}`)
      
      const statusResponse = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        console.error(`Error checking Bria status: ${errorText}`)
        
        if (statusResponse.status === 404) {
          return new Response(
            JSON.stringify({ 
              status: 'FAILED', 
              error: 'Generation not found or expired'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        throw new Error(`Failed to check generation status: ${errorText}`)
      }

      const statusData = await statusResponse.json()
      console.log('Bria status response:', statusData)

      if (statusData.status === 'completed') {
        // Fetch the completed results
        const resultsResponse = await fetch(resultsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json'
          }
        })

        if (!resultsResponse.ok) {
          throw new Error('Failed to fetch completed generation results')
        }

        const resultsData = await resultsResponse.json()
        console.log('Bria results:', resultsData)

        // Format response for Bria
        const response: StatusResponse = {
          status: 'COMPLETED',
          images: [
            {
              id: `${requestId}-0`,
              url: resultsData.content_url || resultsData.image || '',
              content_type: 'image/jpeg',
              status: 'completed',
              prompt: resultsData.prompt
            }
          ]
        }

        // Update the database record
        try {
          const { error: dbError } = await supabase
            .from('image_generation_jobs')
            .update({
              status: 'completed',
              result_url: response.images?.[0].url,
              updated_at: new Date().toISOString()
            })
            .eq('request_id', requestId)

          if (dbError) {
            console.error('Error updating database record:', dbError)
          }
        } catch (dbErr) {
          console.error('Database update error:', dbErr)
        }

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (statusData.status === 'failed') {
        // Process failed generation
        const response: StatusResponse = {
          status: 'FAILED',
          error: statusData.error || 'Generation failed'
        }

        // Update the database record
        try {
          const { error: dbError } = await supabase
            .from('image_generation_jobs')
            .update({
              status: 'failed',
              error_message: statusData.error || 'Generation failed',
              updated_at: new Date().toISOString()
            })
            .eq('request_id', requestId)

          if (dbError) {
            console.error('Error updating database record:', dbError)
          }
        } catch (dbErr) {
          console.error('Database update error:', dbErr)
        }

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Still in progress
        const response: StatusResponse = {
          status: 'IN_QUEUE'
        }

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Default (Replicate/other) API handling
      // Implement other APIs as needed
      
      throw new Error('Unsupported generation source')
    }
  } catch (error) {
    console.error('Error in check-generation-status:', error)
    return new Response(
      JSON.stringify({ 
        status: 'FAILED', 
        error: error.message || 'An unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
