
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { Agent, Context, FunctionTool, ModelSettings } from "https://esm.sh/@langchain/openai";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define agent models
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

// Create a simple context class for agent runs
class AgentContext extends Context {
  userId: string;
  availableTools: any[];
  enableDirectToolExecution: boolean;
  usePerformanceModel: boolean;
  isHandoffContinuation: boolean;
  requestedTool?: string;
  isCustomAgent: boolean;
  customInstructions?: string;

  constructor(data: {
    userId: string;
    availableTools?: any[];
    enableDirectToolExecution?: boolean;
    usePerformanceModel?: boolean;
    isHandoffContinuation?: boolean;
    requestedTool?: string;
    isCustomAgent?: boolean;
    customInstructions?: string;
  }) {
    super();
    this.userId = data.userId;
    this.availableTools = data.availableTools || [];
    this.enableDirectToolExecution = data.enableDirectToolExecution ?? true;
    this.usePerformanceModel = data.usePerformanceModel ?? false;
    this.isHandoffContinuation = data.isHandoffContinuation ?? false;
    this.requestedTool = data.requestedTool;
    this.isCustomAgent = data.isCustomAgent ?? false;
    this.customInstructions = data.customInstructions;
  }
}

function createBrowserUseTool() {
  return new FunctionTool({
    name: "browser-use",
    description: "Browse the web to perform tasks using an automated browser",
    parameters: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task to perform using the browser"
        },
        save_browser_data: {
          type: "boolean",
          description: "Whether to save browser data (cookies, etc.)",
          default: true
        }
      },
      required: ["task"]
    },
    async func(args, agentContext: AgentContext) {
      console.log("Browser-use tool called with args:", args);
      return `I'll help you with browsing: ${args.task}. To execute this task, please use the browser-use agent directly.`;
    }
  });
}

function createProductVideoTool() {
  return new FunctionTool({
    name: "product-video",
    description: "Generate product videos",
    parameters: {
      type: "object",
      properties: {
        product_name: {
          type: "string",
          description: "Name of the product"
        },
        description: {
          type: "string",
          description: "Description of the product"
        }
      },
      required: ["product_name", "description"]
    },
    async func(args, agentContext: AgentContext) {
      console.log("Product-video tool called with args:", args);
      return `I'll help you create a video for ${args.product_name}. To execute this task, please use the product-video agent directly.`;
    }
  });
}

function createCustomVideoTool() {
  return new FunctionTool({
    name: "custom-video",
    description: "Create custom video content",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the video"
        },
        script: {
          type: "string",
          description: "Script content for the video"
        }
      },
      required: ["title", "script"]
    },
    async func(args, agentContext: AgentContext) {
      console.log("Custom-video tool called with args:", args);
      return `I'll help you create a custom video titled "${args.title}". To execute this task, please use the custom-video agent directly.`;
    }
  });
}

async function getCustomAgentInstructions(agentType: string, supabaseClient: any) {
  try {
    if (!agentType || agentType.length < 20) {
      return null;
    }

    // Get instructions from the database for custom agents
    const { data, error } = await supabaseClient
      .from('custom_agents')
      .select('instructions')
      .eq('id', agentType)
      .single();

    if (error || !data) {
      console.error("Error fetching custom agent instructions:", error);
      return null;
    }

    return data.instructions;
  } catch (error) {
    console.error("Error in getCustomAgentInstructions:", error);
    return null;
  }
}

function createAgent(agentType: string, contextData: any, customInstructions?: string) {
  // Get the model to use
  const model = contextData.usePerformanceModel ? "gpt-4o-mini" : (AGENT_MODELS[agentType] || "gpt-4o");
  
  // Prepare system instruction based on agent type
  let systemInstruction = "";
  
  if (contextData.isCustomAgent && customInstructions) {
    systemInstruction = customInstructions;
  } else {
    systemInstruction = AGENT_INSTRUCTIONS[agentType] || AGENT_INSTRUCTIONS.main;
  }
  
  // Enhance system instruction with context data
  let enhancedInstruction = systemInstruction;
  
  if (contextData.enableDirectToolExecution) {
    enhancedInstruction += " You can execute tools directly.";
  }
  
  if (contextData.isHandoffContinuation) {
    enhancedInstruction += " This conversation was handed off to you from another agent.";
  }
  
  if (contextData.availableTools && Array.isArray(contextData.availableTools)) {
    enhancedInstruction += " Available tools: " + contextData.availableTools.join(", ") + ".";
  }
  
  if (contextData.requestedTool) {
    enhancedInstruction += ` The user has specifically requested to use the ${contextData.requestedTool} tool.`;
  }

  // Create the list of tools based on agent type
  const tools = [];
  if (agentType === "tool" || contextData.enableDirectToolExecution) {
    tools.push(createBrowserUseTool());
    tools.push(createProductVideoTool());
    tools.push(createCustomVideoTool());
  }

  // Create an agent with OpenAI
  const agent = new Agent({
    name: agentType,
    instructions: enhancedInstruction,
    model: model,
    model_settings: new ModelSettings({
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1000
    }),
    tools: tools
  });

  return agent;
}

function detectHandoffRequest(content: string): { targetAgent: string; reason: string } | null {
  const handoffRegex = /HANDOFF TO:\s*(\w+)(?:\s+REASON:\s*([^\n]+))?/i;
  const match = content.match(handoffRegex);
  
  if (match) {
    return {
      targetAgent: match[1].toLowerCase(),
      reason: match[2] || "No reason specified"
    };
  }
  
  return null;
}

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

    // Parse the request body as JSON
    const { messages, agentType = "main", userId, contextData = {} } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid request: messages array is required");
    }

    console.log(`[${requestId}] Processing ${messages.length} messages for agent type: ${agentType}`);
    
    // Check if this is a valid agent type
    if (!AGENT_MODELS[agentType] && !contextData.isCustomAgent) {
      console.warn(`[${requestId}] Unknown agent type: ${agentType}, falling back to main`);
    }
    
    // Get custom instructions if this is a custom agent
    let customInstructions;
    if (contextData.isCustomAgent) {
      // This would actually fetch from DB but we're mocking it for now
      customInstructions = contextData.customInstructions || 
        "You are a custom AI assistant. Respond helpfully to the user's queries.";
    }
    
    // Create the agent based on agent type
    const agent = createAgent(agentType, contextData, customInstructions);
    
    // Create a context for the agent
    const context = new AgentContext({
      userId: userId || "anonymous",
      availableTools: contextData.availableTools || [],
      enableDirectToolExecution: contextData.enableDirectToolExecution || false,
      usePerformanceModel: contextData.usePerformanceModel || false,
      isHandoffContinuation: contextData.isHandoffContinuation || false,
      requestedTool: contextData.requestedTool,
      isCustomAgent: contextData.isCustomAgent || false,
      customInstructions: customInstructions
    });
    
    // Format messages for the agent
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    console.log(`[${requestId}] Running agent with ${formattedMessages.length} messages`);
    
    // Run the agent to get a response
    const response = await agent.run(context, formattedMessages);
    
    // Get the text content from the response
    const content = response.content;
    console.log(`[${requestId}] Received completion from OpenAI (${content.length} chars)`);

    // Check if there's a handoff request
    const handoffRequest = detectHandoffRequest(content);
    if (handoffRequest) {
      console.log(`[${requestId}] Detected handoff request to: ${handoffRequest.targetAgent}`);
    }

    // Return the response
    return new Response(
      JSON.stringify({
        completion: content,
        handoffRequest: handoffRequest,
        modelUsed: agent.model || "gpt-4o"
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
