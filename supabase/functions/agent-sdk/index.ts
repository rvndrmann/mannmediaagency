
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentRequest {
  input: string;
  projectId?: string;
  sessionId?: string;
  agentType?: string;
  context?: Record<string, any>;
}

serve(async (req) => {
  console.log(`Agent SDK function received request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse request body
    let requestData: AgentRequest;
    try {
      requestData = await req.json();
      console.log("Request data:", JSON.stringify(requestData));
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { input, projectId, sessionId, agentType = 'assistant', context = {} } = requestData;
    
    if (!input) {
      return new Response(
        JSON.stringify({ success: false, error: "Input is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Supabase client for accessing project data if needed
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Fetch project data if projectId is provided
    let projectData = {};
    
    if (projectId) {
      try {
        // Get project details
        const { data: project, error: projectError } = await supabase
          .from("canvas_projects")
          .select("*")
          .eq("id", projectId)
          .single();
          
        if (projectError) {
          console.warn(`Error fetching project: ${projectError.message}`);
        } else if (project) {
          // Get scenes for the project
          const { data: scenes, error: scenesError } = await supabase
            .from("canvas_scenes")
            .select("*")
            .eq("project_id", projectId)
            .order("scene_order", { ascending: true });
            
          if (scenesError) {
            console.warn(`Error fetching scenes: ${scenesError.message}`);
          }
          
          projectData = {
            project,
            scenes: scenes || []
          };
        }
      } catch (error) {
        console.error("Error getting project data:", error);
      }
    }
    
    // Get agent instructions based on agent type
    const instructions = getAgentInstructions(agentType);
    
    // Process the input and generate a response based on agent type
    // In a full implementation, this would use OpenAI API or similar
    let response = generateResponse(input, agentType, projectData);
    
    console.log(`Generated response for ${agentType} agent`);
    
    return new Response(
      JSON.stringify({
        success: true,
        response,
        agentType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Agent SDK error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to get agent instructions
function getAgentInstructions(agentType: string): string {
  // Define instructions based on agent type
  switch (agentType) {
    case 'script':
      return "You are a script writer specializing in creating scripts for video content.";
    case 'image':
      return "You are an image prompt generator specializing in creating detailed prompts for image generation.";
    case 'scene':
      return "You are a scene creator specializing in creating detailed scene descriptions for video content.";
    default:
      return "You are a helpful Canvas assistant. You help users with their video projects by providing guidance on scripts, scenes, and visual elements.";
  }
}

// Simulate response generation
function generateResponse(input: string, agentType: string, projectData: any): string {
  // In a real implementation, this would call OpenAI API
  switch (agentType) {
    case 'script':
      return `Here's a script I've generated based on your input: "${input}"\n\n` + 
        "SCENE 1 - INTRODUCTION\n" +
        "[Camera slowly pans across the scene]\n" +
        "NARRATOR: The world as we know it is changing...\n\n" +
        "SCENE 2 - MAIN CONTENT\n" +
        "[Close-up shot of the subject]\n" +
        "NARRATOR: Your message matters now more than ever.";
      
    case 'image':
      return `Based on your request "${input}", here's an image prompt:\n\n` +
        "A professional cinematic shot with dramatic lighting, shallow depth of field, " +
        "4K ultra-detailed photograph. The scene shows " + input + " with " +
        "natural color grading, perfect composition, and award-winning cinematography.";
      
    case 'scene':
      return `Here's a detailed scene description for "${input}":\n\n` +
        "The scene opens with a wide establishing shot, slowly panning from left to right. " +
        "The lighting is warm and inviting, creating depth and dimension. " +
        "The subject is positioned slightly off-center following the rule of thirds. " +
        "The background is slightly out of focus, creating a natural bokeh effect that " +
        "draws attention to the main subject. Camera movement is smooth and deliberate.";
      
    default:
      let response = `I'm your Canvas Assistant. I've processed your input: "${input}"\n\n` +
        "I can help you write scripts, create scene descriptions, or generate image prompts for your Canvas project. " +
        "What would you like to work on today?";
        
      // Add project context if available
      if (projectData && projectData.project) {
        response += `\n\nI'm referencing your project "${projectData.project.title}" ` +
          `which has ${projectData.scenes?.length || 0} scenes.`;
          
        if (projectData.project.full_script) {
          response += " Your project already has a full script that I can help you refine or expand.";
        }
      }
      
      return response;
  }
}
