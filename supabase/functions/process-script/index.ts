
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
    console.log("Process script function started");
    const { script, sceneIds, projectId, generateImagePrompts = true } = await req.json();
    
    if (!script || !sceneIds || !Array.isArray(sceneIds)) {
      throw new Error("Missing required parameters: script and sceneIds array");
    }

    console.log(`Processing script with ${sceneIds.length} scenes for project ${projectId}`);

    // Create a Supabase client using environment variables
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Simple script division if OpenAI is not available or runs into issues
    const fallbackDivideScript = (script, sceneCount) => {
      const paragraphs = script.split(/\n\s*\n/).filter(p => p.trim());
      let scenes = [];
      
      // If we have fewer paragraphs than scenes, duplicate the last paragraph
      while (paragraphs.length < sceneCount) {
        paragraphs.push(paragraphs[paragraphs.length - 1] || "");
      }
      
      // If we have more paragraphs than scenes, combine extras
      if (paragraphs.length > sceneCount) {
        const paragraphsPerScene = Math.ceil(paragraphs.length / sceneCount);
        const combinedParagraphs = [];
        
        for (let i = 0; i < paragraphs.length; i += paragraphsPerScene) {
          const group = paragraphs.slice(i, i + paragraphsPerScene);
          combinedParagraphs.push(group.join("\n\n"));
        }
        
        // Ensure we don't have more combined paragraphs than scenes
        while (combinedParagraphs.length > sceneCount) {
          const last = combinedParagraphs.pop();
          combinedParagraphs[combinedParagraphs.length - 1] += "\n\n" + (last || "");
        }
        
        for (let i = 0; i < sceneCount; i++) {
          scenes.push({
            id: sceneIds[i],
            content: i < combinedParagraphs.length ? combinedParagraphs[i] : "",
            voiceOverText: i < combinedParagraphs.length ? extractVoiceOver(combinedParagraphs[i]) : ""
          });
        }
      } else {
        // Direct mapping of paragraphs to scenes
        for (let i = 0; i < sceneCount; i++) {
          scenes.push({
            id: sceneIds[i],
            content: i < paragraphs.length ? paragraphs[i] : "",
            voiceOverText: i < paragraphs.length ? extractVoiceOver(paragraphs[i]) : ""
          });
        }
      }
      
      return scenes;
    };
    
    // Extract voice-over text (clean dialog) from script content
    const extractVoiceOver = (content) => {
      // Strip any bracketed direction text [like this]
      let voiceOverText = content.replace(/\[.*?\]/g, '');
      
      // Remove any narrator directions in parentheses (like this)
      voiceOverText = voiceOverText.replace(/\(.*?\)/g, '');
      
      // Remove any lines that start with common direction markers
      const lines = voiceOverText.split('\n').filter(line => {
        const trimmedLine = line.trim();
        return !trimmedLine.startsWith('SCENE') &&
               !trimmedLine.startsWith('CUT TO:') &&
               !trimmedLine.startsWith('FADE') &&
               !trimmedLine.startsWith('INT.') &&
               !trimmedLine.startsWith('EXT.') &&
               !trimmedLine.startsWith('TRANSITION');
      });
      
      // Clean up any double spaces or excess whitespace
      return lines.join('\n').replace(/\s+/g, ' ').trim();
    };

    // Try to use OpenAI for better script division with a timeout
    let scenes = [];
    try {
      // Set timeout to 12 seconds for OpenAI call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("OpenAI API call timed out")), 12000);
      });
      
      // Call OpenAI to divide the script
      console.log("Calling OpenAI API to process script");
      const openAiPromise = fetch("https://api.openai.com/v1/chat/completions", {
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
              content: `You are a professional scriptwriter and editor. You need to divide a script into ${sceneIds.length} scenes, 
              and extract clean voice-over text for each scene. The voice-over text should be free of stage directions, 
              camera instructions, or any technical notes. It should only contain the actual spoken words.`
            },
            {
              role: "user",
              content: `Here is a script: "${script}"\n\nPlease divide this script into exactly ${sceneIds.length} scenes. 
              For each scene, provide the scene content including any directions, and also extract ONLY the spoken dialogue 
              for voice-over purposes, removing any camera directions, scene headings, or technical notes. 
              Return your response as a valid JSON array with objects containing 'id', 'content', and 'voiceOverText' properties. 
              Use these exact scene IDs in order: ${JSON.stringify(sceneIds)}.`
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: "json_object" }
        })
      });

      // Use the race method to handle timeout
      const openAiResponse = await Promise.race([openAiPromise, timeoutPromise]);

      if (!openAiResponse.ok) {
        const errorData = await openAiResponse.json();
        console.error("OpenAI API error:", errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || openAiResponse.statusText}`);
      }

      const openAiData = await openAiResponse.json();
      
      // Parse the response to extract the scene data
      const responseContent = openAiData.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Failed to get a valid response from OpenAI");
      }

      // Parse the JSON response
      const parsedResponse = JSON.parse(responseContent);
      scenes = parsedResponse.scenes || [];

      if (!scenes.length) {
        throw new Error("Failed to parse scenes from OpenAI response");
      }
      
      console.log(`Successfully divided script into ${scenes.length} scenes using OpenAI`);
    } catch (openAiError) {
      console.error("Error or timeout using OpenAI for script division:", openAiError);
      console.log("Falling back to simple script division");
      
      // Use fallback division if OpenAI fails
      scenes = fallbackDivideScript(script, sceneIds.length);
    }

    // Save the full script to the project first to ensure it's not lost
    if (projectId) {
      try {
        const { error } = await supabaseAdmin
          .from('canvas_projects')
          .update({ full_script: script })
          .eq('id', projectId);
          
        if (error) {
          console.error("Error saving full script to project:", error);
        } else {
          console.log("Successfully saved full script to project");
        }
      } catch (error) {
        console.error("Error saving full script to project:", error);
      }
    }

    // Handle the scene updates in parallel for better performance
    const updatePromises = scenes.map(async (scene) => {
      try {
        const { error } = await supabaseAdmin
          .from('canvas_scenes')
          .update({ 
            script: scene.content,
            voice_over_text: scene.voiceOverText 
          })
          .eq('id', scene.id);
        
        if (error) {
          console.error(`Error updating scene ${scene.id}:`, error);
          return { id: scene.id, success: false, error: error.message };
        }
        
        return { id: scene.id, success: true };
      } catch (error) {
        console.error(`Error updating scene ${scene.id}:`, error);
        return { id: scene.id, success: false, error: String(error) };
      }
    });
    
    // Wait for all scene updates to complete
    const sceneResults = await Promise.all(updatePromises);
    console.log("Scene update results:", sceneResults);

    let imagePromptResults = { processedScenes: 0, successfulScenes: 0 };
    
    // Trigger image prompt generation if requested and if projectId is provided
    if (generateImagePrompts && projectId) {
      try {
        // Set a shorter timeout for image prompt generation to ensure we respond quickly
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Image prompt generation timed out")), 5000);
        });
        
        const imagePromptPromise = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-image-prompts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            sceneIds,
            projectId
          })
        });
        
        try {
          // Use Promise.race to handle potential timeout
          const imagePromptResponse = await Promise.race([imagePromptPromise, timeoutPromise]);
          
          if (imagePromptResponse.ok) {
            imagePromptResults = await imagePromptResponse.json();
            console.log("Image prompt generation results:", imagePromptResults);
          } else {
            console.error("Error generating image prompts:", await imagePromptResponse.text());
          }
        } catch (timeoutError) {
          console.log("Image prompt generation timed out, continuing with script processing");
          // We'll still return success for the script processing even if image prompts time out
        }
      } catch (error) {
        console.error("Error calling image prompt generation:", error);
        // Continue with script processing even if image prompt generation fails
      }
    }

    console.log("Process script function completed successfully");
    return new Response(
      JSON.stringify({ 
        scenes,
        imagePrompts: imagePromptResults,
        success: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing script:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
