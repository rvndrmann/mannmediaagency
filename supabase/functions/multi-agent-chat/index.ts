
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { processFunctionCall, shouldPreventHandoff, streamFunctionCall } from "./handleFunctions.ts";
import { createStreamResponse, iteratorToStream, supabase } from "./supabaseClient.ts";

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

// Check if error is an OpenAI quota exceeded error
function isQuotaExceededError(error: any): boolean {
  if (!error) return false;
  
  // Check the error message
  const errorMessage = error.message || (typeof error === 'string' ? error : '');
  const errorObj = error.error || {};
  
  // Check for known quota error patterns
  return (
    errorMessage.includes('insufficient_quota') ||
    errorMessage.includes('exceeded your current quota') ||
    errorMessage.includes('You exceeded your current quota') ||
    errorObj?.type === 'insufficient_quota' ||
    errorObj?.code === 'insufficient_quota' ||
    error.status === 429
  );
}

// Helper to generate a unique request ID
function generateRequestId(): string {
  return crypto.randomUUID();
}

// Function to detect if text appears to be a script (has common script elements)
function isScriptContent(text: string): boolean {
  const scriptPatterns = [
    /FADE IN:/i,
    /FADE OUT/i,
    /INT\./i,
    /EXT\./i,
    /CUT TO:/i,
    /DISSOLVE TO:/i,
    /SCENE \d+/i,
    /\(\s*beat\s*\)/i,
    /\(\s*pause\s*\)/i,
    /\(\s*cont(?:'|')?d\s*\)/i,
    /CHARACTER NAME:/i,
    /V\.O\./i,
    /O\.S\./i,
  ];
  
  // Check if the text contains at least 2 script patterns
  let matchCount = 0;
  for (const pattern of scriptPatterns) {
    if (pattern.test(text)) {
      matchCount++;
      if (matchCount >= 2) {
        return true;
      }
    }
  }
  
  return false;
}

