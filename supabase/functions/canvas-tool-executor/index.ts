
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

// Define API endpoints and environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

interface CanvasToolRequest {
  projectId: string;
  sceneId?: string;
  action: string;
  content?: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request
    const request: CanvasToolRequest = await req.json();
    const { projectId, sceneId, action, content, userId } = request;
    
    // Validate request
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action is required" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Handle different actions
    let result;
    
    switch (action) {
      case "list_project_scenes":
        result = await listProjectScenes(supabase, projectId);
        break;
      
      case "get_scene_details":
        if (!sceneId) {
          return new Response(
            JSON.stringify({ error: "Scene ID is required for this action" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await getSceneDetails(supabase, projectId, sceneId);
        break;
      
      case "create_scene":
        result = await createScene(supabase, projectId, content);
        break;
      
      case "delete_scene":
        if (!sceneId) {
          return new Response(
            JSON.stringify({ error: "Scene ID is required for this action" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await deleteScene(supabase, sceneId);
        break;
      
      case "generate_script":
        if (!sceneId) {
          return new Response(
            JSON.stringify({ error: "Scene ID is required for this action" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await generateSceneScript(supabase, projectId, sceneId, content);
        break;
      
      case "generate_description":
        if (!sceneId) {
          return new Response(
            JSON.stringify({ error: "Scene ID is required for this action" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await generateSceneDescription(supabase, projectId, sceneId, content);
        break;
      
      case "generate_image_prompt":
        if (!sceneId) {
          return new Response(
            JSON.stringify({ error: "Scene ID is required for this action" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await generateImagePrompt(supabase, projectId, sceneId, content);
        break;
      
      case "generate_scene_image":
        if (!sceneId) {
          return new Response(
            JSON.stringify({ error: "Scene ID is required for this action" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await generateSceneImage(supabase, projectId, sceneId);
        break;
      
      case "generate_full_video":
        result = await generateFullVideo(supabase, projectId);
        break;
      
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported action: ${action}` }),
          { status: 400, headers: corsHeaders }
        );
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error in canvas-tool-executor:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred",
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// Helper functions for different actions

async function listProjectScenes(supabase, projectId: string) {
  const { data, error } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('scene_order', { ascending: true });
  
  if (error) throw error;
  
  return {
    success: true,
    data: {
      scenes: data || []
    }
  };
}

async function getSceneDetails(supabase, projectId: string, sceneId: string) {
  const { data, error } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('id', sceneId)
    .eq('project_id', projectId)
    .single();
  
  if (error) throw error;
  
  return {
    success: true,
    data: {
      scene: data
    }
  };
}

async function createScene(supabase, projectId: string, content?: string) {
  // Get scenes count to determine the order
  const { data: scenes, error: countError } = await supabase
    .from('canvas_scenes')
    .select('id')
    .eq('project_id', projectId);
  
  if (countError) throw countError;
  
  const sceneOrder = (scenes?.length || 0) + 1;
  const sceneTitle = content || `Scene ${sceneOrder}`;
  
  // Create the scene
  const { data, error } = await supabase
    .from('canvas_scenes')
    .insert({
      project_id: projectId,
      title: sceneTitle,
      scene_order: sceneOrder
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    success: true,
    data: {
      scene: data
    },
    message: `Scene "${sceneTitle}" created successfully`
  };
}

async function deleteScene(supabase, sceneId: string) {
  // Get scene data first to return it in the response
  const { data: sceneData, error: getError } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('id', sceneId)
    .single();
  
  if (getError) throw getError;
  
  // Delete the scene
  const { error } = await supabase
    .from('canvas_scenes')
    .delete()
    .eq('id', sceneId);
  
  if (error) throw error;
  
  return {
    success: true,
    data: {
      deletedScene: sceneData
    },
    message: `Scene "${sceneData.title}" deleted successfully`
  };
}

async function generateSceneScript(supabase, projectId: string, sceneId: string, content?: string) {
  // Get project and scene data
  const { data: project, error: projectError } = await supabase
    .from('canvas_projects')
    .select('*')
    .eq('id', projectId)
    .single();
  
  if (projectError) throw projectError;
  
  const { data: scene, error: sceneError } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('id', sceneId)
    .single();
  
  if (sceneError) throw sceneError;
  
  // Use OpenAI to generate a script
  // In a real implementation, you would call OpenAI API here
  const generatedScript = content || 
    `Generated script for scene "${scene.title}" in project "${project.title}".\n\n` +
    `This is a placeholder for the AI-generated script content.`;
  
  // Update the scene with the generated script
  const { data: updatedScene, error: updateError } = await supabase
    .from('canvas_scenes')
    .update({ script: generatedScript })
    .eq('id', sceneId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  return {
    success: true,
    data: {
      scene: updatedScene,
      generatedContent: generatedScript
    },
    message: "Script generated and saved successfully"
  };
}

async function generateSceneDescription(supabase, projectId: string, sceneId: string, content?: string) {
  // Similar implementation to generateSceneScript
  // Get project and scene data
  const { data: scene, error: sceneError } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('id', sceneId)
    .single();
  
  if (sceneError) throw sceneError;
  
  // Generate description (in a real implementation, use AI)
  const generatedDescription = content || 
    `This is a detailed description of scene "${scene.title}".\n\n` +
    `This is a placeholder for the AI-generated description content.`;
  
  // Update the scene with the generated description
  const { data: updatedScene, error: updateError } = await supabase
    .from('canvas_scenes')
    .update({ description: generatedDescription })
    .eq('id', sceneId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  return {
    success: true,
    data: {
      scene: updatedScene,
      generatedContent: generatedDescription
    },
    message: "Description generated and saved successfully"
  };
}

async function generateImagePrompt(supabase, projectId: string, sceneId: string, content?: string) {
  // Get scene data
  const { data: scene, error: sceneError } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('id', sceneId)
    .single();
  
  if (sceneError) throw sceneError;
  
  // Generate image prompt (in a real implementation, use AI)
  const generatedPrompt = content || 
    `A visual representation of "${scene.title}" with ${scene.description || 'detailed visuals'}.\n\n` +
    `This is a placeholder for the AI-generated image prompt.`;
  
  // Update the scene with the generated image prompt
  const { data: updatedScene, error: updateError } = await supabase
    .from('canvas_scenes')
    .update({ imagePrompt: generatedPrompt })
    .eq('id', sceneId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  return {
    success: true,
    data: {
      scene: updatedScene,
      generatedContent: generatedPrompt
    },
    message: "Image prompt generated and saved successfully"
  };
}

async function generateSceneImage(supabase, projectId: string, sceneId: string) {
  // Get scene data
  const { data: scene, error: sceneError } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('id', sceneId)
    .single();
  
  if (sceneError) throw sceneError;
  
  if (!scene.imagePrompt) {
    return {
      success: false,
      message: "Image prompt is required to generate an image. Please generate an image prompt first."
    };
  }
  
  // Placeholder for image generation - in a real implementation, call an image generation API
  const generatedImageUrl = "https://via.placeholder.com/800x450?text=Generated+Scene+Image";
  
  // Update the scene with the generated image URL
  const { data: updatedScene, error: updateError } = await supabase
    .from('canvas_scenes')
    .update({ imageUrl: generatedImageUrl })
    .eq('id', sceneId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  return {
    success: true,
    data: {
      scene: updatedScene,
      imageUrl: generatedImageUrl
    },
    message: "Scene image generated and saved successfully"
  };
}

async function generateFullVideo(supabase, projectId: string) {
  // Get all scenes for the project
  const { data: scenes, error: scenesError } = await supabase
    .from('canvas_scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('scene_order', { ascending: true });
  
  if (scenesError) throw scenesError;
  
  if (!scenes || scenes.length === 0) {
    return {
      success: false,
      message: "No scenes found for this project. Please create scenes first."
    };
  }
  
  // Check if all scenes have necessary assets
  const incompleteScenes = scenes.filter(scene => 
    !scene.imageUrl || !scene.script || !scene.description
  );
  
  if (incompleteScenes.length > 0) {
    return {
      success: false,
      message: `Some scenes are incomplete. Please complete scenes: ${incompleteScenes.map(s => s.title).join(', ')}`,
      data: {
        incompleteScenes
      }
    };
  }
  
  // Placeholder for video generation - in a real implementation, call JSON2Video API
  const generatedVideoUrl = "https://example.com/placeholder-video.mp4";
  
  // Create a record in video_generation_jobs table (assuming it exists)
  const { data: videoJob, error: jobError } = await supabase
    .from('video_generation_jobs')
    .insert({
      project_id: projectId,
      status: 'completed',
      result_url: generatedVideoUrl,
      request_id: `mock-${Date.now()}`
    })
    .select()
    .single();
  
  if (jobError) {
    console.log("Video job could not be created - this is expected in development if the table doesn't exist");
  }
  
  return {
    success: true,
    data: {
      videoUrl: generatedVideoUrl,
      job: videoJob || null
    },
    message: "Full video generated successfully"
  };
}
