
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  name?: string;
}

interface MultiAgentRequest {
  messages: AgentMessage[];
  agentType: string;
  userId: string;
  contextData?: Record<string, any>;
}

interface CustomAgent {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

interface HandoffInputData {
  input_history: string | any[];
  pre_handoff_items: any[];
  new_items: any[];
  all_items?: any[];
}

async function getCustomAgentInstructions(supabase: any, agentType: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('custom_agents')
      .select('instructions')
      .eq('id', agentType)
      .single();
    
    if (error) {
      console.error("Error getting custom agent instructions:", error);
      return null;
    }
    
    return data?.instructions || null;
  } catch (error) {
    console.error("Failed to fetch custom agent instructions:", error);
    return null;
  }
}

async function getCustomAgentsForHandoff(supabase: any): Promise<CustomAgent[]> {
  try {
    console.log("Fetching custom agents for handoff");
    const { data, error } = await supabase
      .from('custom_agents')
      .select('id, name, description, instructions');
    
    if (error) {
      console.error("Error fetching custom agents:", error);
      return [];
    }
    
    console.log(`Retrieved ${data?.length || 0} custom agents:`, data?.map(a => a.id).join(', '));
    return data || [];
  } catch (error) {
    console.error("Failed to fetch custom agents for handoff:", error);
    return [];
  }
}

async function generateHandoffContextWithCustomAgents(supabase: any): Promise<string> {
  // Get custom agents from the database
  const customAgents = await getCustomAgentsForHandoff(supabase);
  console.log(`Building handoff context with ${customAgents.length} custom agents`);
  
  // Define built-in agents
  const builtInAgents = [
    { id: "main", name: "Main Assistant", description: "General-purpose AI assistant for broad queries" },
    { id: "script", name: "Script Writer", description: "Specialized in creating scripts, dialogue, and narrative content" },
    { id: "image", name: "Image Prompt", description: "Creates detailed prompts for AI image generation systems" },
    { id: "tool", name: "Tool Orchestrator", description: "Helps users use tools like image-to-video conversion" }
  ];
  
  // Combine built-in and custom agents
  const allAgents = [...builtInAgents];
  
  // Add custom agents with special indicator
  if (customAgents.length > 0) {
    customAgents.forEach(agent => {
      allAgents.push({
        id: agent.id,
        name: agent.name,
        description: agent.description
      });
    });
  }
  
  // Generate the handoff context text
  let handoffContext = `
You can hand off the conversation to another specialized agent when appropriate. 
Available agents:
`;

  // Add all agents to the context
  allAgents.forEach(agent => {
    handoffContext += `- ${agent.id}: ${agent.description}\n`;
  });

  handoffContext += `
IMPORTANT: When you determine that another agent would be better suited to handle the user's request, you MUST end your response with the EXACT format:

HANDOFF: {agentType}, REASON: {short reason for handoff}

For example:
"I can help with basic information about images, but for creating detailed image prompts...
HANDOFF: image, REASON: User needs specialized image prompt creation"

OR:
"Here's some general information about video creation. For using our video tools...
HANDOFF: tool, REASON: User needs to access video conversion tools"

Only hand off when the user's request clearly falls into another agent's specialty and you cannot provide the best response.
`;

  return handoffContext;
}

