
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get OpenAI API key from environment variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Helper function for standardized API responses
function createResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
}

// Helper function for error responses
function createErrorResponse(message: string, status = 500) {
  console.error(`Error: ${message}`);
  return createResponse({ success: false, error: message }, status);
}

// Helper for logging
function log(message: string, data?: any) {
  console.log(`[unified-agent] ${message}`, data ? JSON.stringify(data) : '');
}

// Call OpenAI API
async function callOpenAI(payload: any) {
  try {
    log("Calling OpenAI API", { model: payload.model });
    
    const url = "https://api.openai.com/v1/chat/completions";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    log("OpenAI API error", { error: error.message });
    throw error;
  }
}

// Process agent request
async function processAgentRequest(params: any) {
  try {
    log("Processing agent request", {
      agentType: params.agentType,
      inputLength: params.input?.length || 0,
      userId: params.userId,
      projectId: params.projectId,
      sessionId: params.sessionId,
    });
    
    // Validate agent type
    const agentType = params.agentType || "main";
    
    // Prepare system message based on agent type
    const agentInstructions = getAgentInstructions(agentType);
    
    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system",
        content: agentInstructions,
      },
      {
        role: "user",
        content: params.input || "Hello",
      }
    ];
    
    // Add context about the project if available
    if (params.projectId) {
      messages[0].content += `\n\nThis conversation is about project ${params.projectId}.`;
    }
    
    // Call OpenAI
    const openAIParams = {
      model: params.usePerformanceModel ? "gpt-4o-mini" : "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    };
    
    log("Calling OpenAI with parameters", { 
      model: openAIParams.model,
      agentType,
      messageCount: messages.length,
    });
    
    const result = await callOpenAI(openAIParams);
    
    log("Received response from OpenAI", { 
      choices: result.choices?.length || 0
    });
    
    // Process and return the response
    return {
      success: true,
      response: result.choices[0].message.content,
      agentType: agentType
    };
  } catch (error) {
    log("Error processing agent request", { error: error.message });
    throw error;
  }
}

// Get agent instructions based on agent type
function getAgentInstructions(agentType: string): string {
  switch (agentType) {
    case "main":
      return "You are a helpful AI assistant focused on general tasks. You help users with their questions and provide relevant information.";
    case "script":
      return "You are a script writer specializing in creating scripts for video content. When asked to write a script, you MUST provide a complete, properly formatted script, not just talk about it.";
    case "image":
      return "You are an image prompt generator specializing in creating detailed image prompts for AI image generation. Your prompts should be detailed and specific to generate high-quality images.";
    case "scene":
      return "You are a scene creator specializing in creating detailed scene descriptions for video content. When creating scene descriptions, focus on visual details that would be important for image generation.";
    case "tool":
      return "You are a tool assistant specializing in helping users with technical tasks and providing guidance on using various tools and applications.";
    case "data":
      return "You are a data agent specializing in helping users analyze and visualize data. You can suggest ways to interpret data and provide insights based on the information provided.";
    default:
      return "You are a helpful AI assistant. Your goal is to provide clear, accurate, and helpful responses to the user's questions.";
  }
}

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Check for OpenAI API key
    if (!OPENAI_API_KEY) {
      return createErrorResponse("OPENAI_API_KEY is not configured", 500);
    }
    
    // Parse request body
    let reqBody;
    try {
      reqBody = await req.json();
      log("Request body structure:", Object.keys(reqBody).join(", "));
    } catch (parseError) {
      return createErrorResponse(`Invalid JSON in request body: ${parseError.message}`, 400);
    }
    
    // Basic validation
    if (!reqBody.input?.trim()) {
      return createErrorResponse("No input provided", 400);
    }
    
    if (!reqBody.userId) {
      return createErrorResponse("User ID is required", 400);
    }
    
    // Process the agent request
    const result = await processAgentRequest(reqBody);
    
    // Return the response
    return createResponse(result);
  } catch (error) {
    return createErrorResponse(error.message || "Unknown error occurred");
  }
});
