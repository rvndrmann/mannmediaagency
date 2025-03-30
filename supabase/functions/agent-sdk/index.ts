
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
  userId?: string;
  context?: Record<string, any>;
}

serve(async (req) => {
  console.log(`Agent SDK function received request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get OpenAI API key from environment
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    
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
    
    const { 
      input, 
      projectId, 
      sessionId, 
      agentType = 'main', 
      userId,
      context = {} 
    } = requestData;
    
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
    const agentInstructions = getAgentInstructions(agentType, projectId ? true : false);
    
    // Prepare messages for OpenAI API
    const messages = [
      {
        role: "system",
        content: agentInstructions
      },
      {
        role: "user",
        content: input
      }
    ];
    
    // Add project context if available
    if (projectId && Object.keys(projectData).length > 0) {
      const projectContext = `
Current project context:
Project ID: ${projectId}
Project Title: ${projectData.project?.title || "Untitled Project"}
Number of Scenes: ${projectData.scenes?.length || 0}
`;
      // Add project context to the system message
      messages[0].content += "\n\n" + projectContext;
    }
    
    console.log("Sending to OpenAI with messages:", JSON.stringify(messages));
    
    // Make the OpenAI API request
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using a fast and efficient model
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("Error from OpenAI API:", openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }
    
    const data = await openAIResponse.json();
    console.log("OpenAI response:", JSON.stringify(data));
    
    const generatedContent = data.choices[0].message.content;
    
    // Log the interaction to the database if userId is provided
    if (userId) {
      try {
        await supabase
          .from("agent_interactions")
          .insert({
            user_id: userId,
            agent_type: agentType,
            user_message: input,
            assistant_response: generatedContent,
            project_id: projectId,
            has_attachments: false,
            metadata: {
              project_context: projectId ? true : false,
              scene_count: projectData.scenes?.length || 0
            }
          });
      } catch (logError) {
        console.error("Error logging interaction:", logError);
      }
    }
    
    // Return the response
    return new Response(
      JSON.stringify({
        success: true,
        response: generatedContent,
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

// Function to get instructions based on agent type
function getAgentInstructions(agentType: string, hasProjectContext: boolean): string {
  const baseInstructions = {
    "main": "You are a helpful AI assistant specialized in video creation and content. Respond to user queries with useful information and guidance.",
    "script": "You are a script writing expert. When asked to write a script, provide a complete, properly formatted script for video production.",
    "image": "You are an image prompt generator. Create detailed, vivid prompts for AI image generation that would work well for creating visuals for videos.",
    "scene": "You are a scene creator specialized in describing detailed scene layouts for video production. Focus on visual details that would be important for image generation.",
    "tool": "You are a technical assistant specializing in helping users understand and use video creation tools effectively.",
    "data": "You are a data analyst assistant that helps interpret metrics, analytics, and other data-related queries for content creators.",
  };
  
  // Get basic instructions based on agent type, or use main as fallback
  const instructions = baseInstructions[agentType] || baseInstructions.main;
  
  // Add project context enhancements if relevant
  if (hasProjectContext) {
    return `${instructions}\n\nYou have access to the current project context. When answering, take this context into account and tailor your responses to be relevant to the specific project the user is working on.`;
  }
  
  return instructions;
}
