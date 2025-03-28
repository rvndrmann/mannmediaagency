
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get OpenAI API key from environment variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Helper function for consistent logging
function logInfo(message: string, data?: any) {
  console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
}

function logError(message: string, error: any) {
  console.error(`[ERROR] ${message}`, error);
  if (error instanceof Error) {
    console.error(`Stack trace: ${error.stack}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  
  try {
    // Check if OpenAI API key is configured
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.");
    }

    const { 
      input, 
      attachments, 
      agentType, 
      userId, 
      usePerformanceModel, 
      enableDirectToolExecution, 
      tracingDisabled, 
      contextData, 
      metadata, 
      runId, 
      groupId 
    } = await req.json();

    logInfo(`[${requestId}] Received request from user ${userId}`, { 
      agentType, 
      inputLength: input?.length, 
      attachmentsCount: attachments?.length || 0,
      hasContextData: !!contextData,
      runId,
      groupId
    });
    
    // Extract instructions from contextData if available
    const instructions = contextData?.instructions || getDefaultInstructions(agentType);

    // Set the model based on performance flag
    const model = usePerformanceModel ? "gpt-4o-mini" : "gpt-4o";
    
    // Build the system message with agent-specific instructions
    const systemMessage = {
      role: "system", 
      content: instructions
    };
    
    // Build the user message with input and context
    let userMessage = `${input}`;
    
    // Add additional context if needed
    if (contextData) {
      if (contextData.hasAttachments && attachments && attachments.length > 0) {
        userMessage += `\n\nI've attached ${attachments.length} file(s) for your reference.`;
        // We would process attachments here - for now just acknowledge them
      }

      if (contextData.isHandoffContinuation) {
        userMessage += `\n\nThis conversation was handed off from the ${
          contextData.previousAgentType || 'previous'
        } agent to help with specialized assistance.`;
      }

      // If we're a tool agent, add available tools context
      if (agentType === 'tool' && contextData.availableTools) {
        userMessage += `\n\nAvailable tools: ${JSON.stringify(contextData.availableTools, null, 2)}`;
      }
    }
    
    // Prepare the function calling schema for structured output
    const functions = [
      {
        name: "agentResponse",
        description: "Generate a structured response from the agent",
        parameters: {
          type: "object",
          properties: {
            completion: {
              type: "string",
              description: "The assistant's response to the user's input"
            },
            handoffRequest: {
              type: "object",
              description: "Optional request to hand off to another agent",
              properties: {
                targetAgent: {
                  type: "string",
                  description: "The type of agent to hand off to (main, script, image, tool, scene)"
                },
                reason: {
                  type: "string",
                  description: "The reason for the handoff"
                }
              },
              required: ["targetAgent", "reason"]
            },
            commandSuggestion: {
              type: "object",
              description: "Optional tool command suggestion",
              properties: {
                name: {
                  type: "string",
                  description: "The name of the tool to execute"
                },
                parameters: {
                  type: "object",
                  description: "Parameters for the tool execution"
                }
              },
              required: ["name"]
            },
            structured_output: {
              type: "object",
              description: "Optional structured data output"
            }
          },
          required: ["completion"]
        }
      }
    ];

    // Call OpenAI API for the response
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          systemMessage,
          { role: "user", content: userMessage }
        ],
        functions: functions,
        function_call: { name: "agentResponse" },
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    // Parse the OpenAI response
    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorData}`);
    }

    const openAIData = await openAIResponse.json();
    
    // Extract the function call response
    const functionCall = openAIData.choices[0]?.message?.function_call;
    
    if (!functionCall || functionCall.name !== "agentResponse") {
      throw new Error("Invalid response format from OpenAI API");
    }
    
    // Parse the function call arguments
    let responseData;
    try {
      responseData = JSON.parse(functionCall.arguments);
    } catch (error) {
      throw new Error(`Failed to parse function arguments: ${error.message}`);
    }
    
    // Check if we should automatically handoff to a specialized agent
    if (!responseData.handoffRequest) {
      const detectedHandoff = checkForHandoff(input, agentType);
      if (detectedHandoff && detectedHandoff !== agentType) {
        responseData.handoffRequest = {
          targetAgent: detectedHandoff,
          reason: `Your request about "${getShortSummary(input)}" would be better handled by our ${getAgentName(detectedHandoff)}.`
        };
      }
    }
    
    // Check if the input might require a tool
    if (enableDirectToolExecution && !responseData.commandSuggestion && shouldSuggestTool(input)) {
      responseData.commandSuggestion = suggestToolCommand(input);
    }
    
    logInfo(`[${requestId}] Generated response for ${agentType} agent`, {
      responseLength: responseData.completion.length,
      hasHandoff: !!responseData.handoffRequest,
      hasStructuredOutput: !!responseData.structured_output
    });

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    logError(`[${requestId}] Error processing request:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unknown error occurred",
        requestId: requestId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});

