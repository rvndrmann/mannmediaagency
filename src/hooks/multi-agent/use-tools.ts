
import { useState } from "react";
import { productShotV1Tool } from "./tools/product-shot-v1-tool";
import { useImageToVideoTool } from "./tools/image-to-video-tool";
import { ToolResult } from "./types";

export const useTools = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { convertImageToVideo } = useImageToVideoTool();

  // Map of all available tools
  const tools = {
    "product_shot_v1": productShotV1Tool,
  };

  const executeTool = async (
    toolName: string,
    parameters: Record<string, any>
  ): Promise<ToolResult | null> => {
    setIsLoading(true);
    
    try {
      console.log(`Executing tool: ${toolName} with parameters:`, parameters);
      
      // Handle special tools with custom hooks
      if (toolName === "image_to_video") {
        return await convertImageToVideo({
          prompt: parameters.prompt || "",
          imageUrl: parameters.imageUrl || "",
          duration: parameters.duration || "15",
          aspectRatio: parameters.aspectRatio || "16:9",
        });
      }
      
      // Handle standard tools from the tools object
      if (tools[toolName]) {
        return await tools[toolName].execute(parameters);
      }
      
      // If tool not found
      return {
        content: `Tool ${toolName} not found.`,
        metadata: { error: "Tool not found" }
      };
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        content: `Error executing tool ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: String(error) }
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeTool,
    isLoading,
  };
};
