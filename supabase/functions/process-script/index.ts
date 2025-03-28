
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
    const { script, sceneIds } = await req.json();
    
    if (!script || !sceneIds || !Array.isArray(sceneIds)) {
      throw new Error("Missing required parameters: script and sceneIds array");
    }

    // Call OpenAI to divide the script into scenes
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
    const scenes = parsedResponse.scenes || [];

    if (!scenes.length) {
      throw new Error("Failed to parse scenes from OpenAI response");
    }

    return new Response(
      JSON.stringify({ scenes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing script:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
