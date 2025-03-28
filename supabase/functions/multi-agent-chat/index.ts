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
      groupId,
      conversationHistory
    } = await req.json();

    logInfo(`[${requestId}] Received request from user ${userId}`, { 
      agentType, 
      inputLength: input?.length, 
      attachmentsCount: attachments?.length || 0,
      hasContextData: !!contextData,
      conversationHistoryItems: conversationHistory?.length || 0,
      handoffContinuation: contextData?.isHandoffContinuation,
      previousAgentType: contextData?.previousAgentType,
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
    
    // Process conversation history into messages format for OpenAI
    const messages = [systemMessage];
    
    // If we have conversation history, include relevant context
    if (conversationHistory && conversationHistory.length > 0) {
      logInfo(`[${requestId}] Processing conversation history with ${conversationHistory.length} messages`);
      
      // Enhanced continuation context for handoffs
      if (contextData?.isHandoffContinuation) {
        const enhancedHandoffPrompt = `
This conversation was handed off from the ${
  contextData.previousAgentType || 'previous'
} agent to you (${agentType} agent) for specialized assistance. 

Reason for handoff: ${contextData.handoffReason || 'Not specified'}

Your role: You are now the ${agentType} agent, taking over this conversation thread. 
${agentType === 'script' ? 'As the Script Writer agent, you should help write high-quality scripts, creative content, or narratives based on the user\'s request.' : ''}
${agentType === 'image' ? 'As the Image Generator agent, you should help craft detailed prompts for generating images based on the user\'s description.' : ''}
${agentType === 'tool' ? 'As the Tool agent, you should help the user with technical tasks and tool usage based on their request.' : ''}
${agentType === 'scene' ? 'As the Scene Creator agent, you should help create detailed visual scenes and environments based on the user\'s description.' : ''}

The user should not have to repeat their request.

Instructions:
1. Review the conversation history carefully to understand context
2. Maintain continuity with what has been discussed
3. Use your specialized capabilities as a ${agentType} agent to help the user
4. Address the user's request directly based on the full conversation
5. If the user asked for a script, make sure to write one for them
6. If the user asked for an image prompt, make sure to create one for them
7. Always provide value from your specialty - don't just acknowledge the handoff

This is a continuation of the conversation, not a new conversation.

${contextData.handoffHistory && contextData.handoffHistory.length > 0 ? 
  `Handoff history: ${JSON.stringify(contextData.handoffHistory)}` : ''}
`;
        
        messages.push({
          role: "system",
          content: enhancedHandoffPrompt
        });
        
        logInfo(`[${requestId}] Added enhanced handoff continuation context from ${contextData.previousAgentType} to ${agentType}`);
        
        // If there's continuity data, add that too
        if (contextData.continuityData) {
          messages.push({
            role: "system",
            content: `Additional context from previous agent:
            - Previous agent: ${contextData.continuityData.fromAgent}
            - Handoff reason: ${contextData.continuityData.reason}
            - Timestamp: ${contextData.continuityData.timestamp}
            ${contextData.continuityData.additionalContext ? 
              `- Additional context: ${JSON.stringify(contextData.continuityData.additionalContext)}` : ''}
            
            Important: This is now YOUR conversation. The user was talking to another agent, and that agent determined YOU would be better equipped to help. So help them based on YOUR specialties.
            `
          });
          
          logInfo(`[${requestId}] Added continuity data to context`, contextData.continuityData);
        }
        
        // For script agent, add specialized continuation prompt
        if (agentType === "script") {
          messages.push({
            role: "system",
            content: `As the Script Writer agent, you MUST help the user write scripts or creative content.
            The previous agent handed this to you because they determined you'd be better at writing content.
            DO NOT just acknowledge the handoff - actually write a script or creative content based on the user's request.
            If you need more information, ask the user specific questions related to the script they want.
            The user should not have to ask you again to write content - that's your primary responsibility!`
          });
        }
      }
      
      // Process conversation history with appropriate filtering
      // Ensure we keep up to a reasonable number of messages to avoid token limits
      const maxHistoryMessages = 15;
      const relevantHistory = conversationHistory.slice(-maxHistoryMessages);
      
      // Add the processed history messages
      relevantHistory.forEach(item => {
        if (item.role === 'user' || item.role === 'assistant' || item.role === 'system') {
          // Enhanced annotation for assistant messages
          let content = item.content;
          if (item.role === 'assistant' && item.agentType && item.agentType !== agentType) {
            content = `[From ${item.agentType} agent]: ${content}`;
          }
          
          messages.push({
            role: item.role,
            content: content
          });
        }
      });
      
      logInfo(`[${requestId}] Processed ${relevantHistory.length} messages from history`, {
        lastMessage: relevantHistory.length > 0 ? relevantHistory[relevantHistory.length - 1].role : 'none'
      });
    }
    
    // Build the user message with enhanced context
    let userMessage = `${input}`;
    
    // Add additional context if needed
    if (contextData) {
      if (contextData.hasAttachments && attachments && attachments.length > 0) {
        userMessage += `\n\nI've attached ${attachments.length} file(s) for your reference.`;
        // We would process attachments here - for now just acknowledge them
      }

      // Enhanced handoff continuation context with more details
      if (contextData.isHandoffContinuation) {
        // Customize based on agent type
        if (agentType === "script") {
          userMessage += `\n\n[Note to Script Writer agent: The user was previously talking to the ${
            contextData.previousAgentType || 'previous'
          } agent about: "${contextData.handoffReason || 'Not specified'}". 
          They need your help writing a script or creative content. 
          Do not just acknowledge this handoff - actually create the content they need.]`;
        } else if (agentType === "image") {
          userMessage += `\n\n[Note to Image Generator agent: The user was previously talking to the ${
            contextData.previousAgentType || 'previous'
          } agent about: "${contextData.handoffReason || 'Not specified'}". 
          They need your help creating detailed image descriptions. 
          Do not just acknowledge this handoff - create detailed image prompts as requested.]`;
        } else {
          userMessage += `\n\n[Note: This conversation was handed off from the ${
            contextData.previousAgentType || 'previous'
          } agent to you (${agentType} agent) to help with specialized assistance. 
          Reason: ${contextData.handoffReason || 'Not specified'}
          
          Please continue the conversation based on this context, providing specialized help in your domain without requiring the user to repeat their request.]`;
        }
        
        // Log that this is a handoff continuation
        logInfo(`[${requestId}] Enhanced user message with handoff continuation context`);
      }

      // If we're a tool agent, add available tools context
      if (agentType === 'tool' && contextData.availableTools) {
        userMessage += `\n\nAvailable tools: ${JSON.stringify(contextData.availableTools, null, 2)}`;
      }
      
      // Additional specialized context
      if (contextData.agentSpecialty === "script_writing") {
        userMessage += `\n\n[You are a Script Writer agent. Your primary responsibility is to write scripts and creative content. Make sure to provide a complete script based on the user's request, not just discuss it.]`;
      }
    }
    
    // Add the current user message
    messages.push({
      role: "user",
      content: userMessage
    });
    
    // Define available tools based on agent type and context
    const tools = getToolsForAgent(agentType, enableDirectToolExecution);
    
    // Define available handoffs based on agent type
    const handoffs = getHandoffsForAgent(agentType);
    
    // Enhanced function calling schema for structured output
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
                },
                preserveFullHistory: {
                  type: "boolean",
                  description: "Whether to preserve the full conversation history in the handoff",
                  default: true
                },
                additionalContext: {
                  type: "object",
                  description: "Additional context to pass to the next agent",
                  properties: {
                    userIntent: { type: "string" },
                    requestType: { type: "string" },
                    requiredFormat: { type: "string" },
                    priority: { type: "string" }
                  }
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
            },
            continuityData: {
              type: "object",
              description: "Optional data to maintain context across agent handoffs",
              properties: {
                additionalContext: {
                  type: "object",
                  description: "Any additional context the next agent should know"
                }
              }
            }
          },
          required: ["completion"]
        }
      }
    ];
    
    // Special tool for script writing
    if (agentType === 'script') {
      functions.push({
        name: "write_script",
        description: "Write a script based on the given parameters",
        parameters: {
          type: "object",
          properties: {
            format: { 
              type: "string",
              description: "The format of the script (screenplay, teleplay, ad, etc.)"
            },
            topic: { 
              type: "string",
              description: "The main topic or subject of the script"
            },
            length: { 
              type: "string",
              description: "The approximate length of the script"
            },
            tone: { 
              type: "string",
              description: "The tone of the script (serious, comedic, dramatic, etc.)"
            },
            content: {
              type: "string",
              description: "The actual script content"
            }
          },
          required: ["content"]
        }
      });
    }
    
    // Add tool functions if any are available
    if (tools && tools.length > 0) {
      tools.forEach(tool => {
        functions.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters || {
            type: "object",
            properties: {},
            required: []
          }
        });
      });
    }
    
    // Add handoff functions if any are available
    if (handoffs && handoffs.length > 0) {
      handoffs.forEach(handoff => {
        functions.push({
          name: handoff.toolName,
          description: handoff.toolDescription,
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description: "The reason for transferring to this agent"
              },
              preserveFullHistory: {
                type: "boolean",
                description: "Whether to preserve the full conversation history in the handoff",
                default: true
              },
              additionalContext: {
                type: "object",
                description: "Any additional context the next agent should know",
                properties: {
                  userIntent: { type: "string" },
                  requestType: { type: "string" },
                  requiredFormat: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            required: ["reason"]
          }
        });
      });
    }

    logInfo(`[${requestId}] Calling OpenAI API with ${messages.length} messages`, {
      model,
      agentType,
      functionsCount: functions.length
    });

    // Call OpenAI API for the response
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        functions: functions,
        function_call: "auto", // Let the model decide which function to call
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
    const message = openAIData.choices[0]?.message;
    const functionCall = message?.function_call;
    
    // Initialize response data
    let responseData: any = {
      completion: "I processed your request but couldn't generate a proper response.",
      handoffRequest: null,
      commandSuggestion: null
    };
    
    // Process the response based on what function was called
    if (functionCall) {
      try {
        logInfo(`[${requestId}] Function call detected: ${functionCall.name}`);
        
        if (functionCall.name === "agentResponse") {
          // Standard agent response
          responseData = JSON.parse(functionCall.arguments);
          
          logInfo(`[${requestId}] Parsed agent response`, {
            hasHandoff: !!responseData.handoffRequest,
            hasCommand: !!responseData.commandSuggestion,
            hasStructuredOutput: !!responseData.structured_output,
            hasContData: !!responseData.continuityData
          });
        } else if (functionCall.name === "write_script") {
          // Special handler for script writing
          const scriptArgs = JSON.parse(functionCall.arguments);
          
          responseData = {
            completion: scriptArgs.content || "I've written a script based on your request.",
            structured_output: {
              scriptType: scriptArgs.format || "general",
              scriptTopic: scriptArgs.topic,
              scriptTone: scriptArgs.tone,
              scriptLength: scriptArgs.length,
              isScript: true
            }
          };
          
          logInfo(`[${requestId}] Generated script content`, {
            scriptFormat: scriptArgs.format,
            contentLength: scriptArgs.content?.length || 0
          });
        } else {
          const isHandoffFunction = handoffs?.some(h => h.toolName === functionCall.name);
          const isToolFunction = tools?.some(t => t.name === functionCall.name);
          
          if (isHandoffFunction) {
            // Enhanced handoff function call
            const handoffArgs = JSON.parse(functionCall.arguments);
            const targetAgent = functionCall.name.replace("transfer_to_", "").replace("_agent", "");
            
            responseData = {
              completion: `I think this request would be better handled by our ${getAgentName(targetAgent)} agent. ${handoffArgs.reason || ''}`,
              handoffRequest: {
                targetAgent,
                reason: handoffArgs.reason || `The ${agentType} agent recommended transitioning to the ${targetAgent} agent.`,
                preserveFullHistory: handoffArgs.preserveFullHistory !== false, // Default to true
                additionalContext: handoffArgs.additionalContext || {}
              },
              continuityData: {
                fromAgent: agentType,
                toAgent: targetAgent,
                reason: handoffArgs.reason || `The ${agentType} agent recommended transitioning to the ${targetAgent} agent.`,
                timestamp: new Date().toISOString(),
                additionalContext: handoffArgs.additionalContext || {}
              }
            };
            
            logInfo(`[${requestId}] Handoff requested to ${targetAgent}`, {
              reason: handoffArgs.reason,
              additionalContext: handoffArgs.additionalContext
            });
          } else if (isToolFunction) {
            // Enhanced tool function call
            const toolArgs = JSON.parse(functionCall.arguments);
            
            responseData = {
              completion: `I'll execute the ${functionCall.name} tool for you. ${message.content || ''}`,
              commandSuggestion: {
                name: functionCall.name,
                parameters: toolArgs
              },
              structured_output: {
                toolName: functionCall.name,
                toolArgs: toolArgs,
                expectedOutput: "Tool execution result"
              }
            };
            
            logInfo(`[${requestId}] Tool execution requested: ${functionCall.name}`);
          } else {
            // Unknown function call
            responseData = {
              completion: message.content || "I processed your request but I'm not sure how to proceed.",
              handoffRequest: null,
              commandSuggestion: null
            };
            
            logInfo(`[${requestId}] Unknown function call: ${functionCall.name}`);
          }
        }
      } catch (error) {
        logError(`[${requestId}] Error parsing function arguments:`, error);
        responseData = {
          completion: message.content || "I encountered an error processing your request.",
          handoffRequest: null,
          commandSuggestion: null
        };
      }
    } else if (message?.content) {
      // No function call, just plain text
      responseData = {
        completion: message.content,
        handoffRequest: null,
        commandSuggestion: null
      };
      
      logInfo(`[${requestId}] Plain text response (no function call)`);
    }
    
    // Check if we should automatically handoff to a specialized agent
    if (!responseData.handoffRequest) {
      const detectedHandoff = checkForHandoff(input, agentType);
      if (detectedHandoff && detectedHandoff !== agentType) {
        responseData.handoffRequest = {
          targetAgent: detectedHandoff,
          reason: `Your request about "${getShortSummary(input)}" would be better handled by our ${getAgentName(detectedHandoff)}.`,
          preserveFullHistory: true
        };
        responseData.continuityData = {
          fromAgent: agentType,
          toAgent: detectedHandoff,
          reason: `Auto-detected need for ${detectedHandoff} agent`,
          timestamp: new Date().toISOString()
        };
        
        logInfo(`[${requestId}] Auto-detected handoff to ${detectedHandoff}`);
      }
    }
    
    // When generating a handoff request, ensure we add preserveFullHistory flag
    if (responseData.handoffRequest) {
      responseData.handoffRequest.preserveFullHistory = true;
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

// Enhanced helper functions

/**
 * Process conversation history to filter and format messages for the current agent
 */
function processConversationHistory(history: any[], currentAgentType: string): any[] {
  if (!history || !Array.isArray(history) || history.length === 0) {
    return [];
  }
  
  // Always include system messages, user messages, and assistant messages
  // For assistant messages, add agent type annotation if from different agent
  const maxHistoryItems = 20; // Limit history to prevent token overflow
  
  // Keep the most recent messages
  const relevantHistory = history.slice(-maxHistoryItems);
  
  // Further process for better context
  return relevantHistory.map(item => {
    // Create a copy we can modify
    const processedItem = { ...item };
    
    // For handoff messages, convert to system messages with enhanced context
    if (item.type === 'handoff') {
      processedItem.role = 'system';
      
      // Add continuity data if available
      if (item.continuityData) {
        processedItem.content += `\n\nAdditional handoff context: ${JSON.stringify(item.continuityData)}`;
      }
    }
    
    // We'll handle the assistant message annotation in the parent function
    
    return processedItem;
  });
}

// Get enhanced default instructions based on agent type
function getDefaultInstructions(agentType: string): string {
  const handoffInstructions = `
  You can transfer the conversation to a specialized agent when appropriate:
  - Script Writer agent: For writing scripts, creative content, or narratives
  - Image Prompt agent: For generating detailed image descriptions
  - Tool agent: For executing tools and performing technical tasks
  - Scene Creator agent: For creating detailed visual scene descriptions
  
  ONLY transfer to another agent when the user's request clearly matches their specialty.
  
  When handing off, provide a clear reason why the handoff is necessary and what value the specialized agent will provide to the user.
  `;
  
  switch(agentType) {
    case 'main':
    case 'assistant':
      return `You are a helpful AI assistant. Provide clear, accurate responses to user questions. 
      If you can't answer something, be honest about it. 
      
      ${handoffInstructions}
      
      Be professional, friendly, and helpful. Always consider the user's needs and provide the most helpful response possible.
      
      When continuing a conversation that has been handed off to you, make sure to acknowledge the handoff context and maintain continuity in the conversation.`;
      
    case 'script':
      return `You are a creative script writing assistant. Your primary job is to help users create compelling narratives, ad scripts, and other written content.
      
      Focus on:
      - Engaging dialogue and character development
      - Effective storytelling and narrative structure
      - Proper formatting for scripts and written content
      - Considering the target audience and purpose
      
      ${handoffInstructions}
      
      IMPORTANT: When users request a script, ALWAYS WRITE THE SCRIPT for them. Don't just talk about how you could write one - actually create the content.
      
      Be creative, but also practical. Consider the feasibility of production for any scripts you create.
      
      When continuing a conversation that has been handed off to you, acknowledge that you're now handling the script-related aspects of their request and immediately provide the creative content they need.`;
      
    case 'image':
      return `You are an expert at creating detailed image prompts for generating visual content.
      
      Focus on these key aspects when creating image prompts:
      - Visual details: describe colors, lighting, composition, perspective
      - Style: specify art style, medium, technique, or artistic influence
      - Mood and atmosphere: convey the feeling or emotion of the image
      - Subject focus: clearly describe the main subject and any background elements
      
      ${handoffInstructions}
      
      Help users refine their ideas into clear, specific prompts that will generate impressive images.
      
      When continuing a conversation that has been handed off to you, acknowledge that you're now handling the image-generation aspects of their request and immediately provide detailed image prompts.`;
      
    case 'tool':
      return `You are a technical tool specialist. Guide users through using various tools and APIs. Provide clear instructions and help troubleshoot issues.
      
      When helping with tools:
      - Explain what the tool does and when to use it
      - Provide step-by-step instructions for using the tool
      - Suggest appropriate parameters or settings
      - Help interpret the tool's output or results
      
      ${handoffInstructions}
      
      Be technical but accessible. Use clear language and explain complex concepts in understandable terms.
      
      When continuing a conversation that has been handed off to you, acknowledge that you're now handling the technical tool-related aspects of their request.`;
      
    case 'scene':
      return `You are a scene creation expert for video production. Help users visualize and describe detailed environments and settings for creative projects.
      
      When crafting scene descriptions, focus on:
      - Sensory details: what can be seen, heard, smelled, felt in the scene
      - Spatial relationships: layout, distances, positioning of elements
      - Atmosphere and mood: lighting, weather, time of day, emotional tone
      - Key elements: important objects, features, or characters in the scene
      - Camera movements and angles: how the scene should be filmed
      
      ${handoffInstructions}
      
      Create vivid, immersive scenes that help bring the user's vision to life.
      
      When continuing a conversation that has been handed off to you, acknowledge that you're now handling the scene creation aspects of their request and immediately provide detailed scene descriptions.`;
      
    default:
      return "You are a helpful AI assistant. Answer questions clearly and concisely.";
  }
}

// Get enhanced tools for the agent based on agent type and direct execution setting
function getToolsForAgent(agentType: string, enableDirectToolExecution: boolean): any[] {
  if (!enableDirectToolExecution && agentType !== 'tool') {
    return [];
  }
  
  const baseTools = [
    {
      name: "browser-use",
      description: "Use a browser to navigate websites, take screenshots, or perform web automation tasks",
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "The task to perform in the browser, described in detail"
          },
          url: {
            type: "string",
            description: "The starting URL for the browser task"
          },
          browserConfig: {
            type: "object",
            description: "Optional browser configuration settings",
            properties: {
              headless: {
                type: "boolean",
                description: "Whether to run the browser in headless mode"
              },
              timeout: {
                type: "number",
                description: "Timeout in milliseconds"
              }
            }
          }
        },
        required: ["task"]
      }
    },
    {
      name: "image-to-video",
      description: "Convert an image to a short video with animation effects",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Description of the desired animation or effect"
          },
          aspectRatio: {
            type: "string",
            description: "Aspect ratio of the output video (e.g., '16:9', '1:1', '9:16')"
          },
          duration: {
            type: "string",
            description: "Duration of the video in seconds"
          }
        },
        required: ["prompt"]
      }
    },
    {
      name: "product-shot-v1",
      description: "Generate a professional product shot from an uploaded image",
      parameters: {
        type: "object",
        properties: {
          style: {
            type: "string",
            description: "The style of the product shot (e.g., 'studio', 'lifestyle', 'minimalist')"
          },
          background: {
            type: "string",
            description: "Description of the desired background"
          },
          lighting: {
            type: "string",
            description: "The lighting style (e.g., 'soft', 'dramatic', 'natural')"
          }
        },
        required: ["style"]
      }
    },
    {
      name: "generate-scene",
      description: "Generate a video scene based on a description",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Detailed description of the scene to generate"
          },
          duration: {
            type: "number",
            description: "Duration of the scene in seconds"
          },
          style: {
            type: "string",
            description: "Visual style for the scene"
          }
        },
        required: ["description"]
      }
    }
  ];
  
  // Agent-specific tools
  switch(agentType) {
    case 'image':
      return [...baseTools, {
        name: "analyze-image",
        description: "Analyze an image and provide detailed information about it",
        parameters: {
          type: "object",
          properties: {
            imageUrl: {
              type: "string",
              description: "URL of the image to analyze"
            },
            analysisType: {
              type: "string",
              description: "Type of analysis to perform (e.g., 'composition', 'style', 'content')"
            }
          },
          required: ["imageUrl"]
        }
      }];
      
    case 'tool':
      return [...baseTools, {
        name: "execute-workflow",
        description: "Execute a multi-step workflow with various tools",
        parameters: {
          type: "object",
          properties: {
            workflowName: {
              type: "string",
              description: "Name of the workflow to execute"
            },
            workflowParams: {
              type: "object",
              description: "Parameters for the workflow"
            }
          },
          required: ["workflowName"]
        }
      }];
      
    case 'script':
      return [{
        name: "analyze-script",
        description: "Analyze a script for quality, readability, and impact",
        parameters: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "The script text to analyze"
            },
            analysisType: {
              type: "string",
              description: "Type of analysis (e.g., 'dialogue', 'structure', 'pacing')"
            }
          },
          required: ["script"]
        }
      }];
      
    case 'scene':
      return [
        ...baseTools,
        {
          name: "create-storyboard",
          description: "Create a storyboard from a scene description",
          parameters: {
            type: "object",
            properties: {
              scene: {
                type: "string",
                description: "Detailed scene description"
              },
              frames: {
                type: "number",
                description: "Number of storyboard frames to create"
              }
            },
            required: ["scene"]
          }
        }
      ];
      
    default:
      return baseTools;
  }
}

