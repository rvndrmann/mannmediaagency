
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
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

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
          name: "execute_canvas_tool",
          description: "Execute a Canvas tool to add content to the user's project",
          parameters: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["save_script", "save_scene", "save_image_prompt", "add_scene"],
                description: "The action to perform on the Canvas project"
              },
              projectId: {
                type: "string",
                description: "The ID of the Canvas project"
              },
              sceneId: {
                type: "string",
                description: "The ID of the scene (if applicable)"
              },
              content: {
                type: "string",
                description: "The content to save (script, scene description, or image prompt)"
              },
              title: {
                type: "string",
                description: "The title of the scene (for add_scene action)"
              }
            },
            required: ["action", "content"]
          }
        },
        {
          name: "analyze_link",
          description: "Analyze a link provided by the user",
          parameters: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "The URL to analyze"
              }
            },
            required: ["url"]
          }
        },
        {
          name: "generate_image",
          description: "Generate an image based on the user's prompt",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The prompt for image generation"
              },
              style: {
                type: "string",
                enum: ["photorealistic", "cartoon", "3d", "artistic", "product"],
                description: "The style of the image"
              }
            },
            required: ["prompt"]
          }
        },
        {
          name: "search_web",
          description: "Search the web for information",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query"
              }
            },
            required: ["query"]
          }
        },
        {
          name: "generate_metadata",
          description: "Generate SEO metadata for content",
          parameters: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The content to generate metadata for"
              }
            },
            required: ["content"]
          }
        },
        {
          name: "agentResponse",
          description: "Provide a response to the user without executing a tool",
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
    } else {
      // For script, image, and scene agents
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
          name: "transfer_to_tool_agent",
          description: "Transfer the conversation to the tool agent for executing specialized tools",
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
          name: "save_content_to_project",
          description: "Save the generated content to the user's project",
          parameters: {
            type: "object",
            properties: {
              projectId: {
                type: "string",
                description: "The ID of the project"
              },
              contentType: {
                type: "string",
                enum: ["script", "scene", "image_prompt"],
                description: "The type of content to save"
              },
              content: {
                type: "string",
                description: "The content to save"
              },
              isScript: {
                type: "boolean",
                description: "Whether this content is a properly formatted script",
                default: false
              }
            },
            required: ["contentType", "content"]
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
              },
              isScript: {
                type: "boolean",
                description: "Whether this response contains a complete script",
                default: false
              }
            },
            required: ["completion"]
          }
        }
      ];
    }
    
    logInfo(`[${requestId}] Calling OpenAI API with ${processedMessages.length} messages`, {
      model,
      agentType,
      functionsCount: functions.length,
      isHandoffContinuation: contextData.isHandoffContinuation || false,
      previousAgent: contextData.previousAgentType || "main",
      handoffReason: contextData.handoffReason || ""
    });
    
    // Implement retry logic for API calls
    let attempt = 0;
    let response;
    let error;
    const startTime = Date.now();
    
    while (attempt < MAX_RETRIES) {
      try {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: processedMessages,
            functions: functions,
            function_call: functionCall,
            temperature: usePerformanceModel ? 0.7 : 0.5
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData, null, 4)}`);
        }
        
        const data = await response.json();
        
        // Process the response
        const message = data.choices[0].message;
        
        // Handle function calls
        if (message.function_call) {
          const functionName = message.function_call.name;
          const functionArguments = message.function_call.arguments;
          // Parse function arguments safely
          let functionArgs;
          try {
            functionArgs = JSON.parse(functionArguments);
          } catch (parseError) {
            logError(`[${requestId}] Error parsing function arguments`, parseError);
            throw new Error(`Failed to parse function arguments: ${parseError.message}`);
          }
          
          logInfo(`[${requestId}] Function call detected: ${functionName} `, null);
          
          // Handle transfers to other agents
          if (functionName.startsWith('transfer_to_')) {
            const targetAgent = functionName.replace('transfer_to_', '').replace('_agent', '');
            
            logInfo(`[${requestId}] Handoff requested to ${targetAgent}`, {
              reason: functionArgs.reason,
              additionalContext: functionArgs.additionalContext || {}
            });
            
            return new Response(
              JSON.stringify({
                handoffRequest: {
                  targetAgent: targetAgent,
                  reason: functionArgs.reason,
                  additionalContext: functionArgs.additionalContext
                }
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Handle save_content_to_project - this handles saving scripts and other content
          else if (functionName === 'save_content_to_project') {
            // Extract the script portion from the response if not already clean
            let contentToSave = functionArgs.content;
            
            // For script content, do additional processing to ensure we have a clean script
            if (functionArgs.contentType === 'script') {
              // Check if the content looks like a script (use new helper function)
              const isScript = functionArgs.isScript || looksLikeScript(contentToSave);
              
              // If it's a script, try to extract just the script part (no explanations)
              if (isScript) {
                contentToSave = extractScriptContent(contentToSave);
              }
              
              logInfo(`[${requestId}] Processing script content for saving`, {
                contentLength: contentToSave.length,
                isScript: isScript,
                projectId: functionArgs.projectId
              });
            }
            
            return new Response(
              JSON.stringify({
                completion: `I've saved your ${functionArgs.contentType.replace('_', ' ')} to your project.`,
                savedContent: {
                  type: functionArgs.contentType,
                  content: contentToSave,
                  isScript: functionArgs.isScript || looksLikeScript(contentToSave)
                }
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Handle various tool calls - simplified for now, would implement actual tool calls
          else if (functionName === 'execute_canvas_tool' || 
                   functionName === 'analyze_link' || 
                   functionName === 'generate_image' || 
                   functionName === 'search_web' || 
                   functionName === 'generate_metadata') {
            
            return new Response(
              JSON.stringify({
                completion: `I'm executing the ${functionName} tool with the parameters you provided.`,
                toolCall: {
                  name: functionName,
                  parameters: functionArgs
                }
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Handle basic agent responses
          else if (functionName === 'agentResponse') {
            // For script agent, check if the response is a script
            let isScript = false;
            let structured_output = null;
            
            if (agentType === 'script') {
              isScript = functionArgs.isScript || looksLikeScript(functionArgs.completion);
              if (isScript) {
                structured_output = {
                  isScript: true,
                  scriptText: extractScriptContent(functionArgs.completion)
                };
              }
            }
            
            logInfo(`[${requestId}] Generated response for ${agentType} agent`, {
              responseLength: functionArgs.completion.length,
              hasHandoff: false,
              hasStructuredOutput: !!structured_output,
              isScript: isScript
            });
            
            return new Response(
              JSON.stringify({
                completion: functionArgs.completion,
                structured_output: structured_output
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // If no function call, use the content directly
        logInfo(`[${requestId}] Plain text response (no function call) `, null);
        
        // For script agent, check if the response is a script (even without function call)
        let isScript = false;
        let structured_output = null;
        
        if (agentType === 'script') {
          isScript = looksLikeScript(message.content);
          
          if (isScript) {
            structured_output = {
              isScript: true,
              scriptText: extractScriptContent(message.content)
            };
          }
        }
        
        logInfo(`[${requestId}] Generated response for ${agentType} agent`, {
          responseLength: message.content.length,
          isScript: isScript
        });
        
        return new Response(
          JSON.stringify({
            completion: message.content,
            structured_output: structured_output
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (err) {
        error = err;
        logError(`[${requestId}] API call error (attempt ${attempt + 1}):`, err);
        
        // If this is an OpenAI quota error, no need to retry
        if (isQuotaExceededError(err)) {
          logInfo(`[${requestId}] OpenAI quota exceeded, breaking retry loop`, null);
          break;
        }
        
        attempt++;
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          logInfo(`[${requestId}] Retrying in ${delay}ms...`, null);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we got here, all retries failed
    logError(`[${requestId}] All ${MAX_RETRIES} retries failed`, error);
    
    // Check for quota errors specifically
    if (isQuotaExceededError(error)) {
      return new Response(
        JSON.stringify({
          error: "OpenAI API quota exceeded",
          completion: "I'm sorry, but the AI service is currently unavailable due to high demand. Please try again later.",
          user_message: "The service is experiencing high demand. Your request couldn't be completed at this time."
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Generic error response
    return new Response(
      JSON.stringify({
        error: "Failed to get response from OpenAI API",
        completion: "I apologize, but I encountered an issue processing your request. Please try again.",
        debug_info: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    logError(`[${requestId}] Error processing request:`, error);
    
    return new Response(
      JSON.stringify({
        error: "Error processing request",
        completion: "I apologize, but I encountered an unexpected error. Please try again.",
        debug_info: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
