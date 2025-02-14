
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
    const formData = await req.formData()
    const image = formData.get('image')
    const prompt = formData.get('prompt')
    const imageSize = formData.get('imageSize') || 'square_hd'
    const numInferenceSteps = Number(formData.get('numInferenceSteps')) || 8
    const guidanceScale = Number(formData.get('guidanceScale')) || 3.5
    const outputFormat = formData.get('outputFormat') || 'png'

    if (!image || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Image and prompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert the image to base64
    const imageBuffer = await (image as File).arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))
    const dataUri = `data:${(image as File).type};base64,${base64Image}`

    // Initial request to queue the job
    const queueResponse = await fetch('https://queue.fal.run/fal-ai/flux-subject', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_AI_API_KEY')}`,
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
        sync_mode: true // Use sync mode for simpler implementation
      })
    })

    if (!queueResponse.ok) {
      console.error('Fal.ai API error:', await queueResponse.text())
      throw new Error('Failed to queue image generation')
    }

    const result = await queueResponse.json()
    
    // Check if we have images in the result
    if (!result.images?.[0]?.url) {
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
  } catch (error) {
    console.error('Error in generate-product-image function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