async function getAgentCompletion(
  messages: AgentMessage[], 
  agentType: string, 
  contextData?: Record<string, any>,
  supabase?: any
): Promise<string> {
  let systemMessage: AgentMessage;
  
  const hasAttachments = contextData?.hasAttachments || false;
  const attachmentTypes = contextData?.attachmentTypes || [];
  const availableTools = contextData?.availableTools || [];
  const isCustomAgent = contextData?.isCustomAgent || false;
  
  console.log(`Agent type: ${agentType}, isCustomAgent: ${isCustomAgent}`);
  
  let attachmentContext = "";
  if (hasAttachments) {
    attachmentContext = "The user has shared some files with you. They are referenced in the user's message. ";
    
    if (attachmentTypes.includes("image")) {
      attachmentContext += "For image files, look for the URL in the user's message. You can view these images and use them in your response. ";
    }
    
    if (attachmentTypes.includes("file")) {
      attachmentContext += "For document files, look for the URL in the user's message. You can reference the content or help analyze documents. ";
    }
  }
  
  let toolsContext = "";
  if (agentType === "tool" && availableTools.length > 0) {
    toolsContext = "You have access to the following tools:\n\n";
    
    availableTools.forEach((tool: any) => {
      toolsContext += `Tool Name: ${tool.name}\n`;
      toolsContext += `Description: ${tool.description}\n`;
      toolsContext += `Required Credits: ${tool.required_credits}\n`;
      toolsContext += "Parameters:\n";
      
      Object.entries(tool.parameters).forEach(([key, value]: [string, any]) => {
        toolsContext += `- ${key}: ${value.description || "No description provided"}`;
        if (value.default !== undefined) {
          toolsContext += ` (Default: ${value.default})`;
        }
        if (value.enum) {
          toolsContext += ` (Options: ${value.enum.join(", ")})`;
        }
        toolsContext += "\n";
      });
      
      toolsContext += "\n";
    });
    
    toolsContext += "To use a tool, respond with the following format:\n";
    toolsContext += "TOOL: [tool-name], PARAMETERS: {\"param1\": \"value1\", \"param2\": \"value2\"}\n\n";
    toolsContext += "Only use tools when the user explicitly requests functionality that requires them. Otherwise, provide helpful information as normal.\n\n";
    
    toolsContext += "IMPORTANT TOOL USAGE NOTES:\n";
    toolsContext += "- For product-shot-v2, always use user-uploaded images when available. Look for image attachments in the user's message.\n";
    toolsContext += "- The product-shot-v2 tool is more advanced than product-shot-v1, with better scene composition, customization options, and quality.\n";
    toolsContext += "- ALWAYS recommend product-shot-v2 over product-shot-v1 for higher quality product images, unless the user specifically requests otherwise.\n";
    toolsContext += "- When using product-shot-v2, provide detailed scene descriptions for best results.\n";
    toolsContext += "- Always process image generation results in real-time to show the progress and final result in the conversation.\n";
  }

  // Get dynamic handoff context with both built-in and custom agents
  const handoffContext = await generateHandoffContextWithCustomAgents(supabase);
  console.log("Handoff context length:", handoffContext.length);

  // For custom agents, get instructions from the database
  if (isCustomAgent && supabase) {
    console.log(`Getting custom instructions for agent: ${agentType}`);
    const customInstructions = await getCustomAgentInstructions(supabase, agentType);
    
    if (customInstructions) {
      console.log(`Found custom instructions for ${agentType}, length: ${customInstructions.length}`);
      systemMessage = {
        role: "system",
        content: `${customInstructions}\n\n${attachmentContext}\n\n${handoffContext}`
      };
    } else {
      // Fallback if custom agent not found
      console.log(`No custom instructions found for ${agentType}, using fallback`);
      systemMessage = {
        role: "system",
        content: `You are a specialized AI assistant. Respond based on your expertise. ${attachmentContext} ${handoffContext}`
      };
    }
  } else {
    // Default agents
    console.log(`Using default system message for agent: ${agentType}`);
    switch(agentType) {
      case "script":
        systemMessage = {
          role: "system",
          content: `You are ScriptWriterAgent, specialized in creating compelling scripts, dialogue, and scene descriptions. Create content based solely on what the user requests. Be creative, engaging, and tailor the tone to the user's requirements. ${attachmentContext} ${handoffContext}`
        };
        break;
      case "image":
        systemMessage = {
          role: "system",
          content: `You are ImagePromptAgent, specialized in creating detailed, creative prompts for AI image generation. Your prompts should be specific, descriptive, and include details about style, mood, lighting, composition, and subject matter. Format your output as a single prompt string that could be directly used for image generation. ${attachmentContext} ${handoffContext}`
        };
        break;
      case "tool":
        systemMessage = {
          role: "system",
          content: `You are ToolOrchestratorAgent, specialized in determining which tool to use based on user requests. You can help users create product images, convert images to videos, and more. ${toolsContext} ${attachmentContext} ${handoffContext}`
        };
        break;
      default: // main
        systemMessage = {
          role: "system",
          content: `You are a helpful assistant that orchestrates specialized agents for creative content generation. You can help with scriptwriting, image prompt creation, and using tools for visual content creation. When you identify that a user's request would be better handled by a specialized agent, use the handoff format at the end of your message. ${attachmentContext} ${handoffContext}`
        };
    }
  }
  
  const fullMessages = [systemMessage, ...messages];
  console.log(`System message first 150 chars: ${systemMessage.content.slice(0, 150)}...`);
  
  try {
    const temperature = agentType === "tool" ? 0.1 : 0.7;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: fullMessages,
        temperature: temperature,
        ...(agentType !== "tool" && {
          response_format: { type: "text" }
        })
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API returned error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`${agentType} agent response:`, data.choices[0].message.content.slice(0, 150) + "...");
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`Error in ${agentType} agent:`, error);
    throw error;
  }
}

function parseHandoffRequest(text: string): { targetAgent: string, reason: string } | null {
  if (!text || typeof text !== 'string') {
    console.log("Invalid input to parseHandoffRequest:", text);
    return null;
  }

  console.log("Attempting to parse handoff from:", text.slice(-200));
  
  const handoffRegex = /HANDOFF:\s*(\w+)(?:,|\s)\s*REASON:\s*(.+?)(?:\n|$)/i;
  const handoffMatch = text.match(handoffRegex);
  
  if (handoffMatch) {
    const targetAgent = handoffMatch[1].toLowerCase();
    const reason = handoffMatch[2].trim();
    
    console.log(`Handoff detected: Agent=${targetAgent}, Reason=${reason}`);
    
    // Allow handoff to any agent including custom agents
    return { targetAgent, reason };
  } else {
    if (text.toLowerCase().includes("handoff:")) {
      console.log("Potential handoff format detected but couldn't parse completely");
    }
  }
  
  return null;
}

