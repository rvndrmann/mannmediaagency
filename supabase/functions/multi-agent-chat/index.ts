
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get OpenAI API key from environment variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Logging utility
function logInfo(message: string, data?: any) {
  console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
}

function logError(message: string, error: any) {
  console.error(`[ERROR] ${message}`, error);
  if (error instanceof Error) {
    console.error(`Stack trace: ${error.stack}`);
  }
}

// Validate OpenAI API key
function validateOpenAIKey() {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
  }
}

// Enhanced tool and function configuration
function getToolsAndFunctions(agentType: string) {
  const baseFunctions = [
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
                description: "The type of agent to hand off to"
              },
              reason: {
                type: "string",
                description: "The reason for the handoff"
              }
            }
          },
          toolExecution: {
            type: "object",
            description: "Optional tool execution request",
            properties: {
              toolName: {
                type: "string",
                description: "Name of the tool to execute"
              },
              parameters: {
                type: "object",
                description: "Parameters for tool execution"
              }
            }
          }
        },
        required: ["completion"]
      }
    }
  ];

  // Add agent-specific tools and functions
  const agentTools = {
    'main': [],
    'script': [],
    'image': [],
    'tool': [
      {
        name: "image-to-video",
        description: "Convert an image to a video",
        parameters: {
          type: "object",
          properties: {
            imageUrl: {
              type: "string",
              description: "URL of the image to convert"
            },
            aspectRatio: {
              type: "string",
              description: "Desired aspect ratio (e.g., '16:9', '1:1')"
            }
          },
          required: ["imageUrl"]
        }
      }
    ],
    'scene': []
  };

  return {
    functions: baseFunctions,
    tools: agentTools[agentType] || []
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate OpenAI API key
    validateOpenAIKey();

    // Parse request body
    const { 
      input, 
      agentType = 'main', 
      conversationHistory = [],
      contextData = {} 
    } = await req.json();

    // Get tools and functions for the specific agent type
    const { functions, tools } = getToolsAndFunctions(agentType);

    // Prepare messages for OpenAI API
    const messages = [
      {
        role: "system",
        content: contextData.instructions || "You are a helpful AI assistant."
      },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: "user",
        content: input
      }
    ];

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        functions: functions,
        tools: tools,
        tool_choice: 'auto'
      })
    });

    // Parse OpenAI response
    const responseData = await openAIResponse.json();
    
    // Extract and process the response
    const responseMessage = responseData.choices[0].message;
    const functionCall = responseMessage.function_call;
    const toolCalls = responseMessage.tool_calls;

    let processedResponse = {
      completion: responseMessage.content || "I processed your request but couldn't generate a response.",
      handoffRequest: null,
      toolExecution: null
    };

    // Handle function calls
    if (functionCall) {
      try {
        const args = JSON.parse(functionCall.arguments);
        processedResponse = { ...processedResponse, ...args };
      } catch (error) {
        logError('Error parsing function call', error);
      }
    }

    // Handle tool calls
    if (toolCalls && toolCalls.length > 0) {
      processedResponse.toolExecution = {
        toolName: toolCalls[0].function.name,
        parameters: JSON.parse(toolCalls[0].function.arguments)
      };
    }

    // Log the processed response
    logInfo(`Processed response for ${agentType} agent`, processedResponse);

    return new Response(JSON.stringify(processedResponse), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });

  } catch (error) {
    logError('Error in multi-agent chat function', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || "An unexpected error occurred",
      completion: "I'm sorry, but I encountered an error processing your request."
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
      status: 500
    });
  }
});
