
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
  agentType: "main" | "script" | "image" | "tool";
  userId: string;
  contextData?: Record<string, any>;
}

async function getAgentCompletion(
  messages: AgentMessage[], 
  agentType: string, 
  contextData?: Record<string, any>
): Promise<string> {
  // Set the system message based on agent type
  let systemMessage: AgentMessage;
  
  const hasAttachments = contextData?.hasAttachments || false;
  const attachmentTypes = contextData?.attachmentTypes || [];
  const availableTools = contextData?.availableTools || [];
  
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
    toolsContext += "Only use tools when the user explicitly requests functionality that requires them. Otherwise, provide helpful information as normal.";
  }
  
  // Add handoff capability to all agents
  const handoffContext = `
You can hand off the conversation to another specialized agent when appropriate. 
Available agents:
- main: General-purpose AI assistant for broad queries
- script: Specialized in creating scripts, dialogue, and narrative content
- image: Creates detailed prompts for AI image generation systems
- tool: Helps users use tools like image-to-video conversion

To hand off to another agent, use this format at the end of your response:
HANDOFF: {agentType}, REASON: {short reason for handoff}

Only hand off when the user's request clearly falls into another agent's specialty and you cannot provide the best response.
`;
  
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
        content: `You are ToolOrchestratorAgent, specialized in determining which tool to use based on user requests. ${toolsContext} ${attachmentContext} ${handoffContext}`
      };
      break;
    default: // main
      systemMessage = {
        role: "system",
        content: `You are a helpful assistant that orchestrates specialized agents for creative content generation. You can help with scriptwriting, image prompt creation, and using tools for visual content creation. ${attachmentContext} ${handoffContext}`
      };
  }
  
  // Prepend system message to the messages array
  const fullMessages = [systemMessage, ...messages];
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: fullMessages,
        temperature: agentType === "tool" ? 0.1 : 0.7,
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API returned error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`Error in ${agentType} agent:`, error);
    throw error;
  }
}

function parseHandoffRequest(text: string): { targetAgent: string, reason: string } | null {
  // Parse handoff format: HANDOFF: {agentType}, REASON: {reason}
  const handoffMatch = text.match(/HANDOFF:\s*(\w+),\s*REASON:\s*(.+)$/im);
  
  if (handoffMatch) {
    const targetAgent = handoffMatch[1].toLowerCase();
    const reason = handoffMatch[2].trim();
    
    // Validate the agent type
    if (['main', 'script', 'image', 'tool'].includes(targetAgent)) {
      return { targetAgent, reason };
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
    const { error } = await supabase
      .from('agent_interactions')
      .insert({
        user_id: userId,
        agent_type: agentType,
        user_message: userMessage,
        assistant_response: assistantResponse,
        has_attachments: hasAttachments,
        timestamp: new Date().toISOString()
      });
      
    if (error) {
      console.error("Error logging agent interaction:", error);
    }
  } catch (err) {
    console.error("Failed to log agent interaction:", err);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body
    const request = await req.json() as MultiAgentRequest;
    const { messages, agentType, userId, contextData } = request;
    
    // Get user message (last message in the array)
    const userMessage = messages[messages.length - 1].content;
    const hasAttachments = contextData?.hasAttachments || false;
    
    // Check credits before proceeding
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single();
      
    if (creditsError || !userCredits || userCredits.credits_remaining < 0.07) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. You need at least 0.07 credits." }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Deduct credits
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
    
    // Get response from OpenAI
    const completion = await getAgentCompletion(messages, agentType, contextData);
    
    // Check if response contains a handoff request
    const handoffRequest = parseHandoffRequest(completion);
    
    // Log the interaction
    await logAgentInteraction(supabase, userId, agentType, userMessage, completion, hasAttachments);
    
    // Return the response
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
