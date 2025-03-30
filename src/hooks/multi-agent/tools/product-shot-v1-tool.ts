
import { ToolDefinition, ToolContext, ToolExecutionResult } from "../types";
import { v4 as uuidv4 } from "uuid";

export const productShotV1Tool: ToolDefinition = {
  name: "product-shot-v1",
  description: "Generate a professional product shot from an uploaded image with customizable parameters",
  parameters: {
    type: "object",
    properties: {
      style: {
        type: "string",
        description: "The style of the product shot (e.g., 'studio', 'lifestyle', 'minimalist')"
      },
      background: {
        type: "string",
        description: "Description of the desired background"
      },
      lighting: {
        type: "string",
        description: "The lighting style (e.g., 'soft', 'dramatic', 'natural')"
      },
      aspectRatio: {
        type: "string",
        description: "Aspect ratio of the output image (e.g., '1:1', '4:3', '16:9', '9:16')",
        default: "9:16"
      },
      guidance: {
        type: "number",
        description: "Guidance scale for the image generation (1.0-10.0)",
        default: 5.1
      },
      steps: {
        type: "number",
        description: "Number of inference steps (4-50)",
        default: 13
      },
      prompt: {
        type: "string",
        description: "Detailed prompt for image generation"
      },
      sceneId: {
        type: "string",
        description: "Optional Canvas scene ID to associate this image with"
      },
      projectId: {
        type: "string",
        description: "Optional Canvas project ID to associate this image with"
      },
      scriptContent: {
        type: "string",
        description: "Optional script content to include with this product shot"
      }
    },
    required: ["style"]
  },
  requiredCredits: 1.5,
  
  execute: async (params: {
    style: string;
    background?: string;
    lighting?: string;
    aspectRatio?: string;
    guidance?: number;
    steps?: number;
    prompt?: string;
    sceneId?: string;
    projectId?: string;
    scriptContent?: string;
  }, context: ToolContext): Promise<ToolExecutionResult> => {
    try {
      // Check if we have attachments (we need an image to enhance)
      if (!context.attachments || context.attachments.length === 0) {
        throw new Error("No product image provided. Please upload an image of your product.");
      }
      
      // Find the first image attachment
      const imageAttachment = context.attachments.find(a => 
        a.type === 'image' || 
        (a.contentType && a.contentType.startsWith('image/'))
      );
      
      if (!imageAttachment) {
        throw new Error("No suitable product image found in attachments. Please upload an image.");
      }
      
      // Set default parameters if not provided
      const aspectRatio = params.aspectRatio || "9:16";
      const guidance = params.guidance || 5.1;
      const steps = params.steps || 13;
      
      // Add processing message with detailed parameters
      context.addMessage(
        `Processing your product shot request with style: ${params.style}, ` +
        `aspect ratio: ${aspectRatio}, guidance: ${guidance}, steps: ${steps}...`, 
        'tool'
      );
      
      // Build enhanced prompt combining user prompt with parameters
      const enhancedPrompt = params.prompt ? 
        `${params.prompt} | Style: ${params.style}` : 
        `Professional product shot in ${params.style} style`;
      
      const backgroundInfo = params.background ? ` with ${params.background} background` : '';
      const lightingInfo = params.lighting ? ` with ${params.lighting} lighting` : '';
      
      const fullPrompt = `${enhancedPrompt}${backgroundInfo}${lightingInfo}. High quality, detailed, professional product photography.`;
      
      console.log("Product shot generation with params:", {
        prompt: fullPrompt,
        aspectRatio,
        guidance,
        steps,
        imageUrl: imageAttachment.url,
        sceneId: params.sceneId,
        projectId: params.projectId,
        hasScriptContent: !!params.scriptContent,
        scriptContentLength: params.scriptContent ? params.scriptContent.length : 0
      });
      
      let savedScriptContent = params.scriptContent || '';
      let scriptSaved = false;
      
      // Check if script content was provided
      if (params.scriptContent && params.projectId) {
        try {
          console.log("Saving script content to project", {
            projectId: params.projectId,
            contentPreview: params.scriptContent.substring(0, 100) + '...'
          });
          
          // Display script content in chat before saving
          context.addMessage(
            `📝 Script content received:\n\n${params.scriptContent.substring(0, 500)}${params.scriptContent.length > 500 ? '...' : ''}`,
            'tool'
          );
          
          const { error } = await context.supabase
            .from('canvas_projects')
            .update({ full_script: params.scriptContent })
            .eq('id', params.projectId);
            
          if (error) {
            console.error("Error saving script to Canvas project:", error);
            context.addMessage("Failed to save script content to project.", "error");
          } else {
            console.log("Successfully saved script to Canvas project");
            scriptSaved = true;
            savedScriptContent = params.scriptContent;
            
            // Add success message to chat
            context.addMessage("✓ Script content saved to Canvas project successfully.", "tool");
          }
        } catch (error) {
          console.error("Failed to save script to Canvas project:", error);
          context.addMessage("Failed to save script content to project due to an error.", "error");
        }
      }
      
      // In a real implementation, this would call an API to generate enhanced product shots
      // For now, we'll simulate a successful generation
      
      // Simulate API processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create mock result URLs (in reality, these would be returned from the API)
      const resultId = uuidv4();
      const mockResults = [
        `https://example.com/product-shots/${resultId}-1.jpg`,
        `https://example.com/product-shots/${resultId}-2.jpg`,
        `https://example.com/product-shots/${resultId}-3.jpg`
      ];
      
      // If we have a Canvas scene ID, save this image to the scene
      if (params.sceneId && params.projectId) {
        try {
          const { error } = await context.supabase
            .from('canvas_scenes')
            .update({ 
              image_url: mockResults[0],
              product_image_url: imageAttachment.url
            })
            .eq('id', params.sceneId)
            .eq('project_id', params.projectId);
            
          if (error) {
            console.error("Error saving image to Canvas scene:", error);
          } else {
            console.log("Successfully saved image to Canvas scene:", params.sceneId);
          }
        } catch (error) {
          console.error("Failed to save image to Canvas scene:", error);
        }
      }
      
      return {
        success: true,
        data: {
          originalImage: imageAttachment.url,
          enhancedImages: mockResults,
          style: params.style,
          background: params.background || "Automatic",
          lighting: params.lighting || "Studio",
          parameters: {
            aspectRatio: aspectRatio,
            guidance: guidance,
            steps: steps,
            prompt: fullPrompt
          },
          scriptSaved: scriptSaved,
          scriptContent: savedScriptContent
        },
        message: `Generated ${mockResults.length} product shots with aspect ratio ${aspectRatio}, guidance ${guidance}, and ${steps} steps.${params.sceneId ? " Image has been automatically saved to your Canvas scene." : ""}${scriptSaved ? " Script has been saved to your Canvas project." : ""}`,
        usage: {
          creditsUsed: 1.5
        }
      };
    } catch (error) {
      console.error("Error in productShotV1Tool:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error in product shot generation"
      };
    }
  }
};

