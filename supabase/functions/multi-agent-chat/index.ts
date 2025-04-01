
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const BASE_MODEL = "gpt-4o";
const MINI_MODEL = "gpt-4o-mini";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: new Headers(corsHeaders),
    });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[INFO] [${requestId}] Received new request `);

    // Get request body
    const requestData = await req.json();
    const { input, agentType = "main", conversationHistory = [], usePerformanceModel = false } = requestData;

    // Extract user ID from JWT if present
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split("Bearer ")[1];
    const userId = token ? extractUserIdFromJWT(token) : "anonymous";

    console.log(`[INFO] [${requestId}] Received request from user ${userId}`, {
      agentType,
      inputLength: input?.length || 0,
      attachmentsCount: requestData.attachments?.length || 0,
      hasContextData: !!requestData.contextData,
      conversationHistoryItems: conversationHistory.length,
      handoffContinuation: !!requestData.isHandoffContinuation,
      previousAgentType: requestData.previousAgentType || "main",
      runId: requestData.runId || requestId,
      groupId: requestData.groupId || requestId,
    });

    // Process any project context
    if (requestData.contextData?.projectId) {
      const projectDetails = await getProjectDetails(requestData.contextData.projectId);
      console.log(`[INFO] [${requestId}] Request includes project context for project ${requestData.contextData.projectId}`, {
        title: projectDetails?.title || "Unknown",
        scenesCount: projectDetails?.scenes?.length || 0,
        hasFullScript: projectDetails?.hasFullScript || false,
      });
    }

    console.log(`[INFO] [${requestId}] Processing conversation history with ${conversationHistory.length} messages `);

    // Process conversation history
    const processedHistory = processConversationHistory(conversationHistory);
    console.log(`[INFO] [${requestId}] Processed ${processedHistory.length} messages from history`, {
      lastMessage: processedHistory.length > 0 ? processedHistory[processedHistory.length - 1].role : "none",
    });

    // Determine which model to use
    const model = usePerformanceModel ? MINI_MODEL : BASE_MODEL;

    console.log(`[INFO] [${requestId}] Calling OpenAI API with ${processedHistory.length} messages`, {
      model,
      agentType,
      functionsCount: getToolsForAgent(agentType).length,
      isHandoffContinuation: !!requestData.isHandoffContinuation,
      previousAgent: requestData.previousAgentType || "main",
      handoffReason: requestData.handoffReason || "",
    });

    // Call OpenAI API with retry mechanism
    const completion = await callOpenAIWithRetry(
      requestId,
      model,
      processedHistory,
      getToolsForAgent(agentType),
      agentType
    );

    // Process the response
    let responseContent = "";
    let handoffDetails = null;
    let structuredOutput = null;

    // Check if there's a tool call in the response
    if (completion.choices[0]?.message?.tool_calls?.length > 0) {
      const toolCall = completion.choices[0].message.tool_calls[0];
      console.log(`[INFO] [${requestId}] Function call detected: ${toolCall.function.name}  `);

      // Check if it's a handoff request
      if (toolCall.function.name.startsWith("transfer_to_")) {
        const targetAgent = toolCall.function.name.replace("transfer_to_", "").replace("_agent", "");
        const args = JSON.parse(toolCall.function.arguments || "{}");
        
        handoffDetails = {
          targetAgent,
          reason: args.reason || `The ${agentType} agent is handing off to the ${targetAgent} agent`,
          additionalContext: args.additionalContext || {}
        };
        
        console.log(`[INFO] [${requestId}] Handoff requested to ${targetAgent}`, handoffDetails);
        
        // For handoffs, we'll return a special message
        responseContent = `I'm handing this off to our ${getAgentName(targetAgent)} who can better assist you with this. ${args.reason || ""}`;
      } else {
        // Handle other tool calls (could be expanded)
        responseContent = "I need to execute a tool to help with your request...";
      }
    } else {
      // Regular text response
      responseContent = completion.choices[0]?.message?.content || "I'm not sure how to respond to that.";
    }

    // Create the final response object
    const response = {
      role: "assistant",
      content: responseContent,
      agentType: agentType,
      handoffRequest: handoffDetails,
      structured_output: structuredOutput,
      conversationId: requestData.runId || requestId,
      sessionId: requestData.groupId || requestId,
    };

    // Return the response
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`Error in multi-agent-chat: ${error.message}`);
    
    // Check if it's an OpenAI API quota error
    if (
      error.message?.includes("quota") ||
      error.message?.includes("rate limit") ||
      error.message?.includes("exceeded your current quota")
    ) {
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API quota exceeded", 
          message: "Our AI service has reached its usage limit. Please try again later." 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        message: "There was an error processing your request." 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

// Helper function to process conversation history
function processConversationHistory(history: any[]) {
  if (!history || !Array.isArray(history)) return [];
  
  // Filter out items without role or content
  return history
    .filter(item => item && item.role && (item.content || item.role === "system"))
    .map(item => ({
      role: item.role,
      content: item.content || "",
      // Include other relevant fields
    }));
}

// Helper to get tools for a specific agent type
function getToolsForAgent(agentType: string) {
  // Define tools for different agent types
  const commonTools = [
    {
      type: "function",
      function: {
        name: "transfer_to_main_agent",
        description: "Transfer the conversation to the main assistant agent for general help",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "The reason for transferring to the main assistant"
            }
          },
          required: ["reason"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "transfer_to_script_agent",
        description: "Transfer to the script writer agent for creating or editing scripts",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "The reason for transferring to the script writer"
            },
            additionalContext: {
              type: "object",
              description: "Additional context to provide to the script writer",
              properties: {
                scriptType: {
                  type: "string",
                  description: "The type of script to create (e.g., video, advertisement, etc.)"
                }
              }
            }
          },
          required: ["reason"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "transfer_to_image_agent",
        description: "Transfer to the image generator agent for creating visual content",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "The reason for transferring to the image generator"
            }
          },
          required: ["reason"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "transfer_to_tool_agent",
        description: "Transfer to the tool agent for using specialized tools",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "The reason for transferring to the tool agent"
            },
            toolName: {
              type: "string",
              description: "The specific tool to use"
            }
          },
          required: ["reason"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "transfer_to_scene_agent",
        description: "Transfer to the scene creator agent for planning and creating visual scenes",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "The reason for transferring to the scene creator agent"
            }
          },
          required: ["reason"]
        }
      }
    }
  ];
  
  // Return appropriate tools based on agent type
  return commonTools;
}

