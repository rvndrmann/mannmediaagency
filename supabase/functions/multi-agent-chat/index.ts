
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{type: string, text?: string, image_url?: {url: string}}>;
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

// Define built-in agent types to avoid UUID validation for them
const BUILT_IN_AGENT_TYPES = ['main', 'script', 'image', 'tool', 'scene'];

// Add a utility function to validate UUID format
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Check if the agent type is a built-in type
function isBuiltInAgentType(agentType: string): boolean {
  return BUILT_IN_AGENT_TYPES.includes(agentType.toLowerCase());
}

async function getCustomAgentInstructions(supabase: any, agentType: string): Promise<string | null> {
  try {
    console.log(`Fetching custom agent instructions for: ${agentType}`);
    
    // First check if this is a built-in agent type - if so, we need to use default instructions
    if (isBuiltInAgentType(agentType)) {
      console.log(`${agentType} is a built-in agent type, will use user-modified instructions if available`);
      return null;
    }
    
    // Only validate UUID format for custom agents
    if (!isValidUUID(agentType)) {
      console.error(`Invalid UUID format for custom agent ID: ${agentType}`);
      return null;
    }
    
    const { data, error } = await supabase
      .from('custom_agents')
      .select('instructions')
      .eq('id', agentType)
      .single();
    
    if (error) {
      console.error("Error getting custom agent instructions:", error);
      return null;
    }
    
    console.log(`Retrieved instructions for ${agentType}, length: ${data?.instructions?.length || 0}`);
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
    { id: "tool", name: "Tool Orchestrator", description: "Helps users use tools like image-to-video conversion" },
    { id: "scene", name: "Scene Description", description: "Creates detailed scene descriptions for visual content" }
  ];
  
  // Combine built-in and custom agents
  const allAgents = [...builtInAgents, ...customAgents];
  
  // Generate the handoff context text
  let handoffContext = `
You can hand off the conversation to another specialized agent when appropriate. 
Available agents:

BUILT-IN AGENTS:
`;

  // Add built-in agents to the context
  builtInAgents.forEach(agent => {
    handoffContext += `- ${agent.name} (${agent.id}): ${agent.description}\n`;
  });

  // Add custom agents separately if any exist
  if (customAgents.length > 0) {
    handoffContext += `\nCUSTOM AGENTS:\n`;
    customAgents.forEach(agent => {
      handoffContext += `- ${agent.name} (${agent.id}): ${agent.description}\n`;
    });
  }

  handoffContext += `
IMPORTANT: When you determine that another agent would be better suited to handle the user's request, you MUST end your response with this EXACT format:

HANDOFF: {agentType}
REASON: {short reason for handoff}

For example:
"I can help with basic information about images, but for creating detailed image prompts...

HANDOFF: image
REASON: User needs specialized image prompt creation"

OR:
"Here's some general information about scene setting. For creating detailed scene descriptions...

HANDOFF: scene
REASON: User needs specialized scene description assistance"

For custom agents, use their exact ID for the handoff:
"This looks like a specialized request that I'm not equipped to handle best...

HANDOFF: 123e4567-e89b-12d3-a456-426614174000
REASON: User needs help with this specific domain"

Make sure to place the HANDOFF and REASON on separate lines exactly as shown above.
Only hand off when the user's request clearly falls into another agent's specialty and you cannot provide the best response.
`;

  console.log("Handoff context length:", handoffContext.length);
  return handoffContext;
}

// Create an agent with only the user-provided instructions while adding essential contexts
async function createAgentWithInstructions(
  instructionsFromUser: string | null, 
  attachmentContext: string,
  handoffContext: string,
  toolsContext: string = "",
  isHandoffContinuation: boolean = false,
  agentType: string = "main"
): Promise<AgentMessage> {
  // Default temperature based on agent type
  let defaultTemperature = 0.7;
  if (agentType === "tool") {
    defaultTemperature = 0.1;
  }
  
  // Create context-specific instructions for handoff continuation
  let handoffContinuationContext = "";
  if (isHandoffContinuation) {
    handoffContinuationContext = `
You are continuing a conversation that was handed off to you from another agent. 
The previous agent determined that you would be better suited to handle this request.
Review the conversation history provided to understand the user's needs and respond accordingly.
Focus on your specialization and provide a helpful response without asking the user to repeat information.

IMPORTANT: Messages marked as 'previous_agent_*' in the conversation are from other agents. You should consider 
this context but respond as yourself, the current agent.
`;
  }
  
  // If no custom instructions provided, use a basic template
  let baseInstructions = `You are an AI assistant helping with the user's request. Respond helpfully and provide accurate information.`;
  
  // Start with the base content
  let finalContent = instructionsFromUser || baseInstructions;
  
  // Add handoff continuation context first if applicable
  if (isHandoffContinuation) {
    finalContent = `${handoffContinuationContext}\n\n${finalContent}`;
  }
  
  // Add essential contexts for full functionality
  finalContent += `\n\n${attachmentContext}\n\n${handoffContext}`;
  
  // Add tools context for tool agent
  if (agentType === "tool" && toolsContext) {
    finalContent += `\n\n${toolsContext}`;
  }
  
  console.log(`Created agent with instructions: ${finalContent.slice(0, 100)}...`);
  
  return {
    role: "system",
    content: finalContent
  };
}

