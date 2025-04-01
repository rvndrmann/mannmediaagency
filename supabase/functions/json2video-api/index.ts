
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
const JSON2VIDEO_API_KEY = Deno.env.get("JSON2VIDEO_API_KEY") || "";

interface JSON2VideoRequest {
  projectId: string;
  action: string;
  sceneIds?: string[];
  videoConfig?: Record<string, any>;
  requestId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if JSON2VIDEO_API_KEY is configured
    if (!JSON2VIDEO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "JSON2VIDEO_API_KEY is not configured on the server" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request
    const request: JSON2VideoRequest = await req.json();
    const { projectId, action, sceneIds, videoConfig, requestId } = request;
    
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
      case "create_video":
        if (!sceneIds || sceneIds.length === 0) {
          return new Response(
            JSON.stringify({ error: "Scene IDs are required to create a video" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await createVideo(supabase, projectId, sceneIds, videoConfig);
        break;
      
      case "check_status":
        if (!requestId) {
          return new Response(
            JSON.stringify({ error: "Request ID is required to check status" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await checkVideoStatus(supabase, requestId);
        break;
      
      case "get_video_url":
        if (!requestId) {
          return new Response(
            JSON.stringify({ error: "Request ID is required to get video URL" }),
            { status: 400, headers: corsHeaders }
          );
        }
        result = await getVideoUrl(supabase, requestId);
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
    console.error("Error in json2video-api:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred",
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// Helper functions for JSON2Video API integration

async function createVideo(supabase, projectId: string, sceneIds: string[], videoConfig?: Record<string, any>) {
  // Get project data
  const { data: project, error: projectError } = await supabase
    .from('canvas_projects')
    .select('*')
    .eq('id', projectId)
    .single();
  
  if (projectError) throw projectError;
  
  // Get scenes data
  const { data: scenes, error: scenesError } = await supabase
    .from('canvas_scenes')
    .select('*')
    .in('id', sceneIds)
    .order('scene_order', { ascending: true });
  
  if (scenesError) throw scenesError;
  
  if (!scenes || scenes.length === 0) {
    return {
      success: false,
      message: "No scenes found with the provided IDs"
    };
  }
  
  // Check if scenes have all required assets
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
  
  // Construct JSON2Video request payload
  // This is a simplified version - in a real implementation, you would build a more complex structure
  const json2videoPayload = {
    projectTitle: project.title,
    scenes: scenes.map(scene => ({
      id: scene.id,
      title: scene.title,
      description: scene.description,
      script: scene.script,
      imageUrl: scene.imageUrl,
      voiceOverText: scene.voiceOverText || scene.script,
      duration: 5 // Default duration in seconds
    })),
    ...videoConfig
  };
  
  console.log("JSON2Video payload:", JSON.stringify(json2videoPayload, null, 2));
  
  // In a real implementation, make API call to JSON2Video
  // For now, create a mock request ID
  const mockRequestId = `json2video-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  // Create a record in video_generation_jobs table
  try {
    const { data: videoJob, error: jobError } = await supabase
      .from('video_generation_jobs')
      .insert({
        project_id: projectId,
        status: 'pending',
        request_id: mockRequestId,
        metadata: json2videoPayload
      })
      .select()
      .single();
    
    if (jobError) {
      console.error("Error creating video job:", jobError);
      // Continue even if table doesn't exist in development
    }
  } catch (error) {
    console.error("Error creating video job entry:", error);
    // Continue even if error occurs
  }
  
  return {
    success: true,
    data: {
      requestId: mockRequestId,
      status: "pending",
      message: "Video generation job submitted successfully. Check status using the request ID."
    }
  };
}

async function checkVideoStatus(supabase, requestId: string) {
  // In a real implementation, make API call to JSON2Video to check status
  // For this mock implementation, return a random status
  const statuses = ["pending", "processing", "completed", "failed"];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  // If status is completed, update the job with a result URL
  if (randomStatus === "completed") {
    try {
      const { data: videoJob, error: jobError } = await supabase
        .from('video_generation_jobs')
        .update({
          status: 'completed',
          result_url: "https://example.com/mock-video-result.mp4"
        })
        .eq('request_id', requestId)
        .select()
        .single();
      
      if (jobError) {
        console.error("Error updating video job:", jobError);
      }
    } catch (error) {
      console.error("Error updating video job entry:", error);
      // Continue even if error occurs
    }
  }
  
  return {
    success: true,
    data: {
      requestId,
      status: randomStatus,
      message: `Video generation is ${randomStatus}${randomStatus === "completed" ? ". Result is ready." : "."}`
    }
  };
}

async function getVideoUrl(supabase, requestId: string) {
  // In a real implementation, retrieve the video URL from JSON2Video
  // For this mock implementation, return a fake URL
  
  // Check if we have a job entry for this request
  try {
    const { data: videoJob, error: jobError } = await supabase
      .from('video_generation_jobs')
      .select('*')
      .eq('request_id', requestId)
      .single();
    
    if (jobError) {
      console.error("Error fetching video job:", jobError);
      // Return mock data even if job doesn't exist
    }
    
    if (videoJob && videoJob.result_url) {
      return {
        success: true,
        data: {
          requestId,
          videoUrl: videoJob.result_url,
          status: "completed"
        }
      };
    }
  } catch (error) {
    console.error("Error fetching video job entry:", error);
  }
  
  // Return mock data if no job or result URL found
  return {
    success: true,
    data: {
      requestId,
      videoUrl: "https://example.com/mock-video-result.mp4",
      status: "completed"
    }
  };
}
