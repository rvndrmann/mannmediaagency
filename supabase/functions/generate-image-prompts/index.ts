
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    // Get request body
    const { sceneIds, projectId } = await req.json();
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY not set in environment');
    }
    
    if (!sceneIds || !Array.isArray(sceneIds) || sceneIds.length === 0) {
      // If no specific scenes provided, find scenes with voice-over text but no image prompt
      const { data: scenes, error: scenesError } = await supabase
        .from('canvas_scenes')
        .select('id, voice_over_text, description, image_prompt')
        .eq('project_id', projectId)
        .not('voice_over_text', 'is', null)
        .is('image_prompt', null);
        
      if (scenesError) {
        throw new Error(`Error fetching scenes: ${scenesError.message}`);
      }
      
      if (scenes.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: "No scenes with voice-over text and missing image prompts found", 
            processedScenes: 0 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Use these scenes
      sceneIds = scenes.map(scene => scene.id);
    }
    
    const results = [];
    let successfulScenes = 0;
    
    // Process each scene
    for (const sceneId of sceneIds) {
      try {
        // Get scene data
        const { data: scene, error: sceneError } = await supabase
          .from('canvas_scenes')
          .select('title, voice_over_text, description, image_url')
          .eq('id', sceneId)
          .single();
          
        if (sceneError) {
          results.push({
            id: sceneId,
            success: false,
            error: `Failed to fetch scene: ${sceneError.message}`
          });
          continue;
        }
        
        // Prepare prompt for OpenAI
        let promptContent = "Create a detailed image prompt for AI image generation that will help create a compelling visual for a video scene. ";
        
        if (scene.image_url) {
          promptContent += "The scene already has an image that you should use as reference. ";
        }
        
        promptContent += `
Scene Title: ${scene.title || "Untitled Scene"}
${scene.voice_over_text ? `Voice Over Text: ${scene.voice_over_text}` : ""}
${scene.description ? `Scene Description: ${scene.description}` : ""}

Please generate a detailed image prompt that includes:
1. Visual style (photorealistic, animation style, etc.)
2. Setting/environment details
3. Lighting specifications
4. Atmosphere/mood
5. Quality indicators (resolution, detail level, etc.)

Format the prompt in a way that will work well with an AI image generator. 
Include specific details in [brackets] for key elements.`;
        
        // Call OpenAI
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAIKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are an expert at creating detailed image prompts for AI image generators."
              },
              {
                role: "user",
                content: promptContent
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });
        
        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
          results.push({
            id: sceneId,
            success: false,
            error: "No response from AI model"
          });
          continue;
        }
        
        const imagePrompt = data.choices[0].message.content.trim();
        
        // Update the scene with the generated image prompt
        const { error: updateError } = await supabase
          .from('canvas_scenes')
          .update({ image_prompt: imagePrompt })
          .eq('id', sceneId);
          
        if (updateError) {
          results.push({
            id: sceneId,
            success: false,
            error: `Failed to update scene: ${updateError.message}`
          });
          continue;
        }
        
        // Success
        results.push({
          id: sceneId,
          success: true,
          imagePrompt
        });
        
        successfulScenes++;
      } catch (error) {
        results.push({
          id: sceneId,
          success: false,
          error: error.message
        });
      }
    }
    
    return new Response(
      JSON.stringify({
        results,
        processedScenes: sceneIds.length,
        successfulScenes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-image-prompts function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        processedScenes: 0,
        successfulScenes: 0
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