// Helper functions

// Get default instructions based on agent type
function getDefaultInstructions(agentType: string): string {
  switch(agentType) {
    case 'main':
    case 'assistant':
      return `You are a helpful AI assistant. Provide clear, accurate responses to user questions. 
      If you can't answer something, be honest about it. 
      If a specialized agent would be better suited, you can suggest a handoff.
      
      For certain specialized tasks, we have dedicated agents:
      - Script Writer for creative content like ad scripts
      - Image Prompt for generating image descriptions
      - Tool Helper for technical assistance with our tools
      - Scene Creator for detailed visual descriptions
      
      Be professional, friendly, and helpful. Always consider the user's needs and provide the most helpful response possible.`;
      
    case 'script':
      return `You are a creative script writing assistant. Help users create compelling narratives, ad scripts, and other written content.
      
      Focus on engaging dialogue, effective storytelling, and proper formatting for scripts. Consider the target audience, medium, and purpose of the script.
      
      If a user asks for an ad script, make sure to include:
      - Clear hook or attention-grabber
      - Value proposition
      - Key benefits or features
      - Call to action
      
      For narratives or storytelling:
      - Develop interesting characters and settings
      - Create engaging plot arcs
      - Incorporate appropriate tone and pacing
      
      Be creative, but also practical. Consider the feasibility of production for any scripts you create.`;
      
    case 'image':
      return `You are an image generation specialist. Help users craft detailed image prompts that will produce high-quality results.
      
      Focus on these key aspects when creating image prompts:
      - Visual details: describe colors, lighting, composition, perspective
      - Style: specify art style, medium, technique, or artistic influence
      - Mood and atmosphere: convey the feeling or emotion of the image
      - Subject focus: clearly describe the main subject and any background elements
      
      Avoid:
      - Vague descriptions that could be interpreted in multiple ways
      - Prompts that violate content policies (violent, explicit, or harmful content)
      - Over-complicated prompts with too many conflicting elements
      
      Help users refine their ideas into clear, specific prompts that will generate impressive images.`;
      
    case 'tool':
      return `You are a technical tool specialist. Guide users through using various tools and APIs. Provide clear instructions and help troubleshoot issues.
      
      When helping with tools:
      - Explain what the tool does and when to use it
      - Provide step-by-step instructions for using the tool
      - Suggest appropriate parameters or settings
      - Help interpret the tool's output or results
      
      If a user is experiencing issues with a tool:
      - Help diagnose the problem
      - Suggest troubleshooting steps
      - Recommend alternatives if the tool isn't appropriate
      
      Be technical but accessible. Use clear language and explain complex concepts in understandable terms.`;
      
    case 'scene':
      return `You are a scene creation expert. Help users visualize and describe detailed environments and settings for creative projects.
      
      When crafting scene descriptions, focus on:
      - Sensory details: what can be seen, heard, smelled, felt in the scene
      - Spatial relationships: layout, distances, positioning of elements
      - Atmosphere and mood: lighting, weather, time of day, emotional tone
      - Key elements: important objects, features, or characters in the scene
      
      Tailor your descriptions to the user's specific needs:
      - For film/video: consider camera angles, movement, and visual composition
      - For writing: focus on evocative language and narrative significance
      - For gaming: consider interactivity and player experience
      
      Create vivid, immersive scenes that help bring the user's vision to life.`;
      
    default:
      return "You are a helpful AI assistant. Answer questions clearly and concisely.";
  }
}