// Helper to call OpenAI API with retry logic
async function callOpenAIWithRetry(requestId: string, model: string, messages: any[], tools: any[], agentType: string, retryCount = 0) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        tools: tools,
        tool_choice: "auto"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData, null, 4)}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[ERROR] [${requestId}] API call error (attempt ${retryCount + 1}):`, error);
    
    // Check for OpenAI quota error - no need to retry these
    if (
      error.message?.includes("quota") || 
      error.message?.includes("exceeded your current quota") ||
      error.message?.includes("insufficient_quota")
    ) {
      console.log(`[INFO] [${requestId}] OpenAI quota exceeded, breaking retry loop `);
      throw error;
    }
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`[INFO] [${requestId}] Retrying API call after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callOpenAIWithRetry(requestId, model, messages, tools, agentType, retryCount + 1);
    }
    
    console.error(`[ERROR] [${requestId}] All ${MAX_RETRIES} retries failed`, error);
    throw error;
  }
}

// Helper to get human-readable agent name
function getAgentName(agentType: string): string {
  switch (agentType) {
    case "main": return "Assistant";
    case "script": return "Script Writer";
    case "image": return "Image Generator";
    case "tool": return "Tool Specialist";
    case "scene": return "Scene Creator";
    default: return "Specialist";
  }
}

// Helper to extract user ID from JWT
function extractUserIdFromJWT(token: string): string {
  try {
    // Simple JWT parsing - in production you would verify the token
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    return payload.sub || "anonymous";
  } catch (e) {
    console.error("Error extracting user ID from JWT:", e);
    return "anonymous";
  }
}

// Helper to get project details
async function getProjectDetails(projectId: string) {
  // In a real implementation, this would fetch project details from a database
  return {
    title: `Canvas Project ${projectId}`,
    scenes: [1, 2, 3, 4, 5, 6, 7], // Mock scene count
    hasFullScript: true
  };
}
