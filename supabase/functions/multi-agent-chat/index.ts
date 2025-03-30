
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { processFunctionCall, shouldPreventHandoff } from "./handleFunctions.ts";

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

// Function to detect if text appears to be a script
function looksLikeScript(text: string): boolean {
  // Script markers to check for
  const scriptMarkers = [
    /SCENE \d+/i,
    /\bINT\.\s/i,
    /\bEXT\.\s/i,
    /FADE (IN|OUT)/i,
    /CUT TO:/i,
    /DISSOLVE TO:/i,
    /\bV\.O\.\b/i,
    /\bO\.S\.\b/i,
    /\(beat\)/i,
    /\(pause\)/i,
    /\(CONT'D\)/i,
    /^\s*[A-Z][A-Z\s]+(\(.*\))?:\s/m, // Character dialogue format
    /^\s*[A-Z][A-Z\s]+$/m // All caps character names
  ];
  
  // Check how many script markers we find
  let markerCount = 0;
  for (const marker of scriptMarkers) {
    if (marker.test(text)) {
      markerCount++;
    }
    // If we find 2 or more markers, it's likely a script
    if (markerCount >= 2) {
      return true;
    }
  }
  
  // Additional heuristics
  const hasSceneHeaders = /SCENE \d+|Scene \d+|INT\.|EXT\./.test(text);
  const hasCharacterDialogue = /^\s*[A-Z][A-Z\s]+:\s/m.test(text);
  const hasProperFormatting = text.includes('\n\n') && text.length > 300;
  
  // If it has scene headers and either character dialogue or proper formatting
  return hasSceneHeaders && (hasCharacterDialogue || hasProperFormatting);
}

// Function to extract script content
function extractScriptContent(text: string): string {
  // Try to find where the actual script begins
  const scriptStartMarkers = [
    "Here's your script:",
    "Here is the script:",
    "Here's the script:",
    "FADE IN:",
    "SCENE 1",
    "INT.",
    "EXT."
  ];
  
  for (const marker of scriptStartMarkers) {
    const index = text.indexOf(marker);
    if (index !== -1) {
      return text.substring(index);
    }
  }
  
  // If no clear marker, just return the text
  return text;
}

// Maximum retries for OpenAI API calls
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Function to handle OpenAI API calls with retry logic
async function callOpenAIWithRetry(url: string, options: RequestInit, requestId: string, retryCount = 0): Promise<Response> {
  try {
    // Add timeout to fetch request (8 seconds for initial call, 15 seconds for retries)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), retryCount > 0 ? 15000 : 8000);
    
    const fetchOptions = {
      ...options,
      signal: controller.signal,
    };
    
    logInfo(`[${requestId}] Calling OpenAI API (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`, {
      url: url.split('?')[0],
      method: options.method,
    });
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logError(`[${requestId}] OpenAI API error (status ${response.status})`, errorData);
      
      // Check for rate limiting (status 429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const retryDelayMs = retryAfter ? parseInt(retryAfter) * 1000 : INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
        
        if (retryCount < MAX_RETRIES) {
          logInfo(`[${requestId}] Rate limited. Retrying after ${retryDelayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          return callOpenAIWithRetry(url, options, requestId, retryCount + 1);
        }
      }
      
      throw new Error(`API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      logError(`[${requestId}] Request timed out`, error);
      
      if (retryCount < MAX_RETRIES) {
        const retryDelayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
        logInfo(`[${requestId}] Retrying after timeout (${retryDelayMs}ms)`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        return callOpenAIWithRetry(url, options, requestId, retryCount + 1);
      }
      
      throw new Error('Request timed out after multiple retries');
    }
    
    // For other errors, retry if we haven't reached the maximum
    if (retryCount < MAX_RETRIES) {
      const retryDelayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
      logInfo(`[${requestId}] Error occurred. Retrying after ${retryDelayMs}ms`, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      return callOpenAIWithRetry(url, options, requestId, retryCount + 1);
    }
    
    throw error;
  }
}

serve(async (req) => {
  const requestId = generateRequestId();
  logInfo(`[${requestId}] Received new request`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (!OPENAI_API_KEY) {
    logError(`[${requestId}] OPENAI_API_KEY is not configured`, null);
    return new Response(
      JSON.stringify({
        error: "OpenAI API key is not configured",
        message: "The AI service is not properly configured. Please contact support."
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
  
  try {
    const requestData = await req.json();
    const { 
      input, 
      attachments = [], 
      agentType = "main", 
      userId, 
      contextData = {},
      conversationHistory = [],
      metadata = {},
      usePerformanceModel = false,
      enableDirectToolExecution = false,
      tracingDisabled = false,
      runId,
      groupId
    } = requestData;
    
    logInfo(`[${requestId}] Received request from user ${userId}`, {
      agentType,
      inputLength: input?.length,
      attachmentsCount: attachments?.length,
      hasContextData: !!contextData,
      conversationHistoryItems: conversationHistory?.length,
      handoffContinuation: !!contextData.isHandoffContinuation,
      previousAgentType: contextData.previousAgentType || "main",
      runId,
      groupId
    });

    // Check for project context
    const projectId = metadata?.projectId || contextData?.projectId;
    const projectDetails = metadata?.projectDetails || contextData?.projectDetails;
    
    if (projectId && projectDetails) {
      logInfo(`[${requestId}] Request includes project context for project ${projectId}`, {
        title: projectDetails.title,
        scenesCount: projectDetails.scenes?.length || 0,
        hasFullScript: !!projectDetails.fullScript
      });
    }
    
    // Process conversation history
    logInfo(`[${requestId}] Processing conversation history with ${conversationHistory.length} messages`, null);
    const processedMessages = [];
    
    // Add agent instructions if provided
    if (contextData.instructions) {
      processedMessages.push({
        role: "system",
        content: contextData.instructions
      });
    } else {
      // Default system message based on agent type
      let systemMessage = "You are a helpful AI assistant.";
      
      if (agentType === "script") {
        systemMessage = `You are a specialized script writer. You MUST create and provide a properly formatted, complete script when asked to write a script.

The following are REQUIRED actions for you:
1. When asked to write a script, you MUST respond with a fully formed script, not just talk about one
2. Always format your script with scene headings (like INT. LOCATION - TIME)
3. Include character names in ALL CAPS before their dialogue
4. Include proper scene transitions (CUT TO:, FADE IN:, etc.)
5. Include descriptive action blocks for visuals

DO NOT just offer to help write a script or discuss script-writing techniques - actually WRITE THE COMPLETE SCRIPT in your response.`;

        // Add project script context if available
        if (projectDetails?.fullScript) {
          systemMessage += `\n\nThe project already has the following script that you can reference:\n\n${projectDetails.fullScript.substring(0, 1500)}${projectDetails.fullScript.length > 1500 ? '...(script continues)' : ''}`;
        }
      } else if (agentType === "image") {
        systemMessage = "You are specialized in creating detailed image prompts.";
      } else if (agentType === "scene") {
        systemMessage = "You are specialized in creating detailed visual scene descriptions for video projects. ALWAYS provide visual descriptions, not just talk about them.";
        // Add scene context if available
        if (projectDetails?.scenes && projectDetails.scenes.length > 0) {
          systemMessage += "\n\nThe project has the following scenes:";
          projectDetails.scenes.slice(0, 5).forEach((scene, index) => {
            systemMessage += `\n- Scene ${index + 1}: ${scene.title || 'Untitled'} ${scene.description ? `- ${scene.description.substring(0, 100)}${scene.description.length > 100 ? '...' : ''}` : ''}`;
          });
          if (projectDetails.scenes.length > 5) {
            systemMessage += `\n- (${projectDetails.scenes.length - 5} more scenes)`;
          }
        }
      } else if (agentType === "tool") {
        systemMessage = "You are specialized in executing tools and technical tasks.";
      } else {
        // Main agent - add project context
        if (projectDetails) {
          systemMessage = `You are a helpful AI assistant. You're currently working with a Canvas video project titled "${projectDetails.title}" (ID: ${projectId}).`;
          if (projectDetails.fullScript) {
            systemMessage += ` The project has a full script.`;
          }
          if (projectDetails.scenes?.length > 0) {
            systemMessage += ` It contains ${projectDetails.scenes.length} scenes.`;
          }
        }
      }
      
      processedMessages.push({
        role: "system",
        content: systemMessage
      });
    }
    
    // Add context about handoff if present
    if (contextData.isHandoffContinuation && contextData.previousAgentType) {
      let handoffContext = `You are now handling a conversation that was transferred from the ${contextData.previousAgentType} agent. `;
      
      if (contextData.handoffReason) {
        handoffContext += `Reason for transfer: ${contextData.handoffReason}`;
      }
      
      // Add context about any additional context passed during handoff
      if (contextData.continuityData && contextData.continuityData.additionalContext) {
        handoffContext += `\n\nAdditional context: ${JSON.stringify(contextData.continuityData.additionalContext)}`;
      }
      
      // Add project context again in the handoff
      if (projectId && projectDetails) {
        handoffContext += `\n\nThis conversation is about Canvas project "${projectDetails.title}" (ID: ${projectId}).`;
        if (projectDetails.fullScript) {
          handoffContext += ` The project has a full script that you can reference.`;
        }
      }
      
      processedMessages.push({
        role: "system",
        content: handoffContext
      });
      
      logInfo(`[${requestId}] Added enhanced handoff continuation context from ${contextData.previousAgentType} to ${agentType} `, null);
      
      // Add continuity data to context
      if (contextData.continuityData) {
        logInfo(`[${requestId}] Added continuity data to context`, contextData.continuityData);
      }
    }
    
    // Process and add relevant conversation history
    let lastMessageType = null;
    for (const message of conversationHistory) {
      if (message.role === "system") continue; // Skip system messages as we've added our own
      
      processedMessages.push({
        role: message.role,
        content: message.content
      });
      
      lastMessageType = message.role;
    }
    
    logInfo(`[${requestId}] Processed ${conversationHistory.length} messages from history`, {
      lastMessage: lastMessageType
    });
    
    // Special handling for script agent
    if (agentType === "script" && contextData.isHandoffContinuation) {
      // Add explicit instructions to make sure the script agent creates scene descriptions
      if (input) {
        // Enhanced prompt specifically for script creation
        let enhancedInput = `${input}\n\n[IMPORTANT INSTRUCTIONS: I need you to write a COMPLETE, PROPERLY FORMATTED SCRIPT. DO NOT just talk about writing a script - you MUST actually create and provide the full script in your response with proper formatting including scene headings (INT./EXT.), character names, dialogue, and action blocks.]`;
        
        // Add project script if available
        if (projectDetails?.fullScript) {
          enhancedInput += `\n\nThe project already has this script that you can reference or modify:\n\n${projectDetails.fullScript.substring(0, 1000)}${projectDetails.fullScript.length > 1000 ? '...(script continues)' : ''}`;
        }
        
        processedMessages.push({
          role: "user",
          content: enhancedInput
        });
        
        logInfo(`[${requestId}] Enhanced user message with explicit script agent instructions and existing script`, null);
      }
    } else {
      // Add the current input message
      if (input) {
        processedMessages.push({
          role: "user",
          content: input
        });
      }
    }
    
    // Set up OpenAI API request
    const model = usePerformanceModel ? "gpt-3.5-turbo" : "gpt-4o";
    
    // Prepare function definitions based on agent type
    let functions = [];
    let functionCall = "auto";
    
    if (agentType === "main") {
      functions = [
        {
          name: "transfer_to_script_agent",
          description: "Transfer the conversation to the specialized script writer agent when the user requests script writing help",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the script agent"
              },
              additionalContext: {
                type: "object",
                description: "Any additional context that would help the script agent (like script type, requirements, etc)",
                properties: {
                  scriptType: {
                    type: "string",
                    description: "The type of script requested (video, film, commercial, etc)"
                  }
                }
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "transfer_to_image_agent",
          description: "Transfer the conversation to the specialized image generation agent when the user requests help with image prompts",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the image agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "transfer_to_scene_agent",
          description: "Transfer the conversation to the specialized scene creator agent when the user requests help with scene descriptions",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the scene agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "transfer_to_tool_agent",
          description: "Transfer the conversation to the specialized tool agent when the user requests help with technical tasks",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the tool agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "agentResponse",
          description: "Provide a response to the user without transferring to another agent",
          parameters: {
            type: "object",
            properties: {
              completion: {
                type: "string",
                description: "The response to the user"
              }
            },
            required: ["completion"]
          }
        }
      ];
    } else if (agentType === "tool") {
      functions = [
        {
          name: "transfer_to_main_agent",
          description: "Transfer the conversation back to the main agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be returned to the main agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "transfer_to_script_agent",
          description: "Transfer the conversation to the specialized script writer agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the script agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "transfer_to_image_agent",
          description: "Transfer the conversation to the specialized image generation agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the image agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "transfer_to_scene_agent",
          description: "Transfer the conversation to the specialized scene creator agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the scene agent"
              },
              additionalContext: {
                type: "object",
                description: "Any additional context that would help the scene agent",
                properties: {
                  userIntent: { type: "string" },
                  requestType: { type: "string" }
                }
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "save_content_to_project",
          description: "Save content (script, scene description, image prompt, etc.) to a Canvas project",
          parameters: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "The ID of the Canvas project"
              },
              contentType: {
                type: "string",
                enum: ["script", "scene", "image_prompt", "voice_over"],
                description: "The type of content being saved"
              },
              sceneId: {
                type: "string",
                description: "The ID of the scene (if applicable)"
              },
              content: {
                type: "string",
                description: "The content to save"
              }
            },
            required: ["contentType", "content"]
          }
        }
      ];
    } else if (agentType === "script") {
      functions = [
        {
          name: "transfer_to_main_agent",
          description: "Transfer the conversation back to the main agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be returned to the main agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "transfer_to_image_agent",
          description: "Transfer the conversation to the specialized image generation agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the image agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "save_content_to_project",
          description: "Save a script to a Canvas project",
          parameters: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "The ID of the Canvas project"
              },
              contentType: {
                type: "string",
                enum: ["script"],
                description: "The type of content being saved (always script for this agent)"
              },
              content: {
                type: "string",
                description: "The script content to save"
              }
            },
            required: ["contentType", "content"]
          }
        }
      ];
    } else if (agentType === "image") {
      functions = [
        {
          name: "transfer_to_main_agent",
          description: "Transfer the conversation back to the main agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be returned to the main agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "save_content_to_project",
          description: "Save an image prompt to a Canvas project",
          parameters: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "The ID of the Canvas project"
              },
              sceneId: {
                type: "string",
                description: "The ID of the scene"
              },
              contentType: {
                type: "string",
                enum: ["image_prompt"],
                description: "The type of content being saved (always image_prompt for this agent)"
              },
              content: {
                type: "string",
                description: "The image prompt content to save"
              }
            },
            required: ["contentType", "content"]
          }
        }
      ];
    } else if (agentType === "scene") {
      functions = [
        {
          name: "transfer_to_main_agent",
          description: "Transfer the conversation back to the main agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be returned to the main agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "transfer_to_image_agent",
          description: "Transfer the conversation to the specialized image generation agent",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason why this conversation should be handled by the image agent"
              }
            },
            required: ["reason"]
          }
        },
        {
          name: "save_content_to_project",
          description: "Save a scene description to a Canvas project",
          parameters: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "The ID of the Canvas project"
              },
              sceneId: {
                type: "string",
                description: "The ID of the scene"
              },
              contentType: {
                type: "string",
                enum: ["scene"],
                description: "The type of content being saved (always scene for this agent)"
              },
              content: {
                type: "string",
                description: "The scene description content to save"
              }
            },
            required: ["contentType", "content"]
          }
        }
      ];
    }
    
    // Check if simple message that shouldn't need a handoff
    const isSimpleMessage = input && input.length < 30 && /^(hi|hello|hey|what|how|can you)/i.test(input);
    
    // If enableDirectToolExecution is true, add canvas tool functions to all agents
    if (enableDirectToolExecution && agentType !== "tool") {
      // Find a match for the content save function
      let canvasFunction = functions.find(f => f.name === "save_content_to_project");
      
      // If not found, add it based on agent type
      if (!canvasFunction) {
        canvasFunction = {
          name: "save_content_to_project",
          description: `Save content to a Canvas project (direct tool execution)`,
          parameters: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "The ID of the Canvas project"
              },
              contentType: {
                type: "string",
                enum: ["script", "scene", "image_prompt", "voice_over"],
                description: "The type of content being saved"
              },
              sceneId: {
                type: "string",
                description: "The ID of the scene (if applicable)"
              },
              content: {
                type: "string",
                description: "The content to save"
              }
            },
            required: ["contentType", "content"]
          }
        };
        
        functions.push(canvasFunction);
      }
    }

    // Function to determine if the response should include trace data
    const shouldIncludeTrace = !tracingDisabled && runId;
    
    // Prepare the request payload
    const apiRequestPayload = {
      model,
      messages: processedMessages,
      temperature: usePerformanceModel ? 0.5 : 0.7,
      top_p: 1,
      functions: functions.length > 0 ? functions : undefined,
      function_call: functionCall,
    };
    
    logInfo(`[${requestId}] Calling OpenAI API with ${processedMessages.length} messages`, {
      model,
      agentType,
      functionsCount: functions.length,
      isHandoffContinuation: !!contextData.isHandoffContinuation,
      previousAgent: contextData.previousAgentType || "main",
      handoffReason: contextData.handoffReason || ""
    });

    // Improved timeout handling for OpenAI API call
    const apiResponse = await callOpenAIWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(apiRequestPayload)
      },
      requestId
    );
    
    const responseData = await apiResponse.json();
    
    // Check for function call in the response
    const responseMessage = responseData.choices[0].message;
    
    let handoffFunction = null;
    let responseText = responseMessage.content || "";
    let structuredOutput = null;
    
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      
      logInfo(`[${requestId}] Function call detected: ${functionName} `, null);
      
      // Check if this is a simple message that shouldn't trigger a handoff
      if (isSimpleMessage && functionName.startsWith("transfer_to_") && shouldPreventHandoff(input)) {
        console.log("Preventing automatic handoff for simple greeting or short message");
        
        // Process as a regular response instead of a handoff
        responseText = "I'm here to help with your Canvas project. What would you like assistance with?";
        
        logInfo(`[${requestId}] Generated response for main agent (prevented handoff for simple message)`, {
          responseLength: responseText.length,
          originalFunction: functionName,
          hasStructuredOutput: false
        });
      } else {
        // Process the function call
        const functionResult = await processFunctionCall(
          functionName,
          functionArgs,
          requestId,
          userId,
          projectId,
          agentType
        );
        
        responseText = functionResult.responseText;
        handoffFunction = functionResult.handoff;
        structuredOutput = functionResult.structuredOutput;
        
        if (functionResult.isScript) {
          // For script content, extract the actual script part
          const scriptContent = extractScriptContent(responseText);
          responseText = scriptContent;
          
          logInfo(`[${requestId}] Processing script content for saving`, {
            contentLength: responseText.length,
            isScript: true,
            projectId
          });
        }
        
        logInfo(`[${requestId}] Generated response for ${agentType} agent`, {
          responseLength: responseText.length,
          isScript: functionResult.isScript || looksLikeScript(responseText)
        });
      }
    } else {
      logInfo(`[${requestId}] Plain text response (no function call) `, null);
      
      if (looksLikeScript(responseText)) {
        // For script-like content, extract the actual script part
        const scriptContent = extractScriptContent(responseText);
        responseText = scriptContent;
        
        logInfo(`[${requestId}] Extracted script-like content`, {
          contentLength: responseText.length
        });
      }
      
      logInfo(`[${requestId}] Generated response for ${agentType} agent`, {
        responseLength: responseText.length,
        isScript: looksLikeScript(responseText)
      });
    }
    
    // Prepare the response object
    const result = {
      message: responseText,
      agentType,
      handoff: handoffFunction,
      structuredOutput,
      requestId
    };
    
    // Add trace data if applicable
    if (shouldIncludeTrace) {
      result.trace = {
        runId,
        requestId,
        groupId,
        agentType,
        timestamp: new Date().toISOString(),
        duration: Date.now() - new Date(conversationHistory[conversationHistory.length - 1]?.createdAt || Date.now()).getTime(),
        summary: {
          modelUsed: model,
          success: true,
          messageCount: conversationHistory.length + 1,
          handoffs: handoffFunction ? 1 : 0,
          toolCalls: structuredOutput ? 1 : 0
        }
      };
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (apiError) {
    logError(`[${requestId}] API call error:`, apiError);
    
    // Prepare an error response
    const errorResponse = {
      error: apiError instanceof Error ? apiError.message : String(apiError),
      message: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
      requestId
    };
    
    // Add trace data for the error if applicable
    if (!tracingDisabled && runId) {
      errorResponse.trace = {
        runId,
        requestId,
        groupId: groupId || null,
        agentType: agentType || "main",
        timestamp: new Date().toISOString(),
        duration: 0,
        summary: {
          success: false,
          error: apiError instanceof Error ? apiError.message : String(apiError),
          errorType: apiError.name || "Unknown"
        }
      };
    }
    
    // Check for specific error types
    if (apiError.name === 'AbortError' || apiError.message?.includes('timed out')) {
      errorResponse.message = "The request timed out. Please try again with a shorter message or try again shortly.";
      errorResponse.errorType = "timeout";
    } else if (isQuotaExceededError(apiError)) {
      errorResponse.message = "I'm sorry, but the AI service is currently unavailable due to usage limits. Please try again later.";
      errorResponse.errorType = "quota_exceeded";
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