// Check if the input should be handed off to a specialized agent
function checkForHandoff(input: string, currentAgentType: string): string | null {
  if (!input) return null;
  
  const inputLower = input.toLowerCase();
  
  // Don't handoff if we're already using the specialized agent
  if (
    (currentAgentType === 'script' && (inputLower.includes('script') || inputLower.includes('write') || inputLower.includes('content'))) ||
    (currentAgentType === 'image' && (inputLower.includes('image') || inputLower.includes('picture') || inputLower.includes('photo'))) ||
    (currentAgentType === 'tool' && (inputLower.includes('tool') || inputLower.includes('browser'))) ||
    (currentAgentType === 'scene' && (inputLower.includes('scene') || inputLower.includes('visual')))
  ) {
    return null;
  }
  
  // Check for script-related keywords
  if (inputLower.includes('script') || inputLower.includes('write') || 
      inputLower.includes('story') || inputLower.includes('narrative') || 
      inputLower.includes('ad') || inputLower.includes('content')) {
    return 'script';
  }
  
  // Check for image-related keywords
  if (inputLower.includes('image') || inputLower.includes('picture') || 
      inputLower.includes('photo') || inputLower.includes('visual') ||
      inputLower.includes('illustration')) {
    return 'image';
  }
  
  // Check for tool-related keywords
  if (inputLower.includes('tool') || inputLower.includes('browser') || 
      inputLower.includes('automate') || inputLower.includes('website')) {
    return 'tool';
  }
  
  // Check for scene-related keywords
  if (inputLower.includes('scene') || inputLower.includes('setting') || 
      inputLower.includes('environment') || inputLower.includes('location')) {
    return 'scene';
  }
  
  return null;
}

// Check if we should suggest a tool based on the input
function shouldSuggestTool(input: string): boolean {
  if (!input) return false;
  
  const inputLower = input.toLowerCase();
  return inputLower.includes('browser') || 
         inputLower.includes('website') || 
         inputLower.includes('automate') ||
         inputLower.includes('video') ||
         inputLower.includes('youtube');
}

// Suggest a tool command based on input
function suggestToolCommand(input: string): any {
  const inputLower = input.toLowerCase();
  
  if (inputLower.includes('browser') || inputLower.includes('website')) {
    return {
      name: "browser-use",
      parameters: {
        task: `Go to ${inputLower.includes('website') ? extractWebsite(input) : 'google.com'} and take a screenshot`,
        browserConfig: { headless: false }
      }
    };
  }
  
  if (inputLower.includes('video') || inputLower.includes('animate')) {
    return {
      name: "image-to-video",
      parameters: {
        prompt: "Convert the uploaded image to a smooth animation",
        aspectRatio: "16:9",
        duration: "5"
      }
    };
  }
  
  return null;
}

// Extract a website from the input text
function extractWebsite(input: string): string {
  // Simple regex to extract something that looks like a website
  const matches = input.match(/\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/);
  return matches ? matches[0] : 'google.com';
}

// Get a readable name for the agent type
function getAgentName(agentType: string): string {
  switch(agentType) {
    case 'script': return 'Script Writer';
    case 'image': return 'Image Prompt Generator';
    case 'tool': return 'Tool Helper';
    case 'scene': return 'Scene Creator';
    default: return 'Assistant';
  }
}

// Get a short summary of the input (first 30 chars)
function getShortSummary(input: string): string {
  if (!input) return "";
  return input.length > 30 ? input.substring(0, 30) + '...' : input;
}
