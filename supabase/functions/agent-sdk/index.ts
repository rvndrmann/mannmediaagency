
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const params = url.searchParams;
    
    // Get parameters from request
    const projectId = params.get("projectId");
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    // Try to fetch the project
    const { data: projectData, error: projectError } = await supabase
      .from("canvas_projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no rows found
      
    if (projectError) {
      return new Response(
        JSON.stringify({ error: `Error fetching project: ${projectError.message}` }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }
    
    if (!projectData) {
      return new Response(
        JSON.stringify({ error: `Project with ID ${projectId} not found` }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404 
        }
      );
    }

    // Fetch project scenes
    const { data: scenesData, error: scenesError } = await supabase
      .from("canvas_scenes")
      .select("*")
      .eq("project_id", projectId)
      .order("scene_order", { ascending: true });
      
    if (scenesError) {
      return new Response(
        JSON.stringify({ error: `Error fetching scenes: ${scenesError.message}` }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500 
        }
      );
    }

    // Format project data for response
    const formattedProject = {
      id: projectData.id,
      title: projectData.title,
      description: projectData.description || "",
      fullScript: projectData.full_script || "",
      createdAt: projectData.created_at,
      updatedAt: projectData.updated_at,
      userId: projectData.user_id,
      scenes: scenesData ? scenesData.map(scene => ({
        id: scene.id,
        title: scene.title || "",
        script: scene.script || "",
        imagePrompt: scene.image_prompt || "",
        description: scene.description || "",
        imageUrl: scene.image_url || "",
        videoUrl: scene.video_url || "",
        productImageUrl: scene.product_image_url || "",
        voiceOverUrl: scene.voice_over_url || "",
        backgroundMusicUrl: scene.background_music_url || "",
        voiceOverText: scene.voice_over_text || "",
        order: scene.scene_order,
        projectId: scene.project_id,
        createdAt: scene.created_at,
        updatedAt: scene.updated_at,
        duration: scene.duration
      })) : []
    };

    return new Response(
      JSON.stringify(formattedProject),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in agent-sdk function:", error);
    
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