// Process messages to optimize for the current agent context
function processMessagesForContext(messages: AgentMessage[], agentType: string, isHandoffContinuation: boolean): AgentMessage[] {
  if (!isHandoffContinuation) {
    // For regular interactions, maintain all messages but ensure they're properly formatted
    return messages.map(msg => {
      // Make sure all messages have the correct properties
      return {
        role: msg.role,
        content: msg.content,
        ...(msg.name ? { name: msg.name } : {})
      };
    });
  }
  
  // For handoff continuation, we need to make the context clear to the AI
  console.log("Processing messages for handoff continuation");
  
  // Add a special system message explaining the context continuation
  const contextMessage: AgentMessage = {
    role: "system",
    content: `The conversation is being continued by the ${agentType} agent after a handoff. Review the previous messages to understand context. Focus on responding to the user's needs without asking for information they've already provided.`
  };
  
  // For handoff continuation, we need to enhance the AI's understanding
  const enhancedMessages = messages.map(msg => {
    // If the message is from a previous agent, make it clearer
    if (msg.name && msg.name.startsWith('previous_agent_')) {
      return {
        ...msg,
        content: typeof msg.content === 'string' ? `[From previous agent]: ${msg.content}` : msg.content
      };
    }
    return msg;
  });
  
  // Insert the context message after the main system message (which should be first)
  if (enhancedMessages.length > 0 && enhancedMessages[0].role === 'system') {
    return [
      enhancedMessages[0],
      contextMessage,
      ...enhancedMessages.slice(1)
    ];
  }
  
  // Or prepend it if there's no system message
  return [contextMessage, ...enhancedMessages];
}

// Process attachment URLs to prepare them for vision models
function processAttachmentUrls(messages: AgentMessage[], hasAttachments: boolean): AgentMessage[] {
  if (!hasAttachments) {
    return messages;
  }

  console.log("Processing messages for attachments");
  
  return messages.map(msg => {
    if (msg.role !== 'user' || typeof msg.content !== 'string') {
      return msg;
    }
    
    // Check if the message has attachment URLs
    const attachmentRegex = /\[Attached (image|file): .+?, URL: (https?:\/\/[^\s\]]+)\]/g;
    const attachmentMatches = [...msg.content.matchAll(attachmentRegex)];
    
    if (attachmentMatches.length === 0) {
      return msg;
    }
    
    // Convert message to the multimodal format
    const multiModalContent: Array<{type: string, text?: string, image_url?: {url: string}}> = [];
    
    // Extract the text content without the attachment markers
    let textContent = msg.content;
    const imageUrls: string[] = [];
    
    // First collect all image URLs
    attachmentMatches.forEach(match => {
      const type = match[1]; // 'image' or 'file'
      const url = match[2];
      
      if (type === 'image') {
        imageUrls.push(url);
      }
      
      // Remove the attachment marker from the text
      textContent = textContent.replace(match[0], '');
    });
    
    // Clean up the text content (remove extra newlines and trim)
    textContent = textContent.replace(/\n{3,}/g, '\n\n').trim();
    
    // Add the text part if it's not empty
    if (textContent) {
      multiModalContent.push({ type: 'text', text: textContent });
    }
    
    // Add all image URLs
    imageUrls.forEach(url => {
      multiModalContent.push({ 
        type: 'image_url', 
        image_url: { url }
      });
    });
    
    return {
      ...msg,
      content: multiModalContent
    };
  });
}

