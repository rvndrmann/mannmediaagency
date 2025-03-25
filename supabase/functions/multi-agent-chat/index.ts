
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define agent types and models
const AGENT_MODELS = {
  "main": "gpt-4o",
  "script": "gpt-4o",
  "image": "gpt-4o",
  "tool": "gpt-4o",
  "scene": "gpt-4o",
  "browser": "gpt-4o-mini",
  "product-video": "gpt-4o-mini",
  "custom-video": "gpt-4o-mini",
};

// Define agent instructions
const AGENT_INSTRUCTIONS = {
  "main": "You are the main assistant, capable of answering general questions and coordinating with other specialized agents.",
  "script": "You are a script writing assistant, specialized in creating compelling narratives and dialogue.",
  "image": "You are an image prompt specialist, helping users create detailed prompts for image generation.",
  "tool": "You are a tool agent that helps execute specialized tools like browser automation and video generation.",
  "scene": "You are a scene description specialist, helping users set scenes for creative content.",
  "browser": "You are a browser automation specialist, able to browse the web and perform tasks.",
  "product-video": "You are a product video specialist, creating compelling video content for products.",
  "custom-video": "You are a custom video specialist, creating personalized video content."
};

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] New request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }

    const { messages, agentType = "main", contextData = {} } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid request: messages array is required");
    }

    console.log(`[${requestId}] Processing ${messages.length} messages for agent type: ${agentType}`);
    
    // Check if this is a valid agent type
    if (!AGENT_MODELS[agentType]) {
      console.warn(`[${requestId}] Unknown agent type: ${agentType}, falling back to main`);
    }
    
    // Prepare the model to use
    const model = contextData.usePerformanceModel ? "gpt-4o-mini" : (AGENT_MODELS[agentType] || "gpt-4o");
    console.log(`[${requestId}] Using model: ${model}`);
    
    // Prepare system instruction based on agent type
    const systemInstruction = AGENT_INSTRUCTIONS[agentType] || AGENT_INSTRUCTIONS.main;
    
    // Enhance system instruction with context data
    let enhancedInstruction = systemInstruction;
    
    if (contextData.enableDirectToolExecution) {
      enhancedInstruction += " You can execute tools directly.";
    }
    
    if (contextData.isHandoffContinuation) {
      enhancedInstruction += " This conversation was handed off to you from another agent.";
    }
    
    if (contextData.availableTools && Array.isArray(contextData.availableTools)) {
      enhancedInstruction += " Available tools: " + contextData.availableTools.map(t => t.name).join(", ") + ".";
    }
    
    if (contextData.requestedTool) {
      enhancedInstruction += ` The user has specifically requested to use the ${contextData.requestedTool} tool.`;
    }

    // Prepare messages for OpenAI
    const openAIMessages = [
      { role: "system", content: enhancedInstruction },
      ...messages
    ];
    
    console.log(`[${requestId}] Sending request to OpenAI with ${openAIMessages.length} messages`);

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] OpenAI API error (${response.status}): ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const openAIResponse = await response.json();
    
    if (!openAIResponse.choices || openAIResponse.choices.length === 0) {
      throw new Error("Invalid response from OpenAI API");
    }

    const completion = openAIResponse.choices[0].message.content;
    console.log(`[${requestId}] Received completion from OpenAI (${completion.length} chars)`);

    // Check if there's a handoff request
    let handoffRequest = null;
    const handoffRegex = /HANDOFF TO:\s*(\w+)(?:\s+REASON:\s*([^\n]+))?/i;
    const handoffMatch = completion.match(handoffRegex);
    
    if (handoffMatch) {
      handoffRequest = {
        targetAgent: handoffMatch[1].toLowerCase(),
        reason: handoffMatch[2] || "No reason specified"
      };
      console.log(`[${requestId}] Detected handoff request to: ${handoffRequest.targetAgent}`);
    }

    // Return the response
    return new Response(
      JSON.stringify({
        completion: completion,
        handoffRequest: handoffRequest,
        modelUsed: model
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        completion: "I'm sorry, there was an error processing your request. Please try again."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
