
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

interface Tool {
  name: string;
  description: string;
  execute: (params: any, context: any) => Promise<any>;
}

interface Agent {
  name: string;
  description: string;
  tools: Tool[];
  processInput: (input: string, context: any) => Promise<any>;
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
    
    // Create Supabase client for data operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Define available tools
    const tools: Tool[] = [
      {
        name: "canvas-script",
        description: "Generate or update script content for a Canvas scene",
        execute: async (params, ctx) => {
          // In a real implementation, this would call a service or OpenAI
          return {
            success: true,
            content: `Generated script based on: ${params.prompt}`,
          };
        }
      },
      {
        name: "canvas-description",
        description: "Generate or update scene description for a Canvas scene",
        execute: async (params, ctx) => {
          return {
            success: true,
            content: `Generated scene description based on: ${params.prompt}`,
          };
        }
      },
      {
        name: "canvas-image-prompt",
        description: "Generate or update image prompt for a Canvas scene",
        execute: async (params, ctx) => {
          return {
            success: true,
            content: `Generated image prompt based on: ${params.prompt}`,
          };
        }
      }
    ];
    
    // Create agent instance
    const agent: Agent = {
      name: "Canvas Assistant",
      description: `An AI assistant specialized in ${agentType} tasks for Canvas projects`,
      tools,
      processInput: async (input, context) => {
        // Determine which tool to use based on the input and agent type
        let toolName: string;
        
        switch (agentType) {
          case 'script':
            toolName = "canvas-script";
            break;
          case 'image':
            toolName = "canvas-image-prompt";
            break;
          case 'scene':
            toolName = "canvas-description";
            break;
          default:
            // For general assistant, analyze input to determine the right tool
            if (input.includes("script") || input.includes("dialogue")) {
              toolName = "canvas-script";
            } else if (input.includes("image") || input.includes("visual")) {
              toolName = "canvas-image-prompt";
            } else if (input.includes("scene") || input.includes("describe")) {
              toolName = "canvas-description";
            } else {
              toolName = "canvas-script"; // Default to script tool
            }
        }
        
        // Find the selected tool
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
          return {
            success: false,
            error: `Tool ${toolName} not found`,
          };
        }
        
        // Execute the tool
        return await tool.execute({ prompt: input }, { ...context, projectId, sessionId });
      }
    };
    
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
    
    // Process the input with the agent
    const result = await agent.processInput(input, { ...context, projectData });
    
    console.log(`Agent processed input for ${agentType} agent:`, result);
    
    // Return the response
    return new Response(
      JSON.stringify({
        success: true,
        response: result.content || "Task completed successfully",
        data: result,
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
