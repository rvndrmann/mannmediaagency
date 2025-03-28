
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sceneIds, projectId } = await req.json();
    
    if (!sceneIds || !Array.isArray(sceneIds) || !projectId) {
      throw new Error("Missing required parameters: sceneIds array and projectId");
    }

    // Create a Supabase client with the Deno runtime
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get all scenes with their voice-over text
    const { data: scenes, error: scenesError } = await supabaseAdmin
      .from('canvas_scenes')
      .select('id, voice_over_text, script, image_prompt, title')
      .eq('project_id', projectId)
      .in('id', sceneIds)
      .order('scene_order', { ascending: true });
    
    if (scenesError) {
      throw new Error(`Failed to fetch scenes: ${scenesError.message}`);
    }
    
    if (!scenes || scenes.length === 0) {
      throw new Error("No scenes found for the provided IDs");
    }
    
    // Filter scenes that have voice-over text but no image prompt
    const scenesToProcess = scenes.filter(scene => 
      scene.voice_over_text && 
      (!scene.image_prompt || scene.image_prompt.trim() === '')
    );
    
    if (scenesToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No scenes with voice-over text and missing image prompts found",
          processedScenes: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Process each scene to generate an image prompt
    const processedPrompts = await Promise.all(
      scenesToProcess.map(async (scene) => {
        try {
          // Generate image prompt using OpenAI
          const prompt = scene.voice_over_text;
          const sceneTitle = scene.title || `Scene`;
          
          const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `You are a professional image prompt generator for video production. 
                  Create detailed image prompts suitable for AI image generation that perfectly visualize a scene based on the voice-over text.
                  Your prompts should be highly descriptive, include style preferences (photorealistic, cinematic, etc.), and emphasize the main subject.
                  Use this format: [image type] of [subject], [setting/environment], [lighting], [atmosphere], [style], [quality indicators]`
                },
                {
                  role: "user",
                  content: `Generate a detailed image prompt for a scene in a video with the following voice-over text:
                  "${prompt}"
                  
                  This is for ${sceneTitle}.
                  The image prompt should be highly detailed but concise (around 50-80 words), focusing on creating a visually striking image that matches the content and mood of the voice-over.
                  DO NOT include any explanation or notes - ONLY the image prompt itself.`
                }
              ],
              temperature: 0.7,
              max_tokens: 300
            })
          });

          if (!openAiResponse.ok) {
            const errorData = await openAiResponse.json();
            console.error(`OpenAI error for scene ${scene.id}:`, errorData);
            return {
              id: scene.id,
              success: false,
              error: errorData.error?.message || openAiResponse.statusText
            };
          }

          const openAiData = await openAiResponse.json();
          const imagePrompt = openAiData.choices[0]?.message?.content.trim();
          
          if (!imagePrompt) {
            return {
              id: scene.id,
              success: false,
              error: "No image prompt generated"
            };
          }
          
          // Update the scene with the generated image prompt
          const { error: updateError } = await supabaseAdmin
            .from('canvas_scenes')
            .update({ image_prompt: imagePrompt })
            .eq('id', scene.id);
          
          if (updateError) {
            console.error(`Error updating scene ${scene.id}:`, updateError);
            return {
              id: scene.id,
              success: false,
              error: updateError.message
            };
          }
          
          return {
            id: scene.id,
            success: true,
            imagePrompt
          };
        } catch (error) {
          console.error(`Error processing scene ${scene.id}:`, error);
          return {
            id: scene.id,
            success: false,
            error: error.message
          };
        }
      })
    );
    
    // Count successful generations
    const successCount = processedPrompts.filter(result => result.success).length;
    
    return new Response(
      JSON.stringify({ 
        results: processedPrompts,
        processedScenes: processedPrompts.length,
        successfulScenes: successCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating image prompts:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
