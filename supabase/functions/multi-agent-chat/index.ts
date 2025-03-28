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

// Get default instructions based on agent type
function getDefaultInstructions(agentType: string): string {
  const handoffInstructions = `
  You can transfer the conversation to a specialized agent when appropriate:
  - Script Writer agent: For writing scripts, creative content, or narratives
  - Image Generator agent: For generating detailed image descriptions
  - Tool agent: For executing tools and performing technical tasks
  - Scene Creator agent: For creating detailed visual scene descriptions
  
  ONLY transfer to another agent when the user's request clearly matches their specialty.
  `;
  
  switch(agentType) {
    case 'main':
    case 'assistant':
      return `You are a helpful AI assistant. Provide clear, accurate information and assist with various tasks. 
      ${handoffInstructions}`;
    case 'script':
      return `You are a script writing assistant specialized in creating compelling content, narratives, and scripts.
      Focus on creating engaging stories, dialogue, and narrative structures.
      ${handoffInstructions}`;
    case 'image':
      return `You are an image prompt specialist. Help users craft detailed, vivid prompts for image generation.
      Focus on describing visual elements, composition, lighting, style, and mood.
      ${handoffInstructions}`;
    case 'tool':
      return `You are a tool specialist assistant. You help users with technical tasks and operations.
      You're knowledgeable about various tools, APIs, and technical operations.
      ${handoffInstructions}`;
    case 'scene':
      return `You are a scene creation specialist. Help users craft detailed visual environments and scenes.
      Focus on spatial relationships, visual details, atmosphere, and sensory elements.
      ${handoffInstructions}`;
    default:
      return `You are a helpful AI assistant.
      ${handoffInstructions}`;
  }
}

// Function to check if a message contains a keyword that suggests handoff
function checkForHandoff(userInput: string, currentAgentType: string): string | null {
  const lowercaseInput = userInput.toLowerCase();
  
  if (currentAgentType === 'main') {
    if (lowercaseInput.includes('script') || 
        lowercaseInput.includes('write a story') || 
        lowercaseInput.includes('narrative')) {
      return 'script';
    }
    
    if (lowercaseInput.includes('image prompt') || 
        lowercaseInput.includes('picture') || 
        lowercaseInput.includes('visual')) {
      return 'image';
    }
    
    if (lowercaseInput.includes('tool') || 
        lowercaseInput.includes('execute') || 
        lowercaseInput.includes('run command')) {
      return 'tool';
    }
    
    if (lowercaseInput.includes('scene') || 
        lowercaseInput.includes('environment') || 
        lowercaseInput.includes('setting')) {
      return 'scene';
    }
  }
  
  return null;
}

// Get a short summary of the user input
function getShortSummary(input: string): string {
  if (input.length <= 30) {
    return input;
  }
  return input.substring(0, 27) + '...';
}

// Get tools for an agent based on agent type
function getToolsForAgent(agentType: string, enableDirectToolExecution: boolean): any[] {
  // For demonstration, we'll define some basic tools
  const imageToVideoTool = {
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
          type: "number",
          description: "Duration of the video in seconds"
        }
      },
      required: ["prompt"]
    }
  };
  
  if (agentType === 'tool' || enableDirectToolExecution) {
    return [imageToVideoTool];
  }
  
  return [];
}

// Get handoffs for an agent
function getHandoffsForAgent(agentType: string): any[] {
  const handoffs = [];
  
  // Don't suggest handoff to self
  if (agentType !== 'main') {
    handoffs.push({
      toolName: "transfer_to_main_agent",
      toolDescription: "Transfer the conversation to the Main Assistant for general help"
    });
  }
  
  if (agentType !== 'script') {
    handoffs.push({
      toolName: "transfer_to_script_agent",
      toolDescription: "Transfer the conversation to the Script Writing Agent for creative content"
    });
  }
  
  if (agentType !== 'image') {
    handoffs.push({
      toolName: "transfer_to_image_agent",
      toolDescription: "Transfer the conversation to the Image Generator Agent for visual prompts"
    });
  }
  
  if (agentType !== 'tool') {
    handoffs.push({
      toolName: "transfer_to_tool_agent",
      toolDescription: "Transfer the conversation to the Tool Agent for technical operations"
    });
  }
  
  if (agentType !== 'scene') {
    handoffs.push({
      toolName: "transfer_to_scene_agent",
      toolDescription: "Transfer the conversation to the Scene Creator Agent for detailed environments"
    });
  }
  
  return handoffs;
}

// Helper to suggest tool commands
function shouldSuggestTool(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return lowerInput.includes('convert image') || 
         lowerInput.includes('image to video') || 
         lowerInput.includes('animate image');
}

