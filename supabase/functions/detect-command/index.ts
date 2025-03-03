
import { serve } from "std/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Define our command interface
interface EnhancedCommand {
  feature: "product-shot-v1" | "product-shot-v2" | "image-to-video" | "product-video" | "default-image" | null;
  action: "create" | "convert" | "save" | "use" | "list" | null;
  confidence: number;
  parameters: {
    prompt?: string;
    imageId?: string;
    imageUrl?: string;
    name?: string;
    autoGenerate?: boolean;
    contextualData?: any;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  command?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('OpenAI API key is not set');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request data
    const { messages, lastMessage } = await req.json();
    
    if (!messages || !Array.isArray(messages) || !lastMessage) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array and lastMessage are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Analyzing message for command detection:', lastMessage);

    // Convert messages to a format OpenAI can use
    // We'll include recent conversation history (up to 10 messages)
    const recentMessages = messages.slice(-10).map((msg: Message) => ({
      role: msg.role,
      content: msg.content
    }));

    // Add system message with instructions for command detection
    const systemMessage = {
      role: "system",
      content: `You are a command detection system for a product imaging application. 
      
Your job is to determine if a user message contains a command request. Commands can be:

1. product-shot-v1 or product-shot-v2 - Create product images
2. image-to-video - Convert an image to video
3. product-video - Create a product video
4. default-image - Save, use or list default images

Extract relevant parameters like prompts, image names, image URLs, image IDs, and whether to auto-generate content.

For default images:
- When a user asks to "use default image X" for a product shot, set feature=product-shot-v1, action=create, and add the image name to parameters
- When a user says "create product shot with my default image X", extract the image name and set it in parameters.name
- For default images, both imageId and imageUrl can be extracted if present in the conversation

Analyze the latest message in context of the conversation and determine if it contains a command.
Return NULL values if no command is detected.

Example commands:
- "create a product shot of a coffee mug on a wooden table"
- "generate a product image showing shoes in a forest"
- "convert this image to a video"
- "save this as my default image named 'My Product'"
- "use my default image called 'Coffee Cup'"
- "show me my default images"
- "create a product shot using my default image 'Logo' and generate it automatically"
- "make a product-shot-v1 with my default image and add a forest background"
      `
    };

    // Create OpenAI request with function calling
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          systemMessage,
          ...recentMessages
        ],
        functions: [
          {
            name: "detect_command",
            description: "Detect if the user message contains a command and extract parameters",
            parameters: {
              type: "object",
              properties: {
                feature: {
                  type: "string",
                  enum: ["product-shot-v1", "product-shot-v2", "image-to-video", "product-video", "default-image", null],
                  description: "The feature the command is targeting, or null if no command detected"
                },
                action: {
                  type: "string",
                  enum: ["create", "convert", "save", "use", "list", null],
                  description: "The action to perform on the feature, or null if no command detected"
                },
                confidence: {
                  type: "number",
                  description: "Confidence score from 0-1 on whether this is a command"
                },
                parameters: {
                  type: "object",
                  properties: {
                    prompt: {
                      type: "string",
                      description: "The prompt for image generation"
                    },
                    name: {
                      type: "string",
                      description: "Name for saving or using a default image"
                    },
                    imageId: {
                      type: "string",
                      description: "ID of a default image to use (if known)"
                    },
                    imageUrl: {
                      type: "string",
                      description: "URL of a default image to use (if known)"
                    },
                    autoGenerate: {
                      type: "boolean",
                      description: "Whether to automatically generate after setting parameters"
                    }
                  }
                }
              },
              required: ["feature", "action", "confidence"]
            }
          }
        ],
        function_call: { name: "detect_command" }
      })
    });

    const response = await openAIResponse.json();
    console.log('OpenAI response:', JSON.stringify(response, null, 2));

    // Parse the command from function calling
    let detectedCommand: EnhancedCommand = {
      feature: null,
      action: null,
      confidence: 0,
      parameters: {}
    };

    if (response.choices && 
        response.choices[0]?.message?.function_call?.name === "detect_command") {
      try {
        const functionArgs = JSON.parse(response.choices[0].message.function_call.arguments);
        detectedCommand = {
          feature: functionArgs.feature,
          action: functionArgs.action,
          confidence: functionArgs.confidence,
          parameters: functionArgs.parameters || {}
        };
        
        console.log('Detected command:', JSON.stringify(detectedCommand, null, 2));
      } catch (error) {
        console.error('Error parsing function arguments:', error);
      }
    }

    // If confidence is low, don't return a command
    if (detectedCommand.confidence < 0.7 || !detectedCommand.feature || !detectedCommand.action) {
      console.log('No command detected or confidence too low');
      return new Response(
        JSON.stringify({ command: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        command: {
          feature: detectedCommand.feature,
          action: detectedCommand.action,
          parameters: detectedCommand.parameters
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-command function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