// Get enhanced handoffs for agent based on agent type
function getHandoffsForAgent(agentType: string): any[] {
  const allAgentTypes = ['main', 'script', 'image', 'tool', 'scene'];
  const availableHandoffs = allAgentTypes.filter(type => type !== agentType);
  
  return availableHandoffs.map(targetAgent => ({
    targetAgent,
    toolName: `transfer_to_${targetAgent}_agent`,
    toolDescription: `Transfer the conversation to the ${targetAgent} agent when the user's request requires specialized handling in ${getAgentDomain(targetAgent)}.`
  }));
}

// Helper function to get the domain of expertise for an agent
function getAgentDomain(agentType: string): string {
  switch(agentType) {
    case 'main': return "general assistance";
    case 'script': return "writing and creative content";
    case 'image': return "image generation and visual design";
    case 'tool': return "tool usage and technical tasks";
    case 'scene': return "scene creation and visual environments";
    default: return "specialized tasks";
  }
}

// Enhanced check for handoff to a specialized agent
function checkForHandoff(input: string, currentAgentType: string): string | null {
  if (!input) return null;
  
  const inputLower = input.toLowerCase();
  
  // Don't handoff if already in the correct specialist agent
  if (
    (currentAgentType === 'script' && (inputLower.includes('script') || inputLower.includes('write') || inputLower.includes('content'))) ||
    (currentAgentType === 'image' && (inputLower.includes('image') || inputLower.includes('picture') || inputLower.includes('photo'))) ||
    (currentAgentType === 'tool' && (inputLower.includes('tool') || inputLower.includes('browser'))) ||
    (currentAgentType === 'scene' && (inputLower.includes('scene') || inputLower.includes('visual')))
  ) {
    return null;
  }
  
  // Enhanced detection with more keywords and better context awareness
  if (inputLower.includes('script') || inputLower.includes('write') || 
      inputLower.includes('story') || inputLower.includes('narrative') || 
      inputLower.includes('ad') || inputLower.includes('content') ||
      inputLower.includes('dialogue') || inputLower.includes('screenplay')) {
    return 'script';
  }
  
  if (inputLower.includes('image') || inputLower.includes('picture') || 
      inputLower.includes('photo') || inputLower.includes('visual') ||
      inputLower.includes('illustration') || inputLower.includes('drawing') ||
      inputLower.includes('design') || inputLower.includes('graphic')) {
    return 'image';
  }
  
  if (inputLower.includes('tool') || inputLower.includes('browser') || 
      inputLower.includes('automate') || inputLower.includes('website') ||
      inputLower.includes('technical') || inputLower.includes('api') ||
      inputLower.includes('integration') || inputLower.includes('code')) {
    return 'tool';
  }
  
  if (inputLower.includes('scene') || inputLower.includes('setting') || 
      inputLower.includes('environment') || inputLower.includes('location') ||
      inputLower.includes('storyboard') || inputLower.includes('backdrop') ||
      inputLower.includes('camera') || inputLower.includes('shot')) {
    return 'scene';
  }
  
  return null;
}

// Enhanced tool suggestion check
function shouldSuggestTool(input: string): boolean {
  if (!input) return false;
  
  const inputLower = input.toLowerCase();
  return inputLower.includes('browser') || 
         inputLower.includes('website') || 
         inputLower.includes('automate') ||
         inputLower.includes('video') ||
         inputLower.includes('youtube') ||
         inputLower.includes('tool') ||
         inputLower.includes('generate') ||
         inputLower.includes('create') ||
         inputLower.includes('make');
}

// Enhanced tool command suggestion
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
  
  if (inputLower.includes('scene') || inputLower.includes('setting')) {
    return {
      name: "generate-scene",
      parameters: {
        description: "Create a scene based on the user's description",
        duration: 5,
        style: "cinematic"
      }
    };
  }
  
  return null;
}

// Enhanced website extraction
function extractWebsite(input: string): string {
  const matches = input.match(/\b(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/);
  return matches ? matches[0] : 'google.com';
}

// Enhanced agent name function
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
