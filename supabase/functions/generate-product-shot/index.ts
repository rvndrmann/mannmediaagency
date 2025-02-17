
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, originalImageUrl, sceneDescription, shotType } = await req.json();

    if (!projectId || !originalImageUrl || !sceneDescription || !shotType) {
      throw new Error('Missing required parameters');
    }

    // Create enhanced prompt for the image generation
    const enhancedPrompt = `Create a professional product shot for an advertisement with these specifications:
    Original product: ${originalImageUrl}
    Scene description: ${sceneDescription}
    Shot type: ${shotType}
    
    Make it look professional, high-quality, and suitable for a commercial advertisement.`;

    // Use Runware API for image generation
    const runwareApiKey = Deno.env.get('RUNWARE_API_KEY');
    if (!runwareApiKey) {
      throw new Error('Runware API key not configured');
    }

    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          taskType: 'authentication',
          apiKey: runwareApiKey,
        },
        {
          taskType: 'imageInference',
          taskUUID: crypto.randomUUID(),
          positivePrompt: enhancedPrompt,
          model: 'runware:100@1',
          width: 1024,
          height: 1024,
          numberResults: 1,
          outputFormat: 'WEBP',
        },
      ]),
    });

    if (!response.ok) {
      throw new Error('Failed to generate image');
    }

    const data = await response.json();
    const generatedImage = data.data.find(item => item.taskType === 'imageInference');

    if (!generatedImage?.imageURL) {
      throw new Error('No image URL in response');
    }

    return new Response(
      JSON.stringify({ imageUrl: generatedImage.imageURL }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
