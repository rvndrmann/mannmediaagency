
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
        imageUrl: imageAttachment.url
      });
      
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
          }
        },
        message: `Generated ${mockResults.length} product shots with aspect ratio ${aspectRatio}, guidance ${guidance}, and ${steps} steps.`,
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
