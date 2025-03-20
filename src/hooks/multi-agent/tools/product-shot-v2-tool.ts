
import { supabase } from "@/integrations/supabase/client";
import { ToolResult } from "../types";

export const productShotV2Tool = {
  name: "product_shot_v2",
  description: "Generate a product photo using AI by providing a reference image and description",
  parameters: {
    prompt: {
      type: "string",
      description: "Detailed description of the product and scene",
      required: true
    },
    productDescription: {
      type: "string",
      description: "Brief description of the product",
      required: true
    },
    imageUrl: {
      type: "string",
      description: "URL of the reference product image",
      required: true
    },
    style: {
      type: "string",
      description: "Style of the image (e.g., minimalist, luxurious, etc.)",
      required: false
    },
    additionalSettings: {
      type: "object",
      description: "Additional settings for image generation",
      required: false
    }
  },
  requiredCredits: 2,
  
  execute: async (params: any): Promise<ToolResult> => {
    try {
      const requestId = `ps2-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      // Check for required parameters
      if (!params.prompt || !params.imageUrl || !params.productDescription) {
        return {
          content: "Missing required parameters. Please provide prompt, productDescription, and imageUrl.",
          metadata: { error: "Missing parameters", requestId }
        };
      }
      
      console.log("Executing product-shot-v2 with params:", params);
      
      // Call the edge function to generate the image
      const { data, error } = await supabase.functions.invoke("generate-product-shot", {
        body: {
          prompt: params.prompt,
          sourceImageUrl: params.imageUrl,
          requestId,
          additionalSettings: params.additionalSettings || {},
          productDescription: params.productDescription,
          style: params.style || "product photography"
        }
      });
      
      if (error) {
        console.error("Error generating product shot:", error);
        return {
          content: `Error generating product shot: ${error.message || error}`,
          metadata: { error: error.message, requestId }
        };
      }
      
      console.log("Product shot generation initiated:", data);
      
      return {
        content: "Product shot generation has been initiated. This may take a moment. The image will be available shortly.",
        metadata: { requestId, generationId: data?.jobId }
      };
    } catch (error: any) {
      console.error("Error in product shot v2 tool:", error);
      return {
        content: `Error in product shot generation: ${error.message || "Unknown error"}`,
        metadata: { error: error.message || "Unknown error" }
      };
    }
  }
};
