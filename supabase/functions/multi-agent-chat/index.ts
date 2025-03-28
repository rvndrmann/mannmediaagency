
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { input, attachments, agentType, userId, usePerformanceModel, enableDirectToolExecution, tracingDisabled, contextData, metadata, runId, groupId } = await req.json();

    logInfo(`[${requestId}] Received request from user ${userId}`, { 
      agentType, 
      inputLength: input?.length, 
      attachmentsCount: attachments?.length || 0,
      hasContextData: !!contextData,
      runId,
      groupId
    });

    // Generate a response based on agent type
    let responseText = '';
    let handoffRequest = null;
    
    // Add a 1-second delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple response generation based on agent type
    switch(agentType) {
      case 'main':
      case 'assistant':
        responseText = `I'm the assistant AI responding to: "${input}".

I can help you with general questions and tasks. If you need specialized help, I can connect you with other agents like:
- Script Writer for creative content
- Image Prompt for generating image descriptions
- Tool Helper for technical assistance
- Scene Creator for detailed visual descriptions

What would you like help with today?`;
        break;
        
      case 'script':
        responseText = `As your Script Writer agent, I've analyzed your request: "${input}".

I specialize in crafting compelling narratives, dialogue, and creative content. How would you like me to help with your script today? I can outline scenes, develop characters, or refine existing content.`;
        break;
        
      case 'image':
        responseText = `I'm the Image Prompt agent analyzing: "${input}".

I'll help you create detailed image generation prompts that will produce high-quality results. What kind of image are you looking to create?`;
        break;
        
      case 'tool':
        responseText = `As the Tool Helper agent, I'm reviewing your request: "${input}".

I can guide you through using various tools available in our system. Would you like me to help you with a specific tool or explain what options are available?`;
        
        // Simulate detecting a browser automation need
        if (input.toLowerCase().includes('website') || input.toLowerCase().includes('browser')) {
          handoffRequest = {
            targetAgent: 'main',
            reason: "I have provided some initial guidance, but you might want to use the browser automation tool."
          };
        }
        break;
        
      case 'scene':
        responseText = `As your Scene Creator agent, I'm analyzing: "${input}".

I specialize in crafting detailed visual scenes for creative projects. What kind of scene would you like me to help you develop? I can provide rich descriptions for settings, atmospheres, and visual elements.`;
        break;
        
      default:
        responseText = `I'm responding to your message: "${input}".

I'll do my best to assist you with your request. If you need specialized help, please select a specific agent type.`;
    }
    
    logInfo(`[${requestId}] Generated response for ${agentType} agent`, {
      responseLength: responseText.length,
      hasHandoff: !!handoffRequest
    });

    return new Response(
      JSON.stringify({
        completion: responseText,
        handoffRequest: handoffRequest
      }),
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