// Function to call OpenAI API with streaming support
async function callOpenAI(payload: any, requestId: string, retryCount = 0) {
  const maxRetries = 3;
  const url = "https://api.openai.com/v1/chat/completions";
  
  const { useStream, ...apiPayload } = payload;
  
  logInfo(`[${requestId}] Calling OpenAI API (attempt ${retryCount + 1}/${maxRetries + 1})`, {
    url,
    method: "POST",
  });
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        ...apiPayload,
        stream: useStream || false
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP error ${response.status}`;
      
      // Handle rate limits with exponential backoff
      if (response.status === 429 && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        logInfo(`[${requestId}] Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return callOpenAI(payload, requestId, retryCount + 1);
      }
      
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }
    
    // Handle streaming response differently
    if (useStream) {
      return response.body;
    }
    
    // Handle regular response
    return await response.json();
  } catch (error) {
    // Retry on network errors or timeouts
    if ((error.name === 'TypeError' || error.name === 'AbortError') && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
      logInfo(`[${requestId}] Network error, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callOpenAI(payload, requestId, retryCount + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  const requestId = generateRequestId();
  logInfo(`[${requestId}] Received new request`);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    
    // Parse request body
    let reqBody;
    try {
      reqBody = await req.json();
    } catch (error) {
      throw new Error(`Invalid JSON in request body: ${error.message}`);
    }
    
    const {
      agentType = "main",
      input = "",
      userId,
      runId,
      groupId,
      contextData = {},
      conversationHistory = [],
      attachments = [],
      usePerformanceModel = false, 
      enableDirectToolExecution = false,
      streamResponse = false // New parameter for streaming support
    } = reqBody;
    
    // Basic validation
    if (!input.trim() && !attachments.length) {
      throw new Error("No input or attachments provided");
    }
    
    if (!userId) {
      throw new Error("User ID is required");
    }
    
    // Log request details
    logInfo(`[${requestId}] Received request from user ${userId}`, {
      agentType,
      inputLength: input.length,
      attachmentsCount: attachments.length,
      hasContextData: Object.keys(contextData).length > 0,
      conversationHistoryItems: conversationHistory.length,
      handoffContinuation: !!contextData.isHandoffContinuation,
      previousAgentType: contextData.previousAgentType || "main",
      runId,
      groupId
    });
    
    // Check for project context
    if (contextData.projectId) {
      const { title, scenes = [] } = contextData.projectDetails || {};
      
      logInfo(`[${requestId}] Request includes project context for project ${contextData.projectId}`, {
        title,
        scenesCount: scenes.length,
        hasFullScript: !!contextData.projectDetails?.fullScript
      });
    }
    
    // Process conversation history
    logInfo(`[${requestId}] Processing conversation history with ${conversationHistory.length} messages`);
    
    // Process conversation history to create messages array for OpenAI API
    const messages = [];
    
    // Add system message with agent instructions
    const agentInstructions = contextData?.instructions?.[agentType] || getDefaultInstructions(agentType);
    messages.push({
      role: "system",
      content: agentInstructions,
    });
    
    // Add messages from conversation history
    let hasUserMessage = false;
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        // Skip system messages in history since we already added a system message
        if (msg.role === "system") continue;
        
        // Track if we've seen a user message
        if (msg.role === "user") {
          hasUserMessage = true;
        }
        
        // Convert to OpenAI message format
        let content = msg.content || "";
        
        // If this is an assistant message with handoff data, include that
        if (msg.role === "assistant" && msg.handoffRequest) {
          content += `\n\n[Handoff requested to ${msg.handoffRequest.targetAgent} agent: ${msg.handoffRequest.reason}]`;
        }
        
        messages.push({
          role: msg.role,
          content: content,
        });
      }
    }
    
    // Add continuity data for handoffs
    if (contextData.isHandoffContinuation && contextData.previousAgentType && contextData.handoffReason) {
      // Enhanced handoff information
      logInfo(`[${requestId}] Added enhanced handoff continuation context from ${contextData.previousAgentType} to ${agentType}`);
      
      // Add specific instructions for the handoff
      if (contextData.continuityData) {
        logInfo(`[${requestId}] Added continuity data to context`, contextData.continuityData);
        
        // Enhance user input for specialized agents
        if (agentType === "script") {
          // Make sure the last message is a user message, or add one
          if (!hasUserMessage) {
            const enhancedInput = `${input}\n\n[IMPORTANT: You are the script writer. The user is expecting you to write a complete script. Don't just talk about it - WRITE THE SCRIPT NOW.]`;
            messages.push({
              role: "user",
              content: enhancedInput,
            });
            
            logInfo(`[${requestId}] Enhanced user message with explicit script agent instructions and existing script`);
          }
        } else if (agentType === "image") {
          // Similar enhancement for image agent
          if (!hasUserMessage) {
            const enhancedInput = `${input}\n\n[IMPORTANT: You are the image generator. The user is expecting detailed image prompts. Don't just talk about it - WRITE THE IMAGE PROMPTS NOW.]`;
            messages.push({
              role: "user",
              content: enhancedInput,
            });
            
            logInfo(`[${requestId}] Enhanced user message with explicit image agent instructions`);
          }
        } else if (agentType === "scene") {
          // Enhancement for scene creator
          if (!hasUserMessage) {
            const enhancedInput = `${input}\n\n[IMPORTANT: You are the scene creator. The user is expecting detailed scene descriptions. Write detailed and visual scene descriptions that can be used to generate images.]`;
            messages.push({
              role: "user",
              content: enhancedInput,
            });
            
            logInfo(`[${requestId}] Enhanced user message with explicit scene creator instructions`);
          }
        }
      }
    }
    
    // If we don't have a user message yet, add the current input
    if (!hasUserMessage) {
      messages.push({
        role: "user",
        content: input,
      });
    }
    
    logInfo(`[${requestId}] Processed ${messages.length} messages from history`, { 
      lastMessage: messages[messages.length - 1]?.role
    });
    
    // Define functions for tool use
    const functions = [];
    
    // All agents can respond directly
    functions.push({
      name: "agentResponse",
      description: "Use this function to respond directly to the user with text",
      parameters: {
        type: "object",
        properties: {
          completion: {
            type: "string",
            description: "Your response to the user"
          }
        },
        required: ["completion"]
      }
    });
    
    // Define handoff functions (different for each agent)
    if (agentType === "main") {
      functions.push(
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
                  },
                  originalRequest: {
                    type: "string",
                    description: "The original request from the user"
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
                  },
                  originalRequest: {
                    type: "string",
                    description: "The original request from the user"
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
                  },
                  originalRequest: {
                    type: "string",
                    description: "The original request from the user"
                  }
                }
              }
            },
            required: ["reason"]
          }
        }
      );
    } else if (enableDirectToolExecution || agentType === "tool") {
      // Tool execution function available to the specialized agent and tool agent
      functions.push({
        name: "save_content_to_project",
        description: "Save content to a Canvas project",
        parameters: {
          type: "object",
          properties: {
            contentType: {
              type: "string",
              enum: ["script", "scene", "image_prompt", "voice_over"],
              description: "The type of content to save"
            },
            content: {
              type: "string",
              description: "The content to save"
            },
            sceneId: {
              type: "string",
              description: "The ID of the scene to save the content to (not needed for full scripts)"
            }
          },
          required: ["contentType", "content"]
        }
      });
    }
    
    // Prepare OpenAI payload
    const model = usePerformanceModel ? "gpt-4o-mini" : "gpt-4o";
    const payload = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
      presence_penalty: 0,
      frequency_penalty: 0,
      functions,
      function_call: "auto",
      useStream: streamResponse // Add streaming flag
    };
    
    logInfo(`[${requestId}] Calling OpenAI API with ${messages.length} messages`, {
      model,
      agentType,
      functionsCount: functions.length,
      isHandoffContinuation: !!contextData.isHandoffContinuation,
      previousAgent: contextData.previousAgentType || "main",
      handoffReason: contextData.handoffReason || ""
    });
    
    // Handle streaming response
    if (streamResponse) {
      const streamingBody = await callOpenAI(payload, requestId);
      
      // Handle processing of the streamFunctionCall
      const processedStream = streamFunctionCall(streamingBody, requestId);
      
      // Create a streaming response
      return createStreamResponse(processedStream);
    }
    
    // Handle regular (non-streaming) response
    const data = await callOpenAI(payload, requestId);
    
    // Extract the response
    const response = data.choices[0].message;
    const responseContent = response.content || "";
    const functionCall = response.function_call || null;
    
    // Check if it's a direct text response
    if (responseContent && !functionCall) {
      logInfo(`[${requestId}] Plain text response (no function call)`, { responseLength: responseContent.length });
      
      const isScript = isScriptContent(responseContent);
      logInfo(`[${requestId}] Generated response for ${agentType} agent`, { 
        responseLength: responseContent.length,
        isScript
      });
      
      // Return the agent's response
      return new Response(
        JSON.stringify({
          responseText: responseContent,
          isScript,
          agentType,
          requestId,
          runId,
          groupId,
          handoff: null,
          structuredOutput: null,
          streaming: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Handle function calls
    if (functionCall) {
      logInfo(`[${requestId}] Function call detected: ${functionCall.name}`, { argsLength: functionCall.arguments?.length || 0 });
      
      // Check if we should prevent handoff for simple messages
      if (shouldPreventHandoff(input) && functionCall.name.startsWith("transfer_to_")) {
        logInfo(`[${requestId}] Preventing handoff for simple message '${input}'`);
        console.log("Preventing automatic handoff for simple greeting or short message");
        
        // If it's a simple message, don't handoff but still respond helpfully
        const { name, arguments: argsStr } = functionCall;
        const args = JSON.parse(argsStr || "{}");
        
        // Generate a direct response instead
        logInfo(`[${requestId}] Generated response for ${agentType} agent (prevented handoff for simple message)`, { 
          responseLength: args.reason?.length || 0,
          originalFunction: name,
          hasStructuredOutput: false
        });
        
        // Return a helpful response instead of handoff
        return new Response(
          JSON.stringify({
            responseText: `Hello! I'm your ${agentType} assistant. How can I help you today?`,
            isScript: false,
            agentType,
            requestId,
            runId,
            groupId,
            handoff: null,
            structuredOutput: null,
            streaming: false
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { name, arguments: argsStr } = functionCall;
      const args = JSON.parse(argsStr || "{}");
      
      // Process the function call
      const { responseText, handoff, structuredOutput, isScript } = await processFunctionCall(
        name,
        args,
        requestId,
        userId,
        contextData.projectId,
        agentType
      );
      
      logInfo(`[${requestId}] Generated response for ${agentType} agent via function call`, { 
        responseLength: responseText.length,
        isScript,
        hasHandoff: !!handoff,
        hasStructuredOutput: !!structuredOutput
      });
      
      // Return the processed function call result
      return new Response(
        JSON.stringify({
          responseText,
          isScript,
          agentType,
          requestId,
          runId,
          groupId,
          handoff,
          structuredOutput,
          streaming: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Fallback response if nothing else matched
    return new Response(
      JSON.stringify({
        responseText: "I'm not sure how to respond to that. Could you please rephrase your request?",
        isScript: false,
        agentType,
        requestId,
        runId,
        groupId,
        handoff: null,
        structuredOutput: null,
        streaming: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    logError(`[${requestId}] Error processing request:`, error);
    
    // Check for quota exceeded errors
    if (isQuotaExceededError(error)) {
      return new Response(
        JSON.stringify({
          responseText: "OpenAI API quota exceeded. Please try again later or contact support.",
          error: "QUOTA_EXCEEDED",
          errorMessage: error.message || "OpenAI API quota exceeded",
          streaming: false
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({
        responseText: "An error occurred while processing your request. Please try again.",
        error: "PROCESSING_ERROR",
        errorMessage: error.message || "Unknown error",
        streaming: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Default instructions for different agent types
function getDefaultInstructions(agentType: string): string {
  switch (agentType) {
    case "main":
      return `You are a helpful AI assistant focused on general tasks. You help users with their Canvas video projects by accessing scene content including scripts, image prompts, scene descriptions, and voice over text.`;
    case "script":
      return `You specialize in writing scripts for video projects. When asked to write a script, you MUST provide a complete, properly formatted script, not just talk about it. You can extract, view, and edit scripts for video projects.`;
    case "image":
      return `You specialize in creating detailed image prompts. You can see, create, and edit image prompts for scenes in Canvas projects. Your prompts should be detailed and specific to generate high-quality images.`;
    case "tool":
      return `You specialize in executing tools and technical tasks. You can use the canvas_content tool to view and edit content in Canvas scenes, including scripts, image prompts, scene descriptions, and voice over text.`;
    case "scene":
      return `You specialize in creating detailed visual scene descriptions for video projects. When creating scene descriptions, focus on visual details that would be important for image generation.`;
    default:
      return `You are a helpful AI assistant.`;
  }
}