async function logAgentInteraction(
  supabase: any,
  userId: string,
  agentType: string,
  userMessage: string,
  assistantResponse: string,
  hasAttachments: boolean
) {
  try {
    // Validate input data
    if (!userId) {
      console.error("Missing userId in logAgentInteraction");
      return;
    }
    
    if (!agentType) {
      console.error("Missing agentType in logAgentInteraction");
      return;
    }
    
    // Ensure we have valid strings to work with
    const safeUserMessage = typeof userMessage === 'string' ? userMessage : '';
    const safeAssistantResponse = typeof assistantResponse === 'string' ? assistantResponse : '';
    
    // Truncate very long messages to prevent DB errors
    const maxMessageLength = 10000; // Set a reasonable limit
    const truncatedUserMessage = safeUserMessage.length > maxMessageLength 
      ? safeUserMessage.substring(0, maxMessageLength) + "..." 
      : safeUserMessage;
    
    const truncatedAssistantResponse = safeAssistantResponse.length > maxMessageLength
      ? safeAssistantResponse.substring(0, maxMessageLength) + "..."
      : safeAssistantResponse;
    
    console.log(`Logging interaction for user ${userId} with agent ${agentType}`);
    
    // Check if table exists and has required columns
    try {
      const { data: tableData, error: tableError } = await supabase
        .from('agent_interactions')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error("Error checking agent_interactions table:", tableError.message);
        // If table doesn't exist or has errors, exit gracefully
        return;
      }
    } catch (tableCheckError) {
      console.error("Failed to check agent_interactions table:", tableCheckError);
      return;
    }
    
    // Add has_attachments column if it doesn't exist (this is for backward compatibility)
    const hasAttachmentsValue = hasAttachments === true; // Ensure it's a boolean
    
    // Now attempt to insert the record
    const { data, error } = await supabase
      .from('agent_interactions')
      .insert({
        user_id: userId,
        agent_type: agentType,
        user_message: truncatedUserMessage,
        assistant_response: truncatedAssistantResponse,
        has_attachments: hasAttachmentsValue,
        timestamp: new Date().toISOString()
      });
      
    if (error) {
      console.error("Error logging agent interaction:", error.message, 
                   error.details ? error.details : "No details", 
                   error.hint ? error.hint : "No hint");
    } else {
      console.log("Successfully logged agent interaction");
    }
  } catch (err) {
    console.error("Failed to log agent interaction:", err instanceof Error ? err.message : String(err));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OpenAI API key is not configured" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const request = await req.json() as MultiAgentRequest;
    const { messages, agentType, userId, contextData } = request;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid messages array" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!agentType || typeof agentType !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid agent type" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!userId || typeof userId !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid user ID" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userMessage = messages[messages.length - 1]?.content || '';
    const hasAttachments = contextData?.hasAttachments || false;
    const isCustomAgent = contextData?.isCustomAgent || false;
    
    console.log(`Received request: Agent=${agentType}, isCustomAgent=${isCustomAgent}, hasAttachments=${hasAttachments}`);
    
    // Check if custom agent exists when isCustomAgent is true
    if (isCustomAgent) {
      const { data: agentData, error: agentError } = await supabase
        .from('custom_agents')
        .select('id, name')
        .eq('id', agentType)
        .single();
        
      if (agentError || !agentData) {
        console.error(`Custom agent not found: ${agentType}`, agentError);
        return new Response(
          JSON.stringify({ error: "Custom agent not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log(`Found custom agent: ${agentData.name} (${agentData.id})`);
      }
    }
    
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single();
      
    if (creditsError || !userCredits || userCredits.credits_remaining < 0.07) {
      console.error("Insufficient credits:", creditsError || `Credits: ${userCredits?.credits_remaining || 0}`);
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need at least 0.07 credits." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { error: deductError } = await supabase.rpc('safely_decrease_chat_credits', {
      credit_amount: 0.07
    });
    
    if (deductError) {
      console.error("Error deducting credits:", deductError);
      return new Response(
        JSON.stringify({ error: "Failed to process credits" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const completion = await getAgentCompletion(messages, agentType, contextData, supabase);
    
    const handoffRequest = parseHandoffRequest(completion);
    console.log("Handoff parsing result:", handoffRequest || "No handoff detected");
    
    try {
      await logAgentInteraction(supabase, userId, agentType, userMessage, completion, hasAttachments);
    } catch (logError) {
      // Don't fail the whole request if logging fails
      console.error("Error in logging agent interaction:", logError);
    }
    
    return new Response(
      JSON.stringify({ 
        completion,
        agentType,
        status: "completed",
        createdAt: new Date().toISOString(),
        handoffRequest
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in multi-agent-chat function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
