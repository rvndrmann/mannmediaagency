
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing new image generation request')
    const formData = await req.formData()
    const image = formData.get('image')
    const prompt = formData.get('prompt')
    const imageSize = formData.get('imageSize') || 'square_hd'
    const numInferenceSteps = Number(formData.get('numInferenceSteps')) || 8
    const guidanceScale = Number(formData.get('guidanceScale')) || 3.5
    const outputFormat = formData.get('outputFormat') || 'png'

    if (!image || !prompt) {
      console.error('Missing required parameters:', { hasImage: !!image, hasPrompt: !!prompt })
      return new Response(
        JSON.stringify({ error: 'Image and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Parameters received:', {
      imageSize,
      numInferenceSteps,
      guidanceScale,
      outputFormat,
      promptLength: prompt.length
    })

    // Convert the image to base64
    try {
      const imageBuffer = await (image as File).arrayBuffer()
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
      const dataUri = `data:${(image as File).type};base64,${base64Image}`
      console.log('Image successfully converted to base64')

      // Initial request to queue the job
      console.log('Sending request to Fal.ai API')
      const apiKey = Deno.env.get('FAL_AI_API_KEY')
      if (!apiKey) {
        throw new Error('FAL_AI_API_KEY is not configured')
      }

      const queueResponse = await fetch('https://queue.fal.run/fal-ai/flux-subject', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          image_url: dataUri,
          image_size: imageSize,
          num_inference_steps: numInferenceSteps,
          guidance_scale: guidanceScale,
          output_format: outputFormat,
          num_images: 1,
          enable_safety_checker: true,
          sync_mode: true
        })
      })

      console.log('Fal.ai API response status:', queueResponse.status)

      if (!queueResponse.ok) {
        const errorText = await queueResponse.text()
        console.error('Fal.ai API error:', errorText)
        throw new Error(`Failed to queue image generation: ${errorText}`)
      }

      const result = await queueResponse.json()
      console.log('Successfully received result from Fal.ai')
      
      if (!result.images?.[0]?.url) {
        console.error('No image URL in response:', result)
        throw new Error('No image generated')
      }

      return new Response(
        JSON.stringify({ 
          imageUrl: result.images[0].url,
          seed: result.seed,
          hasNsfw: result.has_nsfw_concepts?.[0] || false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (conversionError) {
      console.error('Image conversion error:', conversionError)
      throw new Error('Failed to process the uploaded image')
    }
  } catch (error) {
    console.error('Error in generate-product-image function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
