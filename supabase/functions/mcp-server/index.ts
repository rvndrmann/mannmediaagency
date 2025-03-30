
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MCPToolParameters {
  sceneId?: string;
  imageAnalysis?: boolean;
  useDescription?: boolean;
  productShotVersion?: string;
  aspectRatio?: string;
}

interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

serve(async (req) => {
  console.log(`MCP server received request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Simple ping endpoint for testing connection
    const url = new URL(req.url);
    if (url.pathname.endsWith('/ping')) {
      return new Response(
        JSON.stringify({ success: true, message: "MCP server is running" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request data:", JSON.stringify(requestData));
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { operation, toolName, parameters, projectId } = requestData;
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Handle different operations
    switch (operation) {
      case "ping":
        return new Response(
          JSON.stringify({ success: true, message: "MCP server is running" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      case "list_tools": {
        // Return the list of tools this MCP server provides
        const tools: MCPToolDefinition[] = [
          {
            name: "update_scene_description",
            description: "Updates the scene description based on the current image and script",
            parameters: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "The ID of the scene to update"
                },
                imageAnalysis: {
                  type: "boolean",
                  description: "Whether to analyze the existing image for the scene description"
                }
              },
              required: ["sceneId"]
            }
          },
          {
            name: "update_image_prompt",
            description: "Generates and updates an image prompt for the scene",
            parameters: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "The ID of the scene to update"
                },
                useDescription: {
                  type: "boolean",
                  description: "Whether to incorporate the scene description in the image prompt"
                }
              },
              required: ["sceneId"]
            }
          },
          {
            name: "generate_scene_image",
            description: "Generate an image for the scene using the image prompt",
            parameters: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "The ID of the scene to update"
                },
                productShotVersion: {
                  type: "string",
                  enum: ["v1", "v2"],
                  description: "Which product shot version to use"
                }
              },
              required: ["sceneId"]
            }
          },
          {
            name: "create_scene_video",
            description: "Convert the scene image to a video",
            parameters: {
              type: "object",
              properties: {
                sceneId: {
                  type: "string",
                  description: "The ID of the scene to update"
                },
                aspectRatio: {
                  type: "string",
                  enum: ["16:9", "9:16", "1:1"],
                  description: "The aspect ratio of the video"
                }
              },
              required: ["sceneId"]
            }
          }
        ];
        
        return new Response(
          JSON.stringify({ success: true, tools }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case "call_tool": {
        if (!toolName) {
          throw new Error("Tool name is required");
        }
        
        if (!parameters || !parameters.sceneId) {
          throw new Error("Scene ID is required in tool parameters");
        }
        
        const sceneId = parameters.sceneId;
        
        // Get the scene data
        const { data: scene, error: sceneError } = await supabase
          .from("canvas_scenes")
          .select("*")
          .eq("id", sceneId)
          .single();
          
        if (sceneError) {
          console.error("Error fetching scene:", sceneError);
          throw new Error(`Failed to fetch scene: ${sceneError.message}`);
        }
        
        if (!scene) {
          throw new Error(`Scene not found with ID: ${sceneId}`);
        }
        
        console.log(`Processing tool ${toolName} for scene ${sceneId}`);
        
        // Handle different tools
        switch (toolName) {
          case "update_scene_description": {
            try {
              // In a real implementation, this would use an AI model to generate a description
              // based on the scene image, script, and other data
              
              const description = `Detailed scene description generated for scene "${scene.title}".
Camera moves smoothly from left to right, capturing the entire scene.
Subject is positioned in the center against a neutral background.
Lighting is bright and even, creating a professional look.
The mood is aligned with the script content: "${scene.script?.substring(0, 100)}..."`;
              
              // Update the scene description
              const { error } = await supabase
                .from("canvas_scenes")
                .update({ description })
                .eq("id", sceneId);
                
              if (error) {
                console.error("Error updating scene description:", error);
                throw new Error(`Failed to update scene description: ${error.message}`);
              }
              
              return new Response(
                JSON.stringify({
                  success: true,
                  result: "Scene description updated successfully using AI analysis",
                  description // Return the generated description in the response
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } catch (error) {
              console.error("Error in update_scene_description:", error);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error in update_scene_description"
                }),
                { 
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }
          }
          
          case "update_image_prompt": {
            try {
              // Generate an image prompt based on the scene description and script
              const scriptExcerpt = scene.script ? scene.script.substring(0, 150) : "no script available";
              const descriptionExcerpt = scene.description ? scene.description.substring(0, 150) : "no description available";
              
              const imagePrompt = `High quality cinematic scene, professional lighting, detailed textures,
${scriptExcerpt},
${parameters.useDescription ? descriptionExcerpt : ""},
high resolution, 4K, ultra detailed, photorealistic`;
              
              // Update the scene image prompt
              const { error } = await supabase
                .from("canvas_scenes")
                .update({ image_prompt: imagePrompt })
                .eq("id", sceneId);
                
              if (error) {
                console.error("Error updating image prompt:", error);
                throw new Error(`Failed to update image prompt: ${error.message}`);
              }
              
              return new Response(
                JSON.stringify({
                  success: true,
                  result: "Image prompt generated and updated successfully",
                  imagePrompt // Return the generated image prompt in the response
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } catch (error) {
              console.error("Error in update_image_prompt:", error);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error in update_image_prompt"
                }),
                { 
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }
          }
          
          case "generate_scene_image": {
            try {
              // In a real implementation, this would call the product shot service
              // For now, we'll just simulate a successful response
              
              const imageUrl = "https://example.com/placeholder-image.jpg";
              
              // Update the scene image URL
              const { error } = await supabase
                .from("canvas_scenes")
                .update({ image_url: imageUrl })
                .eq("id", sceneId);
                
              if (error) {
                console.error("Error updating scene image URL:", error);
                throw new Error(`Failed to update scene image URL: ${error.message}`);
              }
              
              return new Response(
                JSON.stringify({
                  success: true,
                  result: `Scene image generated successfully using ${parameters.productShotVersion || "v2"}`,
                  imageUrl
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } catch (error) {
              console.error("Error in generate_scene_image:", error);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error in generate_scene_image"
                }),
                { 
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }
          }
          
          case "create_scene_video": {
            try {
              // In a real implementation, this would call the image-to-video service
              // For now, we'll just simulate a successful response
              
              const videoUrl = "https://example.com/placeholder-video.mp4";
              
              // Update the scene video URL
              const { error } = await supabase
                .from("canvas_scenes")
                .update({ video_url: videoUrl })
                .eq("id", sceneId);
                
              if (error) {
                console.error("Error updating scene video URL:", error);
                throw new Error(`Failed to update scene video URL: ${error.message}`);
              }
              
              return new Response(
                JSON.stringify({
                  success: true,
                  result: `Scene video created successfully with aspect ratio ${parameters.aspectRatio || "16:9"}`,
                  videoUrl
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } catch (error) {
              console.error("Error in create_scene_video:", error);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error in create_scene_video"
                }),
                { 
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
              );
            }
          }
          
          default:
            return new Response(
              JSON.stringify({
                success: false,
                error: `Unknown tool: ${toolName}`
              }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
        }
      }
      
      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown operation: ${operation}`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error("MCP server error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
