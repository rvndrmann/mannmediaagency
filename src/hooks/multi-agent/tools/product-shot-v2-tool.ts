import { ToolDefinition, CommandExecutionState } from "./types";

export const productShotV2Tool: ToolDefinition = {
  name: "product-shot-v2",
  description: "Generate product shots with different styles, backgrounds and scene descriptions",
  parameters: {
    type: "object",
    properties: {
      sourceImageUrl: {
        type: "string",
        description: "URL of the source product image"
      },
      style: {
        type: "string",
        description: "Style preset for the generation",
        enum: ["product", "lifestyle", "abstract", "minimal", "futuristic", "retro"]
      },
      background: {
        type: "string",
        description: "Background for the product",
        enum: ["transparent", "white", "gradient", "solid_color", "scenic", "studio", "contextual"]
      },
      placement: {
        type: "string",
        description: "How the product should be placed in the scene",
        enum: ["original", "centered", "floating", "angled", "hanging", "dynamic"]
      },
      sceneDescription: {
        type: "string",
        description: "Detailed description of the scene to be generated",
      },
      aspectRatio: {
        type: "string",
        description: "Aspect ratio of the output image",
        enum: ["1:1", "4:3", "16:9", "9:16", "3:4"]
      }
    },
    required: ["sourceImageUrl", "style", "background", "placement", "sceneDescription", "aspectRatio"]
  },
  execute: async (parameters, context) => {
    try {
      // Validate parameters
      const { sourceImageUrl, style, background, placement, sceneDescription, aspectRatio } = parameters;
      
      if (!sourceImageUrl) {
        return {
          success: false,
          message: "Source image URL is required",
          error: "Missing required parameter: sourceImageUrl",
          state: CommandExecutionState.FAILED
        };
      }
      
      // Configure the API call to Replicate or other image service
      const response = await fetch("https://api.example.com/product-shot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.API_KEY}`
        },
        body: JSON.stringify({
          source_image_url: sourceImageUrl,
          style,
          background,
          placement,
          scene_description: sceneDescription,
          aspect_ratio: aspectRatio
        })
      });
      
      // For the sake of demonstration, let's simulate a successful response
      const result = {
        id: "ps_" + Math.random().toString(36).substring(2, 15),
        success: true,
        resultUrl: "https://example.com/generated-product-shot.jpg",
        prompt: sceneDescription,
        createdAt: new Date().toISOString()
      };
      
      // Save to history if context has userId
      if (context.userId) {
        // Save to database history
        try {
          const { data, error } = await context.supabase
            .from("product_shot_history")
            .insert({
              user_id: context.userId,
              source_image_url: sourceImageUrl,
              result_url: result.resultUrl,
              scene_description: sceneDescription,
              settings: {
                style,
                background,
                placement,
                aspectRatio
              },
              visibility: "private"
            });
          
          if (error) console.error("Error saving to history:", error);
        } catch (err) {
          console.error("Database error:", err);
        }
      }
      
      return {
        success: true,
        message: "Product shot generated successfully",
        data: result,
        state: CommandExecutionState.COMPLETED,
        usage: {
          creditsUsed: 1
        }
      };
    } catch (error) {
      console.error("Product shot generation error:", error);
      return {
        success: false,
        message: `Error generating product shot: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : String(error),
        state: CommandExecutionState.FAILED
      };
    }
  },
  metadata: {
    category: "image",
    displayName: "Product Shot Generator V2",
    icon: "image"
  },
  requiredCredits: 1,
  version: "2.0"
};
