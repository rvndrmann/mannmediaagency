
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

    // Check if this is a query that should be handled by a specialized agent
    const shouldHandoff = checkForHandoff(input, agentType);
    
    // Generate a response based on agent type
    let responseText = '';
    let handoffRequest = null;
    
    // Add a short delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Process response based on agent type
    switch(agentType) {
      case 'main':
      case 'assistant':
        responseText = generateMainAssistantResponse(input);
        
        // Check if we should automatically handoff to a specialized agent
        if (shouldHandoff && shouldHandoff !== agentType) {
          handoffRequest = {
            targetAgent: shouldHandoff,
            reason: `Your request about "${getShortSummary(input)}" would be better handled by our ${getAgentName(shouldHandoff)}.`
          };
        }
        break;
        
      case 'script':
        responseText = generateScriptWriterResponse(input);
        break;
        
      case 'image':
        responseText = generateImagePromptResponse(input);
        break;
        
      case 'tool':
        responseText = generateToolHelperResponse(input);
        
        // Simulate detecting a browser automation need
        if (input.toLowerCase().includes('website') || input.toLowerCase().includes('browser')) {
          handoffRequest = {
            targetAgent: 'main',
            reason: "I have provided some initial guidance, but you might want to use the browser automation tool."
          };
        }
        break;
        
      case 'scene':
        responseText = generateSceneCreatorResponse(input);
        break;
        
      default:
        responseText = `I'm responding to your message: "${input}".\n\nI'll do my best to assist you with your request. If you need specialized help, please select a specific agent type.`;
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

// Helper functions

// Check if the input should be handed off to a specialized agent
function checkForHandoff(input: string, currentAgentType: string): string | null {
  const inputLower = input.toLowerCase();
  
  // Don't handoff if we're already using the specialized agent
  if (
    (currentAgentType === 'script' && (inputLower.includes('script') || inputLower.includes('write') || inputLower.includes('content'))) ||
    (currentAgentType === 'image' && (inputLower.includes('image') || inputLower.includes('picture') || inputLower.includes('photo'))) ||
    (currentAgentType === 'tool' && (inputLower.includes('tool') || inputLower.includes('browser'))) ||
    (currentAgentType === 'scene' && (inputLower.includes('scene') || inputLower.includes('visual')))
  ) {
    return null;
  }
  
  // Check for script-related keywords
  if (inputLower.includes('script') || inputLower.includes('write') || 
      inputLower.includes('story') || inputLower.includes('narrative') || 
      inputLower.includes('ad') || inputLower.includes('content')) {
    return 'script';
  }
  
  // Check for image-related keywords
  if (inputLower.includes('image') || inputLower.includes('picture') || 
      inputLower.includes('photo') || inputLower.includes('visual') ||
      inputLower.includes('illustration')) {
    return 'image';
  }
  
  // Check for tool-related keywords
  if (inputLower.includes('tool') || inputLower.includes('browser') || 
      inputLower.includes('automate') || inputLower.includes('website')) {
    return 'tool';
  }
  
  // Check for scene-related keywords
  if (inputLower.includes('scene') || inputLower.includes('setting') || 
      inputLower.includes('environment') || inputLower.includes('location')) {
    return 'scene';
  }
  
  return null;
}

// Get a readable name for the agent type
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

// Generate response for the main assistant
function generateMainAssistantResponse(input: string): string {
  return `I'm here to help with your request: "${input}".

I can assist with general questions or connect you with specialized agents:
- Script Writer for creative content like ad scripts
- Image Prompt for generating image descriptions
- Tool Helper for technical assistance with our tools
- Scene Creator for detailed visual descriptions

How would you like me to help you with this request?`;
}

// Generate response for the script writer agent
function generateScriptWriterResponse(input: string): string {
  // Check if the request is about writing a script or content
  if (input.toLowerCase().includes('script') || 
      input.toLowerCase().includes('ad') || 
      input.toLowerCase().includes('write')) {
    
    // If it's about fat burner, provide a specialized response
    if (input.toLowerCase().includes('fat burner')) {
      return `As your Script Writer, I'll craft a compelling video ad script for a fat burner product.

**TITLE: "TRANSFORM: The Science of Better Results"**

**[OPENING SHOT - SPLIT SCREEN]**
*Athletic person checking their reflection, looking dissatisfied*

**VOICEOVER:** "You've tried the diets. You've put in the gym hours. But those stubborn areas just won't budge."

**[PRODUCT REVEAL]**
*Sleek bottle of fat burner appears with subtle glow*

**VOICEOVER:** "Introducing TRANSFORM Fat Burner. Scientifically formulated with thermogenic compounds that work with your body's metabolism."

**[SCIENCE VISUALIZATION]**
*Simple animation showing how the product works at cellular level*

**VOICEOVER:** "Our proprietary blend activates your body's natural fat-burning processes, targeting those resistant areas while preserving lean muscle."

**[TESTIMONIAL MONTAGE]**
*Quick clips of diverse users showing their transformations*

**TESTIMONIAL 1:** "I lost 15 pounds in 8 weeks while following my regular workout routine."

**TESTIMONIAL 2:** "The energy boost helped me push through plateaus I'd been stuck at for months."

**[PRODUCT BENEFITS]**
*Text overlay with key benefits appearing on screen*

**VOICEOVER:** "TRANSFORM gives you:
- Enhanced metabolism
- Increased energy levels
- Appetite control
- No jitters or crashes"

**[CLOSING SHOT]**
*Product with website and special offer*

**VOICEOVER:** "TRANSFORM Fat Burner. Science that works, results that show. Order now and get 20% off your first purchase."

**[LEGAL DISCLAIMER]**
*Small text at bottom of screen*

Would you like me to revise any part of this script or provide additional creative options?`;
    }
    
    // Generic script writing response
    return `As your Script Writer, I'm analyzing your request: "${input}".

I specialize in creating compelling narratives, dialogue, scripts for advertisements, and other creative content. 

To create the most effective script for you, I need to understand:
1. What is the specific purpose of this script?
2. Who is the target audience?
3. What key messages or benefits should be highlighted?
4. What tone would you prefer (professional, conversational, humorous, etc.)?
5. Are there any specific length requirements?

Please provide these details and I'll craft a customized script for your needs.`;
  }
  
  // Default script writer response
  return `As your Script Writer agent, I've analyzed your request: "${input}".

I specialize in crafting compelling narratives, dialogue, and creative content. How would you like me to help with your script today? I can outline scenes, develop characters, or refine existing content.`;
}

// Generate response for the image prompt agent
function generateImagePromptResponse(input: string): string {
  return `I'm the Image Prompt agent analyzing: "${input}".

I'll help you create detailed image generation prompts that will produce high-quality results. What kind of image are you looking to create?`;
}

// Generate response for the tool helper agent
function generateToolHelperResponse(input: string): string {
  return `As the Tool Helper agent, I'm reviewing your request: "${input}".

I can guide you through using various tools available in our system. Would you like me to help you with a specific tool or explain what options are available?`;
}

// Generate response for the scene creator agent
function generateSceneCreatorResponse(input: string): string {
  return `As your Scene Creator agent, I'm analyzing: "${input}".

I specialize in crafting detailed visual scenes for creative projects. What kind of scene would you like me to help you develop? I can provide rich descriptions for settings, atmospheres, and visual elements.`;
}