async function getAgentCompletion(
  messages: AgentMessage[], 
  agentType: string, 
  contextData?: Record<string, any>,
  supabase?: any
): Promise<{ completion: string, handoffRequest?: { targetAgent: string, reason: string }, modelUsed: string }> {
  const hasAttachments = contextData?.hasAttachments || false;
  const attachmentTypes = contextData?.attachmentTypes || [];
  const availableTools = contextData?.availableTools || [];
  const isCustomAgent = contextData?.isCustomAgent || false;
  const isHandoffContinuation = contextData?.isHandoffContinuation || false;
  const usePerformanceModel = contextData?.usePerformanceModel || false;
  const userInstructions = contextData?.userInstructions || null;
  
  // First determine if this is a built-in agent type
  const isActuallyBuiltIn = isBuiltInAgentType(agentType);
  
  console.log(`Agent type: ${agentType}, isBuiltIn: ${isActuallyBuiltIn}, isCustomAgent flag: ${isCustomAgent}, isHandoffContinuation: ${isHandoffContinuation}, usePerformanceModel: ${usePerformanceModel}, hasAttachments: ${hasAttachments}`);
  console.log(`User instructions provided: ${userInstructions ? 'Yes' : 'No'}, length: ${userInstructions?.length || 0}`);
  
  // Build attachment context
  let attachmentContext = "";
  if (hasAttachments) {
    attachmentContext = "The user has shared some files with you. They are referenced in the user's message. ";
    
    if (attachmentTypes.includes("image")) {
      attachmentContext += "For image files, you can view these images directly as they are included in the message. Analyze these images in detail and comment on their visual content as if you can see them. ";
    }
    
    if (attachmentTypes.includes("file")) {
      attachmentContext += "For document files, look for the URL in the user's message. You can reference the content or help analyze documents. ";
    }
  }
  
  // Build tools context
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
  }

  // Get dynamic handoff context with both built-in and custom agents
  const handoffContext = await generateHandoffContextWithCustomAgents(supabase);
  console.log("Handoff context length:", handoffContext.length);

  // Determine which instructions to use:
  // 1. User-provided instructions in the context data
  // 2. Custom agent instructions from database (for custom agents)
  // 3. Default basic instructions as fallback
  let instructionsToUse = userInstructions;
  
  // If no user instructions provided but it's a custom agent, try to get from database
  if (!instructionsToUse && isCustomAgent && !isActuallyBuiltIn && supabase) {
    console.log(`Getting custom instructions for agent: ${agentType}`);
    instructionsToUse = await getCustomAgentInstructions(supabase, agentType);
    
    if (instructionsToUse) {
      console.log(`Found custom instructions for ${agentType}, length: ${instructionsToUse.length}`);
    } else {
      console.log(`No custom instructions found for ${agentType}, will use fallback`);
    }
  }
  
  // Set temperature based on agent type
  let temperature = 0.7;
  if (agentType === "tool") {
    temperature = 0.1;
  }
  
  // Create the agent with simplified instruction pattern
  const systemMessage = await createAgentWithInstructions(
    instructionsToUse,
    attachmentContext,
    handoffContext,
    toolsContext,
    isHandoffContinuation,
    agentType
  );
  
  // Process messages to optimize them for the current context
  let processedMessages = processMessagesForContext(messages, agentType, isHandoffContinuation);
  
  // Process attachment URLs for vision models if needed
  processedMessages = processAttachmentUrls(processedMessages, hasAttachments);
  
  // Add our system message at the beginning
  const fullMessages = [systemMessage, ...processedMessages];
  console.log(`System message first 150 chars: ${typeof systemMessage.content === 'string' ? systemMessage.content.slice(0, 150) : 'Complex content'}...`);
  console.log(`Sending ${fullMessages.length} messages to OpenAI`);
  
  // If this is a handoff continuation, add a special log
  if (isHandoffContinuation) {
    console.log(`This is a handoff continuation to ${agentType} agent`);
  }
  
  try {
    // Choose model based on performance setting
    const modelToUse = usePerformanceModel ? "gpt-4o-mini" : "gpt-4o";
    console.log(`Using model: ${modelToUse}`);
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: fullMessages,
        temperature: temperature,
        max_tokens: 4000,
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
    const completion = data.choices[0].message.content;
    console.log(`${agentType} agent response:`, completion.slice(0, 150) + "...");
    
    // Check for handoff requests
    const handoffRequest = parseHandoffRequest(completion);
    
    // Logging for trace analysis
    if (handoffRequest) {
      console.log(`Handoff detected: ${handoffRequest.targetAgent}, Reason: ${handoffRequest.reason}`);
    } else {
      console.log("Handoff parsing result: No handoff detected");
    }
    
    return { 
      completion, 
      handoffRequest, 
      modelUsed: modelToUse 
    };
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

  console.log("Attempting to parse handoff from:", text.slice(-300));
  
  // More flexible regex that can handle variations in format
  // This handles cases with or without comma, with different spacing, and different capitalization
  const handoffRegex = /HANDOFF:\s*([a-z0-9_-]+)(?:[,\s]\s*REASON:|\s+REASON:)\s*(.+?)(?:$|[\n\r])/is;
  const handoffMatch = text.match(handoffRegex);
  
  if (handoffMatch) {
    const targetAgent = handoffMatch[1].toLowerCase().trim();
    const reason = handoffMatch[2].trim();
    
    console.log(`Handoff detected: Agent=${targetAgent}, Reason=${reason}`);
    
    // Allow handoff to any agent including custom agents
    return { targetAgent, reason };
  } else {
    // Check if there's a partial match that needs more flexible parsing
    if (text.toLowerCase().includes("handoff")) {
      console.log("Potential handoff detected. Trying alternative parsing method.");
      
      // Try a two-step approach
      const handoffPart = text.match(/HANDOFF:\s*([a-z0-9_-]+)/i);
      const reasonPart = text.match(/REASON:\s*(.+?)(?:$|[\n\r])/i);
      
      if (handoffPart && reasonPart) {
        const targetAgent = handoffPart[1].toLowerCase().trim();
        const reason = reasonPart[1].trim();
        
        console.log(`Handoff detected using alternative parsing: Agent=${targetAgent}, Reason=${reason}`);
        return { targetAgent, reason };
      }
      
      // If we have just the agent but no reason, provide a default reason
      if (handoffPart) {
        const targetAgent = handoffPart[1].toLowerCase().trim();
        const reason = "Specialized assistance required";
        
        console.log(`Partial handoff detected, using default reason: Agent=${targetAgent}, Reason=${reason}`);
        return { targetAgent, reason };
      }
      
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
  modelUsed: string,
  hasAttachments: boolean,
  traceId?: string
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
    
    console.log(`Logging interaction for user ${userId} with agent ${agentType}, modelUsed: ${modelUsed}`);
    
    // Prepare trace metadata if available
    let metadata = {};
    if (traceId) {
      metadata = {
        trace: {
          id: traceId,
          modelUsed
        }
      };
    }
    
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
        timestamp: new Date().toISOString(),
        metadata
      });
      
    if (error) {
      console.error("Error logging agent interaction:", error.message, 
                   error.details ? error.details : "No details", 
                   error.hint ? error.hint : "No hint");
    } else {
      console.log("Successfully logged agent interaction with trace data");
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
    
    // Get the latest user message for logging
    const isHandoffContinuation = contextData?.isHandoffContinuation || false;
    let userMessage = '';
    
    // Find the last user message to log
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessage = typeof messages[i].content === 'string' 
          ? messages[i].content 
          : JSON.stringify(messages[i].content);
        break;
      }
    }
    
    const hasAttachments = contextData?.hasAttachments || false;
    const isCustomAgent = contextData?.isCustomAgent || false;
    const enableDirectToolExecution = contextData?.enableDirectToolExecution || false;
    const traceId = contextData?.traceId || null;
    const userInstructions = contextData?.userInstructions || null;
    
    console.log(`Received request: Agent=${agentType}, isCustomAgent=${isCustomAgent}, hasAttachments=${hasAttachments}, isHandoffContinuation=${isHandoffContinuation}, enableDirectToolExecution=${enableDirectToolExecution}, traceId=${traceId}`);
    console.log(`User Instructions provided: ${userInstructions ? 'Yes' : 'No'}, length: ${userInstructions?.length || 0}`);
    
    // Check if agent type is a built-in type
    const isBuiltIn = isBuiltInAgentType(agentType);
    console.log(`Agent ${agentType} is built-in: ${isBuiltIn}`);
    
    // Check if custom agent exists when isCustomAgent is true and not a built-in type
    if (isCustomAgent && !isBuiltIn) {
      // First, validate if the agentType is a valid UUID before querying
      if (!isValidUUID(agentType)) {
        console.error(`Invalid UUID format for custom agent ID: ${agentType}`);
        return new Response(
          JSON.stringify({ 
            error: `Invalid custom agent ID format: ${agentType}. Custom agent IDs must be valid UUIDs.`,
            handoffFailed: true
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: agentData, error: agentError } = await supabase
        .from('custom_agents')
        .select('id, name')
        .eq('id', agentType)
        .single();
        
      if (agentError || !agentData) {
        console.error(`Custom agent not found: ${agentType}`, agentError);
        return new Response(
          JSON.stringify({ 
            error: "Custom agent not found",
            handoffFailed: true
          }),
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
    
    // Get completion from the agent
    const { completion, handoffRequest, modelUsed } = await getAgentCompletion(
      messages, 
      agentType, 
      {
        ...contextData,
        userInstructions
      },
      supabase
    );
    
    // Log the interaction with the model used
    await logAgentInteraction(
      supabase,
      userId,
      agentType,
      userMessage,
      completion,
      modelUsed,
      hasAttachments,
      traceId
    );
    
    return new Response(
      JSON.stringify({
        completion,
        handoffRequest,
        modelUsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