// Generate tool command suggestion
function suggestToolCommand(input: string): any {
  return {
    name: "image-to-video",
    parameters: {
      prompt: "Create a subtle animation effect",
      aspectRatio: "16:9",
      duration: 5
    }
  };
}

// Get agent name for display
function getAgentName(agentType: string): string {
  switch (agentType) {
    case 'main': return 'Main Assistant';
    case 'script': return 'Script Writer';
    case 'image': return 'Image Generator';
    case 'tool': return 'Tool Specialist';
    case 'scene': return 'Scene Creator';
    default: return 'Assistant';
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
      
      // Add continuation context for handoffs
      if (contextData?.isHandoffContinuation) {
        messages.push({
          role: "system",
          content: `This conversation was handed off from the ${
            contextData.previousAgentType || 'previous'
          } agent to you (${agentType} agent) to help with specialized assistance. 
          Reason: ${contextData.handoffReason || 'Not specified'}
          
          Please review the conversation history and maintain continuity.
          
          Important: You are now in control of this conversation thread. The user should not have to repeat their request.
          Process the latest user message in context of the full conversation history and respond accordingly.
          
          This is a continuation of the conversation, not a new conversation.`
        });
        
        logInfo(`[${requestId}] Added handoff continuation context from ${contextData.previousAgentType} to ${agentType}`);
      }
      
      // Process conversation history with appropriate filtering
      // Ensure we keep up to a reasonable number of messages to avoid token limits
      const maxHistoryMessages = 15;
      const relevantHistory = conversationHistory.slice(-maxHistoryMessages);
      
      // Add the processed history messages
      relevantHistory.forEach(item => {
        if (item.role === 'user' || item.role === 'assistant' || item.role === 'system') {
          // Add agent type annotation to assistant messages for better context
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
    
    // Build the user message with input and context
    let userMessage = `${input}`;
    
    // Add additional context if needed
    if (contextData) {
      if (contextData.hasAttachments && attachments && attachments.length > 0) {
        userMessage += `\n\nI've attached ${attachments.length} file(s) for your reference.`;
        // We would process attachments here - for now just acknowledge them
      }

      // Enhanced handoff continuation context with more details
      if (contextData.isHandoffContinuation) {
        userMessage += `\n\nNote: This conversation was handed off from the ${
          contextData.previousAgentType || 'previous'
        } agent to you (${agentType} agent) to help with specialized assistance. 
        Reason: ${contextData.handoffReason || 'Not specified'}
        
        Please continue the conversation based on this context.`;
        
        // Log that this is a handoff continuation
        logInfo(`[${requestId}] This is a handoff continuation from ${contextData.previousAgentType} to ${agentType}`, {
          reason: contextData.handoffReason
        });
      }

      // If we're a tool agent, add available tools context
      if (agentType === 'tool' && contextData.availableTools) {
        userMessage += `\n\nAvailable tools: ${JSON.stringify(contextData.availableTools, null, 2)}`;
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
              }
            },
            required: ["reason"]
          }
        });
      });
    }

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
        if (functionCall.name === "agentResponse") {
          // Standard agent response
          responseData = JSON.parse(functionCall.arguments);
        } else {
          const isHandoffFunction = handoffs?.some(h => h.toolName === functionCall.name);
          const isToolFunction = tools?.some(t => t.name === functionCall.name);
          
          if (isHandoffFunction) {
            // Handle handoff function call
            const handoffArgs = JSON.parse(functionCall.arguments);
            const targetAgent = functionCall.name.replace("transfer_to_", "").replace("_agent", "");
            
            responseData = {
              completion: `I think this request would be better handled by our ${getAgentName(targetAgent)} agent. ${handoffArgs.reason || ''}`,
              handoffRequest: {
                targetAgent,
                reason: handoffArgs.reason || `The ${agentType} agent recommended transitioning to the ${targetAgent} agent.`,
                preserveFullHistory: true // Always preserve full history for handoffs
              }
            };
          } else if (isToolFunction) {
            // Handle tool function call
            const toolArgs = JSON.parse(functionCall.arguments);
            
            responseData = {
              completion: `I'll execute the ${functionCall.name} tool for you. ${message.content || ''}`,
              commandSuggestion: {
                name: functionCall.name,
                parameters: toolArgs
              }
            };
          } else {
            // Unknown function call
            responseData = {
              completion: message.content || "I processed your request but I'm not sure how to proceed.",
              handoffRequest: null,
              commandSuggestion: null
            };
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
      }
    }
    
    // Check if the input might require a tool when in direct tool execution mode
    if (enableDirectToolExecution && !responseData.commandSuggestion && shouldSuggestTool(input)) {
      responseData.commandSuggestion = suggestToolCommand(input);
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
