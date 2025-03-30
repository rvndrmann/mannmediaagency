
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
  messageHistory?: Array<{role: string, content: string}>;
}

interface HandoffData {
  targetAgent: string;
  reason: string;
  additionalContext?: Record<string, any>;
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
      console.error("OPENAI_API_KEY is not configured");
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
      context = {},
      messageHistory = []
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
    
    // Create conversation history based on provided messages or start fresh
    let messages = [];
    
    if (messageHistory && messageHistory.length > 0) {
      // Use provided message history
      messages = [...messageHistory];
      
      // Ensure the most recent user message is the input
      const lastUserMessageIndex = findLastIndex(messages, m => m.role === 'user');
      if (lastUserMessageIndex !== -1 && messages[lastUserMessageIndex].content !== input) {
        // Add the new input as a user message
        messages.push({
          role: "user",
          content: input
        });
      }
    } else {
      // Start a fresh conversation
      messages = [
        {
          role: "system",
          content: agentInstructions
        },
        {
          role: "user",
          content: input
        }
      ];
    }
    
    // Add project context if available
    if (projectId && Object.keys(projectData).length > 0) {
      const projectContext = `
Current project context:
Project ID: ${projectId}
Project Title: ${projectData.project?.title || "Untitled Project"}
Number of Scenes: ${projectData.scenes?.length || 0}
`;
      // Add project context to the system message
      if (messages[0]?.role === 'system') {
        messages[0].content += "\n\n" + projectContext;
      } else {
        messages.unshift({
          role: "system",
          content: agentInstructions + "\n\n" + projectContext
        });
      }
    }
    
    console.log("Sending to OpenAI with messages:", JSON.stringify(messages));
    
    // Define functions for tool use and agent handoffs
    const functions = [
      {
        name: "transfer_to_script_agent",
        description: "Transfer the conversation to a specialist who can write scripts and creative content",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Why the conversation should be transferred to the script agent"
            },
            additionalContext: {
              type: "object",
              description: "Additional context to provide to the script agent",
              properties: {
                requiresFullScript: {
                  type: "boolean",
                  description: "Whether the user needs a complete script"
                },
                scriptType: {
                  type: "string",
                  description: "The type of script needed (video, film, commercial, etc.)"
                }
              }
            }
          },
          required: ["reason"]
        }
      },
      {
        name: "transfer_to_image_agent",
        description: "Transfer the conversation to a specialist who can create image generation prompts",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Why the conversation should be transferred to the image agent"
            },
            additionalContext: {
              type: "object",
              description: "Additional context to provide to the image agent",
              properties: {
                imageStyle: {
                  type: "string",
                  description: "The desired style for the image (photo-realistic, cartoon, etc.)"
                },
                imageSubject: {
                  type: "string",
                  description: "The main subject of the image"
                }
              }
            }
          },
          required: ["reason"]
        }
      },
      {
        name: "transfer_to_scene_agent",
        description: "Transfer the conversation to a specialist who can create detailed scene descriptions",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Why the conversation should be transferred to the scene agent"
            },
            additionalContext: {
              type: "object",
              description: "Additional context to provide to the scene agent",
              properties: {
                sceneType: {
                  type: "string",
                  description: "The type of scene needed (interior, exterior, action, etc.)"
                }
              }
            }
          },
          required: ["reason"]
        }
      }
    ];
    
    // Add functions only if agent type is 'main' to enable handoffs
    const modelParams: any = {
      model: "gpt-4o", // Using the more capable model
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    };
    
    // Add functions for handoff capability only for main agent
    if (agentType === 'main') {
      modelParams.functions = functions;
      modelParams.function_call = 'auto';
    }
    
    // Make the OpenAI API request
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`
      },
      body: JSON.stringify(modelParams)
    });
    
    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("Error from OpenAI API:", openAIResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }
    
    const data = await openAIResponse.json();
    console.log("OpenAI response:", JSON.stringify(data));
    
    let generatedContent = data.choices[0].message.content || "";
    let handoff: HandoffData | null = null;
    
    // Handle function calls (for handoffs)
    if (data.choices[0].message.function_call) {
      const functionCall = data.choices[0].message.function_call;
      console.log("Function call detected:", functionCall.name);
      
      try {
        const args = JSON.parse(functionCall.arguments);
        
        if (functionCall.name.startsWith('transfer_to_')) {
          const targetAgent = functionCall.name.replace('transfer_to_', '').replace('_agent', '');
          handoff = {
            targetAgent,
            reason: args.reason,
            additionalContext: args.additionalContext
          };
          
          // Generate a transition message
          generatedContent = `I'll transfer you to our ${targetAgent} specialist. ${args.reason}`;
        }
      } catch (e) {
        console.error("Error processing function call:", e);
      }
    }
    
    // Update the message history with the assistant's response
    messages.push({
      role: "assistant",
      content: generatedContent
    });
    
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
              scene_count: projectData.scenes?.length || 0,
              trace: {
                runId: sessionId || crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                duration: data.usage ? data.usage.total_tokens : 0,
                summary: {
                  modelUsed: "gpt-4o",
                  success: true,
                  messageCount: messages.length
                }
              }
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
        agentType,
        messageHistory: messages,
        handoff
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
    "main": "You are a helpful AI assistant specialized in video creation and content. Your job is to help users with their video projects. If a user asks about writing scripts, creating image prompts, or scene descriptions, you should transfer them to the specialized agent for that task. Otherwise, respond to their questions directly.",
    "script": "You are a script writing expert. When asked to write a script, provide a complete, properly formatted script for video production. Always format your scripts professionally with scene headings, action descriptions, and dialogue.",
    "image": "You are an image prompt generator. Create detailed, vivid prompts for AI image generation that would work well for creating visuals for videos. Focus on describing the style, composition, lighting, and key visual elements.",
    "scene": "You are a scene creator specialized in describing detailed scene layouts for video production. Focus on visual details that would be important for image generation including setting, props, and character positions.",
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

// Helper function to find the last index of an item in an array that matches a condition
function findLastIndex<T>(array: T[], predicate: (value: T) => boolean): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return -1;
}
